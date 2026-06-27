import express from 'express';
import { getUsers, updateUser, deleteUser, followUser, getUserProfile } from '../controllers/userController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id/profile', getUserProfile);
router.post('/:id/follow', auth, followUser);

// Admin Only Routes
router.get('/', auth, requireRole(['admin']), getUsers);
router.put('/:id', auth, requireRole(['admin']), updateUser);
router.delete('/:id', auth, requireRole(['admin']), deleteUser);

export default router;
