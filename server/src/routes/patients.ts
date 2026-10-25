import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getPatientDashboard,
  getPatientProfile,
  updatePatientProfile,
  getDoctorPatients,
  getPatientById,
} from '../controllers/patientController';

const router = Router();

// Patient routes
router.get('/dashboard', authenticate, requireRole('PATIENT'), getPatientDashboard);
router.get('/profile', authenticate, requireRole('PATIENT'), getPatientProfile);
router.patch('/profile', authenticate, requireRole('PATIENT'), updatePatientProfile);

// Provider directory to search/select patients for bookings and uploads
router.get('/', authenticate, requireRole('DOCTOR', 'DIAGNOSTIC_CENTRE', 'ADMIN'), getDoctorPatients);
router.get('/:id', authenticate, requireRole('DOCTOR', 'DIAGNOSTIC_CENTRE', 'ADMIN'), getPatientById);

export default router;
