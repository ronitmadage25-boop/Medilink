import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    mobile?: string | null;
    isActive: boolean;
    isVerified: boolean;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      throw new AppError('Authentication required. Please sign in.', 401);
    }

    const secret = process.env.JWT_SECRET || 'medilink-super-secure-production-ready-jwt-secret-key-32chars';
    let decoded: { userId: string; role: string };
    try {
      decoded = jwt.verify(token, secret) as { userId: string; role: string };
    } catch {
      throw new AppError('Session expired or invalid credential token.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError('Account not found in healthcare registry.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact platform administration.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access forbidden: Role unauthorized for this clinical resource.', 403));
    }
    next();
  };
};

export const requireVerified = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) return next(new AppError('Authentication required.', 401));

  if (req.user.role === 'DOCTOR') {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile || !profile.isVerified) {
      return next(new AppError('Doctor credentials awaiting administrator verification.', 403));
    }
  }

  if (req.user.role === 'DIAGNOSTIC_CENTRE') {
    const profile = await prisma.diagnosticCentreProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile || !profile.isVerified) {
      return next(new AppError('Diagnostic laboratory facility awaiting administrator certification.', 403));
    }
  }

  next();
};
