// src/pages/patient/Home.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Search,
  Bell,
  ChevronRight,
  Stethoscope,
  FileText,
  Pill,
  Heart,
  AlertTriangle,
  MessageSquare,
  Activity,
  User,
  Star,
  MapPin,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Loader2,
  Mic,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Sparkles,
  Shield,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  Bot,
  Scan,
  PhoneOutgoing,
  CalendarPlus,
  ClipboardList
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Loader,
  EmptyState
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { useLanguage } from '../../hooks/useLanguage';
import {
  appointmentService,
  notificationService,
  healthRecordsService,
  medicineService,
  chatbotService
} from '../../services/api';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_ACTIONS = [
  {
    id: 'find-doctor',
    icon: Stethoscope,
    label: 'Find Doctor',
    route: '/patient/doctors',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/30',
    emoji: '🩺',
    ring: 'ring-blue-400/20'
  },
  {
    id: 'book-appointment',
    icon: CalendarPlus,
    label: 'Book Appointment',
    route: '/patient/appointments/book',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/30',
    emoji: '📅',
    ring: 'ring-emerald-400/20'
  },
  {
    id: 'appointments',
    icon: ClipboardList,
    label: 'My Appointments',
    route: '/patient/appointments',
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'shadow-cyan-500/30',
    emoji: '📋',
    ring: 'ring-cyan-400/20'
  },
  {
    id: 'symptoms',
    icon: Scan,
    label: 'Check Symptoms',
    route: '/patient/symptom-checker',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/30',
    emoji: '🔍',
    ring: 'ring-violet-400/20'
  },
  {
    id: 'medicines',
    icon: Pill,
    label: 'Medicines',
    route: '/patient/medicines',
    gradient: 'from-orange-500 to-red-500',
    glow: 'shadow-orange-500/30',
    emoji: '💊',
    ring: 'ring-orange-400/20'
  },
  {
    id: 'emergency',
    icon: AlertTriangle,
    label: 'Emergency',
    route: '/patient/emergency',
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/30',
    emoji: '🚨',
    ring: 'ring-red-400/20'
  }
];

// ============================================================================
// HELPER FUNCTIONS (identical)
// ============================================================================

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good Night', icon: Moon, emoji: '🌙', gradient: 'from-indigo-600 via-purple-600 to-blue-700' };
  if (hour < 12) return { text: 'Good Morning', icon: Sunrise, emoji: '🌅', gradient: 'from-amber-500 via-orange-500 to-rose-500' };
  if (hour < 17) return { text: 'Good Afternoon', icon: Sun, emoji: '☀️', gradient: 'from-blue-500 via-cyan-500 to-teal-500' };
  if (hour < 21) return { text: 'Good Evening', icon: Sunset, emoji: '🌇', gradient: 'from-purple-600 via-pink-500 to-rose-500' };
  return { text: 'Good Night', icon: Moon, emoji: '🌙', gradient: 'from-indigo-600 via-purple-600 to-blue-700' };
};

const formatAppointmentDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  } catch {
    return dateString;
  }
};

const formatAppointmentTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

const getFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

// ============================================================================
// SHIMMER / SKELETON
// ============================================================================

