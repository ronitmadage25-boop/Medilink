import mongoose, { Document, Schema } from 'mongoose';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface IDoctorProfile extends Document {
  user: mongoose.Types.ObjectId;
  medicalRegistrationNumber: string;
  speciality: string;
  clinicOrHospital?: string;
  qualifications?: string[];
  yearsOfExperience?: number;
  district?: string;
  address?: string;
  consultationFee?: number;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  bio?: string;
  availableDays?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DoctorProfileSchema = new Schema<IDoctorProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    medicalRegistrationNumber: { type: String, required: true, unique: true, trim: true },
    speciality: { type: String, required: true },
    clinicOrHospital: { type: String },
    qualifications: [{ type: String }],
    yearsOfExperience: { type: Number },
    district: { type: String },
    address: { type: String },
    consultationFee: { type: Number },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verificationNotes: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    bio: { type: String },
    availableDays: [{ type: String }],
  },
  { timestamps: true }
);

DoctorProfileSchema.index({ user: 1 });
DoctorProfileSchema.index({ verificationStatus: 1 });
DoctorProfileSchema.index({ speciality: 1 });

export const DoctorProfile = mongoose.model<IDoctorProfile>('DoctorProfile', DoctorProfileSchema);
