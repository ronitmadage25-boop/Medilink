export type UserRole = 'PATIENT' | 'DOCTOR' | 'DIAGNOSTIC_CENTRE' | 'ADMIN';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  isActive: boolean;
  isVerified?: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface PatientProfile {
  _id: string;
  user: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  bloodGroup?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies?: string[];
  chronicConditions?: string[];
}

export interface DoctorProfile {
  _id: string;
  user: User | string;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  registrationNumber: string;
  consultationFee: number;
  clinicAddress?: string;
  bio?: string;
  isVerified: boolean;
  verifiedAt?: string;
}

export interface DiagnosticCentreProfile {
  _id: string;
  user: User | string;
  centreName: string;
  registrationNumber: string;
  address: string;
  city: string;
  contactNumber: string;
  availableTests: string[];
  isVerified: boolean;
  verifiedAt?: string;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface Appointment {
  _id: string;
  patient: User;
  doctor: User & { profile?: DoctorProfile };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: 'IN_PERSON' | 'VIDEO' | 'AUDIO';
  reason?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  patient: User;
  doctor: User;
  appointment?: string;
  diagnosis: string;
  medications: Medication[];
  advice?: string;
  followUpDate?: string;
  createdAt: string;
}

export interface DiagnosticReport {
  _id: string;
  patient: User;
  diagnosticCentre: User & { profile?: DiagnosticCentreProfile };
  referringDoctor?: User;
  testType: string;
  testDate: string;
  findings?: string;
  notes?: string;
  file?: {
    fileKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    provider: string;
  };
  reviewStatus: 'PENDING_REVIEW' | 'REVIEWED';
  reviewedBy?: User;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AIExplanation {
  _id: string;
  patient: string;
  report: DiagnosticReport | string;
  explanation: string;
  terminology?: Array<{ term: string; definition: string }>;
  suggestedQuestions?: string[];
  provider: string;
  aiModel?: string;
  isDemo: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: 'APPOINTMENT' | 'REPORT' | 'PRESCRIPTION' | 'CHECK_IN' | 'SYSTEM';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface SymptomCheckIn {
  _id: string;
  patient: string;
  symptoms: string[];
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  notes?: string;
  isEmergencyAlert: boolean;
  doctorAlerted: boolean;
  createdAt: string;
}

export interface CallSchedule {
  _id?: string;
  patient: string;
  preferredTime: string;
  frequency: 'DAILY' | 'EVERY_OTHER_DAY' | 'WEEKLY' | 'NONE';
  phone: string;
  notes?: string;
  isActive: boolean;
  providerStatus?: string;
}

export interface AuditLog {
  _id: string;
  actor: User;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalCentres: number;
  pendingDoctorVerifications: number;
  pendingCentreVerifications: number;
  totalAppointments: number;
  totalReports: number;
  recentAuditLogs: AuditLog[];
}
