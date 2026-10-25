import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.auditLog.count(),
  ]);

  const formatted = logs.map((l) => ({
    ...l,
    _id: l.id,
    actor: l.actor ? { ...l.actor, _id: l.actor.id } : null,
  }));

  res.json({
    success: true,
    data: { logs: formatted, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

export default router;
