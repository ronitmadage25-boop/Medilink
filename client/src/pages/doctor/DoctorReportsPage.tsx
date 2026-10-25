import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import {
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  MessageSquare,
  Download,
  ExternalLink,
  Paperclip,
} from 'lucide-react';
import { DiagnosticReport } from '../../types';

export const DoctorReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DiagnosticReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // PDF Viewer State
  const [viewingPdfReport, setViewingPdfReport] = useState<DiagnosticReport | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

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

  const handleViewPdf = async (report: DiagnosticReport) => {
    setViewingPdfReport(report);
    setIsPdfLoading(true);
    setPdfBlobUrl(null);
    try {
      const res = await api.get(`/reports/${report._id}/file`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: report.mimeType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      setAlert({ type: 'error', message: 'Unable to open PDF document: ' + getErrorMessage(err) });
      setViewingPdfReport(null);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleDownloadPdf = async (report: DiagnosticReport) => {
    try {
      const res = await api.get(`/reports/${report._id}/file?download=true`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: report.mimeType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.fileName || `patient-report-${report.testType.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setAlert({ type: 'error', message: 'Download failed: ' + getErrorMessage(err) });
    }
  };

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

                {r.fileName && (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <Paperclip className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className="truncate font-medium">{r.fileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(r)}
                      className="text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  {(r.fileName || r.fileUrl) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                      icon={<FileText className="w-3.5 h-3.5" />}
                      onClick={() => handleViewPdf(r)}
                    >
                      View Attached PDF
                    </Button>
                  )}
                </div>
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

            {(selectedReport.fileName || selectedReport.fileUrl) && (
              <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-700 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{selectedReport.fileName || 'Certified Laboratory Document'}</p>
                    <p className="text-[10px] text-slate-500">Official medical diagnostic attachment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() => handleViewPdf(selectedReport)}
                  >
                    View PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadPdf(selectedReport)}
                  >
                    Download
                  </Button>
                </div>
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

      {/* Browser Compatible PDF Document Viewer Modal */}
      {viewingPdfReport && (
        <Modal
          isOpen={true}
          onClose={() => {
            setViewingPdfReport(null);
            if (pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
          }}
          title={`Medical Report: ${viewingPdfReport.fileName || viewingPdfReport.testType}`}
          description={`Patient: ${viewingPdfReport.patient?.name || 'Patient'} • Conducted: ${new Date(viewingPdfReport.testDate).toLocaleDateString()}`}
          maxWidth="2xl"
        >
          {isPdfLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Spinner size="lg" label="Securely loading certified PDF report from storage..." />
            </div>
          ) : pdfBlobUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  {viewingPdfReport.fileName || 'Certified Laboratory Document'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-cyan-700 bg-white"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownloadPdf(viewingPdfReport)}
                >
                  Download File
                </Button>
              </div>
              <iframe
                src={pdfBlobUrl}
                className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white"
                title={viewingPdfReport.fileName || 'Laboratory Report Document'}
              />
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Document could not be previewed.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
