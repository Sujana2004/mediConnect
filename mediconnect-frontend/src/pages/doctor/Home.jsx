// src/pages/doctor/Home.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar,
  Clock,
  Video,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  UserCheck,
  Activity,
  Stethoscope,
  ChevronRight,
  Bell,
  RefreshCw,
  Phone,
  MessageSquare,
  FileText,
  Timer,
  UserPlus,
  ClipboardList,
  Loader2,
  Sparkles,
  Zap,
  Heart,
  Star,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import {
  appointmentService,
  consultationService,
  notificationService
} from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState
} from '../../components/common';

// ============================================================================
// HELPER FUNCTIONS
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

const formatDate = (date, formatStr = 'EEEE, MMMM d') => {
  if (!date) return '';
  try {
    return format(new Date(date), formatStr);
  } catch {
    return date;
  }
};

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  } catch {
    return dateString;
  }
};

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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Greeting Section with animated gradient
 */
const GreetingSection = ({ doctorName, specialization }) => {
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-primary-600 to-fuchsia-600 animate-gradient-x" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl" />
      <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-white/30 rounded-full animate-ping" />
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
      
      {/* Mesh pattern overlay */}
      <div className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} 
      />
      
      <div className="relative p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Welcome back</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {getGreeting()}, <br className="md:hidden" />
              Dr. {doctorName}! 
              <span className="inline-block ml-2 animate-wave">👋</span>
            </h1>
            <div className="text-white/80 flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Stethoscope className="w-4 h-4" />
              </div>
              {specialization || 'Specialist'}
            </div>
          </div>
          
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-2xl">
              <p className="text-white/70 text-sm">Today</p>
              <p className="text-xl font-bold">
                {formatDate(new Date())}
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced Stats Card Component with hover effects
 */
