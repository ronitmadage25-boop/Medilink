import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConsultationMessages,
  postConsultationMessage,
} from '../controllers/consultationController';

const router = Router();

router.get('/:roomCode/messages', authenticate, getConsultationMessages);
router.post('/:roomCode/messages', authenticate, postConsultationMessage);

export default router;
