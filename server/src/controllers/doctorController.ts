import { Response } from 'express';
import { DoctorProfile } from '../models/DoctorProfile';
import { DiagnosticReport } from '../models/DiagnosticReport';
import { Appointment } from '../models/Appointment';
import { Prescription } from '../models/Prescription';
import { SymptomCheckIn } from '../models/SymptomCheckIn';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getDoctorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const doctorId = req.user!._id;

  const [patientCount, pendingReports, upcomingAppointments, openAlerts, profile] = await Promise.all([
    Appointment.distinct('patient', { doctor: doctorId }).then((ids) => ids.length),
    DiagnosticReport.countDocuments({
      referringDoctor: doctorId,
      reviewStatus: 'PENDING_REVIEW',
      isActive: true,
    }),
    Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: new Date() },
      status: { $in: ['PENDING', 'CONFIRMED'] },
    })
      .populate('patient', 'name email')
      .sort({ appointmentDate: 1 })
      .limit(5)
      .lean(),
    SymptomCheckIn.countDocuments({
      escalationStatus: 'NONE',
      severity: { $in: ['MODERATE', 'SEVERE'] },
    }),
    DoctorProfile.findOne({ user: doctorId }).lean(),
  ]);

  res.json({
    success: true,
    data: { stats: { patientCount, pendingReports, openAlerts }, upcomingAppointments, profile },
  });
};

export const getDoctorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await DoctorProfile.findOne({ user: req.user!._id })
    .populate('user', 'name email mobile')
    .lean();
  if (!profile) throw new AppError('Doctor profile not found.', 404);
  res.json({ success: true, data: { profile } });
};

export const updateDoctorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  // Doctors cannot change their own verification status
  const { verificationStatus, verifiedAt, verifiedBy, ...updateData } = req.body as Record<string, unknown>;
  void verificationStatus; void verifiedAt; void verifiedBy;

  const profile = await DoctorProfile.findOneAndUpdate(
    { user: req.user!._id },
    { $set: updateData },
    { new: true }
  );
  if (!profile) throw new AppError('Doctor profile not found.', 404);
  res.json({ success: true, data: { profile } });
};

export const getDoctorIncomingReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', reviewStatus } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));

  const filter: Record<string, unknown> = { referringDoctor: req.user!._id, isActive: true };
  if (reviewStatus) filter.reviewStatus = reviewStatus;

  const [reports, total] = await Promise.all([
    DiagnosticReport.find(filter)
      .populate('patient', 'name email')
      .populate('diagnosticCentre', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    DiagnosticReport.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { reports, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const getSymptomAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  // Doctors can see alerts for their patients
  const patientIds = await Appointment.distinct('patient', { doctor: req.user!._id });

  const { page = '1', limit = '10' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));

  const filter = { patient: { $in: patientIds } };

  const [alerts, total] = await Promise.all([
    SymptomCheckIn.find(filter)
      .populate('patient', 'name email')
      .sort({ reportedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    SymptomCheckIn.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { alerts, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const patientIds = await Appointment.distinct('patient', { doctor: req.user!._id });

  const alert = await SymptomCheckIn.findById(id);
  if (!alert) throw new AppError('Alert not found.', 404);

  const isAuthorised = patientIds.some((pid) => pid.toString() === alert.patient.toString());
  if (!isAuthorised && req.user!.role !== 'ADMIN') {
    throw new AppError('Not authorised to acknowledge this alert.', 403);
  }

  alert.acknowledgedBy = req.user!._id;
  alert.acknowledgedAt = new Date();
  alert.escalationStatus = 'RESOLVED';
  await alert.save();

  res.json({ success: true, message: 'Alert acknowledged.' });
};

export const getAllDoctors = async (_req: AuthRequest, res: Response): Promise<void> => {
  const doctors = await DoctorProfile.find({ verificationStatus: 'VERIFIED' })
    .populate('user', 'name email mobile')
    .lean();
  res.json({ success: true, data: { doctors } });
};
