// src/pages/auth/PatientRegister.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CheckCircle,
  Users,
  Volume2,
  Heart,
  Shield,
  Stethoscope,
  Sparkles,
  Activity,
  Globe
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  PhoneInput,
  OTPInput,
  LanguageSwitcher
} from '../../components/common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

/**
 * Environment check for development logging
 */
const isDev = import.meta.env.DEV;

/**
 * Safe logger - only logs in development
 */
const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => isDev && console.error(...args),
};

/**
 * Constants
 */
const OTP_LENGTH = 6;
const PHONE_LENGTH = 10;
const RESEND_TIMER_SECONDS = 30;
const TOTAL_STEPS = 3;

/**
 * Validation schema matching backend expectations
 */
const patientSchema = z.object({
  first_name: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .max(50, 'Last name must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z
    .enum(['male', 'female', 'other'])
    .optional()
    .or(z.literal('')),
  preferred_language: z.enum(['en', 'hi', 'te']).default('en'),
  village: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  blood_group: z
    .enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
    .optional()
    .or(z.literal('')),
  emergency_contact_name: z.string().max(100).optional().or(z.literal('')),
  emergency_contact_phone: z
    .string()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const cleaned = val.replace(/\D/g, '');
        return /^[6-9]\d{9}$/.test(cleaned);
      },
      { message: 'Please enter a valid 10-digit phone number' }
    )
    .optional()
    .or(z.literal('')),
  is_literate: z.boolean().default(true),
  needs_voice_assistance: z.boolean().default(false)
});

/**
 * Blood group options (static, no translation needed)
 */
const BLOOD_GROUP_VALUES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * Language options (static)
 */
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'te', label: 'తెలుగు' }
];

/**
 * Step icon mapping
 */
const STEP_ICONS = {
  1: Shield,
  2: User,
  3: Heart
};

/**
 * Patient registration page with multi-step form
 * Step 1: Phone verification
 * Step 2: Basic information
 * Step 3: Additional details (optional)
 */
const PatientRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLanguage } = useLanguage();
  const {
    sendPhoneOTP,
    registerNewPatient,
    isLoading,
    error,
    clearError
  } = useAuth();

  // Ref to track if auto OTP was sent
  const autoOTPSentRef = useRef(false);

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);

  // Phone & OTP state
  const [phone, setPhone] = useState(location.state?.phone || '');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // OTP resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Store verified Firebase token
  const [verifiedFirebaseToken, setVerifiedFirebaseToken] = useState(null);

  // Memoized values
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const genderOptions = useMemo(() => [
    { value: '', label: t('common.select', 'Select Gender') },
    { value: 'male', label: t('registration.male', 'Male') },
    { value: 'female', label: t('registration.female', 'Female') },
    { value: 'other', label: t('registration.other', 'Other') }
  ], [t]);

  const bloodGroupOptions = useMemo(() => [
    { value: '', label: t('common.select', 'Select Blood Group') },
    ...BLOOD_GROUP_VALUES.map(bg => ({ value: bg, label: bg }))
  ], [t]);

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger
  } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      preferred_language: currentLanguage || 'en',
      village: '',
      district: '',
      blood_group: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      is_literate: true,
      needs_voice_assistance: false
    }
  });

  // Validate phone number
  const validatePhone = useCallback((phoneNumber) => {
    const cleaned = (phoneNumber || '').replace(/\D/g, '');
    if (!cleaned) return t('auth.phoneRequired', 'phone number is required');
    if (cleaned.length !== PHONE_LENGTH) return t('auth.invalidPhone', 'invalid phone number');
    if (!/^[6-9]/.test(cleaned)) return t('auth.invalidPhone', 'invalid phone number');
    return '';
  }, [t]);

  // Handle send OTP
  const handleSendOTP = useCallback(async () => {
    const validationError = validatePhone(phone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    setPhoneError('');

    const result = await sendPhoneOTP(phone);

    if (result.success) {
      setOtpSent(true);
      setResendTimer(RESEND_TIMER_SECONDS);
      setCanResend(false);
      toast.success(t('auth.otpSent', { phone: `+91 ${phone}` }));
    } else {
      setPhoneError(result.error || t('errors.somethingWrong', 'Something went wrong. Please try again.'));
    }
  }, [phone, validatePhone, sendPhoneOTP, t]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clear errors on step change
  useEffect(() => {
    clearError();
    setPhoneError('');
    setOtpError('');
  }, [currentStep, clearError]);

  // If coming from login with phone, auto-send OTP (only once)
  useEffect(() => {
    if (
      location.state?.fromLogin &&
      location.state?.phone &&
      !autoOTPSentRef.current
    ) {
      autoOTPSentRef.current = true;
      handleSendOTP();
    }
  }, [location.state, handleSendOTP]);

  // Handle verify OTP and move to next step
  const handleVerifyOTP = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) {
      setOtpError(t('auth.invalidOTP'));
      return;
    }

    setOtpError('');
    setIsVerifying(true);

    try {
      // Actually verify OTP with Firebase
      const { verifyOTP } = await import('../../config/firebase');
      const verifyResult = await verifyOTP(otp);

      if (verifyResult.success) {
        // Store the Firebase token for use during registration
        setVerifiedFirebaseToken(verifyResult.token);
        setIsVerifying(false);
        setCurrentStep(2);
      } else {
        setOtpError(verifyResult.message || t('auth.invalidOTP', 'Invalid OTP. Please try again.'));
        setIsVerifying(false);
      }
    } catch (error) {
      setOtpError(error.message || t('auth.invalidOTP', 'Invalid OTP. Please try again.'));
      setIsVerifying(false);
    }
  }, [otp, t]);

  // Handle OTP complete
  const handleOTPComplete = useCallback((otpValue) => {
    setOtp(otpValue);
  }, []);

  // Handle resend OTP
  const handleResendOTP = useCallback(async () => {
    if (!canResend) return;

    const result = await sendPhoneOTP(phone);

    if (result.success) {
      setOtp('');
      setOtpError('');
      setResendTimer(RESEND_TIMER_SECONDS);
      setCanResend(false);
      toast.success(t('auth.otpSent', { phone: `+91 ${phone}` }));
    } else {
      toast.error(result.error || t('errors.somethingWrong', 'Something went wrong. Please try again.'));
    }
  }, [canResend, phone, sendPhoneOTP, t]);

  // Build clean patient data
  const buildPatientData = useCallback((data) => {
    const patientData = {
      first_name: data.first_name.trim(),
      preferred_language: data.preferred_language || currentLanguage || 'en',
      is_literate: Boolean(data.is_literate),
      needs_voice_assistance: Boolean(data.needs_voice_assistance)
    };

    if (data.last_name?.trim()) {
      patientData.last_name = data.last_name.trim();
    }
    if (data.date_of_birth) {
      patientData.date_of_birth = data.date_of_birth;
    }
    if (data.gender && data.gender !== '') {
      patientData.gender = data.gender;
    }
    if (data.village?.trim()) {
      patientData.village = data.village.trim();
    }
    if (data.district?.trim()) {
      patientData.district = data.district.trim();
    }
    if (data.blood_group && data.blood_group !== '') {
      patientData.blood_group = data.blood_group;
    }
    if (data.emergency_contact_name?.trim()) {
      patientData.emergency_contact_name = data.emergency_contact_name.trim();
    }
    if (data.emergency_contact_phone) {
      const cleanedPhone = data.emergency_contact_phone.replace(/\D/g, '');
      if (cleanedPhone.length === PHONE_LENGTH) {
        patientData.emergency_contact_phone = cleanedPhone;
      }
    }

    return patientData;
  }, [currentLanguage]);

  // Handle form submission
  const onSubmit = useCallback(async (data) => {
    // If on step 2, just move to step 3
    if (currentStep === 2) {
      const isValid = await trigger(['first_name']);
      if (isValid) {
        setCurrentStep(3);
      }
      return;
    }

    // Final submission on step 3
    const patientData = buildPatientData(data);

    logger.log(' Submitting patient data:', patientData);

    // Check if we have a verified Firebase token
    if (!verifiedFirebaseToken) {
      toast.error(t('auth.sessionExpired'));
      setCurrentStep(1);
      setOtpSent(false);
      setOtp('');
      setVerifiedFirebaseToken(null);
      return;
    }

    // Pass the already-verified Firebase token (not the raw OTP)
    const result = await registerNewPatient(verifiedFirebaseToken, patientData);

    if (result.success) {
      toast.success(t('registration.registrationSuccess'));
      navigate('/patient/home', { replace: true });
    } else {
      const errorLower = (result.error || '').toLowerCase();

      logger.log(' Registration error:', result.error);

      // Check if user already exists - redirect to login
      // The extractErrorMessage in authStore formats field errors as "phone: message"
      // so we need to check broadly
      if (
        errorLower.includes('already exists') ||
        errorLower.includes('already registered') ||
        errorLower.includes('phone number already') ||
        errorLower.includes('user with this phone') ||
        errorLower.includes('already has an account') ||
        errorLower.includes('unique') ||
        errorLower.includes('duplicate') ||
        errorLower.includes('phone: ') // Django field-level error for phone
      ) {
        toast.error(t('auth.userAlreadyExists', 'This phone number is already registered. Please login instead.'));
        navigate('/login', {
          state: { phone },
          replace: true
        });
        return;
      }

      // If OTP/token error, go back to step 1
      if (
        errorLower.includes('otp') ||
        errorLower.includes('token') ||
        errorLower.includes('firebase') ||
        errorLower.includes('expired') ||
        errorLower.includes('invalid') ||
        errorLower.includes('credential')
      ) {
        setCurrentStep(1);
        setOtpSent(false);
        setOtp('');
        setVerifiedFirebaseToken(null);
        toast.error(t('auth.sessionExpired', 'Session expired. Please verify your phone again.'));
        return;
      }

      // Generic error
      toast.error(result.error || t('errors.somethingWrong', 'Something went wrong. Please try again.'));
    }
  }, [currentStep, trigger, buildPatientData, verifiedFirebaseToken, registerNewPatient, t, navigate, phone]);

  // Handle back
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/login');
    }
  }, [currentStep, navigate]);

  // Handle skip optional step
  const handleSkip = useCallback(() => {
    if (currentStep === 3) {
      handleSubmit(onSubmit)();
    }
  }, [currentStep, handleSubmit, onSubmit]);

  // Handle phone change
  const handlePhoneChange = useCallback((e) => {
    setPhone(e.target.value);
    if (phoneError) setPhoneError('');
  }, [phoneError]);

  // Handle phone edit
  const handlePhoneEdit = useCallback(() => {
    setOtpSent(false);
    setOtp('');
  }, []);

  // Handle emergency phone change
  const handleEmergencyPhoneChange = useCallback((field) => (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, PHONE_LENGTH);
    field.onChange(value);
  }, []);

  // Get step info
  const getStepInfo = useCallback(() => {
    switch (currentStep) {
      case 1:
        return { subtitle: t('auth.verifyPhoneSubtitle', 'Verify your phone number'), icon: Shield };
      case 2:
        return { subtitle: t('registration.basicInfoSubtitle', 'Basic Information'), icon: User };
      case 3:
        return { subtitle: t('registration.additionalInfoSubtitle', 'Additional Information'), icon: Heart };
      default:
        return { subtitle: '', icon: Users };
    }
  }, [currentStep, t]);

  const stepInfo = getStepInfo();
  const StepIcon = STEP_ICONS[currentStep] || Users;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 lg:bg-white">

      {/* ══════════════════════════════════════════════════════════
          Left Panel - Branding (hidden on mobile, shown on lg+)
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] 2xl:w-[50%] relative overflow-hidden flex-shrink-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600" />

        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        {/* Branding content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 2xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg shadow-black/5">
              <Stethoscope size={22} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight block leading-tight">
                {t('common.appName')}
              </span>
              <span className="text-[11px] text-white/50 font-medium">
                {t('common.tagline')}
              </span>
            </div>
          </div>

          {/* Hero section */}
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <Users size={14} className="text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">{t('auth.patient')} Registration</span>
            </div>

            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-[1.15] mb-5">
              Join Our{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200">
                Health Community
              </span>
            </h1>

            <p className="text-base xl:text-lg text-white/60 leading-relaxed mb-10">
              Create your account in minutes. Track your health, connect with doctors, and take control of your wellbeing.
            </p>

            {/* Steps preview */}
            <div className="space-y-3">
              {[
                { num: 1, text: 'Verify your phone number', icon: Phone },
                { num: 2, text: 'Add basic information', icon: User },
                { num: 3, text: 'Optional health details', icon: Heart },
              ].map(({ num, text, icon: Icon }) => (
                <div
                  key={num}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    currentStep === num
                      ? 'bg-white/20 border border-white/30'
                      : currentStep > num
                        ? 'bg-white/10 border border-white/10'
                        : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    currentStep > num
                      ? 'bg-white/30 text-white'
                      : currentStep === num
                        ? 'bg-white text-emerald-700'
                        : 'bg-white/10 text-white/50'
                  }`}>
                    {currentStep > num ? <CheckCircle size={16} /> : num}
                  </div>
                  <span className={`text-sm font-medium ${
                    currentStep >= num ? 'text-white' : 'text-white/40'
                  }`}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-5 text-white/40 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <Shield size={14} />
              <span>Secure & Private</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Activity size={14} />
              <span>Quick Setup</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Globe size={14} />
              <span>Multi-language</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Right Panel - Registration Form
          ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">

        {/* ── Mobile top header ── */}
        <div className="lg:hidden relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10 px-5 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10">
            {/* Language switcher */}
            <div className="absolute top-4 right-4">
              <LanguageSwitcher variant="dropdown" size="sm" />
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg mb-3">
                <Users size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {t('registration.patientRegistration')}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {stepInfo.subtitle}
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-50 rounded-t-[1.5rem]" />
        </div>

        {/* ── Desktop language switcher ── */}
        <div className="hidden lg:flex items-center justify-end px-8 pt-5">
          <LanguageSwitcher variant="dropdown" size="sm" />
        </div>

        {/* ── Form area ── */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 lg:px-10 xl:px-14 py-5 sm:py-6 lg:py-0 overflow-y-auto">
          <div className="w-full max-w-[480px]">

            {/* Step progress bar */}
            <div className="flex items-center gap-2 mb-6">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                    currentStep > i + 1
                      ? 'bg-emerald-500'
                      : currentStep === i + 1
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Step header */}
            <div className="mb-6 hidden lg:block">
              <div className={`
                inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 transition-colors duration-300
                ${currentStep === 1 ? 'bg-gradient-to-br from-violet-100 to-purple-50'
                  : currentStep === 2 ? 'bg-gradient-to-br from-emerald-100 to-green-50'
                    : 'bg-gradient-to-br from-rose-100 to-pink-50'
                }
              `}>
                <StepIcon className={`w-6 h-6 ${
                  currentStep === 1 ? 'text-violet-600'
                    : currentStep === 2 ? 'text-emerald-600'
                      : 'text-rose-600'
                }`} />
              </div>
              <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">
                {t('registration.patientRegistration')}
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                {stepInfo.subtitle} • {t('common.step', 'step')} {currentStep}/{TOTAL_STEPS}
              </p>
            </div>

            {/* Mobile step counter */}
            <div className="lg:hidden flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('common.step', 'step')} {currentStep} / {TOTAL_STEPS}
              </span>
              {currentStep === 3 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                  {t('common.optional', 'optional')}
                </span>
              )}
            </div>

            {/* ── Form Card ── */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100/80 overflow-hidden">
              {/* Progress bar inside card */}
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                />
              </div>

              <div className="p-5 sm:p-6 lg:p-7">
                <form onSubmit={handleSubmit(onSubmit)}>

                  {/* ── Step 1: Phone Verification ── */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      {!otpSent ? (
                        <>
                          <div className="text-center mb-2">
                            <p className="text-sm text-gray-400">
                              {t('auth.phoneVerificationDesc', 'Enter your phone number to receive a one-time password (OTP) for verification.')}
                            </p>
                          </div>

                          <PhoneInput
                            value={phone}
                            onChange={handlePhoneChange}
                            error={phoneError || error}
                            label={t('auth.phoneNumber', 'Phone Number')}
                            placeholder={t('auth.enterPhone', 'Enter Phone Number')}
                            autoFocus
                            size="lg"
                          />

                          <Button
                            type="button"
                            onClick={handleSendOTP}
                            fullWidth
                            size="lg"
                            loading={isLoading}
                            rightIcon={<ArrowRight size={18} />}
                            className="!bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-700 hover:!to-teal-700 !shadow-lg !shadow-emerald-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 sm:!py-4 !text-sm sm:!text-base !font-bold"
                          >
                            {t('auth.sendOTP', 'Send OTP')}
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* Phone display */}
                          <div className="flex items-center justify-between p-3 sm:p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-xl sm:rounded-2xl border border-emerald-100/80">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                                <Phone size={16} className="text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] sm:text-xs text-emerald-500 font-medium">{t('auth.phoneNumber')}</p>
                                <p className="font-bold text-gray-900 text-sm sm:text-base truncate">+91 {phone}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handlePhoneEdit}
                              className="!text-emerald-600 hover:!bg-emerald-100 !rounded-lg !font-semibold !text-xs sm:!text-sm flex-shrink-0"
                            >
                              {t('common.edit', 'Edit')}
                            </Button>
                          </div>

                          {/* OTP Input */}
                          <div className="py-2">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-3 sm:mb-4 text-center">
                              {t('auth.enterOTP', 'Enter OTP')}
                            </label>
                            <OTPInput
                              value={otp}
                              onChange={setOtp}
                              onComplete={handleOTPComplete}
                              error={otpError || error}
                              disabled={isLoading || isVerifying}
                              autoFocus
                            />
                            <p className="text-[11px] text-gray-400 text-center mt-3">
                              {t('auth.otpSentTo', `OTP sent to {phone}`, { phone: `+91 ${phone}` })}
                            </p>
                          </div>

                          {/* Verify Button */}
                          <Button
                            type="button"
                            onClick={handleVerifyOTP}
                            fullWidth
                            size="lg"
                            loading={isLoading || isVerifying}
                            disabled={otp.length !== OTP_LENGTH}
                            className="!bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-700 hover:!to-teal-700 !shadow-lg !shadow-emerald-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 sm:!py-4 !font-bold disabled:!opacity-40"
                          >
                            {t('auth.verifyAndContinue', 'Verify & Continue')}
                          </Button>

                          {/* Resend OTP */}
                          <div className="text-center pt-1">
                            {canResend ? (
                              <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={isLoading}
                                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm hover:underline transition-all disabled:opacity-50"
                              >
                                {t('auth.resendOTP', 'Resend OTP')}
                              </button>
                            ) : resendTimer > 0 ? (
                              <div className="flex items-center justify-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                  <span className="text-xs font-bold text-emerald-600">{resendTimer}</span>
                                </div>
                                <p className="text-sm text-gray-400">
                                  {t('auth.resendIn', `Resend in {seconds} seconds`, { seconds: resendTimer })}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}

                      <div id="recaptcha-container" />
                    </div>
                  )}

                  {/* ── Step 2: Basic Information ── */}
                  {currentStep === 2 && (
                    <div className="space-y-4 sm:space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Controller
                          name="first_name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              label={t('registration.firstName')}
                              placeholder={t('registration.firstNamePlaceholder', 'Enter First Name')}
                              error={errors.first_name?.message}
                              required
                              autoFocus
                              leftIcon={<User size={16} />}
                            />
                          )}
                        />
                        <Controller
                          name="last_name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              label={t('registration.lastName')}
                              placeholder={t('registration.lastNamePlaceholder', 'Enter Last Name')}
                              error={errors.last_name?.message}
                            />
                          )}
                        />
                      </div>

                      <Controller
                        name="date_of_birth"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="date"
                            label={t('registration.dateOfBirth')}
                            placeholder={t('registration.dateOfBirthPlaceholder', 'Select Date of Birth')}
                            error={errors.date_of_birth?.message}
                            max={todayDate}
                          />
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Controller
                          name="gender"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              label={t('registration.gender', 'Gender')}
                              options={genderOptions}
                              error={errors.gender?.message}
                            />
                          )}
                        />
                        <Controller
                          name="preferred_language"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              label={t('registration.preferredLanguage', 'Preferred Language')}
                              options={LANGUAGE_OPTIONS}
                              error={errors.preferred_language?.message}
                            />
                          )}
                        />
                      </div>

                      {/* Navigation */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          leftIcon={<ArrowLeft size={16} />}
                          className="!rounded-xl !font-semibold"
                        >
                          {t('common.back', 'Back')}
                        </Button>
                        <Button
                          type="submit"
                          fullWidth
                          rightIcon={<ArrowRight size={16} />}
                          className="!bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-700 hover:!to-teal-700 !shadow-lg !shadow-emerald-500/20 !rounded-xl !font-bold"
                        >
                          {t('common.next', 'Next')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 3: Additional Details ── */}
                  {currentStep === 3 && (
                    <div className="space-y-4 sm:space-y-5">
                      {/* Optional badge */}
                      <div className="hidden lg:flex items-center justify-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                          {t('common.optional', 'optional')}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Controller
                          name="village"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              label={t('registration.village', 'Village')}
                              placeholder={t('registration.villagePlaceholder', 'Enter Village')}
                              leftIcon={<MapPin size={16} />}
                            />
                          )}
                        />
                        <Controller
                          name="district"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              label={t('registration.district', 'District')}
                              placeholder={t('registration.districtPlaceholder', 'Enter District')}
                            />
                          )}
                        />
                      </div>

                      <Controller
                        name="blood_group"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            label={t('registration.bloodGroup', 'Blood Group')}
                            options={bloodGroupOptions}
                          />
                        )}
                      />

                      {/* Emergency Contact Section */}
                      <div className="p-4 sm:p-5 bg-gradient-to-br from-red-50/80 via-orange-50/60 to-yellow-50/40 rounded-xl sm:rounded-2xl border border-red-100/50">
                        <h3 className="text-sm font-bold text-red-800 mb-3 sm:mb-4 flex items-center gap-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <Phone size={14} className="text-red-600" />
                          </div>
                          {t('registration.emergencyContact', 'Emergency Contact')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <Controller
                            name="emergency_contact_name"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                label={t('registration.emergencyContactName', 'Emergency Contact Name')}
                                placeholder={t('registration.emergencyContactNamePlaceholder', 'Enter Emergency Contact Name')}
                                className="bg-white/70"
                              />
                            )}
                          />
                          <Controller
                            name="emergency_contact_phone"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="tel"
                                inputMode="numeric"
                                label={t('registration.emergencyContactPhone', 'Emergency Contact Phone')}
                                placeholder={t('registration.emergencyContactPhonePlaceholder', 'Enter Emergency Contact Phone')}
                                error={errors.emergency_contact_phone?.message}
                                maxLength={PHONE_LENGTH}
                                onChange={handleEmergencyPhoneChange(field)}
                                className="bg-white/70"
                              />
                            )}
                          />
                        </div>
                      </div>

                      {/* Accessibility Options */}
                      <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40 rounded-xl sm:rounded-2xl border border-blue-100/50">
                        <h3 className="text-sm font-bold text-blue-800 mb-3 sm:mb-4 flex items-center gap-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Volume2 size={14} className="text-blue-600" />
                          </div>
                          {t('registration.accessibilityOptions', 'Accessibility Options')}
                        </h3>
                        <div className="space-y-2">
                          <Controller
                            name="is_literate"
                            control={control}
                            render={({ field }) => (
                              <label className="flex items-center gap-3 cursor-pointer p-2.5 sm:p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 border border-transparent hover:border-blue-200">
                                <div className="relative flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="sr-only peer"
                                  />
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all duration-200 flex items-center justify-center">
                                    {field.value && (
                                      <CheckCircle size={14} className="text-white" />
                                    )}
                                  </div>
                                </div>
                                <span className="text-gray-700 font-medium text-sm">
                                  {t('registration.isLiterate', 'Is Literate')}
                                </span>
                              </label>
                            )}
                          />
                          <Controller
                            name="needs_voice_assistance"
                            control={control}
                            render={({ field }) => (
                              <label className="flex items-center gap-3 cursor-pointer p-2.5 sm:p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 border border-transparent hover:border-blue-200">
                                <div className="relative flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="sr-only peer"
                                  />
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all duration-200 flex items-center justify-center">
                                    {field.value && (
                                      <CheckCircle size={14} className="text-white" />
                                    )}
                                  </div>
                                </div>
                                <span className="text-gray-700 font-medium text-sm">
                                  {t('registration.needsVoiceAssistance', 'Needs Voice Assistance')}
                                </span>
                              </label>
                            )}
                          />
                        </div>
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          leftIcon={<ArrowLeft size={16} />}
                          className="!rounded-xl !font-semibold order-2 sm:order-1"
                        >
                          {t('common.back', 'Back')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSkip}
                          className="order-3 sm:order-2 !text-gray-400 hover:!text-gray-600"
                        >
                          {t('common.skipForNow', 'Skip for Now')}
                        </Button>
                        <Button
                          type="submit"
                          fullWidth
                          loading={isLoading}
                          rightIcon={<CheckCircle size={16} />}
                          className="!bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-700 hover:!to-teal-700 !shadow-lg !shadow-emerald-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 !font-bold order-1 sm:order-3"
                        >
                          {t('registration.completeRegistration')}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Login Link */}
            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-gray-400 text-xs sm:text-sm">
                {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
                <Link
                  to="/login"
                  className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-all"
                >
                  {t('auth.login', 'Login')}
                </Link>
              </p>
            </div>

            {/* Mobile copyright */}
            <p className="lg:hidden mt-6 text-center text-[10px] text-gray-300">
              © {new Date().getFullYear()} {t('common.appName','MediConnect')}. {t('common.allRightsReserved', 'All rights reserved.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRegister;