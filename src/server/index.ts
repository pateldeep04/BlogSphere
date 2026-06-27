import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Routes
import authRoutes from './routes/auth';
import blogRoutes from './routes/blog';
import commentRoutes from './routes/comment';
import notificationRoutes from './routes/notification';
import userRoutes from './routes/user';
import Blog from './models/Blog';

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
(global as any).io = io;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Hook
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets in production mode
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  // Basic server check
  app.get('/', (req, res) => {
    res.json({ message: 'BlogSphere API running smoothly in development' });
  });
}

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blog-sphere';
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    try {
      await Blog.updateMany({ summary: '.' }, { $set: { summary: '' } });
      console.log('Successfully cleaned up any legacy dot summaries in the database.');
    } catch (dbErr: any) {
      console.error('Database cleanup warning:', dbErr.message);
    }
  })
  .catch((err: any) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Please ensure local MongoDB is running, or set MONGODB_URI in .env');
  });

// Socket.io Real-time Operations
// Track active collaborators in-memory: blogId -> { socketId: { userId, userName } }
interface Collaborator {
  userId: string;
  userName: string;
}
const activeCollaborators: { [blogId: string]: { [socketId: string]: Collaborator } } = {};

io.on('connection', (socket: Socket) => {
  // Join private room for real-time notifications
  socket.on('join_user', (userId: string) => {
    socket.join(`user_${userId}`);
  });

  // Collaborative Editor: Join Room
  socket.on('join_collab', ({ blogId, userId, userName }: { blogId: string; userId: string; userName: string }) => {
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
  socket.on('edit_content', ({ blogId, content, title }: { blogId: string; content: string; title: string }) => {
    socket.to(`blog_collab_${blogId}`).emit('content_updated', { content, title });
  });

  // Collaborative Editor: Leave Room
  socket.on('leave_collab', ({ blogId }: { blogId: string }) => {
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
// Restart trigger

