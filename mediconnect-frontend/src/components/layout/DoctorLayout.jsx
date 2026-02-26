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
 * Enhanced UI with modern design elements
 */
const DoctorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isDoctor, hasHydrated, user, fullName } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { voiceEnabled, voiceCommandsEnabled } = useVoice();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  // Redirect if not authenticated or not a doctor
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isDoctor) {
      navigate('/patient/home', { replace: true });
    }
  }, [hasHydrated, isAuthenticated, isDoctor, navigate]);

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
      return null;
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
  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated || !isDoctor) {
    return null;
  }

  const headerProps = getHeaderProps();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ===== ANIMATED BACKGROUND ===== */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100" />
        
        {/* Animated gradient orbs */}
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-blob"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)' }}
        />
        <div 
          className="absolute top-1/2 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl animate-blob animation-delay-2000"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)' }}
        />
        <div 
          className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full opacity-25 blur-3xl animate-blob animation-delay-4000"
          style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #3b82f6 100%)' }}
        />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Radial gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/60" />
      </div>

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

      {/* ===== MAIN CONTENT WRAPPER ===== */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        {/* Header */}
        {headerProps && (
          <Header
            {...headerProps}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {/* ===== PAGE CONTENT ===== */}
        <main 
          className={`
            flex-1
            pb-24 lg:pb-8
            ${!headerProps ? 'pt-0' : 'pt-2'}
            transition-all duration-300 ease-out
          `}
        >
          {/* Content container with max-width and padding */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Subtle entrance animation wrapper */}
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>

        {/* ===== FOOTER ACCENT ===== */}
        <div className="hidden lg:block fixed bottom-0 left-64 right-0 h-1 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20" />

        {/* Bottom Navigation - Mobile */}
        <BottomNavigation role="doctor" />

        {/* ===== FLOATING VOICE BUTTON ===== */}
        {voiceEnabled && voiceCommandsEnabled && !location.pathname.includes('/consultation/') && (
          <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-50">
            {/* Glow effect behind button */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full blur-xl opacity-40 scale-75 animate-pulse" />
            
            <VoiceButton.Floating 
              position="bottom-right"
              onTranscript={(text) => {
                console.log('Voice input:', text);
              }}
            />
          </div>
        )}
      </div>

      {/* ===== DECORATIVE CORNER ACCENTS ===== */}
      <div className="fixed top-0 right-0 w-64 h-64 pointer-events-none opacity-50">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="corner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path 
            d="M200,0 L200,200 L0,200 Q100,100 200,0" 
            fill="url(#corner-gradient)"
          />
        </svg>
      </div>
    </div>
  );
};

export default DoctorLayout;