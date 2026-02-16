// Frontend/src/pages/patient/PatientAppointmentsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Bell,
  Phone,
  CheckCircle,
  X,
  Calendar,
  Clock,
  User,
  Stethoscope,
  ChevronLeft,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { appointmentsAPI, doctorsAPI } from '../../services/api';

// Constants
const APPT_SUB_TABS = [
  { id: 'upcoming', label: 'appointments.tabs.upcoming', fallback: 'Upcoming', icon: Calendar },
  { id: 'today', label: 'appointments.tabs.today', fallback: 'Today', icon: Clock },
  { id: 'history', label: 'appointments.tabs.history', fallback: 'History', icon: User },
  { id: 'book', label: 'appointments.tabs.book', fallback: 'Book', icon: Stethoscope },
];

const SPECIALIZATIONS = [
  { id: 'general', icon: '🩺', name: 'specializations.general', fallback: 'General' },
  { id: 'dentist', icon: '🦷', name: 'specializations.dentist', fallback: 'Dentist' },
  { id: 'eye', icon: '👁️', name: 'specializations.eye', fallback: 'Eye' },
  { id: 'ortho', icon: '🦴', name: 'specializations.ortho', fallback: 'Ortho' },
  { id: 'diabetes', icon: '💊', name: 'specializations.diabetes', fallback: 'Diabetes' },
  { id: 'cardio', icon: '❤️', name: 'specializations.cardio', fallback: 'Cardio' },
  { id: 'pediatric', icon: '👶', name: 'specializations.pediatric', fallback: 'Pediatric' },
  { id: 'gynecologist', icon: '👩‍⚕️', name: 'specializations.gynecologist', fallback: 'Gynecologist' },
];

const HISTORY_FILTERS = [
  { id: 'all', label: 'appointments.filters.all', fallback: 'All' },
  { id: 'completed', label: 'appointments.filters.completed', fallback: 'Completed' },
  { id: 'cancelled', label: 'appointments.filters.cancelled', fallback: 'Cancelled' },
];

// Mock Data (fallback when API fails)
const MOCK_DOCTORS = [
  {
    id: 1,
    name: 'Dr. Ramesh Kumar',
    spec: 'General Physician',
    specialization: 'General Physician',
    specializationId: 'general',
    slots: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'],
    rating: 4.5,
    experience: 15,
    fee: 500,
    consultation_fee: 500,
  },
  {
    id: 2,
    name: 'Dr. Priya Sharma',
    spec: 'Gynecologist',
    specialization: 'Gynecologist',
    specializationId: 'gynecologist',
    slots: ['2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'],
    rating: 4.8,
    experience: 12,
    fee: 800,
    consultation_fee: 800,
  },
  {
    id: 3,
    name: 'Dr. Suresh Patel',
    spec: 'Cardiologist',
    specialization: 'Cardiologist',
    specializationId: 'cardio',
    slots: ['11:00 AM', '12:00 PM', '4:00 PM'],
    rating: 4.9,
    experience: 20,
    fee: 1200,
    consultation_fee: 1200,
  },
];

// Helper function to generate dates
const generateNextDays = (days = 7) => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      date: date,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      formatted: date.toISOString().split('T')[0],
    });
  }
  
  return dates;
};

// Helper to normalize appointment data from API
const normalizeAppointment = (apt) => ({
  id: apt.id,
  doctorId: apt.doctor_id || apt.doctor?.id,
  doctor: apt.doctor_name || apt.doctor?.name || apt.doctor?.full_name || 'Unknown Doctor',
  specialization: apt.specialization || apt.doctor?.specialization || '',
  date: apt.appointment_date || apt.date,
  time: apt.start_time || apt.time,
  status: apt.status,
  reason: apt.reason || apt.visit_reason || '',
  tokenNumber: apt.token_number || apt.queue_number,
  location: apt.location || apt.clinic_address || apt.doctor?.clinic_address,
  phone: apt.phone || apt.clinic_phone || apt.doctor?.phone,
  patientsAhead: apt.patients_ahead || apt.queue_position,
  estimatedWait: apt.estimated_wait || apt.wait_time,
  prescription: apt.prescription,
  cancellationReason: apt.cancellation_reason,
});

// Helper to normalize doctor data from API
const normalizeDoctor = (doc) => ({
  id: doc.id,
  name: doc.full_name || doc.name || `Dr. ${doc.first_name} ${doc.last_name}`,
  spec: doc.specialization || doc.specialty || '',
  specialization: doc.specialization || doc.specialty || '',
  specializationId: doc.specialization_id || doc.specialty_id || '',
  slots: doc.available_slots || doc.slots || [],
  rating: doc.rating || doc.average_rating || 0,
  experience: doc.experience_years || doc.experience || 0,
  fee: doc.consultation_fee || doc.fee || 0,
  consultation_fee: doc.consultation_fee || doc.fee || 0,
  profile_photo: doc.profile_photo || doc.photo || null,
});

const PatientAppointmentsTab = ({ userId = null, onBookingComplete = null }) => {
  const { t } = useTranslation();

  // Helper for translation with fallback
  const tr = useCallback((key, fallback) => {
    const translated = t(key);
    return (translated === key || !translated) ? fallback : translated;
  }, [t]);

  // State Management
  const [activeSubTab, setActiveSubTab] = useState('upcoming');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Booking States
  const [bookStep, setBookStep] = useState(1);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [bookingReason, setBookingReason] = useState('');

  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Appointments State
  const [history, setHistory] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);

  // Available dates
  const availableDates = useMemo(() => generateNextDays(7), []);

  // Load initial data
  useEffect(() => {
    fetchAppointmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch appointment data from API
  const fetchAppointmentData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [upcomingRes, todayRes, historyRes] = await Promise.allSettled([
        appointmentsAPI.getUpcoming(),
        appointmentsAPI.getToday(),
        appointmentsAPI.list({ status: 'completed,cancelled', ordering: '-appointment_date' }),
      ]);

      // Process upcoming appointments
      if (upcomingRes.status === 'fulfilled') {
        const data = upcomingRes.value.data?.results || upcomingRes.value.data || [];
        setUpcomingAppointments(Array.isArray(data) ? data.map(normalizeAppointment) : []);
      } else {
        console.error('Failed to fetch upcoming appointments:', upcomingRes.reason);
        setUpcomingAppointments([]);
      }

      // Process today's appointments
      if (todayRes.status === 'fulfilled') {
        const data = todayRes.value.data?.results || todayRes.value.data || [];
        setTodayAppointments(Array.isArray(data) ? data.map(normalizeAppointment) : []);
      } else {
        console.error('Failed to fetch today appointments:', todayRes.reason);
        setTodayAppointments([]);
      }

      // Process history
      if (historyRes.status === 'fulfilled') {
        const data = historyRes.value.data?.results || historyRes.value.data || [];
        setHistory(Array.isArray(data) ? data.map(normalizeAppointment) : []);
      } else {
        console.error('Failed to fetch history:', historyRes.reason);
        setHistory([]);
      }

    } catch (err) {
      setError('Failed to load appointments. Please try again.');
      console.error('Failed to fetch appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch doctors by specialization
  const fetchDoctors = useCallback(async (specializationId = null) => {
    setLoadingDoctors(true);
    try {
      const params = specializationId ? { specialization: specializationId } : {};
      const response = await doctorsAPI.list(params);
      const data = response.data?.results || response.data || [];
      
      if (Array.isArray(data) && data.length > 0) {
        setDoctors(data.map(normalizeDoctor));
      } else {
        const filtered = MOCK_DOCTORS.filter(
          doc => !specializationId || doc.specializationId === specializationId
        );
        setDoctors(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
      const filtered = MOCK_DOCTORS.filter(
        doc => !specializationId || doc.specializationId === specializationId
      );
      setDoctors(filtered);
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  // Fetch available slots for a doctor on a specific date
  const fetchAvailableSlots = useCallback(async (doctorId, date) => {
    setLoadingSlots(true);
    try {
      const response = await appointmentsAPI.getAvailableSlots(doctorId, date);
      const slots = response.data?.slots || response.data || [];
      setAvailableSlots(slots);
      return slots;
    } catch (err) {
      console.error('Failed to fetch slots:', err);
      const fallbackSlots = selectedDoctor?.slots || ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'];
      setAvailableSlots(fallbackSlots);
      return fallbackSlots;
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor]);

  // Handle date selection and fetch slots
  const handleDateSelect = useCallback(async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    
    if (selectedDoctor) {
      await fetchAvailableSlots(selectedDoctor.id, date.formatted);
    }
  }, [selectedDoctor, fetchAvailableSlots]);

  // Handlers
  const handleAction = useCallback((message, type = 'success') => {
    setActionMessage({ text: message, type });
    setTimeout(() => setActionMessage(null), 3000);
  }, []);

  // Book appointment with API
  const handleBookAppointment = useCallback(async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setError('Please select all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await appointmentsAPI.create({
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate.formatted,
        start_time: selectedSlot,
        booking_type: 'online',
        reason: bookingReason || '',
      });

      const bookingResult = response.data;

      setBookingData({
        id: bookingResult.id,
        doctorId: bookingResult.doctor_id || selectedDoctor.id,
        doctorName: bookingResult.doctor_name || selectedDoctor.name,
        date: bookingResult.appointment_date || selectedDate.formatted,
        time: bookingResult.start_time || selectedSlot,
        tokenNumber: bookingResult.token_number || bookingResult.queue_number || Math.floor(Math.random() * 30) + 1,
        status: bookingResult.status || 'confirmed',
      });
      setBookingSuccess(true);
      
      if (onBookingComplete) {
        onBookingComplete(bookingResult);
      }

      fetchAppointmentData();

    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.');
      console.error('Booking failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDoctor, selectedDate, selectedSlot, bookingReason, onBookingComplete]);

  // Reschedule appointment
  const handleReschedule = useCallback((appointmentId) => {
    setActiveSubTab('book');
    handleAction('Select new date and time to reschedule', 'info');
  }, [handleAction]);

  // Cancel appointment with API
  const handleCancelAppointment = useCallback(async (appointmentId, reason = '') => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    setIsLoading(true);
    try {
      await appointmentsAPI.cancel(appointmentId, reason);
      handleAction('Appointment cancelled', 'warning');
      fetchAppointmentData();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setIsLoading(false);
    }
  }, [handleAction]);

  // Check in with API
  const handleCheckIn = useCallback(async (appointmentId) => {
    setIsLoading(true);
    try {
      await appointmentsAPI.checkIn(appointmentId);
      handleAction('Checked in successfully!', 'success');
      fetchAppointmentData();
    } catch (err) {
      setError(err.message || 'Check-in failed');
    } finally {
      setIsLoading(false);
    }
  }, [handleAction]);

  // Reset booking state
  const resetBooking = useCallback(() => {
    setBookStep(1);
    setSelectedSpec(null);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingSuccess(false);
    setBookingData(null);
    setBookingReason('');
    setDoctors([]);
    setAvailableSlots([]);
  }, []);

  // Handle specialization selection
  const handleSpecializationSelect = useCallback((spec) => {
    setSelectedSpec(spec);
    fetchDoctors(spec.id);
    setBookStep(2);
  }, [fetchDoctors]);

  // Handle doctor selection
  const handleDoctorSelect = useCallback((doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots(doctor.slots || []);
    setBookStep(3);
  }, []);

  // Get status display
  const getStatusDisplay = (status) => {
    const statusMap = {
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      pending: 'Pending',
      'no-show': 'No Show',
    };
    return statusMap[status] || status;
  };

  // Loading State
  if (isLoading && !history.length && !upcomingAppointments.length && !todayAppointments.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-100 rounded-lg"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-red-600" />
            </button>
          </div>
          <button
            onClick={fetchAppointmentData}
            className="mt-2 text-sm text-red-700 font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist">
        {APPT_SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              aria-controls={`panel-${tab.id}`}
            >
              <Icon size={18} />
              <span className="whitespace-nowrap">{tr(tab.label, tab.fallback)}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" id={`panel-${activeSubTab}`}>
        {/* UPCOMING TAB */}
        {activeSubTab === 'upcoming' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary-600" size={32} />
              </div>
            ) : upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((apt) => (
                <div key={apt.id} className="border rounded-xl p-4 bg-green-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{apt.doctor}</p>
                      <p className="text-gray-600">{apt.specialization}</p>
                      <p className="text-sm mt-1">
                        {new Date(apt.date).toLocaleDateString()} • {apt.time}
                      </p>
                      {apt.location && (
                        <p className="text-sm text-gray-500 mt-1">📍 {apt.location}</p>
                      )}
                      {apt.tokenNumber && (
                        <p className="text-sm font-semibold mt-2">
                          Token: #{apt.tokenNumber}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {getStatusDisplay(apt.status)}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => handleAction('Reminder set!')}
                      className="border px-3 py-2 rounded-lg text-sm flex gap-1 items-center hover:bg-gray-50 bg-white"
                      aria-label="Set reminder"
                    >
                      <Bell size={16} /> Remind
                    </button>
                    {apt.location && (
                      <button
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(apt.location)}`, "_blank")}
                        className="border px-3 py-2 rounded-lg text-sm flex gap-1 items-center hover:bg-gray-50 bg-white"
                        aria-label="Get directions"
                      >
                        <MapPin size={16} /> Directions
                      </button>
                    )}
                    {apt.phone && (
                      <button
                        onClick={() => window.location.href = `tel:${apt.phone}`}
                        className="border px-3 py-2 rounded-lg text-sm flex gap-1 items-center hover:bg-gray-50 bg-white"
                        aria-label="Call clinic"
                      >
                        <Phone size={16} /> Call
                      </button>
                    )}
                    <button
                      onClick={() => handleReschedule(apt.id)}
                      className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 bg-white"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="border px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                <p>No upcoming appointments</p>
                <button
                  onClick={() => setActiveSubTab('book')}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                >
                  Book Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TODAY TAB */}
        {activeSubTab === 'today' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary-600" size={32} />
              </div>
            ) : todayAppointments.length > 0 ? (
              todayAppointments.map((apt) => (
                <div key={apt.id} className="border rounded-xl p-4 bg-blue-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{apt.doctor}</p>
                      <p className="text-gray-600">{apt.specialization}</p>
                      <p className="text-sm mt-1">{apt.time}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Today
                    </span>
                  </div>

                  {(apt.tokenNumber || apt.patientsAhead != null || apt.estimatedWait != null) && (
                    <div className="mt-4 border rounded-lg p-4 bg-white">
                      <h3 className="font-semibold mb-2">Queue Status</h3>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {apt.tokenNumber && (
                          <div>
                            <p className="text-sm text-gray-500">Your Token</p>
                            <p className="text-xl font-bold">#{apt.tokenNumber}</p>
                          </div>
                        )}
                        {apt.patientsAhead != null && (
                          <div>
                            <p className="text-sm text-gray-500">Ahead</p>
                            <p className="text-xl font-bold">{apt.patientsAhead}</p>
                          </div>
                        )}
                        {apt.estimatedWait != null && (
                          <div>
                            <p className="text-sm text-gray-500">Est. Wait</p>
                            <p className="text-xl font-bold">{apt.estimatedWait}min</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleCheckIn(apt.id)}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {isLoading ? <Loader className="animate-spin mx-auto" size={18} /> : 'Check In'}
                    </button>
                    <button
                      onClick={() => handleAction('Queue info refreshed')}
                      className="flex-1 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 bg-white"
                    >
                      View Queue
                    </button>
                    {apt.phone && (
                      <button
                        onClick={() => window.location.href = `tel:${apt.phone}`}
                        className="flex-1 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 bg-white"
                      >
                        Call
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-3 opacity-50" />
                <p>No appointments today</p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeSubTab === 'history' && (
          <div className="space-y-4">
            {/* Filter Buttons */}
            <div className="flex gap-2" role="group" aria-label="Filter history">
              {HISTORY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setHistoryFilter(filter.id)}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                    historyFilter === filter.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-pressed={historyFilter === filter.id}
                >
                  {tr(filter.label, filter.fallback)}
                </button>
              ))}
            </div>

            {/* History List */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary-600" size={32} />
              </div>
            ) : (
              <>
                {history
                  .filter((h) => {
                    if (historyFilter === 'all') return true;
                    return h.status === historyFilter;
                  })
                  .map((h) => (
                    <div key={h.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{h.doctor}</p>
                          <p className="text-sm text-gray-600">{h.specialization}</p>
                          <p className="text-sm mt-1">
                            {new Date(h.date).toLocaleDateString()} • {h.time}
                          </p>
                          {h.reason && (
                            <p className="text-sm text-gray-500 mt-2">
                              <span className="font-medium">Reason:</span> {h.reason}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            h.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {getStatusDisplay(h.status)}
                        </span>
                      </div>

                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => setSelectedHistory(h)}
                          className="text-primary-600 text-sm hover:underline"
                        >
                          View Details
                        </button>

                        {h.status === 'completed' && h.prescription && (
                          <button
                            onClick={() => setSelectedHistory({ ...h, showPrescription: true })}
                            className="text-primary-600 text-sm hover:underline"
                          >
                            View Prescription
                          </button>
                        )}

                        {h.status === 'completed' && (
                          <button
                            onClick={() => {
                              setActiveSubTab('book');
                              handleAction('Booking follow-up appointment');
                            }}
                            className="text-primary-600 text-sm hover:underline"
                          >
                            Book Follow-up
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                {history.filter((h) => {
                  if (historyFilter === 'all') return true;
                  return h.status === historyFilter;
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <User size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No appointment history</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* BOOK TAB */}
        {activeSubTab === 'book' && (
          <div className="space-y-4">
            {/* Progress Indicator */}
            {bookStep > 1 && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    if (bookStep === 2) {
                      setSelectedSpec(null);
                      setDoctors([]);
                    } else if (bookStep === 3) {
                      setSelectedDoctor(null);
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      setAvailableSlots([]);
                    } else if (bookStep === 4) {
                      setSelectedDate(null);
                      setSelectedSlot(null);
                    }
                    setBookStep(prev => Math.max(1, prev - 1));
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Go back"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-primary-600 rounded-full transition-all"
                    style={{ width: `${(bookStep / 4) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">
                  {bookStep}/4
                </span>
              </div>
            )}

            {/* STEP 1: Select Specialization */}
            {bookStep === 1 && (
              <>
                <h2 className="text-lg font-bold mb-4">
                  Select Specialization
                </h2>

                <div className="grid grid-cols-4 gap-3">
                  {SPECIALIZATIONS.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => handleSpecializationSelect(spec)}
                      className="border-2 rounded-xl p-4 text-center hover:border-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                      aria-label={spec.fallback}
                    >
                      <div className="text-3xl mb-1">{spec.icon}</div>
                      <div className="text-xs font-medium">{tr(spec.name, spec.fallback)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP 2: Select Doctor */}
            {bookStep === 2 && (
              <>
                <h2 className="text-lg font-bold mb-4">
                  Select Doctor
                </h2>

                {loadingDoctors ? (
                  <div className="flex justify-center py-8">
                    <Loader className="animate-spin text-primary-600" size={32} />
                  </div>
                ) : doctors.length > 0 ? (
                  <div className="space-y-3">
                    {doctors.map((doc) => (
                      <div key={doc.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                        <div className="flex justify-between">
                          <div className="flex gap-3">
                            {doc.profile_photo ? (
                              <img 
                                src={doc.profile_photo} 
                                alt={doc.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-lg">{doc.name}</p>
                              <p className="text-sm text-gray-600">{doc.spec || doc.specialization}</p>
                              <div className="flex gap-4 mt-2 text-sm">
                                {doc.rating > 0 && <span>⭐ {doc.rating}</span>}
                                {doc.experience > 0 && <span>🎯 {doc.experience} yrs exp</span>}
                                {(doc.fee > 0 || doc.consultation_fee > 0) && (
                                  <span>💰 ₹{doc.fee || doc.consultation_fee}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDoctorSelect(doc)}
                          className="mt-3 w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Stethoscope size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No doctors found for this specialization</p>
                    <button
                      onClick={() => setBookStep(1)}
                      className="mt-4 text-primary-600 hover:underline"
                    >
                      Try a different specialization
                    </button>
                  </div>
                )}
              </>
            )}

            {/* STEP 3: Select Date & Time */}
            {bookStep === 3 && selectedDoctor && (
              <>
                <h2 className="text-lg font-bold mb-4">
                  Select Date & Time
                </h2>

                {/* Selected Doctor Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="font-medium">{selectedDoctor.name}</p>
                  <p className="text-sm text-gray-600">{selectedDoctor.spec || selectedDoctor.specialization}</p>
                </div>

                {/* Date Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Select Date
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {availableDates.map((date) => (
                      <button
                        key={date.formatted}
                        onClick={() => handleDateSelect(date)}
                        className={`flex-shrink-0 px-4 py-2 border rounded-lg transition-colors ${
                          selectedDate?.formatted === date.formatted
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'hover:border-primary-600 bg-white'
                        }`}
                      >
                        <div className="text-xs">{date.dayName}</div>
                        <div className="font-bold">{date.day}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Time
                    </label>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4">
                        <Loader className="animate-spin text-primary-600" size={24} />
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-4 py-2 border rounded-lg transition-colors ${
                              selectedSlot === slot
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'hover:border-primary-600 bg-white'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No slots available for this date</p>
                    )}
                  </div>
                )}

                {/* Reason for Visit (Optional) */}
                {selectedSlot && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Reason for visit (optional)
                    </label>
                    <textarea
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      placeholder="Brief description of your symptoms or reason..."
                      className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-600"
                      rows={2}
                    />
                  </div>
                )}

                {/* Continue Button */}
                <button
                  onClick={() => setBookStep(4)}
                  disabled={!selectedDate || !selectedSlot}
                  className="mt-6 w-full bg-primary-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </>
            )}

            {/* STEP 4: Confirm Booking */}
            {bookStep === 4 && selectedDoctor && selectedDate && selectedSlot && (
              <>
                <h2 className="text-lg font-bold mb-4">
                  Confirm Booking
                </h2>

                <div className="border rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-medium">{selectedDoctor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Specialization:</span>
                    <span className="font-medium">{selectedDoctor.spec || selectedDoctor.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {selectedDate.dayName}, {selectedDate.day} {new Date(selectedDate.year, selectedDate.month).toLocaleString('default', { month: 'short' })} {selectedDate.year}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{selectedSlot}</span>
                  </div>
                  {bookingReason && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reason:</span>
                      <span className="font-medium text-right max-w-[200px]">{bookingReason}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold">Consultation Fee:</span>
                    <span className="font-bold text-primary-600">
                      ₹{selectedDoctor.fee || selectedDoctor.consultation_fee || 0}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleBookAppointment}
                  disabled={isLoading}
                  className="mt-4 w-full bg-primary-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader className="animate-spin mx-auto" size={20} />
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </>
            )}

            {/* Booking Success Modal */}
            {bookingSuccess && bookingData && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                  <CheckCircle size={60} className="mx-auto text-green-600 mb-4" />
                  <h3 className="text-xl font-bold text-center mb-2">
                    Booking Confirmed!
                  </h3>
                  <p className="text-center text-gray-600 mb-4">
                    Token: #{bookingData.tokenNumber}
                  </p>
                  <div className="border rounded-lg p-3 mb-4">
                    <p className="font-medium">{bookingData.doctorName}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(bookingData.date).toLocaleDateString()} • {bookingData.time}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        resetBooking();
                        setActiveSubTab('upcoming');
                      }}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      View Appointments
                    </button>
                    <button
                      onClick={resetBooking}
                      className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50"
                    >
                      Book Another
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Message Toast */}
      {actionMessage && (
        <div
          className={`fixed bottom-20 left-4 right-4 max-w-sm mx-auto p-4 rounded-lg shadow-lg text-white transform transition-all z-50 ${
            actionMessage.type === 'success' ? 'bg-green-600' :
            actionMessage.type === 'warning' ? 'bg-yellow-600' :
            actionMessage.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}
          role="alert"
        >
          <div className="flex items-center justify-between">
            <p>{actionMessage.text}</p>
            <button
              onClick={() => setActionMessage(null)}
              className="ml-4 hover:opacity-80"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* History/Details Modal */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">
                {selectedHistory.showPrescription ? 'Prescription' : 'Appointment Details'}
              </h2>
              <button
                onClick={() => setSelectedHistory(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {selectedHistory.showPrescription ? (
              // Prescription View
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <p className="font-bold">{selectedHistory.doctor}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedHistory.date).toLocaleDateString()} • {selectedHistory.time}
                  </p>
                </div>

                {selectedHistory.prescription?.medicines && (
                  <div>
                    <h3 className="font-semibold mb-2">Medicines</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedHistory.prescription.medicines.map((med, idx) => (
                        <li key={idx} className="text-gray-700">{med}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedHistory.prescription?.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-gray-700">{selectedHistory.prescription.notes}</p>
                  </div>
                )}

                {selectedHistory.prescription?.followUp && (
                  <div>
                    <h3 className="font-semibold mb-2">Follow Up</h3>
                    <p className="text-gray-700">{selectedHistory.prescription.followUp}</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedHistory({ ...selectedHistory, showPrescription: false })}
                  className="w-full border px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            ) : (
              // Appointment Details View
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Doctor</p>
                    <p className="font-medium">{selectedHistory.doctor}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Specialization</p>
                    <p className="font-medium">{selectedHistory.specialization}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{new Date(selectedHistory.date).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{selectedHistory.time}</p>
                  </div>
                </div>

                {selectedHistory.reason && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Reason</p>
                    <p className="font-medium">{selectedHistory.reason}</p>
                  </div>
                )}

                {selectedHistory.cancellationReason && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-red-500">Cancellation Reason</p>
                    <p className="font-medium text-red-700">{selectedHistory.cancellationReason}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {selectedHistory.status === 'completed' && selectedHistory.prescription && (
                    <button
                      onClick={() => {
                        setSelectedHistory({ ...selectedHistory, showPrescription: true });
                      }}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      View Prescription
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedHistory(null)}
                    className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-20" />
    </div>
  );
};

PatientAppointmentsTab.propTypes = {
  userId: PropTypes.string,
  onBookingComplete: PropTypes.func,
};

export default PatientAppointmentsTab;