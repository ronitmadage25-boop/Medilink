import { Response } from 'express';
import { DiagnosticReport } from '../models/DiagnosticReport';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { storageAdapter } from '../adapters/storageAdapter';
import mongoose from 'mongoose';

function canAccessReport(report: {
  patient: { toString(): string };
  referringDoctor?: { toString(): string } | null;
  deliveredTo: { toString(): string }[];
  diagnosticCentre: { toString(): string };
}, userId: string, role: string): boolean {
  if (role === 'ADMIN') return true;
  if (report.patient.toString() === userId) return true;
  if (report.diagnosticCentre.toString() === userId) return true;
  if (report.referringDoctor?.toString() === userId) return true;
  if (report.deliveredTo.some((d) => d.toString() === userId)) return true;
  return false;
}

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '10', reportStatus, testType } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const userId = req.user!._id.toString();
  const role = req.user!.role;

  let filter: Record<string, unknown> = { isActive: true };

  if (role === 'PATIENT') {
    filter.patient = req.user!._id;
  } else if (role === 'DOCTOR') {
    filter.$or = [
      { referringDoctor: req.user!._id },
      { deliveredTo: req.user!._id },
    ];
  } else if (role === 'DIAGNOSTIC_CENTRE') {
    filter.diagnosticCentre = req.user!._id;
  }

  if (reportStatus) filter.reportStatus = reportStatus;
  if (testType) filter.testType = { $regex: testType, $options: 'i' };

  const [reports, total] = await Promise.all([
    DiagnosticReport.find(filter)
      .populate('patient', 'name email')
      .populate('diagnosticCentre', 'name')
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

export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid report ID.', 400);

  const report = await DiagnosticReport.findById(id)
    .populate('patient', 'name email mobile')
    .populate('diagnosticCentre', 'name')
    .populate('referringDoctor', 'name email')
    .populate('reviewedBy', 'name')
    .lean();

  if (!report || !report.isActive) throw new AppError('Report not found.', 404);

  if (!canAccessReport(report, req.user!._id.toString(), req.user!.role)) {
    throw new AppError('You do not have access to this report.', 403);
  }

  // Generate secure file URL if file exists
  let fileUrl: string | null = null;
  if (report.file) {
    fileUrl = await storageAdapter.getUrl(report.file.fileKey, report.file.provider);
  }

  await AuditLog.create({
    actor: req.user!._id,
    actorRole: req.user!.role,
    action: 'REPORT_ACCESSED',
    resourceType: 'DiagnosticReport',
    resourceId: new mongoose.Types.ObjectId(id),
    outcome: 'SUCCESS',
  });

  res.json({ success: true, data: { report, fileUrl } });
};

export const markReportReviewed = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reviewNotes } = req.body as { reviewNotes?: string };

  const report = await DiagnosticReport.findById(id);
  if (!report || !report.isActive) throw new AppError('Report not found.', 404);

  const userId = req.user!._id.toString();
  const isDoctorAuthorised =
    report.referringDoctor?.toString() === userId ||
    report.deliveredTo.some((d) => d.toString() === userId);

  if (!isDoctorAuthorised && req.user!.role !== 'ADMIN') {
    throw new AppError('Not authorised to review this report.', 403);
  }

  report.reviewStatus = 'REVIEWED';
  report.reviewedBy = req.user!._id;
  report.reviewedAt = new Date();
  if (reviewNotes) report.reviewNotes = reviewNotes;
  await report.save();

  res.json({ success: true, message: 'Report marked as reviewed.' });
};
