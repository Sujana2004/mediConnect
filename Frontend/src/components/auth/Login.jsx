// src/components/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  Phone,
  Heart,
  AlertCircle,
  ArrowRight,
  Shield,
  Loader2,
  HelpCircle,
  User,
  Stethoscope,
  CheckCircle,
} from 'lucide-react';

const Login = ({ onSuccess, redirectPath }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sendOtp, isAuthenticated, user } = useAuth();

  // State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const homePath = user.role === 'doctor' ? '/doctor/home' : '/patient/home';
      navigate(homePath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Validate phone number
  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');

    if (!digits) {
      return t('login.phoneRequired', 'Phone number is required');
    }

    if (digits.length !== 10) {
      return t('login.phoneInvalidLength', 'Enter a valid 10-digit mobile number');
    }

    if (!/^[6-9]/.test(digits)) {
      return t('login.phoneInvalidStart', 'Mobile number must start with 6, 7, 8, or 9');
    }

    return '';
  };

  const validationError = touched ? validatePhone(phoneNumber) : '';
  const isValid = !validatePhone(phoneNumber);

  // Format phone number for display (XXX XXX XXXX)
  const formatPhoneDisplay = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    if (!isValid) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await sendOtp(phoneNumber.replace(/\s/g, ''));

      if (result.success) {
        // Navigate to OTP screen with phone number
        navigate('/verify-otp', {
          state: { phoneNumber: phoneNumber.replace(/\s/g, '') },
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || t('login.otpSendFailed', 'Failed to send OTP. Please try again.'));
      }
    } catch (err) {
      setError(t('login.genericError', 'Something went wrong. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login handler (development only)
  const handleDemoLogin = (phone) => {
    setPhoneNumber(formatPhoneDisplay(phone));
    setTouched(false);
    setError('');
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-3 rounded-full">
            <Heart className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('login.title', 'Welcome to MediConnect')}
        </h2>
        <p className="text-gray-600 text-sm mt-2">
          {t('login.subtitle', 'Enter your mobile number to continue')}
        </p>
      </div>

      {/* Demo Login Buttons (Development Only) */}
      {import.meta.env.DEV && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-3 text-center font-medium">
            🧪 Development Mode - Demo Numbers
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin('9876543210')}
              className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
            >
              <User className="h-4 w-4 inline mr-1" />
              Patient Demo
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('9876543211')}
              className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium transition-colors"
            >
              <Stethoscope className="h-4 w-4 inline mr-1" />
              Doctor Demo
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {/* Phone Input */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t('login.phoneLabel', 'Mobile Number')}
          </label>
          <div className="relative">
            {/* Country Code */}
            <div className="absolute inset-y-0 left-0 flex items-center">
              <div className="h-full flex items-center pl-3 pr-2 bg-gray-50 border-r border-gray-300 rounded-l-lg">
                <span className="text-gray-600 font-medium text-sm">🇮🇳 +91</span>
              </div>
            </div>

            {/* Phone Input */}
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              value={phoneNumber}
              onChange={handlePhoneChange}
              onBlur={() => setTouched(true)}
              placeholder="XXX XXX XXXX"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'phone-error' : 'phone-hint'}
              className={`
                block w-full pl-24 pr-12 py-3
                border rounded-lg shadow-sm
                text-base font-medium tracking-wide
                placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-offset-1
                transition-colors
                ${validationError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
            />

            {/* Phone Icon */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Phone
                className={`h-5 w-5 ${validationError ? 'text-red-400' : 'text-gray-400'}`}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <p id="phone-error" className="mt-2 text-sm text-red-600" role="alert">
              {validationError}
            </p>
          )}

          {/* Hint */}
          {!validationError && (
            <p id="phone-hint" className="mt-2 text-xs text-gray-500">
              {t('login.phoneHint', 'We will send you a 6-digit OTP for verification')}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className={`
              w-full flex items-center justify-center gap-2
              py-3 px-4 border border-transparent rounded-lg shadow-sm
              text-sm font-medium text-white
              bg-gradient-to-r from-blue-600 to-teal-600
              hover:from-blue-700 hover:to-teal-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-all
              ${(isLoading || !isValid) ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {t('login.sendingOtp', 'Sending OTP...')}
              </>
            ) : (
              <>
                {t('login.continue', 'Continue')}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        {/* reCAPTCHA Container (invisible) */}
        <div id="recaptcha-container"></div>

        {/* Government Badge */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="flex items-center justify-center">
            <Shield className="h-4 w-4 text-blue-600 mr-2" aria-hidden="true" />
            <p className="text-xs text-blue-800">
              {t('login.governmentVerified', 'Government Verified Healthcare Platform')}
            </p>
          </div>
        </div>
      </form>

      {/* Terms */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          {t('login.termsText', 'By continuing, you agree to our')}{' '}
          <Link to="/terms" className="text-blue-600 hover:underline">
            {t('login.termsLink', 'Terms of Service')}
          </Link>{' '}
          {t('login.and', 'and')}{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            {t('login.privacyLink', 'Privacy Policy')}
          </Link>
        </p>
      </div>

      {/* Quick Links */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <Link
            to="/emergency"
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            🚨 {t('login.emergencyAccess', 'Emergency')}
          </Link>
          <Link
            to="/find-doctors"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            🔍 {t('login.findDoctor', 'Find Doctor')}
          </Link>
        </div>
      </div>

      {/* Security Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('login.secureLogin', 'Secure Login')}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t('login.securityInfo', 'Your data is protected with 256-bit encryption and never shared with third parties.')}
            </p>
          </div>
        </div>
      </div>

      {/* Help Link */}
      <div className="mt-4 text-center">
        <Link
          to="/help"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {t('login.needHelp', 'Need help logging in?')}
        </Link>
      </div>
    </div>
  );
};

export default Login;