# CodeSync 🚀
### AI-Powered Collaborative Coding and Development Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-v22+-green.svg?logo=node.js)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v19-blue.svg?logo=react)](https://react.dev/)
[![Monaco Editor](https://img.shields.io/badge/Editor-Monaco-informational.svg?logo=visualstudiocode)](https://microsoft.github.io/monaco-editor/)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%20Flash-orange.svg?logo=google)](https://deepmind.google/technologies/gemini/)
[![Docker](https://img.shields.io/badge/Container-Docker%20%7C%20Compose-2496ED.svg?logo=docker)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF.svg?logo=githubactions)](https://github.com/features/actions)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📖 Overview

**CodeSync** is a modern, full-stack browser-based Integrated Development Environment (IDE) that bridges the gap between online code editors, distributed team collaboration, and AI-assisted software engineering. 

It enables developers, students, and engineering teams to work together in real-time across multi-file project workspaces, synchronize changes with local **Visual Studio Code** environments, leverage contextual **Google Gemini Flash** code analysis, and run code securely in an isolated runtime environment.

---

## 🌟 Major Features

### 1. 💻 Browser-Based Collaborative IDE
* **Hierarchical File Explorer:** Full directory tree supporting expandable folders, nested files, live search/filtering, inline file/folder creation, renaming, and deletion.
* **Monaco Editor Integration:** Multi-file tabbed interface powered by the same engine as VS Code, with auto-detection for 15+ languages (JavaScript, TypeScript, Python, C++, Java, HTML, CSS, JSON, Markdown, etc.).
* **Project ZIP Import & Export:** One-click download of the complete workspace as a `.zip` archive, or import existing zipped projects with automatic file extraction.
* **Unsaved Dirty Tracking:** Visual status indicators for unsaved changes and `Ctrl+S` / `Cmd+S` keyboard shortcuts.

### 2. ⚡ Real-Time Multi-User Collaboration
* **Live Synchronization:** Socket.IO powered document synchronization prevents edit clobbering.
* **Presence & Awareness:** Real-time collaborator badges indicating which user is currently viewing or modifying each specific file.
* **Per-File Collaborative Cursors:** Broadcasts cursor line/column indicators and remote selections across collaborators.
* **Integrated Communication:** In-room real-time team text chat and peer-to-peer WebRTC audio/video calling.

### 3. 🤖 AI-Powered Assistant (Google Gemini Flash)
* **Context-Aware Assistance:** Chat directly with the AI assistant about your active file and multi-file project structure (RAG-lite multi-file retrieval).
* **Automated 5-Dimension Code Review:**
  * Syntax, logic bugs & edge cases
  * Security analysis (OWASP, injection risks, exposed secrets)
  * Performance optimization & algorithmic complexity
  * Code readability and modern best practices
* **Code Explanation:** Plain-English, step-by-step breakdowns of functions, classes, and algorithms.
* **1-Click Fix & Patching:** Detects errors and offers complete corrected code with a single **"Apply Fix Directly to Editor"** button.

### 4. 🔌 Visual Studio Code Extension (`codesync-vscode`)
* **Local-to-Cloud Synchronization:** Connect your local VS Code workspace directly to a live CodeSync room.
* **Bidirectional Live Sync:** Local file saves automatically sync to remote collaborators; remote updates propagate to local files in real-time.
* **Safe Exclusion Rules:** Automatically ignores sensitive and build directories (`.git`, `node_modules`, `.env*`, `dist`, `build`).
* **Direct AI Reviews:** Trigger Gemini code reviews on any local file directly inside VS Code with side-by-side Markdown preview panels.

### 5. 🐳 Isolated Execution & Docker Sandboxing
* **Multi-Language Project Execution:** Run JavaScript, Python, C++, and Java directly from the browser IDE.
* **Project-Aware Sandboxing:** Automatically stages all workspace files in isolated execution environments with execution timeouts (8s) and memory caps.
* **Containerization:** Production-ready multi-stage Dockerfiles for both Client (Nginx) and Server (Node.js), orchestratable with `docker-compose.yml`.

### 6. 🔄 CI/CD Automation
* **Automated GitHub Actions:** Multi-stage pipeline (`.github/workflows/ci-cd.yml`) that validates backend syntax, tests dependencies, verifies production frontend builds, and tests Docker container image compilation on every push and pull request.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                              │
│   ┌───────────────────────────────────┐  ┌─────────────────────────┐   │
│   │   Browser IDE (React 19 + Monaco) │  │   VS Code Extension     │   │
│   │   - FileTree & Project Tabs       │  │   - Local Folder Sync   │   │
│   │   - Gemini AI Drawer & Chat       │  │   - FileSystemWatcher   │   │
│   └─────────────────┬─────────────────┘  └────────────┬────────────┘   │
└─────────────────────┼─────────────────────────────────┼────────────────┘
                      │  REST API (HTTP/S)              │
                      │  Real-Time Deltas (Socket.IO)   │
┌─────────────────────▼─────────────────────────────────▼────────────────┐
│                           APPLICATION LAYER                            │
│                 CodeSync Express 5 / Node.js Backend                   │
│   ┌────────────────────┬────────────────────┬──────────────────────┐   │
│   │   Auth & Rooms     │  Socket Sync Hub   │  Execution Sandbox   │   │
│   │   (JWT / Sessions) │  (Presence/Cursors)│  (Isolated Runtime)  │   │
│   └─────────┬──────────┴─────────┬──────────┴──────────┬───────────┘   │
└─────────────┼────────────────────┼─────────────────────┼───────────────┘
              │                    │                     │
┌─────────────▼─────────┐ ┌────────▼────────┐ ┌──────────▼───────────────┐
│     DATABASE LAYER    │ │    AI LAYER     │ │   CONTAINER / DEVOPS     │
│  MongoDB Atlas        │ │  Google Gemini  │ │  Docker & Docker-Compose │
│  (Users, Rooms, Files)│ │  Flash 1.5 API  │ │  GitHub Actions CI/CD    │
│  + Resilient Local DB │ │  (Review/Fix)   │ │  Nginx Reverse Proxy     │
└───────────────────────┘ └─────────────────┘ └──────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React.js 19 | Dynamic Single Page Application interface |
| **Code Editor** | Monaco Editor | VS Code-grade editing, syntax highlighting, and shortcuts |
| **Styling** | Tailwind CSS | Modern, responsive dark-themed IDE aesthetics |
| **Backend Engine** | Node.js 22 + Express 5 | RESTful APIs, file management, and middleware |
| **Real-Time Sync** | Socket.IO 4.8 | Workspace room events, file synchronization, presence |
| **Database** | MongoDB (Mongoose) | Users, projects, metadata, and persistent file records |
| **Database Resilience** | Local JSON Store Fallback | Seamless offline / local fallback if Atlas cluster is paused |
| **Artificial Intelligence**| Google Gemini Flash API | Code reviews, natural language explanations, bug repairs |
| **Local IDE Integration** | VS Code Extension API (TS) | Local directory synchronization with remote rooms |
| **DevOps & Containers** | Docker & Docker Compose | Multi-stage production containers and local orchestration |
| **Continuous Integration** | GitHub Actions | Automated build, lint, and container verification |

---

## 📁 Repository Structure

```text
codesync-project/
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # GitHub Actions CI/CD pipeline
├── codesync/
│   ├── client/                   # Frontend React Application
│   │   ├── public/               # Static assets & HTML template
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AIPanel/      # Gemini AI Assistant drawer
│   │   │   │   ├── Chat/         # Room text discussion panel
│   │   │   │   ├── Editor/       # Monaco Editor with multi-file tabs
│   │   │   │   ├── FileTree/     # Hierarchical tree & ZIP import/export
│   │   │   │   └── VideoChat.jsx # WebRTC Audio/Video calling
│   │   │   ├── context/          # Auth and Room global state
│   │   │   ├── pages/            # Dashboard, Room, Login, Register, Home
│   │   │   └── utils/api.js      # Axios client with JWT interceptors
│   │   ├── Dockerfile            # Multi-stage client build
│   │   └── nginx.conf            # Nginx production reverse proxy
│   └── server/                   # Backend Express & Socket.IO Server
│       ├── controllers/          # Auth, Room, and Execution controllers
│       ├── middleware/           # JWT and Bearer token authentication
│       ├── models/               # User, Room, File models + LocalDb fallback
│       ├── routes/               # API route definitions
│       ├── services/             # Google Gemini Flash AI integration
│       ├── socket/               # Room & editor real-time event handlers
│       ├── utils/                # Language auto-detection utilities
│       ├── Dockerfile            # Multi-stage server runner
│       └── index.js              # Application entry point
├── codesync-vscode/              # Official VS Code Extension
│   ├── src/
│   │   └── extension.ts          # Bidirectional sync & Gemini review command
│   ├── package.json              # Extension manifest & contributions
│   ├── tsconfig.json             # TypeScript compiler configuration
│   └── README.md                 # Extension setup instructions
├── docker-compose.yml            # Multi-service local container orchestration
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher, v22 recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* *(Optional)* [Docker Desktop](https://www.docker.com/) for containerized deployment

---

### 1. Clone the Repository
```bash
git clone https://github.com/Kalpana2204/codesync.git
cd codesync
```

---

### 2. Configure Environment Variables

Create `.env` inside `codesync/server/`:

```env
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=codesync_super_secret_key_2026
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/codesync
GEMINI_API_KEY=your_google_gemini_api_key
```

> **Note:** If `MONGO_URI` is paused or unreachable, CodeSync automatically activates its embedded local database store so you can develop and test immediately without any interruption!

---

### 3. Start the Backend Server
```bash
cd codesync/server
npm install
npm run dev     # or: node index.js
```
The server will start at **`http://localhost:5000`**.

---

### 4. Start the Frontend Client
In a new terminal window:
```bash
cd codesync/client
npm install
npm start
```
The client will launch automatically at **`http://localhost:3000`**.

---

## 🐳 Running with Docker Compose

To spin up the full stack (MongoDB, Backend Server, and Frontend Nginx) in containers:

```bash
docker-compose up --build
```

* **Frontend:** `http://localhost:3000`
* **Backend API:** `http://localhost:5000`
* **MongoDB:** `localhost:27017`

---

## 🔌 VS Code Extension Setup

To use the local VS Code synchronization extension:

1. Navigate to the extension folder:
   ```bash
   cd codesync-vscode
   npm install
   npm run compile
   ```
2. Open the directory in VS Code and press **`F5`** to launch the **Extension Development Host**.
3. In the new window, open any local project folder.
4. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
   * **`CodeSync: Connect to Workspace Room`**
   * Enter your server URL (`http://localhost:5000`), your JWT auth token, and the Room ID.
5. All authorized files will synchronize automatically!

---

## 🔒 Security & Privacy Practices

* **JWT & Bearer Token Authentication:** Secure cookie-based and header-based token validation.
* **Sensitive File Exclusion:** Automatically excludes secrets (`.env*`), dependencies (`node_modules`), and version control metadata (`.git`) from synchronization and ZIP archives.
* **Execution Sandbox Limits:** Code execution processes enforce strict 8-second timeouts and memory caps.
* **Key Protection:** All AI API keys reside solely on the backend; client applications never expose provider credentials.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

**Developed with ❤️ for developers and engineering teams worldwide.**
