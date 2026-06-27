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
  generateAIBlogContent
} from '../controllers/blogController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.get('/', getBlogs);
router.get('/recommendations', auth, getRecommendations);
router.get('/:slug', getBlogBySlug);
router.post('/generate-ai', auth, generateAIBlogContent);
router.post('/', auth, createBlog);
router.put('/:id', auth, updateBlog);
router.delete('/:id', auth, deleteBlog);
router.post('/:id/like', auth, likeBlog);
router.post('/:id/summary', generateSummary);
router.post('/:id/translate', translateBlog);
router.get('/:id/versions', auth, getBlogVersions);
router.post('/:id/versions/:versionId/restore', auth, restoreVersion);

export default router;
