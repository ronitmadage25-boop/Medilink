# MediLink — Unified Healthcare Coordination Platform

MediLink is a production-grade full-stack healthcare coordination platform connecting **Patients**, **Physicians**, **Diagnostic Centres**, and **Platform Administrators** in a single integrated ecosystem. It streamlines appointment booking, verified lab report delivery, plain-language AI report explanations, automated recovery follow-up schedules, and security audit logging.

---

## 🚀 Key Features by User Role

### 👤 Patient Portal
* **Consultation Booking:** Schedule in-person, video, or audio consultations with verified physicians with automated conflict / double-booking prevention.
* **Diagnostic Reports & AI Explainer:** View certified pathology and radiology reports. Run the AI Health Explainer to translate clinical metrics into plain English, demystify medical jargon, and receive recommended questions for their physician.
* **Digital Prescriptions:** View active drug regimens with dosages, frequency, durations, and dietary advice.
* **Daily Symptom Check-In:** Log daily symptoms with automated severity evaluation and clinical red-flag emergency guidance (immediate 112/911 callouts for acute symptoms).
* **Automated Voice Check-in Preference:** Configure telephony recovery follow-up call windows and preferences.

### 🩺 Physician Workspace
* **Practice Dashboard:** Today's appointments, patient directory, and pending lab reports.
* **Appointment Management:** Confirm, mark completed, or decline consultations.
* **Prescription Pad:** Issue dynamic multi-drug digital prescriptions with diagnosis, medication lines, dosage, frequency, and follow-up dates.
* **Diagnostic Report Review:** Inspect shared lab reports, write clinical remarks, and officially sign off on test results.

### 🔬 Diagnostic Laboratory Hub
* **Direct Report Delivery:** Upload certified test reports (PDF, PNG, JPG) to patient profiles with clinical findings and laboratory notes.
* **Delivery Archive:** Track reports delivered, pending doctor review, and signed off.

### 🛡️ Administration & Governance
* **System Metrics:** Real-time platform counts across patients, doctors, labs, appointments, and reports.
* **User Management:** Search and filter user accounts across all roles; activate or deactivate accounts.
* **Provider Verifications:** Verify medical council license registration numbers for doctors and facility accreditations for diagnostic centers.
* **Immutable Audit Trail:** Complete audit stream logging actor, role, action, target resource, outcome, IP address, and timestamp.

---

## 🛠️ Architecture & Tech Stack

* **Frontend:**
  * React 19 + TypeScript
  * Vite 8 + Tailwind CSS v4
  * React Router v7
  * Lucide Icons
  * Axios with JWT request / response interceptors
* **Backend:**
  * Node.js + Express + TypeScript
  * MongoDB + Mongoose (with automated indexing and schemas)
  * Argon2 password hashing
  * JWT authentication with access & refresh token mechanics
  * Helmet security headers, CORS, rate limiting, Morgan logging, Winston logger
  * Pluggable Storage Adapter (Local file storage / Cloudinary)
  * Pluggable AI Provider (OpenAI GPT-4o / Built-in educational fallback simulator)
  * Pluggable Telephony Provider (Twilio IVR / Built-in dev simulation engine)

---

## ⚡ Quick Start Guide

### 1. Prerequisites
* Node.js (v18 or higher recommended)
* MongoDB running locally (`mongodb://localhost:27017/medilink`) or MongoDB Atlas URI

### 2. Environment Configuration
The backend comes pre-configured with a default development `.env` in `./server/.env`.
If using MongoDB Atlas or custom ports, update `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medilink
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secure-jwt-key
JWT_REFRESH_SECRET=your-secure-refresh-key
FILE_STORAGE_PROVIDER=local
AI_PROVIDER=none   # or 'openai' with AI_API_KEY
```

### 3. Seed Demo Accounts & Admin
To seed fictional demo accounts and the platform administrator:
```bash
# Seed development demo data (Patient, Doctor, Lab, appointments, reports)
npm run seed

# Seed initial system administrator
npm run seed:admin
```

