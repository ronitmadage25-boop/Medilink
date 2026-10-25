import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import {
  ShieldCheck,
  Users,
  Stethoscope,
  Building2,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { AdminStats } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data?.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (isLoading) {
    return <Spinner size="lg" label="Loading administration analytics..." className="py-20" />;
  }

  return (
    <div className="space-y-6">
      {/* Admin Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-800 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-xs rounded-lg">
              System Administration
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> Governance Root
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            MediLink Platform Oversight
          </h1>
          <p className="mt-2 text-sm text-purple-200 leading-relaxed">
            Monitor system integrity, perform clinical credential verifications, manage accounts, and inspect cryptographic audit trails.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/admin/verifications">
              <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-4 h-4" />}>
                Review Verifications ({((stats?.pendingDoctorVerifications || 0) + (stats?.pendingCentreVerifications || 0))})
              </Button>
            </Link>
            <Link to="/admin/audit-logs">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                icon={<Activity className="w-4 h-4" />}
              >
                Inspect Audit Logs
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-end pr-8">
          <ShieldAlert className="w-48 h-48 text-white" />
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-cyan-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalPatients ?? 0}</p>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physicians</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalDoctors ?? 0}</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnostic Labs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalCentres ?? 0}</p>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Consultations</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalAppointments ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Status Warning Box */}
        <Card>
          <CardHeader
            title="Pending Provider Verifications"
            subtitle="Healthcare credentials requiring administrative sign-off"
            action={
              <Link to="/admin/verifications" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Verify all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Doctor Medical Registrations</h4>
                  <p className="text-[11px] text-slate-500">State Medical Council validation</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {stats?.pendingDoctorVerifications ?? 0} pending
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Diagnostic Centre Registrations</h4>
                  <p className="text-[11px] text-slate-500">Laboratory facility validation</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {stats?.pendingCentreVerifications ?? 0} pending
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Audit Log Preview */}
        <Card>
          <CardHeader
            title="Security Audit Stream"
            subtitle="Latest immutable system activity entries"
            action={
              <Link to="/admin/audit-logs" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Full logs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />

          {(!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0) ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No recent audit trail entries logged.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentAuditLogs.slice(0, 5).map((log) => (
                <div key={log._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {log.action} • <span className="font-normal text-slate-500">{log.actor?.name || log.actorRole}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()} • {log.resourceType}
                    </p>
                  </div>
                  <StatusBadge status={log.outcome} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
