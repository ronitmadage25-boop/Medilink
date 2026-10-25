import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  verifyDoctor,
  verifyCentre,
  getPendingVerifications,
  getAdminAuditLogs,
} from '../controllers/adminController';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

router.get('/dashboard', getAdminDashboard);
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/verifications/pending', getPendingVerifications);
router.patch('/verifications/doctors/:id', verifyDoctor);
router.patch('/doctors/:id/verify', verifyDoctor);
router.patch('/verifications/centres/:id', verifyCentre);
router.patch('/diagnostic-centres/:id/verify', verifyCentre);
router.get('/audit-logs', getAdminAuditLogs);

export default router;
