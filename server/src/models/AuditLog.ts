import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actor?: mongoose.Types.ObjectId;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  outcome: 'SUCCESS' | 'FAILURE';
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
    outcome: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ actor: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
