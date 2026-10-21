import { Router } from 'express';
import { authenticate, requireRole, requireVerified } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getDiagnosticCentreDashboard,
  getCentreReports,
  uploadReport,
  deliverReport,
  getCentreProfile,
} from '../controllers/diagnosticCentreController';

const router = Router();

router.get('/dashboard', authenticate, requireRole('DIAGNOSTIC_CENTRE'), getDiagnosticCentreDashboard);
router.get('/profile', authenticate, requireRole('DIAGNOSTIC_CENTRE'), getCentreProfile);
router.get('/reports', authenticate, requireRole('DIAGNOSTIC_CENTRE'), getCentreReports);
router.post('/reports', authenticate, requireRole('DIAGNOSTIC_CENTRE'), requireVerified, upload.single('file'), uploadReport);
router.post('/reports/:id/deliver', authenticate, requireRole('DIAGNOSTIC_CENTRE'), requireVerified, deliverReport);

export default router;
