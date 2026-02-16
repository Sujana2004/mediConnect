// src/pages/doctor/Appointments.jsx
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
  Filter,
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
  Plus,
  Download,
  Bell,
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
import { useLanguage } from '../../hooks/useLanguage';
import { appointmentService, consultationService } from '../../services/api';
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format time from HH:MM:SS to readable format
 */
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

/**
 * Format date string to readable format
 */
const formatDate = (dateString, formatStr = 'MMM d, yyyy') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
};

/**
 * Calculate duration in minutes between two time strings
 */
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const start = parseISO(`${today}T${startTime}`);
    const end = parseISO(`${today}T${endTime}`);
    return differenceInMinutes(end, start);
  } catch {
    return null;
  }
};

/**
 * Extract error message from API error response
 */
const getErrorMessage = (error, fallbackMessage = 'An error occurred') => {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
};

/**
 * Parse symptoms string to array
 */
const parseSymptoms = (symptoms) => {
  if (!symptoms) return [];
  if (Array.isArray(symptoms)) return symptoms;
  if (typeof symptoms === 'string') {
    return symptoms.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Date Navigation Header
 */
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

  const handleToday = () => {
    onDateChange(new Date());
  };

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
      {/* Date Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          className="p-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarDays className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-900">{getDateLabel()}</span>
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          className="p-2"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {!isToday(selectedDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
          >
            {t('common.today', 'Today')}
          </Button>
        )}
      </div>

      {/* View Mode Toggle */}
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

/**
 * Stats Summary Component
 */
const StatsSummary = ({ appointments }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const checkedIn = appointments.filter(a => a.status === 'checked_in').length;
    const inProgress = appointments.filter(a => a.status === 'in_progress').length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;

    return { total, confirmed, completed, cancelled, pending, checkedIn, inProgress, noShow };
  }, [appointments]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        <p className="text-xs text-gray-500">{t('common.total', 'Total')}</p>
      </div>
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
        <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        <p className="text-xs text-amber-600">{t('status.pending', 'Pending')}</p>
      </div>
      <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
        <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
        <p className="text-xs text-green-600">{t('status.confirmed', 'Confirmed')}</p>
      </div>
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
        <p className="text-2xl font-bold text-blue-700">{stats.checkedIn}</p>
        <p className="text-xs text-blue-600">{t('status.checkedIn', 'Checked In')}</p>
      </div>
      <div className="bg-primary-50 rounded-xl border border-primary-100 p-3 text-center">
        <p className="text-2xl font-bold text-primary-700">{stats.inProgress}</p>
        <p className="text-xs text-primary-600">{t('status.inProgress', 'In Progress')}</p>
      </div>
      <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
        <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
        <p className="text-xs text-green-600">{t('status.completed', 'Completed')}</p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
        <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
        <p className="text-xs text-red-600">{t('status.cancelled', 'Cancelled')}</p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
        <p className="text-2xl font-bold text-red-700">{stats.noShow}</p>
        <p className="text-xs text-red-600">{t('status.noShow', 'No Show')}</p>
      </div>
    </div>
  );
};

/**
 * Filters Bar Component
 */
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
    { value: '', label: t('common.allStatuses', 'All Statuses') },
    { value: 'pending', label: t('status.pending', 'Pending') },
    { value: 'confirmed', label: t('status.confirmed', 'Confirmed') },
    { value: 'checked_in', label: t('status.checkedIn', 'Checked In') },
    { value: 'in_progress', label: t('status.inProgress', 'In Progress') },
    { value: 'completed', label: t('status.completed', 'Completed') },
    { value: 'cancelled', label: t('status.cancelled', 'Cancelled') },
    { value: 'no_show', label: t('status.noShow', 'No Show') }
  ];

  const bookingTypeOptions = [
    { value: '', label: t('common.allTypes', 'All Types') },
    { value: 'online', label: t('bookingType.online', 'Online') },
    { value: 'walk_in', label: t('bookingType.walkIn', 'Walk-in') },
    { value: 'phone', label: t('bookingType.phone', 'Phone') },
    { value: 'follow_up', label: t('bookingType.followUp', 'Follow-up') }
  ];

  const hasFilters = searchQuery || statusFilter || bookingTypeFilter;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('doctor.searchPatients', 'Search patients...')}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        {statusOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <select
        value={bookingTypeFilter}
        onChange={(e) => onBookingTypeChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        {bookingTypeOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-gray-500 whitespace-nowrap"
        >
          <XCircle className="w-4 h-4 mr-1" />
          {t('common.clear', 'Clear')}
        </Button>
      )}
    </div>
  );
};

