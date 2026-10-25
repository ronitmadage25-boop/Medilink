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
} from 'lucide-react';
import { UserRole } from '../types';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen text-slate-100 selection:bg-blue-600 selection:text-white overflow-x-hidden font-sans">
      {/* 
        Full-Screen Continuously Looping Background Video
        Unobstructed, transparent, crystal-clear visibility
      */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover scale-100"
        >
          <source src="/background_video.mp4" type="video/mp4" />
        </video>
        {/* Very subtle transparent gradient only for text contrast, keeping the video dominant */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/35" />
      </div>

      {/* Main Content Area (Elevated above the video) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 bg-black/25 backdrop-blur-md border-b border-white/15 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1769E0] to-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex items-center">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">MediLink</span>
                <span className="ml-2.5 text-[10px] font-semibold tracking-wider uppercase bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Unified Health OS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <Button
                  variant="primary"
                  className="bg-[#1769E0] hover:bg-blue-600 shadow-md shadow-blue-600/30 font-medium px-4 py-2"
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
                  Enter Dashboard
                </Button>
              ) : (
                <>
                  <Link to="/login">
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-white/20 text-sm font-semibold drop-shadow-sm"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button
                      variant="primary"
                      className="bg-[#1769E0] hover:bg-blue-600 text-white shadow-lg shadow-blue-600/30 text-sm font-semibold"
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col justify-center pt-12 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center w-full">
            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] sm:leading-[1.12] drop-shadow-lg">
              Seamless clinical care, from <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-white">
                first consultation to diagnostic delivery.
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-100 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow-md">
              MediLink seamlessly synchronizes Patients, Doctors, and Diagnostic Centres in a secure ecosystem.
              Exchange verified lab reports, schedule live consultations, and access AI health summaries.
            </p>

            {/* Role Portals Glass Container */}
            <div className="mt-8 sm:mt-10 p-5 sm:p-7 bg-black/30 border border-white/20 rounded-2xl max-w-3xl mx-auto shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-bold text-slate-200 uppercase tracking-widest drop-shadow-sm">
                  Role Portals — Choose Your Workspace
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {/* Patient Card */}
                <Link
                  to="/login"
                  className="p-4 rounded-xl bg-white/10 hover:bg-blue-600/30 border border-white/15 hover:border-blue-400 transition-all text-center group cursor-pointer backdrop-blur-md flex flex-col items-center justify-between shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-500/30 text-blue-200 border border-blue-400/40 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors drop-shadow-sm">
                      Patient Portal
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5">Appointments & Reports</div>
                  </div>
                  <div className="mt-2.5 text-[10px] font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Access Portal →
                  </div>
                </Link>

                {/* Doctor Card */}
                <Link
                  to="/login"
                  className="p-4 rounded-xl bg-white/10 hover:bg-sky-600/30 border border-white/15 hover:border-sky-400 transition-all text-center group cursor-pointer backdrop-blur-md flex flex-col items-center justify-between shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-sky-500/30 text-sky-200 border border-sky-400/40 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-sky-200 transition-colors drop-shadow-sm">
                      Doctor Portal
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5">Prescribe & Schedule</div>
                  </div>
                  <div className="mt-2.5 text-[10px] font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Access Portal →
                  </div>
                </Link>

                {/* Diagnostic Lab Card */}
                <Link
                  to="/login"
                  className="p-4 rounded-xl bg-white/10 hover:bg-emerald-600/30 border border-white/15 hover:border-emerald-400 transition-all text-center group cursor-pointer backdrop-blur-md flex flex-col items-center justify-between shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors drop-shadow-sm">
                      Diagnostic Lab
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5">Upload & AI OCR</div>
                  </div>
                  <div className="mt-2.5 text-[10px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Access Portal →
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-14 sm:py-18 bg-black/20 backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md">Built for Clinical Integrity</h2>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-200 drop-shadow-sm">
                Modern digital infrastructure adhering to medical confidentiality, audit logging, and role separation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-black/25 border border-white/15 hover:border-blue-400/50 transition-colors backdrop-blur-md shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-blue-500/30 text-blue-200 border border-blue-400/40 flex items-center justify-center mb-4 shadow-sm">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white drop-shadow-sm">Smart Appointment Scheduling</h3>
                <p className="mt-2 text-xs text-slate-200 leading-relaxed">
                  Prevents double-booking automatically, supports in-person and telehealth consultations, and gives instant status notifications.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-black/25 border border-white/15 hover:border-sky-400/50 transition-colors backdrop-blur-md shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-sky-500/30 text-sky-200 border border-sky-400/40 flex items-center justify-center mb-4 shadow-sm">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white drop-shadow-sm">Diagnostic Report Sharing</h3>
                <p className="mt-2 text-xs text-slate-200 leading-relaxed">
                  Securely attached lab reports delivered straight to the patient and verified referring doctor, with strict patient privacy controls.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-black/25 border border-white/15 hover:border-purple-400/50 transition-colors backdrop-blur-md shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center justify-center mb-4 shadow-sm">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white drop-shadow-sm">AI Plain-Language Explanations</h3>
                <p className="mt-2 text-xs text-slate-200 leading-relaxed">
                  Translates dense medical metrics into readable summaries and suggested doctor discussion points without substituting clinical advice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Audit Section */}
        <section className="py-12 bg-black/25 backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-black/30 border border-white/15 backdrop-blur-md shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Lock className="w-4 h-4" /> Enterprise Security & Transparency
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-sm">Every action logged. Every record protected.</h3>
                <p className="text-xs text-slate-200 mt-1 max-w-xl leading-relaxed">
                  MediLink features full audit trails, argon2 password hashing, rate limiting, and strict verification workflows for healthcare providers.
                </p>
              </div>
              <Link to="/register">
                <Button variant="primary" size="lg" className="bg-[#1769E0] hover:bg-blue-600 shadow-lg shadow-blue-600/30 whitespace-nowrap">
                  Create Your Account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 border-t border-white/10 bg-black/30 backdrop-blur-md text-center text-xs text-slate-300">
          <div className="max-w-7xl mx-auto px-4">
            <p>© 2026 MediLink Health Systems. All rights reserved. Designed for connected clinical healthcare coordination.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
