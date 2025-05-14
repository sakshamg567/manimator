const express = require("express");
const handleGetJobStatus = require("../controllers/JobStatusHandler");

const router = express.Router();

router.get('/:jobId/status', handleGetJobStatus);

module.exports = router;