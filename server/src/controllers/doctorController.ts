import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getAllDoctors = async (_req: Request, res: Response): Promise<void> => {
  const doctors = await prisma.user.findMany({
    where: { role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      doctorProfile: true,
    },
  });

  const formatted = doctors.map((d) => ({
    _id: d.id,
    id: d.id,
    name: d.name,
    email: d.email,
    mobile: d.mobile,
    profile: d.doctorProfile,
  }));

  res.json({ success: true, data: { doctors: formatted } });
};

export const getDoctorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const doctorId = req.user!.id;

  const [patientCount, pendingReports, upcomingAppointments, profile] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId },
      distinct: ['patientId'],
    }).then((list) => list.length),
    prisma.diagnosticReport.count({
      where: {
        OR: [{ referringDoctorId: doctorId }, { reviewedById: doctorId }],
        reviewStatus: 'PENDING_REVIEW',
        isActive: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { appointmentDate: 'asc' },
      take: 5,
    }),
    prisma.doctorProfile.findUnique({ where: { userId: doctorId } }),
  ]);

  res.json({
    success: true,
    data: {
      stats: { patientCount, pendingReports, openAlerts: 0 },
      upcomingAppointments: upcomingAppointments.map((a) => ({ ...a, _id: a.id })),
      profile,
    },
  });
};

export const getDoctorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.doctorProfile.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { id: true, name: true, email: true, mobile: true } } },
  });
  if (!profile) throw new AppError('Doctor profile not found.', 404);
  res.json({ success: true, data: { profile: { ...profile, _id: profile.id } } });
};

export const updateDoctorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { specialization, qualifications, consultationFee, clinicAddress, bio } = req.body;

  const updated = await prisma.doctorProfile.update({
    where: { userId: req.user!.id },
    data: {
      specialization: specialization || undefined,
      qualifications: qualifications || undefined,
      consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
      clinicAddress: clinicAddress || undefined,
      bio: bio || undefined,
    },
  });

  res.json({ success: true, data: { profile: updated } });
};

export const getDoctorIncomingReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const reports = await prisma.diagnosticReport.findMany({
    where: {
      OR: [{ referringDoctorId: req.user!.id }, { reviewedById: req.user!.id }],
      isActive: true,
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      diagnosticCentre: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: { reports: reports.map((r) => ({ ...r, _id: r.id })) } });
};

export const getSymptomAlerts = async (_req: AuthRequest, res: Response): Promise<void> => {
  const alerts = await prisma.symptomCheckIn.findMany({
    where: { isEmergencyAlert: true },
    include: { patient: { select: { id: true, name: true, email: true, mobile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: { alerts: alerts.map((a) => ({ ...a, _id: a.id })) } });
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Alert acknowledged.' });
};
