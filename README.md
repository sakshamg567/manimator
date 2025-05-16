# Manimorph

**Manimorph** is an AI-powered platform that helps you learn any topic through dynamic, auto-generated animations.  
Just describe your concept, and Manimorph brings it to life—perfect for students, teachers, and lifelong learners.

---

## Demo

> 📽️ _Check out the demo video to see how Manimorph can help you visualize and understand any topic!_

![Demo Video](./demo/manim.mp4)

---

## Repository Structure
```
├── backend
│   ├── .gitignore
│   ├── config.js
│   ├── config.json
│   ├── controllers
│   │   ├── ChatHandler.js
│   │   └── JobStatusHandler.js
│   ├── index.js
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── routes
│   │   ├── JobRouter.js
│   │   └── VideoRouter.js
│   ├── services
│   │   ├── JobService.js
│   │   ├── VideoGenUploadService.js
│   │   └── VideoService.js
│   └── utils
│       ├── BreakDown.js
│       ├── GeminiConfig.js
│       ├── extractCode.js
│       └── index.js
├── frontend
│   ├── .gitignore
│   ├── README.md
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── jsconfig.json
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── public
│   │   └── vite.svg
│   ├── src
│   │   ├── App.jsx
│   │   ├── assets
│   │   │   └── react.svg
│   │   ├── components
│   │   │   └── ui
│   │   │       └── textarea.jsx
│   │   ├── index.css
│   │   ├── lib
│   │   │   └── utils.js
│   │   ├── main.jsx
│   │   └── pages
│   │       ├── Chat.jsx
│   │       └── Home.jsx
│   └── vite.config.js
└── manim-service
    ├── .gitignore
    ├── .python-version
    ├── README.md
    ├── main.py
    ├── manim_service.log
    ├── pyproject.toml
    ├── requirements.txt
    └── server.py
```

### Details

- **backend/**  
  Handles API requests, job queueing, LLM integration (Google Gemini), and video uploads (Cloudinary).
- **frontend/**  
  Modern React app for user interaction, prompt input, and video display.
- **manim-service/**  
  FastAPI microservice that generates videos from code using [Manim](https://www.manim.community/), running Manim itself inside a Docker container for isolation.

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Python 3.10+
- [pnpm](https://pnpm.io/) (or npm/yarn)
- Docker (for Manim rendering)
- Cloudinary account (for video hosting)
- Google Gemini API key

---

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/manimorph.git
cd manimorph
```

### 2. Setup the backend
```bash
cd backend
pnpm install
cp .env.exampe .env #fill this with your own env keys
pnpm start
```

### 3. Setup the Frontend
```bash
cd ../frontend
pnpm install
pnpm dev
```
### 4. Setup the Manim Servicea. Install Python dependenciesbash
```bash
cd ../manim-service
pip install -r requirements.txt
```

### b. Start the Manim Docker Container
This container will be used by the FastAPI service to render animations in isolation.
```bash
docker pull manimcommunity/manim:stable

docker run -dit \
  --name manim-service \
  -v "$(pwd)/manim_jobs:/manim_jobs" \
  manimcommunity/manim:stable \
  tail -f /dev/null
```
### d. Start the FastAPI Service
```bash
fastapi dev server.py
```

### How It Works
- The frontend sends a prompt to the backend.
- The backend uses LLM to break down your prompt and generate Manim code.
- The backend sends the code and job ID to the manim-service.
- The manim-service writes the code to a job directory and calls Manim inside the Docker container using docker exec.
- The rendered video is returned and uploaded to Cloudinary for sharing.
