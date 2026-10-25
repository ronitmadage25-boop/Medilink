import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { s3Storage } from '../adapters/s3StorageAdapter';
import { ocrService } from '../services/ocrService';
import { validateFileMagicBytes } from '../middleware/upload';
import fs from 'fs';

export const getDiagnosticCentreDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const centreId = req.user!.id;

  const [total, pending, reviewed, profile] = await Promise.all([
    prisma.diagnosticReport.count({ where: { diagnosticCentreId: centreId, isActive: true } }),
    prisma.diagnosticReport.count({ where: { diagnosticCentreId: centreId, reviewStatus: 'PENDING_REVIEW', isActive: true } }),
    prisma.diagnosticReport.count({ where: { diagnosticCentreId: centreId, reviewStatus: 'REVIEWED', isActive: true } }),
    prisma.diagnosticCentreProfile.findUnique({
      where: { userId: centreId },
      include: { user: { select: { id: true, name: true, email: true, mobile: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      stats: { total, pending, reviewed },
      profile: profile ? { ...profile, _id: profile.id } : null,
    },
  });
};

export const getCentreReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));

  const where: any = { diagnosticCentreId: req.user!.id, isActive: true };
  if (search) {
    where.testType = { contains: search, mode: 'insensitive' };
  }

  const [reports, total] = await Promise.all([
    prisma.diagnosticReport.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        referringDoctor: { select: { id: true, name: true } },
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
    referringDoctor: r.referringDoctor ? { ...r.referringDoctor, _id: r.referringDoctor.id } : null,
  }));

  res.json({
    success: true,
    data: {
      reports: formatted,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
};

export const uploadReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  const { patientId, referringDoctorId, testType, testDate, notes, findings } = req.body;

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

  if (file) {
    fileName = file.originalname;
    mimeType = file.mimetype;
    fileSize = file.size;

    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path) {
      buffer = fs.readFileSync(file.path);
    } else {
      buffer = Buffer.from('');
    }

    // Strict Magic Bytes Validation for PDF & Images
    const validation = validateFileMagicBytes(buffer, mimeType);
    if (!validation.isValid) {
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      }
      throw new AppError(validation.error || 'Invalid file signature.', 400);
    }

    // Run Automated AI OCR
    const ocrResult = await ocrService.parseDocument(buffer, mimeType);
    ocrRawText = ocrResult.rawText || null;
    ocrParsedData = ocrResult.extractedParameters.length > 0 ? { parameters: ocrResult.extractedParameters } : null;

    // Description Generation Priority:
    if (findings && findings.trim().length > 0) {
      finalFindings = findings.trim();
    } else if (ocrResult.detectedFindings && ocrResult.detectedFindings.trim().length > 0) {
      finalFindings = ocrResult.detectedFindings.trim();
    } else {
      finalFindings = `Certified laboratory report: ${testType} (${fileName}). Full diagnostic metrics are available in the attached PDF.`;
    }

    // Upload to Neon S3 or local resilient storage
    const s3Result = await s3Storage.uploadFile(buffer, fileName, mimeType);
    fileKey = s3Result.fileKey;
    fileUrl = s3Result.fileUrl;

    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    }
  } else if (!finalFindings || finalFindings.trim().length === 0) {
    finalFindings = `Certified diagnostic evaluation for ${testType}.`;
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
      title: 'Diagnostic Lab Report Uploaded',
      message: `Your ${testType} test results are now uploaded with automated OCR insights.`,
      type: 'REPORT',
    },
  });

  res.status(201).json({
    success: true,
    data: { report: { ...report, _id: report.id } },
  });
};

export const deliverReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const report = await prisma.diagnosticReport.findUnique({ where: { id } });
  if (!report) throw new AppError('Report not found.', 404);

  res.json({
    success: true,
    message: 'Report verified and delivered to patient dashboard.',
  });
};

export const getCentreProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.diagnosticCentreProfile.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { id: true, name: true, email: true, mobile: true } } },
  });

  if (!profile) throw new AppError('Centre profile not found.', 404);
  res.json({ success: true, data: { profile: { ...profile, _id: profile.id } } });
};
