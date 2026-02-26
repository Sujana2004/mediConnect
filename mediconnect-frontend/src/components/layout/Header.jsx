import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Menu, Bell, ArrowLeft, Search, Settings, LogOut, User, ChevronDown,
  Stethoscope, Heart, Shield, Clock, Sparkles
} from 'lucide-react';
import { Avatar, Badge, LanguageSwitcher, VoiceButton } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

const Header = ({
  title,
  subtitle,
  showBack = false,
  showMenu = false,
  showSearch = false,
  showNotifications = true,
  showProfile = true,
  showVoice = false,
  onMenuClick,
  onSearchClick,
  rightContent,
  transparent = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fullName, handleLogout, isDoctor, isPatient } = useAuth();
  const { t } = useLanguage();
  const { voiceEnabled } = useVoice();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Detect if current page is doctor or patient section
  const isDoctorPage = location.pathname.startsWith('/doctor');
  const isPatientPage = location.pathname.startsWith('/patient');

  // Role-based theme configuration
  const theme = useMemo(() => {
    if (isDoctorPage) {
      return {
        // Doctor theme - Professional purple gradient
        headerBg: 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600',
        headerShadow: 'shadow-lg shadow-violet-500/20',
        textPrimary: 'text-white',
        textSecondary: 'text-white/70',
        iconColor: 'text-white/80',
        iconHover: 'hover:text-white',
        buttonBg: 'hover:bg-white/15 active:bg-white/25',
        avatarRing: 'ring-white/30 hover:ring-white/50',
        notificationBadge: 'bg-white text-violet-600 ring-violet-600',
        dropdownBg: 'bg-white',
        dropdownHeaderBg: 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50',
        dropdownAccent: 'violet',
        roleIcon: Stethoscope,
        roleColor: 'text-violet-600',
        roleBgColor: 'bg-violet-100',
      };
    }
    // Patient theme - Clean and friendly
    return {
      headerBg: 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50',
      headerShadow: 'shadow-sm shadow-gray-100/50',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-500',
      iconColor: 'text-gray-600',
      iconHover: 'hover:text-gray-800',
      buttonBg: 'hover:bg-gray-100 active:bg-gray-200',
      avatarRing: 'ring-gray-200 hover:ring-primary-300',
      notificationBadge: 'bg-gradient-to-r from-red-500 to-rose-500 text-white ring-white',
      dropdownBg: 'bg-white',
      dropdownHeaderBg: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50',
      dropdownAccent: 'primary',
      roleIcon: Heart,
      roleColor: 'text-blue-600',
      roleBgColor: 'bg-blue-100',
    };
  }, [isDoctorPage]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(isDoctor ? '/doctor/home' : '/patient/home');
    }
  };

  const handleNotificationClick = () => {
    navigate(isDoctor ? '/doctor/notifications' : '/patient/notifications');
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const goToSettings = () => {
    navigate(isDoctor ? '/doctor/settings' : '/patient/settings');
    setShowProfileMenu(false);
  };

  const goToProfile = () => {
    navigate(isDoctor ? '/doctor/profile' : '/patient/profile');
    setShowProfileMenu(false);
  };

  const onLogout = async () => {
    setShowProfileMenu(false);
    await handleLogout();
  };

  const RoleIcon = theme.roleIcon;

  return (
    <header
      className={`
        sticky top-0 z-30 transition-all duration-300
        ${transparent ? 'bg-transparent' : `${theme.headerBg} ${theme.headerShadow}`}
        ${className}
      `}
    >
      {/* Decorative gradient line for doctor pages */}
      {isDoctorPage && !transparent && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-400/0 via-white/30 to-violet-400/0" />
      )}

      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* ===== LEFT SECTION ===== */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Menu Button */}
          {showMenu && (
            <button
              onClick={onMenuClick}
              className={`
                p-2.5 -ml-2 rounded-xl transition-all lg:hidden active:scale-95
                ${theme.buttonBg}
              `}
              aria-label="Open menu"
            >
              <Menu size={22} className={theme.iconColor} />
            </button>
          )}

          {/* Back Button */}
          {showBack && (
            <button
              onClick={handleBack}
              className={`
                p-2.5 -ml-2 rounded-xl transition-all active:scale-95
                ${theme.buttonBg}
              `}
              aria-label="Go back"
            >
              <ArrowLeft size={22} className={theme.iconColor} />
            </button>
          )}

          {/* Title Section */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Role Icon - Only on home page */}
            {isDoctorPage && !showBack && (
              <div className="hidden sm:flex p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <RoleIcon size={20} className="text-white" />
              </div>
            )}

            <div className="flex flex-col min-w-0">
              {title && (
                <h1 className={`text-lg font-bold line-clamp-1 tracking-tight ${theme.textPrimary}`}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className={`text-sm line-clamp-1 -mt-0.5 ${theme.textSecondary}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT SECTION ===== */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {rightContent}

          {/* Voice Button */}
          {showVoice && voiceEnabled && (
            <VoiceButton 
              mode="listen" 
              size="sm" 
              variant={isDoctorPage ? 'ghost' : 'secondary'}
              className={isDoctorPage ? 'text-white hover:bg-white/15' : ''}
            />
          )}

          {/* Search Button */}
          {showSearch && (
            <button
              onClick={onSearchClick}
              className={`
                p-2.5 rounded-xl transition-all active:scale-95
                ${theme.buttonBg}
              `}
              aria-label="Search"
            >
              <Search size={20} className={`${theme.iconColor} ${theme.iconHover}`} />
            </button>
          )}

          {/* Language Switcher */}
          <div className="hidden sm:block">
            <LanguageSwitcher 
              variant="minimal" 
              className={isDoctorPage ? 'text-white/80 hover:text-white' : ''}
            />
          </div>

          {/* Notifications */}
          {showNotifications && (
            <button
              onClick={handleNotificationClick}
              className={`
                relative p-2.5 rounded-xl transition-all active:scale-95
                ${theme.buttonBg}
              `}
              aria-label="Notifications"
            >
              <Bell size={20} className={`${theme.iconColor} ${theme.iconHover}`} />
              {unreadCount > 0 && (
                <span className={`
                  absolute top-1 right-1 min-w-[18px] h-[18px] 
                  flex items-center justify-center px-1 rounded-full 
                  text-[10px] font-bold shadow-sm ring-2
                  ${theme.notificationBadge}
                  ${isDoctorPage ? 'animate-pulse' : ''}
                `}>
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Profile */}
          {showProfile && user && (
            <div className="relative">
              <button
                onClick={handleProfileClick}
                className={`
                  flex items-center gap-2 p-1 sm:p-1.5 rounded-xl transition-all active:scale-95
                  ${theme.buttonBg}
                `}
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className={`ring-2 rounded-full transition-all ${theme.avatarRing}`}>
                  <Avatar src={user.profile_photo} name={fullName} size="sm" />
                </div>
                <ChevronDown
                  size={14}
                  className={`
                    hidden sm:block transition-transform duration-200
                    ${theme.textSecondary}
                    ${showProfileMenu ? 'rotate-180' : ''}
                  `}
                />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />

                  {/* Menu */}
                  <div
                    className={`
                      absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden
                      ${theme.dropdownBg} shadow-2xl border border-gray-100/80
                      z-50
                    `}
                    style={{ animation: 'dropdownSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    {/* User Info Header */}
                    <div className={`px-4 py-4 ${theme.dropdownHeaderBg}`}>
                      <div className="flex items-center gap-3">
                        <div className={`
                          ring-2 ring-offset-2 rounded-full
                          ${isDoctorPage ? 'ring-violet-300' : 'ring-blue-300'}
                        `}>
                          <Avatar src={user.profile_photo} name={fullName} size="lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate">{fullName}</p>
                            {isDoctor && user?.doctor_profile?.verification_status === 'verified' && (
                              <Shield size={14} className="text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{user.phone}</p>
                          {isDoctor && user?.doctor_profile?.specialization_display && (
                            <p className="text-xs text-violet-600 font-medium mt-0.5 truncate">
                              {user.doctor_profile.specialization_display}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Role Badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <Badge
                          variant={isDoctor ? 'primary' : 'secondary'}
                          size="sm"
                          className={`
                            ${isDoctorPage 
                              ? 'bg-violet-100 text-violet-700 border-violet-200' 
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                            }
                          `}
                        >
                          <RoleIcon size={12} className="mr-1" />
                          {isDoctor ? t('auth.doctor') : t('auth.patient')}
                        </Badge>
                        
                        {isDoctor && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-500" />
                            Pro
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Doctor Stats */}
                    {isDoctor && user?.doctor_profile && (
                      <div className="px-4 py-3 bg-gray-50/80 border-y border-gray-100 grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Shield size={14} className="text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <p className="text-xs font-semibold text-gray-900 capitalize">
                              {user.doctor_profile.verification_status || 'Pending'}
                            </p>
                          </div>
                        </div>
                        {user.doctor_profile.experience_years && (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <Clock size={14} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Experience</p>
                              <p className="text-xs font-semibold text-gray-900">
                                {user.doctor_profile.experience_years} years
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={goToProfile}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-sm text-gray-700 font-medium transition-all
                          ${isDoctorPage 
                            ? 'hover:bg-violet-50 hover:text-violet-700' 
                            : 'hover:bg-blue-50 hover:text-blue-700'
                          }
                        `}
                      >
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center
                          ${isDoctorPage ? 'bg-violet-100' : 'bg-blue-100'}
                        `}>
                          <User size={18} className={isDoctorPage ? 'text-violet-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 text-left">
                          <span>{t('nav.profile')}</span>
                          <p className="text-xs text-gray-400 font-normal">View and edit profile</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400 -rotate-90" />
                      </button>

                      <button
                        onClick={goToSettings}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-sm text-gray-700 font-medium transition-all
                          ${isDoctorPage 
                            ? 'hover:bg-violet-50 hover:text-violet-700' 
                            : 'hover:bg-blue-50 hover:text-blue-700'
                          }
                        `}
                      >
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center
                          ${isDoctorPage ? 'bg-violet-100' : 'bg-blue-100'}
                        `}>
                          <Settings size={18} className={isDoctorPage ? 'text-violet-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 text-left">
                          <span>{t('nav.settings')}</span>
                          <p className="text-xs text-gray-400 font-normal">Preferences & privacy</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400 -rotate-90" />
                      </button>
                    </div>

                    {/* Language Switcher (Mobile) */}
                    <div className="px-4 py-3 border-t border-gray-100 sm:hidden">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Language</p>
                      <LanguageSwitcher variant="buttons" size="sm" />
                    </div>

                    {/* Logout */}
                    <div className="p-2 border-t border-gray-100">
                      <button
                        onClick={onLogout}
                        className="
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-sm text-red-600 font-medium transition-all
                          hover:bg-red-50
                        "
                      >
                        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                          <LogOut size={18} className="text-red-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <span>{t('auth.logout')}</span>
                          <p className="text-xs text-red-400 font-normal">Sign out of account</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dropdownSlide {
          from { 
            opacity: 0; 
            transform: translateY(-10px) scale(0.95);
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </header>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showBack: PropTypes.bool,
  showMenu: PropTypes.bool,
  showSearch: PropTypes.bool,
  showNotifications: PropTypes.bool,
  showProfile: PropTypes.bool,
  showVoice: PropTypes.bool,
  onMenuClick: PropTypes.func,
  onSearchClick: PropTypes.func,
  rightContent: PropTypes.node,
  transparent: PropTypes.bool,
  className: PropTypes.string
};

export default Header;