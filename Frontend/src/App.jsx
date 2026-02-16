// src/App.jsx
import React, { Suspense, lazy, useEffect, useCallback, useState, memo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider,useAuth } from './context/AuthContext';
import { useLanguage } from './hooks/useLanguage';
import { useVoiceCommand } from './hooks/useVoiceCommand';
import { useVoiceOutput } from './hooks/useVoiceOutput';
import { updateLastActive, isSessionTimedOut, clearAuthStorage } from './hooks/storage';
import PrivateRoute from './components/common/PrivateRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PageLoader } from './components/common/Loader';

// ============================================
// LAZY LOADED PAGES
// ============================================

// Auth Pages
const AuthFlow = lazy(() => import('./pages/auth/AuthFlow'));

// Patient Pages
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));

// Doctor Pages
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const DoctorVerificationPending = lazy(() => import('./pages/auth/DoctorVerificationPending'));

// Shared Pages (accessible by both roles)
const DoctorList = lazy(() => import('./pages/DoctorList'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'));
const Consultation = lazy(() => import('./pages/Consultation'));
const SymptomChecker = lazy(() => import('./pages/SymptomChecker'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const HealthRecords = lazy(() => import('./pages/HealthRecords'));
const MedicineSearch = lazy(() => import('./pages/MedicineSearch'));
const Emergency = lazy(() => import('./components/emergency/EmergencyButton'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

// ============================================
// AUTH GATE - Redirects based on auth status
// ============================================
const AuthGate = memo(() => {
  const { user, loading, isAuthenticated, isDoctorVerified } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (isAuthenticated && user) {
    // Doctor verification check
    if (user.role === 'doctor' && !isDoctorVerified) {
      return <Navigate to="/doctor/verification-pending" replace />;
    }

    // Redirect to appropriate dashboard
    const redirectPath = user.role === 'doctor' ? '/doctor/home' : '/patient/home';
    return <Navigate to={redirectPath} replace />;
  }

  // Show auth flow for non-authenticated users
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthFlow />
    </Suspense>
  );
});

AuthGate.displayName = 'AuthGate';

// ============================================
// SCROLL TO TOP ON ROUTE CHANGE
// ============================================
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

// ============================================
// SESSION MONITOR
// ============================================
function SessionMonitor() {
  const { logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Update activity on user interactions
    const handleActivity = () => {
      updateLastActive();
    };

    // Check session timeout periodically
    const checkSession = () => {
      if (isSessionTimedOut()) {
        console.warn('Session timed out due to inactivity');
        clearAuthStorage();
        logout?.();
      }
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check every 60 seconds
    const intervalId = setInterval(checkSession, 60000);

    // Initial activity mark
    updateLastActive();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [isAuthenticated, logout]);

  return null;
}

// ============================================
// ONLINE/OFFLINE DETECTOR
// ============================================
function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  const messages = {
    en: 'You are offline. Some features may not be available.',
    hi: 'आप ऑफ़लाइन हैं। कुछ सुविधाएं उपलब्ध नहीं हो सकती हैं।',
    te: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. కొన్ని ఫీచర్‌లు అందుబాటులో ఉండకపోవచ్చు.',
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-white text-center 
        py-2 px-4 text-sm font-medium shadow-md"
      role="alert"
      aria-live="polite"
    >
      📡 {messages[language] || messages.en}
    </div>
  );
}

// ============================================
// GLOBAL VOICE COMMAND HANDLER
// ============================================
function GlobalVoiceCommands() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { speak } = useVoiceOutput();

  const handleGlobalCommand = useCallback(
    (command) => {
      if (!isAuthenticated) return false;

      const cmd = command.toLowerCase().trim();
      const isDoctor = user?.role === 'doctor';

      // Navigation commands
      const routes = {
        // English commands
        'go home': isDoctor ? '/doctor/home' : '/patient/home',
        home: isDoctor ? '/doctor/home' : '/patient/home',
        profile: '/profile',
        settings: '/profile',
        emergency: '/emergency',
        'find doctor': '/doctors',
        'find doctors': '/doctors',
        medicines: '/medicines',
        'medicine search': '/medicines',
        'health records': '/health-records',
        chatbot: '/chatbot',
        'symptom checker': '/symptom-checker',

        // Hindi commands
        'होम': isDoctor ? '/doctor/home' : '/patient/home',
        'प्रोफ़ाइल': '/profile',
        'आपातकालीन': '/emergency',
        'डॉक्टर खोजें': '/doctors',
        'दवाइयां': '/medicines',
        'स्वास्थ्य रिकॉर्ड': '/health-records',

        // Telugu commands
        'హోమ్': isDoctor ? '/doctor/home' : '/patient/home',
        'ప్రొఫైల్': '/profile',
        'అత్యవసరం': '/emergency',
        'డాక్టర్ వెతకండి': '/doctors',
        'మందులు': '/medicines',
        'ఆరోగ్య రికార్డులు': '/health-records',
      };

      for (const [keyword, path] of Object.entries(routes)) {
        if (cmd.includes(keyword)) {
          navigate(path);
          speak(`Navigating to ${keyword}`);
          return true;
        }
      }

      // Logout command
      if (cmd.includes('logout') || cmd.includes('लॉगआउट') || cmd.includes('లాగ్అవుట్')) {
        navigate('/');
        return true;
      }

      return false;
    },
    [isAuthenticated, user, navigate, speak]
  );

  useVoiceCommand({
    onCommand: handleGlobalCommand,
    enabled: isAuthenticated,
  });

  return null;
}

// ============================================
// APP ERROR FALLBACK
// ============================================
const AppErrorFallback = () => {
  const { language } = useLanguage();

  const messages = {
    en: {
      title: 'Something went wrong',
      description: 'The application encountered an unexpected error.',
      action: 'Reload Application',
    },
    hi: {
      title: 'कुछ गलत हो गया',
      description: 'एप्लिकेशन में एक अप्रत्याशित त्रुटि आई।',
      action: 'एप्लिकेशन पुनः लोड करें',
    },
    te: {
      title: 'ఏదో తప్పు జరిగింది',
      description: 'అప్లికేషన్‌లో అనుకోని లోపం ఏర్పడింది.',
      action: 'అప్లికేషన్ రీలోడ్ చేయండి',
    },
  };

  const msg = messages[language] || messages.en;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{msg.title}</h1>
        <p className="text-gray-600 mb-6">{msg.description}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
            font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {msg.action}
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();

  // Update HTML lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = i18n.language || 'en';
    document.documentElement.dir = 'ltr'; // All supported languages are LTR
  }, [i18n.language]);

  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      {/* Global Utilities */}
      <ScrollToTop />
      <NetworkStatus />
      {isAuthenticated && <SessionMonitor />}
      {isAuthenticated && <GlobalVoiceCommands />}

      {/* Routes */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ============================================
              PUBLIC ROUTES
              ============================================ */}

          {/* Auth Gate - Shows AuthFlow or redirects to dashboard */}
          <Route path="/" element={<AuthGate />} />

          {/* Auth flow routes */}
          <Route path="/auth/*" element={<AuthFlow />} />
          <Route path="/login" element={<AuthGate />} />

          {/* ============================================
              PATIENT ROUTES
              ============================================ */}

          {/* Patient Dashboard (tab-based navigation) */}
          <Route
            path="/patient/home"
            element={
              <PrivateRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </PrivateRoute>
            }
          />

          {/* Patient-specific standalone pages */}
          <Route
            path="/symptom-checker"
            element={
              <PrivateRoute allowedRoles={['patient']}>
                <SymptomChecker />
              </PrivateRoute>
            }
          />

          <Route
            path="/doctors/:id"
            element={
              <PrivateRoute allowedRoles={['patient']}>
                <DoctorProfile />
              </PrivateRoute>
            }
          />

          {/* ============================================
              DOCTOR ROUTES
              ============================================ */}

          {/* Doctor Dashboard (tab-based navigation) */}
          <Route
            path="/doctor/home"
            element={
              <PrivateRoute allowedRoles={['doctor']} requireVerification>
                <DoctorDashboard />
              </PrivateRoute>
            }
          />

          {/* Doctor Verification Pending */}
          <Route
            path="/doctor/verification-pending"
            element={
              <PrivateRoute allowedRoles={['doctor']} requireVerification={false}>
                <DoctorVerificationPending />
              </PrivateRoute>
            }
          />

          {/* ============================================
              SHARED ROUTES (Both Patient & Doctor)
              ============================================ */}

          {/* Find Doctors */}
          <Route
            path="/doctors"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <DoctorList />
              </PrivateRoute>
            }
          />

          {/* Video/Audio Consultation */}
          <Route
            path="/consultation/:consultationId"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <Consultation />
              </PrivateRoute>
            }
          />

          {/* AI Chatbot */}
          <Route
            path="/chatbot"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <Chatbot />
              </PrivateRoute>
            }
          />

          {/* Health Records */}
          <Route
            path="/health-records"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <HealthRecords />
              </PrivateRoute>
            }
          />

          {/* Medicine Search */}
          <Route
            path="/medicines"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <MedicineSearch />
              </PrivateRoute>
            }
          />

          {/* Emergency */}
          <Route
            path="/emergency"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <Emergency />
              </PrivateRoute>
            }
          />

          {/* Profile & Settings */}
          <Route
            path="/profile"
            element={
              <PrivateRoute allowedRoles={['patient', 'doctor']}>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* ============================================
              FALLBACK ROUTES
              ============================================ */}

          {/* 404 Page */}
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;