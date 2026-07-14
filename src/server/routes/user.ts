import express from 'express';
import { 
  getUsers, 
  updateUser, 
  deleteUser, 
  followUser, 
  getUserProfile,
  getPublicAuthors,
  updateOwnProfile,
  toggleBookmark,
  getBookmarks,
  toggleNewsletter,
  toggleCategorySubscription,
  getDashboardStats,
  getEarningsReport
} from '../controllers/userController';
import { auth, optionalAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/search/authors', getPublicAuthors);
router.get('/:id/profile', getUserProfile);
router.post('/:id/follow', auth, followUser);

// Profile, Bookmark and Newsletter Routes
router.get('/dashboard/stats', auth, getDashboardStats);
router.put('/profile', auth, updateOwnProfile);
router.get('/bookmarks', auth, getBookmarks);
router.post('/bookmarks/:blogId', auth, toggleBookmark);
router.post('/newsletter/:authorId', auth, toggleNewsletter);
router.post('/subscribe-category', auth, toggleCategorySubscription);

// Admin Only Routes
router.get('/', auth, requireRole(['admin']), getUsers);
router.get('/earnings-report', auth, requireRole(['admin']), getEarningsReport);
router.get('/leaderboard', optionalAuth, getEarningsReport);
router.put('/:id', auth, requireRole(['admin']), updateUser);
router.delete('/:id', auth, requireRole(['admin']), deleteUser);

export default router;
