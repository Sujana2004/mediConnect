// src/components/layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Home, Stethoscope, FileText, Users, MessageCircle, Pill, Calendar,
  Settings, Bell, ClipboardList, UserCheck, CalendarClock, FileEdit,
  Video, X, LogOut, HelpCircle, Shield, User, ChevronRight, Sparkles
} from 'lucide-react';
import { Avatar, Badge, LanguageSwitcher } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';

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

  const patientNavItems = [
    {
      section: 'main',
      items: [
        { id: 'home', label: t('nav.home'), icon: Home, path: '/patient/home', gradient: 'from-violet-500 to-purple-500' },
        { id: 'symptoms', label: t('nav.symptoms'), icon: Stethoscope, path: '/patient/symptom-checker', gradient: 'from-emerald-500 to-green-500' },
        { id: 'doctors', label: t('nav.doctors'), icon: Users, path: '/patient/doctors', gradient: 'from-fuchsia-500 to-pink-500' },
        { id: 'book', label: t('nav.bookAppointment', 'Book Appointment'), icon: CalendarClock, path: '/patient/appointments/book', gradient: 'from-amber-500 to-orange-500' },
        { id: 'appointments', label: t('nav.appointments'), icon: Calendar, path: '/patient/appointments', gradient: 'from-rose-500 to-pink-500' },
      ]
    },
    {
      section: 'health',
      title: t('healthRecords.title'),
      items: [
        { id: 'records', label: t('nav.healthRecords'), icon: FileText, path: '/patient/health-records', gradient: 'from-teal-500 to-cyan-500' },
        { id: 'medicines', label: t('nav.medicines'), icon: Pill, path: '/patient/medicines', gradient: 'from-green-500 to-emerald-500' },
      ]
    },
    {
      section: 'communication',
      title: t('consultation.title'),
      items: [
        { id: 'chatbot', label: t('nav.chatbot'), icon: MessageCircle, path: '/patient/chatbot', gradient: 'from-indigo-500 to-violet-500' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, path: '/patient/notifications', badge: 3, gradient: 'from-red-500 to-rose-500' },
      ]
    },
    {
      section: 'settings',
      items: [
        { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/patient/settings', gradient: 'from-gray-500 to-zinc-500' },
      ]
    }
  ];

  const doctorNavItems = [
    {
      section: 'main',
      items: [
        { id: 'home', label: t('nav.home'), icon: Home, path: '/doctor/home', gradient: 'from-violet-500 to-purple-500' },
        { id: 'queue', label: t('nav.queue'), icon: ClipboardList, path: '/doctor/queue', gradient: 'from-amber-500 to-orange-500' },
        { id: 'appointments', label: t('nav.appointments'), icon: Calendar, path: '/doctor/appointments', gradient: 'from-fuchsia-500 to-pink-500' },
      ]
    },
    {
      section: 'patients',
      title: t('nav.patients'),
      items: [
        { id: 'patients', label: t('doctor.patientRecords', 'Patient Records'), icon: UserCheck, path: '/doctor/patients', gradient: 'from-green-500 to-emerald-500' },
        { id: 'consultations', label: t('nav.consultations'), icon: Video, path: '/doctor/consultations', gradient: 'from-rose-500 to-pink-500' },
        { id: 'prescriptions', label: t('nav.prescriptions'), icon: FileEdit, path: '/doctor/prescriptions', gradient: 'from-teal-500 to-cyan-500' },
      ]
    },
    {
      section: 'management',
      title: t('settings.scheduleManagement'),
      items: [
        { id: 'schedule', label: t('nav.schedule'), icon: CalendarClock, path: '/doctor/schedule', gradient: 'from-indigo-500 to-violet-500' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, path: '/doctor/notifications', badge: 5, gradient: 'from-red-500 to-rose-500' },
      ]
    },
    {
      section: 'settings',
      items: [
        { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/doctor/settings', gradient: 'from-gray-500 to-zinc-500' },
      ]
    }
  ];

  const navSections = role === 'doctor' ? doctorNavItems : patientNavItems;

  const isActive = (path) => {
    if (path.endsWith('/home')) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (path) => {
    console.log('🔗 handleNavClick called with path:', path);
    navigate(path);
    if (isMobile && onClose) onClose();
  };

  const handleProfileClick = () => {
    const profilePath = role === 'doctor' ? '/doctor/profile' : '/patient/profile';
    console.log('👤 Profile clicked, role:', role, 'path:', profilePath);
    navigate(profilePath);
    if (isMobile && onClose) onClose();
  };

  const onLogout = async () => {
    await handleLogout();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header with violet gradient ── */}
      <div className="relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12" />
        </div>
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}
        />

        <div className="relative z-10 flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="font-black text-lg text-white tracking-tight">
              {t('common.appName')}
            </span>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-white/20 transition-all active:scale-90"
            >
              <X size={20} className="text-white" />
            </button>
          )}
        </div>
      </div>
            {/* ── User Profile Card ── */}
      <div className="mx-3 mt-4 mb-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleProfileClick}
          className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/80 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="ring-2 ring-violet-200 ring-offset-2 rounded-full group-hover:ring-violet-400 transition-all">
                <Avatar src={user?.profile_photo} name={fullName} size="lg" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate text-sm">{fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.phone}</p>
              <div className="mt-1.5">
                <Badge
                  variant={isDoctor ? 'solidPrimary' : 'solidSuccess'}
                  size="sm"
                >
                  {isDoctor ? t('auth.doctor') : t('auth.patient')}
                </Badge>
              </div>
            </div>
            <ChevronRight size={16} className="text-violet-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navSections.map((section, sectionIndex) => (
          <div key={section.section} className={sectionIndex > 0 ? 'mt-4' : ''}>
            {section.title && (
              <h3 className="px-3 mb-2 text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-4 h-px bg-violet-200" />
                {section.title}
                <div className="flex-1 h-px bg-violet-200" />
              </h3>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 text-left group/item cursor-pointer
                        ${active
                          ? 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 font-semibold shadow-sm border border-violet-200'
                          : 'text-gray-600 hover:bg-violet-50/50 hover:text-gray-900 border border-transparent'
                        }
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0
                        ${active
                          ? `bg-gradient-to-br ${item.gradient} shadow-md`
                          : 'bg-gray-100 group-hover/item:bg-violet-100'
                        }
                      `}>
                        <Icon
                          size={16}
                          strokeWidth={active ? 2.5 : 2}
                          className={active ? 'text-white' : 'text-gray-500 group-hover/item:text-violet-600'}
                        />
                      </div>
                      <span className="flex-1 text-sm truncate">{item.label}</span>
                      {active && (
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold shadow-sm flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="p-3 border-t border-violet-100 space-y-2 bg-violet-50/30 flex-shrink-0">
        <LanguageSwitcher variant="buttons" size="sm" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNavClick(role === 'doctor' ? '/doctor/settings' : '/patient/settings')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-xl transition-all font-medium cursor-pointer"
          >
            <HelpCircle size={16} />
            <span className="truncate">{t('settings.helpSupport')}</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium flex-shrink-0 cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        />
        <aside
          className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'slideInLeft 0.3s ease-out' }}
        >
          {sidebarContent}
        </aside>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        `}</style>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={`
        hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0
        z-40 w-72 bg-white border-r border-violet-100 shadow-xl shadow-violet-200/30
        transition-transform duration-300 overflow-hidden
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