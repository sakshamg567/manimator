const extractCodeFromLLMResponse = async(responseText) => {

   const match = responseText.match(/```(?:python)?\s*([\s\S]*?)```/i);
   if (match) {
      return match[1].trim();
   }
   return null;

}

module.exports = extractCodeFromLLMResponse