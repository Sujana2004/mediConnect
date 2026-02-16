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
  IndianRupee
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
  { value: 'pulmonology', label: 'Pulmonology' },
  { value: 'gastroenterology', label: 'Gastroenterology' },
  { value: 'urology', label: 'Urology' },
  { value: 'nephrology', label: 'Nephrology' },
  { value: 'endocrinology', label: 'Endocrinology' },
  { value: 'oncology', label: 'Oncology' },
  { value: 'rheumatology', label: 'Rheumatology' },
  { value: 'ayurveda', label: 'Ayurveda' },
  { value: 'homeopathy', label: 'Homeopathy' }
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

  // Handle verify OTP
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
    if (data.last_name?.trim()) {
      doctorData.last_name = data.last_name.trim();
    }

    if (data.email?.trim()) {
      doctorData.email = data.email.trim();
    }

    if (data.date_of_birth) {
      doctorData.date_of_birth = data.date_of_birth;
    }

    if (data.gender && data.gender !== '') {
      doctorData.gender = data.gender;
    }

    if (data.hospital_name?.trim()) {
      doctorData.hospital_name = data.hospital_name.trim();
    }

    if (data.hospital_address?.trim()) {
      doctorData.hospital_address = data.hospital_address.trim();
    }

    if (data.consultation_fee && data.consultation_fee > 0) {
      doctorData.consultation_fee = data.consultation_fee;
    }

    if (data.bio?.trim()) {
      doctorData.bio = data.bio.trim();
    }

    logger.log('Submitting doctor data:', doctorData);

    const result = await registerNewDoctor(otp, doctorData);

    if (result.success) {
      toast.success(t('registration.registrationSuccess'));
      toast.success(t('registration.pendingVerification'), {
        duration: 5000
      });
      navigate('/doctor/home', { replace: true });
    } else {
      toast.error(result.error || t('errors.somethingWrong'));

      // If OTP/token error, go back to step 1
      const errorLower = result.error?.toLowerCase() || '';
      if (
        errorLower.includes('otp') ||
        errorLower.includes('token') ||
        errorLower.includes('firebase') ||
        errorLower.includes('expired')
      ) {
        setCurrentStep(1);
        setOtpSent(false);
        setOtp('');
      }
    }
  }, [selectedLanguages, otp, registerNewDoctor, navigate, t]);

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
        // Don't allow removing all languages
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
      case 1:
        return t('auth.verifyPhoneSubtitle');
      case 2:
        return t('registration.basicInfoSubtitle');
      case 3:
        return t('registration.professionalInfoSubtitle');
      case 4:
        return t('registration.practiceDetailsSubtitle');
      default:
        return '';
    }
  }, [currentStep, t]);

  // Step indicator component
  const StepIndicator = useMemo(() => {
    return (
      <div className="flex items-center justify-center mb-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-colors duration-200
                ${currentStep >= step
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {currentStep > step ? (
                <CheckCircle size={16} />
              ) : (
                step
              )}
            </div>
            {step < TOTAL_STEPS && (
              <div
                className={`
                  w-8 h-1 mx-1
                  ${currentStep > step ? 'bg-primary-600' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        ))}
      </div>
    );
  }, [currentStep]);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
          <Stethoscope className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('registration.doctorRegistration')}
        </h1>
        <p className="text-gray-600 mt-2">
          {getStepSubtitle()}
        </p>
      </div>

      {/* Step Indicator */}
      {StepIndicator}

      {/* Form Card */}
      <Card className="shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Phone Verification */}
          {currentStep === 1 && (
            <div className="space-y-6">
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
                  >
                    {t('auth.sendOTP')}
                  </Button>
                </>
              ) : (
                <>
                  {/* Phone display */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <Phone size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('auth.phoneNumber')}</p>
                        <p className="font-medium text-gray-900">+91 {phone}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handlePhoneEdit}
                    >
                      {t('common.edit')}
                    </Button>
                  </div>

                  {/* OTP Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
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
                  >
                    {t('auth.verifyOTP')}
                  </Button>

                  {/* Resend OTP */}
                  <div className="text-center">
                    {canResend ? (
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleResendOTP}
                        disabled={isLoading}
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

              {/* reCAPTCHA container */}
              <div id="recaptcha-container" />
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
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
                      leftIcon={<User size={18} />}
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
                    leftIcon={<Mail size={18} />}
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

              {/* Navigation */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  leftIcon={<ArrowLeft size={18} />}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  fullWidth
                  onClick={handleNextStep}
                  rightIcon={<ArrowRight size={18} />}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Professional Information */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <Shield size={16} />
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
                    leftIcon={<FileText size={18} />}
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
                    leftIcon={<Award size={18} />}
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
                  leftIcon={<ArrowLeft size={18} />}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  fullWidth
                  onClick={handleNextStep}
                  rightIcon={<ArrowRight size={18} />}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Practice Details */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <Controller
                name="hospital_name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('registration.hospitalName')}
                    placeholder={t('registration.hospitalNamePlaceholder')}
                    leftIcon={<Building size={18} />}
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
                    leftIcon={<IndianRupee size={18} />}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('registration.languagesSpoken')} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPOKEN_LANGUAGES_LIST.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => toggleLanguage(lang.value)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${selectedLanguages.includes(lang.value)
                          ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                          : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                        }
                      `}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('registration.selectAtLeastOne')}
                </p>
              </div>

              <Controller
                name="bio"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('registration.bio')}
                    </label>
                    <textarea
                      {...field}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      placeholder={t('registration.bioPlaceholder')}
                      maxLength={BIO_MAX_LENGTH}
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {field.value?.length || 0}/{BIO_MAX_LENGTH}
                    </p>
                  </div>
                )}
              />

              {/* Navigation */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  leftIcon={<ArrowLeft size={18} />}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  loading={isLoading}
                  rightIcon={<CheckCircle size={18} />}
                >
                  {t('registration.completeRegistration')}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Login Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="text-primary-600 font-semibold hover:text-primary-700 hover:underline"
          >
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DoctorRegister;