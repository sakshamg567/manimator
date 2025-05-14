const getBreakdown = async(llmResponse) => {
   const match = llmResponse.match(/```([\s\S]*?)```/);
   if (match) {
      return match[1].trim();
   }
   return null;
}

module.exports = getBreakdown