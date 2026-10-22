import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { SeverityLevel } from '@prisma/client';

export const getMyCheckIns = async (req: AuthRequest, res: Response): Promise<void> => {
  const checkIns = await prisma.symptomCheckIn.findMany({
    where: { patientId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const formatted = checkIns.map((c) => ({ ...c, _id: c.id }));
  res.json({ success: true, data: { checkIns: formatted } });
};

export const createCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  const { symptoms, severity, notes } = req.body as {
    symptoms: string[];
    severity?: SeverityLevel;
    notes?: string;
  };

  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    throw new AppError('Please select at least one symptom.', 400);
  }

  const criticalKeywords = ['chest pain', 'shortness of breath', 'difficulty breathing', 'severe numbness'];
  const hasCriticalSymptom = symptoms.some((s) =>
    criticalKeywords.some((keyword) => s.toLowerCase().includes(keyword))
  );

  const isEmergency = severity === 'SEVERE' || hasCriticalSymptom;
  let doctorAlerted = false;

  // Find recent attending doctor
  const recentAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: req.user!.id,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    orderBy: { appointmentDate: 'desc' },
  });

  if (isEmergency && recentAppointment) {
    await prisma.notification.create({
      data: {
        recipientId: recentAppointment.doctorId,
        title: 'HIGH PRIORITY: Patient Emergency Symptoms Reported',
        message: `Patient ${req.user!.name} logged high-severity symptoms (${symptoms.join(', ')}). Immediate clinical attention advised.`,
        type: 'CHECK_IN',
      },
    });
    doctorAlerted = true;
  }

  const checkIn = await prisma.symptomCheckIn.create({
    data: {
      patientId: req.user!.id,
      symptoms,
      severity: severity || 'MILD',
      notes: notes || null,
      isEmergencyAlert: isEmergency,
      doctorAlerted,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      checkIn: { ...checkIn, _id: checkIn.id },
      emergencyNotice: isEmergency
        ? 'Warning: High severity symptoms detected. If you are in immediate distress, dial emergency services (112 or local hospital) without delay.'
        : null,
    },
  });
};
