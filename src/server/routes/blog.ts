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
  aiTutorReview,
  getDailyAnalytics,
  generateDailyBrief,
  grammarCheck,
  aiRewrite,
  getAIDebate,
  getBlogQuiz,
  submitBlogQuiz,
  getBlogPodcast
} from '../controllers/blogController';
import { auth, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

router.get('/', getBlogs);
router.get('/admin/daily-analytics', auth, requireRole(['admin']), getDailyAnalytics);
router.post('/admin/daily-brief/generate', auth, requireRole(['admin']), generateDailyBrief);
router.get('/daily-briefs', optionalAuth, getDailyAnalytics);
router.post('/daily-brief/generate', optionalAuth, generateDailyBrief);
router.get('/recommendations', auth, getRecommendations);
router.get('/trending', optionalAuth, getTrendingBlogs);
router.get('/flagged', auth, requireRole(['admin']), getFlaggedBlogs);
router.post('/:id/dismiss-reports', auth, requireRole(['admin']), dismissReports);
router.post('/check-spam', auth, checkSpam);
router.post('/ai-tutor-review', auth, aiTutorReview);
router.post('/grammar-check', auth, grammarCheck);
router.post('/ai-rewrite', auth, aiRewrite);
router.get('/:slug', getBlogBySlug);
router.post('/:id/analytics', optionalAuth, updateBlogAnalytics);
router.post('/:id/report', auth, reportBlog);
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
router.get('/:id/ai-debate', optionalAuth, getAIDebate);
router.get('/:id/quiz', optionalAuth, getBlogQuiz);
router.post('/quiz/:id/submit', auth, submitBlogQuiz);
router.get('/:id/podcast', optionalAuth, getBlogPodcast);

export default router;
