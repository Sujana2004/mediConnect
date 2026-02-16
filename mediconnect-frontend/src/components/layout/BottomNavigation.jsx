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
  ClipboardList,
  UserCheck,
  CalendarClock
} from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

/**
 * Bottom Navigation component for mobile
 */
const BottomNavigation = ({ role = 'patient' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { speak, textToSpeechEnabled } = useVoice();

  // Patient navigation items
  const patientNavItems = [
    {
      id: 'home',
      label: t('nav.home'),
      icon: Home,
      path: '/patient/home'
    },
    {
      id: 'symptoms',
      label: t('nav.symptoms'),
      icon: Stethoscope,
      path: '/patient/symptoms'
    },
    {
      id: 'doctors',
      label: t('nav.doctors'),
      icon: Users,
      path: '/patient/doctors'
    },
    {
      id: 'appointments',
      label: t('nav.appointments'),
      icon: Calendar,
      path: '/patient/appointments'
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: Settings,
      path: '/patient/settings'
    }
  ];

  // Doctor navigation items
  const doctorNavItems = [
    {
      id: 'home',
      label: t('nav.home'),
      icon: Home,
      path: '/doctor/home'
    },
    {
      id: 'queue',
      label: t('nav.queue'),
      icon: ClipboardList,
      path: '/doctor/queue'
    },
    {
      id: 'patients',
      label: t('nav.patients'),
      icon: UserCheck,
      path: '/doctor/patients'
    },
    {
      id: 'schedule',
      label: t('nav.schedule'),
      icon: CalendarClock,
      path: '/doctor/schedule'
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: Settings,
      path: '/doctor/settings'
    }
  ];

  const navItems = role === 'doctor' ? doctorNavItems : patientNavItems;

  // Check if path is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Handle navigation
  const handleNavClick = (item) => {
    // Speak the label if TTS is enabled
    if (textToSpeechEnabled) {
      speak(item.label);
    }
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                flex flex-col items-center justify-center
                w-full h-full px-2 py-1
                transition-colors duration-200
                tap-highlight-none
                ${active 
                  ? 'text-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <div className={`
                relative p-1 rounded-xl transition-colors
                ${active ? 'bg-primary-50' : ''}
              `}>
                <Icon 
                  size={22} 
                  strokeWidth={active ? 2.5 : 2}
                />
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-600" />
                )}
              </div>
              <span className={`
                text-[10px] mt-1 font-medium
                ${active ? 'text-primary-600' : 'text-gray-500'}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

BottomNavigation.propTypes = {
  role: PropTypes.oneOf(['patient', 'doctor'])
};

export default BottomNavigation;