import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// App configuration - could come from environment or config file
const APP_CONFIG = {
  name: 'MediConnect',
  version: import.meta.env.VITE_APP_VERSION || '2.0.0',
  splashDuration: 2000, // milliseconds
};

export default function SplashScreen({ onComplete, minDuration = APP_CONFIG.splashDuration }) {
  const { t } = useTranslation();
  const [fadeOut, setFadeOut] = useState(false);
  const [loadingText, setLoadingText] = useState(0);

  const loadingMessages = [
    t('splash.loading', 'Loading...'),
    t('splash.preparingApp', 'Preparing your experience...'),
    t('splash.almostReady', 'Almost ready...'),
  ];

  const handleComplete = useCallback(() => {
    // Start fade out animation
    setFadeOut(true);
    // Wait for fade animation to complete before calling onComplete
    setTimeout(() => {
      try {
        onComplete?.();
      } catch (error) {
        console.error('Splash screen completion error:', error);
        // Still try to proceed even if there's an error
        onComplete?.();
      }
    }, 300); // Match fade-out animation duration
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(handleComplete, minDuration);
    return () => clearTimeout(timer);
  }, [handleComplete, minDuration]);

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingText((prev) => (prev + 1) % loadingMessages.length);
    }, 800);
    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div 
      className={`fixed inset-0 flex flex-col items-center justify-center bg-white z-50 transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-label={t('splash.loadingApp', 'Loading MediConnect application')}
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-primary-400 animate-ping opacity-20" />
          
          {/* Main logo container */}
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl">
            {/* Medical Cross Icon */}
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

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {APP_CONFIG.name}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('splash.tagline', 'Your Health, Our Priority')}
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex flex-col items-center gap-3 mt-4">
          {/* Dots Animation */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="w-2.5 h-2.5 rounded-full bg-primary-500"
                style={{ 
                  animation: 'bounce 1s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                }} 
              />
            ))}
          </div>
          
          {/* Loading Text */}
          <p className="text-gray-500 text-sm h-5 transition-opacity duration-200">
            {loadingMessages[loadingText]}
          </p>
        </div>

        {/* Version */}
        <p className="text-gray-400 text-xs mt-8">
          {t('splash.version', 'Version')} {APP_CONFIG.version}
        </p>
      </div>

      {/* Bottom Branding */}
      <div className="absolute bottom-8 flex flex-col items-center gap-2">
        <p className="text-gray-400 text-xs">
          {t('splash.poweredBy', 'Powered by')}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-gray-500 text-sm font-medium">
            {t('splash.companyName', 'HealthTech Solutions')}
          </span>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}