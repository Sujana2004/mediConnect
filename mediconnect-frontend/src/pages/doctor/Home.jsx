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
  Loader2
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
 * Greeting Section
 */
const GreetingSection = ({ doctorName, specialization }) => {
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, Dr. {doctorName}! 👋
          </h1>
          <p className="text-primary-100 mt-1 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            {specialization || 'Specialist'}
          </p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-primary-100 text-sm">Today</p>
          <p className="text-lg font-semibold">
            {formatDate(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Stats Card Component
 */
const StatCard = ({ icon: Icon, label, value, subValue, trend, color = 'primary', onClick }) => {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600'
  };

  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
      padding="md"
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        {subValue && (
          <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>
        )}
      </div>
    </Card>
  );
};

/**
 * Current Queue Card
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
    <Card className="border-l-4 border-l-primary-500" padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Current Queue
        </h3>
        <Badge variant={waitingCount > 5 ? 'warning' : 'primary'}>
          {waitingCount} waiting
        </Badge>
      </div>

      {currentPatient ? (
        <div className="bg-primary-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar 
              name={currentPatient.patient_name} 
              size="lg"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {currentPatient.patient_name}
              </p>
              <p className="text-sm text-gray-600">
                {currentPatient.reason || 'General Consultation'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Timer className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-600">
                  In Progress
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
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
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar 
              name={nextPatient.patient_name}
              size="lg"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Next Patient</p>
              <p className="font-semibold text-gray-900">
                {nextPatient.patient_name}
              </p>
              <p className="text-sm text-gray-600">
                {nextPatient.reason || 'General Consultation'}
              </p>
              {nextPatient.wait_time_minutes !== undefined && (
                <p className="text-xs text-gray-400 mt-1">
                  Waiting: {nextPatient.wait_time_minutes} min
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              onClick={onCallNext}
              disabled={isLoading}
            >
              Start
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-8">
          <EmptyState
            icon={CheckCircle}
            title="Queue is Empty"
            description="No patients waiting. Great job!"
            compact
          />
        </div>
      )}

      <Button
        variant="outline"
        fullWidth
        rightIcon={<ChevronRight className="w-4 h-4" />}
        onClick={onViewQueue}
      >
        View Full Queue
      </Button>
    </Card>
  );
};

/**
 * Today's Appointments Card
 */
const TodayAppointmentsCard = ({ appointments, onViewAll, onStartConsultation }) => {
  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'warning', icon: Clock, label: 'Pending' },
      confirmed: { color: 'success', icon: CheckCircle, label: 'Confirmed' },
      checked_in: { color: 'info', icon: UserCheck, label: 'Checked In' },
      in_progress: { color: 'primary', icon: Video, label: 'In Progress' },
      completed: { color: 'success', icon: CheckCircle, label: 'Completed' },
      cancelled: { color: 'danger', icon: XCircle, label: 'Cancelled' },
      no_show: { color: 'danger', icon: AlertCircle, label: 'No Show' }
    };
    return configs[status] || configs.pending;
  };

  // Filter upcoming appointments (not completed, cancelled, or no_show)
  const upcomingAppointments = (appointments || [])
    .filter(apt => !['completed', 'cancelled', 'no_show'].includes(apt.status))
    .slice(0, 5);

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Today's Appointments
        </h3>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View All
        </Button>
      </div>

      {upcomingAppointments.length > 0 ? (
        <div className="space-y-3">
          {upcomingAppointments.map((appointment) => {
            const statusConfig = getStatusConfig(appointment.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div 
                key={appointment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="text-center min-w-[60px]">
                  <p className="text-lg font-bold text-gray-900">
                    {formatTime(appointment.start_time)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {appointment.booking_type === 'online' ? (
                      <span className="flex items-center justify-center gap-1">
                        <Video className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> {appointment.booking_type}
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="w-px h-12 bg-gray-200" />
                
                <Avatar 
                  name={appointment.patient_name}
                  size="md"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {appointment.patient_name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {appointment.reason || 'General Consultation'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig.color} className="hidden sm:flex">
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  
                  {appointment.status === 'checked_in' && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play className="w-4 h-4" />}
                      onClick={() => onStartConsultation(appointment)}
                    >
                      Start
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8">
          <EmptyState
            icon={Calendar}
            title="No Appointments Today"
            description="Enjoy your day!"
            compact
          />
        </div>
      )}
    </Card>
  );
};

/**
 * Quick Actions Card
 */
const QuickActionsCard = ({ onAction }) => {
  const actions = [
    {
      id: 'queue',
      icon: Users,
      label: 'Manage Queue',
      color: 'bg-primary-100 text-primary-600',
      path: '/doctor/queue'
    },
    {
      id: 'appointments',
      icon: Calendar,
      label: 'Appointments',
      color: 'bg-blue-100 text-blue-600',
      path: '/doctor/appointments'
    },
    {
      id: 'prescriptions',
      icon: FileText,
      label: 'Prescriptions',
      color: 'bg-green-100 text-green-600',
      path: '/doctor/prescriptions'
    },
    {
      id: 'patients',
      icon: ClipboardList,
      label: 'Patient Records',
      color: 'bg-amber-100 text-amber-600',
      path: '/doctor/patients'
    },
    {
      id: 'schedule',
      icon: Clock,
      label: 'Schedule',
      color: 'bg-purple-100 text-purple-600',
      path: '/doctor/schedule'
    },
    {
      id: 'consultations',
      icon: Video,
      label: 'Consultations',
      color: 'bg-rose-100 text-rose-600',
      path: '/doctor/consultations'
    }
  ];

  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary-600" />
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.path)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className={`p-3 rounded-xl ${action.color}`}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-sm text-gray-700 text-center font-medium">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
};

/**
 * Recent Notifications Card
 */
const RecentNotificationsCard = ({ notifications, onViewAll, onMarkRead }) => {
  const getNotificationIcon = (type) => {
    const icons = {
      appointment: Calendar,
      consultation: Video,
      patient: UserPlus,
      message: MessageSquare,
      system: Bell
    };
    return icons[type] || Bell;
  };

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-600" />
          Notifications
        </h3>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View All
        </Button>
      </div>

      {notifications?.length > 0 ? (
        <div className="space-y-3">
          {notifications.slice(0, 4).map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            
            return (
              <div 
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                  notification.is_read ? 'bg-white hover:bg-gray-50' : 'bg-primary-50 hover:bg-primary-100'
                }`}
                onClick={() => onMarkRead(notification.id)}
              >
                <div className={`p-2 rounded-lg ${
                  notification.is_read ? 'bg-gray-100' : 'bg-primary-100'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    notification.is_read ? 'text-gray-500' : 'text-primary-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'
                  }`}>
                    {notification.title || notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getRelativeTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8">
          <EmptyState
            icon={Bell}
            title="No Notifications"
            description="You're all caught up!"
            compact
          />
        </div>
      )}
    </Card>
  );
};

/**
 * Performance Stats Card
 */
const PerformanceCard = ({ stats }) => {
  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary-600" />
        This Week's Performance
      </h3>
      
      <div className="space-y-4">
        {/* Consultations Completed */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Consultations Completed</span>
            <span className="text-sm font-semibold">
              {stats?.completed || 0}/{stats?.total || 0}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${stats?.total ? Math.min((stats.completed / stats.total) * 100, 100) : 0}%` 
              }}
            />
          </div>
        </div>

        {/* Average Rating */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Average Rating</span>
            <span className="text-sm font-semibold flex items-center gap-1">
              ⭐ {stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stats?.averageRating || 0) * 20}%` }}
            />
          </div>
        </div>

        {/* Average Consultation Time */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Avg Consultation Time</span>
            <span className="text-sm font-semibold">{stats?.avgDuration || 0} min</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((stats?.avgDuration || 0) / 30 * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Patient Satisfaction */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Patient Satisfaction</span>
            <span className="text-sm font-semibold">{stats?.satisfaction || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats?.satisfaction || 0}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
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
        appointmentService.getToday(),
        appointmentService.getWaitingQueue(),
        notificationService.getNotifications({ page_size: 10 })
      ]);

      // Today's Summary
      if (summaryRes.status === 'fulfilled') {
        setTodaySummary(summaryRes.value.data);
      } else {
        console.error('Failed to fetch summary:', summaryRes.reason);
      }

      // Today's Appointments
      if (appointmentsRes.status === 'fulfilled') {
        const data = appointmentsRes.value.data;
        setAppointments(data.results || data || []);
      } else {
        console.error('Failed to fetch appointments:', appointmentsRes.reason);
        setAppointments([]);
      }

      // Queue
      if (queueRes.status === 'fulfilled') {
        const data = queueRes.value.data;
        setQueue(data.results || data || []);
      } else {
        console.error('Failed to fetch queue:', queueRes.reason);
        setQueue([]);
      }

      // Notifications
      if (notificationsRes.status === 'fulfilled') {
        const data = notificationsRes.value.data;
        setNotifications(data.results || data || []);
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
        // Create consultation from appointment
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
        // Refresh data
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
    
    // Calculate average rating (mock for now as API may not provide this)
    const averageRating = 4.5;
    
    // Calculate average duration (mock for now)
    const avgDuration = 18;
    
    // Calculate satisfaction (mock for now)
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
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 md:hidden">
          Dashboard
        </h1>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className="ml-auto"
        >
          Refresh
        </Button>
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
            Dismiss
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Greeting Section */}
      <GreetingSection 
        doctorName={user?.first_name || 'Doctor'}
        specialization={user?.doctor_profile?.specialization_display || 'Specialist'}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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