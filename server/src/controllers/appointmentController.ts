import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

async function checkConflict(
  doctorId: string,
  date: Date,
  startTime: string,
  excludeId?: string
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await prisma.appointment.findFirst({
    where: {
      doctorId,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      startTime,
      status: {
        notIn: ['CANCELLED', 'RESCHEDULED'],
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  return existing !== null;
}

export const getAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', status, upcoming } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const role = req.user!.role;

  const where: any = {};
  if (role === 'PATIENT') where.patientId = req.user!.id;
  else if (role === 'DOCTOR') where.doctorId = req.user!.id;

  if (status && status !== 'ALL') where.status = status as AppointmentStatus;
  if (upcoming === 'true') where.appointmentDate = { gte: new Date() };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true, mobile: true } },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            doctorProfile: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.appointment.count({ where }),
  ]);

  // Map to frontend-friendly _id alias
  const formatted = appointments.map((a) => ({
    ...a,
    _id: a.id,
    patient: { ...a.patient, _id: a.patient.id },
    doctor: { ...a.doctor, _id: a.doctor.id },
  }));

  res.json({
    success: true,
    data: {
      appointments: formatted,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
};

export const createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { doctorId, appointmentDate, startTime, endTime, type, reason } = req.body as {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    type?: string;
    reason?: string;
  };

  const date = new Date(appointmentDate);
  if (isNaN(date.getTime())) throw new AppError('Invalid appointment date provided.', 400);

  const conflict = await checkConflict(doctorId, date, startTime);
  if (conflict) {
    throw new AppError('This time slot is already booked for this physician. Please choose another slot.', 409);
  }

  const roomCode = `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const appointment = await prisma.appointment.create({
    data: {
      patientId: req.user!.id,
      doctorId,
      appointmentDate: date,
      startTime,
      endTime,
      type: (type as AppointmentType) || 'IN_PERSON',
      reason,
      status: 'PENDING',
      roomCode,
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctor: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify Doctor
  await prisma.notification.create({
    data: {
      recipientId: doctorId,
      title: 'New Consultation Booking',
      message: `${req.user!.name} requested a consultation on ${date.toLocaleDateString()} at ${startTime}.`,
      type: 'APPOINTMENT',
    },
  });

  res.status(201).json({
    success: true,
    data: {
      appointment: {
        ...appointment,
        _id: appointment.id,
      },
    },
  });
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { status, cancellationReason } = req.body as {
    status: AppointmentStatus;
    cancellationReason?: string;
  };

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, doctor: true },
  });

  if (!appointment) throw new AppError('Appointment not found.', 404);

  const userId = req.user!.id;
  const isAuthorized =
    appointment.patientId === userId ||
    appointment.doctorId === userId ||
    req.user!.role === 'ADMIN';

  if (!isAuthorized) {
    throw new AppError('Not authorized to modify this appointment.', 403);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status,
      cancellationReason: cancellationReason || appointment.cancellationReason,
    },
  });

  // Dispatch Notification
  const notifyRecipient = userId === appointment.patientId ? appointment.doctorId : appointment.patientId;
  await prisma.notification.create({
    data: {
      recipientId: notifyRecipient,
      title: `Consultation Status: ${status}`,
      message: `Your appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()} is now ${status}.`,
      type: 'APPOINTMENT',
    },
  });

  res.json({
    success: true,
    data: {
      appointment: { ...updated, _id: updated.id },
    },
  });
};

export const rescheduleAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { newDate, newStartTime, newEndTime } = req.body;

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new AppError('Appointment not found.', 404);

  const date = new Date(newDate);
  const conflict = await checkConflict(appointment.doctorId, date, newStartTime, id);
  if (conflict) {
    throw new AppError('The requested reschedule slot is already booked.', 409);
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: 'RESCHEDULED' },
  });

  const newAppt = await prisma.appointment.create({
    data: {
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentDate: date,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'PENDING',
      type: appointment.type,
      reason: appointment.reason,
      rescheduledFrom: appointment.id,
      roomCode: `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    },
  });

  res.json({
    success: true,
    data: { appointment: { ...newAppt, _id: newAppt.id } },
  });
};
