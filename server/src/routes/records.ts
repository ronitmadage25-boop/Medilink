import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const patientId = req.user!.role === 'PATIENT' ? req.user!.id : (req.query.patientId as string) || req.user!.id;

  const reports = await prisma.diagnosticReport.findMany({
    where: { patientId, isActive: true },
    include: {
      diagnosticCentre: { select: { id: true, name: true } },
      referringDoctor: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = reports.map((r) => ({ ...r, _id: r.id }));
  res.json({ success: true, data: { records: formatted } });
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const report = await prisma.diagnosticReport.findUnique({
    where: { id },
  });

  if (!report) throw new AppError('Record not found.', 404);
  res.json({ success: true, data: { record: { ...report, _id: report.id } } });
});

export default router;
