import mongoose, { Document, Schema } from 'mongoose';
import type { VerificationStatus } from './DoctorProfile';

export interface IDiagnosticCentreProfile extends Document {
  user: mongoose.Types.ObjectId;
  centreName: string;
  contactPerson: string;
  registrationNumber?: string;
  address: string;
  district?: string;
  pinCode?: string;
  accreditations?: string[];
  testTypesOffered?: string[];
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticCentreProfileSchema = new Schema<IDiagnosticCentreProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    centreName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true },
    registrationNumber: { type: String, trim: true },
    address: { type: String, required: true },
    district: { type: String },
    pinCode: { type: String },
    accreditations: [{ type: String }],
    testTypesOffered: [{ type: String }],
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verificationNotes: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DiagnosticCentreProfileSchema.index({ user: 1 });
DiagnosticCentreProfileSchema.index({ verificationStatus: 1 });

export const DiagnosticCentreProfile = mongoose.model<IDiagnosticCentreProfile>(
  'DiagnosticCentreProfile',
  DiagnosticCentreProfileSchema
);
