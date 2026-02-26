// src/pages/doctor/Notifications.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Video,
  User,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Info,
  Star,
  Clock,
  FileText,
  Pill,
  Settings,
  ChevronRight,
  X,
  MoreVertical,
  Mail,
  MailOpen,
  Archive,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Loader2,
  Heart,
  Activity,
  Shield,
  Gift,
  BellRing
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { notificationService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Select
} from '../../components/common';

// ============================================================================
// CONSTANTS - Aligned with backend NotificationType values
// ============================================================================

/**
 * Maps backend notification_type values to UI config.
 * Backend types from constants.py NotificationType:
 *   appointment_reminder, appointment_confirmed, appointment_cancelled,
 *   appointment_rescheduled, medicine_reminder, medicine_low_stock,
 *   prescription_ready, health_tip, health_checkup_reminder,
 *   lab_result_ready, emergency_alert, emergency_contact_alert,
 *   welcome, account_update, general, chat_message, doctor_response
 */
const NOTIFICATION_TYPES = {
  // Appointment types
  appointment_reminder: {
    icon: BellRing,
    color: 'bg-blue-100 text-blue-600',
    label: 'Reminder'
  },
  appointment_confirmed: {
    icon: Calendar,
    color: 'bg-green-100 text-green-600',
    label: 'Confirmed'
  },
  appointment_cancelled: {
    icon: Calendar,
    color: 'bg-red-100 text-red-600',
    label: 'Cancelled'
  },
  appointment_rescheduled: {
    icon: Calendar,
    color: 'bg-orange-100 text-orange-600',
    label: 'Rescheduled'
  },
  // Medicine types
  medicine_reminder: {
    icon: Pill,
    color: 'bg-amber-100 text-amber-600',
    label: 'Medicine'
  },
  medicine_low_stock: {
    icon: Pill,
    color: 'bg-yellow-100 text-yellow-600',
    label: 'Low Stock'
  },
  prescription_ready: {
    icon: FileText,
    color: 'bg-purple-100 text-purple-600',
    label: 'Prescription'
  },
  // Health types
  health_tip: {
    icon: Heart,
    color: 'bg-pink-100 text-pink-600',
    label: 'Health Tip'
  },
  health_checkup_reminder: {
    icon: Activity,
    color: 'bg-cyan-100 text-cyan-600',
    label: 'Checkup'
  },
  lab_result_ready: {
    icon: Activity,
    color: 'bg-cyan-100 text-cyan-600',
    label: 'Lab Result'
  },
  // Emergency
  emergency_alert: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600',
    label: 'Emergency'
  },
  emergency_contact_alert: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600',
    label: 'Emergency'
  },
  // System
  welcome: {
    icon: Gift,
    color: 'bg-green-100 text-green-600',
    label: 'Welcome'
  },
  account_update: {
    icon: Shield,
    color: 'bg-gray-100 text-gray-600',
    label: 'Account'
  },
  general: {
    icon: Info,
    color: 'bg-gray-100 text-gray-600',
    label: 'General'
  },
  // Chat
  chat_message: {
    icon: MessageSquare,
    color: 'bg-primary-100 text-primary-600',
    label: 'Message'
  },
  doctor_response: {
    icon: MessageSquare,
    color: 'bg-green-100 text-green-600',
    label: 'Response'
  },
  // Review
  review: {
    icon: Star,
    color: 'bg-yellow-100 text-yellow-600',
    label: 'Review'
  }
};

// Default fallback for unknown types
const DEFAULT_TYPE_CONFIG = {
  icon: Bell,
  color: 'bg-gray-100 text-gray-600',
  label: 'Notification'
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'health', label: 'Health' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'chat', label: 'Messages' },
  { value: 'general', label: 'System' }
];

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

const formatDate = (dateString, formatStr = 'MMM d, yyyy') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
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

/**
 * Normalize backend notification to frontend format.
 * 
 * Backend (NotificationListSerializer) returns:
 *   { id, notification_type, title, body, icon, color, is_read, created_at }
 * 
 * Frontend components expect:
 *   { id, type, title, message, is_read, created_at, data, action_url, actions }
 */
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
    action_label: deriveActionLabel(backendNotification),
    actions: deriveActions(backendNotification),
  };
};

/**
 * Derive action label based on notification type
 */
const deriveActionLabel = (notification) => {
  const type = notification.notification_type || '';
  if (type.startsWith('appointment')) return 'View Appointment';
  if (type === 'prescription_ready') return 'View Prescription';
  if (type === 'lab_result_ready') return 'View Results';
  if (type === 'chat_message' || type === 'doctor_response') return 'View Message';
  if (notification.action_url) return 'View Details';
  return null;
};

/**
 * Derive UI actions based on notification type
 */
const deriveActions = (notification) => {
  const actions = [];
  const type = notification.notification_type || '';

  if (type.startsWith('appointment')) {
    actions.push({ type: 'view', label: 'View Details' });
  } else if (type === 'chat_message' || type === 'doctor_response') {
    actions.push({ type: 'reply', label: 'Reply' });
  } else if (type === 'prescription_ready') {
    actions.push({ type: 'view', label: 'View Prescription' });
  } else if (type === 'lab_result_ready') {
    actions.push({ type: 'view', label: 'View Results' });
  } else if (notification.action_url) {
    actions.push({ type: 'view', label: 'View' });
  }

  return actions;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Notification Stats Header
 */
const NotificationStatsHeader = ({ stats, onMarkAllRead }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
        </div>

        <div className="h-10 w-px bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats?.unread || 0}</p>
            <p className="text-sm text-gray-500">Unread</p>
          </div>
        </div>

        <div className="h-10 w-px bg-gray-200 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MailOpen className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats?.read || 0}</p>
            <p className="text-sm text-gray-500">Read</p>
          </div>
        </div>
      </div>

      {stats?.unread > 0 && (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<CheckCheck className="w-4 h-4" />}
          onClick={onMarkAllRead}
        >
          Mark All Read
        </Button>
      )}
    </div>
  );
};

/**
 * Filters Bar
 */
const FiltersBar = ({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onClearFilters
}) => {
  const hasFilters = searchQuery || filter !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search notifications..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <select
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        {FILTER_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          leftIcon={<X className="w-4 h-4" />}
        >
          Clear
        </Button>
      )}
    </div>
  );
};

/**
 * Notification Item
 */
const NotificationItem = ({
  notification,
  onRead,
  onDelete,
  onClick,
  onNavigate
}) => {
  const [showActions, setShowActions] = useState(false);

  const typeConfig = NOTIFICATION_TYPES[notification.type] || DEFAULT_TYPE_CONFIG;
  const TypeIcon = typeConfig.icon;
  const isUnread = !notification.is_read;

  const getTimeDisplay = () => {
    try {
      const date = parseISO(notification.created_at);
      if (isToday(date)) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      if (isYesterday(date)) {
        return `Yesterday ${format(date, 'h:mm a')}`;
      }
      return format(date, 'MMM d, h:mm a');
    } catch {
      return notification.created_at;
    }
  };

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
        isUnread
          ? 'bg-primary-50/50 border-primary-100'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-2 rounded-lg flex-shrink-0 ${typeConfig.color}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-medium line-clamp-1 ${
                isUnread ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 line-clamp-2 ${
                isUnread ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {notification.message}
              </p>
            </div>

            {/* Unread Indicator */}
            {isUnread && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
            )}
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{getTimeDisplay()}</span>
              <Badge variant="secondary" size="sm">
                {typeConfig.label}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {notification.action_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(notification.action_url);
                  }}
                  className="text-primary-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>

                {showActions && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActions(false);
                      }}
                    />
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRead(notification.id);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(notification.id);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Notification Group (by date)
 */
