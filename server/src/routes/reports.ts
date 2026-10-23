import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { getReports, getReportById, markReportReviewed } from '../controllers/reportController';
import { uploadReport } from '../controllers/diagnosticCentreController';

const router = Router();

router.get('/', authenticate, getReports);
router.get('/:id', authenticate, getReportById);
router.post('/', authenticate, requireRole('DIAGNOSTIC_CENTRE', 'ADMIN'), upload.single('file'), uploadReport);
router.patch('/:id/review', authenticate, requireRole('DOCTOR', 'ADMIN'), markReportReviewed);

export default router;
