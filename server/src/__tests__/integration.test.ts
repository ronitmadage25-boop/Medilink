/**
 * MediLink End-to-End & Integration Test Suite
 * Tests authentication, authorization, clinical records, appointments,
 * prescriptions, diagnostic reports, and admin oversight.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api/v1';

describe('MediLink Complete API & Database Integration Tests', () => {
  let patientToken: string;
  let patientUser: any;
  let doctorToken: string;
  let doctorUser: any;
  let centreToken: string;
  let centreUser: any;
  let adminToken: string;
  let adminUser: any;

  let createdAppointmentId: string;
  let createdReportId: string;

  // 1. Health check
  describe('System Health & Database Verification', () => {
    it('should return healthy status and connected database', async () => {
      const res = await fetch('http://127.0.0.1:5000/api/health');
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.database).toContain('PostgreSQL');
    });
  });

  // 2. Authentication & Authorization for All 4 Roles
  describe('Role-Based Authentication & Session Management', () => {
    it('should login as Patient with valid credentials', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'patient@demo.medilink',
          password: 'DemoPassword123!',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.role).toBe('PATIENT');
      patientToken = data.data.token;
      patientUser = data.data.user;
    });

    it('should login as Doctor with valid credentials', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'doctor@demo.medilink',
          password: 'DemoPassword123!',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.role).toBe('DOCTOR');
      doctorToken = data.data.token;
      doctorUser = data.data.user;
    });

    it('should login as Diagnostic Centre with valid credentials', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'centre@demo.medilink',
          password: 'DemoPassword123!',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.role).toBe('DIAGNOSTIC_CENTRE');
      centreToken = data.data.token;
      centreUser = data.data.user;
    });

    it('should login as Admin with valid credentials', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@medilink.health',
          password: 'ChangeThisSecurePassword123!',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user.role).toBe('ADMIN');
      adminToken = data.data.token;
      adminUser = data.data.user;
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'patient@demo.medilink',
          password: 'WrongPassword999!',
        }),
      });
      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.success).toBe(false);
    });

    it('should register a new unique patient account', async () => {
      const uniqueEmail = `test.patient.${Date.now()}@medilink.test`;
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test QA Patient',
          email: uniqueEmail,
          password: 'SecureQAPassword123!',
          role: 'PATIENT',
          mobile: '+919876500000',
        }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(uniqueEmail);
      expect(data.data.user.role).toBe('PATIENT');
    });

    it('should reject duplicate email registration with 409', async () => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Test',
          email: 'patient@demo.medilink',
          password: 'Password123!',
          role: 'PATIENT',
        }),
      });
      expect(res.status).toBe(409);
    });
  });

  // 3. User Profile & Password Updates
  describe('Profile & Account Management', () => {
    it('should fetch patient profile at /users/profile', async () => {
      const res = await fetch(`${BASE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe('patient@demo.medilink');
    });

    it('should update profile mobile via PUT /users/profile', async () => {
      const res = await fetch(`${BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          name: 'Priya Sharma',
          mobile: '+919876543210',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.user.mobile).toBe('+919876543210');
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await fetch(`${BASE_URL}/users/profile`);
      expect(res.status).toBe(401);
    });
  });

  // 4. Clinical Appointments Workflow
  describe('Clinical Appointments Workflow', () => {
    it('should fetch appointment list for patient', async () => {
      const res = await fetch(`${BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.appointments)).toBe(true);
    });

    it('should book a new appointment as Patient', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          doctorId: doctorUser.id || doctorUser._id,
          appointmentDate: tomorrow.toISOString(),
          startTime: '14:00',
          endTime: '14:30',
          type: 'VIDEO',
          reason: 'End-to-end integration test consultation',
        }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.appointment).toBeDefined();
      createdAppointmentId = data.data.appointment._id || data.data.appointment.id;
    });

    it('should allow doctor to confirm the appointment', async () => {
      expect(createdAppointmentId).toBeDefined();
      const res = await fetch(`${BASE_URL}/appointments/${createdAppointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.appointment.status).toBe('CONFIRMED');
    });
  });

  // 5. Prescriptions Workflow
  describe('Digital Prescriptions Workflow', () => {
    it('should allow doctor to create a prescription', async () => {
      const res = await fetch(`${BASE_URL}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          patientId: patientUser.id || patientUser._id,
          diagnosis: 'Routine Blood Pressure Checkup Follow-up',
          medications: [
            {
              name: 'Telmisartan 40mg',
              dosage: '40mg',
              frequency: 'Once daily (Morning)',
              duration: '30 days',
              instructions: 'Take with food',
            },
          ],
          advice: 'Maintain regular aerobic activity and reduced sodium diet.',
        }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.prescription).toBeDefined();
    });

    it('should allow patient to read issued prescriptions', async () => {
      const res = await fetch(`${BASE_URL}/prescriptions`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.prescriptions)).toBe(true);
      expect(data.data.prescriptions.length).toBeGreaterThan(0);
    });
  });

  // 6. Symptom Check-ins & Alerts
  describe('Symptom Check-Ins & Automated Triage', () => {
    it('should record a patient symptom check-in', async () => {
      const res = await fetch(`${BASE_URL}/check-ins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          symptoms: ['Mild Headache', 'Fatigue / Body Weakness'],
          severity: 'MILD',
          notes: 'Automated test symptom check-in',
        }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.checkIn.symptoms).toContain('Mild Headache');
    });

    it('should retrieve patient check-in history', async () => {
      const res = await fetch(`${BASE_URL}/check-ins`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.checkIns)).toBe(true);
      expect(data.data.checkIns.length).toBeGreaterThan(0);
    });
  });

  // 7. Call Schedule & Voice Telephony
  describe('Automated Call Schedules', () => {
    it('should fetch call schedule configuration', async () => {
      const res = await fetch(`${BASE_URL}/call-schedules`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });

    it('should update patient call schedule', async () => {
      const res = await fetch(`${BASE_URL}/call-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          preferredTime: '11:00 AM',
          frequency: 'DAILY',
          phone: '+919876543210',
          isActive: true,
          notes: 'Prefers calls in late morning',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.schedule.preferredTime).toBe('11:00 AM');
    });
  });

  // 8. Diagnostic Reports & Doctor Sign-off
  describe('Diagnostic Reports & Review Workflow', () => {
    it('should fetch reports for patient', async () => {
      const res = await fetch(`${BASE_URL}/reports`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.reports)).toBe(true);
      expect(data.data.reports.length).toBeGreaterThan(0);
      createdReportId = data.data.reports[0]._id || data.data.reports[0].id;
    });

    it('should allow doctor to review report with clinical assessment remarks', async () => {
      expect(createdReportId).toBeDefined();
      const res = await fetch(`${BASE_URL}/reports/${createdReportId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          reviewNotes: 'Verified test results. Lipid levels controlled on current regimen.',
        }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.report.reviewStatus).toBe('REVIEWED');
    });
  });

  // 9. AI Health Explainer
  describe('AI Health Explainer Engine', () => {
    it('should generate educational clinical explanation for report', async () => {
      expect(createdReportId).toBeDefined();
      const res = await fetch(`${BASE_URL}/ai/explanations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({ reportId: createdReportId }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.explanation).toBeDefined();
      expect(data.data.explanation.explanation.length).toBeGreaterThan(20);
    });

    it('should fetch explanation history', async () => {
      const res = await fetch(`${BASE_URL}/ai/explanations`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.explanations)).toBe(true);
      expect(data.data.explanations.length).toBeGreaterThan(0);
    });
  });

  // 10. Admin Governance & Security Auditing
  describe('Admin Platform Oversight & Audit Trail', () => {
    it('should load administrative dashboard metrics', async () => {
      const res = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.totalUsers).toBeGreaterThanOrEqual(4);
    });

    it('should retrieve system user directory', async () => {
      const res = await fetch(`${BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.users)).toBe(true);
    });

    it('should fetch pending credential verifications', async () => {
      const res = await fetch(`${BASE_URL}/admin/verifications/pending`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });

    it('should retrieve cryptographic security audit trail', async () => {
      const res = await fetch(`${BASE_URL}/audit-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.logs)).toBe(true);
    });

    it('should block non-admin from accessing administrative routes (RBAC check)', async () => {
      const res = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  // 11. Notifications Workflow
  describe('Notification System', () => {
    it('should retrieve user notifications', async () => {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.notifications)).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const res = await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });
  });
});
