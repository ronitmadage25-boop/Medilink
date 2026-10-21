import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PhoneCall, Clock, CheckCircle2, PhoneForwarded, Info, ShieldCheck } from 'lucide-react';
import { CallSchedule } from '../../types';

export const CallSchedulePage: React.FC = () => {
  const [schedule, setSchedule] = useState<CallSchedule | null>(null);
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [frequency, setFrequency] = useState<'DAILY' | 'EVERY_OTHER_DAY' | 'WEEKLY' | 'NONE'>('DAILY');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [providerStatus, setProviderStatus] = useState<string>('Simulator / Demo Mode');

  useEffect(() => {
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
        setAlert({ type: 'success', message: 'Automated follow-up call schedule updated successfully!' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery Follow-up Calls</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure automated voice recovery check-in calls and scheduling preferences.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Provider Transparency Callout */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="block font-bold text-sky-800 text-sm mb-0.5">
            Telephony Service Status: {providerStatus}
          </strong>
          MediLink uses configurable automated voice dispatch (Twilio IVR). When live telephony credentials are not configured, calls run through the built-in development simulation engine without extra charges.
        </div>
      </div>

      <Card>
        <CardHeader
          title="Call Preferences"
          subtitle="Set your preferred time slot and notification frequency"
        />

        {isLoading ? (
          <Spinner size="md" label="Loading call configuration..." className="py-8" />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Call Frequency
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['DAILY', 'EVERY_OTHER_DAY', 'WEEKLY', 'NONE'] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      frequency === f
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-800 ring-2 ring-cyan-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f === 'DAILY'
                      ? 'Every Day'
                      : f === 'EVERY_OTHER_DAY'
                      ? 'Alternate Days'
                      : f === 'WEEKLY'
                      ? 'Once a Week'
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
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
                  Recipient Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Special Caregiver or Language Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please speak slowly in English or Hindi..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeSchedule"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <label htmlFor="activeSchedule" className="text-xs text-slate-700 font-medium">
                Enable automated follow-up call schedule
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              className="w-full py-2.5 text-xs font-bold"
              icon={<PhoneCall className="w-4 h-4" />}
            >
              Save Schedule Settings
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
