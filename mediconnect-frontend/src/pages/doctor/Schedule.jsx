// src/pages/doctor/Schedule.jsx
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
  Check,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ChevronLeft,
  ChevronRight,
  Settings,
  CalendarOff,
  CalendarPlus,
  Timer,
  Users,
  Video,
  Phone,
  Sun,
  Moon,
  Sunrise,
  Coffee,
  ToggleLeft,
  ToggleRight,
  Info,
  CheckCircle,
  XCircle,
  MoreVertical,
  Repeat,
  CalendarDays,
  ClipboardList
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
  isBefore,
  addWeeks,
  parseISO
} from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { appointmentService } from '../../services/api';
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
import { formatTime, formatDate } from '../../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS_OF_WEEK = [
  { value: 0, key: 'sunday', label: 'Sunday', short: 'Sun' },
  { value: 1, key: 'monday', label: 'Monday', short: 'Mon' },
  { value: 2, key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 3, key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 4, key: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 5, key: 'friday', label: 'Friday', short: 'Fri' },
  { value: 6, key: 'saturday', label: 'Saturday', short: 'Sat' }
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time24 = `${hours.toString().padStart(2, '0')}:${minutes}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const time12 = `${hours12}:${minutes} ${period}`;
  return { value: time24, label: time12 };
});

const SLOT_DURATIONS = [
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' }
];

const CONSULTATION_TYPES = [
  { value: 'both', label: 'Video & Audio' },
  { value: 'video', label: 'Video Only' },
  { value: 'audio', label: 'Audio Only' }
];

const LEAVE_TYPES = [
  { value: 'full_day', label: 'Full Day Leave' },
  { value: 'half_day_morning', label: 'Half Day (Morning)' },
  { value: 'half_day_afternoon', label: 'Half Day (Afternoon)' },
  { value: 'custom', label: 'Custom Hours' }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Schedule Stats
const ScheduleStats = ({ stats }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t('doctor.workingDays'),
      value: stats?.workingDays || 0,
      icon: Calendar,
      color: 'bg-primary-50 text-primary-600'
    },
    {
      label: t('doctor.totalSlots'),
      value: stats?.totalSlots || 0,
      icon: Clock,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: t('doctor.avgPatientsPerDay'),
      value: stats?.avgPatients || 0,
      icon: Users,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: t('doctor.upcomingLeaves'),
      value: stats?.upcomingLeaves || 0,
      icon: CalendarOff,
      color: 'bg-amber-50 text-amber-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} padding="sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Day Schedule Card
const DayScheduleCard = ({
  day,
  schedule,
  onEdit,
  onToggle,
  isLoading
}) => {
  const { t } = useTranslation();

  const isEnabled = schedule?.is_enabled ?? false;
  const slots = schedule?.slots || [];

  const getTimeIcon = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 6) return Moon;
    if (hour < 12) return Sunrise;
    if (hour < 17) return Sun;
    return Moon;
  };

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      isEnabled ? 'border-primary-200' : 'border-gray-200 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{t(`days.${day.key}`)}</h3>
          {isEnabled && slots.length > 0 && (
            <Badge variant="success" size="sm">
              {slots.length} {t('doctor.slots')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(day.value, !isEnabled)}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEnabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {isEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(day)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Slots */}
      {isEnabled ? (
        slots.length > 0 ? (
          <div className="p-4 space-y-2">
            {slots.map((slot, index) => {
              const TimeIcon = getTimeIcon(slot.start_time);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <TimeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {slot.max_patients || '∞'} {t('doctor.patients')}
                    </Badge>
                    {slot.consultation_type === 'video' && (
                      <Video className="w-4 h-4 text-blue-500" />
                    )}
                    {slot.consultation_type === 'audio' && (
                      <Phone className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">{t('doctor.noSlotsConfigured')}</p>
            <Button
              variant="link"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => onEdit(day)}
            >
              {t('doctor.addSlots')}
            </Button>
          </div>
        )
      ) : (
        <div className="p-4 text-center">
          <CalendarOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('doctor.dayOff')}</p>
        </div>
      )}
    </div>
  );
};

// Week Calendar View
const WeekCalendarView = ({
  selectedDate,
  onDateChange,
  schedules,
  exceptions,
  onAddException
}) => {
  const { t } = useTranslation();

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const handlePrevWeek = () => {
    onDateChange(addDays(selectedDate, -7));
  };

  const handleNextWeek = () => {
    onDateChange(addDays(selectedDate, 7));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getScheduleForDay = (date) => {
    const dayOfWeek = date.getDay();
    return schedules?.find(s => s.day_of_week === dayOfWeek);
  };

  const getExceptionForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return exceptions?.find(e => e.date === dateStr);
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <h3 className="font-semibold text-gray-900">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </h3>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
          >
            {t('common.today')}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<CalendarOff className="w-4 h-4" />}
          onClick={() => onAddException(null)}
        >
          {t('doctor.addLeave')}
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const schedule = getScheduleForDay(day);
          const exception = getExceptionForDay(day);
          const isCurrentDay = isToday(day);
          const isPastDay = isPast(day) && !isCurrentDay;
          const isWorkingDay = schedule?.is_enabled && !exception;
          const isLeaveDay = !!exception;

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] rounded-xl border p-2 cursor-pointer transition-all hover:shadow-md ${
                isCurrentDay
                  ? 'bg-primary-50 border-primary-200'
                  : isPastDay
                  ? 'bg-gray-50 border-gray-100 opacity-50'
                  : isLeaveDay
                  ? 'bg-red-50 border-red-200'
                  : isWorkingDay
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => !isPastDay && onAddException(day)}
            >
              {/* Day Header */}
              <div className="text-center mb-2">
                <p className="text-xs text-gray-500 uppercase">
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-bold ${
                  isCurrentDay ? 'text-primary-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Status */}
              {isLeaveDay ? (
                <div className="text-center">
                  <CalendarOff className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-red-600 font-medium">
                    {exception.leave_type === 'full_day' 
                      ? t('doctor.leave')
                      : t('doctor.halfDay')
                    }
                  </p>
                  {exception.reason && (
                    <p className="text-xs text-red-500 truncate mt-1">
                      {exception.reason}
                    </p>
                  )}
                </div>
              ) : isWorkingDay ? (
                <div className="text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-green-600 font-medium">
                    {t('doctor.working')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {schedule.slots?.length || 0} {t('doctor.slots')}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <XCircle className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">
                    {t('doctor.dayOff')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// Upcoming Leaves List
const UpcomingLeavesList = ({ exceptions, onEdit, onDelete }) => {
  const { t } = useTranslation();

  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    return exceptions
      ?.filter(e => !isBefore(parseISO(e.date), today))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5) || [];
  }, [exceptions]);

  if (upcomingLeaves.length === 0) {
    return (
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-primary-600" />
          {t('doctor.upcomingLeaves')}
        </h3>
        <EmptyState
          icon={Calendar}
          title={t('doctor.noUpcomingLeaves')}
          description={t('doctor.noUpcomingLeavesDesc')}
          compact
        />
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CalendarOff className="w-5 h-5 text-primary-600" />
        {t('doctor.upcomingLeaves')}
      </h3>

      <div className="space-y-3">
        {upcomingLeaves.map((leave) => (
          <div
            key={leave.id}
            className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <CalendarOff className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {formatDate(leave.date, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {leave.leave_type === 'full_day' 
                    ? t('doctor.fullDayLeave')
                    : leave.leave_type === 'half_day_morning'
                    ? t('doctor.halfDayMorning')
                    : leave.leave_type === 'half_day_afternoon'
                    ? t('doctor.halfDayAfternoon')
                    : `${formatTime(leave.start_time)} - ${formatTime(leave.end_time)}`
                  }
                </p>
                {leave.reason && (
                  <p className="text-xs text-gray-500 mt-1">{leave.reason}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(leave)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(leave)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Edit Day Schedule Modal
const EditDayScheduleModal = ({
  isOpen,
  onClose,
  day,
  schedule,
  onSave,
  isLoading
}) => {
  const { t } = useTranslation();
  const [slots, setSlots] = useState([]);
  const [defaultSlotDuration, setDefaultSlotDuration] = useState(15);
  const [defaultMaxPatients, setDefaultMaxPatients] = useState(10);
  const [consultationType, setConsultationType] = useState('both');

  useEffect(() => {
    if (schedule?.slots) {
      setSlots(schedule.slots);
    } else {
      setSlots([]);
    }
    setDefaultSlotDuration(schedule?.slot_duration || 15);
    setDefaultMaxPatients(schedule?.max_patients_per_slot || 10);
    setConsultationType(schedule?.consultation_type || 'both');
  }, [schedule]);

  const handleAddSlot = () => {
    const lastSlot = slots[slots.length - 1];
    const newStartTime = lastSlot ? lastSlot.end_time : '09:00';
    const newEndHour = parseInt(newStartTime.split(':')[0]) + 3;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:00`;

    setSlots([
      ...slots,
      {
        start_time: newStartTime,
        end_time: newEndTime,
        max_patients: defaultMaxPatients,
        consultation_type: consultationType
      }
    ]);
  };

  const handleUpdateSlot = (index, field, value) => {
    const updatedSlots = [...slots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setSlots(updatedSlots);
  };

  const handleRemoveSlot = (index) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      day_of_week: day.value,
      is_enabled: true,
      slots,
      slot_duration: defaultSlotDuration,
      max_patients_per_slot: defaultMaxPatients,
      consultation_type: consultationType
    });
  };

  const handleApplyToAll = () => {
    const updatedSlots = slots.map(slot => ({
      ...slot,
      max_patients: defaultMaxPatients,
      consultation_type: consultationType
    }));
    setSlots(updatedSlots);
  };

  if (!day) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('doctor.editSchedule')} - ${t(`days.${day.key}`)}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Default Settings */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary-600" />
            {t('doctor.defaultSettings')}
          </h4>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label={t('doctor.slotDuration')}
              value={defaultSlotDuration}
              onChange={(e) => setDefaultSlotDuration(parseInt(e.target.value))}
              options={SLOT_DURATIONS}
            />

            <Input
              label={t('doctor.maxPatientsPerSlot')}
              type="number"
              value={defaultMaxPatients}
              onChange={(e) => setDefaultMaxPatients(parseInt(e.target.value))}
              min={1}
              max={50}
            />

            <Select
              label={t('doctor.consultationType')}
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              options={CONSULTATION_TYPES}
            />
          </div>

          {slots.length > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={handleApplyToAll}
              className="mt-2"
            >
              {t('doctor.applyToAllSlots')}
            </Button>
          )}
        </div>

        {/* Time Slots */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              {t('doctor.timeSlots')} ({slots.length})
            </h4>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddSlot}
            >
              {t('doctor.addSlot')}
            </Button>
          </div>

          {slots.length > 0 ? (
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Select
                      value={slot.start_time}
                      onChange={(e) => handleUpdateSlot(index, 'start_time', e.target.value)}
                      options={TIME_SLOTS}
                      className="w-28"
                    />
                    <span className="text-gray-400">—</span>
                    <Select
                      value={slot.end_time}
                      onChange={(e) => handleUpdateSlot(index, 'end_time', e.target.value)}
                      options={TIME_SLOTS}
                      className="w-28"
                    />
                  </div>

                  <Input
                    type="number"
                    value={slot.max_patients || defaultMaxPatients}
                    onChange={(e) => handleUpdateSlot(index, 'max_patients', parseInt(e.target.value))}
                    min={1}
                    className="w-20"
                    placeholder="Max"
                  />

                  <Select
                    value={slot.consultation_type || consultationType}
                    onChange={(e) => handleUpdateSlot(index, 'consultation_type', e.target.value)}
                    options={CONSULTATION_TYPES}
                    className="w-32"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSlot(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">{t('doctor.noSlotsAdded')}</p>
              <Button
                variant="link"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleAddSlot}
              >
                {t('doctor.addFirstSlot')}
              </Button>
            </div>
          )}
        </div>

        {/* Quick Templates */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Copy className="w-4 h-4 text-blue-600" />
            {t('doctor.quickTemplates')}
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlots([
                { start_time: '09:00', end_time: '13:00', max_patients: 15 },
                { start_time: '14:00', end_time: '18:00', max_patients: 15 }
              ])}
            >
              {t('doctor.template9to6')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlots([
                { start_time: '09:00', end_time: '12:00', max_patients: 12 }
              ])}
            >
              {t('doctor.templateMorningOnly')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlots([
                { start_time: '14:00', end_time: '20:00', max_patients: 20 }
              ])}
            >
              {t('doctor.templateAfternoonEvening')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlots([
                { start_time: '18:00', end_time: '21:00', max_patients: 10 }
              ])}
            >
              {t('doctor.templateEveningOnly')}
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          loading={isLoading}
        >
          {t('common.saveChanges')}
        </Button>
      </div>
    </Modal>
  );
};