const Shimmer = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-gray-200/60 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-7">
    {/* Appointment skeleton */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-6 w-52 rounded-xl" />
        <Shimmer className="h-4 w-16 rounded-lg" />
      </div>
      <div className="rounded-3xl bg-white p-5 border border-gray-100">
        <div className="flex items-start gap-4">
          <Shimmer className="w-16 h-16 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Shimmer className="h-5 w-40 rounded-lg" />
            <Shimmer className="h-4 w-28 rounded-lg" />
            <div className="flex gap-2">
              <Shimmer className="h-8 w-24 rounded-full" />
              <Shimmer className="h-8 w-24 rounded-full" />
            </div>
            <div className="flex gap-3 pt-2">
              <Shimmer className="h-11 w-28 rounded-2xl" />
              <Shimmer className="h-11 w-32 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Reminders skeleton */}
    <div className="space-y-3">
      <Shimmer className="h-6 w-44 rounded-xl" />
      {[1, 2].map(i => (
        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100">
          <div className="flex items-center gap-3">
            <Shimmer className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Shimmer className="h-5 w-36 rounded-lg" />
              <Shimmer className="h-4 w-44 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            <Shimmer className="h-11 w-16 rounded-xl" />
            <Shimmer className="h-11 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
    {/* Vitals skeleton */}
    <div className="grid grid-cols-2 gap-3">
      <Shimmer className="h-32 rounded-3xl" />
      <Shimmer className="h-32 rounded-3xl" />
    </div>
  </div>
);

// ============================================================================
// ERROR STATE
// ============================================================================

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4">
      <div className="relative mb-5">
        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-[2rem] flex items-center justify-center">
          <AlertCircle className="w-9 h-9 text-red-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-500 rounded-xl flex items-center justify-center border-2 border-white">
          <span className="text-xs">!</span>
        </div>
      </div>
      <p className="text-gray-600 text-center mb-5 text-sm leading-relaxed max-w-xs font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl text-sm font-bold hover:from-gray-900 hover:to-black active:scale-95 transition-all shadow-xl shadow-gray-900/20"
      >
        <RefreshCw className="w-4 h-4" />
        {t('common.retry', 'Try Again')}
      </button>
    </div>
  );
};

// ============================================================================
// OFFLINE STATE
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="relative mb-6">
        <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-[2.5rem] flex items-center justify-center shadow-inner">
          <WifiOff className="w-12 h-12 text-gray-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center border-3 border-white shadow-lg shadow-amber-500/30">
          <Zap className="w-5 h-5 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-2">
        {t('common.offline', "You're Offline")}
      </h3>
      <p className="text-gray-500 text-center max-w-xs text-sm leading-relaxed">
        {t('common.checkConnection', 'Check your internet connection and pull down to refresh')}
      </p>
    </div>
  );
};

// ============================================================================
// SECTION HEADER
// ============================================================================

