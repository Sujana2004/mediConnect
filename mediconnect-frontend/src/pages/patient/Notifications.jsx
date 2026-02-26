// src/pages/patient/Notifications.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Calendar,
  Clock,
  User,
  Pill,
  FileText,
  AlertTriangle,
  Heart,
  MessageSquare,
  Video,
  Star,
  Gift,
  Info,
  Settings,
  ChevronRight,
  X,
  Volume2,
  Mail,
  Smartphone,
  MoreVertical,
  RefreshCw,
  Loader2,
  BellRing,
  Activity,
  Shield,
  CreditCard,
  AlertCircle,
  WifiOff,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Moon
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  Input,
  Badge,
  EmptyState,
  Loader
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { notificationService } from '../../services/api';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const NOTIFICATION_TYPES = {
  // Appointment types
  appointment_reminder: {
    icon: BellRing,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    gradient: 'from-violet-500 to-purple-600',
    label: 'Reminder'
  },
  appointment_confirmed: {
    icon: Calendar,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    gradient: 'from-emerald-500 to-teal-600',
    label: 'Confirmed'
  },
  appointment_cancelled: {
    icon: Calendar,
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    gradient: 'from-rose-500 to-red-600',
    label: 'Cancelled'
  },
  appointment_rescheduled: {
    icon: Calendar,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    gradient: 'from-amber-500 to-orange-600',
    label: 'Rescheduled'
  },
  // Medicine types
  medicine_reminder: {
    icon: Pill,
    color: 'text-fuchsia-600',
    bg: 'bg-fuchsia-100',
    gradient: 'from-fuchsia-500 to-pink-600',
    label: 'Medicine'
  },
  medicine_low_stock: {
    icon: Pill,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    gradient: 'from-yellow-500 to-amber-600',
    label: 'Low Stock'
  },
  prescription_ready: {
    icon: FileText,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    gradient: 'from-purple-500 to-violet-600',
    label: 'Prescription'
  },
  // Health types
  health_tip: {
    icon: Heart,
    color: 'text-pink-600',
    bg: 'bg-pink-100',
    gradient: 'from-pink-500 to-rose-600',
    label: 'Health Tip'
  },
  health_checkup_reminder: {
    icon: Activity,
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
    gradient: 'from-cyan-500 to-blue-600',
    label: 'Checkup'
  },
  lab_result_ready: {
    icon: Activity,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    gradient: 'from-indigo-500 to-purple-600',
    label: 'Lab Result'
  },
  // Emergency
  emergency_alert: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    gradient: 'from-red-500 to-rose-600',
    label: 'Emergency'
  },
  emergency_contact_alert: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    gradient: 'from-red-500 to-rose-600',
    label: 'Emergency'
  },
  // System
  welcome: {
    icon: Gift,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    gradient: 'from-violet-500 to-purple-600',
    label: 'Welcome'
  },
  account_update: {
    icon: Shield,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    gradient: 'from-slate-500 to-gray-600',
    label: 'Account'
  },
  general: {
    icon: Info,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    gradient: 'from-violet-500 to-purple-600',
    label: 'General'
  },
  // Chat
  chat_message: {
    icon: MessageSquare,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    gradient: 'from-indigo-500 to-violet-600',
    label: 'Message'
  },
  doctor_response: {
    icon: MessageSquare,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    gradient: 'from-emerald-500 to-teal-600',
    label: 'Doctor'
  },
};

const DEFAULT_TYPE_CONFIG = {
  icon: Bell,
  color: 'text-violet-600',
  bg: 'bg-violet-100',
  gradient: 'from-violet-500 to-purple-600',
  label: 'Notification'
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'unread', label: 'Unread', icon: Bell },
  { value: 'appointment', label: 'Appointments', icon: Calendar },
  { value: 'medicine', label: 'Medicine', icon: Pill },
  { value: 'health', label: 'Health', icon: Heart },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle },
  { value: 'general', label: 'General', icon: Info }
];

