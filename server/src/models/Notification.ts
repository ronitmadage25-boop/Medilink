import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'REPORT_UPLOADED'
  | 'REPORT_DELIVERED'
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CANCELLED'
  | 'PRESCRIPTION_CREATED'
  | 'FOLLOW_UP_REMINDER'
  | 'SYMPTOM_ALERT'
  | 'VERIFICATION_UPDATE'
  | 'SYSTEM';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'REPORT_UPLOADED',
        'REPORT_DELIVERED',
        'APPOINTMENT_BOOKED',
        'APPOINTMENT_REMINDER',
        'APPOINTMENT_CANCELLED',
        'PRESCRIPTION_CREATED',
        'FOLLOW_UP_REMINDER',
        'SYMPTOM_ALERT',
        'VERIFICATION_UPDATE',
        'SYSTEM',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
