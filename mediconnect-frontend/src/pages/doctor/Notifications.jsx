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
  Loader2
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
// CONSTANTS
// ============================================================================

const NOTIFICATION_TYPES = {
  appointment: {
    icon: Calendar,
    color: 'bg-blue-100 text-blue-600',
    label: 'Appointment'
  },
  consultation: {
    icon: Video,
    color: 'bg-green-100 text-green-600',
    label: 'Consultation'
  },
  patient: {
    icon: User,
    color: 'bg-purple-100 text-purple-600',
    label: 'Patient'
  },
  message: {
    icon: MessageSquare,
    color: 'bg-primary-100 text-primary-600',
    label: 'Message'
  },
  prescription: {
    icon: Pill,
    color: 'bg-amber-100 text-amber-600',
    label: 'Prescription'
  },
  review: {
    icon: Star,
    color: 'bg-yellow-100 text-yellow-600',
    label: 'Review'
  },
  reminder: {
    icon: Clock,
    color: 'bg-orange-100 text-orange-600',
    label: 'Reminder'
  },
  alert: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600',
    label: 'Alert'
  },
  system: {
    icon: Info,
    color: 'bg-gray-100 text-gray-600',
    label: 'System'
  }
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'patient', label: 'Patients' },
  { value: 'review', label: 'Reviews' },
  { value: 'system', label: 'System' }
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Notification Stats Header
 */
const NotificationStatsHeader = ({ stats, onMarkAllRead }) => {
  const { t } = useTranslation();

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
  const { t } = useTranslation();
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
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
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
                      {isUnread ? (
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
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Mark as Unread
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
  const { t } = useTranslation();

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
  const { t } = useTranslation();

  if (!notification) return null;

  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
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
              {format(parseISO(notification.created_at), 'MMMM d, yyyy h:mm a')}
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
        {notification.data && (
          <div className="space-y-2">
            {notification.data.patient_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Patient:</span>
                <span className="font-medium">{notification.data.patient_name}</span>
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
 */
const NotificationSettingsModal = ({ isOpen, onClose, settings, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    sound_enabled: true,
    vibration_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    appointment_reminders: true,
    consultation_updates: true,
    patient_messages: true,
    review_notifications: true,
    system_updates: true
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = (key) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const SettingToggle = ({ label, description, settingKey, icon: Icon }) => (
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
        onClick={() => handleToggle(settingKey)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          localSettings[settingKey] ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            localSettings[settingKey] ? 'translate-x-6' : 'translate-x-1'
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
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Delivery Channels */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary-600" />
            Delivery Channels
          </h4>
          <div className="space-y-2">
            <SettingToggle
              label="Push Notifications"
              description="Receive notifications on your device"
              settingKey="push_enabled"
              icon={Bell}
            />
            <SettingToggle
              label="Email Notifications"
              description="Receive notifications via email"
              settingKey="email_enabled"
              icon={Mail}
            />
            <SettingToggle
              label="SMS Notifications"
              description="Receive notifications via SMS"
              settingKey="sms_enabled"
              icon={MessageSquare}
            />
          </div>
        </div>

        {/* Sound & Vibration */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary-600" />
            Sound & Vibration
          </h4>
          <div className="space-y-2">
            <SettingToggle
              label="Sound"
              settingKey="sound_enabled"
              icon={Volume2}
            />
            <SettingToggle
              label="Vibration"
              settingKey="vibration_enabled"
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
              description="Mute notifications during specified hours"
              settingKey="quiet_hours_enabled"
              icon={Moon}
            />
            {localSettings.quiet_hours_enabled && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl ml-12">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={localSettings.quiet_hours_start}
                    onChange={(e) => setLocalSettings(prev => ({ 
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
                    value={localSettings.quiet_hours_end}
                    onChange={(e) => setLocalSettings(prev => ({ 
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

        {/* Notification Types */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary-600" />
            Notification Types
          </h4>
          <div className="space-y-2">
            <SettingToggle
              label="Appointment Reminders"
              settingKey="appointment_reminders"
              icon={Calendar}
            />
            <SettingToggle
              label="Consultation Updates"
              settingKey="consultation_updates"
              icon={Video}
            />
            <SettingToggle
              label="Patient Messages"
              settingKey="patient_messages"
              icon={MessageSquare}
            />
            <SettingToggle
              label="Review Notifications"
              settingKey="review_notifications"
              icon={Star}
            />
            <SettingToggle
              label="System Updates"
              settingKey="system_updates"
              icon={Info}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          disabled={isLoading}
        >
          Save Settings
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Delete Confirmation Modal
 */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isLoading, isBulk }) => {
  const { t } = useTranslation();

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
  const [settings, setSettings] = useState(null);
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

      // Add filters
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (filter !== 'all') {
        if (filter === 'unread') {
          params.unread_only = true;
        } else if (filter === 'read') {
          params.read_only = true;
        } else {
          params.type = filter;
        }
      }

      const [notificationsRes, preferencesRes] = await Promise.allSettled([
        notificationService.getNotifications(params),
        notificationService.getPreferences()
      ]);

      if (notificationsRes.status === 'fulfilled') {
        const data = notificationsRes.value.data;
        setNotifications(data.results || data || []);
        setPagination({
          count: data.count || 0,
          next: data.next,
          previous: data.previous
        });

        // Calculate stats
        const allNotifications = data.results || data || [];
        setStats({
          total: data.count || allNotifications.length,
          unread: allNotifications.filter(n => !n.is_read).length,
          read: allNotifications.filter(n => n.is_read).length
        });
      } else {
        throw notificationsRes.reason;
      }

      if (preferencesRes.status === 'fulfilled') {
        setSettings(preferencesRes.value.data);
      }

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

  // Initial load
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

    // Sort dates descending
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

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead({ notification_ids: [notificationId] });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }));
    } catch (err) {
      console.error('Error marking as read:', err);
      toast.error('Failed to mark as read');
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await notificationService.markAllAsRead();
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({
        ...prev,
        unread: 0,
        read: prev.total
      }));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast.error('Failed to mark all as read');
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const handleDeleteNotification = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await notificationService.deleteNotification(notificationToDelete);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationToDelete));
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
    } finally {
      setIsActionLoading(false);
    }
  }, [notificationToDelete]);

  const handleNotificationClick = useCallback((notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  }, []);

  const handleSaveSettings = useCallback(async (newSettings) => {
    try {
      setIsActionLoading(true);
      await notificationService.updatePreferences(newSettings);
      setSettings(newSettings);
      setShowSettingsModal(false);
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilter('all');
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

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
        settings={settings}
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