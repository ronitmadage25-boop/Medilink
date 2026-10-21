import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { User } from '../models/User';
import { PatientProfile } from '../models/PatientProfile';
import { DoctorProfile } from '../models/DoctorProfile';
import { DiagnosticCentreProfile } from '../models/DiagnosticCentreProfile';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ userId, role }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, mobile, role, ...extra } = req.body as {
    email: string;
    password: string;
    name: string;
    mobile: string;
    role: string;
    [key: string]: unknown;
  };

  // Prevent admin registration through public endpoint
  if (role === 'ADMIN') {
    throw new AppError('Admin accounts cannot be created through public registration.', 403);
  }

  const allowed = ['PATIENT', 'DOCTOR', 'DIAGNOSTIC_CENTRE'];
  if (!allowed.includes(role)) {
    throw new AppError('Invalid role specified.', 400);
  }

  const hashedPassword = await argon2.hash(password);

  const user = await User.create({
    email,
    password: hashedPassword,
    name,
    mobile,
    role,
    status: 'ACTIVE',
  });

  // Create role-specific profiles
  if (role === 'PATIENT') {
    await PatientProfile.create({
      user: user._id,
      district: extra.district,
    });
  } else if (role === 'DOCTOR') {
    await DoctorProfile.create({
      user: user._id,
      medicalRegistrationNumber: extra.medicalRegistrationNumber,
      speciality: extra.speciality,
      clinicOrHospital: extra.clinicOrHospital,
      verificationStatus: 'PENDING',
    });
    user.status = 'PENDING_VERIFICATION';
    await user.save();
  } else if (role === 'DIAGNOSTIC_CENTRE') {
    await DiagnosticCentreProfile.create({
      user: user._id,
      centreName: extra.centreName,
      contactPerson: extra.contactPerson || name,
      address: extra.address || '',
      district: extra.district,
      registrationNumber: extra.registrationNumber,
      verificationStatus: 'PENDING',
    });
    user.status = 'PENDING_VERIFICATION';
    await user.save();
  }

  await AuditLog.create({
    actor: user._id,
    actorRole: role,
    action: 'USER_REGISTERED',
    resourceType: 'User',
    resourceId: user._id,
    outcome: 'SUCCESS',
  });

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);

  res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('Your account has been suspended. Contact support.', 403);
  }

  const isMatch = await argon2.verify(user.password, password);
  if (!isMatch) {
    await AuditLog.create({
      actor: user._id,
      actorRole: user.role,
      action: 'LOGIN_FAILED',
      resourceType: 'User',
      resourceId: user._id,
      outcome: 'FAILURE',
    });
    throw new AppError('Invalid email or password.', 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  await AuditLog.create({
    actor: user._id,
    actorRole: user.role,
    action: 'LOGIN_SUCCESS',
    resourceType: 'User',
    resourceId: user._id,
    outcome: 'SUCCESS',
  });

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);

  res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.json({
    success: true,
    message: 'Logged in successfully.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
    },
  });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) {
    await AuditLog.create({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'LOGOUT',
      resourceType: 'User',
      resourceId: req.user._id,
      outcome: 'SUCCESS',
    });
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({ success: true, message: 'Logged out successfully.' });
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError('User not found.', 404);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    },
  });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new AppError('No refresh token found.', 401);

  let decoded: { userId: string; role: string };
  try {
    decoded = jwt.verify(token, config.jwtRefreshSecret) as { userId: string; role: string };
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.status === 'SUSPENDED') {
    throw new AppError('User not found or suspended.', 401);
  }

  const { accessToken, refreshToken: newRefresh } = generateTokens(user._id.toString(), user.role);
  res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', newRefresh, COOKIE_OPTIONS);

  res.json({ success: true, message: 'Token refreshed.' });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return same response to avoid user enumeration
  const successMessage = 'If that email exists in our system, a password reset link has been sent.';

  if (!user) {
    res.json({ success: true, message: successMessage });
    return;
  }

  // Invalidate existing tokens
  await PasswordResetToken.updateMany({ user: user._id, isUsed: false }, { isUsed: true });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  // In production, send email with rawToken link
  const resetLink = `${config.clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
  logger.info(`Password reset link (dev only): ${resetLink}`);

  // TODO: Send via configured email provider when available

  res.json({ success: true, message: successMessage });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, email, newPassword } = req.body as {
    token: string;
    email: string;
    newPassword: string;
  };

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('Invalid or expired reset token.', 400);

  const resetToken = await PasswordResetToken.findOne({
    user: user._id,
    tokenHash,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) throw new AppError('Invalid or expired reset token.', 400);

  const hashedPassword = await argon2.hash(newPassword);
  user.password = hashedPassword;
  await user.save();

  resetToken.isUsed = true;
  resetToken.usedAt = new Date();
  await resetToken.save();

  // Clear all sessions by clearing cookies (client-side action triggered by response)
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  await AuditLog.create({
    actor: user._id,
    actorRole: user.role,
    action: 'PASSWORD_RESET',
    resourceType: 'User',
    resourceId: user._id,
    outcome: 'SUCCESS',
  });

  res.json({ success: true, message: 'Password reset successfully. Please log in again.' });
};
