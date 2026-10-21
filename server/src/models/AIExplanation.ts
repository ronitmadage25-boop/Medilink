import mongoose, { Document, Schema } from 'mongoose';

export interface IAIExplanation extends Document {
  patient: mongoose.Types.ObjectId;
  report: mongoose.Types.ObjectId;
  requestedAt: Date;
  prompt?: string;
  explanation: string;
  terminology?: Array<{ term: string; definition: string }>;
  suggestedQuestions?: string[];
  provider: string;
  aiModel?: string;
  isDemo: boolean;
  createdAt: Date;
}

const AIExplanationSchema = new Schema<IAIExplanation>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    report: { type: Schema.Types.ObjectId, ref: 'DiagnosticReport', required: true },
    requestedAt: { type: Date, default: Date.now },
    prompt: { type: String },
    explanation: { type: String, required: true },
    terminology: [
      {
        term: String,
        definition: String,
        _id: false,
      },
    ],
    suggestedQuestions: [{ type: String }],
    provider: { type: String, required: true },
    aiModel: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AIExplanationSchema.index({ patient: 1 });
AIExplanationSchema.index({ report: 1 });

export const AIExplanation = mongoose.model<IAIExplanation>('AIExplanation', AIExplanationSchema);
