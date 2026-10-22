import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getPrescriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const role = req.user!.role;

  const where: any = {};
  if (role === 'PATIENT') where.patientId = req.user!.id;
  else if (role === 'DOCTOR') where.doctorId = req.user!.id;

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.prescription.count({ where }),
  ]);

  const formatted = prescriptions.map((p) => ({
    ...p,
    _id: p.id,
    patient: { ...p.patient, _id: p.patient.id },
    doctor: { ...p.doctor, _id: p.doctor.id },
  }));

  res.json({
    success: true,
    data: {
      prescriptions: formatted,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
};

export const getPrescriptionById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, email: true, mobile: true } },
      doctor: { select: { id: true, name: true, email: true } },
    },
  });

  if (!prescription) throw new AppError('Prescription record not found.', 404);

  const userId = req.user!.id;
  const isAuthorized =
    prescription.patientId === userId ||
    prescription.doctorId === userId ||
    req.user!.role === 'ADMIN';

  if (!isAuthorized) throw new AppError('Access forbidden to this prescription.', 403);

  const pAny = prescription as any;

  res.json({
    success: true,
    data: {
      prescription: {
        ...prescription,
        _id: prescription.id,
        patient: pAny.patient ? { ...pAny.patient, _id: pAny.patient.id } : null,
        doctor: pAny.doctor ? { ...pAny.doctor, _id: pAny.doctor.id } : null,
      },
    },
  });
};

export const createPrescription = async (req: AuthRequest, res: Response): Promise<void> => {
  const { patientId, medications, diagnosis, advice, followUpDate, appointmentId } = req.body;

  if (!patientId || !medications || !diagnosis) {
    throw new AppError('Patient ID, medications regimen, and diagnosis are required.', 400);
  }

  const prescription = await prisma.prescription.create({
    data: {
      patientId,
      doctorId: req.user!.id,
      appointmentId: appointmentId || null,
      diagnosis,
      medications,
      advice: advice || null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    },
  });

  // Notify Patient
  await prisma.notification.create({
    data: {
      recipientId: patientId,
      title: 'Digital Prescription Issued',
      message: `Dr. ${req.user!.name} has issued your medication regimen for ${diagnosis}.`,
      type: 'PRESCRIPTION',
    },
  });

  res.status(201).json({
    success: true,
    data: {
      prescription: {
        ...prescription,
        _id: prescription.id,
      },
    },
  });
};
