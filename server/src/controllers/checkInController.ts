import { Response } from 'express';
import { SymptomCheckIn } from '../models/SymptomCheckIn';
import { Notification } from '../models/Notification';
import { Appointment } from '../models/Appointment';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getMyCheckIns = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));

  const [checkIns, total] = await Promise.all([
    SymptomCheckIn.find({ patient: req.user!._id })
      .sort({ reportedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    SymptomCheckIn.countDocuments({ patient: req.user!._id }),
  ]);

  res.json({
    success: true,
    data: { checkIns, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const createCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  const { symptoms, severity, notes } = req.body as {
    symptoms: string[];
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
    notes?: string;
  };

  const isEmergency = symptoms.some((s) =>
    ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious'].some((e) =>
      s.toLowerCase().includes(e)
    )
  ) || severity === 'SEVERE';

  const checkIn = await SymptomCheckIn.create({
    patient: req.user!._id,
    symptoms,
    severity,
    notes,
    isEmergency,
  });

  // Alert patient's doctors
  if (severity === 'MODERATE' || severity === 'SEVERE') {
    const doctorIds = await Appointment.distinct('doctor', { patient: req.user!._id });
    for (const doctorId of doctorIds) {
      await Notification.create({
        recipient: doctorId,
        type: 'SYMPTOM_ALERT',
        title: isEmergency ? '⚠️ Emergency Symptom Alert' : 'Symptom Check-in Alert',
        message: `${req.user!.name} reported ${severity.toLowerCase()} symptoms: ${symptoms.join(', ')}.`,
        link: `/alerts/${checkIn._id}`,
      });
    }
  }

  res.status(201).json({
    success: true,
    data: { checkIn },
    ...(isEmergency && {
      emergency: true,
      emergencyMessage:
        'Based on your reported symptoms, please seek immediate emergency medical care or call your local emergency services immediately. Do not rely on this application for emergency response.',
    }),
  });
};

export const getRecords = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: { records: [] } });
};
