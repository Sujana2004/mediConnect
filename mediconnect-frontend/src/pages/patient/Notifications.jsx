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
  WifiOff
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
  appointment: {
    icon: Calendar,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    label: 'Appointment'
  },
  appointment_reminder: {
    icon: BellRing,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    label: 'Reminder'
  },
  consultation: {
    icon: Video,
    color: 'text-green-500',
    bg: 'bg-green-100',
    label: 'Consultation'
  },
  prescription: {
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    label: 'Prescription'
  },
  medicine_reminder: {
    icon: Pill,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    label: 'Medicine'
  },
  health_tip: {
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-100',
    label: 'Health Tip'
  },
  lab_report: {
    icon: Activity,
    color: 'text-cyan-500',
    bg: 'bg-cyan-100',
    label: 'Lab Report'
  },
  doctor_message: {
    icon: MessageSquare,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100',
    label: 'Message'
  },
  emergency: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-100',
    label: 'Emergency'
  },
  promotion: {
    icon: Gift,
    color: 'text-yellow-500',
    bg: 'bg-yellow-100',
    label: 'Promotion'
  },
  system: {
    icon: Info,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    label: 'System'
  },
  payment: {
    icon: CreditCard,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100',
    label: 'Payment'
  },
  review: {
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    label: 'Review'
  },
  security: {
    icon: Shield,
    color: 'text-red-500',
    bg: 'bg-red-100',
    label: 'Security'
  }
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread Only' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'medicine_reminder', label: 'Medicine Reminders' },
  { value: 'health_tip', label: 'Health Tips' },
  { value: 'doctor_message', label: 'Doctor Messages' }
];

