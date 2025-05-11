from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
import os
import subprocess
import tempfile
import shutil
import re
import uuid
import logging
import time
import json
from datetime import datetime

# Configure logging
log_file = os.path.join(tempfile.gettempdir(), 'manim_service.log')

logging.basicConfig(
   level=logging.INFO,
   format='%(asctime)s - %(levelname)s - %(message)s',
   handlers=[
      logging.FileHandler(log_file),
      logging.StreamHandler()
   ]
)
logger = logging.getLogger("manim-service")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
   CORSMiddleware,
   allow_origins=["http://localhost:3000", "http://localhost:5173"],
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)

class ManimCode(BaseModel):
   manim_code: str
   job_id: str

# Middleware to log request/response details
@app.middleware("http")
async def log_requests(request: Request, call_next):
   request_id = str(uuid.uuid4())
   start_time = time.time()
   
   # Log request
   logger.info(f"Request {request_id} started - {request.method} {request.url.path}")
   
   # Get request body for logging (if not file upload)
   if request.method in ["POST", "PUT"] and not request.headers.get("content-type", "").startswith("multipart/form-data"):
      try:
         body = await request.body()
         body_str = body.decode()
         if len(body_str) > 1000:  # Truncate long bodies
               body_str = body_str[:1000] + "..."
         logger.debug(f"Request {request_id} body: {body_str}")
         # Reset the request body so it can be read again
         request._body = body
      except Exception as e:
         logger.error(f"Error reading request body: {str(e)}")
   
   # Process the request
   response = await call_next(request)
   
   # Calculate duration
   duration = time.time() - start_time
   
   # Log response
   logger.info(f"Response {request_id} completed with status {response.status_code} in {duration:.4f}s")
   
   return response

@app.post("/generate-video")
async def run_manim(data: ManimCode, background_tasks: BackgroundTasks):

   logger.info(f"[{data.job_id}] Starting Manim video generation")
   temp_dir = None
   try:
      # Log received code (truncated)
      code_preview = data.manim_code[:200] + "..." if len(data.manim_code) > 200 else data.manim_code
      logger.info(f"[{data.job_id}] Received Manim code: {code_preview}")
      
      # Validate Python syntax
      try:
         logger.debug(f"[{data.job_id}] Validating Python syntax")
         ast.parse(data.manim_code)
      except SyntaxError as e:
         error_msg = f"Syntax Error: {str(e)} at line {e.lineno}, column {e.offset}"
         logger.error(f"[{data.job_id}] {error_msg}")
         raise HTTPException(
               status_code=400,
               detail=error_msg,
         )

      # Create temp dir and write code
      project_dir = os.getcwd()
      jobs_dir = os.path.join(project_dir, "manim_jobs")
      os.makedirs(jobs_dir, exist_ok=True)
      job_dir = os.path.join(jobs_dir, data.job_id)
      os.makedirs(job_dir, exist_ok=True)
      
      file_path = os.path.join(job_dir, "main.py")
      with open(file_path, "w") as file:
         file.write(data.manim_code)
      logger.debug(f"[{data.job_id}] Wrote Manim code to {file_path}")

      # Run Manim via Docker
      logger.info(f"[{data.job_id}] Executing Manim in Docker")
      docker_command = [
         "docker", "exec",
         "manim-service",
         "manim", "-qm" ,f"manim_jobs/{data.job_id}/main.py", "DefaultScene",
         "--media_dir", f"manim_jobs/{data.job_id}/media"
      ]

      logger.debug(f"[{data.job_id}] Docker command: {' '.join(docker_command)}")
      
      result = subprocess.run(
         docker_command,
         capture_output=True,
         text=True,
         cwd=temp_dir,
      )


      # Log the output
      logger.debug(f"[{data.job_id}] Manim stdout: {result.stdout}")
      
      if result.returncode != 0:
         logger.error(f"[{data.job_id}] Manim execution failed with code {result.returncode}")
         logger.error(f"[{data.job_id}] Manim stderr: {result.stderr}")
         raise HTTPException(
               status_code=500, detail=f"Manim execution failed: {result.stderr}"
         )
      
      logger.info(f"[{data.job_id}] Manim execution completed successfully")

      # Find video
      media_dir = os.path.join(job_dir, "media", "videos", "main", "480p15")
      if not os.path.exists(media_dir):
         # Check alternate path that might be used
         media_dir = os.path.join(job_dir, "media", "videos", "main", "1080p60")
         if not os.path.exists(media_dir):
               # One more try with another possible path
               media_dir = os.path.join(job_dir, "media", "videos", "main", "720p30")
      
      logger.debug(f"[{data.job_id}] Looking for video files in {media_dir}")
      
      # Try to create the directory if it doesn't exist
      if not os.path.exists(media_dir):
         logger.warning(f"[{data.job_id}] Media directory {media_dir} does not exist")
         # List all directories to help debug
         all_dirs = []
         for root, dirs, files in os.walk(temp_dir):
               all_dirs.extend([os.path.join(root, d) for d in dirs])
               if any(f.endswith('.mp4') for f in files):
                  logger.info(f"[{data.job_id}] Found MP4 files in {root}")
                  media_dir = root
                  break
         
         logger.debug(f"[{data.job_id}] All directories: {all_dirs}")
         
         if not os.path.exists(media_dir):
               logger.error(f"[{data.job_id}] Failed to find media directory")
               raise HTTPException(status_code=500, detail="Video output directory not found")

      # Find video files
      video_files = [f for f in os.listdir(media_dir) if f.endswith(".mp4")]
      if not video_files:
         logger.error(f"[{data.job_id}] No video files found in {media_dir}")
         raise HTTPException(status_code=500, detail="No video was generated")
      
      # Get the first video
      video_path = os.path.join(media_dir, video_files[0])
      logger.info(f"[{data.job_id}] Found video at {video_path}")

      # Move video to a safe temp location with unique name
      final_video_path = os.path.join(
         tempfile.gettempdir(), f"{data.job_id}_{os.path.basename(video_path)}"
      )
      shutil.copy(video_path, final_video_path)
      logger.info(f"[{data.job_id}] Copied video to {final_video_path}")

      # Schedule cleanup
      background_tasks.add_task(shutil.rmtree, job_dir)
      background_tasks.add_task(os.remove, final_video_path)
      logger.debug(f"[{data.job_id}] Scheduled cleanup tasks")

      logger.info(f"[{data.job_id}] Returning video response")
      return FileResponse(
         path=final_video_path, media_type="video/mp4", filename="animation.mp4"
      )

   except HTTPException:
      logger.exception(f"[{data.job_id}] HTTP exception occurred")
      if temp_dir and os.path.exists(temp_dir):
         shutil.rmtree(temp_dir)
      raise
      
   except Exception as e:
      logger.exception(f"[{data.job_id}] Unexpected error: {str(e)}")
      if temp_dir and os.path.exists(temp_dir):
         shutil.rmtree(temp_dir)
      raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
   logger.info("Health check requested")
   return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Debug endpoint to echo back the request for testing
@app.post("/debug/echo")
async def debug_echo(request: Request):
   body = await request.body()
   try:
      body_json = json.loads(body)
      logger.info(f"Echo endpoint received JSON request: {body_json}")
      return {"echo": body_json}
   except:
      body_text = body.decode()
      logger.info(f"Echo endpoint received text request: {body_text}")
      return {"echo": body_text}

if __name__ == "__main__":
   import uvicorn
   logger.info("Starting Manim service")
   uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)