const StatCard = ({ icon: Icon, label, value, subValue, trend, color = 'primary', onClick }) => {
  const colorConfigs = {
    primary: {
      bg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      iconBg: 'bg-white/20',
      light: 'bg-violet-50',
      ring: 'ring-violet-200',
      shadow: 'hover:shadow-violet-500/25'
    },
    success: {
      bg: 'bg-gradient-to-br from-emerald-500 to-green-600',
      iconBg: 'bg-white/20',
      light: 'bg-emerald-50',
      ring: 'ring-emerald-200',
      shadow: 'hover:shadow-emerald-500/25'
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      iconBg: 'bg-white/20',
      light: 'bg-amber-50',
      ring: 'ring-amber-200',
      shadow: 'hover:shadow-amber-500/25'
    },
    danger: {
      bg: 'bg-gradient-to-br from-rose-500 to-red-600',
      iconBg: 'bg-white/20',
      light: 'bg-rose-50',
      ring: 'ring-rose-200',
      shadow: 'hover:shadow-rose-500/25'
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      iconBg: 'bg-white/20',
      light: 'bg-blue-50',
      ring: 'ring-blue-200',
      shadow: 'hover:shadow-blue-500/25'
    }
  };

  const config = colorConfigs[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl ${config.bg} text-white
        ${onClick ? 'cursor-pointer' : ''}
        transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${config.shadow}
        group
      `}
      onClick={onClick}
    >
      {/* Decorative circle */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute -right-2 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${config.iconBg} backdrop-blur-sm`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend !== undefined && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${trend > 0 ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'}
            `}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
          {onClick && (
            <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-4xl font-bold tracking-tight">{value}</p>
          <p className="text-white/80 mt-1 font-medium">{label}</p>
          {subValue && (
            <p className="text-white/60 text-sm mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced Current Queue Card with glassmorphism
 */
const CurrentQueueCard = ({
  queue,
  onCallNext,
  onViewQueue,
  onRejoinConsultation,
  isLoading
}) => {
  const currentPatient = queue?.find(q => q.status === 'in_consultation');
  const waitingPatients = queue?.filter(q => q.status === 'waiting') || [];
  const waitingCount = waitingPatients.length;
  const nextPatient = waitingPatients[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-lg shadow-gray-200/50">
      {/* Header gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-primary-500 to-fuchsia-500" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-violet-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Current Queue</h3>
              <p className="text-sm text-gray-500">Manage your patients</p>
            </div>
          </div>
          <div className={`
            px-4 py-2 rounded-full font-semibold text-sm
            ${waitingCount > 5 
              ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' 
              : 'bg-violet-100 text-violet-700 ring-2 ring-violet-200'
            }
          `}>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${waitingCount > 5 ? 'bg-amber-500' : 'bg-violet-500'} animate-pulse`} />
              {waitingCount} waiting
            </span>
          </div>
        </div>

        {currentPatient ? (
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 mb-5">
            {/* Animated pulse ring */}
            <div className="absolute top-4 right-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar 
                  name={currentPatient.patient_name} 
                  size="lg"
                  className="ring-4 ring-white/30"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                  <Video className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 text-white">
                <p className="text-xs uppercase tracking-wider text-white/60 mb-1">In Consultation</p>
                <p className="text-xl font-bold">
                  {currentPatient.patient_name}
                </p>
                <p className="text-white/80">
                  {currentPatient.reason || 'General Consultation'}
                </p>
              </div>
              <Button
                className="bg-white text-violet-600 hover:bg-white/90 shadow-lg"
                size="md"
                leftIcon={<Video className="w-4 h-4" />}
                onClick={() => {
                  if (currentPatient.consultation_id) {
                    onRejoinConsultation(currentPatient.consultation_id);
                  }
                }}
              >
                Rejoin
              </Button>
            </div>
          </div>
        ) : nextPatient ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-5 border border-gray-200">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/5 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <Avatar 
                  name={nextPatient.patient_name}
                  size="lg"
                  className="ring-4 ring-white shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center ring-2 ring-white">
                  <Clock className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                    Next in Line
                  </span>
                  {nextPatient.wait_time_minutes !== undefined && (
                    <span className="text-xs text-gray-400">
                      • Waiting {nextPatient.wait_time_minutes} min
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {nextPatient.patient_name}
                </p>
                <p className="text-gray-600">
                  {nextPatient.reason || 'General Consultation'}
                </p>
              </div>
              <Button
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30"
                size="md"
                leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                onClick={onCallNext}
                disabled={isLoading}
              >
                Start Session
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Queue is Empty</h4>
            <p className="text-gray-500 mt-1">No patients waiting. Great job! 🎉</p>
          </div>
        )}

        <button
          onClick={onViewQueue}
          className="w-full py-4 px-6 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-between group transition-all"
        >
          <span className="font-medium text-gray-700">View Full Queue</span>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

/**
 * Enhanced Today's Appointments Card
 */
const TodayAppointmentsCard = ({ appointments, onViewAll, onStartConsultation }) => {
  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        color: 'bg-amber-100 text-amber-700', 
        icon: Clock, 
        label: 'Pending',
        dot: 'bg-amber-500'
      },
      confirmed: { 
        color: 'bg-green-100 text-green-700', 
        icon: CheckCircle, 
        label: 'Confirmed',
        dot: 'bg-green-500'
      },
      checked_in: { 
        color: 'bg-blue-100 text-blue-700', 
        icon: UserCheck, 
        label: 'Checked In',
        dot: 'bg-blue-500'
      },
      in_progress: { 
        color: 'bg-violet-100 text-violet-700', 
        icon: Video, 
        label: 'In Progress',
        dot: 'bg-violet-500'
      },
      completed: { 
        color: 'bg-green-100 text-green-700', 
        icon: CheckCircle, 
        label: 'Completed',
        dot: 'bg-green-500'
      },
      cancelled: { 
        color: 'bg-red-100 text-red-700', 
        icon: XCircle, 
        label: 'Cancelled',
        dot: 'bg-red-500'
      },
      no_show: { 
        color: 'bg-gray-100 text-gray-700', 
        icon: AlertCircle, 
        label: 'No Show',
        dot: 'bg-gray-500'
      }
    };
    return configs[status] || configs.pending;
  };

  const upcomingAppointments = (appointments || [])
    .filter(apt => !['completed', 'cancelled', 'no_show'].includes(apt.status))
    .slice(0, 5);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-lg shadow-gray-200/50">
      {/* Header gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Today's Appointments</h3>
              <p className="text-sm text-gray-500">{appointments?.length || 0} scheduled</p>
            </div>
          </div>
          <button 
            onClick={onViewAll}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            View All
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {upcomingAppointments.length > 0 ? (
          <div className="space-y-3">
            {upcomingAppointments.map((appointment, index) => {
              const statusConfig = getStatusConfig(appointment.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div 
                  key={appointment.id}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-2xl
                    bg-gradient-to-r from-gray-50 to-white
                    border border-gray-100 hover:border-gray-200
                    hover:shadow-md transition-all duration-200
                    group
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Time column */}
                  <div className="flex flex-col items-center min-w-[70px]">
                    <div className="text-2xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {formatTime(appointment.start_time).split(' ')[0]}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      {formatTime(appointment.start_time).split(' ')[1]}
                    </div>
                    <div className={`
                      mt-2 px-2 py-0.5 rounded-full text-xs font-medium
                      ${appointment.booking_type === 'online' 
                        ? 'bg-violet-100 text-violet-700' 
                        : 'bg-blue-100 text-blue-700'
                      }
                    `}>
                      {appointment.booking_type === 'online' ? (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> Visit
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Vertical divider with dot */}
                  <div className="relative h-16 flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${statusConfig.dot} ring-4 ring-white shadow`} />
                    <div className="flex-1 w-0.5 bg-gradient-to-b from-gray-300 to-transparent" />
                  </div>
                  
                  {/* Patient info */}
                  <Avatar 
                    name={appointment.patient_name}
                    size="md"
                    className="ring-2 ring-white shadow"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {appointment.patient_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {appointment.reason || 'General Consultation'}
                    </p>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3">
                    <div className={`
                      hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                      ${statusConfig.color}
                    `}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </div>
                    
                    {appointment.status === 'checked_in' && (
                      <button
                        onClick={() => onStartConsultation(appointment)}
                        className="
                          flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-gradient-to-r from-green-500 to-emerald-600
                          text-white font-medium text-sm
                          hover:from-green-600 hover:to-emerald-700
                          shadow-lg shadow-green-500/30
                          transform hover:scale-105 transition-all
                        "
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full mb-4">
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">No Appointments Today</h4>
            <p className="text-gray-500 mt-1">Enjoy your day! 🌟</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Enhanced Quick Actions Card with grid icons
 */
const QuickActionsCard = ({ onAction }) => {
  const actions = [
    {
      id: 'queue',
      icon: Users,
      label: 'Queue',
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/30',
      path: '/doctor/queue'
    },
    {
      id: 'appointments',
      icon: Calendar,
      label: 'Appointments',
      gradient: 'from-blue-500 to-cyan-600',
      shadow: 'shadow-blue-500/30',
      path: '/doctor/appointments'
    },
    {
      id: 'prescriptions',
      icon: FileText,
      label: 'Prescriptions',
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/30',
      path: '/doctor/prescriptions'
    },
    {
      id: 'patients',
      icon: ClipboardList,
      label: 'Records',
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/30',
      path: '/doctor/patients'
    },
    {
      id: 'schedule',
      icon: Clock,
      label: 'Schedule',
      gradient: 'from-pink-500 to-rose-600',
      shadow: 'shadow-pink-500/30',
      path: '/doctor/schedule'
    },
    {
      id: 'consultations',
      icon: Video,
      label: 'Consults',
      gradient: 'from-indigo-500 to-violet-600',
      shadow: 'shadow-indigo-500/30',
      path: '/doctor/consultations'
    }
  ];

  return (
    <div className="rounded-3xl bg-white border border-gray-100 shadow-lg shadow-gray-200/50 overflow-hidden">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.path)}
              className="
                flex flex-col items-center gap-3 p-4 rounded-2xl
                bg-gray-50 hover:bg-gray-100
                transform hover:scale-105 hover:-translate-y-1
                transition-all duration-200
                group
              "
            >
              <div className={`
                p-3 rounded-xl bg-gradient-to-br ${action.gradient} 
                text-white shadow-lg ${action.shadow}
                group-hover:scale-110 transition-transform
              `}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced Recent Notifications Card
 */
const RecentNotificationsCard = ({ notifications, onViewAll, onMarkRead }) => {
  const getNotificationConfig = (type) => {
    const configs = {
      appointment: { 
        icon: Calendar, 
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-blue-50'
      },
      consultation: { 
        icon: Video, 
        gradient: 'from-violet-500 to-purple-500',
        bg: 'bg-violet-50'
      },
      patient: { 
        icon: UserPlus, 
        gradient: 'from-green-500 to-emerald-500',
        bg: 'bg-green-50'
      },
      message: { 
        icon: MessageSquare, 
        gradient: 'from-amber-500 to-orange-500',
        bg: 'bg-amber-50'
      },
      system: { 
        icon: Bell, 
        gradient: 'from-gray-500 to-gray-600',
        bg: 'bg-gray-50'
      }
    };
    return configs[type] || configs.system;
  };

  return (
    <div className="rounded-3xl bg-white border border-gray-100 shadow-lg shadow-gray-200/50 overflow-hidden">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl text-white">
                <Bell className="w-5 h-5" />
              </div>
              {notifications?.some(n => !n.is_read) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
          </div>
          <button 
            onClick={onViewAll}
            className="text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            View All
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {notifications?.length > 0 ? (
          <div className="space-y-2">
            {notifications.slice(0, 4).map((notification) => {
              const config = getNotificationConfig(notification.type);
              const Icon = config.icon;
              
              return (
                <div 
                  key={notification.id}
                  onClick={() => onMarkRead(notification.id)}
                  className={`
                    flex items-start gap-3 p-3 rounded-xl cursor-pointer
                    transition-all duration-200
                    ${notification.is_read 
                      ? 'bg-white hover:bg-gray-50' 
                      : `${config.bg} hover:opacity-90`
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg bg-gradient-to-br ${config.gradient} text-white
                    ${notification.is_read ? 'opacity-50' : ''}
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      notification.is_read ? 'text-gray-500' : 'text-gray-900 font-medium'
                    }`}>
                      {notification.title || notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">You're all caught up! ✨</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Enhanced Performance Stats Card
 */
const PerformanceCard = ({ stats }) => {
  const metrics = [
    {
      label: 'Consultations',
      value: `${stats?.completed || 0}/${stats?.total || 0}`,
      percent: stats?.total ? (stats.completed / stats.total) * 100 : 0,
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-500'
    },
    {
      label: 'Rating',
      value: stats?.averageRating ? `⭐ ${stats.averageRating.toFixed(1)}` : 'N/A',
      percent: (stats?.averageRating || 0) * 20,
      gradient: 'from-amber-500 to-yellow-500',
      bg: 'bg-amber-500'
    },
    {
      label: 'Avg Time',
      value: `${stats?.avgDuration || 0} min`,
      percent: Math.min((stats?.avgDuration || 0) / 30 * 100, 100),
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500'
    },
    {
      label: 'Satisfaction',
      value: `${stats?.satisfaction || 0}%`,
      percent: stats?.satisfaction || 0,
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-500'
    }
  ];

  return (
    <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden shadow-xl">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
      
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 backdrop-blur rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">Performance</h3>
            <p className="text-xs text-gray-400">This week's stats</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{metric.label}</span>
                <span className="text-sm font-semibold">{metric.value}</span>
              </div>
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${metric.gradient}`}
                  style={{ width: `${metric.percent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Achievement badge */}
        <div className="mt-6 p-3 bg-white/5 backdrop-blur rounded-xl flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Great Performance!</p>
            <p className="text-xs text-gray-400">Keep up the excellent work</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak } = useVoice();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [todaySummary, setTodaySummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  // ============================================================================
  // FETCH DASHBOARD DATA
  // ============================================================================

  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [summaryRes, appointmentsRes, queueRes, notificationsRes] = await Promise.allSettled([
        appointmentService.getTodaySummary(),
        appointmentService.getTodayAppointments(),
        appointmentService.getWaitingQueue(),
        notificationService.getNotifications({ page_size: 10 })
      ]);

      // Today's Summary - returns { success, data: {...} }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setTodaySummary(summaryRes.value.data);
      } else {
        console.error('Failed to fetch summary:', summaryRes.reason);
        setTodaySummary(null);
      }

      // Today's Appointments - returns { success, date, count, data: [...] }
      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value) {
        const response = appointmentsRes.value;
        setAppointments(response.data || []);
      } else {
        console.error('Failed to fetch appointments:', appointmentsRes.reason);
        setAppointments([]);
      }

      // Queue - returns { success, count, data: [...] }
      if (queueRes.status === 'fulfilled' && queueRes.value) {
        const response = queueRes.value;
        setQueue(response.data || []);
      } else {
        console.error('Failed to fetch queue:', queueRes.reason);
        setQueue([]);
      }

      // Notifications - handle various response structures safely
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value) {
        const response = notificationsRes.value;
        // Handle different possible structures:
        // { data: { results: [...] } } or { data: [...] } or { results: [...] }
        const notifData = response?.data?.results 
          || response?.data 
          || response?.results 
          || [];
        setNotifications(Array.isArray(notifData) ? notifData : []);
      } else {
        console.error('Failed to fetch notifications:', notificationsRes.reason);
        setNotifications([]);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(getErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Voice greeting on mount
  useEffect(() => {
    if (user && !isLoading) {
      const greeting = `Welcome Dr. ${user.first_name}`;
      speak(greeting);
    }
  }, [user, isLoading, speak]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCallNextPatient = useCallback(async () => {
    try {
      setIsCallingNext(true);

      const response = await appointmentService.callNextPatient();
      
      if (response.data?.appointment_id) {
        try {
          const consultRes = await consultationService.createFromAppointment({
            appointment_id: response.data.appointment_id
          });
          
          if (consultRes.data?.id) {
            navigate(`/doctor/consultation/${consultRes.data.id}`);
          }
        } catch (err) {
          console.error('Error creating consultation:', err);
          toast.error('Failed to start consultation');
        }
      } else {
        await fetchDashboardData(true);
        toast.success('Next patient called');
      }
    } catch (err) {
      console.error('Error calling next patient:', err);
      toast.error(getErrorMessage(err, 'Failed to call next patient'));
    } finally {
      setIsCallingNext(false);
    }
  }, [navigate, fetchDashboardData]);

  const handleStartConsultation = useCallback(async (appointment) => {
    try {
      const response = await consultationService.createFromAppointment({
        appointment_id: appointment.id
      });

      if (response.data?.id) {
        navigate(`/doctor/consultation/${response.data.id}`);
      }
    } catch (err) {
      console.error('Error starting consultation:', err);
      toast.error(getErrorMessage(err, 'Failed to start consultation'));
    }
  }, [navigate]);

  const handleRejoinConsultation = useCallback((consultationId) => {
    if (consultationId) {
      navigate(`/doctor/consultation/${consultationId}`);
    }
  }, [navigate]);

  const handleMarkNotificationRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead({ notification_ids: [notificationId] });

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const handleQuickAction = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const stats = useMemo(() => {
    const total = todaySummary?.total || appointments.length || 0;
    const completed = todaySummary?.completed || 0;
    const pending = todaySummary?.pending || 0;
    const cancelled = todaySummary?.cancelled || 0;
    const waitingCount = queue?.filter(q => q.status === 'waiting')?.length || 0;

    const averageRating = 4.5;
    const avgDuration = 18;
    const satisfaction = 92;

    return {
      total,
      completed,
      pending,
      cancelled,
      waitingCount,
      averageRating,
      avgDuration,
      satisfaction
    };
  }, [todaySummary, appointments, queue]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-200 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-violet-600 rounded-full animate-spin border-t-transparent" />
          </div>
          <p className="mt-4 text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 md:hidden">
          Dashboard
        </h1>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className={`
            ml-auto flex items-center gap-2 px-4 py-2 rounded-xl
            bg-white border border-gray-200 text-gray-600
            hover:bg-gray-50 hover:border-gray-300
            transition-all duration-200
            ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-red-700 text-sm flex-1 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Dismiss
            </button>
            <button
              onClick={() => fetchDashboardData(true)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Greeting Section */}
      <GreetingSection 
        doctorName={user?.first_name || 'Doctor'}
        specialization={user?.doctor_profile?.specialization_display || 'Specialist'}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          label="Today's Appointments"
          value={stats.total}
          subValue={`${stats.completed} completed`}
          color="primary"
          onClick={() => navigate('/doctor/appointments')}
        />
        <StatCard
          icon={Users}
          label="In Queue"
          value={stats.waitingCount}
          subValue="Waiting patients"
          color={stats.waitingCount > 5 ? 'warning' : 'info'}
          onClick={() => navigate('/doctor/queue')}
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          trend={12}
          color="success"
        />
        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={stats.cancelled}
          color="danger"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Queue & Appointments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Queue */}
          <CurrentQueueCard
            queue={queue}
            onCallNext={handleCallNextPatient}
            onViewQueue={() => navigate('/doctor/queue')}
            onRejoinConsultation={handleRejoinConsultation}
            isLoading={isCallingNext}
          />

          {/* Today's Appointments */}
          <TodayAppointmentsCard
            appointments={appointments}
            onViewAll={() => navigate('/doctor/appointments')}
            onStartConsultation={handleStartConsultation}
          />
        </div>

        {/* Right Column - Quick Actions, Notifications, Performance */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActionsCard onAction={handleQuickAction} />

          {/* Notifications */}
          <RecentNotificationsCard
            notifications={notifications}
            onViewAll={() => navigate('/doctor/notifications')}
            onMarkRead={handleMarkNotificationRead}
          />

          {/* Performance Stats */}
          <PerformanceCard stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default DoctorHome;