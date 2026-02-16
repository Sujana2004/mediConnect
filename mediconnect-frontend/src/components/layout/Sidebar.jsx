import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { 
  Home,
  Stethoscope,
  FileText,
  Users,
  MessageCircle,
  Pill,
  Calendar,
  Settings,
  Bell,
  ClipboardList,
  UserCheck,
  CalendarClock,
  FileEdit,
  Video,
  X,
  LogOut,
  HelpCircle,
  Shield
} from 'lucide-react';
import { Avatar, Badge, LanguageSwitcher } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';

/**
 * Sidebar component for desktop navigation
 */
const Sidebar = ({ 
  role = 'patient',
  isOpen = true,
  onClose,
  isMobile = false 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fullName, handleLogout, isDoctor } = useAuth();
  const { t } = useLanguage();

  // Patient navigation items
  const patientNavItems = [
    {
      section: 'main',
      items: [
        { id: 'home', label: t('nav.home'), icon: Home, path: '/patient/home' },
        { id: 'symptoms', label: t('nav.symptoms'), icon: Stethoscope, path: '/patient/symptoms' },
        { id: 'doctors', label: t('nav.doctors'), icon: Users, path: '/patient/doctors' },
        { id: 'appointments', label: t('nav.appointments'), icon: Calendar, path: '/patient/appointments' },
      ]
    },
    {
      section: 'health',
      title: t('healthRecords.title'),
      items: [
        { id: 'records', label: t('nav.healthRecords'), icon: FileText, path: '/patient/health-records' },
        { id: 'medicines', label: t('nav.medicines'), icon: Pill, path: '/patient/medicines' },
      ]
    },
    {
      section: 'communication',
      title: t('consultation.title'),
      items: [
        { id: 'chatbot', label: t('nav.chatbot'), icon: MessageCircle, path: '/patient/chatbot' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, path: '/patient/notifications', badge: 3 },
      ]
    },
    {
      section: 'settings',
      items: [
        { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/patient/settings' },
      ]
    }
  ];

  // Doctor navigation items
  const doctorNavItems = [
    {
      section: 'main',
      items: [
        { id: 'home', label: t('nav.home'), icon: Home, path: '/doctor/home' },
        { id: 'queue', label: t('nav.queue'), icon: ClipboardList, path: '/doctor/queue' },
        { id: 'appointments', label: t('nav.appointments'), icon: Calendar, path: '/doctor/appointments' },
      ]
    },
    {
      section: 'patients',
      title: t('nav.patients'),
      items: [
        { id: 'patients', label: t('queue.waitingList'), icon: UserCheck, path: '/doctor/patients' },
        { id: 'consultations', label: t('nav.consultations'), icon: Video, path: '/doctor/consultations' },
        { id: 'prescriptions', label: t('nav.prescriptions'), icon: FileEdit, path: '/doctor/prescriptions' },
      ]
    },
    {
      section: 'management',
      title: t('settings.scheduleManagement'),
      items: [
        { id: 'schedule', label: t('nav.schedule'), icon: CalendarClock, path: '/doctor/schedule' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, path: '/doctor/notifications', badge: 5 },
      ]
    },
    {
      section: 'settings',
      items: [
        { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/doctor/settings' },
      ]
    }
  ];

  const navSections = role === 'doctor' ? doctorNavItems : patientNavItems;

  // Check if path is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Handle navigation
  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Handle logout
  const onLogout = async () => {
    await handleLogout();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Stethoscope size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">
            {t('common.appName')}
          </span>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* User profile */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar
            src={user?.profile_photo}
            name={fullName}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{fullName}</p>
            <p className="text-sm text-gray-500 truncate">{user?.phone}</p>
          </div>
        </div>
        <div className="mt-3">
          <Badge 
            variant={isDoctor ? 'solidPrimary' : 'solidSuccess'}
            size="sm"
          >
            {isDoctor ? t('auth.doctor') : t('auth.patient')}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, sectionIndex) => (
          <div key={section.section} className={sectionIndex > 0 ? 'mt-6' : ''}>
            {section.title && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavClick(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all duration-200 text-left
                        ${active
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon 
                        size={20} 
                        strokeWidth={active ? 2.5 : 2}
                        className={active ? 'text-primary-600' : ''}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge.Count count={item.badge} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        {/* Language switcher */}
        <LanguageSwitcher variant="buttons" size="sm" />

        {/* Help & Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavClick(role === 'doctor' ? '/doctor/settings' : '/patient/settings')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <HelpCircle size={18} />
            {t('settings.helpSupport')}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile sidebar (overlay)
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden">
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside 
      className={`
        hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0
        w-64 bg-white border-r border-gray-100
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {sidebarContent}
    </aside>
  );
};

Sidebar.propTypes = {
  role: PropTypes.oneOf(['patient', 'doctor']),
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  isMobile: PropTypes.bool
};

export default Sidebar;