import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PHONE_REGEX = /^[6-9]\d{9}$/;

export default function PhoneLoginScreen({ onBack, onSendOtp, isRegisterFlow, onSwitchToCreateAccount, onSwitchToLogin }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalized = phone.replace(/\D/g, '');
  const valid = PHONE_REGEX.test(normalized);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!valid) {
      setError(t('authFlow.phoneInvalid', 'Please enter a valid 10-digit mobile number'));
      return;
    }
    setLoading(true);
    try {
      const result = await onSendOtp(`+91${normalized}`);
      if (result?.success) return;
      setError(result?.error || t('authFlow.otpFailed', 'Failed to send OTP. Please try again.'));
    } catch (err) {
      setError(t('authFlow.otpFailed', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={onBack} className="p-2 -ml-2 text-gray-600" aria-label="Back">
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {isRegisterFlow ? t('authFlow.createAccount', 'Create New Account') : t('navbar.login', 'Login')}
        </h1>
        <button type="button" className="text-sm text-gray-500">🌐 తెలుగు ▼</button>
      </div>

      <div className="flex-1">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center text-3xl">🏥</div>
        </div>
        {isRegisterFlow ? (
          <>
            <p className="text-center text-gray-900 font-medium">Create your account</p>
            <p className="text-center text-sm text-gray-500 mt-1">కొత్త ఖాతా సృష్టించండి</p>
            <p className="text-center text-gray-600 text-sm mt-4">Enter your phone number. We&apos;ll send an OTP to verify.</p>
          </>
        ) : (
          <>
            <p className="text-center text-gray-900 font-medium">Welcome Back!</p>
            <p className="text-center text-sm text-gray-500 mt-1">మళ్లీ స్వాగతం!</p>
            <p className="text-center text-gray-600 text-sm mt-4">Login to continue your health journey</p>
          </>
        )}

        <form onSubmit={handleSubmit} className="mt-8">
          <label className="block text-sm font-medium text-gray-700 mt-4">
            {t('authFlow.enterPhone', 'Enter your phone number')}
          </label>
          <p className="text-xs text-gray-500">మీ ఫోన్ నంబర్ నమోదు చేయండి</p>
          <div className="mt-2 flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
            <span className="flex items-center px-4 bg-gray-50 text-gray-600 border-r">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              className="flex-1 py-3 px-4 outline-none text-lg"
            />
            <button type="button" className="px-3 text-gray-400" aria-label="Voice input">🎤</button>
          </div>
          <p className="text-xs text-gray-500 mt-1"> (We'll send an OTP to verify)</p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={!valid || loading}
            className="w-full mt-6 py-4 rounded-xl bg-primary-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : isRegisterFlow ? '🔐 Send OTP & Continue' : '🔐 Send OTP & Login'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 text-sm">
          {isRegisterFlow ? (
            <>Already have an account? <button type="button" onClick={() => onSwitchToLogin?.() || onBack()} className="text-primary-600 font-medium">Login →</button></>
          ) : (
            <>Don&apos;t have an account? <button type="button" onClick={() => onSwitchToCreateAccount?.() || onBack()} className="text-primary-600 font-medium">Create New Account →</button></>
          )}
        </p>
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center pb-2">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
