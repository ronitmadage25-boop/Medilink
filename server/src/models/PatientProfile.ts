import mongoose, { Document, Schema } from 'mongoose';

export interface IPatientProfile extends Document {
  user: mongoose.Types.ObjectId;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  bloodGroup?: string;
  district?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string[];
  chronicConditions?: string[];
  languagePreference: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  followUpConsentGiven: boolean;
  followUpConsentDate?: Date;
  preferredCallTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientProfileSchema = new Schema<IPatientProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] },
    bloodGroup: { type: String },
    district: { type: String },
    address: { type: String },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    languagePreference: { type: String, default: 'en' },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
    followUpConsentGiven: { type: Boolean, default: false },
    followUpConsentDate: { type: Date },
    preferredCallTime: { type: String },
  },
  { timestamps: true }
);

PatientProfileSchema.index({ user: 1 });

export const PatientProfile = mongoose.model<IPatientProfile>('PatientProfile', PatientProfileSchema);
