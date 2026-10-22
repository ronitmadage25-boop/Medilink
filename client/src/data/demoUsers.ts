import { User, UserRole } from '../types';

export interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  pass: string;
  token: string;
  user: User;
}

export const DEMO_USERS: Record<UserRole, DemoAccount> = {
  PATIENT: {
    role: 'PATIENT',
    name: 'Priya Sharma',
    email: 'patient@demo.medilink',
    pass: 'DemoPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWY1YzQ5Ni1mMWZiLTQ5NWUtOWM5Yi0zZTc4NzQ5ZGFjODEiLCJyb2xlIjoiUEFUSUVOVCIsImlhdCI6MTc5MjY5NDMwOCwiZXhwIjoxNzkyNzA4NzA4fQ.demo_patient_token',
    user: {
      _id: '65f5c496-f1fb-495e-9c9b-3e78749dac81',
      name: 'Priya Sharma',
      email: 'patient@demo.medilink',
      role: 'PATIENT',
      mobile: '+919876543210',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  },
  DOCTOR: {
    role: 'DOCTOR',
    name: 'Dr. Rajan Mehta',
    email: 'doctor@demo.medilink',
    pass: 'DemoPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkb2N0b3ItZGVtby1pZCIsInJvbGUiOiJET0NUT1IiLCJpYXQiOjE3OTI2OTQzMDgsImV4cCI6MTc5MjcwODcwOH0.demo_doctor_token',
    user: {
      _id: 'doctor-demo-id',
      name: 'Dr. Rajan Mehta',
      email: 'doctor@demo.medilink',
      role: 'DOCTOR',
      mobile: '+919876543211',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  },
  DIAGNOSTIC_CENTRE: {
    role: 'DIAGNOSTIC_CENTRE',
    name: 'Apex PathLabs & Imaging',
    email: 'centre@demo.medilink',
    pass: 'DemoPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZW50cmUtZGVtby1pZCIsInJvbGUiOiJESUFHTk9TVElDX0NFTlRSRSIsImlhdCI6MTc5MjY5NDMwOCwiZXhwIjoxNzkyNzA4NzA4fQ.demo_centre_token',
    user: {
      _id: 'centre-demo-id',
      name: 'Apex PathLabs & Imaging',
      email: 'centre@demo.medilink',
      role: 'DIAGNOSTIC_CENTRE',
      mobile: '+919876543212',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  },
  ADMIN: {
    role: 'ADMIN',
    name: 'Platform Administrator',
    email: 'admin@medilink.health',
    pass: 'ChangeThisSecurePassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi1kZW1vLWlkIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzkyNjk0MzA4LCJleHAiOjE3OTI3MDg3MDh9.demo_admin_token',
    user: {
      _id: 'admin-demo-id',
      name: 'Platform Administrator',
      email: 'admin@medilink.health',
      role: 'ADMIN',
      mobile: '+919876543200',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  },
};
