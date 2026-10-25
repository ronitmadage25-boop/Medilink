import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getPrescriptions, getPrescriptionById, createPrescription } from '../controllers/prescriptionController';

const router = Router();

router.get('/', authenticate, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), getPrescriptions);
router.get('/:id', authenticate, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), getPrescriptionById);
router.post('/', authenticate, requireRole('DOCTOR'), createPrescription);

export default router;
