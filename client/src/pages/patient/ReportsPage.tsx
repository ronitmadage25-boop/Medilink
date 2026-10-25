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
  Sparkles,
  Building2,
  Stethoscope,
  Download,
  HelpCircle,
  BookOpen,
  Info,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { DiagnosticReport, AIExplanation } from '../../types';
import { MOCK_REPORTS } from '../../data/mockClinicalData';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected report for viewing details
  const [selectedReport, setSelectedReport] = useState<DiagnosticReport | null>(null);

  // PDF Viewer State
  const [viewingPdfReport, setViewingPdfReport] = useState<DiagnosticReport | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // AI Explainer State
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
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
      link.download = report.fileName || `${report.testType.toLowerCase().replace(/[^a-z0-9]/g, '-')}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setAlert({ type: 'error', message: 'Download failed: ' + getErrorMessage(err) });
    }
  };

  const handleRequestAiExplanation = async (reportId: string) => {
    setIsAiLoading(true);
    setAiExplanation(null);
    setAiNotice(null);
    setIsAiModalOpen(true);

    try {
      const res = await api.post('/ai/explanations', { reportId });
      if (res.data?.success) {
        setAiExplanation(res.data.data.explanation);
        if (res.data.notice) {
          setAiNotice(res.data.notice);
        }
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
      setIsAiModalOpen(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Diagnostic Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access certified lab reports and generate plain-language AI explanations.
          </p>
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {isLoading ? (
        <Spinner size="lg" label="Retrieving diagnostic reports..." className="py-16" />
      ) : reports.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No diagnostic reports found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Once a diagnostic centre uploads your test results or pathology findings, they will appear securely here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <Card key={report._id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{report.testType}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(report.testDate).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={report.reviewStatus} />
                </div>

                <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Lab: {report.diagnosticCentre?.name || 'Diagnostic Centre'}</span>
                  </div>
                  {report.referringDoctor && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-slate-400" />
                      <span>Referred by: {report.referringDoctor.name}</span>
                    </div>
                  )}
                </div>

                {report.findings && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-1">Findings Summary:</span>
                    <p className="line-clamp-2 leading-relaxed">{report.findings}</p>
                  </div>
                )}

                {report.fileName && (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <Paperclip className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className="truncate font-medium">{report.fileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(report)}
                      className="text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedReport(report)}
                  >
                    View Details
                  </Button>
                  {(report.fileName || report.fileUrl) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                      icon={<FileText className="w-3.5 h-3.5" />}
                      onClick={() => handleViewPdf(report)}
                    >
                      View PDF
                    </Button>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => handleRequestAiExplanation(report._id)}
                >
                  AI Explainer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          title={`Report: ${selectedReport.testType}`}
          description={`Conducted on ${new Date(selectedReport.testDate).toLocaleDateString()}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-500">Diagnostic Centre</span>
                <p className="font-semibold text-slate-800">{selectedReport.diagnosticCentre?.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Review Status</span>
                <p className="mt-0.5"><StatusBadge status={selectedReport.reviewStatus} /></p>
              </div>
            </div>

            {selectedReport.findings && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">Clinical Findings</h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.findings}
                </div>
              </div>
            )}

            {selectedReport.notes && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">Laboratory Notes</h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                  {selectedReport.notes}
                </div>
              </div>
            )}

            {/* OCR Extracted Biomarkers Table */}
            {selectedReport.ocrParsedData?.parameters && selectedReport.ocrParsedData.parameters.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">
                    Automated OCR Extracted Biomarkers
                  </h4>
                  {selectedReport.ocrParsedData.abnormalCount ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {selectedReport.ocrParsedData.abnormalCount} Abnormal Values
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 text-xs">
                  {selectedReport.ocrParsedData.parameters.map((param: any, idx: number) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-semibold text-slate-800">{param.name}</span>
                        <span className="block text-[10px] text-slate-400">
                          Ref: {param.referenceRange || 'Standard Range'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${param.isAbnormal ? 'text-amber-600' : 'text-slate-800'}`}>
                          {param.value} {param.unit}
                        </span>
                        {param.isAbnormal && (
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-600">
                            Flagged
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.reviewNotes && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">Doctor Review Remarks</h4>
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs leading-relaxed">
                  {selectedReport.reviewNotes}
                </div>
              </div>
            )}

            {(selectedReport.fileName || selectedReport.fileUrl) && (
              <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-700 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{selectedReport.fileName || 'Certified Laboratory PDF'}</p>
                    <p className="text-[10px] text-slate-500">Official medical diagnostic attachment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const rep = selectedReport;
                      setSelectedReport(null);
                      handleViewPdf(rep);
                    }}
                  >
                    View PDF
                  </Button>
                  <Button
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

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => {
                  const id = selectedReport._id;
                  setSelectedReport(null);
                  handleRequestAiExplanation(id);
                }}
              >
                Explain with AI
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Explanation Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="MediLink AI Report Explainer"
        description="Plain-language educational summary of laboratory metrics"
        maxWidth="lg"
      >
        {isAiLoading ? (
          <div className="py-12">
            <Spinner size="lg" label="Analyzing medical terminology and generating insights..." />
          </div>
        ) : aiExplanation ? (
          <div className="space-y-5 animate-fade-in">
            {aiNotice && (
              <Alert type="info" message={aiNotice} />
            )}

            <div className="p-4 bg-cyan-50/60 border border-cyan-100 rounded-2xl">
              <div className="flex items-center gap-2 text-cyan-800 text-xs font-bold uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4 text-cyan-600" />
                Plain-Language Summary
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {aiExplanation.explanation}
              </p>
            </div>

            {aiExplanation.terminology && aiExplanation.terminology.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Key Medical Terms Demystified
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiExplanation.terminology.map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs font-bold text-slate-900">{t.term}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{t.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiExplanation.suggestedQuestions && aiExplanation.suggestedQuestions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Recommended Questions for Your Doctor
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {aiExplanation.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-600 mt-0.5 shrink-0" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Important Medical Disclaimer:</strong> MediLink AI Explanations are provided for patient educational awareness only. They do not constitute formal medical diagnosis or treatment plans. Always consult your healthcare professional.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setIsAiModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

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
          description={`Patient: ${viewingPdfReport.patient?.name || 'Authorized Patient'} • Conducted: ${new Date(viewingPdfReport.testDate).toLocaleDateString()}`}
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
