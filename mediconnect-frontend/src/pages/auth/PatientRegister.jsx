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
  Shield
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  PhoneInput,
  OTPInput,
  Card
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

  // Memoized values
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const genderOptions = useMemo(() => [
    { value: '', label: t('common.select') },
    { value: 'male', label: t('registration.male') },
    { value: 'female', label: t('registration.female') },
    { value: 'other', label: t('registration.other') }
  ], [t]);

  const bloodGroupOptions = useMemo(() => [
    { value: '', label: t('common.select') },
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
    if (!cleaned) return t('auth.phoneRequired');
    if (cleaned.length !== PHONE_LENGTH) return t('auth.invalidPhone');
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

    // Small delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    setIsVerifying(false);
    setCurrentStep(2);
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

    logger.log('📤 Submitting patient data:', patientData);

    const result = await registerNewPatient(otp, patientData);

    if (result.success) {
      toast.success(t('registration.registrationSuccess'));
      navigate('/patient/home', { replace: true });
    } else {
      const errorLower = (result.error || '').toLowerCase();

      // Check if user already exists - redirect to login
      if (
        errorLower.includes('already exists') ||
        errorLower.includes('already registered') ||
        errorLower.includes('phone number already') ||
        errorLower.includes('user with this phone')
      ) {
        toast.error(t('auth.userAlreadyExists'));
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
        toast.error(t('auth.sessionExpired'));
        return;
      }

      // Generic error
      toast.error(result.error || t('errors.somethingWrong'));
    }
  }, [currentStep, trigger, buildPatientData, otp, registerNewPatient, t, navigate, phone]);

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
        return {
          subtitle: t('auth.verifyPhoneSubtitle'),
          icon: Shield
        };
      case 2:
        return {
          subtitle: t('registration.basicInfoSubtitle'),
          icon: User
        };
      case 3:
        return {
          subtitle: t('registration.additionalInfoSubtitle'),
          icon: Heart
        };
      default:
        return { subtitle: '', icon: Users };
    }
  }, [currentStep, t]);

  const stepInfo = getStepInfo();

  // Step indicator component
  const StepIndicator = useMemo(() => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <div key={`step-${step}`} className="flex items-center">
          <div
            className={`
              w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold
              transition-all duration-300 shadow-sm
              ${currentStep >= step
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200/50'
                : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
              }
            `}
            aria-current={currentStep === step ? 'step' : undefined}
            aria-label={`${t('common.step')} ${step}`}
          >
            {currentStep > step ? (
              <CheckCircle size={20} strokeWidth={2.5} />
            ) : (
              step
            )}
          </div>
          {step < TOTAL_STEPS && (
            <div
              className={`
                w-12 sm:w-16 h-1.5 mx-2 rounded-full transition-all duration-500
                ${currentStep > step
                  ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                  : 'bg-gray-200'
                }
              `}
            />
          )}
        </div>
      ))}
    </div>
  ), [currentStep, t]);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-gradient-to-br from-secondary-100 via-secondary-50 to-primary-50 mb-4 shadow-xl shadow-secondary-200/30 p-4">
          <stepInfo.icon className="w-9 h-9 text-secondary-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t('registration.patientRegistration')}
        </h1>
        <p className="text-gray-500 mt-2 text-sm sm:text-base max-w-xs mx-auto">
          {stepInfo.subtitle}
        </p>
      </div>

      {/* Step Indicator */}
      {StepIndicator}

      {/* Form Card */}
      <Card className="shadow-xl border-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Phone Verification */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {!otpSent ? (
                  <>
                    <div className="text-center mb-2">
                      <p className="text-sm text-gray-500">
                        {t('auth.phoneVerificationDesc')}
                      </p>
                    </div>

                    <PhoneInput
                      value={phone}
                      onChange={handlePhoneChange}
                      error={phoneError || error}
                      label={t('auth.phoneNumber')}
                      placeholder={t('auth.enterPhone')}
                      autoFocus
                      size="lg"
                    />

                    <Button
                      type="button"
                      onClick={handleSendOTP}
                      fullWidth
                      size="lg"
                      loading={isLoading}
                      rightIcon={<ArrowRight size={20} />}
                      className="shadow-lg shadow-primary-200/50 h-14 text-base font-semibold"
                    >
                      {t('auth.sendOTP')}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Phone display */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 via-gray-50 to-secondary-50 rounded-2xl border border-primary-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                          <Phone size={22} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            {t('auth.phoneNumber')}
                          </p>
                          <p className="font-bold text-gray-900 text-lg">+91 {phone}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handlePhoneEdit}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {t('common.edit')}
                      </Button>
                    </div>

                    {/* OTP Input */}
                    <div className="py-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
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
                      <p className="text-xs text-gray-400 text-center mt-3">
                        {t('auth.otpSentTo', { phone: `+91 ${phone}` })}
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
                      className="shadow-lg shadow-primary-200/50 h-14 text-base font-semibold"
                    >
                      {t('auth.verifyAndContinue')}
                    </Button>

                    {/* Resend OTP */}
                    <div className="text-center pt-2">
                      {canResend ? (
                        <Button
                          type="button"
                          variant="link"
                          onClick={handleResendOTP}
                          disabled={isLoading}
                          className="text-primary-600 font-medium"
                        >
                          {t('auth.resendOTP')}
                        </Button>
                      ) : resendTimer > 0 ? (
                        <p className="text-sm text-gray-500">
                          {t('auth.resendIn', { seconds: resendTimer })}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}

                <div id="recaptcha-container" />
              </div>
            )}

            {/* Step 2: Basic Information */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="first_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label={t('registration.firstName')}
                        placeholder={t('registration.firstNamePlaceholder')}
                        error={errors.first_name?.message}
                        required
                        autoFocus
                        leftIcon={<User size={18} />}
                        className="h-12"
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
                        placeholder={t('registration.lastNamePlaceholder')}
                        error={errors.last_name?.message}
                        className="h-12"
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
                      error={errors.date_of_birth?.message}
                      max={todayDate}
                      className="h-12"
                    />
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        label={t('registration.gender')}
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
                        label={t('registration.preferredLanguage')}
                        options={LANGUAGE_OPTIONS}
                        error={errors.preferred_language?.message}
                      />
                    )}
                  />
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    leftIcon={<ArrowLeft size={18} />}
                    className="h-12 px-6"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    rightIcon={<ArrowRight size={18} />}
                    className="h-12 font-semibold"
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Additional Details */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {/* Optional badge */}
                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {t('common.optional')}
                  </span>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="village"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label={t('registration.village')}
                        placeholder={t('registration.villagePlaceholder')}
                        leftIcon={<MapPin size={18} />}
                        className="h-12"
                      />
                    )}
                  />
                  <Controller
                    name="district"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label={t('registration.district')}
                        placeholder={t('registration.districtPlaceholder')}
                        className="h-12"
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
                      label={t('registration.bloodGroup')}
                      options={bloodGroupOptions}
                      leftIcon={<Heart size={18} className="text-red-500" />}
                    />
                  )}
                />

                {/* Emergency Contact Section */}
                <div className="p-5 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-2xl border border-red-100/50">
                  <h3 className="text-sm font-bold text-red-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <Phone size={16} className="text-red-600" />
                    </div>
                    {t('registration.emergencyContact')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                      name="emergency_contact_name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label={t('registration.emergencyContactName')}
                          placeholder={t('registration.emergencyContactNamePlaceholder')}
                          className="bg-white/70 h-12"
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
                          label={t('registration.emergencyContactPhone')}
                          placeholder="9876543210"
                          error={errors.emergency_contact_phone?.message}
                          maxLength={PHONE_LENGTH}
                          onChange={handleEmergencyPhoneChange(field)}
                          className="bg-white/70 h-12"
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Accessibility Options */}
                <div className="p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-100/50">
                  <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Volume2 size={16} className="text-blue-600" />
                    </div>
                    {t('registration.accessibilityOptions')}
                  </h3>
                  <div className="space-y-2">
                    <Controller
                      name="is_literate"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-4 cursor-pointer p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 border border-transparent hover:border-blue-200">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="sr-only peer"
                            />
                            <div className="w-6 h-6 rounded-lg border-2 border-gray-300 peer-checked:border-primary-500 peer-checked:bg-primary-500 transition-all duration-200 flex items-center justify-center">
                              {field.value && (
                                <CheckCircle size={16} className="text-white" />
                              )}
                            </div>
                          </div>
                          <span className="text-gray-700 font-medium">
                            {t('registration.isLiterate')}
                          </span>
                        </label>
                      )}
                    />
                    <Controller
                      name="needs_voice_assistance"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-4 cursor-pointer p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-all duration-200 border border-transparent hover:border-blue-200">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="sr-only peer"
                            />
                            <div className="w-6 h-6 rounded-lg border-2 border-gray-300 peer-checked:border-primary-500 peer-checked:bg-primary-500 transition-all duration-200 flex items-center justify-center">
                              {field.value && (
                                <CheckCircle size={16} className="text-white" />
                              )}
                            </div>
                          </div>
                          <span className="text-gray-700 font-medium">
                            {t('registration.needsVoiceAssistance')}
                          </span>
                        </label>
                      )}
                    />
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    leftIcon={<ArrowLeft size={18} />}
                    className="h-12 px-6 order-2 sm:order-1"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    className="h-12 order-3 sm:order-2 text-gray-500"
                  >
                    {t('common.skipForNow')}
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    loading={isLoading}
                    rightIcon={<CheckCircle size={18} />}
                    className="shadow-lg shadow-primary-200/50 h-14 text-base font-semibold order-1 sm:order-3"
                  >
                    {t('registration.completeRegistration')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </Card>

      {/* Login Link */}
      <div className="mt-8 text-center">
        <p className="text-gray-600">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="text-primary-600 font-semibold hover:text-primary-700 hover:underline transition-colors"
          >
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PatientRegister;