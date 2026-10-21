import mongoose, { Document, Schema } from 'mongoose';

export interface ICallSchedule extends Document {
  patient: mongoose.Types.ObjectId;
  isActive: boolean;
  consentGiven: boolean;
  consentDate?: Date;
  preferredLanguage: string;
  preferredCallTime: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY';
  nextScheduledAt?: Date;
  lastCallAt?: Date;
  pausedAt?: Date;
  pauseReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallScheduleSchema = new Schema<ICallSchedule>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isActive: { type: Boolean, default: false },
    consentGiven: { type: Boolean, default: false },
    consentDate: { type: Date },
    preferredLanguage: { type: String, default: 'en' },
    preferredCallTime: { type: String, default: '10:00' },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'BIWEEKLY'],
      default: 'WEEKLY',
    },
    nextScheduledAt: { type: Date },
    lastCallAt: { type: Date },
    pausedAt: { type: Date },
    pauseReason: { type: String },
  },
  { timestamps: true }
);

CallScheduleSchema.index({ patient: 1 });
CallScheduleSchema.index({ isActive: 1, nextScheduledAt: 1 });

export const CallSchedule = mongoose.model<ICallSchedule>('CallSchedule', CallScheduleSchema);
