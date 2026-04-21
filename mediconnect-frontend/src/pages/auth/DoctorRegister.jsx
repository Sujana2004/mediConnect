// src/pages/auth/DoctorRegister.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stethoscope,
  Phone,
  Shield,
  ArrowRight,
  ArrowLeft,
  Building,
  Award,
  FileText,
  CheckCircle,
  User,
  Mail,
  IndianRupee,
  Activity,
  Globe,
  Heart,
  Sparkles
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

// Validation schema matching backend DoctorRegistrationSerializer
const doctorSchema = z.object({
  // Basic info (matching backend fields)
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  preferred_language: z.enum(['en', 'hi', 'te']).default('te'),

  // Professional info (required by backend)
  registration_number: z.string().min(1, 'Registration number is required'),
  registration_council: z.string().min(1, 'Registration council is required'),
  specialization: z.string().default('general'),
  qualification: z.string().min(1, 'Qualification is required'),
  experience_years: z.number().min(0).max(70).default(0),

  // Practice info (optional)
  hospital_name: z.string().optional(),
  hospital_address: z.string().optional(),
  consultation_fee: z.number().min(0).default(0),
  languages_spoken: z.array(z.string()).default(['telugu']),
  bio: z.string().max(1000).optional()
});

/**
 * Constants for form options
 */
const GENDER_OPTIONS_KEYS = [
  { value: '', labelKey: 'common.select' },
  { value: 'male', labelKey: 'registration.male' },
  { value: 'female', labelKey: 'registration.female' },
  { value: 'other', labelKey: 'registration.other' }
];

const LANGUAGE_OPTIONS = [
  { value: 'te', label: 'తెలుగు' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'en', label: 'English' }
];

