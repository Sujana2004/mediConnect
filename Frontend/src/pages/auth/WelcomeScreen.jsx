import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { value: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
];

const FEATURES = [
  {
    icon: 'calendar',
    titleKey: 'welcome.feature1Title',
    titleDefault: 'Book Appointments',
    descKey: 'welcome.feature1Desc',
    descDefault: 'Schedule visits with doctors easily',
  },
  {
    icon: 'health',
    titleKey: 'welcome.feature2Title',
    titleDefault: 'Health Records',
    descKey: 'welcome.feature2Desc',
    descDefault: 'Store and access your medical history',
  },
  {
    icon: 'chat',
    titleKey: 'welcome.feature3Title',
    titleDefault: 'AI Health Assistant',
    descKey: 'welcome.feature3Desc',
    descDefault: 'Get instant health guidance',
  },
];

export default function WelcomeScreen({ onLogin, onCreateAccount, onLanguageSelect, onContactSupport }) {
  const { t, i18n } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const currentLanguage = LANGUAGES.find(l => l.value === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowLanguageModal(false);
    // Call external handler if provided
    onLanguageSelect?.(langCode);
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      // Default: open email or show contact info
      window.location.href = 'mailto:support@mediconnect.com';
    }
  };

  const renderFeatureIcon = (iconType) => {
    switch (iconType) {
      case 'calendar':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'health':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'chat':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Language Selector - Top Right */}
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={() => setShowLanguageModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
          aria-label={t('common.selectLanguage', 'Select language')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <span>{currentLanguage.nativeLabel}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-primary-400 animate-pulse opacity-20" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl">
            <svg 
              className="w-12 h-12 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>
        </div>

        {/* App Title */}
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          MediConnect
        </h1>
        <p className="text-lg text-gray-600 text-center mt-2">
          {t('welcome.title', 'Welcome to MediConnect')}
        </p>
        <p className="text-gray-500 text-center mt-1 max-w-sm">
          {t('welcome.subtitle', 'Your complete healthcare companion')}
        </p>

        {/* Features */}
        <div className="w-full max-w-sm mt-8 space-y-3">
          {FEATURES.map((feature, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                {renderFeatureIcon(feature.icon)}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {t(feature.titleKey, feature.titleDefault)}
                </p>
                <p className="text-gray-500 text-xs">
                  {t(feature.descKey, feature.descDefault)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm mt-8 space-y-3">
          <button
            type="button"
            onClick={onLogin}
            className="w-full py-4 px-4 rounded-xl bg-primary-600 text-white font-semibold text-base shadow-md hover:bg-primary-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            aria-label={t('authFlow.loginWithPhone', 'Login with Phone Number')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {t('authFlow.loginWithPhone', 'Login with Phone Number')}
          </button>
          
          <button
            type="button"
            onClick={onCreateAccount}
            className="w-full py-4 px-4 rounded-xl border-2 border-primary-600 text-primary-600 font-semibold text-base hover:bg-primary-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            aria-label={t('authFlow.createAccount', 'Create New Account')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t('authFlow.createAccount', 'Create New Account')}
          </button>
        </div>

        {/* Help Link */}
        <p className="text-center text-gray-500 text-sm mt-8">
          {t('welcome.needHelp', 'Need help?')}{' '}
          <button 
            type="button" 
            onClick={handleContactSupport}
            className="text-primary-600 font-medium hover:underline"
          >
            {t('welcome.contactSupport', 'Contact Support')}
          </button>
        </p>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 border-t border-gray-100">
        <p className="text-center text-gray-400 text-xs">
          {t('welcome.termsNote', 'By continuing, you agree to our')}{' '}
          <a href="/terms" className="underline hover:text-gray-600">
            {t('common.termsOfService', 'Terms of Service')}
          </a>{' '}
          {t('common.and', 'and')}{' '}
          <a href="/privacy" className="underline hover:text-gray-600">
            {t('common.privacyPolicy', 'Privacy Policy')}
          </a>
        </p>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-modal-title"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowLanguageModal(false)}
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 id="language-modal-title" className="text-lg font-semibold text-gray-900">
                {t('welcome.selectLanguage', 'Select Language')}
              </h2>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={t('common.close', 'Close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Language Options */}
            <div className="p-2">
              {LANGUAGES.map(({ value, label, nativeLabel }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleLanguageChange(value)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                    i18n.language === value 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
                      i18n.language === value ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      {nativeLabel.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{nativeLabel}</p>
                      <p className="text-sm text-gray-500">{label}</p>
                    </div>
                  </div>
                  {i18n.language === value && (
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Info */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                {t('welcome.languageNote', 'You can change the language anytime from settings')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slide up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}