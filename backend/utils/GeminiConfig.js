const { GoogleGenAI } = require("@google/genai")
const { GOOGLE_API_KEY } = require("../config")

const ai = new GoogleGenAI({
   apiKey: GOOGLE_API_KEY,
});

module.exports = ai