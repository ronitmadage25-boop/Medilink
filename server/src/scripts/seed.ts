import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import argon2 from 'argon2';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const DEMO_PASSWORD = 'DemoPassword123!';
const ADMIN_PASSWORD = 'ChangeThisSecurePassword123!';

export const seedDatabase = async () => {
  logger.info('Connecting to Neon PostgreSQL for database seeding...');
  await prisma.$connect();

  const hashedDemoPass = await argon2.hash(DEMO_PASSWORD);
  const hashedAdminPass = await argon2.hash(ADMIN_PASSWORD);

  // 1. Seed or Upsert Patient
  const patient = await prisma.user.upsert({
    where: { email: 'patient@demo.medilink' },
    update: {
      name: 'Priya Sharma',
      password: hashedDemoPass,
      role: 'PATIENT',
      isActive: true,
      isVerified: true,
      mobile: '+919876543210',
    },
    create: {
      email: 'patient@demo.medilink',
      name: 'Priya Sharma',
      password: hashedDemoPass,
      role: 'PATIENT',
      isActive: true,
      isVerified: true,
      mobile: '+919876543210',
      patientProfile: {
        create: {
          gender: 'FEMALE',
          bloodGroup: 'B+',
          address: '402 Sunrise Heights, Bandra West, Mumbai',
          district: 'Mumbai',
          allergies: ['Penicillin'],
          chronicConditions: ['Hypertension Stage 1'],
        },
      },
    },
  });

  // Ensure PatientProfile exists
  await prisma.patientProfile.upsert({
    where: { userId: patient.id },
    update: {
      bloodGroup: 'B+',
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension Stage 1'],
    },
    create: {
      userId: patient.id,
      gender: 'FEMALE',
      bloodGroup: 'B+',
      address: '402 Sunrise Heights, Bandra West, Mumbai',
      district: 'Mumbai',
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension Stage 1'],
    },
  });

  // 2. Seed or Upsert Doctor
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@demo.medilink' },
    update: {
      name: 'Dr. Rajan Mehta',
      password: hashedDemoPass,
      role: 'DOCTOR',
      isActive: true,
      isVerified: true,
      mobile: '+919876543211',
    },
    create: {
      email: 'doctor@demo.medilink',
      name: 'Dr. Rajan Mehta',
      password: hashedDemoPass,
      role: 'DOCTOR',
      isActive: true,
      isVerified: true,
      mobile: '+919876543211',
      doctorProfile: {
        create: {
          specialization: 'Cardiology & Internal Medicine',
          qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
          experienceYears: 14,
          registrationNumber: 'MCI-MH-2012-8921',
          consultationFee: 750,
          clinicAddress: 'Heart & Vascular Suite 3, Lilavati Care Centre, Mumbai',
          isVerified: true,
          verifiedAt: new Date(),
        },
      },
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: doctor.id },
    update: {
      isVerified: true,
      registrationNumber: 'MCI-MH-2012-8921',
      specialization: 'Cardiology & Internal Medicine',
    },
    create: {
      userId: doctor.id,
      specialization: 'Cardiology & Internal Medicine',
      qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
      experienceYears: 14,
      registrationNumber: 'MCI-MH-2012-8921',
      consultationFee: 750,
      clinicAddress: 'Heart & Vascular Suite 3, Lilavati Care Centre, Mumbai',
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // 3. Seed or Upsert Diagnostic Centre
  const centre = await prisma.user.upsert({
    where: { email: 'centre@demo.medilink' },
    update: {
      name: 'Apex PathLabs & Imaging',
      password: hashedDemoPass,
      role: 'DIAGNOSTIC_CENTRE',
      isActive: true,
      isVerified: true,
      mobile: '+919876543212',
    },
    create: {
      email: 'centre@demo.medilink',
      name: 'Apex PathLabs & Imaging',
      password: hashedDemoPass,
      role: 'DIAGNOSTIC_CENTRE',
      isActive: true,
      isVerified: true,
      mobile: '+919876543212',
      centreProfile: {
        create: {
          centreName: 'Apex PathLabs & Diagnostic Imaging',
          registrationNumber: 'LAB-NABH-2021-4501',
          address: 'Plot 12, Medical Complex, Andheri East, Mumbai',
          district: 'Mumbai',
          contactNumber: '+919876543212',
          availableTests: ['CBC', 'Lipid Profile', 'HbA1c', 'LFT', 'KFT', 'Chest X-Ray'],
          isVerified: true,
          verifiedAt: new Date(),
        },
      },
    },
  });

  await prisma.diagnosticCentreProfile.upsert({
    where: { userId: centre.id },
    update: {
      isVerified: true,
      registrationNumber: 'LAB-NABH-2021-4501',
    },
    create: {
      userId: centre.id,
      centreName: 'Apex PathLabs & Diagnostic Imaging',
      registrationNumber: 'LAB-NABH-2021-4501',
      address: 'Plot 12, Medical Complex, Andheri East, Mumbai',
      district: 'Mumbai',
      contactNumber: '+919876543212',
      availableTests: ['CBC', 'Lipid Profile', 'HbA1c', 'LFT', 'KFT', 'Chest X-Ray'],
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // 4. Seed or Upsert Platform Administrator
  await prisma.user.upsert({
    where: { email: 'admin@medilink.health' },
    update: {
      name: 'Platform Administrator',
      password: hashedAdminPass,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
    create: {
      email: 'admin@medilink.health',
      name: 'Platform Administrator',
      password: hashedAdminPass,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      mobile: '+910000000000',
    },
  });

  // 5. Seed Appointments
  const existingAppt = await prisma.appointment.findFirst({
    where: { patientId: patient.id, doctorId: doctor.id },
  });

  let apptId = existingAppt?.id;
  if (!existingAppt) {
    const newAppt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '10:30',
        status: 'CONFIRMED',
        type: 'VIDEO',
        reason: 'Hypertension follow-up consultation and blood work review',
        roomCode: 'consult-demo-room',
      },
    });
    apptId = newAppt.id;
  }

  // 6. Seed Prescriptions
  const existingRx = await prisma.prescription.findFirst({
    where: { patientId: patient.id, doctorId: doctor.id },
  });

  if (!existingRx) {
    await prisma.prescription.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: apptId,
        diagnosis: 'Essential Hypertension (Stage 1)',
        medications: [
          {
            name: 'Telmisartan 40mg',
            dosage: '40mg',
            frequency: 'Once daily (Morning)',
            duration: '30 days',
            instructions: 'Take after breakfast with a full glass of water',
          },
          {
            name: 'Amlodipine 5mg',
            dosage: '5mg',
            frequency: 'Once daily (Evening)',
            duration: '30 days',
            instructions: 'Take at 8:00 PM; monitor blood pressure weekly',
          },
        ],
        advice: 'Maintain low-sodium dietary habits, 30 minutes daily aerobic walking, avoid unprescribed NSAIDs.',
        followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 7. Seed Diagnostic Report with OCR Data
  const existingReport = await prisma.diagnosticReport.findFirst({
    where: { patientId: patient.id },
  });

  if (!existingReport) {
    await prisma.diagnosticReport.create({
      data: {
        patientId: patient.id,
        diagnosticCentreId: centre.id,
        referringDoctorId: doctor.id,
        testType: 'Comprehensive Lipid & Metabolic Profile',
        testDate: new Date(),
        findings: 'Total Cholesterol: 215 mg/dL (High)\nHDL Cholesterol: 48 mg/dL (Normal)\nLDL Cholesterol: 142 mg/dL (Borderline High)\nTriglycerides: 165 mg/dL (Mild Elevation)\nFasting Blood Sugar: 94 mg/dL (Normal)',
        notes: 'Specimen processed on automated clinical chemistry analyzer. Fasting status confirmed at 12 hours.',
        ocrRawText: 'APEX PATHLABS\nTEST: Comprehensive Lipid & Metabolic Panel\nTotal Cholesterol: 215 mg/dL [Ref: 125-200]\nHDL: 48 mg/dL [Ref: >40]\nLDL: 142 mg/dL [Ref: <100]\nTriglycerides: 165 mg/dL [Ref: <150]',
        ocrParsedData: [
          { parameter: 'Total Cholesterol', value: '215', unit: 'mg/dL', status: 'HIGH', referenceRange: '125 - 200 mg/dL' },
          { parameter: 'HDL', value: '48', unit: 'mg/dL', status: 'NORMAL', referenceRange: '> 40 mg/dL' },
          { parameter: 'LDL', value: '142', unit: 'mg/dL', status: 'HIGH', referenceRange: '< 100 mg/dL' },
          { parameter: 'Triglycerides', value: '165', unit: 'mg/dL', status: 'HIGH', referenceRange: '< 150 mg/dL' },
        ],
        reviewStatus: 'PENDING_REVIEW',
      },
    });
  }

  // 8. Seed Follow-up Call Schedule
  await prisma.callSchedule.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      patientId: patient.id,
      phone: '+919876543210',
      preferredTime: '10:00 AM',
      frequency: 'DAILY',
      isActive: true,
      providerStatus: 'Active (Twilio Voice IVR)',
      callLogs: [
        {
          callSid: 'CA994821a8f9021',
          timestamp: new Date().toISOString(),
          patientPhone: '+919876543210',
          transcript: 'Automated IVR recovery check-in completed. Patient confirmed morning Telmisartan adherence. No shortness of breath.',
          nlpExtractedSymptoms: ['Normal recovery state'],
          medicationCompliance: true,
          status: 'COMPLETED',
        },
      ],
    },
  });

  logger.info('Neon PostgreSQL database successfully seeded with enterprise clinical records!');
  await prisma.$disconnect();
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Database seeding failed:', err);
      process.exit(1);
    });
}
