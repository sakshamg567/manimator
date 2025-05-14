const { jobs, updateJobStatus } = require("../utils/index");
const { MANIM_API_URL, CLOUDINARY } = require("../config");
const cloudinary = require("cloudinary").v2;
const axios = require("axios")

cloudinary.config({
   cloud_name: CLOUDINARY.name,
   api_key: CLOUDINARY.key,
   api_secret: CLOUDINARY.secret
})

const GenerateAndUploadVideoToCloudinary = async (code, jobId) => {
   
   updateJobStatus(jobId, "starting_videoGeneration");
   
   const response = await axios.post(
      `${MANIM_API_URL}/generate-video`,
      { manim_code: code, job_id: jobId },
      { responseType: "stream" }
   )

   updateJobStatus(jobId, "starting_upload")

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

module.exports = GenerateAndUploadVideoToCloudinary