/**
 * Appointment Card Component
 */
const AppointmentCard = ({ 
  appointment, 
  onStart, 
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

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const bookingTypeConfig = BOOKING_TYPE_CONFIG[appointment.booking_type] || BOOKING_TYPE_CONFIG.online;
  const StatusIcon = statusConfig.icon;
  const BookingIcon = bookingTypeConfig.icon;
  
  // Calculate if appointment can be started
  const appointmentDateTime = parseISO(`${appointment.appointment_date}T${appointment.start_time}`);
  const isPastAppointment = isPast(appointmentDateTime);
  const canStart = ['confirmed', 'checked_in'].includes(appointment.status);
  const canConfirm = appointment.status === 'pending';
  const canMarkNoShow = ['confirmed', 'checked_in'].includes(appointment.status) && isPastAppointment;
  const isProcessing = processingId === appointment.id;

  // Calculate duration
  const duration = calculateDuration(appointment.start_time, appointment.end_time);

  // Parse symptoms
  const symptoms = parseSymptoms(appointment.symptoms);

  return (
    <div className={`relative p-4 rounded-xl border transition-all hover:shadow-md ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
      <div className="flex items-start gap-4">
        {/* Time Column */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <p className="text-xl font-bold text-gray-900">
            {formatTime(appointment.start_time)}
          </p>
          {appointment.end_time && (
            <p className="text-sm text-gray-500">
              to {formatTime(appointment.end_time)}
            </p>
          )}
          <div className="flex items-center justify-center gap-1 mt-2">
            <Badge variant={bookingTypeConfig.color} size="sm">
              <BookingIcon className="w-3 h-3 mr-1" />
              {bookingTypeConfig.label}
            </Badge>
          </div>
          {duration && (
            <p className="text-xs text-gray-500 mt-1">
              {duration} {t('common.min', 'min')}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-24 bg-gray-200 flex-shrink-0" />

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                name={appointment.patient_name}
                size="md"
              />
              <div>
                <h4 className="font-semibold text-gray-900 truncate">
                  {appointment.patient_name}
                </h4>
                {appointment.patient_phone && (
                  <p className="text-sm text-gray-500">
                    {appointment.patient_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <Badge variant={statusConfig.color} className="flex-shrink-0">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Reason */}
          {appointment.reason && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              <span className="font-medium">Reason:</span> {appointment.reason}
            </p>
          )}

          {/* Symptoms */}
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

          {/* Patient Notes */}
          {appointment.patient_notes && (
            <div className="mt-2 p-2 bg-white/50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 line-clamp-1">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {appointment.patient_notes}
              </p>
            </div>
          )}

          {/* Queue Number */}
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
              {t('common.start', 'Start')}
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
              {t('common.confirm', 'Confirm')}
            </Button>
          )}

          {/* More Actions */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="p-2"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showActions && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onViewDetails(appointment);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {t('doctor.viewDetails', 'View Details')}
                  </button>
                  <button
                    onClick={() => {
                      onViewPatient(appointment.patient_id);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t('doctor.viewPatientRecords', 'View Patient Records')}
                  </button>
                  
                  {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                    <>
                      <hr className="my-1 border-gray-100" />
                      
                      {canMarkNoShow && (
                        <button
                          onClick={() => {
                            onMarkNoShow(appointment.id);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <UserX className="w-4 h-4" />
                          {t('doctor.markNoShow', 'Mark No Show')}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          onReschedule(appointment);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        {t('common.reschedule', 'Reschedule')}
                      </button>
                      <button
                        onClick={() => {
                          onCancel(appointment);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        {t('common.cancel', 'Cancel')}
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

/**
 * Week View Component
 */
const WeekView = ({ 
  selectedDate, 
  appointments, 
  onDateSelect,
  onAppointmentClick,
  isLoading 
}) => {
  const { t } = useTranslation();

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
            {/* Day Header */}
            <div className="text-center mb-2 pb-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase">
                {format(day, 'EEE')}
              </p>
              <p className={`text-lg font-bold ${
                isCurrentDay ? 'text-primary-600' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </p>
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Appointments */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 4).map((apt) => {
                    const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                        className={`p-1.5 rounded text-xs truncate cursor-pointer hover:opacity-80 ${statusConfig.bgColor} ${statusConfig.textColor}`}
                      >
                        <span className="font-medium">{formatTime(apt.start_time)}</span>
                        <span className="ml-1 opacity-75">{apt.patient_name?.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                  
                  {dayAppointments.length > 4 && (
                    <p className="text-xs text-center text-gray-500 mt-1">
                      +{dayAppointments.length - 4} {t('common.more', 'more')}
                    </p>
                  )}

                  {dayAppointments.length === 0 && (
                    <p className="text-xs text-center text-gray-400 mt-4">
                      {t('doctor.noAppointments', 'No appointments')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Appointment Details Modal
 */
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.appointmentDetails', 'Appointment Details')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={appointment.patient_name}
              size="xl"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {appointment.patient_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-gray-600">
                {appointment.patient_phone && (
                  <span>{appointment.patient_phone}</span>
                )}
              </div>
            </div>
          </div>
          <Badge variant={statusConfig.color} size="lg">
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Appointment Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">{t('common.dateTime', 'Date & Time')}</p>
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
            <p className="text-sm text-gray-500 mb-1">{t('common.bookingType', 'Booking Type')}</p>
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <BookingIcon className="w-5 h-5 text-primary-600" />
              {bookingTypeConfig.label}
            </p>
            {appointment.queue_number && (
              <p className="text-sm text-gray-500 mt-1">
                Queue #{appointment.queue_number}
              </p>
            )}
          </div>
        </div>

        {/* Reason */}
        {appointment.reason && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('common.reasonForVisit', 'Reason for Visit')}</h4>
            <p className="text-gray-700 bg-gray-50 rounded-xl p-4">
              {appointment.reason}
            </p>
          </div>
        )}

        {/* Symptoms */}
        {symptoms.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('common.symptoms', 'Symptoms')}</h4>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, index) => (
                <Badge key={index} variant="secondary">
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Patient Notes */}
        {appointment.patient_notes && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('common.patientNotes', 'Patient Notes')}</h4>
            <p className="text-gray-700 bg-amber-50 rounded-xl p-4 border border-amber-100">
              {appointment.patient_notes}
            </p>
          </div>
        )}

        {/* Doctor Notes */}
        {appointment.doctor_notes && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('common.doctorNotes', 'Doctor Notes')}</h4>
            <p className="text-gray-700 bg-blue-50 rounded-xl p-4 border border-blue-100">
              {appointment.doctor_notes}
            </p>
          </div>
        )}

        {/* Cancellation Info */}
        {appointment.status === 'cancelled' && appointment.cancellation_reason && (
          <div>
            <h4 className="font-medium text-red-900 mb-2">{t('common.cancellationReason', 'Cancellation Reason')}</h4>
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

        {/* Timestamps */}
        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
          <span>
            {t('common.bookedOn', 'Booked on')}: {formatDate(appointment.created_at, 'MMM d, yyyy h:mm a')}
          </span>
          {appointment.confirmed_at && (
            <span>
              Confirmed: {formatDate(appointment.confirmed_at, 'MMM d, h:mm a')}
            </span>
          )}
          {appointment.checked_in_at && (
            <span>
              Checked in: {formatDate(appointment.checked_in_at, 'h:mm a')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          leftIcon={<FileText className="w-4 h-4" />}
          onClick={() => {
            navigate(`/doctor/patients/${appointment.patient_id}`);
            onClose();
          }}
        >
          {t('doctor.viewPatientRecords', 'View Patient Records')}
        </Button>

        {['confirmed', 'checked_in'].includes(appointment.status) && (
          <Button
            variant="primary"
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            onClick={() => onAction('start', appointment)}
            disabled={isLoading}
          >
            {t('doctor.startConsultation', 'Start Consultation')}
          </Button>
        )}

        {appointment.status === 'pending' && (
          <Button
            variant="success"
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            onClick={() => onAction('confirm', appointment)}
            disabled={isLoading}
          >
            {t('common.confirm', 'Confirm')}
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
              {t('common.reschedule', 'Reschedule')}
            </Button>
            <Button
              variant="outline"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={() => onAction('cancel', appointment)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

/**
 * Cancel Appointment Modal
 */
const CancelAppointmentModal = ({ isOpen, onClose, appointment, onConfirm, isLoading }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error(t('errors.reasonRequired', 'Please enter a reason'));
      return;
    }
    onConfirm(appointment.id, { reason: reason.trim() });
  };

  if (!appointment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.cancelAppointment', 'Cancel Appointment')}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            {t('doctor.cancelAppointmentWarning', 'This action cannot be undone. The patient will be notified about the cancellation.')}
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar
            name={appointment.patient_name}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">{appointment.patient_name}</p>
            <p className="text-sm text-gray-500">
              {formatDate(appointment.appointment_date, 'MMM d, yyyy')} at {formatTime(appointment.start_time)}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('doctor.cancellationReason', 'Cancellation Reason')} *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder={t('doctor.enterCancellationReason', 'Enter reason for cancellation...')}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {t('common.goBack', 'Go Back')}
        </Button>
        <Button
          variant="danger"
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          onClick={handleConfirm}
          disabled={isLoading || !reason.trim()}
        >
          {t('common.cancelAppointment', 'Cancel Appointment')}
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Calendar Modal
 */
const CalendarModal = ({ isOpen, onClose, selectedDate, onDateSelect }) => {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const monthStart = startOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.selectDate', 'Select Date')}
      size="sm"
    >
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-gray-900">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Days */}
          {calendarDays.map(day => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onDateSelect(day);
                  onClose();
                }}
                className={`
                  p-2 text-sm rounded-lg transition-colors
                  ${isSelected 
                    ? 'bg-primary-600 text-white' 
                    : isTodayDate
                    ? 'bg-primary-100 text-primary-700'
                    : isCurrentMonth
                    ? 'hover:bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:bg-gray-50'
                  }
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateSelect(new Date());
              onClose();
            }}
            className="flex-1"
          >
            Today
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorAppointments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        return parseISO(dateParam);
      } catch {
        return new Date();
      }
    }
    return new Date();
  });
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'day');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // ============================================================================
  // API CALLS
  // ============================================================================

  /**
   * Fetch appointments for selected date/week
   */
  const fetchAppointments = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let allAppointments = [];

      if (viewMode === 'week') {
        // For week view, fetch appointments for each day
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        // Fetch all days in parallel
        const promises = days.map(day => 
          appointmentService.getAll({ date: format(day, 'yyyy-MM-dd') })
            .then(response => response.data?.results || response.data || [])
            .catch(() => [])
        );

        const results = await Promise.all(promises);
        allAppointments = results.flat();
      } else {
        // For day view, fetch single day
        const response = await appointmentService.getAll({ 
          date: format(selectedDate, 'yyyy-MM-dd') 
        });
        allAppointments = response.data?.results || response.data || [];
      }

      setAppointments(allAppointments);

    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(getErrorMessage(err, t('errors.failedToLoadAppointments', 'Failed to load appointments')));
      setAppointments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate, viewMode, t]);

  // Initial load and date/view change
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('date', format(selectedDate, 'yyyy-MM-dd'));
    params.set('view', viewMode);
    setSearchParams(params, { replace: true });
  }, [selectedDate, viewMode, setSearchParams]);

  // ============================================================================
  // FILTERED & SORTED APPOINTMENTS
  // ============================================================================

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.patient_name?.toLowerCase().includes(query) ||
        apt.reason?.toLowerCase().includes(query) ||
        apt.symptoms?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filter by booking type
    if (bookingTypeFilter) {
      filtered = filtered.filter(apt => apt.booking_type === bookingTypeFilter);
    }

    // Sort by time
    filtered.sort((a, b) => {
      // First by date
      const dateCompare = (a.appointment_date || '').localeCompare(b.appointment_date || '');
      if (dateCompare !== 0) return dateCompare;
      
      // Then by time
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    return filtered;
  }, [appointments, searchQuery, statusFilter, bookingTypeFilter]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  /**
   * Start consultation from appointment
   */
  const handleStartConsultation = useCallback(async (appointment) => {
    try {
      setProcessingId(appointment.id);
      
      // Create consultation from appointment
      const response = await consultationService.createFromAppointment({
        appointment_id: appointment.id
      });
      
      const consultationId = response.data?.id;
      
      if (consultationId) {
        toast.success(t('doctor.consultationStarted', 'Consultation started'));
        navigate(`/doctor/consultation/${consultationId}`);
      } else {
        throw new Error('No consultation ID returned');
      }
    } catch (err) {
      console.error('Error starting consultation:', err);
      toast.error(getErrorMessage(err, t('errors.failedToStartConsultation', 'Failed to start consultation')));
    } finally {
      setProcessingId(null);
    }
  }, [navigate, t]);

  /**
   * Confirm appointment
   */
  const handleConfirmAppointment = useCallback(async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      
      await appointmentService.confirm(appointmentId);
      
      toast.success(t('doctor.appointmentConfirmed', 'Appointment confirmed'));
      await fetchAppointments(true);
    } catch (err) {
      console.error('Error confirming appointment:', err);
      toast.error(getErrorMessage(err, t('errors.failedToConfirmAppointment', 'Failed to confirm appointment')));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments, t]);

  /**
   * Cancel appointment
   */
  const handleCancelAppointment = useCallback(async (appointmentId, data) => {
    try {
      setProcessingId(appointmentId);
      
      // API expects { reason: "string" }
      await appointmentService.cancel(appointmentId, data);
      
      toast.success(t('doctor.appointmentCancelled', 'Appointment cancelled'));
      setShowCancelModal(false);
      setAppointmentToCancel(null);
      await fetchAppointments(true);
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      toast.error(getErrorMessage(err, t('errors.failedToCancelAppointment', 'Failed to cancel appointment')));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments, t]);

  /**
   * Mark appointment as no show
   */
  const handleMarkNoShow = useCallback(async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      
      await appointmentService.noShow(appointmentId);
      
      toast.success(t('doctor.markedNoShow', 'Marked as no show'));
      await fetchAppointments(true);
    } catch (err) {
      console.error('Error marking no show:', err);
      toast.error(getErrorMessage(err, t('errors.failedToMarkNoShow', 'Failed to mark as no show')));
    } finally {
      setProcessingId(null);
    }
  }, [fetchAppointments, t]);

  const handleViewDetails = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  }, []);

  const handleViewPatient = useCallback((patientId) => {
    if (patientId) {
      navigate(`/doctor/patients/${patientId}`);
    } else {
      toast.error(t('errors.patientIdMissing', 'Patient ID not available'));
    }
  }, [navigate, t]);

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
      case 'start':
        handleStartConsultation(appointment);
        break;
      case 'confirm':
        handleConfirmAppointment(appointment.id);
        break;
      case 'reschedule':
        handleReschedule(appointment);
        break;
      case 'cancel':
        setAppointmentToCancel(appointment);
        setShowCancelModal(true);
        break;
      default:
        break;
    }
  }, [handleStartConsultation, handleConfirmAppointment, handleReschedule]);

  const handleRefresh = useCallback(() => {
    fetchAppointments(true);
  }, [fetchAppointments]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('doctor.appointments', 'Appointments')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('doctor.manageAppointments', 'Manage your appointments and schedule')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => toast.info(t('common.comingSoon', 'Coming soon'))}
          >
            {t('common.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
          >
            {t('common.dismiss', 'Dismiss')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}

      {/* Date Navigation */}
      <DateNavigationHeader
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenCalendar={() => setShowCalendarModal(true)}
      />

      {/* Stats Summary */}
      <StatsSummary appointments={filteredAppointments} />

      {/* Filters */}
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

      {/* Content */}
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
                  onConfirm={handleConfirmAppointment}
                  onCancel={(apt) => {
                    setAppointmentToCancel(apt);
                    setShowCancelModal(true);
                  }}
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
              title={t('doctor.noAppointmentsForDate', 'No appointments')}
              description={
                searchQuery || statusFilter || bookingTypeFilter
                  ? t('doctor.noAppointmentsMatchingFilters', 'No appointments match your filters')
                  : t('doctor.noAppointmentsDesc', 'You have no appointments scheduled for this date')
              }
              action={
                searchQuery || statusFilter || bookingTypeFilter ? (
                  <Button variant="outline" onClick={handleClearFilters}>
                    {t('common.clearFilters', 'Clear Filters')}
                  </Button>
                ) : !isToday(selectedDate) ? (
                  <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
                    {t('common.goToToday', 'Go to Today')}
                  </Button>
                ) : null
              }
            />
          )}
        </Card>
      )}

      {/* Modals */}
      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onAction={handleModalAction}
        isLoading={!!processingId}
      />

      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setAppointmentToCancel(null);
        }}
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