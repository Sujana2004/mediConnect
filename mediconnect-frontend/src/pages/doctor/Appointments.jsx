import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Play,
  MessageSquare,
  FileText,
  RefreshCw,
  CalendarDays,
  List,
  Grid3X3,
  UserCheck,
  UserX,
  Timer,
  MapPin,
  Building,
  Loader2
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isPast,
  parseISO,
  differenceInMinutes
} from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import {
  getAppointments,
  checkInAppointment,
  confirmAppointment,
  cancelAppointment,
  startAppointment,
  markNoShow,
  completeAppointment
} from '../../services/api/appointmentService';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  SearchInput,
  Select
} from '../../components/common';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  pending: {
    color: 'warning',
    icon: Clock,
    label: 'Pending',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  confirmed: {
    color: 'success',
    icon: CheckCircle,
    label: 'Confirmed',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  checked_in: {
    color: 'info',
    icon: UserCheck,
    label: 'Checked In',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  in_progress: {
    color: 'primary',
    icon: Video,
    label: 'In Progress',
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-700',
    borderColor: 'border-primary-200'
  },
  completed: {
    color: 'success',
    icon: CheckCircle,
    label: 'Completed',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  cancelled: {
    color: 'danger',
    icon: XCircle,
    label: 'Cancelled',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  no_show: {
    color: 'danger',
    icon: UserX,
    label: 'No Show',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  rescheduled: {
    color: 'warning',
    icon: Calendar,
    label: 'Rescheduled',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  }
};

const BOOKING_TYPE_CONFIG = {
  online: { icon: Video, label: 'Online', color: 'primary' },
  walk_in: { icon: Building, label: 'Walk-in', color: 'secondary' },
  phone: { icon: Phone, label: 'Phone', color: 'info' },
  follow_up: { icon: RefreshCw, label: 'Follow-up', color: 'warning' }
};

// ============================================================================
// HELPER FUNCTIONS (✅ FIXED)
// ============================================================================

const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

const formatDate = (dateString, formatStr = 'MMM d, yyyy') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
};

const calculateDuration = (startTimeStr, endTimeStr) => {
  if (!startTimeStr || !endTimeStr) return null;
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const start = parseISO(`${today}T${startTimeStr}`);
    const end = parseISO(`${today}T${endTimeStr}`);
    return differenceInMinutes(end, start);
  } catch {
    return null;
  }
};

// ✅ FIXED: Comprehensive error message handler
const getErrorMessage = (error, fallbackMessage = 'An error occurred') => {
  // Handle network errors
  if (!error.response) {
    return error.message || fallbackMessage;
  }

  const { data } = error.response;

  // Handle string error
  if (typeof data === 'string') return data;

  // Handle {detail: "message"}
  if (data?.detail) return data.detail;

  // Handle {message: "message"}
  if (data?.message) return data.message;

  // Handle {error: "message"}
  if (data?.error) return data.error;

  // Handle field errors {field: ["error1", "error2"]}
  if (typeof data === 'object' && data !== null) {
    const fieldErrors = [];
    Object.entries(data).forEach(([field, errors]) => {
      if (Array.isArray(errors)) {
        errors.forEach(err => fieldErrors.push(`${field}: ${err}`));
      } else if (typeof errors === 'string') {
        fieldErrors.push(`${field}: ${errors}`);
      }
    });
    if (fieldErrors.length > 0) return fieldErrors.join(', ');
  }

  return fallbackMessage;
};

// ✅ FIXED: Safe symptoms parser
const parseSymptoms = (symptoms) => {
  if (!symptoms) return [];
  try {
    if (Array.isArray(symptoms)) return symptoms;
    if (typeof symptoms === 'string') {
      // Handle JSON string
      if (symptoms.startsWith('[')) {
        try {
          return JSON.parse(symptoms);
        } catch {
          // Fall through to comma split
        }
      }
      return symptoms.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error('Error parsing symptoms:', err);
    return [];
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const DateNavigationHeader = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onOpenCalendar
}) => {
  const { t } = useTranslation();

  const handlePrevious = () => {
    onDateChange(viewMode === 'week' ? subDays(selectedDate, 7) : subDays(selectedDate, 1));
  };

  const handleNext = () => {
    onDateChange(viewMode === 'week' ? addDays(selectedDate, 7) : addDays(selectedDate, 1));
  };

  const handleToday = () => onDateChange(new Date());

  const getDateLabel = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handlePrevious} className="p-2">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarDays className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-900">{getDateLabel()}</span>
        </button>
        <Button variant="outline" size="sm" onClick={handleNext} className="p-2">
          <ChevronRight className="w-5 h-5" />
        </Button>
        {!isToday(selectedDate) && (
          <Button variant="ghost" size="sm" onClick={handleToday}>
            {t('common.today', 'Today')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              viewMode === 'day'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Day</span>
          </button>
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              viewMode === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Week</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const StatsSummary = ({ appointments }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    checkedIn: appointments.filter(a => a.status === 'checked_in').length,
    inProgress: appointments.filter(a => a.status === 'in_progress').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    noShow: appointments.filter(a => a.status === 'no_show').length,
  }), [appointments]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        <p className="text-xs text-gray-500">{t('common.total', 'Total')}</p>
      </div>
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
        <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        <p className="text-xs text-amber-600">Pending</p>
      </div>
      <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
        <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
        <p className="text-xs text-green-600">Confirmed</p>
      </div>
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
        <p className="text-2xl font-bold text-blue-700">{stats.checkedIn}</p>
        <p className="text-xs text-blue-600">Checked In</p>
      </div>
      <div className="bg-primary-50 rounded-xl border border-primary-100 p-3 text-center">
        <p className="text-2xl font-bold text-primary-700">{stats.inProgress}</p>
        <p className="text-xs text-primary-600">In Progress</p>
      </div>
      <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
        <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
        <p className="text-xs text-green-600">Completed</p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
        <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
        <p className="text-xs text-red-600">Cancelled</p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
        <p className="text-2xl font-bold text-red-700">{stats.noShow}</p>
        <p className="text-xs text-red-600">No Show</p>
      </div>
    </div>
  );
};

const FiltersBar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  bookingTypeFilter,
  onBookingTypeChange,
  onClearFilters
}) => {
  const { t } = useTranslation();

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' }
  ];

  const bookingTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'online', label: 'Online' },
    { value: 'walk_in', label: 'Walk-in' },
    { value: 'phone', label: 'Phone' },
    { value: 'follow_up', label: 'Follow-up' }
  ];

  const hasFilters = searchQuery || statusFilter || bookingTypeFilter;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t('doctor.searchPatients', 'Search patients...')}
        />
      </div>
      <Select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        options={statusOptions}
        placeholder=""
      />
      <Select
        value={bookingTypeFilter}
        onChange={(e) => onBookingTypeChange(e.target.value)}
        options={bookingTypeOptions}
        placeholder=""
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-gray-500 whitespace-nowrap">
          <XCircle className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};

