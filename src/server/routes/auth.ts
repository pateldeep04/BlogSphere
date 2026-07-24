import express from 'express';
import { register, login, getMe, logout, googleLogin, getGoogleClientId } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/google', googleLogin);
router.get('/google/client-id', getGoogleClientId);
router.get('/me', auth, getMe);

export default router;
