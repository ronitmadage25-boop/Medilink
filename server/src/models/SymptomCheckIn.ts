import mongoose, { Document, Schema } from 'mongoose';

export interface ISymptomCheckIn extends Document {
  _id: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  reportedAt: Date;
  symptoms: string[];
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  notes?: string;
  isEmergency: boolean;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  escalationStatus: 'NONE' | 'ESCALATED' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const SymptomCheckInSchema = new Schema<ISymptomCheckIn>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedAt: { type: Date, default: Date.now },
    symptoms: [{ type: String }],
    severity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'SEVERE'],
      required: true,
    },
    notes: { type: String },
    isEmergency: { type: Boolean, default: false },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    escalationStatus: {
      type: String,
      enum: ['NONE', 'ESCALATED', 'RESOLVED'],
      default: 'NONE',
    },
  },
  { timestamps: true }
);

SymptomCheckInSchema.index({ patient: 1 });
SymptomCheckInSchema.index({ reportedAt: -1 });
SymptomCheckInSchema.index({ isEmergency: 1 });

export const SymptomCheckIn = mongoose.model<ISymptomCheckIn>('SymptomCheckIn', SymptomCheckInSchema);