// ✅ FIXED: AppointmentCard with null safety
const AppointmentCard = ({
  appointment,
  onStart,
  onCheckIn,
  onConfirm,
  onCancel,
  onReschedule,
  onViewDetails,
  onViewPatient,
  onMarkNoShow,
  processingId
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  // ✅ Early return for invalid appointment
  if (!appointment || !appointment.id) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const bookingTypeConfig = BOOKING_TYPE_CONFIG[appointment.booking_type] || BOOKING_TYPE_CONFIG.online;
  const StatusIcon = statusConfig.icon;
  const BookingIcon = bookingTypeConfig.icon;

  const canStart = appointment.status === 'checked_in';
  const canCheckIn = appointment.status === 'confirmed';
  const canConfirm = appointment.status === 'pending';
  const canMarkNoShow = ['confirmed', 'checked_in', 'pending'].includes(appointment.status);
  const isProcessing = processingId === appointment.id;
  const duration = appointment.start_time && appointment.end_time 
    ? calculateDuration(appointment.start_time, appointment.end_time)
    : null;
  const symptoms = parseSymptoms(appointment.symptoms);

  return (
    <div className={`relative p-4 rounded-xl border transition-all hover:shadow-md ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
      <div className="flex items-start gap-4">
        {/* Time Column */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <p className="text-xl font-bold text-gray-900">
            {formatTime(appointment.start_time) || '--:--'}
          </p>
          {appointment.end_time && (
            <p className="text-sm text-gray-500">
              to {formatTime(appointment.end_time)}
            </p>
          )}
          <div className="flex items-center justify-center gap-1 mt-2">
            <Badge variant={bookingTypeConfig.color} size="sm">
              <BookingIcon className="w-3 h-3 mr-1" />
              {appointment.booking_type_display || bookingTypeConfig.label}
            </Badge>
          </div>
          {duration && (
            <p className="text-xs text-gray-500 mt-1">{duration} min</p>
          )}
        </div>

        <div className="w-px h-24 bg-gray-200 flex-shrink-0" />

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={appointment.patient_name || 'Unknown'} size="md" />
              <div>
                <h4 className="font-semibold text-gray-900 truncate">
                  {appointment.patient_name || 'Unknown Patient'}
                </h4>
                {appointment.patient_phone && (
                  <p className="text-sm text-gray-500">{appointment.patient_phone}</p>
                )}
              </div>
            </div>
            <Badge variant={statusConfig.color} className="flex-shrink-0">
              <StatusIcon className="w-3 h-3 mr-1" />
              {appointment.status_display || statusConfig.label}
            </Badge>
          </div>

          {appointment.reason && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              <span className="font-medium">Reason:</span> {appointment.reason}
            </p>
          )}

          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {symptoms.slice(0, 3).map((symptom, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-600 border border-gray-200"
                >
                  {symptom}
                </span>
              ))}
              {symptoms.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{symptoms.length - 3} more
                </span>
              )}
            </div>
          )}

          {appointment.patient_notes && (
            <div className="mt-2 p-2 bg-white/50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 line-clamp-1">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {appointment.patient_notes}
              </p>
            </div>
          )}

          {appointment.queue_number && (
            <div className="mt-2">
              <Badge variant="secondary" size="sm">
                Queue #{appointment.queue_number}
              </Badge>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canStart && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              onClick={() => onStart(appointment)}
              disabled={isProcessing}
            >
              Start
            </Button>
          )}
          {canCheckIn && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              onClick={() => onCheckIn(appointment.id)}
              disabled={isProcessing}
            >
              Check In
            </Button>
          )}
          {canConfirm && (
            <Button
              variant="success"
              size="sm"
              leftIcon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              onClick={() => onConfirm(appointment.id)}
              disabled={isProcessing}
            >
              Confirm
            </Button>
          )}

          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowActions(!showActions)} className="p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => { onViewDetails(appointment); setShowActions(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => { onViewPatient(appointment.patient_id); setShowActions(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Patient Records
                  </button>
                  {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                    <>
                      <hr className="my-1 border-gray-100" />
                      {canMarkNoShow && (
                        <button
                          onClick={() => { onMarkNoShow(appointment.id); setShowActions(false); }}
                          className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <UserX className="w-4 h-4" />
                          Mark No Show
                        </button>
                      )}
                      <button
                        onClick={() => { onReschedule(appointment); setShowActions(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Reschedule
                      </button>
                      <button
                        onClick={() => { onCancel(appointment); setShowActions(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const WeekView = ({
  selectedDate,
  appointments,
  onDateSelect,
  onAppointmentClick,
  isLoading
}) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const getAppointmentsForDay = (day) => {
    return appointments.filter(apt =>
      isSameDay(parseISO(apt.appointment_date), day)
    );
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => {
        const dayAppointments = getAppointmentsForDay(day);
        const isCurrentDay = isToday(day);
        const isPastDay = isPast(day) && !isCurrentDay;

        return (
          <div
            key={day.toISOString()}
            className={`min-h-[200px] rounded-xl border p-2 cursor-pointer transition-all hover:shadow-md ${
              isCurrentDay
                ? 'bg-primary-50 border-primary-200'
                : isPastDay
                ? 'bg-gray-50 border-gray-100'
                : 'bg-white border-gray-200'
            }`}
            onClick={() => onDateSelect(day)}
          >
            <div className="text-center mb-2 pb-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</p>
              <p className={`text-lg font-bold ${isCurrentDay ? 'text-primary-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </p>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-1">
                {dayAppointments.slice(0, 4).map((apt) => {
                  const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                  return (
                    <div
                      key={apt.id}
                      onClick={(e) => { e.stopPropagation(); onAppointmentClick(apt); }}
                      className={`p-1.5 rounded text-xs truncate cursor-pointer hover:opacity-80 ${sc.bgColor} ${sc.textColor}`}
                    >
                      <span className="font-medium">{formatTime(apt.start_time)}</span>
                      <span className="ml-1 opacity-75">{apt.patient_name?.split(' ')[0]}</span>
                    </div>
                  );
                })}
                {dayAppointments.length > 4 && (
                  <p className="text-xs text-center text-gray-500 mt-1">+{dayAppointments.length - 4} more</p>
                )}
                {dayAppointments.length === 0 && (
                  <p className="text-xs text-center text-gray-400 mt-4">No appointments</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AppointmentDetailsModal = ({ isOpen, onClose, appointment, onAction, isLoading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!appointment) return null;

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const bookingTypeConfig = BOOKING_TYPE_CONFIG[appointment.booking_type] || BOOKING_TYPE_CONFIG.online;
  const StatusIcon = statusConfig.icon;
  const BookingIcon = bookingTypeConfig.icon;
  const symptoms = parseSymptoms(appointment.symptoms);
  const duration = calculateDuration(appointment.start_time, appointment.end_time);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appointment Details" size="lg">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={appointment.patient_name} size="xl" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{appointment.patient_name}</h3>
              {appointment.patient_phone && (
                <p className="text-gray-600 mt-1">{appointment.patient_phone}</p>
              )}
            </div>
          </div>
          <Badge variant={statusConfig.color} size="lg">
            <StatusIcon className="w-4 h-4 mr-1" />
            {appointment.status_display || statusConfig.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Date & Time</p>
            <p className="font-semibold text-gray-900">
              {formatDate(appointment.appointment_date, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-primary-600 font-medium">
              {formatTime(appointment.start_time)}
              {appointment.end_time && ` - ${formatTime(appointment.end_time)}`}
              {duration && ` (${duration} min)`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Booking Type</p>
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <BookingIcon className="w-5 h-5 text-primary-600" />
              {appointment.booking_type_display || bookingTypeConfig.label}
            </p>
            {appointment.queue_number && (
              <p className="text-sm text-gray-500 mt-1">Queue #{appointment.queue_number}</p>
            )}
          </div>
        </div>

        {appointment.reason && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Reason for Visit</h4>
            <p className="text-gray-700 bg-gray-50 rounded-xl p-4">{appointment.reason}</p>
          </div>
        )}

        {symptoms.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Symptoms</h4>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, index) => (
                <Badge key={index} variant="secondary">{symptom}</Badge>
              ))}
            </div>
          </div>
        )}

        {appointment.patient_notes && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Patient Notes</h4>
            <p className="text-gray-700 bg-amber-50 rounded-xl p-4 border border-amber-100">
              {appointment.patient_notes}
            </p>
          </div>
        )}

        {appointment.doctor_notes && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Doctor Notes</h4>
            <p className="text-gray-700 bg-blue-50 rounded-xl p-4 border border-blue-100">
              {appointment.doctor_notes}
            </p>
          </div>
        )}

        {appointment.status === 'cancelled' && appointment.cancellation_reason && (
          <div>
            <h4 className="font-medium text-red-900 mb-2">Cancellation Reason</h4>
            <p className="text-red-700 bg-red-50 rounded-xl p-4 border border-red-100">
              {appointment.cancellation_reason}
              {appointment.cancelled_by && (
                <span className="block text-sm mt-1 text-red-500">
                  Cancelled by: {appointment.cancelled_by}
                </span>
              )}
            </p>
          </div>
        )}

        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
          <span>Booked: {formatDate(appointment.created_at, 'MMM d, yyyy h:mm a')}</span>
          {appointment.confirmed_at && (
            <span>Confirmed: {formatDate(appointment.confirmed_at, 'MMM d, h:mm a')}</span>
          )}
          {appointment.checked_in_at && (
            <span>Checked in: {formatDate(appointment.checked_in_at, 'h:mm a')}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          leftIcon={<FileText className="w-4 h-4" />}
          onClick={() => { navigate(`/doctor/patients/${appointment.patient_id}`); onClose(); }}
        >
          Patient Records
        </Button>
        {appointment.status === 'checked_in' && (
          <Button
            variant="primary"
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            onClick={() => onAction('start', appointment)}
            disabled={isLoading}
          >
            Start Consultation
          </Button>
        )}
        {appointment.status === 'confirmed' && (
          <Button
            variant="outline"
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            onClick={() => onAction('check_in', appointment)}
            disabled={isLoading}
          >
            Check In
          </Button>
        )}
        {appointment.status === 'pending' && (
          <Button
            variant="success"
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            onClick={() => onAction('confirm', appointment)}
            disabled={isLoading}
          >
            Confirm
          </Button>
        )}
        {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
          <>
            <Button
              variant="outline"
              leftIcon={<Clock className="w-4 h-4" />}
              onClick={() => onAction('reschedule', appointment)}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={() => onAction('cancel', appointment)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

const CancelAppointmentModal = ({ isOpen, onClose, appointment, onConfirm, isLoading }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    onConfirm(appointment.id, reason.trim());
  };

  if (!appointment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Appointment" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            This action cannot be undone. The patient will be notified.
          </p>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar name={appointment.patient_name} size="md" />
          <div>
            <p className="font-medium text-gray-900">{appointment.patient_name}</p>
            <p className="text-sm text-gray-500">
              {formatDate(appointment.appointment_date, 'MMM d, yyyy')} at {formatTime(appointment.start_time)}
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cancellation Reason *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter reason for cancellation..."
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>Go Back</Button>
        <Button
          variant="danger"
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          onClick={handleConfirm}
          disabled={isLoading || !reason.trim()}
        >
          Cancel Appointment
        </Button>
      </div>
    </Modal>
  );
};

const CalendarModal = ({ isOpen, onClose, selectedDate, onDateSelect }) => {
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (isOpen) setViewDate(selectedDate);
  }, [isOpen, selectedDate]);

  const monthStart = startOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Date" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-gray-900">{format(viewDate, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>
          ))}
          {calendarDays.map(day => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => { onDateSelect(day); onClose(); }}
                className={`p-2 text-sm rounded-lg transition-colors ${
                  isSelected ? 'bg-primary-600 text-white'
                  : isTodayDate ? 'bg-primary-100 text-primary-700'
                  : isCurrentMonth ? 'hover:bg-gray-100 text-gray-900'
                  : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={() => { onDateSelect(new Date()); onClose(); }} className="flex-1">
            Today
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT (✅ ALL API CALLS FIXED)
// ============================================================================

const DoctorAppointments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try { return parseISO(dateParam); } catch { return new Date(); }
    }
    return new Date();
  });
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'day');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // ✅ FIXED: Fetch with proper response handling
  const fetchAppointments = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      let allAppointments = [];

      if (viewMode === 'week') {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        const promises = days.map(day =>
          getAppointments({ date: format(day, 'yyyy-MM-dd') })
            .then(response => {
              if (Array.isArray(response)) return response;
              if (response?.data && Array.isArray(response.data)) return response.data;
              if (response?.results && Array.isArray(response.results)) return response.results;
              return [];
            })
            .catch(err => {
              console.error('Error fetching day appointments:', err);
              return [];
            })
        );

        const results = await Promise.all(promises);
        allAppointments = results.flat();
      } else {
        const response = await getAppointments({
          date: format(selectedDate, 'yyyy-MM-dd')
        });

        if (Array.isArray(response)) {
          allAppointments = response;
        } else if (response?.data && Array.isArray(response.data)) {
          allAppointments = response.data;
        } else if (response?.results && Array.isArray(response.results)) {
          allAppointments = response.results;
        }
      }

      allAppointments = allAppointments.filter(apt => 
        apt && apt.id && apt.patient_name && apt.doctor_name
      );

      setAppointments(allAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      const errorMsg = getErrorMessage(err, 'Failed to load appointments');
      setError(errorMsg);
      toast.error(errorMsg);
      setAppointments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('date', format(selectedDate, 'yyyy-MM-dd'));
    params.set('view', viewMode);
    setSearchParams(params, { replace: true });
  }, [selectedDate, viewMode, setSearchParams]);

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.patient_name?.toLowerCase().includes(query) ||
        apt.reason?.toLowerCase().includes(query) ||
        apt.symptoms?.toLowerCase().includes(query)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }
    if (bookingTypeFilter) {
      filtered = filtered.filter(apt => apt.booking_type === bookingTypeFilter);
    }

    filtered.sort((a, b) => {
      const dateCompare = (a.appointment_date || '').localeCompare(b.appointment_date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    return filtered;
  }, [appointments, searchQuery, statusFilter, bookingTypeFilter]);

  const handleDateChange = useCallback((date) => setSelectedDate(date), []);
  const handleViewModeChange = useCallback((mode) => setViewMode(mode), []);

  const handleStartConsultation = useCallback(async (appointment) => {
    try {
      setProcessingId(appointment.id);
      await startAppointment(appointment.id);
      toast.success('Consultation started');
      navigate(`/doctor/consultation/${appointment.id}`);
    } catch (err) {
      console.error('Start consultation error:', err);
      toast.error(getErrorMessage(err, 'Failed to start consultation'));
    } finally {
      setProcessingId(null);
    }
  }, [navigate]);

  const handleConfirmAppointment = useCallback(async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      await confirmAppointment(appointmentId);
      toast.success('Appointment confirmed');
      await fetchAppointments(true);
    } catch (err) {
      console.error('Confirm appointment error:', err);
      toast.error(getErrorMessage(err, 'Failed to confirm appointment'));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments]);

  const handleCheckInAppointment = useCallback(async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      await checkInAppointment(appointmentId);
      toast.success('Patient checked in');
      await fetchAppointments(true);
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error(getErrorMessage(err, 'Failed to check in patient'));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments]);

  // ✅ FIXED: Cancel with object
  const handleCancelAppointment = useCallback(async (appointmentId, reason) => {
    try {
      setProcessingId(appointmentId);
      await cancelAppointment(appointmentId, { reason });
      toast.success('Appointment cancelled');
      setShowCancelModal(false);
      setAppointmentToCancel(null);
      await fetchAppointments(true);
    } catch (err) {
      console.error('Cancel appointment error:', err);
      toast.error(getErrorMessage(err, 'Failed to cancel appointment'));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments]);

  const handleMarkNoShow = useCallback(async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      await markNoShow(appointmentId);
      toast.success('Marked as no show');
      await fetchAppointments(true);
    } catch (err) {
      console.error('Mark no-show error:', err);
      toast.error(getErrorMessage(err, 'Failed to mark as no show'));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments]);

  const handleViewDetails = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  }, []);

  const handleViewPatient = useCallback((patientId) => {
    if (patientId) navigate(`/doctor/patients/${patientId}`);
    else toast.error('Patient ID not available');
  }, [navigate]);

  const handleReschedule = useCallback((appointment) => {
    navigate(`/doctor/appointments/${appointment.id}/reschedule`);
  }, [navigate]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setBookingTypeFilter('');
  }, []);

  const handleModalAction = useCallback((action, appointment) => {
    setShowDetailsModal(false);
    switch (action) {
      case 'start': handleStartConsultation(appointment); break;
      case 'check_in': handleCheckInAppointment(appointment.id); break;
      case 'confirm': handleConfirmAppointment(appointment.id); break;
      case 'reschedule': handleReschedule(appointment); break;
      case 'cancel':
        setAppointmentToCancel(appointment);
        setShowCancelModal(true);
        break;
      default: break;
    }
  }, [handleStartConsultation, handleCheckInAppointment, handleConfirmAppointment, handleReschedule]);

  const handleRefresh = useCallback(() => fetchAppointments(true), [fetchAppointments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage your appointments and schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh} disabled={isRefreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>Retry</Button>
        </div>
      )}

      <DateNavigationHeader
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenCalendar={() => setShowCalendarModal(true)}
      />

      <StatsSummary appointments={filteredAppointments} />

      <Card padding="md">
        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          bookingTypeFilter={bookingTypeFilter}
          onBookingTypeChange={setBookingTypeFilter}
          onClearFilters={handleClearFilters}
        />
      </Card>

      {viewMode === 'week' ? (
        <WeekView
          selectedDate={selectedDate}
          appointments={filteredAppointments}
          onDateSelect={handleDateChange}
          onAppointmentClick={handleViewDetails}
          isLoading={isRefreshing}
        />
      ) : (
        <Card padding="md">
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onStart={handleStartConsultation}
                  onCheckIn={handleCheckInAppointment}
                  onConfirm={handleConfirmAppointment}
                  onCancel={(apt) => { setAppointmentToCancel(apt); setShowCancelModal(true); }}
                  onReschedule={handleReschedule}
                  onViewDetails={handleViewDetails}
                  onViewPatient={handleViewPatient}
                  onMarkNoShow={handleMarkNoShow}
                  processingId={processingId}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No appointments"
              description={
                searchQuery || statusFilter || bookingTypeFilter
                  ? 'No appointments match your filters'
                  : 'No appointments scheduled for this date'
              }
              action={
                (searchQuery || statusFilter || bookingTypeFilter) ? (
                  <Button variant="outline" onClick={handleClearFilters}>Clear Filters</Button>
                ) : !isToday(selectedDate) ? (
                  <Button variant="outline" onClick={() => setSelectedDate(new Date())}>Go to Today</Button>
                ) : null
              }
            />
          )}
        </Card>
      )}

      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedAppointment(null); }}
        appointment={selectedAppointment}
        onAction={handleModalAction}
        isLoading={!!processingId}
      />

      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setAppointmentToCancel(null); }}
        appointment={appointmentToCancel}
        onConfirm={handleCancelAppointment}
        isLoading={!!processingId}
      />

      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        selectedDate={selectedDate}
        onDateSelect={handleDateChange}
      />
    </div>
  );
};

export default DoctorAppointments;