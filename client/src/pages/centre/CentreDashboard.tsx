import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  Building2,
  Upload,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
} from 'lucide-react';
import { DiagnosticReport } from '../../types';

import { MOCK_REPORTS } from '../../data/mockClinicalData';

export const CentreDashboard: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCentreData = async () => {
      try {
        const res = await api.get('/reports?limit=10');
        if (res.data?.success && Array.isArray(res.data.data.reports) && res.data.data.reports.length > 0) {
          setReports(res.data.data.reports);
        } else {
          setReports(MOCK_REPORTS);
        }
      } catch {
        setReports(MOCK_REPORTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCentreData();
  }, []);

  if (isLoading) {
    return <Spinner size="lg" label="Loading diagnostic centre workspace..." className="py-20" />;
  }

  const reviewedCount = reports.filter((r) => r.reviewStatus === 'REVIEWED').length;
  const pendingCount = reports.filter((r) => r.reviewStatus === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Centre Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-xs rounded-lg">
              Diagnostic Laboratory Portal
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> Certified Facility
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {user?.name}
          </h1>
          <p className="mt-2 text-sm text-emerald-100 leading-relaxed">
            Upload certified diagnostic findings, pathology tests, and imaging records directly to patient accounts.
          </p>

          <div className="mt-5">
            <Link to="/centre/upload">
              <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>
                Upload New Test Report
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-end pr-8">
          <Building2 className="w-48 h-48 text-white" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Uploaded Reports
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{reports.length}</p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Awaiting Doctor Review
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pendingCount}</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reviewed & Signed Off
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{reviewedCount}</p>
        </Card>
      </div>

      {/* Recent Uploads Feed */}
      <Card>
        <CardHeader
          title="Recent Report Deliveries"
          subtitle="Latest diagnostic tests uploaded by your facility"
          action={
            <Link to="/centre/upload">
              <Button variant="primary" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>
                Upload Report
              </Button>
            </Link>
          }
        />

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No reports uploaded yet</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select "Upload New Test Report" to deliver your first patient lab result.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((r) => (
              <div key={r._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{r.testType}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Patient: {r.patient?.name} ({r.patient?.email})</span>
                      <span>•</span>
                      <span>Conducted: {new Date(r.testDate).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={r.reviewStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
