import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMe, updateProfile, getPublicDoctors } from '../controllers/userController';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.get('/doctors', getPublicDoctors);

export default router;
