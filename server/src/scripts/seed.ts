/**
 * FICTIONAL DEVELOPMENT DATA SEED SCRIPT
 * This script seeds fictional data for development and demo purposes.
 * NEVER run this against a production database.
 * All names, registration numbers, and medical data are entirely fictional.
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import argon2 from 'argon2';
import { config } from '../config/env';
import { User } from '../models/User';
import { PatientProfile } from '../models/PatientProfile';
import { DoctorProfile } from '../models/DoctorProfile';
import { DiagnosticCentreProfile } from '../models/DiagnosticCentreProfile';
import { Appointment } from '../models/Appointment';
import { Prescription } from '../models/Prescription';
import { MedicalRecord } from '../models/MedicalRecord';
import { logger } from '../utils/logger';

const DEMO_PASSWORD = 'DemoPassword123!';

const seed = async () => {
  if (config.nodeEnv === 'production') {
    logger.error('Seed script must NOT be run in production.');
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri);
  logger.info('Connected. Seeding fictional demo data...');

  const hashedPass = await argon2.hash(DEMO_PASSWORD);

  // Clear existing demo data (development only)
  await User.deleteMany({ email: /demo\.medilink/i });

  // Create demo patient
  const patient = await User.create({
    email: 'patient@demo.medilink',
    password: hashedPass,
    name: 'Priya Sharma (Demo)',
    mobile: '9876543210',
    role: 'PATIENT',
    status: 'ACTIVE',
  });
  await PatientProfile.findOneAndDelete({ user: patient._id });
  await PatientProfile.create({
    user: patient._id,
    dateOfBirth: new Date('1990-05-15'),
    gender: 'FEMALE',
    bloodGroup: 'B+',
    district: 'Mumbai',
    address: '123, Fictional Street, Mumbai - 400001',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
    languagePreference: 'en',
  });

  // Create demo doctor
  const doctor = await User.create({
    email: 'doctor@demo.medilink',
    password: hashedPass,
    name: 'Dr. Rajan Mehta (Demo)',
    mobile: '9876543211',
    role: 'DOCTOR',
    status: 'ACTIVE',
  });
  await DoctorProfile.findOneAndDelete({ user: doctor._id });
  await DoctorProfile.create({
    user: doctor._id,
    medicalRegistrationNumber: 'MCI-DEMO-12345',
    speciality: 'General Medicine',
    clinicOrHospital: 'Demo City Hospital',
    verificationStatus: 'VERIFIED',
    verifiedAt: new Date(),
    qualifications: ['MBBS', 'MD (General Medicine)'],
    yearsOfExperience: 12,
  });

  // Create demo diagnostic centre
  const centre = await User.create({
    email: 'centre@demo.medilink',
    password: hashedPass,
    name: 'MediLink Demo Diagnostics',
    mobile: '9876543212',
    role: 'DIAGNOSTIC_CENTRE',
    status: 'ACTIVE',
  });
  await DiagnosticCentreProfile.findOneAndDelete({ user: centre._id });
  await DiagnosticCentreProfile.create({
    user: centre._id,
    centreName: 'MediLink Demo Diagnostics',
    contactPerson: 'Sunita Patel (Demo)',
    address: '456, Demo Lab Complex, Mumbai - 400002',
    district: 'Mumbai',
    verificationStatus: 'VERIFIED',
    verifiedAt: new Date(),
  });

  // Create sample appointment
  await Appointment.deleteMany({ patient: patient._id });
  await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    type: 'IN_PERSON',
    reason: 'Routine check-up',
  });

  // Create sample prescription
  await Prescription.deleteMany({ patient: patient._id });
  await Prescription.create({
    patient: patient._id,
    doctor: doctor._id,
    prescriptionDate: new Date(),
    medications: [
      {
        name: 'Amlodipine 5mg (Demo)',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'Take in the morning with water',
      },
    ],
    diagnosis: 'Hypertension management (demo)',
    notes: 'This is fictional demo data. Not a real prescription.',
    followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // Sample medical record
  await MedicalRecord.deleteMany({ patient: patient._id });
  await MedicalRecord.create({
    patient: patient._id,
    category: 'DIAGNOSTIC',
    title: 'Annual Blood Panel (Demo)',
    description: 'Fictional demonstration blood test record.',
    recordDate: new Date(),
    facility: 'Demo City Hospital',
    doctor: 'Dr. Rajan Mehta (Demo)',
  });

  logger.info('✅ Demo data seeded successfully.');
  logger.info(`Demo credentials (password for all: ${DEMO_PASSWORD}):`);
  logger.info('  Patient: patient@demo.medilink');
  logger.info('  Doctor:  doctor@demo.medilink');
  logger.info('  Centre:  centre@demo.medilink');
  logger.info('Use npm run seed:admin to create an admin account.');

  await mongoose.disconnect();
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
