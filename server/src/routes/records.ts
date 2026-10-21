import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { MedicalRecord } from '../models/MedicalRecord';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';

const router = Router();

router.get('/', authenticate, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10', category } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));

  const filter: Record<string, unknown> = { isActive: true };
  if (req.user!.role === 'PATIENT') filter.patient = req.user!._id;
  if (category) filter.category = category;

  const [records, total] = await Promise.all([
    MedicalRecord.find(filter)
      .sort({ recordDate: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    MedicalRecord.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { records, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

router.post('/', authenticate, requireRole('PATIENT'), async (req: AuthRequest, res: Response) => {
  const record = await MedicalRecord.create({ ...req.body, patient: req.user!._id });
  res.status(201).json({ success: true, data: { record } });
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid record ID.', 400);

  const record = await MedicalRecord.findById(id).lean();
  if (!record || !record.isActive) throw new AppError('Record not found.', 404);

  if (req.user!.role === 'PATIENT' && record.patient.toString() !== req.user!._id.toString()) {
    throw new AppError('Not authorised.', 403);
  }

  res.json({ success: true, data: { record } });
});

export default router;
