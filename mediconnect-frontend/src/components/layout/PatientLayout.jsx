import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { VoiceButton, Toast } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

const PatientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPatient, hasHydrated, user, fullName } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { voiceEnabled, voiceCommandsEnabled } = useVoice();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isPatient) {
      navigate('/doctor/home', { replace: true });
    }
  }, [hasHydrated, isAuthenticated, isPatient, navigate]);

  useEffect(() => {
    const pathToTitle = {
      '/patient/home': '',
      '/patient/symptom-checker': t('symptoms.title'),
      '/patient/doctors': t('doctors.title'),
      '/patient/appointments': t('appointments.title'),
      '/patient/health-records': t('healthRecords.title'),
      '/patient/medicines': t('medicines.title'),
      '/patient/chatbot': t('chatbot.title'),
      '/patient/notifications': t('notifications.title'),
      '/patient/settings': t('settings.title'),
      '/patient/emergency': t('emergency.title'),
      '/patient/profile': t('profile.title', 'Profile'),
    };
    const matchedPath = Object.keys(pathToTitle).find(path =>
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
    setPageTitle(matchedPath ? pathToTitle[matchedPath] : '');
  }, [location.pathname, t, currentLanguage]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.first_name || fullName?.split(' ')[0] || '';
    if (hour < 12) return t('home.greetingMorning', { name });
    else if (hour < 17) return t('home.greetingAfternoon', { name });
    else return t('home.greetingEvening', { name });
  };

  const getHeaderProps = () => {
    const isHome = location.pathname === '/patient/home';
    const isDetail = location.pathname.split('/').length > 3;
    return {
      title: isHome ? getGreeting() : pageTitle,
      subtitle: isHome ? t('home.howAreYou') : undefined,
      showBack: isDetail || !isHome,
      showMenu: !isDetail,
      showSearch: location.pathname === '/patient/doctors' || location.pathname === '/patient/medicines',
      showVoice: voiceEnabled && voiceCommandsEnabled
    };
  };

  if (!hasHydrated) return null;
  if (!isAuthenticated || !isPatient) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 relative">
      <Toast />

      {/* Background decorations - z-0 so they stay behind everything */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      {/* Desktop sidebar - z-40 so it's above main content */}
      <Sidebar role="patient" isOpen={true} />

      {/* Mobile sidebar - z-50 with overlay */}
      <Sidebar role="patient" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={true} />

      {/* Main content area - z-10, but lg:pl-72 ensures it doesn't overlap sidebar */}
      <div className="lg:pl-72 relative z-10">
        <Header {...getHeaderProps()} onMenuClick={() => setSidebarOpen(true)} />

        <main className="pb-24 lg:pb-8 px-2 sm:px-4 lg:px-6 pt-2">
          <Outlet />
        </main>

        <BottomNavigation role="patient" />

        {voiceEnabled && voiceCommandsEnabled && (
          <VoiceButton.Floating
            position="bottom-right"
            onTranscript={(text) => {
              console.log('Voice input:', text);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PatientLayout;