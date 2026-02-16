// src/pages/auth/AuthFlow.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
  getToken,
  setPendingPhone as storePendingPhone,
  getPendingPhone as getStoredPendingPhone,
  clearPendingPhone,
  getLanguage,
} from '../../hooks/storage';
import AuthLayout from '../../components/auth/AuthLayout';

// Auth Screens
import SplashScreen from './SplashScreen';
import OnboardingScreen from './OnboardingScreen';
import WelcomeScreen from './WelcomeScreen';
import PhoneLoginScreen from './PhoneLoginScreen';
import OTPVerifyScreen from './OTPVerifyScreen';
import RoleSelectScreen from './RoleSelectScreen';
import PatientRegScreen from './PatientRegScreen';
import DoctorRegScreen from './DoctorRegScreen';
import DoctorVerificationPending from './DoctorVerificationPending';

// ============================================
// STEP CONSTANTS
// ============================================
const STEPS = {
  SPLASH: 'splash',
  ONBOARDING: 'onboarding',
  WELCOME: 'welcome',
  PHONE: 'phone',
  OTP: 'otp',
  ROLE_SELECT: 'role_select',
  PATIENT_REGISTRATION: 'patient_registration',
  DOCTOR_REGISTRATION: 'doctor_registration',
  DOCTOR_PENDING: 'doctor_pending',
};

/**
 * AuthFlow - Manages the complete authentication flow
 *
 * Flow:
 * 1. Splash → Check auth status
 * 2. Onboarding (first time only) → Show app features
 * 3. Welcome → Login or Create Account
 * 4. Phone → Enter phone number
 * 5. OTP → Verify OTP
 * 6. (If new user) Role Select → Choose Patient/Doctor
 * 7. Registration → Fill details
 * 8. (Doctor) Pending → Await verification
 * 9. → Navigate to Dashboard
 */
const AuthFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    sendOtp,
    verifyOtp,
    resendOtp,
    registerPatient,
    registerDoctor,
    clearError: clearAuthError,
    isMockAuth,
  } = useAuth();

  // ---- Flow state ----
  const [currentStep, setCurrentStep] = useState(STEPS.SPLASH);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- Data state ----
  const [pendingPhone, setPendingPhone] = useState('');
  const [isRegisterFlow, setIsRegisterFlow] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Get redirect path from location state
  const redirectPath = location.state?.from;

  // ---- Check if user is already authenticated ----
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const dashboardPath =
        user.role === 'doctor' ? '/doctor/home' : '/patient/home';
      navigate(redirectPath || dashboardPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate, redirectPath]);

  // ---- Restore pending phone from storage on mount ----
  useEffect(() => {
    const savedPhone = getStoredPendingPhone();
    if (savedPhone) {
      setPendingPhone(savedPhone);
    }
  }, []);

  // ---- Clear error when step changes ----
  useEffect(() => {
    setError(null);
    if (clearAuthError) {
      clearAuthError();
    }
  }, [currentStep, clearAuthError]);

  // ============================================
  // STEP HANDLERS
  // ============================================

  // ---- Splash Complete ----
  const handleSplashComplete = useCallback(() => {
    if (isOnboardingCompleted()) {
      // Already onboarded — show welcome
      setCurrentStep(STEPS.WELCOME);
    } else {
      // First time — show onboarding
      setCurrentStep(STEPS.ONBOARDING);
    }
  }, []);

  // ---- Onboarding Complete ----
  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
    setCurrentStep(STEPS.WELCOME);
  }, []);

  // ---- Skip Onboarding ----
  const handleOnboardingSkip = useCallback(() => {
    setOnboardingCompleted(true);
    setCurrentStep(STEPS.WELCOME);
  }, []);

  // ---- Welcome → Login ----
  const handleLogin = useCallback(() => {
    setIsRegisterFlow(false);
    setCurrentStep(STEPS.PHONE);
  }, []);

  // ---- Welcome → Create Account ----
  const handleCreateAccount = useCallback(() => {
    setIsRegisterFlow(true);
    setCurrentStep(STEPS.PHONE);
  }, []);

  // ---- Phone → Send OTP ----
  const handleSendOtp = useCallback(
    async (phone) => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedPhone = phone.replace(/\s/g, '');
        const result = await sendOtp(normalizedPhone);

        if (result?.success) {
          setPendingPhone(normalizedPhone);
          storePendingPhone(normalizedPhone);
          setCurrentStep(STEPS.OTP);
          return { success: true };
        } else {
          setError(result?.error || 'Failed to send OTP');
          return { success: false, error: result?.error };
        }
      } catch (err) {
        const errorMsg = err.message || 'Failed to send OTP';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [sendOtp]
  );

  // ---- Phone → Back ----
  const handlePhoneBack = useCallback(() => {
    setCurrentStep(STEPS.WELCOME);
  }, []);

  // ---- OTP → Verify ----
  const handleVerifyOtp = useCallback(
    async (otp) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await verifyOtp(otp);

        if (result?.success) {
          if (result.requiresRegistration) {
            // New user — choose role
            setCurrentStep(STEPS.ROLE_SELECT);
            return { success: true, requiresRegistration: true };
          } else {
            // Existing user — AuthContext handles navigation
            clearPendingPhone();
            return { success: true, requiresRegistration: false };
          }
        } else {
          setError(result?.error || 'Invalid OTP');
          return { success: false, error: result?.error };
        }
      } catch (err) {
        const errorMsg = err.message || 'OTP verification failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [verifyOtp]
  );

  // ---- OTP → Resend ----
  const handleResendOtp = useCallback(async () => {
    if (!pendingPhone) {
      setError('Phone number not found. Please go back and try again.');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use resendOtp from context if available, otherwise sendOtp
      const resendFn = resendOtp || sendOtp;
      const result = await resendFn(pendingPhone);

      if (result?.success) {
        return { success: true, message: result.message };
      } else {
        setError(result?.error || 'Failed to resend OTP');
        return { success: false, error: result?.error };
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to resend OTP';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [pendingPhone, resendOtp, sendOtp]);

  // ---- OTP → Change Phone ----
  const handleChangePhone = useCallback(() => {
    setPendingPhone('');
    clearPendingPhone();
    setCurrentStep(STEPS.PHONE);
  }, []);

  // ---- OTP → Back ----
  const handleOtpBack = useCallback(() => {
    setCurrentStep(STEPS.PHONE);
  }, []);

  // ---- Role Select → Patient ----
  const handleSelectPatient = useCallback(() => {
    setSelectedRole('patient');
    setCurrentStep(STEPS.PATIENT_REGISTRATION);
  }, []);

  // ---- Role Select → Doctor ----
  const handleSelectDoctor = useCallback(() => {
    setSelectedRole('doctor');
    setCurrentStep(STEPS.DOCTOR_REGISTRATION);
  }, []);

  // ---- Role Select → Back ----
  const handleRoleBack = useCallback(() => {
    setCurrentStep(STEPS.WELCOME);
  }, []);

  // ---- Patient Registration → Submit ----
  const handlePatientRegSubmit = useCallback(
    async (data) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await registerPatient(data);

        if (result?.success) {
          clearPendingPhone();
          // AuthContext handles navigation
          return { success: true };
        } else {
          setError(result?.error || 'Registration failed');
          return {
            success: false,
            error: result?.error,
            fieldErrors: result?.fieldErrors,
          };
        }
      } catch (err) {
        const errorMsg = err.message || 'Registration failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [registerPatient]
  );

  // ---- Patient Registration → Back ----
  const handlePatientRegBack = useCallback(() => {
    setCurrentStep(STEPS.ROLE_SELECT);
  }, []);

  // ---- Doctor Registration → Submit ----
  const handleDoctorRegSubmit = useCallback(
    async (data) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await registerDoctor(data);

        if (result?.success) {
          clearPendingPhone();

          if (result.verificationStatus === 'pending') {
            setCurrentStep(STEPS.DOCTOR_PENDING);
          }
          // If already verified, AuthContext handles navigation

          return {
            success: true,
            verificationStatus: result.verificationStatus,
          };
        } else {
          setError(result?.error || 'Registration failed');
          return {
            success: false,
            error: result?.error,
            fieldErrors: result?.fieldErrors,
          };
        }
      } catch (err) {
        const errorMsg = err.message || 'Registration failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [registerDoctor]
  );

  // ---- Doctor Registration → Back ----
  const handleDoctorRegBack = useCallback(() => {
    setCurrentStep(STEPS.ROLE_SELECT);
  }, []);

  // ---- Doctor Pending → Continue ----
  const handleDoctorPendingContinue = useCallback(() => {
    navigate('/doctor/home', { replace: true });
  }, [navigate]);

  // ---- Doctor Pending → Contact Support ----
  const handleContactSupport = useCallback(() => {
    window.location.href =
      'mailto:support@mediconnect.com?subject=Doctor Verification Status';
  }, []);

  // ---- Doctor Pending → Logout ----
  const handlePendingLogout = useCallback(() => {
    clearPendingPhone();
    setPendingPhone('');
    setSelectedRole(null);
    setCurrentStep(STEPS.WELCOME);
  }, []);

  // ---- Language Selection callback ----
  const handleLanguageSelect = useCallback(() => {
    // Language change is handled by the component itself via useLanguage hook
  }, []);

  // ============================================
  // RENDER HELPER
  // ============================================
  const wrapInLayout = (content, fullWidth = false) => (
    <AuthLayout fullWidth={fullWidth}>
      <div className="flex flex-col min-h-0 overflow-auto flex-1">
        {content}
      </div>
    </AuthLayout>
  );

  // ============================================
  // RENDER
  // ============================================

  // Show splash while auth is loading
  if (authLoading) {
    return wrapInLayout(<SplashScreen />);
  }

  switch (currentStep) {
    case STEPS.SPLASH:
      return wrapInLayout(
        <SplashScreen onComplete={handleSplashComplete} />
      );

    case STEPS.ONBOARDING:
      return wrapInLayout(
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
          language={getLanguage()}
        />
      );

    case STEPS.WELCOME:
      return wrapInLayout(
        <WelcomeScreen
          onLogin={handleLogin}
          onCreateAccount={handleCreateAccount}
          onLanguageSelect={handleLanguageSelect}
          isMockAuth={isMockAuth}
        />
      );

    case STEPS.PHONE:
      return wrapInLayout(
        <PhoneLoginScreen
          onBack={handlePhoneBack}
          onSendOtp={handleSendOtp}
          isRegisterFlow={isRegisterFlow}
          onSwitchToCreateAccount={() => setIsRegisterFlow(true)}
          onSwitchToLogin={() => setIsRegisterFlow(false)}
          isLoading={isLoading}
          error={error}
          isMockAuth={isMockAuth}
        />
      );

    case STEPS.OTP:
      return wrapInLayout(
        <OTPVerifyScreen
          phone={pendingPhone}
          onBack={handleOtpBack}
          onChangePhone={handleChangePhone}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          isLoading={isLoading}
          error={error}
          isMockAuth={isMockAuth}
        />
      );

    case STEPS.ROLE_SELECT:
      return wrapInLayout(
        <RoleSelectScreen
          onSelectPatient={handleSelectPatient}
          onSelectDoctor={handleSelectDoctor}
          onBack={handleRoleBack}
        />
      );

    case STEPS.PATIENT_REGISTRATION:
      return wrapInLayout(
        <PatientRegScreen
          phone={pendingPhone}
          onBack={handlePatientRegBack}
          onSubmit={handlePatientRegSubmit}
          isLoading={isLoading}
          error={error}
        />,
        true
      );

    case STEPS.DOCTOR_REGISTRATION:
      return wrapInLayout(
        <DoctorRegScreen
          phone={pendingPhone}
          onBack={handleDoctorRegBack}
          onSubmit={handleDoctorRegSubmit}
          isLoading={isLoading}
          error={error}
        />,
        true
      );

    case STEPS.DOCTOR_PENDING:
      return wrapInLayout(
        <DoctorVerificationPending
          onContinue={handleDoctorPendingContinue}
          onContactSupport={handleContactSupport}
          onLogout={handlePendingLogout}
        />
      );

    default:
      return wrapInLayout(
        <SplashScreen onComplete={handleSplashComplete} />
      );
  }
};

export default AuthFlow;