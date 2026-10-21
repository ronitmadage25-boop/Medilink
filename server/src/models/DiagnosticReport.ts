import mongoose, { Document, Schema } from 'mongoose';

export type ReportStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type ReviewStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'FLAGGED';

export interface IStoredFile {
  provider: 'local' | 'cloudinary';
  fileKey: string;       // local path or cloudinary public_id
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface IDiagnosticReport extends Document {
  _id: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  diagnosticCentre: mongoose.Types.ObjectId;
  referringDoctor?: mongoose.Types.ObjectId;
  testType: string;
  testDate: Date;
  reportStatus: ReportStatus;
  reviewStatus: ReviewStatus;
  file?: IStoredFile;
  notes?: string;
  findings?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  deliveredTo: mongoose.Types.ObjectId[];
  deliveredAt?: Date;
  requestId?: mongoose.Types.ObjectId;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoredFileSchema = new Schema<IStoredFile>(
  {
    provider: { type: String, enum: ['local', 'cloudinary'], required: true },
    fileKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DiagnosticReportSchema = new Schema<IDiagnosticReport>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    diagnosticCentre: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referringDoctor: { type: Schema.Types.ObjectId, ref: 'User' },
    testType: { type: String, required: true },
    testDate: { type: Date, required: true },
    reportStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'READY', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'REVIEWED', 'FLAGGED'],
      default: 'PENDING_REVIEW',
    },
    file: StoredFileSchema,
    notes: { type: String },
    findings: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredAt: { type: Date },
    requestId: { type: Schema.Types.ObjectId, ref: 'TestRequest' },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DiagnosticReportSchema.index({ patient: 1 });
DiagnosticReportSchema.index({ diagnosticCentre: 1 });
DiagnosticReportSchema.index({ referringDoctor: 1 });
DiagnosticReportSchema.index({ reportStatus: 1 });
DiagnosticReportSchema.index({ testDate: -1 });

export const DiagnosticReport = mongoose.model<IDiagnosticReport>('DiagnosticReport', DiagnosticReportSchema);
