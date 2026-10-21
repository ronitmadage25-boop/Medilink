import { Request, Response } from 'express';
import { User } from '../models/User';
import { PatientProfile } from '../models/PatientProfile';
import { DoctorProfile } from '../models/DoctorProfile';
import { DiagnosticCentreProfile } from '../models/DiagnosticCentreProfile';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError('User not found.', 404);

  let profile = null;
  if (user.role === 'PATIENT') {
    profile = await PatientProfile.findOne({ user: user._id });
  } else if (user.role === 'DOCTOR') {
    profile = await DoctorProfile.findOne({ user: user._id });
  } else if (user.role === 'DIAGNOSTIC_CENTRE') {
    profile = await DiagnosticCentreProfile.findOne({ user: user._id });
  }

  res.json({
    success: true,
    data: { user, profile },
  });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError('User not found.', 404);

  const { name, mobile } = req.body as { name?: string; mobile?: string };
  if (name) user.name = name;
  if (mobile) user.mobile = mobile;
  await user.save();

  if (user.role === 'PATIENT') {
    const { district, address, dateOfBirth, gender, bloodGroup,
            emergencyContactName, emergencyContactPhone,
            allergies, chronicConditions, languagePreference,
            notificationPreferences } = req.body as Record<string, unknown>;
    await PatientProfile.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          ...(district !== undefined && { district }),
          ...(address !== undefined && { address }),
          ...(dateOfBirth !== undefined && { dateOfBirth }),
          ...(gender !== undefined && { gender }),
          ...(bloodGroup !== undefined && { bloodGroup }),
          ...(emergencyContactName !== undefined && { emergencyContactName }),
          ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
          ...(allergies !== undefined && { allergies }),
          ...(chronicConditions !== undefined && { chronicConditions }),
          ...(languagePreference !== undefined && { languagePreference }),
          ...(notificationPreferences !== undefined && { notificationPreferences }),
        },
      },
      { new: true, upsert: true }
    );
  }

  res.json({ success: true, message: 'Profile updated.' });
};

export const getPublicDoctors = async (_req: Request, res: Response): Promise<void> => {
  const doctors = await DoctorProfile.find({ verificationStatus: 'VERIFIED' })
    .populate('user', 'name email mobile')
    .select('-verificationNotes -verifiedBy')
    .lean();

  res.json({ success: true, data: { doctors } });
};
