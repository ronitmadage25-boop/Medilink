import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getPatientDashboard,
  getPatientRecords,
  createPatientRecord,
  getPatientProfile,
  updatePatientProfile,
  getDoctorPatients,
  getPatientById,
} from '../controllers/patientController';

const router = Router();

// Patient routes
router.get('/dashboard', authenticate, requireRole('PATIENT'), getPatientDashboard);
router.get('/records', authenticate, requireRole('PATIENT'), getPatientRecords);
router.post('/records', authenticate, requireRole('PATIENT'), createPatientRecord);
router.get('/profile', authenticate, requireRole('PATIENT'), getPatientProfile);
router.patch('/profile', authenticate, requireRole('PATIENT'), updatePatientProfile);

// Doctor routes to access patients
router.get('/', authenticate, requireRole('DOCTOR', 'ADMIN'), getDoctorPatients);
router.get('/:id', authenticate, requireRole('DOCTOR', 'ADMIN'), getPatientById);

export default router;
