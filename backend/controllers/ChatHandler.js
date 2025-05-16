const { ANALYZER_SYSTEM_PROMPT } = require("../config");
const startGenerationFlow = require("../services/VideoService");
const { getBreakdown, initJob, jobs } = require("../utils/index");
const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");
const crypto = require("crypto");


const handleChat = async (req, res) => {

   const { messages } = req.body;

   const { text } = await generateText({
      model: google("gemini-2.5-flash-preview-04-17"),
      messages,
      system: ANALYZER_SYSTEM_PROMPT,
      providerOptions: {
         google: {
            thinkingConfig: {
               thinkingBudget: 24576,
            },
         }
      }
   })

   let jobId = null;

   const AnimationStepBreakdown = await getBreakdown(text);

   if (AnimationStepBreakdown) {
      jobId = crypto.randomUUID();
      initJob(jobId);

      console.log("messages: ", messages);

      startGenerationFlow(jobId, messages[messages.length - 1].content, AnimationStepBreakdown);
   }

   res.json({ llmResponse: text, jobId: jobId });

}

module.exports = handleChat