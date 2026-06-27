import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/auth.js';
import blogRoutes from './routes/blog.js';
import commentRoutes from './routes/comment.js';
import notificationRoutes from './routes/notification.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For local dev, allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Save io globally so other files can trigger live notifications
global.io = io;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Hook
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Basic server check
app.get('/', (req, res) => {
  res.json({ message: 'BlogSphere API running smoothly' });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blog-sphere';
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Please ensure local MongoDB is running, or set MONGODB_URI in server/.env');
  });

// Socket.io Real-time Operations
// Track active collaborators in-memory: blogId -> { socketId: { userId, userName } }
const activeCollaborators = {};

io.on('connection', (socket) => {
  // Join private room for real-time notifications
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  // Collaborative Editor: Join Room
  socket.on('join_collab', ({ blogId, userId, userName }) => {
    socket.join(`blog_collab_${blogId}`);
    
    if (!activeCollaborators[blogId]) {
      activeCollaborators[blogId] = {};
    }
    
    // Add collaborator
    activeCollaborators[blogId][socket.id] = { userId, userName };
    
    // Broadcast active contributors to the room
    io.to(`blog_collab_${blogId}`).emit('collab_users', Object.values(activeCollaborators[blogId]));
  });

  // Collaborative Editor: Sync content changes
  socket.on('edit_content', ({ blogId, content, title }) => {
    socket.to(`blog_collab_${blogId}`).emit('content_updated', { content, title });
  });

  // Collaborative Editor: Leave Room
  socket.on('leave_collab', ({ blogId }) => {
    socket.leave(`blog_collab_${blogId}`);
    if (activeCollaborators[blogId] && activeCollaborators[blogId][socket.id]) {
      delete activeCollaborators[blogId][socket.id];
      if (Object.keys(activeCollaborators[blogId]).length === 0) {
        delete activeCollaborators[blogId];
      } else {
        io.to(`blog_collab_${blogId}`).emit('collab_users', Object.values(activeCollaborators[blogId]));
      }
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    // Search and remove this socket from all collaboration sessions
    Object.keys(activeCollaborators).forEach((blogId) => {
      if (activeCollaborators[blogId][socket.id]) {
        delete activeCollaborators[blogId][socket.id];
        if (Object.keys(activeCollaborators[blogId]).length === 0) {
          delete activeCollaborators[blogId];
        } else {
          io.to(`blog_collab_${blogId}`).emit('collab_users', Object.values(activeCollaborators[blogId]));
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`BlogSphere backend running on port ${PORT}`);
});