const SPECIALIZATION_OPTIONS = [
  { value: 'general', label: 'General Physician' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'gynecology', label: 'Gynecology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'ent', label: 'ENT' },
  { value: 'ophthalmology', label: 'Ophthalmology' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'dentistry', label: 'Dentistry' },
  { value: 'ayurveda', label: 'Ayurveda' },
  { value: 'homeopathy', label: 'Homeopathy' },
  { value: 'other', label: 'Other' }
];

const SPOKEN_LANGUAGES_LIST = [
  { value: 'telugu', label: 'Telugu' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'english', label: 'English' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'gujarati', label: 'Gujarati' }
];

const TOTAL_STEPS = 4;
const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 30;
const BIO_MAX_LENGTH = 1000;
const MAX_EXPERIENCE_YEARS = 70;

/**
 * Step config for left panel display
 */
const STEP_CONFIG = [
  { num: 1, text: 'Verify your phone number', icon: Phone },
  { num: 2, text: 'Personal information', icon: User },
  { num: 3, text: 'Professional credentials', icon: Award },
  { num: 4, text: 'Practice details', icon: Building },
];

/**
 * Doctor registration page with multi-step form
 * Step 1: Phone verification
 * Step 2: Basic information
 * Step 3: Professional information
 * Step 4: Practice details
 */
const DoctorRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLanguage } = useLanguage();
  const {
    sendPhoneOTP,
    registerNewDoctor,
    isLoading,
    error,
    clearError
  } = useAuth();

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

  // Languages spoken - default to Telugu as per backend
  const [selectedLanguages, setSelectedLanguages] = useState(['telugu']);

  // Memoized values
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const genderOptions = useMemo(() =>
    GENDER_OPTIONS_KEYS.map(opt => ({
      value: opt.value,
      label: t(opt.labelKey, opt.value || 'Select')
    })),
    [t]
  );

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger
  } = useForm({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      date_of_birth: '',
      gender: '',
      preferred_language: currentLanguage || 'te',
      registration_number: '',
      registration_council: '',
      specialization: 'general',
      qualification: '',
      experience_years: 0,
      hospital_name: '',
      hospital_address: '',
      consultation_fee: 0,
      languages_spoken: ['telugu'],
      bio: ''
    }
  });

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

  // Validate phone number
  const validatePhone = useCallback((phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!cleaned) return t('auth.phoneRequired');
    if (cleaned.length !== 10) return t('auth.invalidPhone');
    if (!/^[6-9]/.test(cleaned)) return t('auth.invalidPhone');
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
      setPhoneError(result.error || t('errors.somethingWrong'));
    }
  }, [phone, validatePhone, sendPhoneOTP, t]);

  // Handle verify OTP - actually verify with Firebase
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
        // Store the Firebase token for later use during registration
        setVerifiedFirebaseToken(verifyResult.token);
        setIsVerifying(false);
        setCurrentStep(2);
      } else {
        setOtpError(verifyResult.message || t('auth.invalidOTP'));
        setIsVerifying(false);
      }
    } catch (error) {
      setOtpError(error.message || t('auth.invalidOTP'));
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
      toast.error(result.error || t('errors.somethingWrong'));
    }
  }, [canResend, phone, sendPhoneOTP, t]);

  // Handle step navigation
  const handleNextStep = useCallback(async () => {
    let fieldsToValidate = [];

    switch (currentStep) {
      case 2:
        fieldsToValidate = ['first_name'];
        break;
      case 3:
        fieldsToValidate = ['registration_number', 'registration_council', 'qualification'];
        break;
      default:
        break;
    }

    const isValid = fieldsToValidate.length === 0 || await trigger(fieldsToValidate);

    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, trigger]);

  // Handle form submission
  const onSubmit = useCallback(async (data) => {
    // Build doctor data matching backend serializer
    const doctorData = {
      // Required fields
      first_name: data.first_name.trim(),
      registration_number: data.registration_number.trim(),
      registration_council: data.registration_council.trim(),
      qualification: data.qualification.trim(),
      specialization: data.specialization || 'general',
      experience_years: data.experience_years || 0,
      languages_spoken: selectedLanguages.length > 0 ? selectedLanguages : ['telugu'],
      preferred_language: data.preferred_language || 'te',
    };

    // Add optional fields only if they have values
    if (data.last_name?.trim()) doctorData.last_name = data.last_name.trim();
    if (data.email?.trim()) doctorData.email = data.email.trim();
    if (data.date_of_birth) doctorData.date_of_birth = data.date_of_birth;
    if (data.gender && data.gender !== '') doctorData.gender = data.gender;
    if (data.hospital_name?.trim()) doctorData.hospital_name = data.hospital_name.trim();
    if (data.hospital_address?.trim()) doctorData.hospital_address = data.hospital_address.trim();
    if (data.consultation_fee && data.consultation_fee > 0) doctorData.consultation_fee = data.consultation_fee;
    if (data.bio?.trim()) doctorData.bio = data.bio.trim();

    logger.log('Submitting doctor data:', doctorData);

    // Use the already-verified Firebase token
    if (!verifiedFirebaseToken) {
      toast.error(t('auth.sessionExpired') || 'Session expired. Please verify your phone again.');
      setCurrentStep(1);
      setOtpSent(false);
      setOtp('');
      setVerifiedFirebaseToken(null);
      return;
    }

    const result = await registerNewDoctor(verifiedFirebaseToken, doctorData);

    if (result.success) {
      toast.success(t('registration.registrationSuccess'));
      toast.success(t('registration.pendingVerification'), { duration: 5000 });
      navigate('/doctor/home', { replace: true });
    } else {
      const errorLower = (result.error || '').toLowerCase();

      logger.log('❌ Registration error:', result.error);

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
        toast.error(t('auth.userAlreadyExists') || 'This phone number is already registered. Please login instead.');
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
        errorLower.includes('expired')
      ) {
        setCurrentStep(1);
        setOtpSent(false);
        setOtp('');
        setVerifiedFirebaseToken(null);
        toast.error(t('auth.sessionExpired') || 'Session expired. Please verify your phone again.');
        return;
      }

      // Generic error - show actual backend message
      toast.error(result.error || t('errors.somethingWrong'));
    }
  }, [selectedLanguages, verifiedFirebaseToken, registerNewDoctor, navigate, t, phone]);

  // Handle back
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/login');
    }
  }, [currentStep, navigate]);

  // Toggle language selection
  const toggleLanguage = useCallback((lang) => {
    setSelectedLanguages(prev => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev;
        return prev.filter(l => l !== lang);
      }
      return [...prev, lang];
    });
  }, []);

  // Handle phone edit
  const handlePhoneEdit = useCallback(() => {
    setOtpSent(false);
    setOtp('');
  }, []);

  // Handle phone change
  const handlePhoneChange = useCallback((e) => {
    setPhone(e.target.value);
    if (phoneError) setPhoneError('');
  }, [phoneError]);

  // Get step subtitle
  const getStepSubtitle = useCallback(() => {
    switch (currentStep) {
      case 1: return t('auth.verifyPhoneSubtitle');
      case 2: return t('registration.basicInfoSubtitle');
      case 3: return t('registration.professionalInfoSubtitle');
      case 4: return t('registration.practiceDetailsSubtitle');
      default: return '';
    }
  }, [currentStep, t]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 lg:bg-white">

      {/* ══════════════════════════════════════════════════════════
          Left Panel - Branding (hidden on mobile, shown on lg+)
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] 2xl:w-[50%] relative overflow-hidden flex-shrink-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-800 via-purple-700 to-indigo-700" />

        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
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
              <Stethoscope size={14} className="text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">{t('auth.doctor')} Registration</span>
            </div>

            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-[1.15] mb-5">
              Join as a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200">
                Healthcare Provider
              </span>
            </h1>

            <p className="text-base xl:text-lg text-white/60 leading-relaxed mb-10">
              Register to connect with patients, manage appointments, and provide quality healthcare through our platform.
            </p>

            {/* Steps preview */}
            <div className="space-y-2.5">
              {STEP_CONFIG.map(({ num, text, icon: Icon }) => (
                <div
                  key={num}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                    currentStep === num
                      ? 'bg-white/20 border border-white/30'
                      : currentStep > num
                        ? 'bg-white/10 border border-white/10'
                        : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    currentStep > num
                      ? 'bg-white/30 text-white'
                      : currentStep === num
                        ? 'bg-white text-violet-700'
                        : 'bg-white/10 text-white/50'
                  }`}>
                    {currentStep > num ? <CheckCircle size={14} /> : num}
                  </div>
                  <Icon size={14} className={currentStep >= num ? 'text-white/80' : 'text-white/30'} />
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
              <span>Verified Doctors</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Activity size={14} />
              <span>Secure Platform</span>
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
          <div className="absolute inset-0 bg-gradient-to-br from-violet-800 via-purple-700 to-indigo-700" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10 px-5 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10">
            <div className="absolute top-4 right-4">
              <LanguageSwitcher variant="dropdown" size="sm" />
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg mb-3">
                <Stethoscope size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {t('registration.doctorRegistration')}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {getStepSubtitle()}
              </p>

              {/* Mobile step dots */}
              <div className="flex items-center gap-2 mt-4">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentStep > i + 1
                        ? 'w-6 bg-white/60'
                        : currentStep === i + 1
                          ? 'w-8 bg-white'
                          : 'w-4 bg-white/20'
                    }`}
                  />
                ))}
              </div>
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
          <div className="w-full max-w-[500px]">

            {/* Step progress bar */}
            <div className="flex items-center gap-2 mb-6">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                    currentStep > i + 1
                      ? 'bg-violet-500'
                      : currentStep === i + 1
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                        : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Desktop step header */}
            <div className="mb-5 hidden lg:block">
              <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">
                {t('registration.doctorRegistration')}
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                {getStepSubtitle()} • {t('common.step', 'step')} {currentStep}/{TOTAL_STEPS}
              </p>
            </div>

            {/* Mobile step counter */}
            <div className="lg:hidden flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('common.step', 'step')} {currentStep} / {TOTAL_STEPS}
              </span>
            </div>

            {/* ── Form Card ── */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100/80 overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
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
                          <PhoneInput
                            value={phone}
                            onChange={handlePhoneChange}
                            error={phoneError || error}
                            label={t('auth.phoneNumber')}
                            placeholder={t('auth.enterPhone')}
                            required
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
                            className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 sm:!py-4 !font-bold"
                          >
                            {t('auth.sendOTP')}
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* Phone display */}
                          <div className="flex items-center justify-between p-3 sm:p-3.5 bg-gradient-to-r from-violet-50/80 to-purple-50/80 rounded-xl sm:rounded-2xl border border-violet-100/80">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                                <Phone size={16} className="text-violet-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] sm:text-xs text-violet-500 font-medium">{t('auth.phoneNumber')}</p>
                                <p className="font-bold text-gray-900 text-sm sm:text-base truncate">+91 {phone}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handlePhoneEdit}
                              className="!text-violet-600 hover:!bg-violet-100 !rounded-lg !font-semibold !text-xs sm:!text-sm flex-shrink-0"
                            >
                              {t('common.edit')}
                            </Button>
                          </div>

                          {/* OTP Input */}
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-3 sm:mb-4 text-center">
                              {t('auth.enterOTP')}
                            </label>
                            <OTPInput
                              value={otp}
                              onChange={setOtp}
                              onComplete={handleOTPComplete}
                              error={otpError || error}
                              disabled={isLoading || isVerifying}
                              autoFocus
                            />
                          </div>

                          {/* Verify Button */}
                          <Button
                            type="button"
                            onClick={handleVerifyOTP}
                            fullWidth
                            size="lg"
                            loading={isLoading || isVerifying}
                            disabled={otp.length !== OTP_LENGTH}
                            className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 sm:!py-4 !font-bold disabled:!opacity-40"
                          >
                            {t('auth.verifyOTP')}
                          </Button>

                          {/* Resend OTP */}
                          <div className="text-center pt-1">
                            {canResend ? (
                              <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={isLoading}
                                className="text-violet-600 hover:text-violet-700 font-semibold text-sm hover:underline transition-all disabled:opacity-50"
                              >
                                {t('auth.resendOTP')}
                              </button>
                            ) : resendTimer > 0 ? (
                              <div className="flex items-center justify-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
                                  <span className="text-xs font-bold text-violet-600">{resendTimer}</span>
                                </div>
                                <p className="text-sm text-gray-400">
                                  {t('auth.resendIn', { seconds: resendTimer })}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}

                      {/* reCAPTCHA container */}
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
                              placeholder={t('registration.firstName')}
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
                              placeholder={t('registration.lastName')}
                            />
                          )}
                        />
                      </div>

                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="email"
                            label={t('registration.email')}
                            placeholder="doctor@example.com"
                            error={errors.email?.message}
                            leftIcon={<Mail size={16} />}
                          />
                        )}
                      />

                      <Controller
                        name="date_of_birth"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="date"
                            label={t('registration.dateOfBirth')}
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
                              label={t('registration.gender')}
                              options={genderOptions}
                            />
                          )}
                        />
                        <Controller
                          name="preferred_language"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              label={t('registration.preferredLanguage')}
                              options={LANGUAGE_OPTIONS}
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
                          {t('common.back')}
                        </Button>
                        <Button
                          type="button"
                          fullWidth
                          onClick={handleNextStep}
                          rightIcon={<ArrowRight size={16} />}
                          className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl !font-bold"
                        >
                          {t('common.next')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 3: Professional Information ── */}
                  {currentStep === 3 && (
                    <div className="space-y-4 sm:space-y-5">
                      {/* Verification notice */}
                      <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl sm:rounded-2xl border border-amber-200/60">
                        <p className="text-xs sm:text-sm text-amber-800 flex items-center gap-2 font-medium">
                          <Shield size={16} className="flex-shrink-0 text-amber-600" />
                          {t('registration.verificationNote')}
                        </p>
                      </div>

                      <Controller
                        name="registration_number"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label={t('registration.registrationNumber')}
                            placeholder="e.g., MCI-12345"
                            error={errors.registration_number?.message}
                            required
                            leftIcon={<FileText size={16} />}
                          />
                        )}
                      />

                      <Controller
                        name="registration_council"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label={t('registration.registrationCouncil')}
                            placeholder="e.g., Andhra Pradesh Medical Council"
                            error={errors.registration_council?.message}
                            required
                          />
                        )}
                      />

                      <Controller
                        name="specialization"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            label={t('registration.specialization')}
                            options={SPECIALIZATION_OPTIONS}
                            required
                          />
                        )}
                      />

                      <Controller
                        name="qualification"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label={t('registration.qualification')}
                            placeholder="e.g., MBBS, MD, MS"
                            error={errors.qualification?.message}
                            required
                            leftIcon={<Award size={16} />}
                          />
                        )}
                      />

                      <Controller
                        name="experience_years"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            inputMode="numeric"
                            label={t('registration.experienceYears')}
                            placeholder="0"
                            min={0}
                            max={MAX_EXPERIENCE_YEARS}
                            value={field.value || 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 0;
                              field.onChange(Math.min(Math.max(value, 0), MAX_EXPERIENCE_YEARS));
                            }}
                          />
                        )}
                      />

                      {/* Navigation */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          leftIcon={<ArrowLeft size={16} />}
                          className="!rounded-xl !font-semibold"
                        >
                          {t('common.back')}
                        </Button>
                        <Button
                          type="button"
                          fullWidth
                          onClick={handleNextStep}
                          rightIcon={<ArrowRight size={16} />}
                          className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl !font-bold"
                        >
                          {t('common.next')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 4: Practice Details ── */}
                  {currentStep === 4 && (
                    <div className="space-y-4 sm:space-y-5">
                      <Controller
                        name="hospital_name"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label={t('registration.hospitalName')}
                            placeholder={t('registration.hospitalNamePlaceholder')}
                            leftIcon={<Building size={16} />}
                          />
                        )}
                      />

                      <Controller
                        name="hospital_address"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label={t('registration.hospitalAddress')}
                            placeholder={t('registration.hospitalAddressPlaceholder')}
                          />
                        )}
                      />

                      <Controller
                        name="consultation_fee"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            inputMode="numeric"
                            label={t('registration.consultationFee')}
                            placeholder="500"
                            min={0}
                            leftIcon={<IndianRupee size={16} />}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 0;
                              field.onChange(Math.max(value, 0));
                            }}
                          />
                        )}
                      />

                      {/* Languages Spoken */}
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                          {t('registration.languagesSpoken')} *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SPOKEN_LANGUAGES_LIST.map((lang) => (
                            <button
                              key={lang.value}
                              type="button"
                              onClick={() => toggleLanguage(lang.value)}
                              className={`
                                px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95
                                ${selectedLanguages.includes(lang.value)
                                  ? 'bg-violet-100 text-violet-700 border-2 border-violet-400 shadow-sm'
                                  : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:border-violet-200 hover:bg-violet-50/30'
                                }
                              `}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          {t('registration.selectAtLeastOne')}
                        </p>
                      </div>

                      <Controller
                        name="bio"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                              {t('registration.bio')}
                            </label>
                            <textarea
                              {...field}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none text-sm transition-all"
                              placeholder={t('registration.bioPlaceholder')}
                              maxLength={BIO_MAX_LENGTH}
                            />
                            <p className="text-[11px] text-gray-400 mt-1 text-right">
                              {field.value?.length || 0}/{BIO_MAX_LENGTH}
                            </p>
                          </div>
                        )}
                      />

                      {/* Navigation */}
                      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          leftIcon={<ArrowLeft size={16} />}
                          className="!rounded-xl !font-semibold order-2 sm:order-1"
                        >
                          {t('common.back')}
                        </Button>
                        <Button
                          type="submit"
                          fullWidth
                          loading={isLoading}
                          rightIcon={<CheckCircle size={16} />}
                          className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 !font-bold order-1 sm:order-2"
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
                {t('auth.alreadyHaveAccount')}{' '}
                <Link
                  to="/login"
                  className="text-violet-600 font-bold hover:text-violet-700 hover:underline transition-all"
                >
                  {t('auth.login')}
                </Link>
              </p>
            </div>

            {/* Mobile copyright */}
            <p className="lg:hidden mt-6 text-center text-[10px] text-gray-300">
              © {new Date().getFullYear()} {t('common.appName')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegister;