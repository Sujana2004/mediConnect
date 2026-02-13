import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Bell,
  Globe,
  User,
  ChevronDown,
  LogOut,
  Settings,
  FileText,
  Home,
  Pill,
  MessageSquare,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LANGUAGE_OPTIONS = [
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

const NAV_ITEMS = [
  { id: 'home', icon: Home, labelKey: 'patient.navHome', shortLabel: 'Home' },
  { id: 'health', icon: Pill, labelKey: 'patient.navHealth', shortLabel: 'Health' },
  { id: 'chat', icon: MessageSquare, labelKey: 'patient.navChat', shortLabel: 'Chat' },
  { id: 'appointments', icon: Calendar, labelKey: 'patient.navAppointments', shortLabel: 'Appointments' },
  { id: 'records', icon: FileText, labelKey: 'patient.navRecords', shortLabel: 'Records' },
  { id: 'more', icon: Settings, labelKey: 'patient.navMore', shortLabel: 'More' },
];

const PatientTopBar = ({ activeTab, onTabChange, onSOSClick }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([]); // TODO: fetch from API
  const unreadCount = notifications.filter((n) => !n.read).length;

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === i18n.language) || LANGUAGE_OPTIONS[2];

  const setLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('mediconnect_language', code);
    setShowLangDropdown(false);
  };

  const formatName = (name) => {
    if (!name) return '';
    return name.toString().split(/[\s._-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').split(' ')[0] || 'Patient';
  };

  const getInitials = (name) => {
    return (name || 'P')
      .toString()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm safe-area-top">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + App name */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 truncate">MediConnect</h1>
              <p className="text-xs text-gray-600 truncate">
                {t('patient.namaste', 'Namaste')}, {formatName(user?.name)}!
              </p>
            </div>
          </div>

          {/* Navigation bar - horizontal links */}
          <nav className="flex-1 flex items-center justify-center gap-0.5 min-w-0 overflow-x-auto py-1" aria-label={t('patient.mainNavigation', 'Main navigation')}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange?.(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={t(item.labelKey, item.shortLabel)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{t(item.labelKey, item.shortLabel)}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: SOS, Notifications, Language, Profile */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* SOS Emergency */}
            {onSOSClick && (
              <button
                type="button"
                onClick={onSOSClick}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                aria-label={t('emergency.sosButton', 'SOS Emergency')}
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">SOS</span>
              </button>
            )}
            {/* Notifications */}
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 relative touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label={t('patient.notifications', 'Notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Language */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1 px-2.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 touch-manipulation min-h-[48px]"
                aria-label={t('patient.language', 'Language')}
              >
                <Globe className="h-5 w-5" />
                <span className="text-sm font-medium max-w-[4ch] truncate">{currentLang.label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLangDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLangDropdown(false)} aria-hidden="true" />
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border py-1 z-20">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setLanguage(opt.code)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${i18n.language === opt.code ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 touch-manipulation min-w-[48px] min-h-[48px] justify-center"
                aria-label={t('navbar.profile', 'Profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(user?.name)}
                </div>
              </button>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} aria-hidden="true" />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border py-2 z-20">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User className="h-4 w-4" />
                      {t('navbar.profile', 'View Profile')}
                    </Link>
                    <Link
                      to="/patient-dashboard"
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {t('patient.settings', 'Settings')}
                    </Link>
                    <Link
                      to="/health-records"
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <FileText className="h-4 w-4" />
                      {t('navbar.healthRecords', 'Health Records')}
                    </Link>
                    <div className="border-t mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('navbar.logout', 'Logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications dropdown */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} aria-hidden="true" />
          <div className="absolute right-4 left-4 top-full mt-1 bg-white rounded-xl shadow-lg border py-2 max-h-80 overflow-auto z-20">
            <div className="px-4 py-2 border-b">
              <h3 className="font-semibold text-gray-900">{t('patient.notifications', 'Notifications')}</h3>
            </div>
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
                  <p className="text-sm text-gray-900">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>{t('patient.noNotifications', 'No notifications')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};

export default PatientTopBar;
