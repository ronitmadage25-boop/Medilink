import { Response } from 'express';
import { Prescription } from '../models/Prescription';
import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const getPrescriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const role = req.user!.role;

  const filter: Record<string, unknown> = { isActive: true };
  if (role === 'PATIENT') filter.patient = req.user!._id;
  else if (role === 'DOCTOR') filter.doctor = req.user!._id;

  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter)
      .populate('patient', 'name email')
      .populate('doctor', 'name')
      .sort({ prescriptionDate: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Prescription.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { prescriptions, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const getPrescriptionById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid prescription ID.', 400);

  const prescription = await Prescription.findById(id)
    .populate('patient', 'name email mobile')
    .populate('doctor', 'name email')
    .lean();

  if (!prescription || !prescription.isActive) throw new AppError('Prescription not found.', 404);

  const userId = req.user!._id.toString();
  const role = req.user!.role;
  const isOwner =
    role === 'ADMIN' ||
    prescription.patient._id.toString() === userId ||
    prescription.doctor._id.toString() === userId;

  if (!isOwner) throw new AppError('Not authorised to view this prescription.', 403);

  res.json({ success: true, data: { prescription } });
};

export const createPrescription = async (req: AuthRequest, res: Response): Promise<void> => {
  const { patientId, medications, diagnosis, notes, followUpDate } = req.body as {
    patientId: string;
    medications: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
    diagnosis?: string;
    notes?: string;
    followUpDate?: string;
  };

  const prescription = await Prescription.create({
    patient: patientId,
    doctor: req.user!._id,
    medications,
    diagnosis,
    notes,
    followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    prescriptionDate: new Date(),
  });

  await Notification.create({
    recipient: patientId,
    type: 'PRESCRIPTION_CREATED',
    title: 'New Prescription',
    message: `Dr. ${req.user!.name} has issued you a new prescription.`,
    link: `/prescriptions/${prescription._id}`,
  });

  res.status(201).json({ success: true, data: { prescription } });
};
