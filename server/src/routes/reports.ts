import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getReports, getReportById, markReportReviewed } from '../controllers/reportController';

const router = Router();

router.get('/', authenticate, getReports);
router.get('/:id', authenticate, getReportById);
router.patch('/:id/review', authenticate, requireRole('DOCTOR', 'ADMIN'), markReportReviewed);

export default router;
