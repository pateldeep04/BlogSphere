# 🌐 BlogSphere

> A modern, real-time collaborative blogging community platform built with the MERN stack.

BlogSphere is a smart community blog platform designed for rich collaboration. It features a custom modular post builder, real-time collaboration on articles, nested comments, live notifications, admin moderation, and clean UI aesthetics with full dark mode support.

---

## ✨ Features

- **⚡ Real-Time Collaboration**: Co-edit blog posts in real-time with other authors using Socket.io integration.
- **🛠️ Modular Post Builder**: A rich block-based editor supporting text blocks, callouts, lists, code highlighting, and image previews.
- **💬 Nested Comments**: Interactive, multi-level nested comment section for each blog.
- **🔔 Live Notifications**: Real-time push updates for collaborative events, comments, and post updates.
- **🛡️ Admin Console**: Dedicated user-role management, article moderation, and community insights.
- **🎨 Glassmorphic UI**: Beautiful responsive design built with Tailwind CSS and smooth micro-interactions powered by Framer Motion.
- **🌙 Seamless Dark Mode**: Fully automated class-based light/dark theme switcher.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS, PostCSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Real-Time Feed**: Socket.io-Client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT & bcryptjs
- **Sockets**: Socket.io

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
│   │   ├── pages/          # View routing pages (Home, Editor, Admin, Auth)
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
