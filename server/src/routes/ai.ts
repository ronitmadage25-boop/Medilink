import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { requestExplanation, getExplanationHistory } from '../controllers/aiController';

const router = Router();

router.post('/explanations', authenticate, requireRole('PATIENT'), requestExplanation);
router.get('/explanations', authenticate, requireRole('PATIENT'), getExplanationHistory);

export default router;
