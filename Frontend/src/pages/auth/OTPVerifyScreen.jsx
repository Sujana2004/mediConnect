// src/pages/auth/OTPVerifyScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit2,
  Clock,
  Smartphone,
} from 'lucide-react';

// Constants
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds
const OTP_VALIDITY = 5; // minutes

const OTPVerifyScreen = ({
  phone,
  onBack,
  onChangePhone,
  onVerify,
  onResend,
  isLoading: parentLoading = false,
  error: parentError = '',
}) => {
  const { t, i18n } = useTranslation();

  // State
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [success, setSuccess] = useState(false);

  // Refs
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  // Computed
  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH && !digits.includes('');
  const isLoading = isVerifying || parentLoading;

  // Start resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resendTimer]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Clear error when digits change
  useEffect(() => {
    if (error || parentError) {
      setError('');
    }
  }, [digits]);

  // Auto-submit when complete (optional)
  useEffect(() => {
    if (isComplete && !isLoading && !error && !parentError) {
      // Optional: Auto-submit after a short delay
      // const timer = setTimeout(() => handleSubmit(), 500);
      // return () => clearTimeout(timer);
    }
  }, [isComplete, isLoading, error, parentError]);

  // Haptic feedback
  const triggerHaptic = useCallback((type = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        success: [10, 50, 10],
        error: [50, 50, 50],
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }, []);

  // Handle input change
  const handleChange = useCallback((index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Move to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      triggerHaptic('light');
    }
  }, [digits, triggerHaptic]);

  // Handle key down
  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input if current is empty
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  // Handle paste
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);

    if (pastedData) {
      const newDigits = pastedData.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
      setDigits(newDigits);
      triggerHaptic('medium');

      // Focus appropriate input
      const lastFilledIndex = Math.min(pastedData.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  }, [triggerHaptic]);

  // Handle submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isComplete || isLoading) return;

    setError('');
    setIsVerifying(true);
    triggerHaptic('medium');

    try {
      // Note: onVerify should only take OTP, phone is already stored in context
      const result = await onVerify(otp);

      if (result?.success) {
        setSuccess(true);
        triggerHaptic('success');
        // Navigation is handled by parent/AuthContext
      } else {
        setError(result?.error || t('otp.invalidOtp', 'Invalid OTP. Please try again.'));
        triggerHaptic('error');
        // Clear OTP on error
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err.message || t('otp.verificationFailed', 'Verification failed. Please try again.'));
      triggerHaptic('error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle resend
  const handleResend = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setError('');
    triggerHaptic('medium');

    try {
      const result = await onResend();

      if (result?.success) {
        // Reset timer
        setResendTimer(RESEND_COOLDOWN);
        setCanResend(false);
        // Clear current OTP
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setError(result?.error || t('otp.resendFailed', 'Failed to resend OTP.'));
      }
    } catch (err) {
      setError(err.message || t('otp.resendFailed', 'Failed to resend OTP.'));
    } finally {
      setIsResending(false);
    }
  };

  // Format phone for display
  const formatPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (digits.startsWith('91') && digits.length === 12) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return phoneNumber;
  };

  // Check if development mode
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={t('common.back', 'Back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {t('otp.title', 'Verify OTP')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('otp.titleLocal', 'OTP ధృవీకరించండి')}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-green-600">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">{t('common.secure', 'Secure')}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
        {/* Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-blue-600" />
          </div>
          {success && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 text-center">
          {t('otp.enterCode', 'Enter Verification Code')}
        </h2>
        <p className="text-sm text-gray-500 text-center mt-1">
          {t('otp.enterCodeLocal', 'ధృవీకరణ కోడ్ నమోదు చేయండి')}
        </p>

        {/* Phone Display */}
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            {t('otp.sentTo', "We've sent a 6-digit OTP to")}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="font-semibold text-gray-900 text-lg">
              {formatPhone(phone)}
            </p>
            <button
              type="button"
              onClick={onChangePhone}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              aria-label={t('otp.changePhone', 'Change phone number')}
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* OTP Input */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-8">
          <div 
            className="flex justify-center gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading || success}
                aria-label={`${t('otp.digit', 'Digit')} ${index + 1}`}
                className={`
                  w-11 h-14 sm:w-12 sm:h-14
                  text-center text-xl font-bold
                  border-2 rounded-xl
                  outline-none transition-all duration-200
                  ${digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  ${(error || parentError) ? 'border-red-400 bg-red-50' : ''}
                  ${success ? 'border-green-500 bg-green-50' : ''}
                  ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                `}
              />
            ))}
          </div>

          {/* Error Message */}
          {(error || parentError) && (
            <div className="flex items-center justify-center gap-2 mt-4 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error || parentError}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center justify-center gap-2 mt-4 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm font-medium">{t('otp.verified', 'OTP verified successfully!')}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isComplete || isLoading || success}
            className={`
              w-full mt-6 py-4 rounded-xl font-semibold
              flex items-center justify-center gap-2
              transition-all duration-200
              ${isComplete && !isLoading && !success
                ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700 shadow-lg'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('otp.verifying', 'Verifying...')}
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-5 w-5" />
                {t('otp.verified', 'Verified!')}
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                {t('otp.verifyAndContinue', 'Verify & Continue')}
              </>
            )}
          </button>
        </form>

        {/* Resend Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {t('otp.didntReceive', "Didn't receive the OTP?")}
          </p>

          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="mt-2 flex items-center justify-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700 disabled:opacity-50 mx-auto"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('otp.sending', 'Sending...')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t('otp.resendOtp', 'Resend OTP')}
                </>
              )}
            </button>
          ) : (
            <p className="mt-2 text-gray-500 text-sm flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {t('otp.resendIn', 'Resend OTP in')} 
              <span className="font-mono font-semibold text-gray-700">{resendTimer}s</span>
            </p>
          )}
        </div>

        {/* Development Test OTP Hint */}
        {isDevelopment && (
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl max-w-xs">
            <p className="text-amber-800 text-xs text-center">
              🧪 <strong>{t('otp.devMode', 'Development Mode')}</strong>
              <br />
              {t('otp.testOtpHint', 'Use OTP:')} <code className="font-bold">123456</code>
            </p>
          </div>
        )}

        {/* Change Phone Link */}
        <button
          type="button"
          onClick={onChangePhone}
          className="mt-4 flex items-center gap-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          <Edit2 className="h-4 w-4" />
          {t('otp.changePhoneNumber', 'Change Phone Number')}
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {t('otp.validFor', 'OTP is valid for {{minutes}} minutes', { minutes: OTP_VALIDITY })}
        </p>
      </div>

      {/* Help Section */}
      <div className="px-6 pb-4 bg-gray-50">
        <details className="text-center">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-blue-600">
            {t('otp.needHelp', 'Need help?')}
          </summary>
          <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-600 text-left">
            <ul className="space-y-1">
              <li>• {t('otp.help1', 'Check if the phone number is correct')}</li>
              <li>• {t('otp.help2', 'Make sure you have network connectivity')}</li>
              <li>• {t('otp.help3', 'Check SMS inbox and spam folder')}</li>
              <li>• {t('otp.help4', 'Wait for timer and try resending')}</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};

export default OTPVerifyScreen;