import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { 
  Menu, 
  Bell, 
  ArrowLeft, 
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import { Avatar, Badge, LanguageSwitcher, VoiceButton } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

/**
 * Header component for app navigation
 */
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
  const [unreadCount, setUnreadCount] = useState(3); // TODO: Get from API

  // Handle back navigation
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // Navigate to home based on role
      navigate(isDoctor ? '/doctor/home' : '/patient/home');
    }
  };

  // Handle notification click
  const handleNotificationClick = () => {
    const notificationPath = isDoctor ? '/doctor/notifications' : '/patient/notifications';
    navigate(notificationPath);
  };

  // Handle profile click
  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // Navigate to settings
  const goToSettings = () => {
    const settingsPath = isDoctor ? '/doctor/settings' : '/patient/settings';
    navigate(settingsPath);
    setShowProfileMenu(false);
  };

  // Handle logout
  const onLogout = async () => {
    setShowProfileMenu(false);
    await handleLogout();
  };

  return (
    <header 
      className={`
        sticky top-0 z-30
        ${transparent 
          ? 'bg-transparent' 
          : 'bg-white border-b border-gray-100 shadow-sm'
        }
        ${className}
      `}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Menu button */}
          {showMenu && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
          )}

          {/* Back button */}
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
          )}

          {/* Title */}
          <div className="flex flex-col">
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Custom right content */}
          {rightContent}

          {/* Voice button */}
          {showVoice && voiceEnabled && (
            <VoiceButton
              mode="listen"
              size="sm"
              variant="secondary"
            />
          )}

          {/* Search button */}
          {showSearch && (
            <button
              onClick={onSearchClick}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search size={22} className="text-gray-600" />
            </button>
          )}

          {/* Language switcher */}
          <div className="hidden sm:block">
            <LanguageSwitcher variant="minimal" />
          </div>

          {/* Notifications */}
          {showNotifications && (
            <button
              onClick={handleNotificationClick}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={22} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1">
                  <Badge.Count count={unreadCount} />
                </span>
              )}
            </button>
          )}

          {/* Profile */}
          {showProfile && user && (
            <div className="relative">
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <Avatar
                  src={user.profile_photo}
                  name={fullName}
                  size="sm"
                />
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 hidden sm:block transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Profile dropdown */}
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900">{fullName}</p>
                      <p className="text-sm text-gray-500">{user.phone}</p>
                      <Badge 
                        variant={isDoctor ? 'primary' : 'secondary'}
                        size="xs"
                        className="mt-2"
                      >
                        {isDoctor ? t('auth.doctor') : t('auth.patient')}
                      </Badge>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        onClick={goToSettings}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User size={18} />
                        {t('nav.profile')}
                      </button>
                      <button
                        onClick={goToSettings}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings size={18} />
                        {t('nav.settings')}
                      </button>
                    </div>

                    {/* Language switcher (mobile) */}
                    <div className="px-4 py-2 border-t border-gray-100 sm:hidden">
                      <LanguageSwitcher variant="buttons" size="sm" />
                    </div>

                    {/* Logout */}
                    <div className="pt-1 border-t border-gray-100">
                      <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50"
                      >
                        <LogOut size={18} />
                        {t('auth.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
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