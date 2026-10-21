import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User, IUser, UserRole } from '../models/User';
import { AppError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Read token from HttpOnly cookie or Authorization header
    let token: string | undefined;
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    let decoded: { userId: string; role: string };
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { userId: string; role: string };
    } catch {
      throw new AppError('Session expired or invalid. Please log in again.', 401);
    }

    const user = await User.findById(decoded.userId).select('+password');
    if (!user) {
      throw new AppError('User account not found.', 401);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('Your account is inactive.', 403);
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
      return next(new AppError('You do not have permission to perform this action.', 403));
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
    const { DoctorProfile } = await import('../models/DoctorProfile');
    const profile = await DoctorProfile.findOne({ user: req.user._id });
    if (!profile || profile.verificationStatus !== 'VERIFIED') {
      return next(new AppError('Doctor account is pending verification.', 403));
    }
  }

  if (req.user.role === 'DIAGNOSTIC_CENTRE') {
    const { DiagnosticCentreProfile } = await import('../models/DiagnosticCentreProfile');
    const profile = await DiagnosticCentreProfile.findOne({ user: req.user._id });
    if (!profile || profile.verificationStatus !== 'VERIFIED') {
      return next(new AppError('Diagnostic centre account is pending verification.', 403));
    }
  }

  next();
};
