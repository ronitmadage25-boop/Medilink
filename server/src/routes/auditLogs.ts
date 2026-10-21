import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));

  const [logs, total] = await Promise.all([
    AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

export default router;
