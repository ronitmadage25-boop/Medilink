import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getCallSchedule, upsertCallSchedule } from '../controllers/callScheduleController';

const router = Router();

router.get('/', authenticate, requireRole('PATIENT'), getCallSchedule);
router.put('/', authenticate, requireRole('PATIENT'), upsertCallSchedule);

export default router;
