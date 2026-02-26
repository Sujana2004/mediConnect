import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ChevronLeft,
  ChevronRight,
  Settings,
  CalendarOff,
  Timer,
  Users,
  Sun,
  Moon,
  Sunrise,
  Coffee,
  Info,
  CheckCircle,
  XCircle,
  CalendarDays,
  IndianRupee,
  Loader2
} from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isPast,
  isBefore,
  parseISO
} from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import {
  getSchedules,
  getWeeklySchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  bulkUpdateSchedules,
  getExceptions,
  getUpcomingExceptions,
  addLeave,
  createException,
  deleteException,
  generateSlots
} from '../../services/api/appointmentService';
import {
  Card,
  Button,
  Badge,
  Loader,
  EmptyState,
  Modal,
  Input,
  Select,
  Tabs,
  TextArea
} from '../../components/common';

// ============================================================================
// CONSTANTS
// ============================================================================

// Backend uses 0=Monday, 6=Sunday
const DAYS_OF_WEEK = [
  { value: 0, key: 'monday', label: 'Monday', short: 'Mon' },
  { value: 1, key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 2, key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 3, key: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 4, key: 'friday', label: 'Friday', short: 'Fri' },
  { value: 5, key: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 6, key: 'sunday', label: 'Sunday', short: 'Sun' }
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time24 = `${hours.toString().padStart(2, '0')}:${minutes}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const time12 = `${hours12}:${minutes} ${period}`;
  return { value: time24, label: time12 };
});

// Backend accepts 5-120
const SLOT_DURATIONS = [
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' }
];

// Backend exception_type values
const EXCEPTION_TYPES = [
  { value: 'leave', label: 'Leave / Holiday' },
  { value: 'modified', label: 'Modified Hours' },
  { value: 'extra', label: 'Extra Working Day' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTimeDisplay = (timeString) => {
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

const getErrorMessage = (error, fallback = 'An error occurred') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data && typeof error.response.data === 'object') {
    const fieldErrors = Object.values(error.response.data).flat();
    if (fieldErrors.length > 0) return fieldErrors.join(', ');
  }
  if (error?.message) return error.message;
  return fallback;
};

// Convert JS Date.getDay() (0=Sun) to backend day_of_week (0=Mon)
const jsDateDayToBackendDay = (jsDay) => {
  // JS: 0=Sun, 1=Mon, 2=Tue ... 6=Sat
  // Backend: 0=Mon, 1=Tue ... 5=Sat, 6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
};

const getTimeIcon = (time) => {
  if (!time) return Clock;
  const hour = parseInt(time.split(':')[0]);
  if (hour < 6) return Moon;
  if (hour < 12) return Sunrise;
  if (hour < 17) return Sun;
  return Moon;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ScheduleStats = ({ schedules, exceptions }) => {
  const stats = useMemo(() => {
    const workingDays = schedules.filter(s => s.is_active).length;
    const upcomingLeaves = exceptions.filter(e =>
      !isBefore(parseISO(e.exception_date), new Date())
    ).length;

    return { workingDays, upcomingLeaves };
  }, [schedules, exceptions]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.workingDays}</p>
            <p className="text-sm text-gray-500">Working Days</p>
          </div>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <CalendarOff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.upcomingLeaves}</p>
            <p className="text-sm text-gray-500">Upcoming Leaves</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * Day Schedule Card
 * Shows one day's schedule matching backend DoctorSchedule model:
 * - start_time, end_time, break_start, break_end
 * - slot_duration_minutes, max_patients_per_slot
 * - consultation_fee, is_active
 */
const DayScheduleCard = ({ day, schedule, onEdit, onToggle, isLoading }) => {
  // schedule is a backend DoctorSchedule object or null
  const isActive = schedule?.is_active ?? false;

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      isActive ? 'border-primary-200' : 'border-gray-200 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{day.label}</h3>
          {isActive && (
            <Badge variant="success" size="sm">Active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(day, !isActive, schedule)}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(day, schedule)}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Details */}
      {isActive && schedule ? (
        <div className="p-4 space-y-3">
          {/* Working Hours */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">
              {formatTimeDisplay(schedule.start_time)} - {formatTimeDisplay(schedule.end_time)}
            </span>
          </div>

          {/* Break Time */}
          {schedule.break_start && schedule.break_end && (
            <div className="flex items-center gap-2 text-sm">
              <Coffee className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                Break: {formatTimeDisplay(schedule.break_start)} - {formatTimeDisplay(schedule.break_end)}
              </span>
            </div>
          )}

          {/* Slot Duration */}
          <div className="flex items-center gap-2 text-sm">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {schedule.slot_duration_minutes} min slots
            </span>
          </div>

          {/* Max Patients */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              Max {schedule.max_patients_per_slot} per slot
            </span>
          </div>

          {/* Consultation Fee */}
          {schedule.consultation_fee && (
            <div className="flex items-center gap-2 text-sm">
              <IndianRupee className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                ₹{schedule.consultation_fee}
              </span>
            </div>
          )}
        </div>
      ) : isActive && !schedule ? (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">No schedule configured</p>
          <Button
            variant="link" size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onEdit(day, null)}
          >
            Configure Schedule
          </Button>
        </div>
      ) : (
        <div className="p-4 text-center">
          <CalendarOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Day Off</p>
        </div>
      )}
    </div>
  );
};

/**
 * Week Calendar View
 */
const WeekCalendarView = ({
  selectedDate,
  onDateChange,
  schedules,
  exceptions,
  onAddException
}) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const getScheduleForDay = (date) => {
    const backendDay = jsDateDayToBackendDay(date.getDay());
    return schedules.find(s => s.day_of_week === backendDay && s.is_active);
  };

  const getExceptionForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return exceptions.find(e => e.exception_date === dateStr);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onDateChange(addDays(selectedDate, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-gray-900">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => onDateChange(addDays(selectedDate, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday(selectedDate) && (
            <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>
              Today
            </Button>
          )}
        </div>
        <Button
          variant="outline" size="sm"
          leftIcon={<CalendarOff className="w-4 h-4" />}
          onClick={() => onAddException(null)}
        >
          Add Leave
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const schedule = getScheduleForDay(day);
          const exception = getExceptionForDay(day);
          const isCurrentDay = isToday(day);
          const isPastDay = isPast(day) && !isCurrentDay;
          const isLeaveDay = exception?.exception_type === 'leave';
          const isModifiedDay = exception?.exception_type === 'modified';
          const isWorkingDay = !!schedule && !isLeaveDay;

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] rounded-xl border p-2 cursor-pointer transition-all hover:shadow-md ${
                isCurrentDay ? 'bg-primary-50 border-primary-200'
                : isPastDay ? 'bg-gray-50 border-gray-100 opacity-50'
                : isLeaveDay ? 'bg-red-50 border-red-200'
                : isModifiedDay ? 'bg-amber-50 border-amber-200'
                : isWorkingDay ? 'bg-white border-gray-200'
                : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => !isPastDay && onAddException(day)}
            >
              <div className="text-center mb-2">
                <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</p>
                <p className={`text-lg font-bold ${isCurrentDay ? 'text-primary-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {isLeaveDay ? (
                <div className="text-center">
                  <CalendarOff className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-red-600 font-medium">Leave</p>
                  {exception.reason && (
                    <p className="text-xs text-red-500 truncate mt-1">{exception.reason}</p>
                  )}
                </div>
              ) : isModifiedDay ? (
                <div className="text-center">
                  <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-amber-600 font-medium">Modified</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeDisplay(exception.start_time)} - {formatTimeDisplay(exception.end_time)}
                  </p>
                </div>
              ) : isWorkingDay ? (
                <div className="text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-green-600 font-medium">Working</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeDisplay(schedule.start_time)} - {formatTimeDisplay(schedule.end_time)}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <XCircle className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Day Off</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/**
 * Upcoming Leaves List
 */
const UpcomingLeavesList = ({ exceptions, onDelete }) => {
  const upcomingLeaves = useMemo(() => {
    return exceptions
      .filter(e => !isBefore(parseISO(e.exception_date), new Date()))
      .sort((a, b) => new Date(a.exception_date) - new Date(b.exception_date));
  }, [exceptions]);

  if (upcomingLeaves.length === 0) {
    return (
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-primary-600" />
          Upcoming Leaves & Exceptions
        </h3>
        <EmptyState
          icon={Calendar}
          title="No upcoming leaves"
          description="Add a leave or exception from the calendar view"
          compact
        />
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CalendarOff className="w-5 h-5 text-primary-600" />
        Upcoming Leaves & Exceptions
      </h3>
      <div className="space-y-3">
        {upcomingLeaves.map((exception) => (
          <div
            key={exception.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              exception.exception_type === 'leave'
                ? 'bg-red-50 border-red-100'
                : exception.exception_type === 'modified'
                ? 'bg-amber-50 border-amber-100'
                : 'bg-green-50 border-green-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                exception.exception_type === 'leave' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <CalendarOff className={`w-4 h-4 ${
                  exception.exception_type === 'leave' ? 'text-red-600' : 'text-amber-600'
                }`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {format(parseISO(exception.exception_date), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {exception.exception_type === 'leave'
                    ? 'Full Day Leave'
                    : exception.exception_type === 'modified'
                    ? `Modified: ${formatTimeDisplay(exception.start_time)} - ${formatTimeDisplay(exception.end_time)}`
                    : `Extra: ${formatTimeDisplay(exception.start_time)} - ${formatTimeDisplay(exception.end_time)}`
                  }
                </p>
                {exception.reason && (
                  <p className="text-xs text-gray-500 mt-1">{exception.reason}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => onDelete(exception)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * Edit Day Schedule Modal
 * Maps to backend DoctorScheduleCreateSerializer fields
 */
const EditDayScheduleModal = ({
  isOpen,
  onClose,
  day,
  schedule,
  onSave,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    start_time: '09:00',
    end_time: '17:00',
    break_start: '',
    break_end: '',
    slot_duration_minutes: 30,
    max_patients_per_slot: 1,
    consultation_fee: '',
    is_active: true
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        start_time: schedule.start_time || '09:00',
        end_time: schedule.end_time || '17:00',
        break_start: schedule.break_start || '',
        break_end: schedule.break_end || '',
        slot_duration_minutes: schedule.slot_duration_minutes || 30,
        max_patients_per_slot: schedule.max_patients_per_slot || 1,
        consultation_fee: schedule.consultation_fee || '',
        is_active: schedule.is_active ?? true
      });
    } else {
      setFormData({
        start_time: '09:00',
        end_time: '17:00',
        break_start: '',
        break_end: '',
        slot_duration_minutes: 30,
        max_patients_per_slot: 1,
        consultation_fee: '',
        is_active: true
      });
    }
  }, [schedule]);

  const handleSave = () => {
    if (!day) return;
    
    const payload = {
      day_of_week: day.value,
      start_time: formData.start_time,
      end_time: formData.end_time,
      break_start: formData.break_start || null,
      break_end: formData.break_end || null,
      slot_duration_minutes: formData.slot_duration_minutes,
      max_patients_per_slot: formData.max_patients_per_slot,
      consultation_fee: formData.consultation_fee || null,
      is_active: formData.is_active
    };
    onSave(payload, schedule?.id);
  };

  // Don't render if not open or day is null
  if (!isOpen || !day) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Schedule - ${day.label}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Working Hours */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Start Time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            options={TIME_OPTIONS}
          />
          <Select
            label="End Time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            options={TIME_OPTIONS}
          />
        </div>

        {/* Break Time */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Break Start (Optional)"
            value={formData.break_start}
            onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
            options={[{ value: '', label: 'No break' }, ...TIME_OPTIONS]}
          />
          <Select
            label="Break End (Optional)"
            value={formData.break_end}
            onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
            options={[{ value: '', label: 'No break' }, ...TIME_OPTIONS]}
          />
        </div>

        {/* Slot Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Slot Duration"
            value={formData.slot_duration_minutes}
            onChange={(e) => setFormData({ ...formData, slot_duration_minutes: parseInt(e.target.value) })}
            options={SLOT_DURATIONS}
          />
          <Input
            label="Max Patients Per Slot"
            type="number"
            value={formData.max_patients_per_slot}
            onChange={(e) => setFormData({ ...formData, max_patients_per_slot: parseInt(e.target.value) || 1 })}
            min={1}
            max={10}
          />
        </div>

        {/* Consultation Fee */}
        <Input
          label="Consultation Fee (₹) - Optional"
          type="number"
          value={formData.consultation_fee}
          onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
          placeholder="e.g. 500"
          min={0}
        />

        {/* Quick Templates */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Copy className="w-4 h-4 text-blue-600" />
            Quick Templates
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setFormData({
                ...formData,
                start_time: '09:00', end_time: '18:00',
                break_start: '13:00', break_end: '14:00'
              })}
            >
              9 AM - 6 PM (with lunch)
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setFormData({
                ...formData,
                start_time: '09:00', end_time: '13:00',
                break_start: '', break_end: ''
              })}
            >
              Morning Only
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setFormData({
                ...formData,
                start_time: '14:00', end_time: '20:00',
                break_start: '', break_end: ''
              })}
            >
              Afternoon/Evening
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setFormData({
                ...formData,
                start_time: '18:00', end_time: '21:00',
                break_start: '', break_end: ''
              })}
            >
              Evening Only
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={isLoading}
        >
          Save Schedule
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Add Leave/Exception Modal
 * Maps to backend ScheduleExceptionCreateSerializer
 */
const AddExceptionModal = ({
  isOpen,
  onClose,
  selectedDate,
  onSave,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    exception_date: '',
    exception_type: 'leave',
    start_time: '09:00',
    end_time: '17:00',
    reason: ''
  });

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        exception_date: format(selectedDate, 'yyyy-MM-dd')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        exception_date: format(new Date(), 'yyyy-MM-dd')
      }));
    }
  }, [selectedDate]);

  const handleSave = () => {
    onSave(formData);
  };

  const showTimeFields = formData.exception_type === 'modified' || formData.exception_type === 'extra';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Leave / Exception"
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={formData.exception_date}
          onChange={(e) => setFormData({ ...formData, exception_date: e.target.value })}
          min={format(new Date(), 'yyyy-MM-dd')}
        />

        <Select
          label="Exception Type"
          value={formData.exception_type}
          onChange={(e) => setFormData({ ...formData, exception_type: e.target.value })}
          options={EXCEPTION_TYPES}
        />

        {showTimeFields && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Start Time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              options={TIME_OPTIONS}
            />
            <Select
              label="End Time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              options={TIME_OPTIONS}
            />
          </div>
        )}

        <TextArea
          label="Reason (Optional)"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="e.g., Medical conference, Personal leave..."
          rows={2}
        />

        {formData.exception_type === 'leave' && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Existing appointments</p>
              <p className="text-sm text-amber-700 mt-1">
                Patients with appointments on this date will need to be notified and rescheduled.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarOff className="w-4 h-4" />}
          onClick={handleSave}
          disabled={isLoading}
        >
          Save Exception
        </Button>
      </div>
    </Modal>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isLoading, item }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Exception" size="sm">
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-gray-700">Are you sure you want to delete this exception?</p>
        {item && (
          <p className="text-gray-500 mt-2">
            {format(parseISO(item.exception_date), 'MMMM d, yyyy')}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={isLoading}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Schedule = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modals
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [editDay, setEditDay] = useState(null);
  const [editSchedule, setEditSchedule] = useState(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionDate, setExceptionDate] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState(null);

  const tabs = [
    { id: 'weekly', label: 'Weekly Schedule', icon: CalendarDays },
    { id: 'calendar', label: 'Calendar View', icon: Calendar },
    { id: 'leaves', label: 'Leaves & Exceptions', icon: CalendarOff }
  ];

  // ✅ FIXED: Fetch using correct API functions
  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const [schedulesRes, exceptionsRes] = await Promise.allSettled([
        getSchedules(),
        getExceptions()
      ]);

      // Backend returns: { success, data: [...] } or array from list
      if (schedulesRes.status === 'fulfilled') {
        const data = schedulesRes.value.data || schedulesRes.value.results || schedulesRes.value || [];
        setSchedules(Array.isArray(data) ? data : []);
      }

      if (exceptionsRes.status === 'fulfilled') {
        const data = exceptionsRes.value.data || exceptionsRes.value.results || exceptionsRes.value || [];
        setExceptions(Array.isArray(data) ? data : []);
      }

    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(getErrorMessage(err, 'Failed to load schedule'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Get schedule for a backend day_of_week value
  const getScheduleForDay = useCallback((dayValue) => {
    return schedules.find(s => s.day_of_week === dayValue) || null;
  }, [schedules]);

  // ✅ FIXED: Toggle day using correct API
  const handleToggleDay = useCallback(async (day, newActive, existingSchedule) => {
    try {
      setIsActionLoading(true);

      if (existingSchedule?.id) {
        // Update existing schedule
        await updateSchedule(existingSchedule.id, {
          ...existingSchedule,
          is_active: newActive
        });
      } else if (newActive) {
        // Create new schedule with defaults
        await createSchedule({
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
          max_patients_per_slot: 1,
          is_active: true
        });
      }

      await fetchData(true);
      toast.success(newActive ? 'Day enabled' : 'Day disabled');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update'));
      await fetchData(true);
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchData]);

  const handleEditDay = useCallback((day, schedule) => {
    setEditDay(day);
    setEditSchedule(schedule);
    setShowEditDayModal(true);
  }, []);

  // ✅ FIXED: Save schedule using correct API
  const handleSaveDaySchedule = useCallback(async (payload, existingId) => {
    try {
      setIsActionLoading(true);

      if (existingId) {
        await updateSchedule(existingId, payload);
      } else {
        await createSchedule(payload);
      }

      setShowEditDayModal(false);
      setEditDay(null);
      setEditSchedule(null);
      await fetchData(true);
      toast.success('Schedule saved');

      // Optionally regenerate slots
      try {
        await generateSlots({ days: 7 });
      } catch {
        // Non-critical
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save schedule'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchData]);

  const handleAddException = useCallback((date) => {
    setExceptionDate(date);
    setShowExceptionModal(true);
  }, []);

  // ✅ FIXED: Save exception using correct API
  const handleSaveException = useCallback(async (formData) => {
    try {
      setIsActionLoading(true);

      if (formData.exception_type === 'leave') {
        // Use addLeave for simple leave
        await addLeave(formData.exception_date, formData.reason || 'Leave');
      } else {
        // Use createException for modified/extra
        await createException({
          exception_date: formData.exception_date,
          exception_type: formData.exception_type,
          start_time: formData.start_time,
          end_time: formData.end_time,
          reason: formData.reason || ''
        });
      }

      setShowExceptionModal(false);
      setExceptionDate(null);
      await fetchData(true);
      toast.success('Exception saved');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save exception'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchData]);

  const handleDeleteException = useCallback((exception) => {
    setExceptionToDelete(exception);
    setShowDeleteModal(true);
  }, []);

  // ✅ FIXED: Delete exception using correct API
  const handleConfirmDelete = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await deleteException(exceptionToDelete.id);
      setShowDeleteModal(false);
      setExceptionToDelete(null);
      await fetchData(true);
      toast.success('Exception deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete exception'));
    } finally {
      setIsActionLoading(false);
    }
  }, [exceptionToDelete, fetchData]);

  const handleRefresh = useCallback(() => fetchData(true), [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-500 mt-1">Configure your weekly schedule and manage leaves</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh} disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="outline" size="sm"
            leftIcon={<CalendarOff className="w-4 h-4" />}
            onClick={() => handleAddException(null)}
          >
            Add Leave
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* Stats */}
      <ScheduleStats schedules={schedules} exceptions={exceptions} />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

      {/* Content */}
      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS_OF_WEEK.map((day) => (
            <DayScheduleCard
              key={day.value}
              day={day}
              schedule={getScheduleForDay(day.value)}
              onEdit={handleEditDay}
              onToggle={handleToggleDay}
              isLoading={isActionLoading}
            />
          ))}
        </div>
      )}

      {activeTab === 'calendar' && (
        <WeekCalendarView
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          schedules={schedules}
          exceptions={exceptions}
          onAddException={handleAddException}
        />
      )}

      {activeTab === 'leaves' && (
        <UpcomingLeavesList
          exceptions={exceptions}
          onDelete={handleDeleteException}
        />
      )}

      {/* Modals */}
      <EditDayScheduleModal
        isOpen={showEditDayModal}
        onClose={() => { setShowEditDayModal(false); setEditDay(null); setEditSchedule(null); }}
        day={editDay}
        schedule={editSchedule}
        onSave={handleSaveDaySchedule}
        isLoading={isActionLoading}
      />

      <AddExceptionModal
        isOpen={showExceptionModal}
        onClose={() => { setShowExceptionModal(false); setExceptionDate(null); }}
        selectedDate={exceptionDate}
        onSave={handleSaveException}
        isLoading={isActionLoading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setExceptionToDelete(null); }}
        onConfirm={handleConfirmDelete}
        isLoading={isActionLoading}
        item={exceptionToDelete}
      />
    </div>
  );
};

export default Schedule;