import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { FileText, Calendar, User, Building2, CheckCircle2, MessageSquare } from 'lucide-react';
import { DiagnosticReport } from '../../types';

export const DoctorReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DiagnosticReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      if (res.data?.success) setReports(res.data.data.reports || []);
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsSubmitting(true);
    setAlert(null);

    try {
      await api.patch(`/reports/${selectedReport._id}/review`, { reviewNotes });
      setAlert({ type: 'success', message: 'Report reviewed and clinical remarks saved!' });
      setSelectedReport(null);
      setReviewNotes('');
      fetchReports();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Diagnostic Lab Reports</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review patient diagnostic findings, verify lab reports, and record clinical assessment notes.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {isLoading ? (
        <Spinner size="lg" label="Loading reports..." className="py-16" />
      ) : reports.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No diagnostic reports delivered</h3>
          <p className="text-xs text-slate-500 mt-1">
            Reports from diagnostic labs that list you as referring or consulting physician will be accessible here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <Card key={r._id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{r.testType}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5" /> Patient: {r.patient?.name}
                    </p>
                  </div>
                  <StatusBadge status={r.reviewStatus} />
                </div>

                <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Lab: {r.diagnosticCentre?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Test Date: {new Date(r.testDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {r.findings && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                    <span className="font-semibold text-slate-800 block mb-0.5">Laboratory Findings:</span>
                    <p className="line-clamp-2">{r.findings}</p>
                  </div>
                )}

                {r.reviewNotes && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs">
                    <span className="font-semibold block text-[10px] uppercase tracking-wider text-emerald-800">
                      Your Clinical Review:
                    </span>
                    <p className="mt-0.5">{r.reviewNotes}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setSelectedReport(r);
                    setReviewNotes(r.reviewNotes || '');
                  }}
                >
                  {r.reviewStatus === 'REVIEWED' ? 'Edit Remarks' : 'Review & Sign Off'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          title={`Clinical Review: ${selectedReport.testType}`}
          description={`Patient: ${selectedReport.patient?.name} | Conducted: ${new Date(selectedReport.testDate).toLocaleDateString()}`}
        >
          <form onSubmit={handleReview} className="space-y-4">
            {selectedReport.findings && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Laboratory Findings Summary
                </span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedReport.findings}</p>
              </div>
            )}

            {selectedReport.notes && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Technician Notes
                </span>
                <p className="text-slate-700">{selectedReport.notes}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Physician Assessment & Review Notes *
              </label>
              <textarea
                rows={4}
                required
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Findings indicate mild inflammation. Patient instructed to continue prescribed medication and retest in 3 weeks..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedReport(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Save Review Remarks
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
