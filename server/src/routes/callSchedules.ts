import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getCallSchedule,
  upsertCallSchedule,
  triggerLiveCall,
  twimlVoicePrompt,
  twimlProcessSpeech,
} from '../controllers/callScheduleController';

const router = Router();

router.get('/', authenticate, requireRole('PATIENT'), getCallSchedule);
router.post('/', authenticate, requireRole('PATIENT'), upsertCallSchedule);
router.put('/', authenticate, requireRole('PATIENT'), upsertCallSchedule);
router.post('/trigger', authenticate, requireRole('PATIENT'), triggerLiveCall);

// Twilio webhook endpoints
router.post('/twiml/voice-prompt', twimlVoicePrompt);
router.get('/twiml/voice-prompt', twimlVoicePrompt);
router.post('/twiml/process-speech', twimlProcessSpeech);

export default router;
