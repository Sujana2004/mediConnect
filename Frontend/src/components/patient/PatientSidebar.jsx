// src/components/patient/PatientSidebar.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Stethoscope,
  MessageSquare,
  Calendar,
  FileText,
  Pill,
  Activity,
  Bell,
  Settings,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  HelpCircle,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar Navigation Tabs
 */
const MAIN_TABS = [
  {
    id: 'home',
    icon: Home,
    labelKey: 'patient.navHome',
    label: 'Home',
  },
  {
    id: 'symptoms',
    icon: Activity,
    labelKey: 'patient.navSymptoms',
    label: 'Symptom Checker',
  },
  {
    id: 'doctors',
    icon: Stethoscope,
    labelKey: 'patient.navDoctors',
    label: 'Find Doctors',
  },
  {
    id: 'appointments',
    icon: Calendar,
    labelKey: 'patient.navAppointments',
    label: 'Appointments',
  },
  {
    id: 'records',
    icon: FileText,
    labelKey: 'patient.navRecords',
    label: 'Health Records',
  },
  {
    id: 'medicines',
    icon: Pill,
    labelKey: 'patient.navMedicines',
    label: 'Medicines',
  },
  {
    id: 'chat',
    icon: MessageSquare,
    labelKey: 'patient.navChat',
    label: 'AI Assistant',
  },
];

const SECONDARY_TABS = [
  {
    id: 'notifications',
    icon: Bell,
    labelKey: 'patient.navNotifications',
    label: 'Notifications',
  },
  {
    id: 'settings',
    icon: Settings,
    labelKey: 'patient.navSettings',
    label: 'Settings',
  },
  {
    id: 'help',
    icon: HelpCircle,
    labelKey: 'patient.navHelp',
    label: 'Help & Support',
  },
];

const PatientSidebar = ({
  activeTab,
  onTabChange,
  onSOSClick,
  badges = {},
  collapsed = false,
  onCollapse,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  // Get user initials
  const getUserInitials = () => {
    const name = user?.full_name || user?.name || '';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  // Render nav item
  const renderNavItem = (tab, isSecondary = false) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const badgeCount = badges[tab.id];

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onTabChange(tab.id)}
        className={`
          w-full flex items-center gap-3 
          ${collapsed ? 'justify-center px-2' : 'px-3'} 
          py-2.5 rounded-lg 
          text-left text-sm font-medium 
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${isActive
            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 -ml-0.5 pl-2.5'
            : isSecondary
            ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
        aria-current={isActive ? 'page' : undefined}
        aria-label={t(tab.labelKey, tab.label)}
        title={collapsed ? t(tab.labelKey, tab.label) : undefined}
      >
        {/* Icon with badge */}
        <div className="relative flex-shrink-0">
          <Icon 
            className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} 
            aria-hidden="true"
          />
          {badgeCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] 
                flex items-center justify-center 
                bg-red-500 text-white text-[9px] font-bold 
                rounded-full px-0.5"
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </div>

        {/* Label */}
        {!collapsed && (
          <span className="truncate flex-1">{t(tab.labelKey, tab.label)}</span>
        )}

        {/* Badge (alternative position when not collapsed) */}
        {!collapsed && badgeCount > 0 && (
          <span 
            className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full"
          >
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`
        ${collapsed ? 'w-16' : 'w-60'} 
        flex-shrink-0 bg-white border-r border-gray-200 
        flex flex-col h-full
        transition-all duration-200
      `}
      role="navigation"
      aria-label={t('patient.mainNavigation', 'Main navigation')}
    >
      {/* User Profile Section */}
      {!collapsed && user && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getUserInitials()
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">
                {user.full_name || user.name || t('patient.user', 'User')}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.phone_number || user.email || t('patient.patient', 'Patient')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {collapsed && user && (
        <div className="p-3 border-b border-gray-100 flex justify-center">
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
            onClick={() => onTabChange('settings')}
            title={user.full_name || user.name}
          >
            {getUserInitials()}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {/* Section Label */}
        {!collapsed && (
          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('patient.mainMenu', 'Main Menu')}
          </p>
        )}

        {/* Main Tabs */}
        {MAIN_TABS.map((tab) => renderNavItem(tab))}

        {/* Divider */}
        <div className="my-4 border-t border-gray-100" />

        {/* Secondary Section Label */}
        {!collapsed && (
          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('patient.other', 'Other')}
          </p>
        )}

        {/* Secondary Tabs */}
        {SECONDARY_TABS.map((tab) => renderNavItem(tab, true))}
      </nav>

      {/* SOS Button */}
      {onSOSClick && (
        <div className={`p-2 border-t border-gray-100 ${collapsed ? 'px-2' : 'px-3'}`}>
          <button
            type="button"
            onClick={onSOSClick}
            className={`
              w-full flex items-center gap-3 
              ${collapsed ? 'justify-center' : ''} 
              px-3 py-3 rounded-xl 
              text-sm font-bold 
              text-white bg-gradient-to-r from-red-600 to-red-500
              hover:from-red-700 hover:to-red-600
              shadow-sm hover:shadow-md
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
            `}
            aria-label={t('emergency.sosButton', 'SOS Emergency')}
            title={collapsed ? t('emergency.sosButton', 'SOS Emergency') : undefined}
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <span>{t('emergency.sosButton', 'SOS Emergency')}</span>
            )}
          </button>
        </div>
      )}

      {/* Emergency Helpline */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <a
            href="tel:108"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>{t('emergency.call108', 'Emergency: 108')}</span>
          </a>
        </div>
      )}

      {/* Logout Button */}
      <div className={`p-2 border-t border-gray-100 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className={`
            w-full flex items-center gap-3 
            ${collapsed ? 'justify-center' : ''} 
            px-3 py-2.5 rounded-lg 
            text-sm font-medium 
            text-gray-600 hover:bg-red-50 hover:text-red-600
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
          `}
          aria-label={t('auth.logout', 'Logout')}
          title={collapsed ? t('auth.logout', 'Logout') : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>{t('auth.logout', 'Logout')}</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      {onCollapse && (
        <div className="p-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCollapse}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            aria-label={collapsed ? t('sidebar.expand', 'Expand') : t('sidebar.collapse', 'Collapse')}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      )}

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
              {t('auth.logoutMessage', 'Are you sure you want to logout from your account?')}
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
    </aside>
  );
};

// Export tabs for use in parent components
export const TABS = [...MAIN_TABS, ...SECONDARY_TABS];
export default PatientSidebar;