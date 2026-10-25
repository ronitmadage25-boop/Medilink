import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { ShieldCheck, Stethoscope, Building2, CheckCircle2, Award, MapPin } from 'lucide-react';
import { DoctorProfile, DiagnosticCentreProfile } from '../../types';

export const VerificationsPage: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [pendingCentres, setPendingCentres] = useState<DiagnosticCentreProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPending = async () => {
    try {
      const res = await api.get('/admin/verifications/pending');
      if (res.data?.success) {
        setPendingDoctors(res.data.data.doctors || []);
        setPendingCentres(res.data.data.diagnosticCentres || []);
      }
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerifyDoctor = async (doctorId: string) => {
    try {
      await api.patch(`/admin/doctors/${doctorId}/verify`);
      setAlert({ type: 'success', message: 'Doctor credentials verified and license certified!' });
      fetchPending();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    }
  };

  const handleVerifyCentre = async (centreId: string) => {
    try {
      await api.patch(`/admin/diagnostic-centres/${centreId}/verify`);
      setAlert({ type: 'success', message: 'Diagnostic centre facility verified!' });
      fetchPending();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provider Verifications</h1>
        <p className="text-xs text-slate-500 mt-1">
          Validate medical council license numbers and diagnostic facility credentials.
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
        <Spinner size="lg" label="Checking verification queues..." className="py-16" />
      ) : (
        <div className="space-y-8">
          {/* Pending Doctors Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              Physicians Awaiting License Verification ({pendingDoctors.length})
            </h2>

            {pendingDoctors.length === 0 ? (
              <Card className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">All registered doctors have been verified.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingDoctors.map((doc) => {
                  const docUser = typeof doc.user === 'object' ? doc.user : null;
                  return (
                    <Card key={doc._id} hoverable className="flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{docUser?.name || 'Physician'}</h3>
                            <p className="text-xs text-slate-500">{docUser?.email}</p>
                          </div>
                          <StatusBadge status={doc.isVerified ? 'VERIFIED' : 'PENDING'} />
                        </div>

                        <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-slate-400" />
                            <span>Registration: <strong>{doc.registrationNumber || 'Not provided'}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-slate-400" />
                            <span>Speciality: {doc.specialization || 'General'}</span>
                          </div>
                          {doc.qualifications && doc.qualifications.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                              Degrees: {doc.qualifications.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          onClick={() => handleVerifyDoctor(docUser?._id || doc._id)}
                        >
                          Approve & Verify License
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Diagnostic Centres Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Diagnostic Centres Awaiting Verification ({pendingCentres.length})
            </h2>

            {pendingCentres.length === 0 ? (
              <Card className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">All registered diagnostic laboratories are verified.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingCentres.map((centre) => {
                  const centreUser = typeof centre.user === 'object' ? centre.user : null;
                  return (
                    <Card key={centre._id} hoverable className="flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{centre.centreName || centreUser?.name}</h3>
                            <p className="text-xs text-slate-500">{centreUser?.email}</p>
                          </div>
                          <StatusBadge status={centre.isVerified ? 'VERIFIED' : 'PENDING'} />
                        </div>

                        <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-slate-400" />
                            <span>Facility Reg: <strong>{centre.registrationNumber || 'Not provided'}</strong></span>
                          </div>
                          {centre.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="truncate">{centre.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <Button
                          variant="success"
                          size="sm"
                          icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          onClick={() => handleVerifyCentre(centreUser?._id || centre._id)}
                        >
                          Approve Diagnostic Facility
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
