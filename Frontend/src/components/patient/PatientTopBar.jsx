// src/components/patient/PatientTopBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Bell,
  Globe,
  User,
  ChevronDown,
  LogOut,
  Settings,
  FileText,
  Search,
  Mic,
  MicOff,
  X,
  Check,
  Loader2,
  Menu,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI, settingsAPI } from '../../services/api';

// Language options
const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
];

const PatientTopBar = ({
  onMenuClick, // For mobile menu toggle
  onSOSClick,
  showSearch = false,
  onSearch,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Dropdown states
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Language change loading
  const [changingLanguage, setChangingLanguage] = useState(false);

  // Refs
  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Current language
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === i18n.language) || LANGUAGE_OPTIONS[0];

  // Check voice support
  useEffect(() => {
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (voiceSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [voiceSupported]);

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await notificationsAPI.list({ limit: 10 });
      setNotifications(response.data?.results || response.data || []);
      
      const countResponse = await notificationsAPI.getUnreadCount();
      setUnreadCount(countResponse.data?.count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Change language
  const changeLanguage = async (code) => {
    setChangingLanguage(true);
    
    try {
      // Update i18n
      await i18n.changeLanguage(code);
      localStorage.setItem('mediconnect_language', code);

      // Update backend preference
      await settingsAPI.changeLanguage(code);

      // Update speech recognition language
      if (recognitionRef.current) {
        recognitionRef.current.lang = code === 'hi' ? 'hi-IN' : code === 'te' ? 'te-IN' : 'en-IN';
      }
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setChangingLanguage(false);
      setShowLangDropdown(false);
    }
  };

  // Handle voice command
  const handleVoiceCommand = useCallback((transcript) => {
    const command = transcript.toLowerCase().trim();

    // Navigation commands
    const navigationMap = {
      'go home': 'home',
      'home': 'home',
      'होम': 'home',
      'doctors': 'doctors',
      'find doctor': 'doctors',
      'डॉक्टर': 'doctors',
      'appointments': 'appointments',
      'my appointments': 'appointments',
      'अपॉइंटमेंट': 'appointments',
      'records': 'records',
      'health records': 'records',
      'medicines': 'medicines',
      'medicine': 'medicines',
      'दवाई': 'medicines',
      'chat': 'chat',
      'ai chat': 'chat',
      'settings': 'settings',
      'सेटिंग्स': 'settings',
      'emergency': 'emergency',
      'sos': 'emergency',
      'इमरजेंसी': 'emergency',
    };

    // Check for navigation command
    for (const [key, value] of Object.entries(navigationMap)) {
      if (command.includes(key)) {
        if (value === 'emergency' && onSOSClick) {
          onSOSClick();
        } else {
          navigate(`/patient/${value}`);
        }
        return;
      }
    }

    // If no navigation match, use as search query
    setSearchQuery(transcript);
    setIsSearchOpen(true);
    if (onSearch) {
      onSearch(transcript);
    }
  }, [navigate, onSOSClick, onSearch]);

  // Toggle voice listening
  const toggleVoiceListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'te' ? 'te-IN' : 'en-IN';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  // Format user name
  const formatName = (name) => {
    if (!name) return t('patient.user', 'User');
    return name
      .toString()
      .split(/[\s._-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .split(' ')[0];
  };

  // Get user initials
  const getInitials = (name) => {
    return (name || 'U')
      .toString()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format notification time
  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow', 'Just now');
    if (diffMins < 60) return t('time.minsAgo', '{{mins}}m ago', { mins: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', '{{hours}}h ago', { hours: diffHours });
    if (diffDays < 7) return t('time.daysAgo', '{{days}}d ago', { days: diffDays });
    return date.toLocaleDateString();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      appointment: '📅',
      medicine: '💊',
      health: '❤️',
      emergency: '🚨',
      message: '💬',
      system: '🔔',
    };
    return icons[type] || '🔔';
  };

  return (
    <>
      <header 
        className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              {/* Mobile menu button */}
              {onMenuClick && (
                <button
                  type="button"
                  onClick={onMenuClick}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                  aria-label={t('common.menu', 'Menu')}
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}

              {/* Logo */}
              <Link to="/patient/home" className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 truncate">MediConnect</h1>
                  <p className="text-xs text-gray-500 truncate">
                    {t('patient.namaste', 'Namaste')}, {formatName(user?.full_name || user?.name)}!
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Search (optional) */}
            {showSearch && (
              <div className="flex-1 max-w-md hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch?.(searchQuery)}
                    placeholder={t('search.placeholder', 'Search doctors, medicines...')}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceListening}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${
                        isListening ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label={isListening ? t('voice.stopListening', 'Stop') : t('voice.startListening', 'Voice search')}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Voice Command Button (Mobile) */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceListening}
                  className={`p-2.5 rounded-xl transition-colors md:hidden ${
                    isListening 
                      ? 'bg-red-100 text-red-600 animate-pulse' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label={t('voice.command', 'Voice command')}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}

              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 relative"
                  aria-label={t('notifications.title', 'Notifications')}
                  aria-expanded={showNotifications}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowNotifications(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border z-20 max-h-[70vh] flex flex-col">
                      {/* Header */}
                      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                        <h3 className="font-semibold text-gray-900">
                          {t('notifications.title', 'Notifications')}
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {t('notifications.markAllRead', 'Mark all read')}
                          </button>
                        )}
                      </div>

                      {/* Notification List */}
                      <div className="flex-1 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                          </div>
                        ) : notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => {
                                if (!notification.is_read) {
                                  markAsRead(notification.id);
                                }
                                // Navigate based on notification type
                                if (notification.action_url) {
                                  navigate(notification.action_url);
                                  setShowNotifications(false);
                                }
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors ${
                                !notification.is_read ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                <span className="text-xl flex-shrink-0">
                                  {getNotificationIcon(notification.type)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                    {notification.title || notification.message}
                                  </p>
                                  {notification.body && (
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                      {notification.body}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">{t('notifications.empty', 'No notifications')}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t flex-shrink-0">
                          <Link
                            to="/patient/notifications"
                            onClick={() => setShowNotifications(false)}
                            className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
                          >
                            {t('notifications.viewAll', 'View all notifications')}
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Language Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  disabled={changingLanguage}
                  className="flex items-center gap-1 px-2 py-2 rounded-xl text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  aria-label={t('language.select', 'Select language')}
                  aria-expanded={showLangDropdown}
                >
                  {changingLanguage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Globe className="h-5 w-5" />
                      <span className="text-sm font-medium hidden sm:inline">
                        {currentLang.nativeLabel}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {showLangDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowLangDropdown(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border py-1 z-20">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => changeLanguage(lang.code)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                            i18n.language === lang.code 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-gray-700'
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span className="flex-1 text-left">{lang.nativeLabel}</span>
                          {i18n.language === lang.code && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100"
                  aria-label={t('profile.menu', 'Profile menu')}
                  aria-expanded={showProfileMenu}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(user?.full_name || user?.name)
                    )}
                  </div>
                </button>

                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowProfileMenu(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border py-2 z-20">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b">
                        <p className="font-medium text-gray-900 truncate">
                          {user?.full_name || user?.name || t('patient.user', 'User')}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.phone_number || user?.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to="/patient/profile"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="h-4 w-4 text-gray-500" />
                          {t('profile.view', 'View Profile')}
                        </Link>
                        <Link
                          to="/patient/settings"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="h-4 w-4 text-gray-500" />
                          {t('settings.title', 'Settings')}
                        </Link>
                        <Link
                          to="/patient/records"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          {t('records.title', 'Health Records')}
                        </Link>
                      </div>

                      {/* Voice Read Option */}
                      <div className="py-1 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Enable/disable voice readout
                            setShowProfileMenu(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Volume2 className="h-4 w-4 text-gray-500" />
                          {t('voice.readout', 'Voice Readout')}
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="py-1 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('auth.logout', 'Logout')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Voice Listening Indicator */}
        {isListening && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-center gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="text-sm text-red-700 font-medium">
              {t('voice.listening', 'Listening...')}
            </span>
            <button
              onClick={toggleVoiceListening}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              {t('auth.logoutTitle', 'Logout?')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('auth.logoutMessage', 'Are you sure you want to logout?')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('auth.logout', 'Logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientTopBar;