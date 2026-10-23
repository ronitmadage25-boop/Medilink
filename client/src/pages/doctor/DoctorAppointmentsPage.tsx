import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Pill,
  Video,
  Phone,
  MapPin,
  Check,
} from 'lucide-react';
import { Appointment } from '../../types';
import { MOCK_APPOINTMENTS } from '../../data/mockClinicalData';

export const DoctorAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const navigate = useNavigate();

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      if (res.data?.success && Array.isArray(res.data.data.appointments) && res.data.data.appointments.length > 0) {
        setAppointments(res.data.data.appointments);
      } else {
        setAppointments(MOCK_APPOINTMENTS);
      }
    } catch {
      setAppointments(MOCK_APPOINTMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setAlert({ type: 'success', message: `Appointment marked as ${status.toLowerCase()}.` });
      fetchAppointments();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Consultations</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review appointment requests, confirm slots, and record consultation outcomes.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner size="lg" label="Loading consultation list..." className="py-16" />
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No appointments found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No consultations currently match status "{filter}".
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((appt) => (
            <Card key={appt._id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{appt.patient?.name}</h4>
                      <p className="text-xs text-slate-500">{appt.patient?.email} • {appt.patient?.mobile || 'No phone'}</p>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{new Date(appt.appointmentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{appt.startTime} – {appt.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.type === 'VIDEO' ? (
                      <Video className="w-4 h-4 text-cyan-500" />
                    ) : appt.type === 'AUDIO' ? (
                      <Phone className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="capitalize">{appt.type.toLowerCase().replace('_', ' ')} consultation</span>
                  </div>
                </div>

                {appt.reason && (
                  <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded-lg">
                    <span className="font-semibold text-slate-700">Patient Notes:</span> "{appt.reason}"
                  </p>
                )}
              </div>

              {/* Actions Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                    icon={<Video className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/consultation/${(appt as any).roomCode || appt._id}`)}
                  >
                    Start Video Consultation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    icon={<Pill className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/doctor/prescriptions', { state: { patient: appt.patient, appointmentId: appt._id } })}
                  >
                    Write Prescription
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {appt.status === 'PENDING' && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs"
                      icon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => handleUpdateStatus(appt._id, 'CONFIRMED')}
                    >
                      Confirm
                    </Button>
                  )}

                  {appt.status === 'CONFIRMED' && (
                    <Button
                      variant="success"
                      size="sm"
                      className="text-xs"
                      icon={<CheckCircle className="w-3.5 h-3.5" />}
                      onClick={() => handleUpdateStatus(appt._id, 'COMPLETED')}
                    >
                      Mark Complete
                    </Button>
                  )}

                  {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleUpdateStatus(appt._id, 'CANCELLED')}
                    >
                      Decline
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
