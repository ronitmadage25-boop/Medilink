import mongoose, { Document, Schema } from 'mongoose';

export type RecordCategory =
  | 'GENERAL'
  | 'DIAGNOSTIC'
  | 'PRESCRIPTION'
  | 'VACCINATION'
  | 'SURGERY'
  | 'ALLERGY'
  | 'CHRONIC_CONDITION'
  | 'OTHER';

export interface IMedicalRecord extends Document {
  _id: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  category: RecordCategory;
  title: string;
  description?: string;
  recordDate: Date;
  facility?: string;
  doctor?: string;
  attachedReport?: mongoose.Types.ObjectId;
  attachedPrescription?: mongoose.Types.ObjectId;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['GENERAL', 'DIAGNOSTIC', 'PRESCRIPTION', 'VACCINATION', 'SURGERY', 'ALLERGY', 'CHRONIC_CONDITION', 'OTHER'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    recordDate: { type: Date, required: true },
    facility: { type: String },
    doctor: { type: String },
    attachedReport: { type: Schema.Types.ObjectId, ref: 'DiagnosticReport' },
    attachedPrescription: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MedicalRecordSchema.index({ patient: 1 });
MedicalRecordSchema.index({ patient: 1, category: 1 });
MedicalRecordSchema.index({ patient: 1, recordDate: -1 });

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
