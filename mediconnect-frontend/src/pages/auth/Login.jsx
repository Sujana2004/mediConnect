// src/pages/auth/Login.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Phone,
  Shield,
  ArrowRight,
  Stethoscope,
  Users,
  Heart,
  Activity,
  Sparkles,
  ChevronLeft,
  Globe
} from 'lucide-react';
import {
  Button,
  PhoneInput,
  OTPInput,
  LanguageSwitcher
} from '../../components/common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

/**
 * Constants
 */
const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 30;

/**
 * Step types
 */
const STEPS = {
  PHONE: 'phone',
  OTP: 'otp'
};

/**
 * Login page with Firebase phone authentication
 * Supports OTP verification and user type detection
 * Features split-screen layout on desktop, stacked on mobile
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const {
    sendPhoneOTP,
    verifyPhoneOTP,
    isLoading,
    error,
    clearError,
    isAuthenticated,
    redirectToDashboard
  } = useAuth();

  // Form state
  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  // OTP resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      redirectToDashboard();
    }
  }, [isAuthenticated, redirectToDashboard]);

  // Clear errors when changing steps
  useEffect(() => {
    clearError();
    setPhoneError('');
    setOtpError('');
  }, [step, clearError]);

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

  // Validate phone number
  const validatePhone = useCallback((phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!cleaned) return t('auth.phoneRequired');
    if (cleaned.length !== 10) return t('auth.invalidPhone');
    if (!/^[6-9]/.test(cleaned)) return t('auth.invalidPhone');
    return '';
  }, [t]);

  // Handle phone submission
  const handleSendOTP = useCallback(async (e) => {
    e.preventDefault();

    // Validate phone
    const validationError = validatePhone(phone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    setPhoneError('');

    const result = await sendPhoneOTP(phone);

    if (result.success) {
      setStep(STEPS.OTP);
      setResendTimer(RESEND_TIMER_SECONDS);
      setCanResend(false);
      toast.success(t('auth.otpSent', { phone: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` }));
    } else {
      setPhoneError(result.error || t('errors.otpSendFailed'));
    }
  }, [phone, validatePhone, sendPhoneOTP, t]);

  // Handle OTP verification
  const handleVerifyOTP = useCallback(async (otpValue) => {
    const otpToVerify = otpValue || otp;

    if (!otpToVerify || otpToVerify.length !== OTP_LENGTH) {
      setOtpError(t('auth.invalidOTP'));
      return;
    }

    setOtpError('');

    const result = await verifyPhoneOTP(otpToVerify);

    if (result.success) {
      toast.success(t('auth.loginSuccess'));

      // Get redirect path from location state or default to dashboard
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else {
        redirectToDashboard();
      }
    } else {
      // Check if user needs to register
      const errorLower = result.error?.toLowerCase() || '';
      if (errorLower.includes('not found') || errorLower.includes('not registered')) {
        toast.error(t('auth.userNotFound'));
        navigate('/register', {
          state: { phone, fromLogin: true }
        });
      } else {
        setOtpError(result.error || t('auth.invalidOTP'));
      }
    }
  }, [otp, verifyPhoneOTP, t, location.state, navigate, redirectToDashboard, phone]);

  // Handle OTP input complete
  const handleOTPComplete = useCallback((otpValue) => {
    setOtp(otpValue);
    handleVerifyOTP(otpValue);
  }, [handleVerifyOTP]);

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
      toast.error(result.error || t('errors.otpSendFailed'));
    }
  }, [canResend, phone, sendPhoneOTP, t]);

  // Handle back to phone step
  const handleBackToPhone = useCallback(() => {
    setStep(STEPS.PHONE);
    setOtp('');
    setOtpError('');
    setResendTimer(0);
    setCanResend(false);
  }, []);

  // Handle phone change
  const handlePhoneChange = useCallback((e) => {
    setPhone(e.target.value);
    if (phoneError) setPhoneError('');
  }, [phoneError]);

  // Handle verify button click
  const handleVerifyButtonClick = useCallback(() => {
    handleVerifyOTP(otp);
  }, [handleVerifyOTP, otp]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 lg:bg-white">

      {/* ══════════════════════════════════════════════════════════
          Left Panel - Branding (hidden on mobile, shown on lg+)
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] 2xl:w-[55%] relative overflow-hidden flex-shrink-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600" />

        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-20 right-20 w-96 h-96 bg-fuchsia-400/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-300/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '2s' }}
          />
          <div
            className="absolute top-1/4 right-1/4 w-48 h-48 bg-pink-300/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '3s' }}
          />
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
            {/* AI badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <Sparkles size={14} className="text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">AI-Powered Healthcare</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-[1.15] mb-5">
              Your Health,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200">
                Simplified
              </span>
            </h1>

            {/* Description */}
            <p className="text-base xl:text-lg text-white/60 leading-relaxed mb-10">
              Connect with top doctors, track your health records, and get AI-powered symptom analysis — all in one place.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: Activity, text: 'Smart Diagnosis' },
                { icon: Heart, text: 'Health Tracking' },
                { icon: Users, text: 'Expert Doctors' },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 cursor-default"
                >
                  <Icon size={15} className="text-white/70" />
                  <span className="text-white/80 text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges + copyright */}
          <div className="space-y-4">
            <div className="flex items-center gap-5 text-white/40 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <Shield size={14} />
                <span>HIPAA Compliant</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Activity size={14} />
                <span>10K+ Users</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Globe size={14} />
                <span>Multi-language</span>
              </div>
            </div>
            <p className="text-white/25 text-[11px]">
              © {new Date().getFullYear()} {t('common.appName')}. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Right Panel - Login Form
          ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">

        {/* ── Mobile top header ── */}
        <div className="lg:hidden relative overflow-hidden flex-shrink-0">
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          />
          {/* Floating orb on mobile */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-12">
            {/* Language switcher on mobile */}
            <div className="absolute top-4 right-4">
              <LanguageSwitcher variant="dropdown" size="sm" />
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg mb-4">
                <Stethoscope size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {t('common.appName')}
              </h2>
              <p className="text-white/60 text-sm mt-1.5 font-medium">
                {t('common.tagline') || 'AI-Powered Healthcare Platform'}
              </p>

              {/* Mobile feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {[
                  { icon: Activity, text: 'Smart' },
                  { icon: Heart, text: 'Secure' },
                  { icon: Shield, text: 'Trusted' },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10"
                  >
                    <Icon size={12} className="text-white/70" />
                    <span className="text-white/80 text-[11px] font-semibold">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Curved bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-50 rounded-t-[2rem]" />
        </div>

        {/* ── Desktop language switcher ── */}
        <div className="hidden lg:flex items-center justify-end px-8 pt-6">
          <LanguageSwitcher variant="dropdown" size="sm" />
        </div>

        {/* ── Form area ── */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-6 sm:py-8 lg:py-0">
          <div className="w-full max-w-[420px]">

            {/* Step progress indicator */}
            <div className="flex items-center gap-2.5 mb-7">
              <div className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                step === STEPS.PHONE
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                  : 'bg-violet-200'
              }`} />
              <div className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                step === STEPS.OTP
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                  : 'bg-gray-200'
              }`} />
            </div>

            {/* Header section */}
            <div className="mb-7">
              {/* Back button for OTP step */}
              {step === STEPS.OTP && (
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-semibold mb-4 group transition-colors"
                >
                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                  {t('common.back') || 'Back'}
                </button>
              )}

              {/* Step icon */}
              <div className={`
                inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mb-4
                transition-colors duration-300
                ${step === STEPS.PHONE
                  ? 'bg-gradient-to-br from-violet-100 to-purple-50'
                  : 'bg-gradient-to-br from-emerald-100 to-green-50'
                }
              `}>
                {step === STEPS.PHONE ? (
                  <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-violet-600" />
                ) : (
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                )}
              </div>

              {/* Title and subtitle */}
              <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-gray-900 tracking-tight leading-tight">
                {step === STEPS.PHONE ? t('auth.welcomeBack') : t('auth.verifyOTP')}
              </h1>
              <p className="text-gray-400 mt-1.5 text-sm sm:text-[15px] leading-relaxed">
                {step === STEPS.PHONE
                  ? t('auth.loginSubtitle')
                  : t('auth.otpSubtitle', { phone: `+91 ${phone}` })
                }
              </p>
            </div>

            {/* ── Login Card ── */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-violet-100/30 border border-gray-100/80 p-5 sm:p-7">

              {/* Phone Input Step */}
              {step === STEPS.PHONE && (
                <form onSubmit={handleSendOTP} className="space-y-5">
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
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={isLoading}
                    rightIcon={<ArrowRight size={18} />}
                    className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 sm:!py-4 !text-sm sm:!text-base !font-bold active:!scale-[0.98] !transition-all !duration-200"
                  >
                    {t('auth.sendOTP')}
                  </Button>

                  {/* reCAPTCHA container */}
                  <div id="recaptcha-container" />
                </form>
              )}

              {/* OTP Verification Step */}
              {step === STEPS.OTP && (
                <div className="space-y-5">
                  {/* Phone display with edit option */}
                  <div className="flex items-center justify-between p-3 sm:p-3.5 bg-gradient-to-r from-violet-50/80 to-purple-50/80 rounded-xl sm:rounded-2xl border border-violet-100/80">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        <Phone size={16} className="text-violet-600 sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-violet-500 font-medium">{t('auth.phoneNumber')}</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">+91 {phone}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToPhone}
                      className="!text-violet-600 hover:!bg-violet-100 !rounded-lg sm:!rounded-xl !font-semibold !text-xs sm:!text-sm !px-2.5 sm:!px-3 flex-shrink-0"
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
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerifyButtonClick}
                    fullWidth
                    size="lg"
                    loading={isLoading}
                    disabled={otp.length !== OTP_LENGTH}
                    className="!bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/20 !rounded-xl sm:!rounded-2xl !py-3.5 sm:!py-4 !text-sm sm:!text-base !font-bold disabled:!opacity-40 disabled:!shadow-none active:!scale-[0.98] !transition-all !duration-200"
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

                  {/* reCAPTCHA container for resend */}
                  <div id="recaptcha-container" />
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 my-6 sm:my-7">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">
                {t('auth.dontHaveAccount')}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Register Options ── */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/register/patient" className="group">
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-gray-100 hover:border-violet-200 bg-white hover:bg-violet-50/30 p-3.5 sm:p-5 text-center transition-all duration-300 hover:shadow-lg hover:shadow-violet-100/40 hover:-translate-y-0.5 active:scale-[0.98]">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Users size={20} className="text-emerald-600 sm:w-[22px] sm:h-[22px]" />
                  </div>
                  <p className="font-bold text-gray-900 text-xs sm:text-sm">{t('auth.patient')}</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 leading-relaxed">
                    {t('auth.registerAsPatient')}
                  </p>
                </div>
              </Link>

              <Link to="/register/doctor" className="group">
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-gray-100 hover:border-violet-200 bg-white hover:bg-violet-50/30 p-3.5 sm:p-5 text-center transition-all duration-300 hover:shadow-lg hover:shadow-violet-100/40 hover:-translate-y-0.5 active:scale-[0.98]">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Stethoscope size={20} className="text-violet-600 sm:w-[22px] sm:h-[22px]" />
                  </div>
                  <p className="font-bold text-gray-900 text-xs sm:text-sm">{t('auth.doctor')}</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 leading-relaxed">
                    {t('auth.registerAsDoctor')}
                  </p>
                </div>
              </Link>
            </div>

            {/* ── Already have account link ── */}
            <div className="mt-5 sm:mt-6 text-center">
              <p className="text-gray-400 text-xs sm:text-sm">
                {t('auth.dontHaveAccount')}{' '}
                <Link
                  to="/register"
                  className="text-violet-600 font-bold hover:text-violet-700 hover:underline transition-all"
                >
                  {t('auth.register')}
                </Link>
              </p>
            </div>

            {/* Terms */}
            <p className="mt-6 sm:mt-8 text-center text-[10px] sm:text-[11px] text-gray-300 leading-relaxed px-2">
              {t('auth.agreeToTerms')}{' '}
              <Link to="/terms" className="text-violet-400 hover:text-violet-500 hover:underline font-medium">
                {t('auth.termsOfService')}
              </Link>{' '}
              {t('common.and')}{' '}
              <Link to="/privacy" className="text-violet-400 hover:text-violet-500 hover:underline font-medium">
                {t('auth.privacyPolicy')}
              </Link>
            </p>

            {/* Mobile footer copyright */}
            <p className="lg:hidden mt-6 text-center text-[10px] text-gray-300">
              © {new Date().getFullYear()} {t('common.appName')}. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Login;