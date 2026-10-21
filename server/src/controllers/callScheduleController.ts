import { Response } from 'express';
import { CallSchedule } from '../models/CallSchedule';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/env';

export const getCallSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const schedule = await CallSchedule.findOne({ patient: req.user!._id }).lean();
  res.json({
    success: true,
    data: {
      schedule,
      telephonyConfigured: config.telephonyProvider !== 'none',
    },
  });
};

export const upsertCallSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    consentGiven,
    preferredLanguage,
    preferredCallTime,
    frequency,
    isActive,
  } = req.body as {
    consentGiven?: boolean;
    preferredLanguage?: string;
    preferredCallTime?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY';
    isActive?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (consentGiven !== undefined) {
    update.consentGiven = consentGiven;
    if (consentGiven) update.consentDate = new Date();
  }
  if (preferredLanguage) update.preferredLanguage = preferredLanguage;
  if (preferredCallTime) update.preferredCallTime = preferredCallTime;
  if (frequency) update.frequency = frequency;
  if (isActive !== undefined) {
    update.isActive = isActive;
    if (!isActive) update.pausedAt = new Date();
  }

  const schedule = await CallSchedule.findOneAndUpdate(
    { patient: req.user!._id },
    { $set: update },
    { new: true, upsert: true }
  );

  const telephonyConfigured = config.telephonyProvider !== 'none';

  res.json({
    success: true,
    data: {
      schedule,
      telephonyConfigured,
      ...(!telephonyConfigured && {
        notice:
          'Live telephony calling requires a configured provider (e.g., Twilio). This schedule will be saved but no real calls will be made until a provider is configured.',
      }),
    },
  });
};
