const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs")

const promptConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const analyzer_system_prompt = promptConfig.analyzer_system_prompt;
const coder_system_prompt = promptConfig.coder_system_prompt

module.exports = {
   NODE_ENV: process.env.NODE_ENV,
   FRONTEND_URL: process.env.FRONTEND_URL,
   MANIM_API_URL: process.env.MANIM_URL,
   GOOGLE_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
   CLOUDINARY: {
      name: process.env.CLOUDINARY_CLOUD_NAME,
      key: process.env.CLOUDINARY_API_KEY,
      secret: process.env.CLOUDINARY_API_SECRET
   },
   CODER_SYSTEM_PROMPT: coder_system_prompt,
   ANALYZER_SYSTEM_PROMPT: analyzer_system_prompt
};
