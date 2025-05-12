const express = require("express")
const { GoogleGenAI } = require("@google/genai")
const dotenv = require("dotenv")
const fs = require("fs")
const cors = require("cors")
const { default: axios } = require("axios")
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto")

dotenv.config()

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

cloudinary.config({
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET
})

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const analyzer_system_prompt = config.analyzer_system_prompt;
const coder_system_prompt = config.coder_system_prompt

const app = express()
app.use(express.json())

// job store to store running jobs
const jobs = {
   123: {
      status: "waiting",
      videoUrl: null
   }
};

app.use(cors({
   origin: 'https://manimorph.vercel.app'
}))

const getBreakdown = (llmResponse) => {
   const match = llmResponse.match(/```([\s\S]*?)```/);
   if (match) {
      return match[1].trim();
   }
   return null;
}

function extractCodeFromLLMResponse(responseText) {

   const match = responseText.match(/```(?:python)?\s*([\s\S]*?)```/i);
   if (match) {
      return match[1].trim();
   }
   return null;

}

const GenerateAndUploadVideoToCloudinary = async (code, jobId) => {
   jobs[jobId].status = "starting_generation";
   const response = await axios.post(
      "https://manim-backend.sakshamdev.me/generate-video",
      { manim_code: code, job_id: jobId },
      { responseType: "stream" }
   )

   jobs[jobId].status = "uploading";

   return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
         {
            resource_type: 'video',
            public_id: `manim_videos/${jobId}`,
            folder: 'manim_videos',
         },
         (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
         }
      );

      response.data.pipe(uploadStream);
   });
}

const startGenerationFlow = (jobId, prompt, AnimationStepBreakdown) => {
   (async () => {
      try {
         console.log("prompt: ", prompt);

         console.log(`[${jobId}] Generation flow started`);

         jobs[jobId].status = "generating_code";

         console.log(`[${jobId}] Code generation started`);

         const response = await ai.models.generateContent({
            model: "gemini-2.5-pro-preview-05-06",
            config: {
               systemInstruction: coder_system_prompt
            },
            contents:`User request: ${prompt}\n\nBreakdown:\n${AnimationStepBreakdown}`
         })

         const code = extractCodeFromLLMResponse(response.text)
         jobs[jobId].status = "code_generated"

         const videoUrl = await GenerateAndUploadVideoToCloudinary(code, jobId);

         jobs[jobId].status = "done";
         jobs[jobId].videoUrl = videoUrl;

      } catch (err) {
         jobs[jobId].status = "error";
      }
   })();
}

app.post('/generate', async (req, res) => {

   const { messages } = req.body;

   const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: messages,
      config: {
         systemInstruction: analyzer_system_prompt
      }
   })

   let jobId = null;

   const AnimationStepBreakdown = getBreakdown(response.text);

   if (AnimationStepBreakdown) {
      jobId = crypto.randomUUID()
      jobs[jobId] = {
         status: "queued",
         videoUrl: null
      }

      console.log("messages: ", messages);

      startGenerationFlow(jobId, messages[messages.length - 1].content, AnimationStepBreakdown);
   }

   res.json({ llmResponse: response.text, jobId: jobId });

})

app.get('/api/job/:jobId/status', (req, res) => {
   const { jobId } = req.params
   const job = jobs[jobId];
   if (!job) {
      return res.status(404).json({ error: "job not found" });
   }

   res.json({
      job_id: jobId,
      status: job.status,
      video_url: job.videoUrl || null
   })
})


const PORT = process.env.PORT || 3000;

app.listen(PORT , console.log("server is listening on port : ", PORT));


