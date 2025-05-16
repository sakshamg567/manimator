const { jobs, updateJobStatus, setJobVideoUrl, extractCode } = require("../utils/index")
const GenerateAndUploadVideoToCloudinary = require("./VideoGenUploadService")
const { ai } = require("../utils/index")
const { CODER_SYSTEM_PROMPT } = require("../config")

const startGenerationFlow = (jobId, prompt, AnimationStepBreakdown) => {
   (async () => {
      try {
         console.log("prompt: ", prompt);

         console.log(`[${jobId}] Generation flow started`);

         updateJobStatus(jobId, "starting_codeGeneration");

         console.log(`[${jobId}] Code generation started`);

         try {
            const response = await ai.models.generateContent({
               model: "gemini-2.5-flash-preview-04-17",
               config: {
                  thinkingConfig: {
                     thinkingBudget: 24576,
                     includeThoughts: false,
                  },
                  temperature: 0.7,
                  responseMimeType: 'text/plain',
                  systemInstruction: CODER_SYSTEM_PROMPT,
               },
               contents: `User request: ${prompt}\n\nBreakdown:\n${AnimationStepBreakdown}`,
            })

            const code = await extractCode(response.text)

            updateJobStatus(jobId, "finished_codeGeneration");
   
            const videoUrl = await GenerateAndUploadVideoToCloudinary(code, jobId);
   
            updateJobStatus(jobId, "finished");
            setJobVideoUrl(jobId, videoUrl);

         } catch (error) {
               throw error;
         }
      } catch (err) {
         console.error(`[${jobId}] Error in generation flow:`, err);
         updateJobStatus(jobId, "error");
      }
   })();
}

module.exports = startGenerationFlow