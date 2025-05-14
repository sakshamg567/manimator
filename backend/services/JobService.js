const jobs = {};

function initJob(jobId) {
   jobs[jobId] = {
      status: "queued",
      videoUrl: null
   };
}

function updateJobStatus(jobId, status) {
   if (jobs[jobId]) {
      jobs[jobId].status = status;
   }
}

function setJobVideoUrl(jobId, url) {
   if (jobs[jobId]) {
      jobs[jobId].videoUrl = url;
   }
}

function getJob(jobId) {
   return jobs[jobId];
}

module.exports = {
   jobs,
   initJob,
   updateJobStatus,
   setJobVideoUrl,
   getJob
};
