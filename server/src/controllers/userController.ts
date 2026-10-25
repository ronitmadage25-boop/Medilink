import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      patientProfile: true,
      doctorProfile: true,
      centreProfile: true,
    },
  });

  if (!user) throw new AppError('User account not found.', 404);

  const sanitizedUser = {
    _id: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mobile: user.mobile,
    isActive: user.isActive,
    isVerified: user.isVerified,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    patientProfile: user.patientProfile,
    doctorProfile: user.doctorProfile,
    centreProfile: user.centreProfile,
  };

  res.json({
    success: true,
    data: { user: sanitizedUser },
  });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, mobile } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      name: name || undefined,
      mobile: mobile || undefined,
    },
  });

  res.json({
    success: true,
    data: { user: { ...updated, _id: updated.id } },
    message: 'Profile updated successfully.',
  });
};

export const getPublicDoctors = async (_req: Request, res: Response): Promise<void> => {
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

export const getPatients = async (_req: AuthRequest, res: Response): Promise<void> => {
  const patients = await prisma.user.findMany({
    where: { role: 'PATIENT', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      patientProfile: true,
    },
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
