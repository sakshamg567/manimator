const express = require('express')
const handleChat = require('../controllers/ChatHandler')

const router = express.Router()

router.post('/', handleChat)

module.exports = router