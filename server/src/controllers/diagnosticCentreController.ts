import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DiagnosticReport } from '../models/DiagnosticReport';
import { DiagnosticCentreProfile } from '../models/DiagnosticCentreProfile';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/env';
import { storageAdapter } from '../adapters/storageAdapter';
import { Appointment } from '../models/Appointment';

export const getDiagnosticCentreDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const centreId = req.user!._id;

  const [pending, processing, ready, delivered, profile] = await Promise.all([
    DiagnosticReport.countDocuments({ diagnosticCentre: centreId, reportStatus: 'PENDING', isActive: true }),
    DiagnosticReport.countDocuments({ diagnosticCentre: centreId, reportStatus: 'PROCESSING', isActive: true }),
    DiagnosticReport.countDocuments({ diagnosticCentre: centreId, reportStatus: 'READY', isActive: true }),
    DiagnosticReport.countDocuments({ diagnosticCentre: centreId, reportStatus: 'DELIVERED', isActive: true }),
    DiagnosticCentreProfile.findOne({ user: centreId }).populate('user', 'name email mobile').lean(),
  ]);

  res.json({
    success: true,
    data: { stats: { pending, processing, ready, delivered }, profile },
  });
};

export const getCentreReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', reportStatus, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));

  const filter: Record<string, unknown> = { diagnosticCentre: req.user!._id, isActive: true };
  if (reportStatus) filter.reportStatus = reportStatus;

  const [reports, total] = await Promise.all([
    DiagnosticReport.find(filter)
      .populate('patient', 'name email')
      .populate('referringDoctor', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    DiagnosticReport.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { reports, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const uploadReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) throw new AppError('No file uploaded.', 400);

  const { patientId, referringDoctorId, testType, testDate, notes, findings } = req.body as {
    patientId: string;
    referringDoctorId?: string;
    testType: string;
    testDate: string;
    notes?: string;
    findings?: string;
  };

  const fileKey = await storageAdapter.store(file);

  const report = await DiagnosticReport.create({
    patient: patientId,
    diagnosticCentre: req.user!._id,
    referringDoctor: referringDoctorId || undefined,
    testType,
    testDate: new Date(testDate),
    reportStatus: 'READY',
    reviewStatus: 'PENDING_REVIEW',
    file: {
      provider: config.fileStorageProvider,
      fileKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date(),
    },
    notes,
    findings,
  });

  // Notify patient
  await Notification.create({
    recipient: patientId,
    type: 'REPORT_UPLOADED',
    title: 'New Diagnostic Report Available',
    message: `Your ${testType} report from ${req.user!.name} is now available.`,
    link: `/reports/${report._id}`,
  });

  // Notify referring doctor
  if (referringDoctorId) {
    await Notification.create({
      recipient: referringDoctorId,
      type: 'REPORT_DELIVERED',
      title: 'Diagnostic Report Ready for Review',
      message: `A ${testType} report for your patient is ready for review.`,
      link: `/reports/${report._id}`,
    });
  }

  await AuditLog.create({
    actor: req.user!._id,
    actorRole: req.user!.role,
    action: 'REPORT_UPLOADED',
    resourceType: 'DiagnosticReport',
    resourceId: report._id,
    outcome: 'SUCCESS',
  });

  res.status(201).json({ success: true, data: { report } });
};

export const deliverReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { recipientIds } = req.body as { recipientIds: string[] };

  const report = await DiagnosticReport.findById(id);
  if (!report) throw new AppError('Report not found.', 404);

  if (report.diagnosticCentre.toString() !== req.user!._id.toString()) {
    throw new AppError('Not authorised to deliver this report.', 403);
  }

  // Validate recipients are either the patient or the referring doctor
  const allowedRecipients = [
    report.patient.toString(),
    ...(report.referringDoctor ? [report.referringDoctor.toString()] : []),
  ];

  const unauthorised = recipientIds.filter((id) => !allowedRecipients.includes(id));
  if (unauthorised.length > 0) {
    throw new AppError('Some recipients are not authorised to receive this report.', 403);
  }

  report.deliveredTo = [...new Set([...report.deliveredTo.map(String), ...recipientIds])].map(
    (id) => new (require('mongoose').Types.ObjectId)(id)
  );
  report.reportStatus = 'DELIVERED';
  report.deliveredAt = new Date();
  await report.save();

  for (const recipientId of recipientIds) {
    await Notification.create({
      recipient: recipientId,
      type: 'REPORT_DELIVERED',
      title: 'Report Delivered to You',
      message: `A diagnostic report (${report.testType}) has been shared with you.`,
      link: `/reports/${report._id}`,
    });
  }

  await AuditLog.create({
    actor: req.user!._id,
    actorRole: req.user!.role,
    action: 'REPORT_DELIVERED',
    resourceType: 'DiagnosticReport',
    resourceId: report._id,
    metadata: { recipientIds },
    outcome: 'SUCCESS',
  });

  res.json({ success: true, message: 'Report delivered successfully.' });
};

export const getCentreProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await DiagnosticCentreProfile.findOne({ user: req.user!._id })
    .populate('user', 'name email mobile')
    .lean();
  if (!profile) throw new AppError('Diagnostic centre profile not found.', 404);
  res.json({ success: true, data: { profile } });
};