const SectionHeader = ({ title, actionLabel, onAction, emoji }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
      {emoji && <span className="text-xl">{emoji}</span>}
      {title}
    </h2>
    {actionLabel && (
      <button
        onClick={onAction}
        className="flex items-center gap-0.5 text-sm font-bold text-primary-500 hover:text-primary-600 active:scale-95 transition-all"
      >
        {actionLabel}
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ============================================================================
// APPOINTMENT CARD
// ============================================================================

const AppointmentCard = ({ appointment, onJoin, onView }) => {
  const { t } = useTranslation();
  const isUpcoming = ['confirmed', 'pending', 'checked_in'].includes(appointment.status);
  const canJoin = appointment.status === 'in_progress' ||
    (isUpcoming && appointment.appointment_date && isToday(parseISO(appointment.appointment_date)));

  const statusStyles = {
    confirmed: { gradient: 'from-emerald-500 to-green-600', text: 'text-white' },
    in_progress: { gradient: 'from-blue-500 to-indigo-600', text: 'text-white' },
    pending: { gradient: 'from-amber-400 to-orange-500', text: 'text-white' },
    checked_in: { gradient: 'from-sky-500 to-cyan-600', text: 'text-white' },
  };
  const s = statusStyles[appointment.status] || { gradient: 'from-gray-400 to-gray-500', text: 'text-white' };

  const typeConfig = {
    online: { icon: Video, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Video' },
    phone: { icon: Phone, color: 'text-green-600', bg: 'bg-green-50', label: 'Phone' },
    default: { icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50', label: 'In-person' }
  };
  const typeStyle = typeConfig[appointment.booking_type] || typeConfig.default;
  const TypeIcon = typeStyle.icon;

  return (
    <div className="group relative">
      <div className="relative bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-500">
        {/* Top gradient accent */}
        <div className={`h-1.5 bg-gradient-to-r ${s.gradient}`} />

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar with live indicator */}
            <div className="relative flex-shrink-0">
              <Avatar
                src={appointment.doctor?.profile_photo}
                name={appointment.doctor_name || appointment.doctor?.full_name || 'Doctor'}
                size="lg"
                className="w-16 h-16 ring-4 ring-gray-50 shadow-lg"
              />
              {canJoin && (
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl border-2 border-white flex items-center justify-center shadow-lg shadow-green-500/30">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Doctor info + status */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <h3 className="font-black text-gray-900 truncate text-[16px]">
                    {appointment.doctor_name || appointment.doctor?.full_name || t('common.doctor', 'Doctor')}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {appointment.reason || appointment.booking_type_display || t('common.specialist', 'Specialist')}
                  </p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-bold bg-gradient-to-r ${s.gradient} ${s.text} shadow-sm flex-shrink-0`}>
                  {appointment.status_display || appointment.status}
                </span>
              </div>

              {/* Date / Time / Type chips */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 pl-2.5 pr-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatAppointmentDate(appointment.appointment_date)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 pl-2.5 pr-3 py-1.5 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {formatAppointmentTime(appointment.start_time)}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${typeStyle.color} ${typeStyle.bg} pl-2.5 pr-3 py-1.5 rounded-xl`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {appointment.booking_type_display || typeStyle.label}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 mt-4">
                {canJoin && appointment.booking_type === 'online' && (
                  <button
                    onClick={() => onJoin(appointment)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-600 text-white text-sm font-bold rounded-2xl hover:from-primary-600 hover:to-indigo-700 active:scale-[0.96] transition-all shadow-xl shadow-primary-500/25"
                  >
                    <Video className="w-4 h-4" />
                    {t('home.joinNow', 'Join Now')}
                  </button>
                )}
                <button
                  onClick={() => onView(appointment)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-200 active:scale-[0.96] transition-all"
                >
                  {t('common.viewDetails', 'Details')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MEDICINE REMINDER CARD
// ============================================================================

const MedicineReminderCard = ({ reminder, onTake, onSkip, isProcessing }) => {
  const { t } = useTranslation();

  return (
    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/40 transition-all duration-300">
      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-amber-500" />

      <div className="flex items-center justify-between p-4 pl-5">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              <Pill className="w-6 h-6 text-white drop-shadow-sm" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
              <span className="text-[10px]">💊</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[15px]">{reminder.medicine_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3" />
                {reminder.timing}
              </span>
              <span className="text-xs font-medium text-gray-400">{reminder.dosage}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onSkip(reminder.id)}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all disabled:opacity-40 min-h-[44px]"
          >
            {t('common.skip', 'Skip')}
          </button>
          <button
            onClick={() => onTake(reminder.id)}
            disabled={isProcessing}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl hover:from-emerald-600 hover:to-green-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 min-h-[44px] min-w-[72px] flex items-center justify-center gap-1.5"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t('common.take', 'Take')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HEALTH TIP CARD
// ============================================================================

const HealthTipCard = ({ tip }) => {
  const { t } = useTranslation();
  if (!tip) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-6 text-white shadow-2xl shadow-emerald-500/25">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.07] rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/[0.05] rounded-full translate-y-12 -translate-x-12" />
      <div className="absolute top-1/2 right-6 text-7xl opacity-[0.08] select-none -translate-y-1/2">💡</div>

      {/* Pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm uppercase tracking-wider text-white/90">
            {t('home.healthTip', 'Health Tip')}
          </h3>
        </div>
        <p className="text-[16px] leading-relaxed font-semibold text-white/95">{tip.content}</p>
        {tip.category && (
          <span className="inline-flex items-center mt-4 px-3.5 py-1.5 bg-white/20 rounded-xl text-xs font-bold backdrop-blur-sm border border-white/10">
            {tip.category}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// QUICK ACTION BUTTON
// ============================================================================

const QuickActionButton = ({ action, onClick }) => {
  const { t } = useTranslation();
  const Icon = action.icon;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2.5 p-3.5 rounded-2xl hover:bg-gray-50/80 active:scale-[0.88] transition-all duration-200 touch-manipulation"
    >
      <div className="relative">
        <div className={`w-[56px] h-[56px] bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center shadow-lg ${action.glow} ring-4 ${action.ring} group-hover:shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
          <Icon className="w-6 h-6 text-white drop-shadow-sm" strokeWidth={2.2} />
        </div>
        {/* Floating emoji */}
        <div className="absolute -top-1.5 -right-1.5 text-sm opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 select-none">
          {action.emoji}
        </div>
      </div>
      <span className="text-[11px] font-bold text-gray-600 text-center leading-tight max-w-[76px] group-hover:text-gray-900 transition-colors">
        {t(`home.${action.id}`, action.label)}
      </span>
    </button>
  );
};

// ============================================================================
// VITAL CARD
// ============================================================================

const VitalCard = ({ icon: Icon, gradient, label, value, unit, trend, emoji }) => (
  <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-2xl hover:shadow-gray-200/60 hover:border-gray-200 transition-all duration-500 group">
    {/* Background decoration */}
    <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${gradient} rounded-full opacity-[0.08] group-hover:opacity-[0.15] group-hover:scale-110 transition-all duration-500`} />
    <div className="absolute bottom-2 right-3 text-4xl opacity-[0.05] select-none group-hover:opacity-[0.1] transition-opacity">{emoji || '❤️'}</div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tight">
        {value}
        {unit && <span className="text-sm font-semibold text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  </div>
);

// ============================================================================
// QUICK ACCESS CARD
// ============================================================================

const QuickAccessCard = ({ icon: Icon, gradient, title, subtitle, onClick, emoji, pattern }) => (
  <button
    onClick={onClick}
    className="w-full relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-5 text-left hover:shadow-2xl hover:shadow-gray-200/60 hover:border-gray-200 active:scale-[0.97] transition-all duration-300 group touch-manipulation"
  >
    {/* Decorative background */}
    <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-[0.07] group-hover:opacity-[0.15] group-hover:scale-150 transition-all duration-500`} />
    <div className="absolute bottom-2 right-3 text-4xl opacity-[0.05] select-none group-hover:opacity-[0.12] group-hover:-translate-y-1 transition-all duration-300">
      {emoji}
    </div>

    <div className="relative z-10">
      <div className={`w-13 h-13 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
        style={{ width: '52px', height: '52px' }}>
        <Icon className="w-6 h-6 text-white drop-shadow-sm" />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-black text-gray-900 text-[15px]">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">{subtitle}</p>
        </div>
        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 group-hover:translate-x-0.5 transition-all flex-shrink-0">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  </button>
);

// ============================================================================
// MAIN COMPONENT (all logic identical)
// ============================================================================

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, voiceEnabled } = useVoice();
  const { currentLanguage } = useLanguage();

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [healthTip, setHealthTip] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [healthSummary, setHealthSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingReminderId, setProcessingReminderId] = useState(null);
  const [error, setError] = useState(null);
  const [appointmentError, setAppointmentError] = useState(null);
  const [reminderError, setReminderError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const greeting = getGreeting();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { loadDashboardData(); }, []);

  useEffect(() => {
    if (voiceEnabled && user && !isLoading) {
      const name = user.full_name?.split(' ')[0] || '';
      speak(`${greeting.text} ${name}. Welcome to MediConnect.`);
    }
  }, [voiceEnabled, user, isLoading]);

  const loadDashboardData = async () => {
    if (!isOnline) { setError('You are offline'); setIsLoading(false); return; }
    setIsLoading(true); setError(null); setAppointmentError(null); setReminderError(null);
    try {
      const results = await Promise.allSettled([
        appointmentService.getUpcomingAppointments(),
        medicineService.getTodayReminders(),
        chatbotService.getDailyHealthTip(),
        notificationService.getUnreadCount(),
        healthRecordsService.getHealthAnalytics()
      ]);
      if (results[0].status === 'fulfilled') setUpcomingAppointments(results[0].value.data || []);
      else { setAppointmentError('Failed to load appointments'); console.error('Appointments error:', results[0].reason); }
      if (results[1].status === 'fulfilled') setTodayReminders(results[1].value.data || []);
      else { setReminderError('Failed to load reminders'); console.error('Reminders error:', results[1].reason); }
      if (results[2].status === 'fulfilled') setHealthTip(results[2].value.data);
      if (results[3].status === 'fulfilled') setUnreadNotifications(results[3].value.data?.count || 0);
      if (results[4].status === 'fulfilled') setHealthSummary(results[4].value.data);
    } catch (err) { console.error('Error loading dashboard:', err); setError(err.message || 'Failed to load dashboard'); }
    finally { setIsLoading(false); }
  };

  const handleRefresh = async () => { setIsRefreshing(true); await loadDashboardData(); setIsRefreshing(false); };

  const handleMedicineTaken = async (reminderId) => {
    setProcessingReminderId(reminderId);
    try {
      await medicineService.respondToReminder(reminderId, { action: 'taken' });
      setTodayReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.success(t('home.medicineTaken', 'Medicine marked as taken'));
      if (voiceEnabled) speak('Medicine marked as taken');
    } catch (err) { toast.error(t('home.medicineError', 'Failed to update reminder')); }
    finally { setProcessingReminderId(null); }
  };

  const handleMedicineSkipped = async (reminderId) => {
    setProcessingReminderId(reminderId);
    try {
      await medicineService.respondToReminder(reminderId, { action: 'skipped' });
      setTodayReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.info(t('home.medicineSkipped', 'Medicine skipped'));
    } catch (err) { toast.error(t('home.medicineError', 'Failed to update reminder')); }
    finally { setProcessingReminderId(null); }
  };

  const handleJoinAppointment = (appointment) => {
    const appointmentId = appointment?.id || appointment?.appointment_id;
    if (!appointmentId) {
      toast.error(t('appointments.notFound', 'Appointment not found'));
      return;
    }
    navigate(`/patient/consultation/${appointmentId}`);
  };
  const handleViewAppointment = (appointment) => {
    const appointmentId = appointment?.id || appointment?.appointment_id;
    if (!appointmentId) {
      toast.error(t('appointments.notFound', 'Appointment not found'));
      return;
    }
    navigate(`/patient/appointments/${appointmentId}`);
  };
  const handleQuickAction = (action) => { navigate(action.route); };

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className={`relative overflow-hidden bg-gradient-to-br ${greeting.gradient} text-white px-5 pt-8 pb-10`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.04] rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{greeting.emoji}</span>
              <span className="text-sm font-medium text-white/80">{t(`home.${greeting.text.toLowerCase().replace(' ', '')}`, greeting.text)}</span>
            </div>
            <h1 className="text-2xl font-black">{getFirstName(user?.full_name) || t('home.user', 'User')}</h1>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-50 rounded-t-[2rem]" />
        </div>
        <OfflineState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 pb-24">

      {/* ── HEADER ── */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${greeting.gradient} text-white`}>
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.04] rounded-full -translate-y-36 translate-x-36" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-white/[0.04] rounded-full translate-y-28 -translate-x-28" />
          <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-white/[0.02] rounded-full" />
        </div>

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 px-5 pt-6 pb-9">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                <span className="text-xl">{greeting.emoji}</span>
              </div>
              <span className="text-sm font-semibold text-white/70">
                {t(`home.${greeting.text.toLowerCase().replace(' ', '')}`, greeting.text)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/25 rounded-2xl transition-all touch-manipulation active:scale-90 backdrop-blur-sm border border-white/10"
                aria-label={t('common.refresh', 'Refresh')}
              >
                <RefreshCw className={`w-[18px] h-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => navigate('/patient/notifications')}
                className="relative w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/25 rounded-2xl transition-all touch-manipulation active:scale-90 backdrop-blur-sm border border-white/10"
                aria-label={t('common.notifications', 'Notifications')}
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] bg-gradient-to-r from-red-500 to-rose-500 rounded-full text-[10px] flex items-center justify-center font-black px-1 ring-2 ring-white/20 shadow-lg shadow-red-500/30 animate-pulse">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-7">
            <h1 className="text-[28px] font-black mb-1 tracking-tight leading-tight">
              {getFirstName(user?.full_name) || t('home.user', 'User')}
              <span className="inline-block ml-2 animate-[wave_2s_ease-in-out_infinite]">👋</span>
            </h1>
            <p className="text-white/60 text-sm font-medium">
              {t('home.welcomeMessage', 'How can we help you today?')}
            </p>
          </div>

          {/* Search Bar */}
          <button
            onClick={() => navigate('/patient/doctors')}
            className="w-full flex items-center gap-3 bg-white/[0.12] hover:bg-white/[0.18] active:bg-white/[0.22] backdrop-blur-xl rounded-2xl px-4 py-4 transition-all duration-200 border border-white/[0.1] shadow-xl shadow-black/5"
          >
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Search className="w-[18px] h-[18px] text-white/60" />
            </div>
            <span className="text-white/45 text-sm flex-1 text-left font-medium">
              {t('home.searchDoctors', 'Search doctors, specialties...')}
            </span>
            {voiceEnabled && (
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors">
                <Mic className="w-[18px] h-[18px] text-white/60" />
              </div>
            )}
          </button>
        </div>

        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-b from-transparent to-gray-50 rounded-t-[2rem]" />
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-3 pb-4 space-y-7 max-w-lg mx-auto">

        {/* Quick Actions */}
        <div className="relative bg-white rounded-3xl border border-gray-100 p-3 shadow-sm overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 0.5px, transparent 0)', backgroundSize: '16px 16px' }} />
          <div className="relative grid grid-cols-3 gap-0">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.id}
                action={action}
                onClick={() => handleQuickAction(action)}
              />
            ))}
          </div>
        </div>

        {/* Loading / Error / Content */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <>
            {/* Upcoming Appointments */}
            <div>
              <SectionHeader
                emoji="📋"
                title={t('home.upcomingAppointments', 'Upcoming Appointments')}
                actionLabel={t('common.viewAll', 'View All')}
                onAction={() => navigate('/patient/appointments')}
              />

              {appointmentError ? (
                <ErrorState message={appointmentError} onRetry={loadDashboardData} />
              ) : upcomingAppointments.length === 0 ? (
                <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-8 text-center">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -translate-y-16 translate-x-16 opacity-50" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-50 rounded-full translate-y-12 -translate-x-12 opacity-50" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-blue-100 rounded-[1.75rem] flex items-center justify-center mx-auto mb-5">
                      <Calendar className="w-9 h-9 text-primary-400" />
                    </div>
                    <h3 className="font-black text-gray-900 mb-2 text-lg">
                      {t('home.noAppointments', 'No upcoming appointments')}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
                      {t('home.noAppointmentsDesc', 'Book an appointment with a doctor to get started')}
                    </p>
                    <button
                      onClick={() => navigate('/patient/doctors')}
                      className="inline-flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white text-sm font-bold rounded-2xl hover:from-primary-600 hover:to-indigo-700 active:scale-95 transition-all shadow-xl shadow-primary-500/25"
                    >
                      <Stethoscope className="w-5 h-5" />
                      {t('home.findDoctor', 'Find a Doctor')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onJoin={handleJoinAppointment}
                      onView={handleViewAppointment}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Medicine Reminders */}
            {todayReminders.length > 0 && (
              <div>
                <SectionHeader
                  emoji="💊"
                  title={t('home.medicineReminders', 'Medicine Reminders')}
                  actionLabel={t('common.viewAll', 'View All')}
                  onAction={() => navigate('/patient/medicines')}
                />
                {reminderError ? (
                  <ErrorState message={reminderError} onRetry={loadDashboardData} />
                ) : (
                  <div className="space-y-3">
                    {todayReminders.slice(0, 3).map((reminder) => (
                      <MedicineReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onTake={handleMedicineTaken}
                        onSkip={handleMedicineSkipped}
                        isProcessing={processingReminderId === reminder.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Health Summary */}
            {healthSummary && (
              <div>
                <SectionHeader
                  emoji="📊"
                  title={t('home.healthSummary', 'Health Summary')}
                  actionLabel={t('common.viewAll', 'View All')}
                  onAction={() => navigate('/patient/health-records')}
                />
                <div className="grid grid-cols-2 gap-3">
                  {healthSummary.latest_vitals?.blood_pressure && (
                    <VitalCard
                      icon={Activity}
                      gradient="from-red-500 to-rose-600"
                      label={t('health.bloodPressure', 'Blood Pressure')}
                      value={healthSummary.latest_vitals.blood_pressure}
                      trend="Normal"
                      emoji="🫀"
                    />
                  )}
                  {healthSummary.latest_vitals?.heart_rate && (
                    <VitalCard
                      icon={HeartPulse}
                      gradient="from-pink-500 to-rose-600"
                      label={t('health.heartRate', 'Heart Rate')}
                      value={healthSummary.latest_vitals.heart_rate}
                      unit="bpm"
                      trend="Good"
                      emoji="💓"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Health Tip */}
            {healthTip && (
              <div>
                <SectionHeader emoji="✨" title={t('home.dailyTip', 'Daily Health Tip')} />
                <HealthTipCard tip={healthTip} />
              </div>
            )}

            {/* Quick Access */}
            <div>
              <SectionHeader emoji="⚡" title={t('home.quickAccess', 'Quick Access')} />
              <div className="grid grid-cols-2 gap-3">
                <QuickAccessCard
                  icon={Bot}
                  gradient="from-indigo-500 to-violet-600"
                  title={t('home.healthAssistant', 'AI Assistant')}
                  subtitle={t('home.askAnything', 'Ask health questions')}
                  onClick={() => navigate('/patient/chatbot')}
                  emoji="🤖"
                />
                <QuickAccessCard
                  icon={Scan}
                  gradient="from-fuchsia-500 to-purple-600"
                  title={t('home.symptomChecker', 'Symptom Check')}
                  subtitle={t('home.checkSymptoms', 'AI diagnosis')}
                  onClick={() => navigate('/patient/symptom-checker')}
                  emoji="🔬"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          50% { transform: rotate(-10deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;