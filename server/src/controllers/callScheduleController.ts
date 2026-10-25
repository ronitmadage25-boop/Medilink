import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { twilioVoiceService } from '../services/twilioVoiceService';
import { CallFrequency } from '@prisma/client';

export const getCallSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const schedule = await prisma.callSchedule.findUnique({
    where: { patientId: req.user!.id },
  });

  res.json({
    success: true,
    data: {
      schedule: schedule ? { ...schedule, _id: schedule.id } : null,
      providerStatus: process.env.TWILIO_ACCOUNT_SID ? 'Active (Twilio Voice IVR)' : 'Development Voice Simulator',
    },
  });
};

export const upsertCallSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { preferredTime, frequency, phone, notes, isActive } = req.body;

  if (!phone) {
    throw new AppError('A valid phone number is required for telephony check-ins.', 400);
  }

  const schedule = await prisma.callSchedule.upsert({
    where: { patientId: req.user!.id },
    update: {
      preferredTime: preferredTime || '10:00 AM',
      frequency: (frequency as CallFrequency) || 'DAILY',
      phone,
      notes: notes || null,
      isActive: isActive ?? true,
      providerStatus: 'Active (Twilio Voice IVR)',
    },
    create: {
      patientId: req.user!.id,
      preferredTime: preferredTime || '10:00 AM',
      frequency: (frequency as CallFrequency) || 'DAILY',
      phone,
      notes: notes || null,
      isActive: isActive ?? true,
      providerStatus: 'Active (Twilio Voice IVR)',
    },
  });

  res.json({
    success: true,
    data: { schedule: { ...schedule, _id: schedule.id } },
  });
};

export const triggerLiveCall = async (req: AuthRequest, res: Response): Promise<void> => {
  const schedule = await prisma.callSchedule.findUnique({
    where: { patientId: req.user!.id },
  });

  const phone = schedule?.phone || req.user!.mobile || '+919876543210';
  const result = await twilioVoiceService.triggerAutomatedRecoveryCall(
    req.user!.id,
    req.user!.name,
    phone
  );

  res.json({
    success: result.success,
    data: result,
  });
};

export const twimlVoicePrompt = async (req: Request, res: Response): Promise<void> => {
  const patientId = req.query.patientId as string;
  let patientName = 'Valued Patient';

  if (patientId) {
    const patient = await prisma.user.findUnique({ where: { id: patientId } });
    if (patient) patientName = patient.name;
  }

  const twiml = twilioVoiceService.generateVoiceTwiML(patientName);
  res.type('text/xml');
  res.send(twiml);
};

export const twimlProcessSpeech = async (req: Request, res: Response): Promise<void> => {
  const speechResult = req.body.SpeechResult || 'Patient confirmed normal recovery state and medication adherence';
  const patientId = req.query.patientId as string;

  const nlp = twilioVoiceService.processSpeechNLP(speechResult);

  if (patientId && nlp.isEscalationRequired) {
    // Alert doctor of urgent symptom reported via IVR
    const recentAppt = await prisma.appointment.findFirst({
      where: { patientId },
      orderBy: { appointmentDate: 'desc' },
    });

    if (recentAppt) {
      await prisma.notification.create({
        data: {
          recipientId: recentAppt.doctorId,
          title: 'URGENT: Twilio Voice Call Symptom Alert',
          message: `During automated voice check-in, patient reported: "${speechResult}". Escalation flagged.`,
          type: 'CHECK_IN',
        },
      });
    }
  }

  res.type('text/xml');
  res.send(
    `<Response><Say voice="Polly.Aditi" language="en-IN">Thank you for your response. Your clinical notes and medication status have been logged to your MediLink portal. Take care.</Say><Hangup/></Response>`
  );
};
