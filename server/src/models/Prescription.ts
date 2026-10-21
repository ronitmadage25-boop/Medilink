import mongoose, { Document, Schema } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IPrescription extends Document {
  _id: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  prescriptionDate: Date;
  medications: IMedication[];
  diagnosis?: string;
  notes?: string;
  followUpDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<IMedication>(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prescriptionDate: { type: Date, required: true, default: Date.now },
    medications: [MedicationSchema],
    diagnosis: { type: String },
    notes: { type: String },
    followUpDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ patient: 1 });
PrescriptionSchema.index({ doctor: 1 });
PrescriptionSchema.index({ prescriptionDate: -1 });

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
