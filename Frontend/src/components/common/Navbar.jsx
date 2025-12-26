import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  X, 
  User, 
  Stethoscope, 
  Bell, 
  Settings,
  Home,
  AlertTriangle,
  Pill,
  FileText,
  MessageSquare,
  ChevronDown,
  LogOut,
  Shield,
  Globe
} from 'lucide-react';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('mediconnect_language', newLang);
  };

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
  };

  // Navigation links
  const navLinks = [
    { 
      path: '/', 
      label: t('navbar.home'), 
      icon: <Home className="h-4 w-4" />,
      exact: true 
    },
    { 
      path: '/symptom-checker', 
      label: t('navbar.symptomChecker'), 
      icon: <MessageSquare className="h-4 w-4" /> 
    },
    { 
      path: '/doctors', 
      label: t('navbar.doctors'), 
      icon: <Stethoscope className="h-4 w-4" /> 
    },
    { 
      path: '/medicines', 
      label: t('navbar.medicines'), 
      icon: <Pill className="h-4 w-4" /> 
    },
    { 
      path: '/emergency', 
      label: t('navbar.emergency'), 
      icon: <AlertTriangle className="h-4 w-4" />,
      emergency: true 
    },
  ];

  const authLinks = isAuthenticated
    ? [
        { 
          path: user?.role === 'patient' ? '/patient-dashboard' : '/doctor-dashboard', 
          label: t('navbar.dashboard'), 
          icon: <Settings className="h-4 w-4" />
        },
        { 
          path: '/health-records', 
          label: t('navbar.healthRecords'), 
          icon: <FileText className="h-4 w-4" /> 
        },
        { 
          path: '/profile', 
          label: t('navbar.profile'), 
          icon: <User className="h-4 w-4" /> 
        },
      ]
    : [
        { 
          path: '/login', 
          label: t('navbar.login'), 
          icon: <User className="h-4 w-4" /> 
        },
        { 
          path: '/register', 
          label: t('navbar.register'), 
          icon: <Shield className="h-4 w-4" /> 
        },
      ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-2 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">MediConnect</h1>
                  <p className="text-xs text-blue-600 font-medium">
                    {t('navbar.ruralHealth')}
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation - Center */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path, link.exact)
                      ? link.emergency
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                  {link.emergency && (
                    <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop Navigation - Right */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Globe className="h-4 w-4 mr-2" />
                {i18n.language === 'en' ? 'हिंदी' : 'English'}
              </button>

              {/* Notifications */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border py-2 z-10">
                      <div className="px-4 py-2 border-b">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  {notification.type === 'appointment' && (
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                  )}
                                  {notification.type === 'medicine' && (
                                    <Pill className="h-5 w-5 text-green-500" />
                                  )}
                                  {notification.type === 'emergency' && (
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                  )}
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm text-gray-900">{notification.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">No notifications</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User Profile Dropdown */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        {getInitials(user?.name || 'User')}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                      showUserDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border py-2 z-10">
                      <div className="px-4 py-3 border-b">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                            {getInitials(user?.name || 'User')}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user?.name}</p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                            <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {user?.role === 'patient' ? t('navbar.patient') : t('navbar.doctor')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <Link
                          to={user?.role === 'patient' ? '/patient-dashboard' : '/doctor-dashboard'}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          {t('navbar.dashboard')}
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          {t('navbar.profile')}
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          {t('navbar.settings')}
                        </Link>
                      </div>

                      <div className="border-t py-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          {t('navbar.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('navbar.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {t('navbar.register')}
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                {isMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Navigation Links */}
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-3 py-3 rounded-lg text-base font-medium ${
                    isActive(link.path, link.exact)
                      ? link.emergency
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                  {link.emergency && (
                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </Link>
              ))}

              {/* Divider */}
              <div className="border-t my-2"></div>

              {/* Auth Links */}
              {authLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </Link>
              ))}

              {/* Language Toggle Mobile */}
              <button
                onClick={() => {
                  toggleLanguage();
                  setIsMenuOpen(false);
                }}
                className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                <Globe className="mr-3 h-5 w-5" />
                {i18n.language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
              </button>

              {/* Logout Mobile */}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  {t('navbar.logout')}
                </button>
              )}
            </div>

            {/* User Info Mobile */}
            {isAuthenticated && (
              <div className="border-t px-4 py-3 bg-gray-50">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {getInitials(user?.name || 'User')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {user?.role === 'patient' ? t('navbar.patient') : t('navbar.doctor')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Emergency Banner */}
      {location.pathname !== '/emergency' && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 animate-pulse" />
                <span className="text-sm font-medium">
                  {t('emergency.emergencyAlert')}
                </span>
              </div>
              <Link
                to="/emergency"
                className="text-sm font-bold hover:underline flex items-center"
              >
                🚨 {t('emergency.sosButton')}
                <ChevronDown className="h-3 w-3 ml-1 rotate-270" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;