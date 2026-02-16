import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'hi', label: 'हिंदी' },
];

export default function RoleSelectScreen({ onSelectPatient, onSelectDoctor, onBack, onLoginClick }) {
  const { t, i18n } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const currentLanguage = LANGUAGES.find(l => l.value === i18n.language) || LANGUAGES[0];

  const handleLogin = () => {
    // Use dedicated login handler if provided, otherwise fall back to onBack
    if (onLoginClick) {
      onLoginClick();
    } else {
      onBack();
    }
  };

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
          {t('roleSelect.title', 'Select Your Role')}
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
            <svg 
              className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showLanguageMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowLanguageMenu(false)}
                aria-hidden="true"
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
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <p className="text-gray-900 font-medium text-lg">
            {t('roleSelect.createAccount', 'Create New Account')}
          </p>
          <p className="text-gray-600 mt-3">
            {t('roleSelect.registerAs', 'I want to register as:')}
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="mt-8 space-y-4">
          {/* Patient Card */}
          <button
            type="button"
            onClick={onSelectPatient}
            className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50/50 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 group"
            aria-label={t('roleSelect.selectAsPatient', 'Register as a patient')}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <span className="font-semibold text-gray-900 text-lg block">
                  {t('roleSelect.patient', 'Patient')}
                </span>
                <p className="text-gray-600 text-sm mt-1">
                  {t('roleSelect.patientDescription', 'I need medical care and health services')}
                </p>
                <span className="text-primary-600 text-sm font-medium mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t('roleSelect.selectAsPatientButton', 'Select as Patient')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </button>

          {/* Doctor Card */}
          <button
            type="button"
            onClick={onSelectDoctor}
            className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50/50 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 group"
            aria-label={t('roleSelect.selectAsDoctor', 'Register as a doctor')}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-lg">
                    {t('roleSelect.doctor', 'Doctor')}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    {t('roleSelect.verificationRequired', 'Verification Required')}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-1">
                  {t('roleSelect.doctorDescription', 'I am a medical professional')}
                </p>
                <span className="text-primary-600 text-sm font-medium mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t('roleSelect.selectAsDoctorButton', 'Select as Doctor')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-600 mt-8 text-sm">
          {t('roleSelect.alreadyHaveAccount', 'Already have an account?')}{' '}
          <button 
            type="button" 
            onClick={handleLogin} 
            className="text-primary-600 font-medium hover:underline inline-flex items-center gap-1"
          >
            {t('roleSelect.loginHere', 'Login Here')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </p>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm text-gray-600">
              {t('roleSelect.patientNote', 'Patients can book appointments, access health records, and consult with doctors.')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t('roleSelect.doctorNote', 'Doctors require verification of medical credentials before account activation.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}