import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Pill, Calendar, User, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Prescription } from '../../types';

export const PrescriptionsPage: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/prescriptions');
      if (res.data?.success) setPrescriptions(res.data.data.prescriptions || []);
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prescriptions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your doctor-issued digital prescriptions, dosages, and administration instructions.
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
        <Spinner size="lg" label="Loading prescriptions..." className="py-16" />
      ) : prescriptions.length === 0 ? (
        <Card className="text-center py-12">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No prescriptions on record</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When your consulting physician issues a prescription, it will appear here with complete dosage instructions.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => (
            <Card key={rx._id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{rx.diagnosis || 'Clinical Prescription'}</h3>
                      <p className="text-xs text-slate-500">By {rx.doctor?.name}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(rx.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Prescribed Medications ({rx.medications.length})
                  </p>
                  <div className="space-y-1.5">
                    {rx.medications.map((med, idx) => (
                      <div key={idx} className="text-xs flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{med.name}</span>
                        <span className="text-slate-500 text-[11px]">{med.dosage} • {med.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {rx.advice && (
                  <p className="text-xs text-slate-600 mt-3 italic">
                    <span className="font-semibold text-slate-700 not-italic">Doctor's Advice:</span> {rx.advice}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedRx(rx)}
                >
                  View Full Prescription
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Prescription Detail Modal */}
      {selectedRx && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRx(null)}
          title="Digital Prescription"
          description={`Prescribed by ${selectedRx.doctor?.name} on ${new Date(selectedRx.createdAt).toLocaleDateString()}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between">
              <div>
                <span className="text-slate-500">Clinical Diagnosis</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedRx.diagnosis}</p>
              </div>
              {selectedRx.followUpDate && (
                <div className="text-right">
                  <span className="text-slate-500">Follow-up Date</span>
                  <p className="font-semibold text-cyan-700 mt-0.5">{new Date(selectedRx.followUpDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Medication Regimen
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedRx.medications.map((med, idx) => (
                  <div key={idx} className="p-3 bg-white text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{med.name}</span>
                      <span className="text-cyan-700 font-semibold">{med.dosage}</span>
                    </div>
                    <div className="text-slate-600 flex gap-4 text-[11px]">
                      <span><strong>Frequency:</strong> {med.frequency}</span>
                      <span><strong>Duration:</strong> {med.duration}</span>
                    </div>
                    {med.instructions && (
                      <p className="text-[11px] text-slate-500 italic">Note: {med.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedRx.advice && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  General Dietary & Lifestyle Advice
                </h4>
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs leading-relaxed">
                  {selectedRx.advice}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedRx(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
