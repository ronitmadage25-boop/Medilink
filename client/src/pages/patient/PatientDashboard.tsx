import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  Calendar,
  FileText,
  Pill,
  HeartPulse,
  Sparkles,
  ArrowRight,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';
import { Appointment, DiagnosticReport, Prescription } from '../../types';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [appRes, repRes, rxRes] = await Promise.all([
          api.get('/appointments?limit=5'),
          api.get('/reports?limit=5'),
          api.get('/prescriptions?limit=5'),
        ]);
        if (appRes.data?.success) setAppointments(appRes.data.data.appointments || []);
        if (repRes.data?.success) setReports(repRes.data.data.reports || []);
        if (rxRes.data?.success) setPrescriptions(rxRes.data.data.prescriptions || []);
      } catch {
        // Quiet catch for initial dashboard load
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <Spinner size="lg" label="Loading your patient portal..." className="py-20" />;
  }

  const upcomingAppts = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'PENDING'
  );
  const nextAppt = upcomingAppts[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-xs rounded-lg mb-3">
            Patient Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="mt-2 text-sm text-cyan-100 leading-relaxed">
            Manage your consultations, diagnostic results, and prescriptions in one secure place.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/patient/appointments">
              <Button variant="secondary" size="sm" icon={<Calendar className="w-4 h-4" />}>
                Book Consultation
              </Button>
            </Link>
            <Link to="/patient/check-in">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                icon={<HeartPulse className="w-4 h-4" />}
              >
                Log Today's Symptoms
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-end pr-8">
          <HeartPulse className="w-48 h-48 text-white" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Upcoming Appointments
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{upcomingAppts.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Diagnostic Reports
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{reports.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Prescriptions on File
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{prescriptions.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Scheduled Appointment */}
        <Card>
          <CardHeader
            title="Next Consultation"
            subtitle="Your nearest scheduled doctor appointment"
            action={
              <Link to="/patient/appointments" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {nextAppt ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{nextAppt.doctor?.name || 'Assigned Doctor'}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(nextAppt.appointmentDate).toLocaleDateString()} at {nextAppt.startTime} - {nextAppt.endTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 italic">Reason: "{nextAppt.reason || 'General checkup'}"</p>
                </div>
              </div>
              <div className="sm:text-right shrink-0">
                <StatusBadge status={nextAppt.status} />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No upcoming consultations booked.</p>
              <Link to="/patient/appointments" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Schedule an Appointment</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Recent Diagnostic Reports */}
        <Card>
          <CardHeader
            title="Recent Diagnostic Reports"
            subtitle="Verified lab test findings and AI explanations"
            action={
              <Link to="/patient/reports" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                All reports <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {reports.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No test reports uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.slice(0, 3).map((r) => (
                <div key={r._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.testType}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(r.testDate).toLocaleDateString()} • {r.diagnosticCentre?.name || 'Diagnostic Centre'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.reviewStatus} />
                    <Link to="/patient/reports">
                      <Button size="sm" variant="ghost" className="text-xs text-cyan-600">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* AI Health Explainer Teaser Card */}
      <Card className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confused by medical terms in your report?</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Use our AI Health Explainer to convert complex terminology into clear, patient-friendly explanations and suggested questions for your doctor.
              </p>
            </div>
          </div>
          <Link to="/patient/ai-explainer">
            <Button variant="primary" size="sm" className="whitespace-nowrap">
              Try AI Explainer
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
