import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getMyCheckIns, createCheckIn } from '../controllers/checkInController';

const router = Router();

router.get('/', authenticate, requireRole('PATIENT'), getMyCheckIns);
router.post('/', authenticate, requireRole('PATIENT'), createCheckIn);

export default router;
