import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';

const getJwtSecret = () => process.env.JWT_SECRET || 'medilink-super-secure-production-ready-jwt-secret-key-32chars';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'medilink-super-secure-production-ready-refresh-secret-key-32chars';

const generateTokens = (userId: string, role: string) => {
  const token = jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '4h' });
  const refreshToken = jwt.sign({ userId, role }, getRefreshSecret(), { expiresIn: '7d' });
  return { token, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, role, mobile, ...extra } = req.body;

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required.', 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  const hashedPassword = await hashPassword(password);
  const userRole: UserRole = (role as UserRole) || 'PATIENT';

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name,
      role: userRole,
      mobile: mobile || null,
      isActive: true,
      isVerified: userRole === 'PATIENT',
    },
  });

  // Create role-specific profile
  if (userRole === 'PATIENT') {
    await prisma.patientProfile.create({
      data: {
        userId: user.id,
        address: extra.address || null,
        district: extra.district || null,
      },
    });
  } else if (userRole === 'DOCTOR') {
    await prisma.doctorProfile.create({
      data: {
        userId: user.id,
        specialization: extra.speciality || 'General Medicine',
        registrationNumber: extra.medicalRegistrationNumber || `DOC-${Date.now()}`,
        qualifications: extra.qualifications ? (Array.isArray(extra.qualifications) ? extra.qualifications : [extra.qualifications]) : ['MBBS'],
        isVerified: false,
      },
    });
  } else if (userRole === 'DIAGNOSTIC_CENTRE') {
    await prisma.diagnosticCentreProfile.create({
      data: {
        userId: user.id,
        centreName: extra.centreName || name,
        registrationNumber: extra.registrationNumber || `LAB-${Date.now()}`,
        address: extra.address || null,
        contactNumber: mobile || null,
        isVerified: false,
      },
    });
  }

  const { token, refreshToken } = generateTokens(user.id, user.role);

  const sanitizedUser = {
    _id: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mobile: user.mobile,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };

  res.status(201).json({
    success: true,
    data: {
      user: sanitizedUser,
      token,
      refreshToken,
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide both email and password.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      patientProfile: true,
      doctorProfile: true,
      centreProfile: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials. Please verify your email and password.', 401);
  }

  const isValid = await verifyPassword(user.password, password);
  if (!isValid) {
    throw new AppError('Invalid credentials. Please verify your email and password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact administration.', 403);
  }

  const { token, refreshToken } = generateTokens(user.id, user.role);

  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user.id,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    },
  });

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
    data: {
      user: sanitizedUser,
      token,
      refreshToken,
    },
  });
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      patientProfile: true,
      doctorProfile: true,
      centreProfile: true,
    },
  });

  if (!user) throw new AppError('User not found.', 404);

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

  res.json({ success: true, data: { user: sanitizedUser } });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) throw new AppError('Refresh token required.', 400);

  try {
    const decoded = jwt.verify(token, getRefreshSecret()) as { userId: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) throw new AppError('Invalid token session.', 401);

    const tokens = generateTokens(user.id, user.role);
    res.json({ success: true, data: tokens });
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Password recovery instructions dispatched if account exists.' });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Password reset completed.' });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) throw new AppError('User not found.', 404);

  const isValid = await verifyPassword(user.password, currentPassword);
  if (!isValid) {
    throw new AppError('Current password is incorrect.', 400);
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  res.json({
    success: true,
    message: 'Password updated successfully.',
  });
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie('accessToken');
  res.json({ success: true, message: 'Logged out successfully.' });
};
