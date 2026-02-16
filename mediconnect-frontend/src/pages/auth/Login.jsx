// src/pages/auth/Login.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Phone,
  Shield,
  ArrowRight,
  Stethoscope,
  Users
} from 'lucide-react';
import {
  Button,
  PhoneInput,
  OTPInput,
  Card
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
    if (!cleaned) {
      return t('auth.phoneRequired');
    }
    if (cleaned.length !== 10) {
      return t('auth.invalidPhone');
    }
    if (!/^[6-9]/.test(cleaned)) {
      return t('auth.invalidPhone');
    }
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
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
          {step === STEPS.PHONE ? (
            <Phone className="w-8 h-8 text-primary-600" />
          ) : (
            <Shield className="w-8 h-8 text-primary-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {step === STEPS.PHONE ? t('auth.welcomeBack') : t('auth.verifyOTP')}
        </h1>
        <p className="text-gray-600 mt-2">
          {step === STEPS.PHONE
            ? t('auth.loginSubtitle')
            : t('auth.otpSubtitle', { phone: `+91 ${phone}` })
          }
        </p>
      </div>

      {/* Login Card */}
      <Card className="shadow-lg">
        {/* Phone Input Step */}
        {step === STEPS.PHONE && (
          <form onSubmit={handleSendOTP} className="space-y-6">
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
            >
              {t('auth.sendOTP')}
            </Button>

            {/* reCAPTCHA container */}
            <div id="recaptcha-container" />
          </form>
        )}

        {/* OTP Verification Step */}
        {step === STEPS.OTP && (
          <div className="space-y-6">
            {/* Phone display with edit option */}
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
                variant="ghost"
                size="sm"
                onClick={handleBackToPhone}
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
            >
              {t('auth.verifyOTP')}
            </Button>

            {/* Resend OTP */}
            <div className="text-center">
              {canResend ? (
                <Button
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

            {/* reCAPTCHA container for resend */}
            <div id="recaptcha-container" />
          </div>
        )}
      </Card>

      {/* Register Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {t('auth.dontHaveAccount')}{' '}
          <Link
            to="/register"
            className="text-primary-600 font-semibold hover:text-primary-700 hover:underline"
          >
            {t('auth.register')}
          </Link>
        </p>
      </div>

      {/* Register Options */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Link to="/register/patient">
          <Card
            hover
            className="text-center p-4 h-full"
            padding="none"
          >
            <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-2">
              <Users size={24} className="text-secondary-600" />
            </div>
            <p className="font-medium text-gray-900">{t('auth.patient')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('auth.registerAsPatient')}
            </p>
          </Card>
        </Link>

        <Link to="/register/doctor">
          <Card
            hover
            className="text-center p-4 h-full"
            padding="none"
          >
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
              <Stethoscope size={24} className="text-primary-600" />
            </div>
            <p className="font-medium text-gray-900">{t('auth.doctor')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('auth.registerAsDoctor')}
            </p>
          </Card>
        </Link>
      </div>

      {/* Terms */}
      <p className="mt-8 text-center text-xs text-gray-500">
        {t('auth.agreeToTerms')}{' '}
        <Link to="/terms" className="text-primary-600 hover:underline">
          {t('auth.termsOfService')}
        </Link>{' '}
        {t('common.and')}{' '}
        <Link to="/privacy" className="text-primary-600 hover:underline">
          {t('auth.privacyPolicy')}
        </Link>
      </p>
    </div>
  );
};

export default Login;