// src/pages/patient/Medicines.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Pill,
  Search,
  Filter,
  Clock,
  Calendar,
  Bell,
  BellOff,
  Check,
  CheckCircle,
  X,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Coffee,
  Utensils,
  Droplet,
  Tablets,
  Syringe,
  Package,
  FileText,
  User,
  Phone,
  ExternalLink,
  MoreVertical,
  History,
  TrendingUp,
  Target,
  Award,
  Zap,
  Volume2,
  Repeat,
  SkipForward,
  PlayCircle
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO, addDays } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { medicineService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Input,
  TextArea,
  Select,
  SearchInput,
  Tabs
} from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const MEDICINE_FORMS = {
  tablet: { icon: Tablets, label: 'Tablet', color: 'bg-blue-100 text-blue-600' },
  capsule: { icon: Package, label: 'Capsule', color: 'bg-purple-100 text-purple-600' },
  syrup: { icon: Droplet, label: 'Syrup', color: 'bg-pink-100 text-pink-600' },
  injection: { icon: Syringe, label: 'Injection', color: 'bg-red-100 text-red-600' },
  drops: { icon: Droplet, label: 'Drops', color: 'bg-cyan-100 text-cyan-600' },
  cream: { icon: Package, label: 'Cream/Ointment', color: 'bg-yellow-100 text-yellow-600' },
  inhaler: { icon: Package, label: 'Inhaler', color: 'bg-green-100 text-green-600' },
  other: { icon: Pill, label: 'Other', color: 'bg-gray-100 text-gray-600' }
};

const TIME_SLOTS = {
  morning: { icon: Sunrise, label: 'Morning', time: '8:00 AM', color: 'bg-amber-100 text-amber-600' },
  afternoon: { icon: Sun, label: 'Afternoon', time: '1:00 PM', color: 'bg-orange-100 text-orange-600' },
  evening: { icon: Sunset, label: 'Evening', time: '6:00 PM', color: 'bg-purple-100 text-purple-600' },
  night: { icon: Moon, label: 'Night', time: '10:00 PM', color: 'bg-indigo-100 text-indigo-600' }
};

const MEAL_TIMING = {
  before_meal: { icon: Utensils, label: 'Before Meal', description: '30 min before eating' },
  after_meal: { icon: Coffee, label: 'After Meal', description: '30 min after eating' },
  with_meal: { icon: Utensils, label: 'With Meal', description: 'Take while eating' },
  empty_stomach: { icon: Utensils, label: 'Empty Stomach', description: '1 hour before food' },
  any_time: { icon: Clock, label: 'Any Time', description: 'No specific timing' }
};

