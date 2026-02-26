import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Home, Stethoscope, FileText, Users, MessageCircle, Pill, Calendar,
  Settings, ClipboardList, UserCheck, CalendarClock
} from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

const BottomNavigation = ({ role = 'patient' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { speak, textToSpeechEnabled } = useVoice();

  const patientNavItems = [
    { id: 'home', label: t('nav.home'), icon: Home, path: '/patient/home', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'symptoms', label: t('nav.symptoms'), icon: Stethoscope, path: '/patient/symptom-checker', gradient: 'from-emerald-500 to-green-500' },
    { id: 'doctors', label: t('nav.doctors'), icon: Users, path: '/patient/doctors', gradient: 'from-violet-500 to-purple-500' },
    { id: 'appointments', label: t('nav.appointments'), icon: Calendar, path: '/patient/appointments', gradient: 'from-pink-500 to-rose-500' },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/patient/settings', gradient: 'from-gray-500 to-slate-500' },
  ];

  const doctorNavItems = [
    { id: 'home', label: t('nav.home'), icon: Home, path: '/doctor/home', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'queue', label: t('nav.queue'), icon: ClipboardList, path: '/doctor/queue', gradient: 'from-amber-500 to-orange-500' },
    { id: 'patients', label: t('nav.patients'), icon: UserCheck, path: '/doctor/patients', gradient: 'from-green-500 to-emerald-500' },
    { id: 'schedule', label: t('nav.schedule'), icon: CalendarClock, path: '/doctor/schedule', gradient: 'from-purple-500 to-violet-500' },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/doctor/settings', gradient: 'from-gray-500 to-slate-500' },
  ];

  const navItems = role === 'doctor' ? doctorNavItems : patientNavItems;

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (item) => {
    if (textToSpeechEnabled) speak(item.label);
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" />

      <div className="relative flex items-center justify-around h-[4.5rem] px-1 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center justify-center
                w-full h-full px-1 py-1
                transition-all duration-300
                tap-highlight-none
                active:scale-90
                ${active ? 'text-primary-600' : 'text-gray-400'}
              `}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active background pill */}
              {active && (
                <div className="absolute top-2 inset-x-3 h-10 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100"
                  style={{ animation: 'navPillIn 0.3s ease-out' }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                {/* Icon container */}
                <div className={`
                  relative p-1.5 rounded-xl transition-all duration-300
                  ${active ? '' : ''}
                `}>
                  <Icon
                    size={active ? 22 : 20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={`transition-all duration-300 ${
                      active ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                </div>

                {/* Label */}
                <span className={`
                  text-[10px] mt-0.5 font-semibold tracking-tight transition-all duration-300
                  ${active ? 'text-primary-600' : 'text-gray-400'}
                `}>
                  {item.label}
                </span>

                {/* Active dot */}
                {active && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-500"
                    style={{ animation: 'dotPulse 0.3s ease-out' }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes navPillIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes dotPulse {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </nav>
  );
};

BottomNavigation.propTypes = {
  role: PropTypes.oneOf(['patient', 'doctor'])
};

export default BottomNavigation;