// Medicine time icons
const MEDICINE_TIME_ICONS = {
  morning: { icon: Sunrise, label: 'Morning', color: 'text-amber-500', bg: 'bg-amber-50' },
  afternoon: { icon: Sun, label: 'Afternoon', color: 'text-orange-500', bg: 'bg-orange-50' },
  evening: { icon: Sunset, label: 'Evening', color: 'text-purple-500', bg: 'bg-purple-50' },
  night: { icon: Moon, label: 'Night', color: 'text-indigo-500', bg: 'bg-indigo-50' }
};

// ============================================================================
// HELPER: Normalize backend notification to frontend format
// ============================================================================

const normalizeNotification = (backendNotification) => {
  return {
    id: backendNotification.id,
    type: backendNotification.notification_type || 'general',
    title: backendNotification.title || '',
    message: backendNotification.body || '',
    is_read: backendNotification.is_read ?? false,
    created_at: backendNotification.created_at,
    data: backendNotification.data || {},
    action_url: backendNotification.action_url || '',
    icon: backendNotification.icon || '',
    color: backendNotification.color || '',
    priority: backendNotification.priority || 'normal',
    actions: deriveActions(backendNotification),
  };
};

const deriveActions = (notification) => {
  const actions = [];
  const type = notification.notification_type || '';
  const data = notification.data || {};

  if (type.startsWith('appointment')) {
    if (data.appointment_id) {
      actions.push({ type: 'view', label: 'View Details', variant: 'primary' });
    }
    if (type === 'appointment_reminder') {
      actions.push({ type: 'reschedule', label: 'Reschedule', variant: 'secondary' });
    }
  } else if (type === 'medicine_reminder') {
    actions.push({ type: 'taken', label: 'Mark Taken', variant: 'primary' });
    actions.push({ type: 'snooze', label: 'Snooze', variant: 'secondary' });
    actions.push({ type: 'skip', label: 'Skip', variant: 'ghost' });
  } else if (type === 'prescription_ready') {
    actions.push({ type: 'view_prescription', label: 'View Prescription', variant: 'primary' });
  } else if (type === 'doctor_response' || type === 'chat_message') {
    actions.push({ type: 'reply', label: 'Reply', variant: 'primary' });
  } else if (type === 'lab_result_ready') {
    actions.push({ type: 'view', label: 'View Results', variant: 'primary' });
  } else if (notification.action_url) {
    actions.push({ type: 'view', label: 'View', variant: 'primary' });
  }

  return actions;
};

// ============================================================================
// ERROR COMPONENT
// ============================================================================

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-red-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-rose-100">
        <AlertCircle className="w-10 h-10 text-rose-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {t('common.errorOccurred', 'Something went wrong')}
      </h3>
      <p className="text-gray-500 text-center mb-6 max-w-sm">
        {message || t('common.tryAgain', 'Please try again later')}
      </p>
      <Button 
        variant="primary" 
        onClick={onRetry}
        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

// ============================================================================
// OFFLINE STATE COMPONENT
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-gray-100">
        <WifiOff className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center max-w-sm">
        {t('common.checkConnection', 'Please check your internet connection and try again')}
      </p>
    </div>
  );
};

// ============================================================================
// MEDICINE TIME BADGE COMPONENT
// ============================================================================