const REMINDER_STATUS = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  taken: { color: 'bg-green-100 text-green-700', label: 'Taken' },
  missed: { color: 'bg-red-100 text-red-700', label: 'Missed' },
  skipped: { color: 'bg-gray-100 text-gray-700', label: 'Skipped' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Adherence Stats Card
const AdherenceStatsCard = ({ stats }) => {
  const { t } = useTranslation();

  const getAdherenceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" />
          {t('medicines.adherenceStats')}
        </h3>
        <Badge variant="success">
          <TrendingUp className="w-3 h-3 mr-1" />
          {t('medicines.thisWeek')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Overall Adherence */}
        <div className="bg-white/70 rounded-xl p-4 text-center">
          <div className={`text-3xl font-bold ${getAdherenceColor(stats?.adherence || 0)}`}>
            {stats?.adherence || 0}%
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('medicines.adherence')}</p>
        </div>

        {/* Taken */}
        <div className="bg-white/70 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {stats?.taken || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('medicines.taken')}</p>
        </div>

        {/* Missed */}
        <div className="bg-white/70 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-600">
            {stats?.missed || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('medicines.missed')}</p>
        </div>

        {/* Streak */}
        <div className="bg-white/70 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-600 flex items-center justify-center gap-1">
            <Zap className="w-6 h-6" />
            {stats?.streak || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('medicines.dayStreak')}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">{t('medicines.weeklyGoal')}</span>
          <span className="font-medium">{stats?.taken || 0}/{stats?.total || 0}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              (stats?.adherence || 0) >= 90 ? 'bg-green-500' :
              (stats?.adherence || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${stats?.adherence || 0}%` }}
          />
        </div>
      </div>
    </Card>
  );
};

// Today's Reminders Section
const TodayRemindersSection = ({ reminders, onTake, onSkip, onSnooze }) => {
  const { t } = useTranslation();
  const { speak } = useVoice();

  const groupedByTime = useMemo(() => {
    const groups = {};
    Object.keys(TIME_SLOTS).forEach(slot => {
      groups[slot] = reminders?.filter(r => r.time_slot === slot) || [];
    });
    return groups;
  }, [reminders]);

  const handleTake = (reminder) => {
    onTake(reminder.id);
    speak(t('medicines.voiceTaken', { medicine: reminder.medicine_name }));
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-600" />
          {t('medicines.todaysReminders')}
        </h3>
        <Badge variant="primary">
          {reminders?.filter(r => r.status === 'pending').length || 0} {t('medicines.pending')}
        </Badge>
      </div>

      <div className="space-y-6">
        {Object.entries(TIME_SLOTS).map(([slotKey, slotConfig]) => {
          const slotReminders = groupedByTime[slotKey];
          if (!slotReminders || slotReminders.length === 0) return null;

          const SlotIcon = slotConfig.icon;
          const allTaken = slotReminders.every(r => r.status === 'taken');
          const hasPending = slotReminders.some(r => r.status === 'pending');

          return (
            <div key={slotKey} className="relative">
              {/* Time Slot Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${slotConfig.color}`}>
                  <SlotIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{slotConfig.label}</h4>
                  <p className="text-sm text-gray-500">{slotConfig.time}</p>
                </div>
                {allTaken && (
                  <Badge variant="success" className="ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('medicines.allTaken')}
                  </Badge>
                )}
              </div>

              {/* Medicines */}
              <div className="space-y-2 ml-12">
                {slotReminders.map((reminder) => {
                  const statusConfig = REMINDER_STATUS[reminder.status];
                  const formConfig = MEDICINE_FORMS[reminder.form] || MEDICINE_FORMS.other;
                  const FormIcon = formConfig.icon;
                  const isPending = reminder.status === 'pending';

                  return (
                    <div
                      key={reminder.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        reminder.status === 'taken'
                          ? 'bg-green-50 border-green-200'
                          : reminder.status === 'missed'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200 hover:border-primary-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formConfig.color}`}>
                          <FormIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {reminder.medicine_name}
                          </h5>
                          <p className="text-sm text-gray-500">
                            {reminder.dosage}
                            {reminder.meal_timing && (
                              <span className="ml-2">
                                • {MEAL_TIMING[reminder.meal_timing]?.label}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              leftIcon={<Check className="w-4 h-4" />}
                              onClick={() => handleTake(reminder)}
                            >
                              {t('medicines.take')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSkip(reminder.id)}
                            >
                              <SkipForward className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSnooze(reminder.id)}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant={statusConfig.color} className={statusConfig.color}>
                            {reminder.status === 'taken' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {reminder.status === 'missed' && <XCircle className="w-3 h-3 mr-1" />}
                            {statusConfig.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {(!reminders || reminders.length === 0) && (
          <EmptyState
            icon={CheckCircle}
            title={t('medicines.noRemindersToday')}
            description={t('medicines.noRemindersTodayDesc')}
            compact
          />
        )}
      </div>
    </Card>
  );
};

// Active Prescriptions Section
const ActivePrescriptionsSection = ({ prescriptions, onViewDetails, onSetReminder }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          {t('medicines.activePrescriptions')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/patient/health-records?tab=documents')}
        >
          {t('common.viewAll')}
        </Button>
      </div>

      {prescriptions && prescriptions.length > 0 ? (
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={prescription.doctor_name}
                    src={prescription.doctor_avatar}
                    size="sm"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Dr. {prescription.doctor_name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {prescription.doctor_specialization}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {formatDate(prescription.date, 'MMM d, yyyy')}
                  </p>
                  {prescription.valid_until && (
                    <p className="text-xs text-gray-400">
                      Valid until: {formatDate(prescription.valid_until, 'MMM d')}
                    </p>
                  )}
                </div>
              </div>

              {/* Diagnosis */}
              {prescription.diagnosis && (
                <div className="bg-blue-50 rounded-lg p-2 mb-3">
                  <p className="text-sm text-blue-700">
                    <Info className="w-4 h-4 inline mr-1" />
                    {prescription.diagnosis}
                  </p>
                </div>
              )}

              {/* Medicines */}
              <div className="space-y-2">
                {prescription.medicines?.slice(0, 3).map((medicine, index) => {
                  const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
                  const FormIcon = formConfig.icon;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <FormIcon className={`w-4 h-4 ${formConfig.color.split(' ')[1]}`} />
                        <span className="font-medium text-gray-900">{medicine.name}</span>
                        <Badge variant="secondary" size="sm">{medicine.dosage}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {medicine.frequency} • {medicine.duration}
                        </span>
                        {!medicine.has_reminder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSetReminder(medicine)}
                            className="text-primary-600"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {prescription.medicines?.length > 3 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{prescription.medicines.length - 3} more medicines
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(prescription)}
                >
                  {t('common.viewDetails')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Bell className="w-4 h-4" />}
                  onClick={() => onSetReminder(prescription)}
                >
                  {t('medicines.setReminders')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={t('medicines.noPrescriptions')}
          description={t('medicines.noPrescriptionsDesc')}
          compact
        />
      )}
    </Card>
  );
};

// My Medicines Section
const MyMedicinesSection = ({ medicines, onEdit, onDelete, onToggleReminder }) => {
  const { t } = useTranslation();
  const [expandedMedicine, setExpandedMedicine] = useState(null);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary-600" />
          {t('medicines.myMedicines')}
        </h3>
      </div>

      {medicines && medicines.length > 0 ? (
        <div className="space-y-3">
          {medicines.map((medicine) => {
            const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
            const FormIcon = formConfig.icon;
            const isExpanded = expandedMedicine === medicine.id;

            return (
              <div
                key={medicine.id}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Medicine Header */}
                <button
                  onClick={() => setExpandedMedicine(isExpanded ? null : medicine.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${formConfig.color}`}>
                      <FormIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">{medicine.name}</h4>
                      <p className="text-sm text-gray-500">
                        {medicine.dosage} • {medicine.frequency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {medicine.reminder_enabled ? (
                      <Badge variant="success" size="sm">
                        <Bell className="w-3 h-3 mr-1" />
                        {t('medicines.reminderOn')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        <BellOff className="w-3 h-3 mr-1" />
                        {t('medicines.reminderOff')}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('medicines.duration')}</p>
                        <p className="font-medium">{medicine.duration}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('medicines.startDate')}</p>
                        <p className="font-medium">
                          {formatDate(medicine.start_date, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('medicines.endDate')}</p>
                        <p className="font-medium">
                          {medicine.end_date 
                            ? formatDate(medicine.end_date, 'MMM d, yyyy')
                            : 'Ongoing'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('medicines.mealTiming')}</p>
                        <p className="font-medium">
                          {MEAL_TIMING[medicine.meal_timing]?.label || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Reminder Times */}
                    {medicine.reminder_times && medicine.reminder_times.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">{t('medicines.reminderTimes')}</p>
                        <div className="flex flex-wrap gap-2">
                          {medicine.reminder_times.map((time, index) => {
                            const slotConfig = TIME_SLOTS[time] || {};
                            const SlotIcon = slotConfig.icon || Clock;
                            return (
                              <div
                                key={index}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${slotConfig.color || 'bg-gray-100 text-gray-600'}`}
                              >
                                <SlotIcon className="w-3 h-3" />
                                {slotConfig.label || time}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Instructions */}
                    {medicine.instructions && (
                      <div className="p-3 bg-amber-50 rounded-lg mb-4">
                        <p className="text-sm text-amber-800">
                          <Info className="w-4 h-4 inline mr-1" />
                          {medicine.instructions}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={medicine.reminder_enabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        onClick={() => onToggleReminder(medicine)}
                      >
                        {medicine.reminder_enabled 
                          ? t('medicines.disableReminder')
                          : t('medicines.enableReminder')
                        }
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(medicine)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(medicine)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Pill}
          title={t('medicines.noMedicines')}
          description={t('medicines.noMedicinesDesc')}
          compact
        />
      )}
    </Card>
  );
};

// Medicine History Section
const MedicineHistorySection = ({ history, onLoadMore, hasMore }) => {
  const { t } = useTranslation();

  const groupedByDate = useMemo(() => {
    const groups = {};
    history?.forEach(item => {
      const date = format(parseISO(item.date), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [history]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-primary-600" />
          {t('medicines.history')}
        </h3>
      </div>

      {history && history.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-gray-500 mb-3">
                {isToday(parseISO(date))
                  ? t('common.today')
                  : formatDate(date, 'EEEE, MMM d')
                }
              </h4>
              <div className="space-y-2">
                {items.map((item, index) => {
                  const statusConfig = REMINDER_STATUS[item.status];
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${statusConfig.color}`}
                    >
                      <div className="flex items-center gap-3">
                        {item.status === 'taken' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : item.status === 'missed' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <SkipForward className="w-5 h-5" />
                        )}
                        <div>
                          <p className="font-medium">{item.medicine_name}</p>
                          <p className="text-sm opacity-80">
                            {item.dosage} • {formatTime(item.time)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" size="sm">
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              fullWidth
              onClick={onLoadMore}
            >
              {t('common.loadMore')}
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          icon={History}
          title={t('medicines.noHistory')}
          description={t('medicines.noHistoryDesc')}
          compact
        />
      )}
    </Card>
  );
};

// Add Medicine Modal
const AddMedicineModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    form: 'tablet',
    frequency: 'twice_daily',
    duration: '',
    duration_unit: 'days',
    meal_timing: 'after_meal',
    reminder_times: ['morning', 'evening'],
    instructions: '',
    start_date: format(new Date(), 'yyyy-MM-dd')
  });

  const frequencyOptions = [
    { value: 'once_daily', label: 'Once Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'thrice_daily', label: 'Three Times Daily' },
    { value: 'four_times_daily', label: 'Four Times Daily' },
    { value: 'as_needed', label: 'As Needed' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const toggleReminderTime = (time) => {
    setFormData(prev => ({
      ...prev,
      reminder_times: prev.reminder_times.includes(time)
        ? prev.reminder_times.filter(t => t !== time)
        : [...prev.reminder_times, time]
    }));
  };

  const handleSave = () => {
    onSave({
      ...formData,
      duration: `${formData.duration} ${formData.duration_unit}`
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('medicines.addMedicine')}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('medicines.medicineName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Metformin"
            className="col-span-2"
          />

          <Input
            label={t('medicines.dosage')}
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            placeholder="e.g., 500mg"
          />

          <Select
            label={t('medicines.form')}
            value={formData.form}
            onChange={(e) => setFormData({ ...formData, form: e.target.value })}
            options={Object.entries(MEDICINE_FORMS).map(([key, config]) => ({
              value: key,
              label: config.label
            }))}
          />

          <Select
            label={t('medicines.frequency')}
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            options={frequencyOptions}
          />

          <Select
            label={t('medicines.mealTiming')}
            value={formData.meal_timing}
            onChange={(e) => setFormData({ ...formData, meal_timing: e.target.value })}
            options={Object.entries(MEAL_TIMING).map(([key, config]) => ({
              value: key,
              label: config.label
            }))}
          />

          <div className="flex gap-2">
            <Input
              label={t('medicines.duration')}
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="7"
              min={1}
              className="flex-1"
            />
            <Select
              label="&nbsp;"
              value={formData.duration_unit}
              onChange={(e) => setFormData({ ...formData, duration_unit: e.target.value })}
              options={[
                { value: 'days', label: 'Days' },
                { value: 'weeks', label: 'Weeks' },
                { value: 'months', label: 'Months' }
              ]}
              className="w-28"
            />
          </div>

          <Input
            label={t('medicines.startDate')}
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>

        {/* Reminder Times */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('medicines.reminderTimes')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(TIME_SLOTS).map(([key, config]) => {
              const SlotIcon = config.icon;
              const isSelected = formData.reminder_times.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleReminderTime(key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <SlotIcon className={`w-5 h-5 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                      {config.label}
                    </p>
                    <p className="text-xs text-gray-500">{config.time}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <TextArea
          label={t('medicines.instructions')}
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder={t('medicines.instructionsPlaceholder')}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={!formData.name || !formData.dosage}
        >
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
};

// Prescription Details Modal
const PrescriptionDetailsModal = ({ isOpen, onClose, prescription }) => {
  const { t } = useTranslation();

  if (!prescription) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('medicines.prescriptionDetails')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Doctor Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <Avatar
            name={prescription.doctor_name}
            src={prescription.doctor_avatar}
            size="lg"
          />
          <div>
            <h4 className="font-semibold text-gray-900">
              Dr. {prescription.doctor_name}
            </h4>
            <p className="text-gray-600">{prescription.doctor_specialization}</p>
            <p className="text-sm text-gray-500">
              {formatDate(prescription.date, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Diagnosis */}
        {prescription.diagnosis && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-700 font-medium mb-1">
              {t('medicines.diagnosis')}
            </p>
            <p className="text-blue-900">{prescription.diagnosis}</p>
          </div>
        )}

        {/* Medicines List */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            {t('medicines.prescribedMedicines')}
          </h4>
          <div className="space-y-3">
            {prescription.medicines?.map((medicine, index) => {
              const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
              const FormIcon = formConfig.icon;

              return (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${formConfig.color}`}>
                      <FormIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-gray-900">{medicine.name}</h5>
                        <Badge variant="primary">{medicine.dosage}</Badge>
                      </div>
                      {medicine.generic_name && (
                        <p className="text-sm text-gray-500">{medicine.generic_name}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-gray-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {medicine.frequency}
                        </p>
                        <p className="text-gray-600">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {medicine.duration}
                        </p>
                      </div>
                      {medicine.instructions && (
                        <p className="text-sm text-amber-700 mt-2 p-2 bg-amber-50 rounded-lg">
                          <Info className="w-4 h-4 inline mr-1" />
                          {medicine.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* General Instructions */}
        {prescription.general_instructions && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-amber-700 font-medium mb-1">
              {t('medicines.generalInstructions')}
            </p>
            <p className="text-amber-900">{prescription.general_instructions}</p>
          </div>
        )}

        {/* Follow-up */}
        {prescription.follow_up_date && (
          <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl">
            <div>
              <p className="text-sm text-primary-700 font-medium">
                {t('medicines.followUpAdvised')}
              </p>
              <p className="text-primary-900 font-semibold">
                {formatDate(prescription.follow_up_date, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <Calendar className="w-6 h-6 text-primary-600" />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<Bell className="w-4 h-4" />}
        >
          {t('medicines.setReminders')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Medicines = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak } = useVoice();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data State
  const [stats, setStats] = useState(null);
  const [todayReminders, setTodayReminders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [history, setHistory] = useState([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('today');
  const tabs = [
    { id: 'today', label: t('medicines.today'), icon: Bell },
    { id: 'medicines', label: t('medicines.myMedicines'), icon: Pill },
    { id: 'prescriptions', label: t('medicines.prescriptions'), icon: FileText },
    { id: 'history', label: t('medicines.history'), icon: History }
  ];

  // Fetch all medicine data
  const fetchMedicineData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        remindersRes,
        prescriptionsRes,
        medicinesRes,
        historyRes
      ] = await Promise.allSettled([
        medicineService.getTodayReminders(),
        medicineService.getActivePrescriptions(),
        medicineService.getReminders(),
        medicineService.getReminderLogs()
      ]);

      if (remindersRes.status === 'fulfilled') {
        setTodayReminders(remindersRes.value.data || []);
      }
      if (prescriptionsRes.status === 'fulfilled') {
        setPrescriptions(prescriptionsRes.value.data || []);
      }
      if (medicinesRes.status === 'fulfilled') {
        setMedicines(medicinesRes.value.data || []);
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data || []);
      }

      // Calculate stats
      const taken = remindersRes.value?.data?.filter(r => r.status === 'taken').length || 0;
      const missed = remindersRes.value?.data?.filter(r => r.status === 'missed').length || 0;
      const total = remindersRes.value?.data?.length || 0;

      setStats({
        adherence: total > 0 ? Math.round((taken / total) * 100) : 100,
        taken,
        missed,
        total,
        streak: 5
      });

    } catch (err) {
      console.error('Error fetching medicine data:', err);
      setError(t('errors.failedToLoadMedicines'));

      // Mock data
      setTodayReminders([
        { id: 1, medicine_name: 'Metformin', dosage: '500mg', form: 'tablet', time_slot: 'morning', meal_timing: 'after_meal', status: 'taken' },
        { id: 2, medicine_name: 'Amlodipine', dosage: '5mg', form: 'tablet', time_slot: 'morning', meal_timing: 'before_meal', status: 'taken' },
        { id: 3, medicine_name: 'Metformin', dosage: '500mg', form: 'tablet', time_slot: 'evening', meal_timing: 'after_meal', status: 'pending' },
        { id: 4, medicine_name: 'Vitamin D3', dosage: '60000 IU', form: 'capsule', time_slot: 'afternoon', meal_timing: 'with_meal', status: 'pending' },
        { id: 5, medicine_name: 'Omeprazole', dosage: '20mg', form: 'capsule', time_slot: 'night', meal_timing: 'empty_stomach', status: 'pending' }
      ]);

      setPrescriptions([
        {
          id: 1,
          doctor_name: 'Sharma',
          doctor_specialization: 'General Physician',
          date: '2024-01-18',
          valid_until: '2024-02-18',
          diagnosis: 'Type 2 Diabetes, Hypertension',
          medicines: [
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice Daily', duration: '30 days', form: 'tablet' },
            { name: 'Amlodipine', dosage: '5mg', frequency: 'Once Daily', duration: '30 days', form: 'tablet' }
          ],
          general_instructions: 'Regular exercise and low-carb diet recommended.'
        },
        {
          id: 2,
          doctor_name: 'Patel',
          doctor_specialization: 'Orthopedic',
          date: '2024-01-10',
          valid_until: '2024-01-25',
          diagnosis: 'Vitamin D Deficiency',
          medicines: [
            { name: 'Vitamin D3', dosage: '60000 IU', frequency: 'Weekly', duration: '8 weeks', form: 'capsule' },
            { name: 'Calcium', dosage: '500mg', frequency: 'Once Daily', duration: '30 days', form: 'tablet' }
          ]
        }
      ]);

      setMedicines([
        {
          id: 1,
          name: 'Metformin',
          dosage: '500mg',
          form: 'tablet',
          frequency: 'Twice Daily',
          duration: '30 days',
          meal_timing: 'after_meal',
          reminder_enabled: true,
          reminder_times: ['morning', 'evening'],
          start_date: '2024-01-18',
          instructions: 'Take with or after meals to reduce stomach upset.'
        },
        {
          id: 2,
          name: 'Amlodipine',
          dosage: '5mg',
          form: 'tablet',
          frequency: 'Once Daily',
          duration: '30 days',
          meal_timing: 'any_time',
          reminder_enabled: true,
          reminder_times: ['morning'],
          start_date: '2024-01-18'
        },
        {
          id: 3,
          name: 'Vitamin D3',
          dosage: '60000 IU',
          form: 'capsule',
          frequency: 'Weekly',
          duration: '8 weeks',
          meal_timing: 'with_meal',
          reminder_enabled: false,
          reminder_times: ['afternoon'],
          start_date: '2024-01-10'
        }
      ]);

      setHistory([
        { medicine_name: 'Metformin', dosage: '500mg', status: 'taken', date: new Date().toISOString(), time: '08:00' },
        { medicine_name: 'Amlodipine', dosage: '5mg', status: 'taken', date: new Date().toISOString(), time: '08:00' },
        { medicine_name: 'Metformin', dosage: '500mg', status: 'taken', date: subDays(new Date(), 1).toISOString(), time: '20:00' },
        { medicine_name: 'Omeprazole', dosage: '20mg', status: 'missed', date: subDays(new Date(), 1).toISOString(), time: '22:00' }
      ]);

      setStats({
        adherence: 85,
        taken: 12,
        missed: 2,
        total: 14,
        streak: 5
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    fetchMedicineData();
  }, [fetchMedicineData]);

  // Handlers
  const handleTakeReminder = async (reminderId) => {
    try {
      setIsActionLoading(true);
      await medicineService.respondToReminder(reminderId, 'taken');
      setTodayReminders(prev =>
        prev.map(r => r.id === reminderId ? { ...r, status: 'taken' } : r)
      );
      // Update stats
      setStats(prev => ({
        ...prev,
        taken: prev.taken + 1,
        adherence: Math.round(((prev.taken + 1) / prev.total) * 100)
      }));
    } catch (err) {
      console.error('Error marking as taken:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSkipReminder = async (reminderId) => {
    try {
      await medicineService.respondToReminder(reminderId, 'skipped');
      setTodayReminders(prev =>
        prev.map(r => r.id === reminderId ? { ...r, status: 'skipped' } : r)
      );
    } catch (err) {
      console.error('Error skipping reminder:', err);
    }
  };

  const handleSnoozeReminder = async (reminderId) => {
    speak(t('medicines.voiceSnoozed'));
    // Would implement snooze logic
  };

  const handleAddMedicine = async (medicineData) => {
    try {
      setIsActionLoading(true);
      await medicineService.createReminder(medicineData);
      setShowAddModal(false);
      fetchMedicineData();
      speak(t('medicines.voiceMedicineAdded', { medicine: medicineData.name }));
    } catch (err) {
      console.error('Error adding medicine:', err);
      setError(t('errors.failedToAddMedicine'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditMedicine = (medicine) => {
    // Navigate to edit or open modal
    console.log('Edit medicine:', medicine);
  };

  const handleDeleteMedicine = async (medicine) => {
    if (window.confirm(t('medicines.confirmDelete', { medicine: medicine.name }))) {
      try {
        // API call to delete
        setMedicines(prev => prev.filter(m => m.id !== medicine.id));
      } catch (err) {
        console.error('Error deleting medicine:', err);
      }
    }
  };

  const handleToggleReminder = async (medicine) => {
    try {
      // API call to toggle
      setMedicines(prev =>
        prev.map(m => m.id === medicine.id 
          ? { ...m, reminder_enabled: !m.reminder_enabled } 
          : m
        )
      );
    } catch (err) {
      console.error('Error toggling reminder:', err);
    }
  };

  const handleViewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
  };

  const handleSetReminder = (prescriptionOrMedicine) => {
    // Would open reminder setup modal
    console.log('Set reminder for:', prescriptionOrMedicine);
  };

  const handleLoadMoreHistory = () => {
    // Load more history
    setHasMoreHistory(false);
  };

  // Loading
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
            {t('medicines.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('medicines.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchMedicineData}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            {t('medicines.addMedicine')}
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

      {/* Adherence Stats */}
      <AdherenceStatsCard stats={stats} />

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

      {/* Content */}
      {activeTab === 'today' && (
        <TodayRemindersSection
          reminders={todayReminders}
          onTake={handleTakeReminder}
          onSkip={handleSkipReminder}
          onSnooze={handleSnoozeReminder}
        />
      )}

      {activeTab === 'medicines' && (
        <MyMedicinesSection
          medicines={medicines}
          onEdit={handleEditMedicine}
          onDelete={handleDeleteMedicine}
          onToggleReminder={handleToggleReminder}
        />
      )}

      {activeTab === 'prescriptions' && (
        <ActivePrescriptionsSection
          prescriptions={prescriptions}
          onViewDetails={handleViewPrescription}
          onSetReminder={handleSetReminder}
        />
      )}

      {activeTab === 'history' && (
        <MedicineHistorySection
          history={history}
          onLoadMore={handleLoadMoreHistory}
          hasMore={hasMoreHistory}
        />
      )}

      {/* Modals */}
      <AddMedicineModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddMedicine}
        isLoading={isActionLoading}
      />

      <PrescriptionDetailsModal
        isOpen={showPrescriptionModal}
        onClose={() => {
          setShowPrescriptionModal(false);
          setSelectedPrescription(null);
        }}
        prescription={selectedPrescription}
      />
    </div>
  );
};

export default Medicines;