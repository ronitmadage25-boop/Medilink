import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

export const getAdminDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalUsers,
    totalPatients,
    totalDoctors,
    totalCentres,
    pendingDoctorVerifications,
    pendingCentreVerifications,
    totalAppointments,
    totalReports,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'PATIENT' } }),
    prisma.user.count({ where: { role: 'DOCTOR' } }),
    prisma.user.count({ where: { role: 'DIAGNOSTIC_CENTRE' } }),
    prisma.doctorProfile.count({ where: { isVerified: false } }),
    prisma.diagnosticCentreProfile.count({ where: { isVerified: false } }),
    prisma.appointment.count(),
    prisma.diagnosticReport.count(),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const formattedLogs = recentAuditLogs.map((l) => ({
    ...l,
    _id: l.id,
    actor: l.actor ? { ...l.actor, _id: l.actor.id } : null,
  }));

  res.json({
    success: true,
    data: {
      totalUsers,
      totalPatients,
      totalDoctors,
      totalCentres,
      pendingDoctorVerifications,
      pendingCentreVerifications,
      totalAppointments,
      totalReports,
      recentAuditLogs: formattedLogs,
    },
  });
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, search } = req.query as Record<string, string>;
  const where: any = {};

  if (role && role !== 'ALL') where.role = role as UserRole;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mobile: true,
      isActive: true,
      isVerified: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = users.map((u) => ({ ...u, _id: u.id }));
  res.json({ success: true, data: { users: formatted } });
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { isActive } = req.body as { isActive: boolean };

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resourceType: 'User',
      resourceId: user.id,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    },
  });

  res.json({
    success: true,
    data: { user: { ...user, _id: user.id } },
    message: `Account status updated to ${isActive ? 'Active' : 'Deactivated'}.`,
  });
};

export const verifyDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);

  // Can be doctor profile id or user id
  const doctorProfile = await prisma.doctorProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
  });

  if (!doctorProfile) throw new AppError('Doctor record not found.', 404);

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorProfile.id },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: doctorProfile.userId },
    data: { isVerified: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'DOCTOR_LICENSE_VERIFIED',
      resourceType: 'DoctorProfile',
      resourceId: doctorProfile.id,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    },
  });

  res.json({ success: true, data: { doctorProfile: updated } });
};

export const verifyCentre = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const centreProfile = await prisma.diagnosticCentreProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
  });

  if (!centreProfile) throw new AppError('Diagnostic centre record not found.', 404);

  const updated = await prisma.diagnosticCentreProfile.update({
    where: { id: centreProfile.id },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: centreProfile.userId },
    data: { isVerified: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'CENTRE_FACILITY_VERIFIED',
      resourceType: 'DiagnosticCentreProfile',
      resourceId: centreProfile.id,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    },
  });

  res.json({ success: true, data: { diagnosticCentre: updated } });
};

export const getPendingVerifications = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [doctors, diagnosticCentres] = await Promise.all([
    prisma.doctorProfile.findMany({
      where: { isVerified: false },
      include: { user: { select: { id: true, name: true, email: true, mobile: true } } },
    }),
    prisma.diagnosticCentreProfile.findMany({
      where: { isVerified: false },
      include: { user: { select: { id: true, name: true, email: true, mobile: true } } },
    }),
  ]);

  const formattedDoctors = doctors.map((d) => ({
    ...d,
    _id: d.id,
    user: { ...d.user, _id: d.user.id },
  }));

  const formattedCentres = diagnosticCentres.map((c) => ({
    ...c,
    _id: c.id,
    user: { ...c.user, _id: c.user.id },
  }));

  res.json({
    success: true,
    data: { doctors: formattedDoctors, diagnosticCentres: formattedCentres },
  });
};

export const getAdminAuditLogs = async (_req: AuthRequest, res: Response): Promise<void> => {
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });

  const formatted = logs.map((l) => ({
    ...l,
    _id: l.id,
    actor: l.actor ? { ...l.actor, _id: l.actor.id } : null,
  }));

  res.json({ success: true, data: { logs: formatted } });
};
