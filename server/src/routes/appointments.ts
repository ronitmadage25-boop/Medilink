import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
} from '../controllers/appointmentController';

const router = Router();

router.get('/', authenticate, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), getAppointments);
router.post('/', authenticate, requireRole('PATIENT'), createAppointment);
router.patch('/:id/status', authenticate, updateAppointmentStatus);
router.post('/:id/reschedule', authenticate, rescheduleAppointment);

export default router;
