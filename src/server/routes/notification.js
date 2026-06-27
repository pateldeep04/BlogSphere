import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getNotifications);
router.put('/:id/read', auth, markAsRead);

export default router;