const MedicineTimeBadge = ({ time }) => {
  const config = MEDICINE_TIME_ICONS[time] || MEDICINE_TIME_ICONS.morning;
  const TimeIcon = config.icon;
  
  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${config.bg} ${config.color}
    `}>
      <TimeIcon className="w-3 h-3" />
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
};

// ============================================================================
// NOTIFICATION CARD COMPONENT
// ============================================================================

const NotificationCard = ({ 
  notification, 
  onMarkRead, 
  onDelete, 
  onAction,
  isProcessing
}) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const typeConfig = NOTIFICATION_TYPES[notification.type] || DEFAULT_TYPE_CONFIG;
  const IconComponent = typeConfig.icon;

  const formatTime = (timestamp) => {
    try {
      const date = parseISO(timestamp);
      if (isToday(date)) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else if (isYesterday(date)) {
        return `Yesterday, ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch {
      return timestamp;
    }
  };

  const handleAction = (action) => {
    onAction(notification, action);
    setExpanded(false);
  };

  // Extract medicine times from notification data
  const medicineTimes = notification.data?.times || [];

  return (
    <div
      className={`
        relative p-4 sm:p-5 transition-all duration-200 group
        ${notification.is_read 
          ? 'bg-white hover:bg-gray-50' 
          : 'bg-gradient-to-r from-violet-50/80 to-purple-50/50 hover:from-violet-100/80 hover:to-purple-100/50'
        }
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Unread Indicator */}
      {!notification.is_read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-purple-600 rounded-r" />
      )}

      <div className="flex gap-3 sm:gap-4">
        {/* Icon */}
        <div className={`
          relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0
          bg-gradient-to-br ${typeConfig.gradient} shadow-lg
          ${notification.type === 'medicine_reminder' ? 'shadow-fuchsia-200' : 'shadow-violet-200'}
        `}>
          <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          {/* Notification pulse for unread */}
          {!notification.is_read && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-pulse border-2 border-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-semibold truncate ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                  {notification.title}
                </h3>
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  bg-gradient-to-r ${typeConfig.gradient} text-white shadow-sm
                `}>
                  {typeConfig.label}
                </span>
              </div>
              
              <p className={`text-sm mt-1.5 leading-relaxed ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                {notification.message}
              </p>

              {/* Medicine Times - Responsive Grid */}
              {notification.type === 'medicine_reminder' && medicineTimes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {medicineTimes.map((time, idx) => (
                    <MedicineTimeBadge key={idx} time={time} />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-400">
                  {formatTime(notification.created_at)}
                </p>
              </div>
            </div>

            {/* Menu Button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`
                  p-2 rounded-xl transition-all duration-200
                  ${showMenu 
                    ? 'bg-violet-100 text-violet-600' 
                    : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50'
                  }
                `}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 overflow-hidden">
                    {!notification.is_read && (
                      <button
                        onClick={() => {
                          onMarkRead(notification.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-3 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        {t('notifications.markRead', 'Mark as read')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDelete(notification.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('notifications.delete', 'Delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions - Responsive Grid */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {notification.actions.slice(0, expanded ? undefined : 3).map((action, index) => (
                <button
                  key={action.type}
                  onClick={() => handleAction(action)}
                  className={`
                    px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    flex-shrink-0
                    ${index === 0
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:scale-[1.02]'
                      : action.variant === 'ghost'
                        ? 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
                        : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
              {!expanded && notification.actions.length > 3 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
                >
                  +{notification.actions.length - 3} more
                </button>
              )}
            </div>
          )}

          {/* Additional Data */}
          {notification.data && expanded && Object.keys(notification.data).length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
              {notification.data.doctor_name && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="font-medium">{notification.data.doctor_name}</span>
                </div>
              )}
              {notification.data.date && notification.data.time && (
                <div className="flex items-center gap-3 text-gray-600 mt-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <span>{notification.data.date} at {notification.data.time}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NOTIFICATION GROUP COMPONENT
// ============================================================================

const NotificationGroup = ({ 
  title, 
  notifications, 
  onMarkRead, 
  onDelete, 
  onAction,
  processingIds
}) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600" />
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
        <span className="text-xs font-medium text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>
      <div className="bg-white rounded-2xl shadow-lg shadow-violet-100/50 border border-violet-100/50 overflow-hidden divide-y divide-gray-100">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
            onAction={onAction}
            isProcessing={processingIds.includes(notification.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS MODAL COMPONENT
// ============================================================================

const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await notificationService.getPreferences();
      setSettings(response.preferences || {});
      setNotificationTypes(response.notification_types || []);
    } catch (err) {
      setError(err.message || 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTypeToggle = async (notificationType, currentEnabled) => {
    try {
      await notificationService.toggleNotificationType(notificationType, !currentEnabled);
      setNotificationTypes(prev =>
        prev.map(nt =>
          nt.type === notificationType ? { ...nt, enabled: !currentEnabled } : nt
        )
      );
    } catch (err) {
      toast.error('Failed to update preference');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await notificationService.updatePreferences({
        notifications_enabled: settings.notifications_enabled,
        push_enabled: settings.push_enabled,
        quiet_hours_enabled: settings.quiet_hours_enabled,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
        preferred_language: settings.preferred_language,
      });
      toast.success(t('notifications.settingsSaved', 'Settings saved successfully'));
      onSave(settings);
      onClose();
    } catch (err) {
      toast.error(err.message || t('notifications.settingsError', 'Failed to save settings'));
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange()}
      disabled={disabled}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300
        ${checked 
          ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg shadow-violet-200' 
          : 'bg-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            {t('notifications.settings', 'Notification Settings')}
          </span>
        </div>
      }
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-gray-500">Loading settings...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadPreferences} />
      ) : settings ? (
        <>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {/* General Settings */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                {t('notifications.generalSettings', 'General Settings')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {t('notifications.allNotifications', 'All Notifications')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('notifications.allDesc', 'Enable or disable all notifications')}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch 
                    checked={settings.notifications_enabled} 
                    onChange={() => handleToggle('notifications_enabled')} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {t('notifications.pushNotifications', 'Push Notifications')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('notifications.pushDesc', 'Receive push notifications on your device')}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch 
                    checked={settings.push_enabled}
                    onChange={() => handleToggle('push_enabled')}
                    disabled={!settings.notifications_enabled}
                  />
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-500" />
                {t('notifications.quietHours', 'Quiet Hours')}
              </h3>
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {t('notifications.enableQuietHours', 'Enable Quiet Hours')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('notifications.quietHoursDesc', 'Mute non-urgent notifications during set hours')}
                    </p>
                  </div>
                  <ToggleSwitch 
                    checked={settings.quiet_hours_enabled} 
                    onChange={() => handleToggle('quiet_hours_enabled')} 
                  />
                </div>
                {settings.quiet_hours_enabled && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white/50 rounded-xl">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('notifications.from', 'From')}
                      </label>
                      <input
                        type="time"
                        value={settings.quiet_hours_start || '22:00'}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          quiet_hours_start: e.target.value 
                        }))}
                        className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-violet-200 focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div className="hidden sm:block">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('notifications.to', 'To')}
                      </label>
                      <input
                        type="time"
                        value={settings.quiet_hours_end || '07:00'}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          quiet_hours_end: e.target.value 
                        }))}
                        className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-violet-200 focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Types */}
            {notificationTypes.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-500" />
                  {t('notifications.notificationTypes', 'Notification Types')}
                </h3>
                <div className="bg-white rounded-2xl shadow-lg shadow-violet-100/50 border border-violet-100 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {notificationTypes.map((nt) => {
                      const typeConfig = NOTIFICATION_TYPES[nt.type] || DEFAULT_TYPE_CONFIG;
                      const TypeIcon = typeConfig.icon;
                      
                      return (
                        <div key={nt.type} className="p-4 flex items-center justify-between hover:bg-violet-50/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center shadow-md`}>
                              <TypeIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900">{nt.name}</span>
                              {!nt.can_disable && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Always enabled
                                </p>
                              )}
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={nt.enabled}
                            onChange={() => handleTypeToggle(nt.type, nt.enabled)}
                            disabled={!nt.can_disable || !settings.notifications_enabled}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              className="flex-1 py-3 border-2 border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all rounded-xl font-semibold"
              onClick={onClose}
              disabled={isSaving}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200 rounded-xl font-semibold"
              onClick={handleSave}
              loading={isSaving}
            >
              {t('common.save', 'Save Settings')}
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { speak, voiceEnabled } = useVoice();

  // State
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);
  
  // Filters
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showSettings, setShowSettings] = useState(false);

  // Check online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (filter !== 'all') {
      setSearchParams({ filter });
    } else {
      setSearchParams({});
    }
  }, [filter, setSearchParams]);

  const loadNotifications = async () => {
    if (!isOnline) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await notificationService.getNotifications({ page_size: 50 });
      const rawNotifications = response.results || response.data || [];
      const normalized = rawNotifications.map(normalizeNotification);
      setNotifications(normalized);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load notifications');
      toast.error(t('notifications.loadError', 'Failed to load notifications'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      toast.error(t('common.offline', 'You are offline'));
      return;
    }

    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await notificationService.getNotifications({ page_size: 50 });
      const rawNotifications = response.results || response.data || [];
      const normalized = rawNotifications.map(normalizeNotification);
      setNotifications(normalized);
      toast.success(t('notifications.refreshed', 'Notifications refreshed'));
    } catch (err) {
      toast.error(t('notifications.refreshError', 'Failed to refresh notifications'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkRead = async (id) => {
    setProcessingIds(prev => [...prev, id]);
    
    try {
      await notificationService.markOneAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      toast.error(t('notifications.markReadError', 'Failed to mark as read'));
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setProcessingIds(unreadIds);
    
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      toast.success(t('notifications.allMarkedRead', 'All notifications marked as read'));
    } catch (err) {
      toast.error(t('notifications.markReadError', 'Failed to mark all as read'));
    } finally {
      setProcessingIds([]);
    }
  };

  const handleDelete = async (id) => {
    setProcessingIds(prev => [...prev, id]);
    
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success(t('notifications.deleted', 'Notification deleted'));
    } catch (err) {
      toast.error(t('notifications.deleteError', 'Failed to delete notification'));
      loadNotifications();
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleAction = useCallback((notification, action) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }

    switch (action.type) {
      case 'view':
      case 'view_prescription':
        if (notification.action_url) {
          navigate(notification.action_url);
        } else if (notification.data?.appointment_id) {
          navigate(`/patient/appointments/${notification.data.appointment_id}`);
        } else if (notification.data?.prescription_id) {
          navigate(`/patient/medicines?prescription=${notification.data.prescription_id}`);
        }
        break;
        
      case 'reschedule':
        if (notification.data?.appointment_id) {
          navigate(`/patient/appointments/${notification.data.appointment_id}?action=reschedule`);
        }
        break;
        
      case 'taken':
        toast.success(t('notifications.medicineTaken', 'Medicine marked as taken'));
        break;
        
      case 'skip':
        toast.info(t('notifications.medicineSkipped', 'Medicine skipped'));
        break;
        
      case 'snooze':
        toast.info(t('notifications.medicineSnoozed', 'Reminder snoozed for 30 minutes'));
        break;
        
      case 'reply':
        toast.info(t('notifications.replyFeature', 'Reply feature coming soon'));
        break;
        
      case 'book':
        navigate('/patient/doctors');
        break;
        
      default:
        if (notification.action_url) {
          navigate(notification.action_url);
        }
    }
  }, [navigate, t]);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (filter === 'appointment') {
      filtered = filtered.filter(n => n.type?.startsWith('appointment'));
    } else if (filter === 'medicine') {
      filtered = filtered.filter(n => 
        n.type?.startsWith('medicine') || n.type === 'prescription_ready'
      );
    } else if (filter === 'health') {
      filtered = filtered.filter(n => 
        n.type?.startsWith('health') || n.type === 'lab_result_ready'
      );
    } else if (filter === 'emergency') {
      filtered = filtered.filter(n => n.type?.startsWith('emergency'));
    } else if (filter === 'general') {
      filtered = filtered.filter(n => 
        ['general', 'welcome', 'account_update', 'chat_message', 'doctor_response'].includes(n.type)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filter, searchQuery]);

  const groupedNotifications = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      older: []
    };

    filteredNotifications.forEach(notification => {
      try {
        const date = parseISO(notification.created_at);
        if (isToday(date)) {
          groups.today.push(notification);
        } else if (isYesterday(date)) {
          groups.yesterday.push(notification);
        } else {
          groups.older.push(notification);
        }
      } catch {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [filteredNotifications]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    return { total, unread };
  }, [notifications]);

  const renderContent = () => {
    if (!isOnline) {
      return <OfflineState />;
    }

    if (isLoading) {
      return (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-gray-500 font-medium">Loading notifications...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return <ErrorState message={error} onRetry={loadNotifications} />;
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-violet-100">
            <Bell className="w-12 h-12 text-violet-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery
              ? t('notifications.noSearchResults', 'No notifications found')
              : filter === 'unread'
                ? t('notifications.noUnread', 'No unread notifications')
                : t('notifications.noNotifications', 'No notifications')
            }
          </h3>
          <p className="text-gray-500 text-center mb-6 max-w-sm">
            {searchQuery
              ? t('notifications.tryDifferentSearch', 'Try a different search term')
              : t('notifications.noNotificationsDesc', "You're all caught up! Check back later for updates.")
            }
          </p>
          {(searchQuery || filter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
              className="border-2 border-violet-200 text-violet-600 hover:bg-violet-50"
            >
              <X className="w-4 h-4 mr-2" />
              {t('notifications.clearFilters', 'Clear Filters')}
            </Button>
          )}
        </div>
      );
    }

    return (
      <>
        <NotificationGroup
          title={t('notifications.today', 'Today')}
          notifications={groupedNotifications.today}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          onAction={handleAction}
          processingIds={processingIds}
        />

        <NotificationGroup
          title={t('notifications.yesterday', 'Yesterday')}
          notifications={groupedNotifications.yesterday}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          onAction={handleAction}
          processingIds={processingIds}
        />

        <NotificationGroup
          title={t('notifications.older', 'Older')}
          notifications={groupedNotifications.older}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          onAction={handleAction}
          processingIds={processingIds}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white sticky top-0 z-10 shadow-xl shadow-violet-200/50">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />
        </div>
        
        <div className="relative px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {t('notifications.title', 'Notifications')}
                </h1>
                <p className="text-sm text-white/70">
                  Stay updated with your health
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || !isOnline}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50 backdrop-blur-sm"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {!isLoading && !error && (
            <div className="flex gap-3 mb-5">
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.unread}</p>
                    <p className="text-xs text-white/70 uppercase tracking-wider">
                      {t('notifications.unread', 'Unread')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-xs text-white/70 uppercase tracking-wider">
                      {t('notifications.total', 'Total')}
                    </p>
                  </div>
                </div>
              </div>
              {stats.unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={processingIds.length > 0}
                  className="hidden sm:flex items-center gap-2 px-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 backdrop-blur-sm disabled:opacity-50"
                >
                  <CheckCheck className="w-5 h-5" />
                  <span className="text-sm font-medium">Mark all read</span>
                </button>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-300" />
            <input
              type="text"
              placeholder={t('notifications.search', 'Search notifications...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading || !!error}
              className="w-full pl-12 pr-10 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all disabled:opacity-50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs - Scrollable on all devices */}
        <div className="relative px-4 sm:px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {FILTER_OPTIONS.map((option) => {
              const FilterIcon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  disabled={isLoading || !!error}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                    disabled:opacity-50
                    ${filter === option.value
                      ? 'bg-white text-violet-600 shadow-lg shadow-violet-500/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
                    }
                  `}
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.label.split(' ')[0]}</span>
                  {option.value === 'unread' && stats.unread > 0 && (
                    <span className={`
                      ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                      ${filter === option.value 
                        ? 'bg-violet-100 text-violet-600' 
                        : 'bg-white/20 text-white'
                      }
                    `}>
                      {stats.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mark All Read Button - Mobile */}
      {stats.unread > 0 && !isLoading && !error && (
        <div className="sm:hidden px-4 pt-4">
          <button
            onClick={handleMarkAllRead}
            disabled={processingIds.length > 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-100 text-violet-700 rounded-xl font-semibold hover:bg-violet-200 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-5 h-5" />
            <span>Mark all as read</span>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="px-4 sm:px-6 py-4 max-w-4xl mx-auto">
        {renderContent()}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => {}}
      />
    </div>
  );
};

export default Notifications;