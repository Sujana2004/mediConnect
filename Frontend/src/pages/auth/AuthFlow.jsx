import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOnboardingCompleted, setOnboardingCompleted } from '../../hooks/storage';
import AuthLayout from '../../components/auth/AuthLayout';
import SplashScreen from './SplashScreen';
import OnboardingScreen from './OnboardingScreen';
import WelcomeScreen from './WelcomeScreen';
import PhoneLoginScreen from './PhoneLoginScreen';
import OTPVerifyScreen from './OTPVerifyScreen';
import RoleSelectScreen from './RoleSelectScreen';
import PatientRegScreen from './PatientRegScreen';
import DoctorRegScreen from './DoctorRegScreen';
import DoctorVerificationPending from './DoctorVerificationPending';

const STEPS = {
  splash: 'splash',
  onboarding: 'onboarding',
  welcome: 'welcome',
  phone: 'phone',
  otp: 'otp',
  role: 'role',
  patient_reg: 'patient_reg',
  doctor_reg: 'doctor_reg',
  doctor_pending: 'doctor_pending',
};

export default function AuthFlow() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, registerPatient, registerDoctor } = useAuth();
  const [step, setStep] = useState(STEPS.splash);
  const [pendingPhone, setPendingPhone] = useState('');
  const [isRegisterFlow, setIsRegisterFlow] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleSplashComplete = useCallback(() => {
    if (getOnboardingCompleted()) {
      setStep(STEPS.welcome);
    } else {
      setStep(STEPS.onboarding);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
    setStep(STEPS.welcome);
  }, []);

  const handleWelcomeLogin = useCallback(() => {
    setIsRegisterFlow(false);
    setStep(STEPS.phone);
  }, []);

  const handleWelcomeCreateAccount = useCallback(() => {
    setIsRegisterFlow(true);
    setStep(STEPS.phone);
  }, []);

  const handleSendOtp = useCallback(
    async (phone) => {
      const result = await sendOtp(phone);
      if (result?.success) {
        setPendingPhone(phone);
        if (typeof window !== 'undefined') window.localStorage.setItem('mediconnect_pending_phone', phone);
        setStep(STEPS.otp);
      }
      return result;
    },
    [sendOtp]
  );

  const handleOtpBack = useCallback(() => {
    setStep(STEPS.phone);
    setPendingPhone('');
  }, []);

  const handleOtpChangePhone = useCallback(() => {
    setStep(STEPS.phone);
    setPendingPhone('');
  }, []);

  const handleOtpVerify = useCallback(
    async (phone, otp) => {
      const result = await verifyOtp(phone, otp);
      if (result?.success && result?.requiresRegistration) {
        setStep(STEPS.role);
      }
      return result;
    },
    [verifyOtp]
  );

  const handleRolePatient = useCallback(() => {
    setSelectedRole('patient');
    setStep(STEPS.patient_reg);
  }, []);

  const handleRoleDoctor = useCallback(() => {
    setSelectedRole('doctor');
    setStep(STEPS.doctor_reg);
  }, []);

  const handleRoleSelectBack = useCallback(() => {
    setStep(STEPS.welcome);
  }, []);

  const handlePatientRegBack = useCallback(() => {
    setStep(STEPS.role);
  }, []);

  const handlePatientRegSubmit = useCallback(
    async (payload) => {
      return registerPatient(payload);
    },
    [registerPatient]
  );

  const handleDoctorRegBack = useCallback(() => {
    setStep(STEPS.role);
  }, []);

  const handleDoctorRegSubmit = useCallback(
    async (payload) => {
      const result = await registerDoctor(payload);
      if (result?.success && result?.verificationStatus === 'pending') {
        setStep(STEPS.doctor_pending);
      }
      return result;
    },
    [registerDoctor]
  );

  const handleDoctorPendingGoHome = useCallback(() => {
    navigate('/doctor-dashboard');
  }, [navigate]);

  const handleLanguageSelect = useCallback(() => {
    // Could open a modal or navigate to language picker; for now no-op or toggle
  }, []);

  const wrap = (content, fullWidth = false) => (
    <AuthLayout fullWidth={fullWidth}>
      <div className="flex flex-col min-h-0 overflow-auto flex-1">
        {content}
      </div>
    </AuthLayout>
  );

  if (step === STEPS.splash) {
    return wrap(<SplashScreen onComplete={handleSplashComplete} />);
  }
  if (step === STEPS.onboarding) {
    return wrap(<OnboardingScreen onComplete={handleOnboardingComplete} language={localStorage.getItem('mediconnect_language') || 'en'} />);
  }
  if (step === STEPS.welcome) {
    return wrap(
      <WelcomeScreen
        onLogin={handleWelcomeLogin}
        onCreateAccount={handleWelcomeCreateAccount}
        onLanguageSelect={handleLanguageSelect}
      />
    );
  }
  if (step === STEPS.phone) {
    return wrap(
      <PhoneLoginScreen
        onBack={() => setStep(STEPS.welcome)}
        onSendOtp={handleSendOtp}
        isRegisterFlow={isRegisterFlow}
        onSwitchToCreateAccount={() => setIsRegisterFlow(true)}
        onSwitchToLogin={() => setIsRegisterFlow(false)}
      />
    );
  }
  if (step === STEPS.otp) {
    return wrap(
      <OTPVerifyScreen
        phone={pendingPhone}
        onBack={handleOtpBack}
        onChangePhone={handleOtpChangePhone}
        onVerify={handleOtpVerify}
        sendOtp={() => sendOtp(pendingPhone)}
      />
    );
  }
  if (step === STEPS.role) {
    return wrap(
      <RoleSelectScreen
        onSelectPatient={handleRolePatient}
        onSelectDoctor={handleRoleDoctor}
        onBack={handleRoleSelectBack}
      />
    );
  }
  if (step === STEPS.patient_reg) {
    return wrap(
      <PatientRegScreen
        phone={pendingPhone}
        onBack={handlePatientRegBack}
        onSubmit={handlePatientRegSubmit}
      />,
      true
    );
  }
  if (step === STEPS.doctor_reg) {
    return wrap(
      <DoctorRegScreen
        phone={pendingPhone}
        onBack={handleDoctorRegBack}
        onSubmit={handleDoctorRegSubmit}
      />,
      true
    );
  }
  if (step === STEPS.doctor_pending) {
    return wrap(
      <DoctorVerificationPending
        onContactSupport={() => {}}
        onGoHome={handleDoctorPendingGoHome}
        onLogout={() => setStep(STEPS.welcome)}
      />
    );
  }

  return null;
}