// ============================================================================
// ERROR COMPONENT
// ============================================================================

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.errorOccurred', 'Something went wrong')}
      </h3>
      <p className="text-gray-500 text-center mb-4 max-w-sm">
        {message || t('common.tryAgain', 'Please try again later')}
      </p>
      <Button variant="primary" onClick={onRetry}>
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
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center max-w-sm">
        {t('common.checkConnection', 'Please check your internet connection and try again')}
      </p>
    </div>
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

  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
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

  return (
    <div
      className={`
        relative p-4 border-b last:border-b-0 transition-colors
        ${notification.is_read ? 'bg-white' : 'bg-blue-50/50'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Unread Indicator */}
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
          ${typeConfig.bg}
        `}>
          <IconComponent className={`w-5 h-5 ${typeConfig.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-gray-900 truncate">
                  {notification.title}
                </h3>
                <Badge variant="default" size="sm" className="flex-shrink-0">
                  {typeConfig.label}
                </Badge>
              </div>
              <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatTime(notification.created_at)}
              </p>
            </div>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border z-20 py-1">
                    {!notification.is_read && (
                      <button
                        onClick={() => {
                          onMarkRead(notification.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('notifications.delete', 'Delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {notification.actions.slice(0, expanded ? undefined : 2).map((action, index) => (
                <Button
                  key={action.type}
                  variant={index === 0 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(action)}
                >
                  {action.label}
                </Button>
              ))}
              {!expanded && notification.actions.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                >
                  +{notification.actions.length - 2} more
                </Button>
              )}
            </div>
          )}

          {/* Additional Data */}
          {notification.data && expanded && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              {notification.data.doctor_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{notification.data.doctor_name}</span>
                </div>
              )}
              {notification.data.date && notification.data.time && (
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Calendar className="w-4 h-4" />
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
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-500 px-4 py-2 bg-gray-50">
        {title}
      </h3>
      <Card className="overflow-hidden">
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
      </Card>
    </div>
  );
};

// ============================================================================
// SETTINGS MODAL COMPONENT
// ============================================================================

const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load preferences when modal opens
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
      setSettings(response.data);
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

  const handleTypeToggle = (type, channel) => {
    setSettings(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types?.[type],
          [channel]: !prev.types?.[type]?.[channel]
        }
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await notificationService.updatePreferences(settings);
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
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-primary-500' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('notifications.settings', 'Notification Settings')}
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadPreferences} />
      ) : settings ? (
        <>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* General Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('notifications.generalSettings', 'General Settings')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('notifications.pushNotifications', 'Push Notifications')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('notifications.pushDesc', 'Receive notifications on your device')}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch 
                    checked={settings.push_enabled} 
                    onChange={() => handleToggle('push_enabled')} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('notifications.emailNotifications', 'Email Notifications')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('notifications.emailDesc', 'Receive notifications via email')}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch 
                    checked={settings.email_enabled} 
                    onChange={() => handleToggle('email_enabled')} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('notifications.smsNotifications', 'SMS Notifications')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('notifications.smsDesc', 'Receive notifications via SMS')}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch 
                    checked={settings.sms_enabled} 
                    onChange={() => handleToggle('sms_enabled')} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('notifications.sound', 'Sound')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('notifications.soundDesc', 'Play sound for notifications')}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch 
                    checked={settings.sound_enabled} 
                    onChange={() => handleToggle('sound_enabled')} 
                  />
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('notifications.quietHours', 'Quiet Hours')}
              </h3>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {t('notifications.enableQuietHours', 'Enable Quiet Hours')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('notifications.quietHoursDesc', 'Mute notifications during set hours')}
                    </p>
                  </div>
                  <ToggleSwitch 
                    checked={settings.quiet_hours_enabled} 
                    onChange={() => handleToggle('quiet_hours_enabled')} 
                  />
                </div>
                {settings.quiet_hours_enabled && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">
                        {t('notifications.from', 'From')}
                      </label>
                      <input
                        type="time"
                        value={settings.quiet_hours_start || '22:00'}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          quiet_hours_start: e.target.value 
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">
                        {t('notifications.to', 'To')}
                      </label>
                      <input
                        type="time"
                        value={settings.quiet_hours_end || '07:00'}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          quiet_hours_end: e.target.value 
                        }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Notification Types */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('notifications.notificationTypes', 'Notification Types')}
              </h3>
              <Card className="overflow-hidden">
                <div className="divide-y">
                  {Object.entries(NOTIFICATION_TYPES).slice(0, 8).map(([type, config]) => {
                    const IconComponent = config.icon;
                    const typeSettings = settings.types?.[type] || { push: true, email: false, sms: false };
                    
                    return (
                      <div key={type} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                            <IconComponent className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <span className="font-medium text-gray-900">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-6 pl-11">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={typeSettings.push}
                              onChange={() => handleTypeToggle(type, 'push')}
                              disabled={!settings.push_enabled}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-600">Push</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={typeSettings.email}
                              onChange={() => handleTypeToggle(type, 'email')}
                              disabled={!settings.email_enabled}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-600">Email</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={typeSettings.sms}
                              onChange={() => handleTypeToggle(type, 'sms')}
                              disabled={!settings.sms_enabled}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-600">SMS</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSaving}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
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

  // State - NO MOCK DATA, starts empty
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

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Sync filter to URL
  useEffect(() => {
    if (filter !== 'all') {
      setSearchParams({ filter });
    } else {
      setSearchParams({});
    }
  }, [filter, setSearchParams]);

  // API: Load notifications
  const loadNotifications = async () => {
    if (!isOnline) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await notificationService.getAll();
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load notifications');
      toast.error(t('notifications.loadError', 'Failed to load notifications'));
    } finally {
      setIsLoading(false);
    }
  };

  // API: Refresh notifications
  const handleRefresh = async () => {
    if (!isOnline) {
      toast.error(t('common.offline', 'You are offline'));
      return;
    }

    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await notificationService.getAll();
      setNotifications(response.data || []);
      toast.success(t('notifications.refreshed', 'Notifications refreshed'));
    } catch (err) {
      toast.error(t('notifications.refreshError', 'Failed to refresh notifications'));
    } finally {
      setIsRefreshing(false);
    }
  };

  // API: Mark as read
  const handleMarkRead = async (id) => {
    setProcessingIds(prev => [...prev, id]);
    
    try {
      await notificationService.markAsRead([id]);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      toast.error(t('notifications.markReadError', 'Failed to mark as read'));
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  // API: Mark all as read
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

  // API: Delete notification
  const handleDelete = async (id) => {
    setProcessingIds(prev => [...prev, id]);
    
    try {
      // Note: Add delete endpoint to notificationService if not exists
      // await notificationService.delete(id);
      
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success(t('notifications.deleted', 'Notification deleted'));
    } catch (err) {
      toast.error(t('notifications.deleteError', 'Failed to delete notification'));
      // Revert on error - would need to reload
      loadNotifications();
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  // Handle notification action
  const handleAction = useCallback((notification, action) => {
    // Mark as read first
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }

    switch (action.type) {
      case 'view':
      case 'view_prescription':
        if (notification.data?.appointment_id) {
          navigate(`/patient/appointments/${notification.data.appointment_id}`);
        } else if (notification.data?.prescription_id) {
          navigate(`/patient/medicines?prescription=${notification.data.prescription_id}`);
        } else if (notification.data?.consultation_id) {
          navigate(`/patient/appointments?consultation=${notification.data.consultation_id}`);
        }
        break;
        
      case 'reschedule':
        if (notification.data?.appointment_id) {
          navigate(`/patient/appointments/${notification.data.appointment_id}?action=reschedule`);
        }
        break;
        
      case 'taken':
        // Call medicine reminder API
        toast.success(t('notifications.medicineTaken', 'Medicine marked as taken'));
        break;
        
      case 'skip':
        toast.info(t('notifications.medicineSkipped', 'Medicine skipped'));
        break;
        
      case 'snooze':
        toast.info(t('notifications.medicineSnoozed', 'Reminder snoozed for 30 minutes'));
        break;
        
      case 'rate':
        if (notification.data?.consultation_id) {
          navigate(`/patient/appointments?rate=${notification.data.consultation_id}`);
        }
        break;
        
      case 'book':
        navigate('/patient/doctors');
        break;
        
      case 'reply':
        // Open chat/message - implement when chat feature is ready
        toast.info(t('notifications.replyFeature', 'Reply feature coming soon'));
        break;
        
      case 'consult':
        navigate('/patient/doctors');
        break;
        
      default:
        console.log('Unhandled action:', action);
    }
  }, [navigate, t]);

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Apply type filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter || n.type?.startsWith(filter));
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filter, searchQuery]);

  // Group notifications by date
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

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    return { total, unread };
  }, [notifications]);

  // Render content based on state
  const renderContent = () => {
    // Offline state
    if (!isOnline) {
      return <OfflineState />;
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      );
    }

    // Error state
    if (error) {
      return <ErrorState message={error} onRetry={loadNotifications} />;
    }

    // Empty state
    if (filteredNotifications.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          title={
            searchQuery
              ? t('notifications.noSearchResults', 'No notifications found')
              : filter === 'unread'
                ? t('notifications.noUnread', 'No unread notifications')
                : t('notifications.noNotifications', 'No notifications')
          }
          description={
            searchQuery
              ? t('notifications.tryDifferentSearch', 'Try a different search term')
              : t('notifications.noNotificationsDesc', "You're all caught up! Check back later for updates.")
          }
          action={
            (searchQuery || filter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
              >
                {t('notifications.clearFilters', 'Clear Filters')}
              </Button>
            )
          }
        />
      );
    }

    // Notifications list
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              {t('notifications.title', 'Notifications')}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || !isOnline}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          {!isLoading && !error && (
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{stats.unread}</span>
                <span className="text-sm text-gray-500">{t('notifications.unread', 'unread')}</span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-gray-600">{stats.total}</span>
                <span className="text-sm text-gray-500">{t('notifications.total', 'total')}</span>
              </div>
              {stats.unread > 0 && (
                <>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={processingIds.length > 0}
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    {t('notifications.markAllRead', 'Mark all read')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Search */}
          <Input
            placeholder={t('notifications.search', 'Search notifications...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )
            }
            disabled={isLoading || !!error}
          />
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                disabled={isLoading || !!error}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  disabled:opacity-50
                  ${filter === option.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {option.label}
                {option.value === 'unread' && stats.unread > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
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