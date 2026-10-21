import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';

// Patient pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { AppointmentsPage } from './pages/patient/AppointmentsPage';
import { ReportsPage } from './pages/patient/ReportsPage';
import { PrescriptionsPage } from './pages/patient/PrescriptionsPage';
import { SymptomCheckInPage } from './pages/patient/SymptomCheckInPage';
import { CallSchedulePage } from './pages/patient/CallSchedulePage';
import { AiExplainerPage } from './pages/patient/AiExplainerPage';

// Doctor pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage';
import { DoctorPrescriptionsPage } from './pages/doctor/DoctorPrescriptionsPage';
import { DoctorReportsPage } from './pages/doctor/DoctorReportsPage';

// Diagnostic Centre pages
import { CentreDashboard } from './pages/centre/CentreDashboard';
import { UploadReportPage } from './pages/centre/UploadReportPage';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { VerificationsPage } from './pages/admin/VerificationsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Auth */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated Application Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Common Profile */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Patient Routes */}
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/reports"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/prescriptions"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <PrescriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/ai-explainer"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AiExplainerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/check-in"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <SymptomCheckInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/call-schedule"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <CallSchedulePage />
                </ProtectedRoute>
              }
            />

            {/* Doctor Routes */}
            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/appointments"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorAppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/prescriptions"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorPrescriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/reports"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Diagnostic Centre Routes */}
            <Route
              path="/centre/dashboard"
              element={
                <ProtectedRoute allowedRoles={['DIAGNOSTIC_CENTRE']}>
                  <CentreDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/centre/upload"
              element={
                <ProtectedRoute allowedRoles={['DIAGNOSTIC_CENTRE']}>
                  <UploadReportPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <VerificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