const NotificationGroup = ({
  date,
  notifications,
  onRead,
  onDelete,
  onClick,
  onNavigate
}) => {
  const getGroupTitle = () => {
    try {
      const dateObj = parseISO(date);
      if (isToday(dateObj)) return 'Today';
      if (isYesterday(dateObj)) return 'Yesterday';
      return format(dateObj, 'EEEE, MMMM d, yyyy');
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-500 px-1">
        {getGroupTitle()}
      </h3>
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRead={onRead}
            onDelete={onDelete}
            onClick={onClick}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Notification Detail Modal
 */
const NotificationDetailModal = ({ isOpen, onClose, notification, onNavigate }) => {
  if (!notification) return null;

  const typeConfig = NOTIFICATION_TYPES[notification.type] || DEFAULT_TYPE_CONFIG;
  const TypeIcon = typeConfig.icon;

  const handleAction = () => {
    if (notification.action_url) {
      onNavigate(notification.action_url);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Details"
      size="md"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${typeConfig.color}`}>
            <TypeIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {notification.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {(() => {
                try {
                  return format(parseISO(notification.created_at), 'MMMM d, yyyy h:mm a');
                } catch {
                  return notification.created_at;
                }
              })()}
            </p>
          </div>
          <Badge variant="secondary">
            {typeConfig.label}
          </Badge>
        </div>

        {/* Message */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-gray-700 whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* Additional Data */}
        {notification.data && Object.keys(notification.data).length > 0 && (
          <div className="space-y-2">
            {notification.data.patient_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Patient:</span>
                <span className="font-medium">{notification.data.patient_name}</span>
              </div>
            )}
            {notification.data.doctor_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Doctor:</span>
                <span className="font-medium">{notification.data.doctor_name}</span>
              </div>
            )}
            {notification.data.appointment_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {formatDate(notification.data.appointment_date, 'MMM d')} at {formatTime(notification.data.appointment_time)}
                </span>
              </div>
            )}
            {notification.data.consultation_type && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {notification.data.consultation_type === 'video' ? 'Video Call' : 'Audio Call'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {notification.action_url && (
          <Button
            variant="primary"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={handleAction}
          >
            {notification.action_label || 'View Details'}
          </Button>
        )}
      </div>
    </Modal>
  );
};

/**
 * Notification Settings Modal
 * Aligned with backend UserNotificationPreference model and API
 */
const NotificationSettingsModal = ({ isOpen, onClose, onSave, isLoading: isSaving }) => {
  const [settings, setSettings] = useState(null);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
      // Backend returns: { success, preferences: {...}, notification_types: [...] }
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
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTypeToggle = async (notificationType, currentEnabled) => {
    try {
      await notificationService.toggleNotificationType(notificationType, !currentEnabled);
      setNotificationTypes(prev =>
        prev.map(nt =>
          nt.type === notificationType ? { ...nt, enabled: !currentEnabled } : nt
        )
      );
      toast.success('Preference updated');
    } catch (err) {
      toast.error('Failed to update preference');
    }
  };

  const handleSave = async () => {
    try {
      await notificationService.updatePreferences({
        notifications_enabled: settings.notifications_enabled,
        push_enabled: settings.push_enabled,
        quiet_hours_enabled: settings.quiet_hours_enabled,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
        preferred_language: settings.preferred_language,
      });

      // Update quiet hours separately if changed
      if (settings.quiet_hours_enabled !== undefined) {
        await notificationService.updateQuietHours({
          enabled: settings.quiet_hours_enabled,
          start_time: settings.quiet_hours_start || '22:00',
          end_time: settings.quiet_hours_end || '07:00',
        });
      }

      onSave(settings);
      onClose();
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const SettingToggle = ({ label, description, checked, onChange, disabled, icon: Icon }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-white rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Settings"
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">{error}</p>
          <Button variant="outline" size="sm" onClick={loadPreferences} className="mt-3">
            Retry
          </Button>
        </div>
      ) : settings ? (
        <>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* General Settings */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary-600" />
                General
              </h4>
              <div className="space-y-2">
                <SettingToggle
                  label="All Notifications"
                  description="Enable or disable all notifications"
                  checked={settings.notifications_enabled}
                  onChange={() => handleToggle('notifications_enabled')}
                  icon={Bell}
                />
                <SettingToggle
                  label="Push Notifications"
                  description="Receive push notifications on your device"
                  checked={settings.push_enabled}
                  onChange={() => handleToggle('push_enabled')}
                  disabled={!settings.notifications_enabled}
                  icon={Smartphone}
                />
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary-600" />
                Quiet Hours
              </h4>
              <div className="space-y-3">
                <SettingToggle
                  label="Enable Quiet Hours"
                  description="Mute non-urgent notifications during specified hours"
                  checked={settings.quiet_hours_enabled}
                  onChange={() => handleToggle('quiet_hours_enabled')}
                  icon={Moon}
                />
                {settings.quiet_hours_enabled && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl ml-12">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={settings.quiet_hours_start || '22:00'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          quiet_hours_start: e.target.value
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <span className="text-gray-500">to</span>
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={settings.quiet_hours_end || '07:00'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          quiet_hours_end: e.target.value
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Types from Backend */}
            {notificationTypes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary-600" />
                  Notification Types
                </h4>
                <div className="space-y-2">
                  {notificationTypes.map((nt) => {
                    const typeConfig = NOTIFICATION_TYPES[nt.type] || DEFAULT_TYPE_CONFIG;
                    const TypeIcon = typeConfig.icon;

                    return (
                      <SettingToggle
                        key={nt.type}
                        label={nt.name}
                        description={!nt.can_disable ? 'Always enabled' : undefined}
                        checked={nt.enabled}
                        onChange={() => handleTypeToggle(nt.type, nt.enabled)}
                        disabled={!nt.can_disable || !settings.notifications_enabled}
                        icon={TypeIcon}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              disabled={isSaving}
            >
              Save Settings
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  );
};

/**
 * Delete Confirmation Modal
 */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isLoading, isBulk }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Notification"
      size="sm"
    >
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-gray-700">
          {isBulk
            ? 'Are you sure you want to delete all notifications? This action cannot be undone.'
            : 'Are you sure you want to delete this notification? This action cannot be undone.'
          }
        </p>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          disabled={isLoading}
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

const DoctorNotifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Modals
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  // ============================================================================
  // FETCH NOTIFICATIONS
  // ============================================================================

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        page_size: 50
      };

      // Build filter params matching backend query params
      if (filter === 'unread') {
        params.unread_only = 'true';
      } else if (filter !== 'all' && filter !== 'read') {
        // Map frontend filter categories to backend notification_type prefixes
        // Backend filters by exact type, so we pass the category
        params.type = filter;
      }

      // Note: Backend doesn't support 'read_only' or 'search' params directly
      // Search is done client-side

      /**
       * notificationService.getNotifications() calls:
       *   api.get('/notifications/?page_size=50&...')
       * 
       * Which returns response.data (via axios) which is the Django response:
       *   { count, next, previous, results: [...] }
       * 
       * Each result from NotificationListSerializer:
       *   { id, notification_type, title, body, icon, color, is_read, created_at }
       */
      const data = await notificationService.getNotifications(params);

      // data is already response.data from axios
      // It's the paginated response: { count, next, previous, results: [...] }
      const rawNotifications = data.results || [];

      // Normalize backend format to frontend format
      const normalized = rawNotifications.map(normalizeNotification);

      // Apply client-side search filter
      let filtered = normalized;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = normalized.filter(n =>
          n.title?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query)
        );
      }

      // Apply client-side 'read' filter (backend doesn't support read_only)
      if (filter === 'read') {
        filtered = filtered.filter(n => n.is_read);
      }

      // Apply client-side type filter for grouped categories
      if (filter === 'appointment') {
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
      } else if (filter === 'chat') {
        filtered = filtered.filter(n =>
          n.type === 'chat_message' || n.type === 'doctor_response'
        );
      } else if (filter === 'general') {
        filtered = filtered.filter(n =>
          ['general', 'welcome', 'account_update'].includes(n.type)
        );
      }

      setNotifications(filtered);
      setPagination({
        count: data.count || 0,
        next: data.next,
        previous: data.previous
      });

      // Calculate stats from all normalized (not filtered) data
      setStats({
        total: data.count || normalized.length,
        unread: normalized.filter(n => !n.is_read).length,
        read: normalized.filter(n => n.is_read).length
      });

    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(getErrorMessage(err, 'Failed to load notifications'));
      setNotifications([]);
      setStats({ total: 0, unread: 0, read: 0 });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, filter]);

  // Initial load and on filter change
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = {};

    notifications.forEach(notification => {
      try {
        const date = format(parseISO(notification.created_at), 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(notification);
      } catch (err) {
        console.error('Error grouping notification:', err);
      }
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b) - new Date(a))
      .map(([date, items]) => ({ date, notifications: items }));
  }, [notifications]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNavigate = useCallback((url) => {
    if (url) {
      navigate(url);
    }
  }, [navigate]);

  /**
   * Mark single notification as read.
   * Uses: POST /notifications/<id>/read/
   */
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markOneAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setStats(prev => prev ? {
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      } : prev);
    } catch (err) {
      console.error('Error marking as read:', err);
      toast.error('Failed to mark as read');
    }
  }, []);

  /**
   * Mark all notifications as read.
   * Uses: POST /notifications/mark-read/ with empty body
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await notificationService.markAllAsRead();

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => prev ? {
        ...prev,
        unread: 0,
        read: prev.total
      } : prev);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast.error('Failed to mark all as read');
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  /**
   * Delete notification.
   * Uses: DELETE /notifications/<id>/delete/
   */
  const handleDeleteNotification = useCallback(async () => {
    if (!notificationToDelete) return;

    try {
      setIsActionLoading(true);
      await notificationService.deleteNotification(notificationToDelete);

      const deletedNotification = notifications.find(n => n.id === notificationToDelete);
      setNotifications(prev => prev.filter(n => n.id !== notificationToDelete));
      setStats(prev => {
        if (!prev) return prev;
        const newStats = { ...prev, total: Math.max(0, prev.total - 1) };
        if (deletedNotification && !deletedNotification.is_read) {
          newStats.unread = Math.max(0, prev.unread - 1);
        } else if (deletedNotification) {
          newStats.read = Math.max(0, prev.read - 1);
        }
        return newStats;
      });
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
    } finally {
      setIsActionLoading(false);
    }
  }, [notificationToDelete, notifications]);

  const handleNotificationClick = useCallback((notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  }, []);

  const handleSaveSettings = useCallback((newSettings) => {
    // Settings are saved inside the modal component
    // Just close and refresh
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilter('all');
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

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
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">
            Stay updated with your latest notifications
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
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Settings className="w-4 h-4" />}
            onClick={() => setShowSettingsModal(true)}
          >
            Settings
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
            Dismiss
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stats Header */}
      <NotificationStatsHeader
        stats={stats}
        onMarkAllRead={handleMarkAllAsRead}
      />

      {/* Filters */}
      <Card padding="md">
        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          onClearFilters={handleClearFilters}
        />
      </Card>

      {/* Notifications List */}
      {groupedNotifications.length > 0 ? (
        <div className="space-y-6">
          {groupedNotifications.map(({ date, notifications: groupNotifications }) => (
            <NotificationGroup
              key={date}
              date={date}
              notifications={groupNotifications}
              onRead={handleMarkAsRead}
              onDelete={(id) => {
                setNotificationToDelete(id);
                setShowDeleteModal(true);
              }}
              onClick={handleNotificationClick}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      ) : (
        <Card padding="md">
          <EmptyState
            icon={BellOff}
            title="No Notifications"
            description={
              searchQuery || filter !== 'all'
                ? 'No notifications match your filters'
                : 'You have no notifications yet'
            }
            action={
              (searchQuery || filter !== 'all') && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Modals */}
      <NotificationDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedNotification(null);
        }}
        notification={selectedNotification}
        onNavigate={handleNavigate}
      />

      <NotificationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        isLoading={isActionLoading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setNotificationToDelete(null);
        }}
        onConfirm={handleDeleteNotification}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default DoctorNotifications;