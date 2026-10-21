import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getDoctorDashboard,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorIncomingReports,
  getSymptomAlerts,
  acknowledgeAlert,
  getAllDoctors,
} from '../controllers/doctorController';

const router = Router();

router.get('/', authenticate, getAllDoctors);
router.get('/dashboard', authenticate, requireRole('DOCTOR'), getDoctorDashboard);
router.get('/profile', authenticate, requireRole('DOCTOR'), getDoctorProfile);
router.patch('/profile', authenticate, requireRole('DOCTOR'), updateDoctorProfile);
router.get('/reports/incoming', authenticate, requireRole('DOCTOR'), getDoctorIncomingReports);
router.get('/alerts', authenticate, requireRole('DOCTOR', 'ADMIN'), getSymptomAlerts);
router.patch('/alerts/:id/acknowledge', authenticate, requireRole('DOCTOR', 'ADMIN'), acknowledgeAlert);

export default router;
