import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import {
  Calendar,
  Clock,
  Plus,
  User,
  Video,
  MapPin,
  CalendarX,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { Appointment, User as UserModel } from '../../types';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Array<UserModel & { profile?: { speciality?: string; consultationFee?: number } }>>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [type, setType] = useState<'IN_PERSON' | 'VIDEO' | 'AUDIO'>('IN_PERSON');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      if (res.data?.success) setAppointments(res.data.data.appointments || []);
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      if (res.data?.success) setDoctors(res.data.data.doctors || []);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAppointments(), fetchDoctors()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !appointmentDate || !startTime) {
      setAlert({ type: 'error', message: 'Please fill in all required appointment fields.' });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      // Calculate endTime (default 30 min duration)
      const [hours, minutes] = startTime.split(':').map(Number);
      const endMins = (minutes + 30) % 60;
      const endHours = hours + Math.floor((minutes + 30) / 60);
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      await api.post('/appointments', {
        doctorId: selectedDoctorId,
        appointmentDate,
        startTime,
        endTime,
        type,
        reason,
      });

      setAlert({ type: 'success', message: 'Appointment booked successfully!' });
      setIsBookModalOpen(false);
      // Reset form
      setReason('');
      fetchAppointments();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.patch(`/appointments/${id}/status`, {
        status: 'CANCELLED',
        cancellationReason: 'Cancelled by patient',
      });
      setAlert({ type: 'success', message: 'Appointment cancelled.' });
      fetchAppointments();
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule and manage consultations with certified medical specialists.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsBookModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Book Consultation
        </Button>
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
        {['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' ? 'All Appointments' : st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <Spinner size="lg" label="Loading appointments..." className="py-16" />
      ) : filteredAppointments.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No appointments found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {filter === 'ALL'
              ? 'You have not booked any consultations yet.'
              : `No appointments with status "${filter}".`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setIsBookModalOpen(true)}
          >
            Book Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((appt) => (
            <Card key={appt._id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{appt.doctor?.name}</h4>
                      <p className="text-xs text-slate-500">{appt.doctor?.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{new Date(appt.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
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
                    <span className="font-medium capitalize">{appt.type.toLowerCase().replace('_', ' ')} consultation</span>
                  </div>
                </div>

                {appt.reason && (
                  <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded-lg">
                    <span className="font-semibold text-slate-700">Reason:</span> {appt.reason}
                  </p>
                )}
              </div>

              {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                    onClick={() => handleCancel(appt._id)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Book New Consultation"
        description="Select a verified doctor and choose an available consultation slot."
      >
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Doctor *
            </label>
            <select
              required
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose a physician --</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name} {doc.profile?.speciality ? `(${doc.profile.speciality})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time *
              </label>
              <select
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Consultation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['IN_PERSON', 'VIDEO', 'AUDIO'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setType(m)}
                  className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                    type === m
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m === 'IN_PERSON' ? 'In-Person' : m === 'VIDEO' ? 'Video' : 'Phone'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Visit / Symptoms
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief description of symptoms or consultation goal..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBookModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
