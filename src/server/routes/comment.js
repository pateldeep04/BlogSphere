import express from 'express';
import { createComment, getCommentsByBlog, deleteComment } from '../controllers/commentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createComment);
router.get('/:blogId', getCommentsByBlog);
router.delete('/:id', auth, deleteComment);

export default router;
