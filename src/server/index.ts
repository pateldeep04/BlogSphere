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
import restrictedWordsRoutes from './routes/restrictedWords';
import communityRoutes from './routes/community';
import collectionRoutes from './routes/collection';
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
app.use((req: any, res: any, next: any) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie: string) => {
      const parts = cookie.split('=');
      req.cookies[parts.shift()!.trim()] = decodeURIComponent(parts.join('='));
    });
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes Hook
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restricted-words', restrictedWordsRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/collections', collectionRoutes);

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

  // Join collection room for real-time updates
  socket.on('join_collection', (collectionId: string) => {
    socket.join(`collection_${collectionId}`);
  });

  socket.on('leave_collection', (collectionId: string) => {
    socket.leave(`collection_${collectionId}`);
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

  // Collaborative Sprints: Start Sprint
  socket.on('start_sprint', ({ blogId, durationMs, wordCountGoal }: { blogId: string; durationMs: number; wordCountGoal: number }) => {
    io.to(`blog_collab_${blogId}`).emit('sprint_started', {
      durationMs,
      wordCountGoal,
      startTime: Date.now()
    });
  });

  // Collaborative Sprints: Update Word Count
  socket.on('update_sprint_progress', ({ blogId, userId, wordCount }: { blogId: string; userId: string; wordCount: number }) => {
    socket.to(`blog_collab_${blogId}`).emit('sprint_progress', {
      userId,
      wordCount
    });
  });

  // Collaborative Sprints: Cancel Sprint
  socket.on('cancel_sprint', ({ blogId }: { blogId: string }) => {
    io.to(`blog_collab_${blogId}`).emit('sprint_cancelled');
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

// Graceful port-conflict handler — prevents unhandled crash on EADDRINUSE
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[BlogSphere] ❌ Port ${PORT} is already in use.`);
    console.error(`[BlogSphere] 💡 Run this in your terminal to free it:\n`);
    console.error(`   netstat -ano | findstr :${PORT}   → get PID`);
    console.error(`   taskkill /PID <PID> /F\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

server.listen(PORT, () => {
  console.log(`BlogSphere backend running on port ${PORT}`);

  // Create default admin user if not exists
  (async () => {
    try {
      const User = (await import('./models/User.js')).default;
      const bcrypt = (await import('bcryptjs')).default;
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
        const newAdmin = new User({
          name: 'System Admin',
          username: 'admin',
          email: 'admin@blogsphere.com',
          password: hashedPassword,
          role: 'admin',
          bio: 'System Administrator of BlogSphere Platform.',
          profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        });
        await newAdmin.save();
        console.log('[System Init] Created default admin account: admin@blogsphere.com / AdminPassword123!');
      }
    } catch (err: any) {
      console.error('Default admin check error:', err.message);
    }
  })();

  // Start automated scheduled blog publisher (every 30 seconds)
  const THIRTY_SECONDS = 30 * 1000;
  setInterval(async () => {
    try {
      const { checkAndPublishScheduledBlogs } = await import('./controllers/blogController.js');
      await checkAndPublishScheduledBlogs();
    } catch (err: any) {
      console.error('Scheduled blog publisher error:', err.message);
    }
  }, THIRTY_SECONDS);
});

