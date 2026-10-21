import { Response } from 'express';
import { DiagnosticReport } from '../models/DiagnosticReport';
import { MedicalRecord } from '../models/MedicalRecord';
import { Prescription } from '../models/Prescription';
import { Appointment } from '../models/Appointment';
import { PatientProfile } from '../models/PatientProfile';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

// GET /patients/dashboard
export const getPatientDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = req.user!._id;

  const [recordCount, reportCount, prescriptionCount, upcomingAppointments, recentReports, profile] =
    await Promise.all([
      MedicalRecord.countDocuments({ patient: patientId, isActive: true }),
      DiagnosticReport.countDocuments({ patient: patientId, isActive: true }),
      Prescription.countDocuments({ patient: patientId, isActive: true }),
      Appointment.find({
        patient: patientId,
        appointmentDate: { $gte: new Date() },
        status: { $in: ['PENDING', 'CONFIRMED'] },
      })
        .populate('doctor', 'name')
        .sort({ appointmentDate: 1 })
        .limit(5)
        .lean(),
      DiagnosticReport.find({ patient: patientId, isActive: true })
        .populate('diagnosticCentre', 'name')
        .populate('referringDoctor', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      PatientProfile.findOne({ user: patientId }).lean(),
    ]);

  res.json({
    success: true,
    data: {
      stats: { recordCount, reportCount, prescriptionCount },
      upcomingAppointments,
      recentReports,
      profile,
    },
  });
};

// GET /patients/records
export const getPatientRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', category, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const filter: Record<string, unknown> = { patient: req.user!._id, isActive: true };
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: 'i' };

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
};

// POST /patients/records
export const createPatientRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await MedicalRecord.create({
    ...req.body,
    patient: req.user!._id,
  });
  res.status(201).json({ success: true, data: { record } });
};

// GET /patients/profile
export const getPatientProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await PatientProfile.findOne({ user: req.user!._id }).lean();
  if (!profile) throw new AppError('Profile not found.', 404);
  res.json({ success: true, data: { profile } });
};

// PATCH /patients/profile
export const updatePatientProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await PatientProfile.findOneAndUpdate(
    { user: req.user!._id },
    { $set: req.body },
    { new: true, upsert: true }
  );
  res.json({ success: true, data: { profile } });
};

// GET /patients — for doctors to list their authorised patients
export const getDoctorPatients = async (req: AuthRequest, res: Response): Promise<void> => {
  const doctorId = req.user!._id;

  // A patient is "authorised" to the doctor if there is at least one appointment
  const appointmentPatients = await Appointment.find({ doctor: doctorId })
    .distinct('patient');

  const { page = '1', limit = '10', search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const userFilter: Record<string, unknown> = {
    _id: { $in: appointmentPatients },
    role: 'PATIENT',
  };
  if (search) {
    userFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [patients, total] = await Promise.all([
    User.find(userFilter)
      .select('name email mobile createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(userFilter),
  ]);

  res.json({
    success: true,
    data: { patients, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

// GET /patients/:id — for doctors to view a specific patient (must have appointment relationship)
export const getPatientById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const doctorId = req.user!._id;

  if (req.user!.role !== 'ADMIN') {
    const hasAppointment = await Appointment.exists({ doctor: doctorId, patient: id });
    if (!hasAppointment) {
      throw new AppError('You do not have access to this patient record.', 403);
    }
  }

  const [user, profile, reports, prescriptions, appointments] = await Promise.all([
    User.findById(id).select('name email mobile createdAt'),
    PatientProfile.findOne({ user: id }),
    DiagnosticReport.find({ patient: id, isActive: true })
      .populate('diagnosticCentre', 'name')
      .sort({ testDate: -1 })
      .limit(10)
      .lean(),
    Prescription.find({ patient: id, isActive: true })
      .populate('doctor', 'name')
      .sort({ prescriptionDate: -1 })
      .limit(10)
      .lean(),
    Appointment.find({ patient: id })
      .populate('doctor', 'name')
      .sort({ appointmentDate: -1 })
      .limit(10)
      .lean(),
  ]);

  if (!user || user.role !== 'PATIENT') throw new AppError('Patient not found.', 404);

  res.json({ success: true, data: { user, profile, reports, prescriptions, appointments } });
};
