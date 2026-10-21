import { Response } from 'express';
import { Appointment } from '../models/Appointment';
import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// Check doctor availability for a slot
async function checkConflict(
  doctorId: string,
  date: Date,
  startTime: string,
  excludeId?: string
): Promise<boolean> {
  const filter: Record<string, unknown> = {
    doctor: doctorId,
    appointmentDate: {
      $gte: new Date(date.toDateString()),
      $lt: new Date(new Date(date.toDateString()).getTime() + 86400000),
    },
    startTime,
    status: { $nin: ['CANCELLED', 'RESCHEDULED'] },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  return (await Appointment.exists(filter)) !== null;
}

export const getAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', status, upcoming } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const role = req.user!.role;

  const filter: Record<string, unknown> = {};
  if (role === 'PATIENT') filter.patient = req.user!._id;
  else if (role === 'DOCTOR') filter.doctor = req.user!._id;

  if (status) filter.status = status;
  if (upcoming === 'true') filter.appointmentDate = { $gte: new Date() };

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('patient', 'name email mobile')
      .populate('doctor', 'name email')
      .sort({ appointmentDate: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { appointments, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
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

  const conflict = await checkConflict(doctorId, date, startTime);
  if (conflict) {
    throw new AppError('This time slot is not available. Please choose another time.', 409);
  }

  const appointment = await Appointment.create({
    patient: req.user!._id,
    doctor: doctorId,
    appointmentDate: date,
    startTime,
    endTime,
    status: 'PENDING',
    type: type || 'IN_PERSON',
    reason,
  });

  await Notification.create({
    recipient: doctorId,
    type: 'APPOINTMENT_BOOKED',
    title: 'New Appointment Request',
    message: `${req.user!.name} has booked an appointment on ${date.toLocaleDateString()}.`,
    link: `/appointments/${appointment._id}`,
  });

  res.status(201).json({ success: true, data: { appointment } });
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, cancellationReason, notes } = req.body as {
    status: string;
    cancellationReason?: string;
    notes?: string;
  };

  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid appointment ID.', 400);

  const appointment = await Appointment.findById(id);
  if (!appointment) throw new AppError('Appointment not found.', 404);

  const userId = req.user!._id.toString();
  const isPatient = appointment.patient.toString() === userId;
  const isDoctor = appointment.doctor.toString() === userId;

  if (!isPatient && !isDoctor && req.user!.role !== 'ADMIN') {
    throw new AppError('Not authorised to update this appointment.', 403);
  }

  // Business rules
  if (status === 'CONFIRMED' && !isDoctor && req.user!.role !== 'ADMIN') {
    throw new AppError('Only the doctor can confirm an appointment.', 403);
  }

  appointment.status = status as typeof appointment.status;
  if (status === 'CANCELLED') {
    appointment.cancelledBy = req.user!._id;
    appointment.cancellationReason = cancellationReason;
  }
  if (notes) appointment.notes = notes;

  await appointment.save();

  if (status === 'CANCELLED') {
    const notifyId = isPatient ? appointment.doctor : appointment.patient;
    await Notification.create({
      recipient: notifyId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Appointment Cancelled',
      message: `Appointment on ${appointment.appointmentDate.toLocaleDateString()} has been cancelled.`,
    });
  }

  res.json({ success: true, data: { appointment } });
};

export const rescheduleAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { newDate, newStartTime, newEndTime } = req.body as {
    newDate: string;
    newStartTime: string;
    newEndTime: string;
  };

  const appointment = await Appointment.findById(id);
  if (!appointment) throw new AppError('Appointment not found.', 404);

  const userId = req.user!._id.toString();
  if (
    appointment.patient.toString() !== userId &&
    appointment.doctor.toString() !== userId &&
    req.user!.role !== 'ADMIN'
  ) {
    throw new AppError('Not authorised to reschedule this appointment.', 403);
  }

  const date = new Date(newDate);
  const conflict = await checkConflict(appointment.doctor.toString(), date, newStartTime, id);
  if (conflict) {
    throw new AppError('This time slot is not available. Please choose another time.', 409);
  }

  // Mark old as rescheduled, create new one
  appointment.status = 'RESCHEDULED';
  await appointment.save();

  const newAppointment = await Appointment.create({
    patient: appointment.patient,
    doctor: appointment.doctor,
    appointmentDate: date,
    startTime: newStartTime,
    endTime: newEndTime,
    status: 'PENDING',
    type: appointment.type,
    reason: appointment.reason,
    rescheduledFrom: appointment._id,
  });

  res.json({ success: true, data: { appointment: newAppointment } });
};
