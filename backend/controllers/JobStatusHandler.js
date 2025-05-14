const { jobs, getJob } = require("../utils/index")

const handleGetJobStatus = async (req, res) => {
   const { jobId } = req.params
   const job = getJob(jobId);
   if (!job) {
      return res.status(404).json({ error: "job not found" });
   }

   res.json({
      job_id: jobId,
      status: job.status,
      video_url: job.videoUrl || null
   })
}

module.exports = handleGetJobStatus