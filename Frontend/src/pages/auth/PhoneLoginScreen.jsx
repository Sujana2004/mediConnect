import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const PHONE_REGEX = /^[6-9]\d{9}$/;

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'hi', label: 'हिंदी' },
];

export default function PhoneLoginScreen({ 
  onBack, 
  onSendOtp, 
  isRegisterFlow, 
  onSwitchToCreateAccount, 
  onSwitchToLogin 
}) {
  const { t, i18n } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const normalized = phone.replace(/\D/g, '');
  const valid = PHONE_REGEX.test(normalized);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
    // Clear error when user starts typing
    if (error) setError('');
  };

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
      console.error('OTP send error:', err);
      setError(t('authFlow.otpFailed', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleVoiceInput = useCallback(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError(t('authFlow.voiceNotSupported', 'Voice input is not supported in your browser'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'te' ? 'te-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Extract digits from spoken text
      const digits = transcript.replace(/\D/g, '').slice(0, 10);
      if (digits) {
        setPhone(digits);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError(t('authFlow.noSpeechDetected', 'No speech detected. Please try again.'));
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [i18n.language, t]);

  const currentLanguage = LANGUAGES.find(l => l.value === i18n.language) || LANGUAGES[0];

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          type="button" 
          onClick={onBack} 
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" 
          aria-label={t('common.back', 'Go back')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {isRegisterFlow 
            ? t('authFlow.createAccount', 'Create New Account') 
            : t('navbar.login', 'Login')}
        </h1>
        
        {/* Language Selector */}
        <div className="relative">
          <button 
            type="button" 
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('common.selectLanguage', 'Select language')}
            aria-expanded={showLanguageMenu}
          >
            <span>🌐</span>
            <span>{currentLanguage.label}</span>
            <svg className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showLanguageMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowLanguageMenu(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 mt-1 py-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {LANGUAGES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleLanguageChange(value)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      i18n.language === value ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* Welcome Text */}
        {isRegisterFlow ? (
          <div className="text-center mb-6">
            <p className="text-gray-900 font-medium text-lg">
              {t('authFlow.createAccountTitle', 'Create your account')}
            </p>
            <p className="text-gray-600 text-sm mt-2">
              {t('authFlow.createAccountSubtitle', "Enter your phone number. We'll send an OTP to verify.")}
            </p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <p className="text-gray-900 font-medium text-lg">
              {t('authFlow.welcomeBack', 'Welcome Back!')}
            </p>
            <p className="text-gray-600 text-sm mt-2">
              {t('authFlow.loginSubtitle', 'Login to continue your health journey')}
            </p>
          </div>
        )}

        {/* Phone Input Form */}
        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="phone-input" className="block text-sm font-medium text-gray-700">
            {t('authFlow.enterPhone', 'Enter your phone number')}
          </label>
          
          <div className="mt-2 flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
            {/* Country Code */}
            <span className="flex items-center px-4 bg-gray-50 text-gray-600 border-r border-gray-300 font-medium">
              +91
            </span>
            
            {/* Phone Input */}
            <input
              id="phone-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={phone}
              onChange={handlePhoneChange}
              placeholder="9876543210"
              className="flex-1 py-3 px-4 outline-none text-lg tracking-wide"
              disabled={loading}
            />
            
            {/* Valid Indicator */}
            {normalized.length === 10 && (
              <span className="flex items-center px-3">
                {valid ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            )}
            
            {/* Voice Input Button */}
            <button 
              type="button" 
              onClick={handleVoiceInput}
              disabled={loading || isListening}
              className={`px-3 transition-colors ${
                isListening 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-gray-400 hover:text-primary-600'
              }`}
              aria-label={t('authFlow.voiceInput', 'Voice input')}
              title={t('authFlow.voiceInputTitle', 'Speak your phone number')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Helper Text */}
          <p className="text-xs text-gray-500 mt-2">
            {t('authFlow.otpNote', "We'll send a 6-digit OTP to verify your number")}
          </p>
          
          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Listening Indicator */}
          {isListening && (
            <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-primary-700 text-sm flex items-center gap-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                </span>
                {t('authFlow.listening', 'Listening... Speak your phone number')}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!valid || loading}
            className="w-full mt-6 py-4 rounded-xl bg-primary-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('authFlow.sendingOtp', 'Sending OTP...')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {isRegisterFlow 
                  ? t('authFlow.sendOtpContinue', 'Send OTP & Continue') 
                  : t('authFlow.sendOtpLogin', 'Send OTP & Login')}
              </>
            )}
          </button>
        </form>

        {/* Switch Account Type */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          {isRegisterFlow ? (
            <>
              {t('authFlow.alreadyHaveAccount', 'Already have an account?')}{' '}
              <button 
                type="button" 
                onClick={() => onSwitchToLogin?.() || onBack()} 
                className="text-primary-600 font-medium hover:underline"
              >
                {t('authFlow.loginLink', 'Login')} →
              </button>
            </>
          ) : (
            <>
              {t('authFlow.noAccount', "Don't have an account?")}{' '}
              <button 
                type="button" 
                onClick={() => onSwitchToCreateAccount?.() || onBack()} 
                className="text-primary-600 font-medium hover:underline"
              >
                {t('authFlow.createAccountLink', 'Create New Account')} →
              </button>
            </>
          )}
        </p>
      </div>

      {/* Terms Footer */}
      <p className="text-xs text-gray-400 mt-6 text-center pb-2">
        {t('authFlow.termsAgreement', 'By continuing, you agree to our')}{' '}
        <a href="/terms" className="underline hover:text-gray-600" target="_blank" rel="noopener noreferrer">
          {t('authFlow.termsOfService', 'Terms of Service')}
        </a>{' '}
        {t('common.and', 'and')}{' '}
        <a href="/privacy" className="underline hover:text-gray-600" target="_blank" rel="noopener noreferrer">
          {t('authFlow.privacyPolicy', 'Privacy Policy')}
        </a>.
      </p>
    </div>
  );
}