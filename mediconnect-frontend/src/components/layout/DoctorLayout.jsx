import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { VoiceButton, Toast, Badge } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

/**
 * Layout wrapper for doctor pages
 */
const DoctorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isDoctor, user, fullName } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { voiceEnabled, voiceCommandsEnabled } = useVoice();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  // Redirect if not authenticated or not a doctor
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isDoctor) {
      navigate('/patient/home', { replace: true });
    }
  }, [isAuthenticated, isDoctor, navigate]);

  // Update page title based on current route
  useEffect(() => {
    const pathToTitle = {
      '/doctor/home': '',
      '/doctor/queue': t('queue.title'),
      '/doctor/patients': t('nav.patients'),
      '/doctor/appointments': t('appointments.title'),
      '/doctor/consultations': t('nav.consultations'),
      '/doctor/prescriptions': t('prescriptions.title'),
      '/doctor/schedule': t('schedule.title'),
      '/doctor/notifications': t('notifications.title'),
      '/doctor/settings': t('settings.title')
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
    const name = user?.first_name || fullName?.split(' ')[0] || 'Doctor';

    if (hour < 12) {
      return t('home.greetingMorning', { name: `Dr. ${name}` });
    } else if (hour < 17) {
      return t('home.greetingAfternoon', { name: `Dr. ${name}` });
    } else {
      return t('home.greetingEvening', { name: `Dr. ${name}` });
    }
  };

  // Get doctor verification status badge
  const getVerificationBadge = () => {
    const status = user?.doctor_profile?.verification_status;
    
    if (status === 'verified') {
      return null; // Don't show badge if verified
    }
    
    if (status === 'pending') {
      return (
        <Badge variant="warning" size="sm">
          {t('registration.pendingVerification')}
        </Badge>
      );
    }
    
    if (status === 'rejected') {
      return (
        <Badge variant="danger" size="sm">
          {t('healthRecords.rejected')}
        </Badge>
      );
    }
    
    return null;
  };

  // Determine header props based on current route
  const getHeaderProps = () => {
    const isHome = location.pathname === '/doctor/home';
    const isDetail = location.pathname.split('/').length > 3;
    const isConsultation = location.pathname.includes('/consultation/');

    // Hide header during active consultation
    if (isConsultation) {
      return null;
    }

    return {
      title: isHome ? getGreeting() : pageTitle,
      subtitle: isHome ? t('home.todaysSummary') : undefined,
      showBack: isDetail || !isHome,
      showMenu: !isDetail,
      showSearch: location.pathname === '/doctor/patients',
      showVoice: voiceEnabled && voiceCommandsEnabled,
      rightContent: isHome ? getVerificationBadge() : undefined
    };
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !isDoctor) {
    return null;
  }

  const headerProps = getHeaderProps();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <Toast />

      {/* Sidebar - Desktop */}
      <Sidebar 
        role="doctor" 
        isOpen={true}
      />

      {/* Sidebar - Mobile */}
      <Sidebar
        role="doctor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={true}
      />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        {headerProps && (
          <Header
            {...headerProps}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {/* Page content */}
        <main className={`pb-20 lg:pb-6 ${!headerProps ? 'pt-0' : ''}`}>
          <Outlet />
        </main>

        {/* Bottom Navigation - Mobile */}
        <BottomNavigation role="doctor" />

        {/* Floating Voice Button */}
        {voiceEnabled && voiceCommandsEnabled && !location.pathname.includes('/consultation/') && (
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

export default DoctorLayout;