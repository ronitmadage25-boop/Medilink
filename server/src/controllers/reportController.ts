import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { s3Storage } from '../adapters/s3StorageAdapter';
import { ocrService } from '../services/ocrService';
import fs from 'fs';

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', patientId, reviewStatus } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const role = req.user!.role;

  const where: any = { isActive: true };

  if (role === 'PATIENT') {
    where.patientId = req.user!.id;
  } else if (role === 'DOCTOR') {
    where.OR = [
      { referringDoctorId: req.user!.id },
      { reviewedById: req.user!.id },
      { patient: { patientAppointments: { some: { doctorId: req.user!.id } } } },
    ];
  } else if (role === 'DIAGNOSTIC_CENTRE') {
    where.diagnosticCentreId = req.user!.id;
  }

  if (patientId) where.patientId = patientId;
  if (reviewStatus && reviewStatus !== 'ALL') where.reviewStatus = reviewStatus;

  const [reports, total] = await Promise.all([
    prisma.diagnosticReport.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true, mobile: true } },
        diagnosticCentre: { select: { id: true, name: true, email: true } },
        referringDoctor: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.diagnosticReport.count({ where }),
  ]);

  const formatted = reports.map((r) => ({
    ...r,
    _id: r.id,
    patient: { ...r.patient, _id: r.patient.id },
    diagnosticCentre: { ...r.diagnosticCentre, _id: r.diagnosticCentre.id },
    referringDoctor: r.referringDoctor ? { ...r.referringDoctor, _id: r.referringDoctor.id } : undefined,
    reviewedBy: r.reviewedBy ? { ...r.reviewedBy, _id: r.reviewedBy.id } : undefined,
  }));

  res.json({
    success: true,
    data: { reports: formatted, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const report = await prisma.diagnosticReport.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, email: true, mobile: true } },
      diagnosticCentre: { select: { id: true, name: true, email: true } },
      referringDoctor: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  if (!report || !report.isActive) throw new AppError('Diagnostic report not found.', 404);

  // Authorization check
  const userId = req.user!.id;
  const isAuthorized =
    report.patientId === userId ||
    report.diagnosticCentreId === userId ||
    report.referringDoctorId === userId ||
    req.user!.role === 'ADMIN';

  if (!isAuthorized) {
    throw new AppError('Access forbidden: You do not have permissions to read this report.', 403);
  }

  let fileUrl = report.fileUrl;
  if (!fileUrl && report.fileKey) {
    fileUrl = await s3Storage.getFileUrl(report.fileKey);
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: req.user!.role,
      action: 'REPORT_ACCESSED',
      resourceType: 'DiagnosticReport',
      resourceId: report.id,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    },
  });

  res.json({
    success: true,
    data: {
      report: { ...report, _id: report.id },
      fileUrl,
    },
  });
};

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { patientId, referringDoctorId, testType, testDate, findings, notes } = req.body;

  if (!patientId || !testType) {
    throw new AppError('Patient ID and test type are required.', 400);
  }

  let fileKey: string | null = null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;
  let fileSize: number | null = null;
  let ocrRawText: string | null = null;
  let ocrParsedData: any = null;
  let finalFindings = findings;

  if (req.file) {
    fileName = req.file.originalname;
    mimeType = req.file.mimetype;
    fileSize = req.file.size;

    let buffer: Buffer;
    if (req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.file.path) {
      buffer = fs.readFileSync(req.file.path);
    } else {
      buffer = Buffer.from('');
    }

    // 1. Run Automated AI OCR Pipeline on the uploaded document
    const ocrResult = await ocrService.parseDocument(buffer, mimeType);
    ocrRawText = ocrResult.rawText;
    ocrParsedData = ocrResult.extractedParameters;

    if (!finalFindings || finalFindings.trim().length === 0) {
      finalFindings = ocrResult.detectedFindings;
    } else {
      finalFindings = `${finalFindings}\n\n[Automated OCR Analysis]\n${ocrResult.detectedFindings}`;
    }

    // 2. Upload file to Neon S3 Storage
    const s3Result = await s3Storage.uploadFile(buffer, fileName, mimeType);
    fileKey = s3Result.fileKey;
    fileUrl = s3Result.fileUrl;
  }

  const report = await prisma.diagnosticReport.create({
    data: {
      patientId,
      diagnosticCentreId: req.user!.id,
      referringDoctorId: referringDoctorId || null,
      testType,
      testDate: testDate ? new Date(testDate) : new Date(),
      findings: finalFindings,
      notes: notes || null,
      fileKey,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      ocrRawText,
      ocrParsedData: ocrParsedData || undefined,
      reviewStatus: 'PENDING_REVIEW',
    },
    include: {
      patient: { select: { id: true, name: true } },
    },
  });

  // Notify Patient
  await prisma.notification.create({
    data: {
      recipientId: patientId,
      title: 'New Diagnostic Report Ready',
      message: `Your ${testType} report from ${req.user!.name} is now available with AI OCR insights.`,
      type: 'REPORT',
    },
  });

  // Notify Doctor if referred
  if (referringDoctorId) {
    await prisma.notification.create({
      data: {
        recipientId: referringDoctorId,
        title: 'Patient Diagnostic Report Delivered',
        message: `${testType} report for ${report.patient.name} has been uploaded for clinical review.`,
        type: 'REPORT',
      },
    });
  }

  res.status(201).json({
    success: true,
    data: { report: { ...report, _id: report.id } },
  });
};

export const markReportReviewed = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { reviewNotes } = req.body;

  const report = await prisma.diagnosticReport.findUnique({ where: { id } });
  if (!report) throw new AppError('Report not found.', 404);

  const updated = await prisma.diagnosticReport.update({
    where: { id },
    data: {
      reviewStatus: 'REVIEWED',
      reviewedById: req.user!.id,
      reviewNotes: reviewNotes || 'Clinically reviewed and verified.',
      reviewedAt: new Date(),
    },
  });

  // Notify Patient
  await prisma.notification.create({
    data: {
      recipientId: report.patientId,
      title: 'Report Reviewed by Doctor',
      message: `Dr. ${req.user!.name} has signed off on your ${report.testType} report.`,
      type: 'REPORT',
    },
  });

  res.json({
    success: true,
    data: { report: { ...updated, _id: updated.id } },
  });
};
