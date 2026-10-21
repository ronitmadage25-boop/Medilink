import mongoose, { Document, Schema } from 'mongoose';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: 'IN_PERSON' | 'TELECONSULT';
  reason?: string;
  notes?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  rescheduledFrom?: mongoose.Types.ObjectId;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'],
      default: 'PENDING',
    },
    type: {
      type: String,
      enum: ['IN_PERSON', 'TELECONSULT'],
      default: 'IN_PERSON',
    },
    reason: { type: String },
    notes: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String },
    rescheduledFrom: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AppointmentSchema.index({ patient: 1 });
AppointmentSchema.index({ doctor: 1 });
AppointmentSchema.index({ appointmentDate: 1 });
AppointmentSchema.index({ status: 1 });
// Compound index for conflict detection
AppointmentSchema.index({ doctor: 1, appointmentDate: 1, startTime: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