### 4. Run the Full Stack Application
In two separate terminals (or using the root workspace scripts):

**Terminal 1 (Backend API):**
```bash
npm run server
# Running on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
npm run client
# Running on http://localhost:5173
```

---

## 🔑 Pre-Configured Demo Credentials

The platform includes a **1-Click Instant Demo Login Switcher** directly on the Login page and Top Navbar. You can also log in manually with the following credentials:

| Persona | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Priya Sharma** | Patient | `patient@demo.medilink` | `DemoPassword123!` |
| **Dr. Rajan Mehta** | Doctor | `doctor@demo.medilink` | `DemoPassword123!` |
| **MediLink Labs** | Diagnostic Centre | `centre@demo.medilink` | `DemoPassword123!` |
| **Platform Root** | Administrator | `admin@medilink.health` | `ChangeThisSecurePassword123!` |

---

## 📡 API Reference Overview

| Prefix | Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth` | `/register` | POST | Public | Register new Patient, Doctor, or Centre |
| `/api/v1/auth` | `/login` | POST | Public | Login and obtain JWT tokens |
| `/api/v1/auth` | `/change-password` | PATCH | Authenticated | Update account password |
| `/api/v1/appointments` | `/` | GET | Authenticated | List appointments for user |
| `/api/v1/appointments` | `/` | POST | PATIENT | Book consultation with conflict checks |
| `/api/v1/appointments` | `/:id/status` | PATCH | Authenticated | Update status (Confirm, Complete, Cancel) |
| `/api/v1/reports` | `/` | GET | Authenticated | View reports with privacy authorization |
| `/api/v1/reports` | `/` | POST | DIAGNOSTIC_CENTRE | Upload lab report with file attachment |
| `/api/v1/reports` | `/:id/review` | PATCH | DOCTOR, ADMIN | Sign off and submit clinical remarks |
| `/api/v1/prescriptions` | `/` | GET | Authenticated | List prescriptions |
| `/api/v1/prescriptions` | `/` | POST | DOCTOR | Issue multi-drug digital prescription |
| `/api/v1/ai` | `/explanations` | POST | PATIENT | Generate plain-language AI explanation |
| `/api/v1/check-ins` | `/` | POST | PATIENT | Log symptoms with emergency flags |
| `/api/v1/call-schedules`| `/` | POST | PATIENT | Configure automated follow-up calls |
| `/api/v1/admin` | `/dashboard` | GET | ADMIN | System analytics overview |
| `/api/v1/admin` | `/users` | GET | ADMIN | Directory of all accounts |
| `/api/v1/admin` | `/users/:id/status`| PATCH | ADMIN | Toggle active / inactive status |
| `/api/v1/admin` | `/doctors/:id/verify` | PATCH | ADMIN | Verify doctor medical license |
| `/api/v1/admin` | `/diagnostic-centres/:id/verify`| PATCH | ADMIN | Verify diagnostic facility |
| `/api/v1/audit-logs` | `/` | GET | ADMIN | Immutable security audit trail |

---

## 🔒 Security & Medical Confidentiality Design
* **Role-Based Access Control (RBAC):** Every endpoint enforces strict role verification. Patients only access their own records; doctors only access authorized patients; administrators govern platform state without altering clinical records.
* **Double-Booking Prevention:** Atomic time slot verification ensures doctors cannot be booked concurrently for overlapping appointments.
* **Emergency Disclaimer & Triage:** High-severity symptoms trigger prominent warnings reminding patients to contact emergency hotlines (112) immediately.
* **Educational AI Guardrails:** AI explanations provide educational terminology summaries without attempting automated medical diagnoses or prescribing treatments.
* **Audit Logging:** Sensitive actions (logins, report views, verifications, status updates) generate tamper-evident audit logs with actor identity, action type, outcome, and timestamp.
