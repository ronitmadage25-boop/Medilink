import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Pill, Plus, Trash2, Calendar, User, FileText, CheckCircle } from 'lucide-react';
import { Prescription, User as UserModel, Medication } from '../../types';

export const DoctorPrescriptionsPage: React.FC = () => {
  const location = useLocation();
  const prefill = location.state as { patient?: UserModel; appointmentId?: string } | undefined;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(!!prefill?.patient);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState(prefill?.patient?._id || '');
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' },
  ]);
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/prescriptions');
      if (res.data?.success) setPrescriptions(res.data.data.prescriptions || []);
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      if (res.data?.success) setPatients(res.data.data.patients || []);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchPrescriptions(), fetchPatients()]);
      setIsLoading(false);
    };
    load();
  }, []);

  const addMedicationRow = () => {
    setMedications((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: 'Once daily', duration: '7 days', instructions: '' },
    ]);
  };

  const removeMedicationRow = (idx: number) => {
    if (medications.length <= 1) return;
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMedicationField = (idx: number, field: keyof Medication, val: string) => {
    setMedications((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !diagnosis) {
      setAlert({ type: 'error', message: 'Please select a patient and enter a diagnosis.' });
      return;
    }

    const invalidMed = medications.some((m) => !m.name.trim() || !m.dosage.trim());
    if (invalidMed) {
      setAlert({ type: 'error', message: 'All medication rows must have a medicine name and dosage.' });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      await api.post('/prescriptions', {
        patientId: selectedPatientId,
        appointmentId: prefill?.appointmentId,
        diagnosis,
        medications,
        advice,
        followUpDate: followUpDate || undefined,
      });

      setAlert({ type: 'success', message: 'Prescription issued and delivered to patient portal!' });
      setIsModalOpen(false);
      // Reset form
      setDiagnosis('');
      setAdvice('');
      setFollowUpDate('');
      setMedications([{ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }]);
      fetchPrescriptions();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prescriptions Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, issue, and archive digital medication regimens for patients.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Issue Prescription
        </Button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {isLoading ? (
        <Spinner size="lg" label="Loading prescriptions..." className="py-16" />
      ) : prescriptions.length === 0 ? (
        <Card className="text-center py-12">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No prescriptions issued yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Start issuing digital prescriptions to attach to patient medical files.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setIsModalOpen(true)}
          >
            Create First Prescription
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => (
            <Card key={rx._id} hoverable>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{rx.diagnosis}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5" /> Patient: {rx.patient?.name}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(rx.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Prescribed Drugs ({rx.medications.length})
                </span>
                {rx.medications.map((m, idx) => (
                  <div key={idx} className="text-xs flex justify-between">
                    <span className="font-semibold text-slate-800">{m.name} ({m.dosage})</span>
                    <span className="text-slate-500 text-[11px]">{m.frequency} • {m.duration}</span>
                  </div>
                ))}
              </div>

              {rx.advice && (
                <p className="text-xs text-slate-600 mt-3 italic">
                  <span className="font-semibold text-slate-700 not-italic">Advice:</span> {rx.advice}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Issue Prescription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue Digital Prescription"
        description="Prescribe medication regimen, dosage, and dietary advice."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Patient *
            </label>
            <select
              required
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose patient --</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Diagnosis / Clinical Indication *
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Pharyngitis, Hypertension Stage 1"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Medications Regimen *
              </label>
              <button
                type="button"
                onClick={addMedicationRow}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {medications.map((med, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Medication #{idx + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicationRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Medicine name (e.g. Amoxicillin)"
                      value={med.name}
                      onChange={(e) => updateMedicationField(idx, 'name', e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedicationField(idx, 'dosage', e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Frequency (e.g. Twice daily)"
                      value={med.frequency}
                      onChange={(e) => updateMedicationField(idx, 'frequency', e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 days)"
                      value={med.duration}
                      onChange={(e) => updateMedicationField(idx, 'duration', e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Advice / Lifestyle Guidance
              </label>
              <textarea
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Hydrate well, avoid strenuous exertion..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Issue & Deliver
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
