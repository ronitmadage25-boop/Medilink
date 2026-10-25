import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getPatientDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = req.user!.id;

  const [reportCount, prescriptionCount, upcomingAppointments, recentReports, profile] =
    await Promise.all([
      prisma.diagnosticReport.count({ where: { patientId, isActive: true } }),
      prisma.prescription.count({ where: { patientId } }),
      prisma.appointment.findMany({
        where: {
          patientId,
          appointmentDate: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { doctor: { select: { id: true, name: true, email: true } } },
        orderBy: { appointmentDate: 'asc' },
        take: 5,
      }),
      prisma.diagnosticReport.findMany({
        where: { patientId, isActive: true },
        include: {
          diagnosticCentre: { select: { id: true, name: true } },
          referringDoctor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.patientProfile.findUnique({ where: { userId: patientId } }),
    ]);

  res.json({
    success: true,
    data: {
      stats: { reportCount, prescriptionCount },
      upcomingAppointments: upcomingAppointments.map((a) => ({ ...a, _id: a.id })),
      recentReports: recentReports.map((r) => ({ ...r, _id: r.id })),
      profile,
    },
  });
};

export const getDoctorPatients = async (_req: AuthRequest, res: Response): Promise<void> => {
  const patients = await prisma.user.findMany({
    where: { role: 'PATIENT', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      patientProfile: true,
    },
    orderBy: { name: 'asc' },
  });

  const formatted = patients.map((p) => ({
    _id: p.id,
    id: p.id,
    name: p.name,
    email: p.email,
    mobile: p.mobile,
    profile: p.patientProfile,
  }));

  res.json({ success: true, data: { patients: formatted } });
};

export const getPatientById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const patient = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      patientProfile: true,
    },
  });

  if (!patient) throw new AppError('Patient not found.', 404);

  res.json({
    success: true,
    data: { patient: { ...patient, _id: patient.id } },
  });
};

export const getPatientProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.id },
  });
  res.json({ success: true, data: { profile } });
};

export const updatePatientProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { district, address, bloodGroup, allergies, chronicConditions } = req.body;

  const updated = await prisma.patientProfile.upsert({
    where: { userId: req.user!.id },
    update: {
      district: district || undefined,
      address: address || undefined,
      bloodGroup: bloodGroup || undefined,
      allergies: allergies || undefined,
      chronicConditions: chronicConditions || undefined,
    },
    create: {
      userId: req.user!.id,
      district,
      address,
      bloodGroup,
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
    },
  });

  res.json({ success: true, data: { profile: updated } });
};
