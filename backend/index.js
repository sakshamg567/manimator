const dotenv = require("dotenv")
const express = require("express")
const cors = require("cors")
const JobRouter = require("./routes/JobRouter")
const VideoRouter = require("./routes/VideoRouter")
const { FRONTEND_URL } = require("./config")

dotenv.config()

const app = express()

app.use(cors({
   origin: FRONTEND_URL
}))

app.use(express.json())

app.use("/api/generate", VideoRouter)
app.use("/api/job", JobRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT , console.log("server is listening on port : ", PORT));


