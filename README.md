# 🌐 BlogSphere — Smart Community Blog Platform

> A modern, real-time collaborative blogging community platform built with the MERN stack and powered by Gemini AI writing tutors.

BlogSphere is a smart community blog platform designed for rich collaboration. It features a custom modular post builder, real-time collaboration on articles, nested comments, live notifications, admin moderation, and clean UI aesthetics with full dark mode support.

---

## ✨ Features

- **⚡ Real-Time Collaboration**: Co-edit blog posts in real-time with other authors using Socket.io integration.
- **🤖 Block AI Assistant**: Polish and expand text blocks (headings, paragraphs, lists, quotes) inside the editor dynamically using Gemini.
- **🧑‍🏫 AI DocTutor**: An interactive writing coach drawer that scores your draft quality (0-100), offers formatting recommendations, and provides structured coaching feedback on demand.
- **🛡️ Secure Admin Control**: Protected route mappings with automatic bootstrapping of a default system administrator (`admin@blogsphere.com` / `AdminPassword123!`) on startup. Dynamic signup requests for the `admin` role are blocked.
- **🕵️ Anonymous Publishing**: Toggle anonymity for posts. Authors can choose to write anonymously to mask their details across feed directory views.
- **🔒 Account Privacy Switches**: Toggle account visibility between public and private. Private accounts hide detailed profile fields.
- **📂 Exploration Directories**: Search articles, topics, and authors through public API routes.
- **🖼️ Local File Uploader**: Convert local avatars/images directly to base64 encoding with live preview.
- **💰 AdSense Integration**: Integrated `AdCenter` layout dashboards mapping directly to `/adsense`.
- **💬 Nested Comments**: Interactive, multi-level nested comment section for each blog.
- **🔔 Live Notifications**: Real-time push updates for collaborative events, comments, and post updates.
- **🎨 Glassmorphic UI**: Beautiful responsive design built with Tailwind CSS and smooth micro-interactions powered by Framer Motion.
- **🌙 Seamless Dark Mode**: Fully automated class-based light/dark theme switcher.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **State Management**: Redux Toolkit
- **State Slices**: authSlice
- **Styling**: Tailwind CSS, PostCSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Real-Time Sockets**: Socket.io-Client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT & bcryptjs
- **Sockets**: Socket.io
- **AI Engine**: Google Gemini API

---

## 📂 Project Structure

Following a clean single-package monolithic structure:

```
BlogSphere/
├── public/                 # Static assets for the frontend
├── src/
│   ├── client/             # Frontend source code (Vite + React)
│   │   ├── assets/         # Styles, images, SVGs
│   │   ├── components/     # Reusable layout and ui components
│   │   ├── pages/          # View routing pages (Home, Editor, Admin, Auth, AdCenter)
│   │   ├── redux/          # Redux Toolkit store and auth slices
│   │   └── utils/          # API hooks and axios custom configurations
│   └── server/             # Backend source code (Express + Node)
│       ├── controllers/    # API endpoints handlers logic
│       ├── middleware/     # Auth and error handling guards
│       ├── models/         # Mongoose DB schema definitions
│       ├── routes/         # Express router endpoints mapping
│       └── index.js        # Backend entrypoint and websocket server config
├── .env                    # Unified server and local env configuration
├── index.html              # Vite React entry point template
├── package.json            # Monolith dependencies and command scripts
├── tailwind.config.js      # Tailwind style guidelines configuration
└── vite.config.js          # Vite assets builder and proxy configs
```

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a MongoDB Atlas URI)
- [Gemini API Key](https://ai.google.dev/) (Optional but required for AI DocTutor features)

### 🔧 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pateldeep04/BlogSphere.git
   cd BlogSphere
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (based on the sample options):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/blog-sphere
   JWT_SECRET=your_super_secret_jwt_key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

## 🏃 Run the Application

Execute the unified script in development mode to spin up the Express server and Vite frontend concurrently:

```bash
npm run dev
```

- **Frontend Development Server**: [http://localhost:5173](http://localhost:5173)
- **Backend API Port**: [http://localhost:5000](http://localhost:5000)

### Additional Scripts

- **Build Frontend**: `npm run build` (generates static assets inside the `dist/` directory)
- **Preview Production Build**: `npm run preview`
- **Start Production Server**: `npm run start`
