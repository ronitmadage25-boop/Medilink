import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  PhoneForwarded,
  Info,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Calendar,
} from 'lucide-react';
import { CallSchedule } from '../../types';

interface VoiceCallLogEntry {
  callSid: string;
  timestamp: string;
  patientPhone: string;
  transcript: string;
  nlpExtractedSymptoms: string[];
  medicationCompliance: boolean;
  status: string;
}

export const CallSchedulePage: React.FC = () => {
  const [schedule, setSchedule] = useState<CallSchedule | null>(null);
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [frequency, setFrequency] = useState<'DAILY' | 'EVERY_OTHER_DAY' | 'WEEKLY' | 'NONE'>('DAILY');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [callLogs, setCallLogs] = useState<VoiceCallLogEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringCall, setIsTriggeringCall] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [providerStatus, setProviderStatus] = useState<string>('Active (Twilio Voice IVR & Speech NLP)');

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/call-schedules');
      if (res.data?.success && res.data.data?.schedule) {
        const s = res.data.data.schedule;
        setSchedule(s);
        setPreferredTime(s.preferredTime || '10:00 AM');
        setFrequency(s.frequency || 'DAILY');
        setPhone(s.phone || '');
        setNotes(s.notes || '');
        setIsActive(s.isActive ?? true);
        if (Array.isArray(s.callLogs)) {
          setCallLogs(s.callLogs);
        }
      }
      if (res.data?.data?.providerStatus) {
        setProviderStatus(res.data.data.providerStatus);
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setAlert(null);

    try {
      const res = await api.post('/call-schedules', {
        preferredTime,
        frequency,
        phone,
        notes,
        isActive,
      });

      if (res.data?.success) {
        setAlert({ type: 'success', message: 'Automated recovery call schedule updated successfully!' });
        fetchSchedule();
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerLiveCall = async () => {
    setIsTriggeringCall(true);
    setAlert(null);

    try {
      const res = await api.post('/call-schedules/trigger');
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message:
            res.data.data?.message ||
            'Automated AI voice check-in successfully initiated. Dialing your registered telephone number.',
        });
        await fetchSchedule();
      } else {
        setAlert({
          type: 'error',
          message: res.data?.message || 'Failed to dispatch voice call.',
        });
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsTriggeringCall(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Automated Voice Recovery Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Twilio IVR voice dialing with Speech-to-Text NLP symptom analysis and doctor escalation.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          isLoading={isTriggeringCall}
          onClick={handleTriggerLiveCall}
          icon={<PhoneForwarded className="w-4 h-4" />}
          className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 text-xs font-semibold"
        >
          Trigger AI Voice Call Now
        </Button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Corporate Telephony Status Card */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Voice Pipeline Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
                Online
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 mt-0.5">
              Twilio Telephony + Polly NLP Speech Recognition
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Patients receive scheduled voice inquiries. Responses are transcribed and parsed for recovery compliance and adverse symptoms.
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right sm:border-l sm:border-slate-800 sm:pl-4">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
            Telephony Provider
          </span>
          <span className="text-xs font-bold text-slate-200 block">{providerStatus}</span>
        </div>
      </div>

      {/* Preferences Form */}
      <Card>
        <CardHeader
          title="Voice Check-in Preferences"
          subtitle="Configure preferred calling window, target telephone, and frequency"
        />

        {isLoading ? (
          <Spinner size="md" label="Loading call configuration..." className="py-8" />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Calling Frequency
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['DAILY', 'EVERY_OTHER_DAY', 'WEEKLY', 'NONE'] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      frequency === f
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f === 'DAILY'
                      ? 'Daily Follow-up'
                      : f === 'EVERY_OTHER_DAY'
                      ? 'Alternate Days'
                      : f === 'WEEKLY'
                      ? 'Weekly Check-in'
                      : 'Disabled'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Call Time *
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="09:00 AM">09:00 AM (Morning)</option>
                  <option value="11:00 AM">11:00 AM (Late Morning)</option>
                  <option value="02:00 PM">02:00 PM (Afternoon)</option>
                  <option value="05:00 PM">05:00 PM (Late Afternoon)</option>
                  <option value="07:00 PM">07:00 PM (Evening)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient Telephone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Special Patient / Caregiver Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please speak slowly in English or Hindi. Hearing impaired patient."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeSchedule"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="activeSchedule" className="text-xs text-slate-700 font-medium">
                Active: Enable automated voice recovery calls for this profile
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                className="px-6 text-xs font-bold bg-slate-900 hover:bg-slate-800"
                icon={<PhoneCall className="w-4 h-4" />}
              >
                Save Preferences
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Voice Call & Speech NLP History */}
      <Card>
        <CardHeader
          title="Telephony & NLP Call Logs"
          subtitle="Physical dispatch records, audio transcripts, and clinical biomarker extraction"
        />

        {callLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No completed voice calls logged yet. Click &quot;Trigger AI Voice Call Now&quot; to perform an immediate check-in.
          </div>
        ) : (
          <div className="space-y-3">
            {callLogs.map((log, idx) => (
              <div
                key={log.callSid || idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">
                      Dispatched to {log.patientPhone}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      SID: {log.callSid}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {log.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    Speech Transcript:
                  </span>
                  <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200">
                    &ldquo;{log.transcript}&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        log.medicationCompliance ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    />
                    <span className="font-semibold text-slate-700">
                      Medication Adherence: {log.medicationCompliance ? 'Confirmed' : 'Missed'}
                    </span>
                  </div>

                  {log.nlpExtractedSymptoms && log.nlpExtractedSymptoms.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500">
                        Extracted Symptoms:
                      </span>
                      {log.nlpExtractedSymptoms.map((symp, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold"
                        >
                          {symp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
