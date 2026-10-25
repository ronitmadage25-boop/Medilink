import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  Calendar,
  Users,
  FileText,
  Pill,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
} from 'lucide-react';
import { Appointment, DiagnosticReport, Prescription } from '../../types';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDoctorData = async () => {
      try {
        const [appRes, repRes, rxRes] = await Promise.all([
          api.get('/appointments?limit=10'),
          api.get('/reports?limit=10'),
          api.get('/prescriptions?limit=10'),
        ]);
        if (appRes.data?.success) setAppointments(appRes.data.data.appointments || []);
        if (repRes.data?.success) setReports(repRes.data.data.reports || []);
        if (rxRes.data?.success) setPrescriptions(rxRes.data.data.prescriptions || []);
      } catch {
        // Quiet fail on initial load
      } finally {
        setIsLoading(false);
      }
    };
    loadDoctorData();
  }, []);

  if (isLoading) {
    return <Spinner size="lg" label="Loading clinical practice workspace..." className="py-20" />;
  }

  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING');
  const confirmedAppointments = appointments.filter((a) => a.status === 'CONFIRMED');
  const pendingReports = reports.filter((r) => r.reviewStatus === 'PENDING_REVIEW');

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-xs rounded-lg">
              Physician Practice Portal
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Medical License
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {user?.name}
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Manage your daily consultation schedule, review shared diagnostic lab reports, and issue digital prescriptions.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/doctor/appointments">
              <Button variant="secondary" size="sm" icon={<Calendar className="w-4 h-4" />}>
                Manage Schedule
              </Button>
            </Link>
            <Link to="/doctor/prescriptions">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                icon={<Pill className="w-4 h-4" />}
              >
                Issue Prescription
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-end pr-8">
          <Stethoscope className="w-48 h-48 text-white" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Approval
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pendingAppointments.length}</p>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Confirmed Consultations
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{confirmedAppointments.length}</p>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reports to Review
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pendingReports.length}</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Prescriptions Issued
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{prescriptions.length}</p>
        </Card>
      </div>

      {/* Appointments & Reports Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Consultations */}
        <Card>
          <CardHeader
            title="Upcoming Patient Appointments"
            subtitle="Scheduled consultations"
            action={
              <Link to="/doctor/appointments" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />

          {appointments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No appointments scheduled currently.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.slice(0, 5).map((appt) => (
                <div key={appt._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{appt.patient?.name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(appt.appointmentDate).toLocaleDateString()} at {appt.startTime}</span>
                      <span>•</span>
                      <span className="capitalize">{appt.type.toLowerCase().replace('_', ' ')}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={appt.status} />
                    <Link to="/doctor/appointments">
                      <Button size="sm" variant="ghost" className="text-xs text-cyan-600">
                        Action
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Diagnostic Reports Awaiting Clinical Review */}
        <Card>
          <CardHeader
            title="Diagnostic Reports for Review"
            subtitle="Laboratory test findings shared with you"
            action={
              <Link to="/doctor/reports" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                Review all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />

          {reports.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No reports delivered for review.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.slice(0, 5).map((r) => (
                <div key={r._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{r.testType}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Patient: {r.patient?.name} • Lab: {r.diagnosticCentre?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.reviewStatus} />
                    <Link to="/doctor/reports">
                      <Button size="sm" variant="ghost" className="text-xs text-cyan-600">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
