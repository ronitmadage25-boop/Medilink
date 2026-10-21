import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  ShieldAlert,
  PhoneCall,
} from 'lucide-react';
import { SymptomCheckIn } from '../../types';

const COMMON_SYMPTOMS = [
  'Fever / Chills',
  'Cough or Sore Throat',
  'Shortness of Breath',
  'Chest Pain or Pressure',
  'Persistent Headache',
  'Dizziness / Lightheadedness',
  'Nausea or Vomiting',
  'Fatigue / Body Weakness',
  'Abdominal Discomfort',
  'Joint or Muscle Pain',
];

export const SymptomCheckInPage: React.FC = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>('MILD');
  const [notes, setNotes] = useState('');
  const [pastCheckIns, setPastCheckIns] = useState<SymptomCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/check-ins');
      if (res.data?.success) setPastCheckIns(res.data.data.checkIns || []);
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const isCritical =
    selectedSymptoms.some((s) =>
      s.includes('Chest Pain') || s.includes('Shortness of Breath')
    ) || severity === 'SEVERE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one symptom to log.' });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      await api.post('/check-ins', {
        symptoms: selectedSymptoms,
        severity,
        notes,
      });

      setAlert({
        type: 'success',
        message: isCritical
          ? 'Check-in recorded. Due to high severity indicators, a high-priority alert was flagged for your clinical team.'
          : 'Symptom check-in logged successfully.',
      });

      setSelectedSymptoms([]);
      setSeverity('MILD');
      setNotes('');
      fetchHistory();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Symptom Check-in</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track recovery progress and log daily symptoms for doctor review.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Emergency Guidance Warning Banner */}
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="block font-bold text-rose-800 text-sm mb-0.5">
            Emergency Health Notice
          </strong>
          If you are experiencing severe chest pain, extreme difficulty breathing, sudden numbness, or life-threatening symptoms, do not wait for an app response — immediately call emergency services (112 or local emergency hotline) or visit the nearest emergency room.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-In Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Log Symptoms Today"
              subtitle="Select all symptoms experienced in the past 24 hours"
            />
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Symptoms
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMON_SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        type="button"
                        key={sym}
                        onClick={() => toggleSymptom(sym)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{sym}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Overall Severity Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['MILD', 'MODERATE', 'SEVERE'] as const).map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        severity === lvl
                          ? lvl === 'SEVERE'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-400'
                            : lvl === 'MODERATE'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-400'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Additional Notes for Doctor
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Fever started yesterday afternoon, responded to hydration..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              {isCritical && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>High Severity Flag:</strong> Submitting this check-in will automatically flag an alert to your consulting doctor's notification queue.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                variant={isCritical ? 'danger' : 'primary'}
                isLoading={isSubmitting}
                className="w-full py-2.5 text-xs font-bold"
                icon={<Send className="w-4 h-4" />}
              >
                Submit Daily Check-in
              </Button>
            </form>
          </Card>
        </div>

        {/* History Log */}
        <div>
          <Card>
            <CardHeader
              title="Recent Check-Ins"
              subtitle="Past submissions"
            />
            {isLoading ? (
              <Spinner size="sm" label="Loading check-in history..." />
            ) : pastCheckIns.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No past symptom check-ins yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {pastCheckIns.map((ci) => (
                  <div
                    key={ci._id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ci.createdAt).toLocaleDateString()}
                      </span>
                      <Badge
                        variant={
                          ci.severity === 'SEVERE'
                            ? 'danger'
                            : ci.severity === 'MODERATE'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {ci.severity}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {ci.symptoms.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {ci.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-1">"{ci.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
