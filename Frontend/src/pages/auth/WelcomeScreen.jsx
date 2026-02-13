import React from 'react';
import { useTranslation } from 'react-i18next';

export default function WelcomeScreen({ onLogin, onCreateAccount, onLanguageSelect }) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg mb-6">
          <span className="text-5xl">🏥</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center">MediConnect</h1>
        <p className="text-lg text-gray-600 text-center mt-2">Welcome to MediConnect</p>
        <p className="text-sm text-gray-500 text-center mt-1">మెడికనెక్ట్‌కు స్వాగతం</p>
        <p className="text-gray-600 text-center mt-4 max-w-sm">Your complete healthcare companion</p>
        <p className="text-sm text-gray-500 mt-1">మీ పూర్తి ఆరోగ్య సంరక్షణ సహచరుడు</p>

        <div className="w-full max-w-sm mt-10 space-y-4">
          <button
            type="button"
            onClick={onLogin}
            className="w-full py-4 px-4 rounded-xl bg-primary-600 text-white font-semibold text-base shadow-md hover:bg-primary-700 active:scale-[0.98]"
          >
            📱 {t('authFlow.loginWithPhone', 'Login with Phone Number')}
          </button>
          <button
            type="button"
            onClick={onCreateAccount}
            className="w-full py-4 px-4 rounded-xl border-2 border-primary-600 text-primary-600 font-semibold text-base hover:bg-primary-50 active:scale-[0.98]"
          >
            ➕ {t('authFlow.createAccount', 'Create New Account')}
          </button>
        </div>

        <button
          type="button"
          onClick={onLanguageSelect}
          className="mt-8 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm"
        >
          🌐 {t('authFlow.changeLanguage', 'Change Language')} — తెలుగు / हिंदी / English
        </button>
      <p className="text-center text-gray-500 text-sm mt-6">
        Need help? <button type="button" className="text-primary-600 underline">Contact Support</button>
      </p>
    </div>
  );
}
