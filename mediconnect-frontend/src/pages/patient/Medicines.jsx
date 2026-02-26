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
import { format, isToday, isTomorrow, isPast, parseISO, addDays, subDays } from 'date-fns';

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
  tablet: { icon: Tablets, label: 'Tablet', color: 'bg-violet-100 text-violet-600' },
  capsule: { icon: Package, label: 'Capsule', color: 'bg-purple-100 text-purple-600' },
  syrup: { icon: Droplet, label: 'Syrup', color: 'bg-fuchsia-100 text-fuchsia-600' },
  injection: { icon: Syringe, label: 'Injection', color: 'bg-rose-100 text-rose-600' },
  drops: { icon: Droplet, label: 'Drops', color: 'bg-indigo-100 text-indigo-600' },
  cream: { icon: Package, label: 'Cream/Ointment', color: 'bg-purple-100 text-purple-600' },
  inhaler: { icon: Package, label: 'Inhaler', color: 'bg-violet-100 text-violet-600' },
  other: { icon: Pill, label: 'Other', color: 'bg-gray-100 text-gray-600' }
};

const TIME_SLOTS = {
  morning: { icon: Sunrise, label: 'Morning', time: '8:00 AM', color: 'bg-amber-50 text-amber-600 border border-amber-200' },
  afternoon: { icon: Sun, label: 'Afternoon', time: '1:00 PM', color: 'bg-orange-50 text-orange-600 border border-orange-200' },
  evening: { icon: Sunset, label: 'Evening', time: '6:00 PM', color: 'bg-purple-50 text-purple-600 border border-purple-200' },
  night: { icon: Moon, label: 'Night', time: '10:00 PM', color: 'bg-indigo-50 text-indigo-600 border border-indigo-200' }
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
  taken: { color: 'bg-emerald-100 text-emerald-700', label: 'Taken' },
  missed: { color: 'bg-red-100 text-red-700', label: 'Missed' },
  skipped: { color: 'bg-gray-100 text-gray-700', label: 'Skipped' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Adherence Stats Card
const AdherenceStatsCard = ({ stats }) => {
  const { t } = useTranslation();

  const getBarColor = (percentage) => {
    if (percentage >= 90) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 70) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 shadow-xl shadow-purple-200/50">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            {t('medicines.adherenceStats')}
          </h3>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">
            <TrendingUp className="w-3 h-3" />
            {t('medicines.thisWeek')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
            <div className="text-3xl font-extrabold text-white">
              {stats?.adherence || 0}%
            </div>
            <p className="text-sm text-white/70 mt-1 font-medium">{t('medicines.adherence')}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
            <div className="text-3xl font-extrabold text-emerald-300">
              {stats?.taken || 0}
            </div>
            <p className="text-sm text-white/70 mt-1 font-medium">{t('medicines.taken')}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
            <div className="text-3xl font-extrabold text-rose-300">
              {stats?.missed || 0}
            </div>
            <p className="text-sm text-white/70 mt-1 font-medium">{t('medicines.missed')}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
            <div className="text-3xl font-extrabold text-amber-300 flex items-center justify-center gap-1">
              <Zap className="w-6 h-6" />
              {stats?.streak || 0}
            </div>
            <p className="text-sm text-white/70 mt-1 font-medium">{t('medicines.dayStreak')}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/80 font-medium">{t('medicines.weeklyGoal')}</span>
            <span className="font-bold text-white">{stats?.taken || 0}/{stats?.total || 0}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
            <div
              className={`h-3 rounded-full bg-gradient-to-r ${getBarColor(stats?.adherence || 0)} transition-all duration-700 ease-out shadow-lg`}
              style={{ width: `${stats?.adherence || 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
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

  const pendingCount = reminders?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-100/30 overflow-hidden">
      <div className="p-6 border-b border-purple-50 bg-gradient-to-r from-purple-50/50 to-violet-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-200/50">
              <Bell className="w-5 h-5 text-white" />
            </div>
            {t('medicines.todaysReminders')}
          </h3>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-bold animate-pulse">
              {pendingCount} {t('medicines.pending')}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {Object.entries(TIME_SLOTS).map(([slotKey, slotConfig]) => {
          const slotReminders = groupedByTime[slotKey];
          if (!slotReminders || slotReminders.length === 0) return null;

          const SlotIcon = slotConfig.icon;
          const allTaken = slotReminders.every(r => r.status === 'taken');

          return (
            <div key={slotKey} className="relative">
              <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 to-transparent" />

              <div className="flex items-center gap-4 mb-4">
                <div className={`p-2.5 rounded-xl ${slotConfig.color} shadow-sm`}>
                  <SlotIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{slotConfig.label}</h4>
                  <p className="text-sm text-gray-400">{slotConfig.time}</p>
                </div>
                {allTaken && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('medicines.allTaken')}
                  </span>
                )}
              </div>

              <div className="space-y-3 ml-14">
                {slotReminders.map((reminder) => {
                  const statusConfig = REMINDER_STATUS[reminder.status];
                  const formConfig = MEDICINE_FORMS[reminder.form] || MEDICINE_FORMS.other;
                  const FormIcon = formConfig.icon;
                  const isPending = reminder.status === 'pending';

                  return (
                    <div
                      key={reminder.id}
                      className={`group relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                        reminder.status === 'taken'
                          ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                          : reminder.status === 'missed'
                          ? 'bg-red-50/50 border-red-200 shadow-sm'
                          : 'bg-white border-purple-100 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/30 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${formConfig.color} transition-transform group-hover:scale-110`}>
                          <FormIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900">
                            {reminder.medicine_name}
                          </h5>
                          <p className="text-sm text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-gray-500">{reminder.dosage}</span>
                            {reminder.meal_timing && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span>{MEAL_TIMING[reminder.meal_timing]?.label}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleTake(reminder)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-purple-200/50 hover:shadow-purple-300/50 hover:from-violet-600 hover:to-purple-700 transition-all duration-200 active:scale-95"
                            >
                              <Check className="w-4 h-4" />
                              {t('medicines.take')}
                            </button>
                            <button
                              onClick={() => onSkip(reminder.id)}
                              className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Skip"
                            >
                              <SkipForward className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onSnooze(reminder.id)}
                              className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Snooze"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${statusConfig.color}`}>
                            {reminder.status === 'taken' && <CheckCircle className="w-3.5 h-3.5" />}
                            {reminder.status === 'missed' && <XCircle className="w-3.5 h-3.5" />}
                            {statusConfig.label}
                          </span>
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
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{t('medicines.noRemindersToday')}</h4>
            <p className="text-gray-400 text-sm">{t('medicines.noRemindersTodayDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Active Prescriptions Section
const ActivePrescriptionsSection = ({ prescriptions, onViewDetails, onSetReminder }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-100/30 overflow-hidden">
      <div className="p-6 border-b border-purple-50 bg-gradient-to-r from-purple-50/50 to-violet-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-200/50">
              <FileText className="w-5 h-5 text-white" />
            </div>
            {t('medicines.activePrescriptions')}
          </h3>
          <button
            onClick={() => navigate('/patient/health-records?tab=documents')}
            className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
          >
            {t('common.viewAll')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {prescriptions && prescriptions.length > 0 ? (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="group border-2 border-purple-100 rounded-2xl p-5 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={prescription.doctor_name}
                      src={prescription.doctor_avatar}
                      size="sm"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900">
                        Dr. {prescription.doctor_name}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {prescription.doctor_specialization}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">
                      {formatDate(prescription.date, 'MMM d, yyyy')}
                    </p>
                    {prescription.valid_until && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Valid until: {formatDate(prescription.valid_until, 'MMM d')}
                      </p>
                    )}
                  </div>
                </div>

                {prescription.diagnosis && (
                  <div className="bg-violet-50 rounded-xl p-3 mb-4 border border-violet-100">
                    <p className="text-sm text-violet-700 font-medium flex items-center gap-2">
                      <Info className="w-4 h-4 text-violet-500" />
                      {prescription.diagnosis}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {prescription.medicines?.slice(0, 3).map((medicine, index) => {
                    const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
                    const FormIcon = formConfig.icon;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-purple-50/50 transition-colors border-b border-purple-50 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <FormIcon className={`w-4 h-4 ${formConfig.color.split(' ')[1]}`} />
                          <span className="font-semibold text-gray-900">{medicine.name}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                            {medicine.dosage}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-400">
                            {medicine.frequency} • {medicine.duration}
                          </span>
                          {!medicine.has_reminder && (
                            <button
                              onClick={() => onSetReminder(medicine)}
                              className="p-1.5 rounded-lg text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {prescription.medicines?.length > 3 && (
                    <p className="text-sm text-purple-400 text-center pt-2 font-medium">
                      +{prescription.medicines.length - 3} more medicines
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-purple-50">
                  <button
                    onClick={() => onViewDetails(prescription)}
                    className="px-4 py-2 rounded-xl border-2 border-purple-200 text-purple-600 text-sm font-bold hover:bg-purple-50 transition-colors"
                  >
                    {t('common.viewDetails')}
                  </button>
                  <button
                    onClick={() => onSetReminder(prescription)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-purple-200/50 hover:shadow-purple-300/50 hover:from-violet-600 hover:to-purple-700 transition-all active:scale-95"
                  >
                    <Bell className="w-4 h-4" />
                    {t('medicines.setReminders')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{t('medicines.noPrescriptions')}</h4>
            <p className="text-gray-400 text-sm">{t('medicines.noPrescriptionsDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// My Medicines Section
const MyMedicinesSection = ({ medicines, onEdit, onDelete, onToggleReminder }) => {
  const { t } = useTranslation();
  const [expandedMedicine, setExpandedMedicine] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-100/30 overflow-hidden">
      <div className="p-6 border-b border-purple-50 bg-gradient-to-r from-purple-50/50 to-violet-50/50">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-200/50">
            <Pill className="w-5 h-5 text-white" />
          </div>
          {t('medicines.myMedicines')}
        </h3>
      </div>

      <div className="p-6">
        {medicines && medicines.length > 0 ? (
          <div className="space-y-3">
            {medicines.map((medicine) => {
              const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
              const FormIcon = formConfig.icon;
              const isExpanded = expandedMedicine === medicine.id;

              return (
                <div
                  key={medicine.id}
                  className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
                    isExpanded
                      ? 'border-purple-300 shadow-lg shadow-purple-100/30'
                      : 'border-purple-100 hover:border-purple-200'
                  }`}
                >
                  <button
                    onClick={() => setExpandedMedicine(isExpanded ? null : medicine.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-purple-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${formConfig.color} transition-transform ${isExpanded ? 'scale-110' : ''}`}>
                        <FormIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900">{medicine.name}</h4>
                        <p className="text-sm text-gray-400 mt-0.5">
                          <span className="font-medium text-gray-500">{medicine.dosage}</span>
                          <span className="mx-1.5">•</span>
                          {medicine.frequency}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {medicine.reminder_enabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200">
                          <Bell className="w-3 h-3" />
                          {t('medicines.reminderOn')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold border border-gray-200">
                          <BellOff className="w-3 h-3" />
                          {t('medicines.reminderOff')}
                        </span>
                      )}
                      <div className={`p-1 rounded-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                  >
                    <div className="px-5 pb-5 pt-2 border-t border-purple-50 bg-gradient-to-b from-purple-50/30 to-white">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-xl p-3 border border-purple-100">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('medicines.duration')}</p>
                          <p className="font-bold text-gray-900 mt-1">{medicine.duration}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-purple-100">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('medicines.startDate')}</p>
                          <p className="font-bold text-gray-900 mt-1">
                            {formatDate(medicine.start_date, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-purple-100">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('medicines.endDate')}</p>
                          <p className="font-bold text-gray-900 mt-1">
                            {medicine.end_date
                              ? formatDate(medicine.end_date, 'MMM d, yyyy')
                              : 'Ongoing'
                            }
                          </p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-purple-100">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('medicines.mealTiming')}</p>
                          <p className="font-bold text-gray-900 mt-1">
                            {MEAL_TIMING[medicine.meal_timing]?.label || '-'}
                          </p>
                        </div>
                      </div>

                      {medicine.reminder_times && medicine.reminder_times.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{t('medicines.reminderTimes')}</p>
                          <div className="flex flex-wrap gap-2">
                            {medicine.reminder_times.map((time, index) => {
                              const slotConfig = TIME_SLOTS[time] || {};
                              const SlotIcon = slotConfig.icon || Clock;
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${slotConfig.color || 'bg-gray-100 text-gray-600'}`}
                                >
                                  <SlotIcon className="w-3.5 h-3.5" />
                                  {slotConfig.label || time}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {medicine.instructions && (
                        <div className="p-3 bg-amber-50 rounded-xl mb-4 border border-amber-100">
                          <p className="text-sm text-amber-700 font-medium flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                            {medicine.instructions}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => onToggleReminder(medicine)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                            medicine.reminder_enabled
                              ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          {medicine.reminder_enabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                          {medicine.reminder_enabled
                            ? t('medicines.disableReminder')
                            : t('medicines.enableReminder')
                          }
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(medicine)}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(medicine)}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <Pill className="w-8 h-8 text-purple-500" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{t('medicines.noMedicines')}</h4>
            <p className="text-gray-400 text-sm">{t('medicines.noMedicinesDesc')}</p>
          </div>
        )}
      </div>
    </div>
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
    <div className="bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-100/30 overflow-hidden">
      <div className="p-6 border-b border-purple-50 bg-gradient-to-r from-purple-50/50 to-violet-50/50">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-200/50">
            <History className="w-5 h-5 text-white" />
          </div>
          {t('medicines.history')}
        </h3>
      </div>

      <div className="p-6">
        {history && history.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
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
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                          item.status === 'taken'
                            ? 'bg-emerald-50/50 border-emerald-100'
                            : item.status === 'missed'
                            ? 'bg-red-50/50 border-red-100'
                            : 'bg-gray-50/50 border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${
                            item.status === 'taken'
                              ? 'bg-emerald-100'
                              : item.status === 'missed'
                              ? 'bg-red-100'
                              : 'bg-gray-100'
                          }`}>
                            {item.status === 'taken' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : item.status === 'missed' ? (
                              <XCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <SkipForward className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{item.medicine_name}</p>
                            <p className="text-sm text-gray-400">
                              {item.dosage}
                              <span className="mx-1">•</span>
                              {formatTime(item.time)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={onLoadMore}
                className="w-full py-3 rounded-xl border-2 border-dashed border-purple-200 text-purple-600 font-bold text-sm hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                {t('common.loadMore')}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-purple-500" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{t('medicines.noHistory')}</h4>
            <p className="text-gray-400 text-sm">{t('medicines.noHistoryDesc')}</p>
          </div>
        )}
      </div>
    </div>
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
      <div className="space-y-5">
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

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            {t('medicines.reminderTimes')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TIME_SLOTS).map(([key, config]) => {
              const SlotIcon = config.icon;
              const isSelected = formData.reminder_times.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleReminderTime(key)}
                  className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-purple-400 bg-purple-50 shadow-lg shadow-purple-100/50'
                      : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    <SlotIcon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                      {config.label}
                    </p>
                    <p className="text-xs text-gray-400">{config.time}</p>
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

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-100">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!formData.name || !formData.dosage || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-200/50 hover:shadow-purple-300/50 hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t('common.save')}
        </button>
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
        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-100">
          <Avatar
            name={prescription.doctor_name}
            src={prescription.doctor_avatar}
            size="lg"
          />
          <div>
            <h4 className="font-bold text-gray-900 text-lg">
              Dr. {prescription.doctor_name}
            </h4>
            <p className="text-purple-600 font-medium">{prescription.doctor_specialization}</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {formatDate(prescription.date, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {prescription.diagnosis && (
          <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
            <p className="text-xs text-violet-500 font-bold uppercase tracking-wider mb-1">
              {t('medicines.diagnosis')}
            </p>
            <p className="text-violet-900 font-semibold">{prescription.diagnosis}</p>
          </div>
        )}

        <div>
          <h4 className="font-bold text-gray-900 mb-3">
            {t('medicines.prescribedMedicines')}
          </h4>
          <div className="space-y-3">
            {prescription.medicines?.map((medicine, index) => {
              const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
              const FormIcon = formConfig.icon;

              return (
                <div
                  key={index}
                  className="p-4 bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${formConfig.color}`}>
                      <FormIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-gray-900">{medicine.name}</h5>
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                          {medicine.dosage}
                        </span>
                      </div>
                      {medicine.generic_name && (
                        <p className="text-sm text-gray-400">{medicine.generic_name}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        <p className="text-gray-500 flex items-center gap-1.5 font-medium">
                          <Clock className="w-4 h-4 text-purple-400" />
                          {medicine.frequency}
                        </p>
                        <p className="text-gray-500 flex items-center gap-1.5 font-medium">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          {medicine.duration}
                        </p>
                      </div>
                      {medicine.instructions && (
                        <p className="text-sm text-amber-700 mt-3 p-2.5 bg-amber-50 rounded-xl border border-amber-100 font-medium flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
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

        {prescription.general_instructions && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">
              {t('medicines.generalInstructions')}
            </p>
            <p className="text-amber-900 font-medium">{prescription.general_instructions}</p>
          </div>
        )}

        {prescription.follow_up_date && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-100">
            <div>
              <p className="text-xs text-purple-500 font-bold uppercase tracking-wider">
                {t('medicines.followUpAdvised')}
              </p>
              <p className="text-purple-900 font-bold mt-1">
                {formatDate(prescription.follow_up_date, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-100">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
        >
          {t('common.close')}
        </button>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-200/50 hover:shadow-purple-300/50 hover:from-violet-600 hover:to-purple-700 transition-all active:scale-95"
        >
          <Bell className="w-4 h-4" />
          {t('medicines.setReminders')}
        </button>
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
    console.log('Edit medicine:', medicine);
  };

  const handleDeleteMedicine = async (medicine) => {
    if (window.confirm(t('medicines.confirmDelete', { medicine: medicine.name }))) {
      try {
        setMedicines(prev => prev.filter(m => m.id !== medicine.id));
      } catch (err) {
        console.error('Error deleting medicine:', err);
      }
    }
  };

  const handleToggleReminder = async (medicine) => {
    try {
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
    console.log('Set reminder for:', prescriptionOrMedicine);
  };

  const handleLoadMoreHistory = () => {
    setHasMoreHistory(false);
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse mx-auto flex items-center justify-center shadow-lg shadow-purple-200/50">
              <Pill className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-gray-400 mt-4 font-medium">Loading your medicines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* ============================================================== */}
      {/* REDESIGNED PAGE HEADER — clean on desktop, compact on mobile   */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-purple-100 shadow-lg shadow-purple-100/20">
        {/* Subtle decorative blobs – desktop only */}
        <div className="hidden md:block absolute -top-10 -right-10 w-40 h-40 bg-purple-100/40 rounded-full blur-2xl" />
        <div className="hidden md:block absolute -bottom-8 -left-8 w-32 h-32 bg-violet-100/40 rounded-full blur-2xl" />

        <div className="relative z-10 p-5 md:p-8">
          {/* Top row: icon + title  |  date badge (desktop) */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 md:p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-300/40">
                <Pill className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  {t('medicines.title')}
                </h1>
                <p className="text-gray-400 text-sm md:text-base mt-0.5">
                  {t('medicines.subtitle')}
                </p>
              </div>
            </div>

            {/* Desktop-only date pill */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 text-sm font-semibold border border-purple-100">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMM d')}
            </span>
          </div>

          {/* Action buttons — row beneath on desktop, inline on mobile */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={fetchMedicineData}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-purple-200 text-purple-600 text-sm font-bold hover:bg-purple-50 active:scale-[0.97] transition-all sm:w-auto w-full"
            >
              <RefreshCw className="w-4 h-4" />
              {t('common.refresh')}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-purple-300/40 hover:shadow-purple-400/40 hover:from-violet-600 hover:to-purple-700 active:scale-[0.97] transition-all sm:w-auto w-full"
            >
              <Plus className="w-4 h-4" />
              {t('medicines.addMedicine')}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-red-700 text-sm font-medium flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Adherence Stats */}
      <AdherenceStatsCard stats={stats} />

      {/* Custom Tabs */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-1.5">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-200/50'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="transition-all duration-300">
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
      </div>

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