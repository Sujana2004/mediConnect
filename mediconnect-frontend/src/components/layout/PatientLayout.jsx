import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { VoiceButton, Toast } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

/**
 * Layout wrapper for patient pages
 */
const PatientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPatient, user, fullName } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { voiceEnabled, voiceCommandsEnabled } = useVoice();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  // Redirect if not authenticated or not a patient
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isPatient) {
      navigate('/doctor/home', { replace: true });
    }
  }, [isAuthenticated, isPatient, navigate]);

  // Update page title based on current route
  useEffect(() => {
    const pathToTitle = {
      '/patient/home': '',
      '/patient/symptoms': t('symptoms.title'),
      '/patient/doctors': t('doctors.title'),
      '/patient/appointments': t('appointments.title'),
      '/patient/health-records': t('healthRecords.title'),
      '/patient/medicines': t('medicines.title'),
      '/patient/chatbot': t('chatbot.title'),
      '/patient/notifications': t('notifications.title'),
      '/patient/settings': t('settings.title'),
      '/patient/emergency': t('emergency.title')
    };

    // Find matching title
    const matchedPath = Object.keys(pathToTitle).find(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    );

    setPageTitle(matchedPath ? pathToTitle[matchedPath] : '');
  }, [location.pathname, t, currentLanguage]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.first_name || fullName?.split(' ')[0] || '';

    if (hour < 12) {
      return t('home.greetingMorning', { name });
    } else if (hour < 17) {
      return t('home.greetingAfternoon', { name });
    } else {
      return t('home.greetingEvening', { name });
    }
  };

  // Determine header props based on current route
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

  // Don't render if not authenticated
  if (!isAuthenticated || !isPatient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <Toast />

      {/* Sidebar - Desktop */}
      <Sidebar 
        role="patient" 
        isOpen={true}
      />

      {/* Sidebar - Mobile */}
      <Sidebar
        role="patient"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={true}
      />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          {...getHeaderProps()}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Bottom Navigation - Mobile */}
        <BottomNavigation role="patient" />

        {/* Floating Voice Button */}
        {voiceEnabled && voiceCommandsEnabled && (
          <VoiceButton.Floating 
            position="bottom-right"
            onTranscript={(text) => {
              // Voice commands are handled in useVoice hook
              console.log('Voice input:', text);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PatientLayout;