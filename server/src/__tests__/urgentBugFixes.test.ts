import { validateFileMagicBytes } from '../middleware/upload';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api/v1';

describe('Urgent Bug Fixes - Verification Tests', () => {
  let patientToken: string;
  let patientId: string;
  let doctorToken: string;
  let centreToken: string;
  let unauthorizedPatientToken: string;

  beforeAll(async () => {
    // 1. Patient login
    const patRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@demo.medilink', password: 'DemoPassword123!' }),
    });
    const patData = (await patRes.json()) as any;
    patientToken = patData.data.token;
    patientId = patData.data.user.id;

    // 2. Doctor login
    const docRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@demo.medilink', password: 'DemoPassword123!' }),
    });
    const docData = (await docRes.json()) as any;
    doctorToken = docData.data.token;

    // 3. Diagnostic Centre login
    const centreRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'centre@demo.medilink', password: 'DemoPassword123!' }),
    });
    const centreData = (await centreRes.json()) as any;
    centreToken = centreData.data.token;

    // 4. Register a temporary separate patient for unauthorized access checks
    const rand = Math.floor(Math.random() * 100000);
    const unauthRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Other Patient ${rand}`,
        email: `other.patient.${rand}@demo.medilink`,
        password: 'DemoPassword123!',
        role: 'PATIENT',
        mobile: `+1555${rand.toString().padStart(6, '0')}`,
      }),
    });
    const unauthData = (await unauthRes.json()) as any;
    unauthorizedPatientToken = unauthData.data.token;
  });

  describe('Fix 1: Lab Report PDF Upload & Magic Bytes Validation', () => {
    it('should approve valid PDF magic bytes signature', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4 test clinical report content');
      const result = validateFileMagicBytes(validPdfBuffer, 'application/pdf');
      expect(result.isValid).toBe(true);
    });

    it('should reject text or binary renamed to .pdf with invalid magic bytes', () => {
      const fakePdfBuffer = Buffer.from('This is a plain text file pretending to be a PDF.');
      const result = validateFileMagicBytes(fakePdfBuffer, 'application/pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a legitimate PDF document');
    });

    it('should reject empty or corrupted files', () => {
      const emptyBuffer = Buffer.from('');
      const result = validateFileMagicBytes(emptyBuffer, 'application/pdf');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Fix 2: Distinct Report Metadata & Non-Fabricated Descriptions', () => {
    let createdReportId: string;

    it('should create report with genuine custom findings and never overwrite with fake CBC', async () => {
      const res = await fetch(`${BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${centreToken}`,
        },
        body: JSON.stringify({
          patientId,
          testType: 'Brain MRI Contrast Scan',
          testDate: new Date().toISOString(),
          findings: 'No intracranial hemorrhage, acute territorial infarction, or mass effect demonstrated.',
          notes: 'Standard neurological axial protocol followed.',
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.report.findings).toBe(
        'No intracranial hemorrhage, acute territorial infarction, or mass effect demonstrated.'
      );
      // Ensure fake CBC data was NOT injected
      expect(data.data.report.findings).not.toContain('Complete Blood Count Panel');
      expect(data.data.report.findings).not.toContain('Haemoglobin: 13.8 g/dL');

      createdReportId = data.data.report.id;
    });

    it('should enforce report privacy: unauthorized patient cannot access report file endpoint', async () => {
      const res = await fetch(`${BASE_URL}/reports/${createdReportId}/file`, {
        headers: { Authorization: `Bearer ${unauthorizedPatientToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('should dynamically generate AI explainer tailored to the actual test and findings', async () => {
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
      // Must be tailored to Brain MRI, not hardcoded CBC
      expect(data.data.explanation.explanation).toContain('Brain MRI Contrast Scan');
      expect(data.data.explanation.explanation).not.toContain('Triglycerides');
    });
  });

  describe('Fix 3: Real-Time Chat Persistence & WebRTC Room Scoping', () => {
    const testRoom = `room-test-${Date.now()}`;

    it('should save consultation chat message to database via REST endpoint', async () => {
      const res = await fetch(`${BASE_URL}/consultations/${testRoom}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({ text: 'Hello Dr. Jenkins, I have a question about my MRI report.' }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.message.text).toBe('Hello Dr. Jenkins, I have a question about my MRI report.');
      expect(data.data.message.sender).toBeDefined();
    });

    it('should retrieve conversation history for room in chronological order', async () => {
      // Send a doctor reply
      await fetch(`${BASE_URL}/consultations/${testRoom}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({ text: 'Hello Alex, I reviewed your scan. Everything is completely clear.' }),
      });

      // Fetch history as patient
      const res = await fetch(`${BASE_URL}/consultations/${testRoom}/messages`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.messages.length).toBe(2);
      expect(data.data.messages[0].text).toContain('question about my MRI report');
      expect(data.data.messages[1].text).toContain('Everything is completely clear');
    });

    it('should ensure conversation messages are isolated to their specific roomCode', async () => {
      const res = await fetch(`${BASE_URL}/consultations/unrelated-empty-room-999/messages`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.data.messages).toEqual([]);
    });
  });
});
