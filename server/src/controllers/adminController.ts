import { Response } from 'express';
import { User } from '../models/User';
import { DoctorProfile } from '../models/DoctorProfile';
import { DiagnosticCentreProfile } from '../models/DiagnosticCentreProfile';
import { DiagnosticReport } from '../models/DiagnosticReport';
import { Appointment } from '../models/Appointment';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const getAdminDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalUsers,
    roleDistribution,
    pendingDoctors,
    pendingCentres,
    reportCount,
    appointmentCount,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    DoctorProfile.countDocuments({ verificationStatus: 'PENDING' }),
    DiagnosticCentreProfile.countDocuments({ verificationStatus: 'PENDING' }),
    DiagnosticReport.countDocuments(),
    Appointment.countDocuments(),
    AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  res.json({
    success: true,
    data: {
      stats: { totalUsers, reportCount, appointmentCount, pendingDoctors, pendingCentres },
      roleDistribution,
      recentActivity,
    },
  });
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', role, status, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { users, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, reason } = req.body as { status: string; reason?: string };

  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid user ID.', 400);

  const user = await User.findById(id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'ADMIN') throw new AppError('Cannot modify admin account status.', 403);

  const oldStatus = user.status;
  user.status = status as typeof user.status;
  await user.save();

  await AuditLog.create({
    actor: req.user!._id,
    actorRole: req.user!.role,
    action: 'USER_STATUS_CHANGED',
    resourceType: 'User',
    resourceId: user._id,
    metadata: { from: oldStatus, to: status, reason },
    outcome: 'SUCCESS',
  });

  await Notification.create({
    recipient: user._id,
    type: 'SYSTEM',
    title: 'Account Status Updated',
    message: `Your account status has been updated to ${status}.`,
  });

  res.json({ success: true, message: 'User status updated.' });
};

export const verifyDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { verificationStatus, verificationNotes } = req.body as {
    verificationStatus: 'VERIFIED' | 'REJECTED';
    verificationNotes?: string;
  };

  const profile = await DoctorProfile.findById(id);
  if (!profile) throw new AppError('Doctor profile not found.', 404);

  profile.verificationStatus = verificationStatus;
  profile.verificationNotes = verificationNotes;
  profile.verifiedAt = new Date();
  profile.verifiedBy = req.user!._id;
  await profile.save();

  // Update user status
  const user = await User.findById(profile.user);
  if (user) {
    user.status = verificationStatus === 'VERIFIED' ? 'ACTIVE' : 'INACTIVE';
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: 'VERIFICATION_UPDATE',
      title: verificationStatus === 'VERIFIED' ? 'Account Verified' : 'Verification Status Updated',
      message:
        verificationStatus === 'VERIFIED'
          ? 'Congratulations! Your doctor account has been verified. You can now use all features.'
          : `Your verification status has been updated to ${verificationStatus}. ${verificationNotes || ''}`,
    });
  }

  await AuditLog.create({
    actor: req.user!._id,
    actorRole: req.user!.role,
    action: 'DOCTOR_VERIFICATION',
    resourceType: 'DoctorProfile',
    resourceId: profile._id,
    metadata: { verificationStatus },
    outcome: 'SUCCESS',
  });

  res.json({ success: true, message: 'Doctor verification status updated.' });
};

export const verifyCentre = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { verificationStatus, verificationNotes } = req.body as {
    verificationStatus: 'VERIFIED' | 'REJECTED';
    verificationNotes?: string;
  };

  const profile = await DiagnosticCentreProfile.findById(id);
  if (!profile) throw new AppError('Diagnostic centre profile not found.', 404);

  profile.verificationStatus = verificationStatus;
  profile.verificationNotes = verificationNotes;
  profile.verifiedAt = new Date();
  profile.verifiedBy = req.user!._id;
  await profile.save();

  const user = await User.findById(profile.user);
  if (user) {
    user.status = verificationStatus === 'VERIFIED' ? 'ACTIVE' : 'INACTIVE';
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: 'VERIFICATION_UPDATE',
      title:
        verificationStatus === 'VERIFIED' ? 'Centre Verified' : 'Verification Status Updated',
      message:
        verificationStatus === 'VERIFIED'
          ? 'Your diagnostic centre has been verified and can now upload reports.'
          : `Verification: ${verificationNotes || verificationStatus}`,
    });
  }

  await AuditLog.create({
    actor: req.user!._id,
    actorRole: req.user!.role,
    action: 'CENTRE_VERIFICATION',
    resourceType: 'DiagnosticCentreProfile',
    resourceId: profile._id,
    metadata: { verificationStatus },
    outcome: 'SUCCESS',
  });

  res.json({ success: true, message: 'Centre verification status updated.' });
};

export const getPendingVerifications = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [pendingDoctors, pendingCentres] = await Promise.all([
    DoctorProfile.find({ verificationStatus: 'PENDING' })
      .populate('user', 'name email mobile createdAt')
      .lean(),
    DiagnosticCentreProfile.find({ verificationStatus: 'PENDING' })
      .populate('user', 'name email mobile createdAt')
      .lean(),
  ]);

  res.json({ success: true, data: { pendingDoctors, pendingCentres } });
};

export const getAdminAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', action, actorId } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));

  const filter: Record<string, unknown> = {};
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (actorId && mongoose.isValidObjectId(actorId)) filter.actor = actorId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};
