import express from 'express';
import {
  createBlog,
  getBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  likeBlog,
  getRecommendations,
  generateSummary,
  translateBlog,
  getBlogVersions,
  restoreVersion,
  generateAIBlogContent,
  reactToBlog,
  aiTranslateBlogBlocks,
  suggestMetadata,
  triggerTrendingAutoPost,
  getTrendingBlogs,
  getFlaggedBlogs,
  updateBlogAnalytics,
  reportBlog,
  checkSpam,
  dismissReports,
  aiEnhanceBlock,
  aiTutorReview
} from '../controllers/blogController';
import { auth, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/', getBlogs);
router.get('/recommendations', auth, getRecommendations);
router.get('/trending', optionalAuth, getTrendingBlogs);
router.get('/flagged', auth, requireRole(['admin']), getFlaggedBlogs);
router.post('/:id/dismiss-reports', auth, requireRole(['admin']), dismissReports);
router.post('/check-spam', auth, checkSpam);
router.post('/ai-enhance-block', auth, aiEnhanceBlock);
router.post('/ai-tutor-review', auth, aiTutorReview);
router.get('/:slug', getBlogBySlug);
router.post('/:id/analytics', optionalAuth, updateBlogAnalytics);
router.post('/:id/report', auth, reportBlog);
router.post('/generate-ai', auth, generateAIBlogContent);
router.post('/suggest-metadata', auth, suggestMetadata);
router.post('/trigger-trending-post', auth, triggerTrendingAutoPost);
router.post('/', auth, createBlog);
router.put('/:id', auth, updateBlog);
router.delete('/:id', auth, deleteBlog);
router.post('/:id/like', auth, likeBlog);
router.post('/:id/react', auth, reactToBlog);
router.post('/:id/summary', generateSummary);
router.post('/:id/translate', translateBlog);
router.post('/:id/ai-translate', auth, aiTranslateBlogBlocks);
router.get('/:id/versions', auth, getBlogVersions);
router.post('/:id/versions/:versionId/restore', auth, restoreVersion);

export default router;
