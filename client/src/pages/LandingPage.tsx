import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import {
  HeartPulse,
  Sparkles,
  Stethoscope,
  Building2,
  ShieldCheck,
  CalendarCheck,
  FileCheck2,
  Brain,
  Activity,
  ArrowRight,
  Lock,
  Clock,
  PhoneForwarded,
} from 'lucide-react';
import { UserRole } from '../types';

export const LandingPage: React.FC = () => {
  const { user, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemoAccess = async (role: UserRole) => {
    try {
      await quickLogin(role);
      const roleRoutes: Record<UserRole, string> = {
        PATIENT: '/patient/dashboard',
        DOCTOR: '/doctor/dashboard',
        DIAGNOSTIC_CENTRE: '/centre/dashboard',
        ADMIN: '/admin/dashboard',
      };
      navigate(roleRoutes[role]);
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">MediLink</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                Healthcare OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                variant="primary"
                onClick={() => {
                  const roleRoutes: Record<UserRole, string> = {
                    PATIENT: '/patient/dashboard',
                    DOCTOR: '/doctor/dashboard',
                    DIAGNOSTIC_CENTRE: '/centre/dashboard',
                    ADMIN: '/admin/dashboard',
                  };
                  navigate(roleRoutes[user.role]);
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-600/20 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[250px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Next-Generation Healthcare Coordination</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Seamless clinical care, from <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
              first consultation to diagnostic delivery.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            MediLink connects Patients, Doctors, and Diagnostic Centres in a secure ecosystem.
            Book appointments, exchange verified lab reports, receive AI-assisted insights,
            and monitor patient recovery without paperwork friction.
          </p>

          {/* Quick Demo Launch Bar */}
          <div className="mt-10 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-3xl mx-auto shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Explore Live Roles — 1-Click Instant Demo Access
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleDemoAccess('PATIENT')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-500 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300">Patient</div>
                <div className="text-[10px] text-slate-400">Appointments & Reports</div>
              </button>

              <button
                onClick={() => handleDemoAccess('DOCTOR')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-blue-950/80 border border-slate-700/80 hover:border-blue-500 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-blue-300">Doctor</div>
                <div className="text-[10px] text-slate-400">Prescribe & Schedule</div>
              </button>

              <button
                onClick={() => handleDemoAccess('DIAGNOSTIC_CENTRE')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-emerald-950/80 border border-slate-700/80 hover:border-emerald-500 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300">Diagnostic Lab</div>
                <div className="text-[10px] text-slate-400">Upload Test Results</div>
              </button>

              <button
                onClick={() => handleDemoAccess('ADMIN')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-purple-950/80 border border-slate-700/80 hover:border-purple-500 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-purple-300">Admin</div>
                <div className="text-[10px] text-slate-400">Audit & Governance</div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Built for Clinical Integrity</h2>
            <p className="mt-3 text-sm text-slate-400">
              Modern digital infrastructure adhering to medical confidentiality, audit logging, and role separation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center mb-4">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Smart Appointment Scheduling</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Prevents double-booking automatically, supports in-person and telehealth consultations, and gives instant status notifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center mb-4">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Diagnostic Report Sharing</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Securely attached lab reports delivered straight to the patient and verified referring doctor, with strict patient privacy controls.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">AI Plain-Language Explanations</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Translates dense medical metrics into readable summaries and suggested doctor discussion points without substituting clinical advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Audit Section */}
      <section className="py-16 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-950/60 border border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Lock className="w-4 h-4" /> Enterprise Security & Transparency
              </div>
              <h3 className="text-xl font-bold text-white">Every action logged. Every record protected.</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                MediLink features full audit trails, argon2 password hashing, rate limiting, and strict verification workflows for healthcare providers.
              </p>
            </div>
            <Link to="/register">
              <Button variant="primary" size="lg">Create Your Account</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 MediLink Health Systems. All rights reserved. Designed for healthcare coordination.</p>
        </div>
      </footer>
    </div>
  );
};