// Add Leave Modal
const AddLeaveModal = ({
  isOpen,
  onClose,
  selectedDate,
  exception,
  onSave,
  isLoading
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    date: '',
    leave_type: 'full_day',
    start_time: '09:00',
    end_time: '18:00',
    reason: '',
    notify_patients: true
  });

  useEffect(() => {
    if (exception) {
      setFormData({
        date: exception.date,
        leave_type: exception.leave_type,
        start_time: exception.start_time || '09:00',
        end_time: exception.end_time || '18:00',
        reason: exception.reason || '',
        notify_patients: exception.notify_patients ?? true
      });
    } else if (selectedDate) {
      setFormData({
        date: format(selectedDate, 'yyyy-MM-dd'),
        leave_type: 'full_day',
        start_time: '09:00',
        end_time: '18:00',
        reason: '',
        notify_patients: true
      });
    } else {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        leave_type: 'full_day',
        start_time: '09:00',
        end_time: '18:00',
        reason: '',
        notify_patients: true
      });
    }
  }, [exception, selectedDate]);

  const handleSave = () => {
    onSave({
      ...formData,
      id: exception?.id
    });
  };

  const isEditMode = !!exception;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('doctor.editLeave') : t('doctor.addLeave')}
      size="md"
    >
      <div className="space-y-4">
        {/* Date */}
        <Input
          label={t('common.date')}
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          min={format(new Date(), 'yyyy-MM-dd')}
        />

        {/* Leave Type */}
        <Select
          label={t('doctor.leaveType')}
          value={formData.leave_type}
          onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
          options={LEAVE_TYPES}
        />

        {/* Custom Time */}
        {formData.leave_type === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('common.startTime')}
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              options={TIME_SLOTS}
            />
            <Select
              label={t('common.endTime')}
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              options={TIME_SLOTS}
            />
          </div>
        )}

        {/* Reason */}
        <TextArea
          label={t('doctor.reason')}
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder={t('doctor.leaveReasonPlaceholder')}
          rows={2}
        />

        {/* Notify Patients */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">{t('doctor.notifyPatients')}</p>
            <p className="text-sm text-gray-500">{t('doctor.notifyPatientsDesc')}</p>
          </div>
          <button
            onClick={() => setFormData({ ...formData, notify_patients: !formData.notify_patients })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.notify_patients ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.notify_patients ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{t('doctor.leaveWarning')}</p>
            <p className="text-sm text-amber-700 mt-1">
              {t('doctor.leaveWarningDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<CalendarOff className="w-4 h-4" />}
          onClick={handleSave}
          loading={isLoading}
        >
          {isEditMode ? t('common.saveChanges') : t('doctor.addLeave')}
        </Button>
      </div>
    </Modal>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isLoading, item }) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.deleteLeave')}
      size="sm"
    >
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-gray-700">
          {t('doctor.deleteLeaveConfirm')}
        </p>
        {item && (
          <p className="text-gray-500 mt-2">
            {formatDate(item.date, 'MMMM d, yyyy')}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={isLoading}
        >
          {t('common.delete')}
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
  const { user } = useAuth();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // View
  const [activeTab, setActiveTab] = useState('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modals
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState(null);
  const [leaveToEdit, setLeaveToEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState(null);

  // Tabs
  const tabs = [
    { id: 'weekly', label: t('doctor.weeklySchedule'), icon: CalendarDays },
    { id: 'calendar', label: t('doctor.calendarView'), icon: Calendar },
    { id: 'leaves', label: t('doctor.leavesExceptions'), icon: CalendarOff }
  ];

  // Fetch schedule data
  const fetchScheduleData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [schedulesRes, exceptionsRes] = await Promise.allSettled([
        appointmentService.getSchedules(),
        appointmentService.getExceptions()
      ]);

      if (schedulesRes.status === 'fulfilled') {
        setSchedules(schedulesRes.value.data?.results || schedulesRes.value.data || []);
      }

      if (exceptionsRes.status === 'fulfilled') {
        setExceptions(exceptionsRes.value.data?.results || exceptionsRes.value.data || []);
      }

      // Calculate stats
      const workingDays = schedulesRes.status === 'fulfilled'
        ? (schedulesRes.value.data || []).filter(s => s.is_enabled).length
        : 0;
      
      const totalSlots = schedulesRes.status === 'fulfilled'
        ? (schedulesRes.value.data || []).reduce((acc, s) => acc + (s.slots?.length || 0), 0)
        : 0;

      const upcomingLeaves = exceptionsRes.status === 'fulfilled'
        ? (exceptionsRes.value.data || []).filter(e => !isBefore(parseISO(e.date), new Date())).length
        : 0;

      setStats({
        workingDays,
        totalSlots,
        avgPatients: 25,
        upcomingLeaves
      });

    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(t('errors.failedToLoadSchedule'));

      // Mock data for demo
      setSchedules([
        { day_of_week: 1, is_enabled: true, slots: [
          { start_time: '09:00', end_time: '13:00', max_patients: 15 },
          { start_time: '14:00', end_time: '18:00', max_patients: 15 }
        ]},
        { day_of_week: 2, is_enabled: true, slots: [
          { start_time: '09:00', end_time: '13:00', max_patients: 12 },
          { start_time: '15:00', end_time: '19:00', max_patients: 12 }
        ]},
        { day_of_week: 3, is_enabled: true, slots: [
          { start_time: '10:00', end_time: '14:00', max_patients: 15 }
        ]},
        { day_of_week: 4, is_enabled: true, slots: [
          { start_time: '09:00', end_time: '13:00', max_patients: 15 },
          { start_time: '14:00', end_time: '18:00', max_patients: 15 }
        ]},
        { day_of_week: 5, is_enabled: true, slots: [
          { start_time: '09:00', end_time: '12:00', max_patients: 10 }
        ]},
        { day_of_week: 6, is_enabled: false, slots: [] },
        { day_of_week: 0, is_enabled: false, slots: [] }
      ]);

      setExceptions([
        { id: 1, date: '2024-01-26', leave_type: 'full_day', reason: 'Medical Conference' },
        { id: 2, date: '2024-02-14', leave_type: 'half_day_morning', reason: 'Personal' }
      ]);

      setStats({
        workingDays: 5,
        totalSlots: 8,
        avgPatients: 25,
        upcomingLeaves: 2
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchScheduleData();
  }, [fetchScheduleData]);

  const handleToggleDay = useCallback(async (dayOfWeek, isEnabled) => {
    try {
      setIsActionLoading(true);
      
      // Update local state optimistically
      setSchedules(prev => prev.map(s => 
        s.day_of_week === dayOfWeek ? { ...s, is_enabled: isEnabled } : s
      ));

      // API call
      await appointmentService.bulkUpdateSchedule({
        day_of_week: dayOfWeek,
        is_enabled: isEnabled
      });

    } catch (err) {
      console.error('Error toggling day:', err);
      setError(t('errors.failedToUpdateSchedule'));
      // Revert on error
      fetchScheduleData();
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchScheduleData, t]);

  const handleEditDay = useCallback((day) => {
    setSelectedDay(day);
    setShowEditDayModal(true);
  }, []);

  const handleSaveDaySchedule = useCallback(async (scheduleData) => {
    try {
      setIsActionLoading(true);
      
      await appointmentService.bulkUpdateSchedule(scheduleData);
      
      setShowEditDayModal(false);
      setSelectedDay(null);
      fetchScheduleData();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(t('errors.failedToSaveSchedule'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchScheduleData, t]);

  const handleAddLeave = useCallback((date) => {
    setLeaveDate(date);
    setLeaveToEdit(null);
    setShowLeaveModal(true);
  }, []);

  const handleEditLeave = useCallback((leave) => {
    setLeaveToEdit(leave);
    setLeaveDate(null);
    setShowLeaveModal(true);
  }, []);

  const handleSaveLeave = useCallback(async (leaveData) => {
    try {
      setIsActionLoading(true);
      
      await appointmentService.addLeave(leaveData);
      
      setShowLeaveModal(false);
      setLeaveDate(null);
      setLeaveToEdit(null);
      fetchScheduleData();
    } catch (err) {
      console.error('Error saving leave:', err);
      setError(t('errors.failedToSaveLeave'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchScheduleData, t]);

  const handleDeleteLeave = useCallback((leave) => {
    setLeaveToDelete(leave);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDeleteLeave = useCallback(async () => {
    try {
      setIsActionLoading(true);
      
      // API call to delete
      console.log('Delete leave:', leaveToDelete.id);
      
      setShowDeleteModal(false);
      setLeaveToDelete(null);
      fetchScheduleData();
    } catch (err) {
      console.error('Error deleting leave:', err);
      setError(t('errors.failedToDeleteLeave'));
    } finally {
      setIsActionLoading(false);
    }
  }, [leaveToDelete, fetchScheduleData, t]);

  // Get schedule for day
  const getScheduleForDay = useCallback((dayValue) => {
    return schedules.find(s => s.day_of_week === dayValue) || { is_enabled: false, slots: [] };
  }, [schedules]);

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
            {t('doctor.schedule')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('doctor.scheduleDesc')}
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
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CalendarOff className="w-4 h-4" />}
            onClick={() => handleAddLeave(null)}
          >
            {t('doctor.addLeave')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            {t('common.dismiss')}
          </Button>
        </div>
      )}

      {/* Stats */}
      <ScheduleStats stats={stats} />

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

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
          onAddException={handleAddLeave}
        />
      )}

      {activeTab === 'leaves' && (
        <UpcomingLeavesList
          exceptions={exceptions}
          onEdit={handleEditLeave}
          onDelete={handleDeleteLeave}
        />
      )}

      {/* Modals */}
      <EditDayScheduleModal
        isOpen={showEditDayModal}
        onClose={() => {
          setShowEditDayModal(false);
          setSelectedDay(null);
        }}
        day={selectedDay}
        schedule={selectedDay ? getScheduleForDay(selectedDay.value) : null}
        onSave={handleSaveDaySchedule}
        isLoading={isActionLoading}
      />

      <AddLeaveModal
        isOpen={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setLeaveDate(null);
          setLeaveToEdit(null);
        }}
        selectedDate={leaveDate}
        exception={leaveToEdit}
        onSave={handleSaveLeave}
        isLoading={isActionLoading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setLeaveToDelete(null);
        }}
        onConfirm={handleConfirmDeleteLeave}
        isLoading={isActionLoading}
        item={leaveToDelete}
      />
    </div>
  );
};

export default Schedule;