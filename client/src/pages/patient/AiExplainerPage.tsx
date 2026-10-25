import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Sparkles, BookOpen, HelpCircle, FileText, Info, Calendar } from 'lucide-react';
import { DiagnosticReport, AIExplanation } from '../../types';

export const AiExplainerPage: React.FC = () => {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [pastExplanations, setPastExplanations] = useState<AIExplanation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [repRes, histRes] = await Promise.all([
          api.get('/reports'),
          api.get('/ai/explanations'),
        ]);
        if (repRes.data?.success) setReports(repRes.data.data.reports || []);
        if (histRes.data?.success) setPastExplanations(histRes.data.data.explanations || []);
      } catch (err) {
        setAlert({ type: 'error', message: getErrorMessage(err) });
      } finally {
        setIsHistoryLoading(false);
      }
    };
    init();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;

    setIsLoading(true);
    setAlert(null);
    setNotice(null);

    try {
      const res = await api.post('/ai/explanations', { reportId: selectedReportId });
      if (res.data?.success) {
        setExplanation(res.data.data.explanation);
        if (res.data.notice) setNotice(res.data.notice);
        // Refresh history
        const histRes = await api.get('/ai/explanations');
        if (histRes.data?.success) setPastExplanations(histRes.data.data.explanations || []);
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-600" />
          AI Health Explainer
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Translates diagnostic lab jargon into plain English with key term definitions and doctor discussion prompts.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {notice && (
        <Alert
          type="info"
          message={notice}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Generator Section */}
      <Card className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-xl">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-white mb-2">Generate Report Insights</h2>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            Select one of your existing diagnostic test reports to generate an instant educational breakdown.
          </p>

          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">-- Choose a Diagnostic Report --</option>
              {reports.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.testType} ({new Date(r.testDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={!selectedReportId}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Explain Report
            </Button>
          </form>
        </div>
      </Card>

      {/* Active Explanation Result */}
      {explanation && (
        <Card className="border-cyan-200 bg-cyan-50/20">
          <CardHeader
            title="Analysis Result"
            subtitle="Plain-language educational summary"
          />
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {explanation.explanation}
            </div>

            {explanation.terminology && explanation.terminology.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Key Medical Terminology
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {explanation.terminology.map((t, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-900">{t.term}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{t.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {explanation.suggestedQuestions && explanation.suggestedQuestions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Doctor Discussion Prompts
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {explanation.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-600 mt-0.5 shrink-0" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Past Explanations History */}
      <Card>
        <CardHeader
          title="Past AI Explanations"
          subtitle="Saved educational summaries"
        />
        {isHistoryLoading ? (
          <Spinner size="sm" label="Loading past explanations..." />
        ) : pastExplanations.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            No past report explanations generated yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pastExplanations.map((exp) => (
              <div
                key={exp._id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors cursor-pointer"
                onClick={() => setExplanation(exp)}
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-cyan-600" />
                    {typeof exp.report === 'object' && exp.report?.testType
                      ? exp.report.testType
                      : 'Diagnostic Report'}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {exp.explanation}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(exp.createdAt).toLocaleDateString()}
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs text-cyan-600">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
