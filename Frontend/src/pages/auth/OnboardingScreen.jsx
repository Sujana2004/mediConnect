// src/pages/auth/OnboardingScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  Mic,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Calendar,
  FileText,
  Pill,
  Shield,
} from 'lucide-react';

// Onboarding slides configuration
const SLIDES = [
  {
    id: 'welcome',
    icon: Heart,
    emoji: '🏥',
    color: 'from-blue-500 to-teal-500',
    bgColor: 'bg-blue-50',
    titleKey: 'onboarding.slide1.title',
    titleFallback: 'Welcome to MediConnect',
    subtitleKey: 'onboarding.slide1.subtitle',
    subtitleFallback: 'మెడికనెక్ట్‌కు స్వాగతం',
    descKey: 'onboarding.slide1.description',
    descFallback: 'Your complete healthcare companion for rural India. Access quality healthcare anytime, anywhere.',
    descLocalKey: 'onboarding.slide1.descriptionLocal',
    descLocalFallback: 'గ్రామీణ భారతదేశం కోసం మీ పూర్తి ఆరోగ్య సహచరుడు',
  },
  {
    id: 'ai-health',
    icon: Stethoscope,
    emoji: '🩺',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    titleKey: 'onboarding.slide2.title',
    titleFallback: 'AI-Powered Health Assistant',
    subtitleKey: 'onboarding.slide2.subtitle',
    subtitleFallback: 'AI ఆరోగ్య సహాయకుడు',
    descKey: 'onboarding.slide2.description',
    descFallback: 'Check symptoms, get AI diagnosis, and consult verified doctors - all from your mobile phone.',
    descLocalKey: 'onboarding.slide2.descriptionLocal',
    descLocalFallback: 'లక్షణాలను తనిఖీ చేయండి, AI నిర్ధారణ పొందండి మరియు వైద్యులను సంప్రదించండి',
  },
  {
    id: 'voice',
    icon: Mic,
    emoji: '🎤',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    titleKey: 'onboarding.slide3.title',
    titleFallback: 'Voice Support in Your Language',
    subtitleKey: 'onboarding.slide3.subtitle',
    subtitleFallback: 'మీ భాషలో వాయిస్ సపోర్ట్',
    descKey: 'onboarding.slide3.description',
    descFallback: 'Speak in Telugu, Hindi, or English. The app understands and responds in your preferred language.',
    descLocalKey: 'onboarding.slide3.descriptionLocal',
    descLocalFallback: 'తెలుగు, హిందీ లేదా ఇంగ్లీషులో మాట్లాడండి. యాప్ మీ భాషలో అర్థం చేసుకుంటుంది',
  },
  {
    id: 'emergency',
    icon: AlertTriangle,
    emoji: '🆘',
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50',
    titleKey: 'onboarding.slide4.title',
    titleFallback: 'Emergency SOS Support',
    subtitleKey: 'onboarding.slide4.subtitle',
    subtitleFallback: 'అత్యవసర SOS సహాయం',
    descKey: 'onboarding.slide4.description',
    descFallback: 'One-tap SOS alert to notify your family and nearby hospitals instantly in emergencies.',
    descLocalKey: 'onboarding.slide4.descriptionLocal',
    descLocalFallback: 'అత్యవసర సమయంలో మీ కుటుంబం మరియు సమీపంలోని ఆసుపత్రులకు వెంటనే హెచ్చరిక పంపండి',
  },
  {
    id: 'records',
    icon: FileText,
    emoji: '📋',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50',
    titleKey: 'onboarding.slide5.title',
    titleFallback: 'Digital Health Records',
    subtitleKey: 'onboarding.slide5.subtitle',
    subtitleFallback: 'డిజిటల్ ఆరోగ్య రికార్డులు',
    descKey: 'onboarding.slide5.description',
    descFallback: 'Store all your medical records safely and share them with doctors when needed.',
    descLocalKey: 'onboarding.slide5.descriptionLocal',
    descLocalFallback: 'మీ అన్ని వైద్య రికార్డులను సురక్షితంగా నిల్వ చేయండి మరియు అవసరమైనప్పుడు వైద్యులతో భాగస్వామ్యం చేయండి',
  },
];

const OnboardingScreen = ({ onComplete, onSkip, language = 'en' }) => {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const currentSlide = SLIDES[currentIndex];
  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === SLIDES.length - 1;
  const Icon = currentSlide.icon;

  // Update language
  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Go to next slide
  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    
    if (isLastSlide) {
      onComplete();
    } else {
      setDirection(1);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [isLastSlide, isAnimating, onComplete]);

  // Go to previous slide
  const prevSlide = useCallback(() => {
    if (isAnimating || isFirstSlide) return;
    
    setDirection(-1);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1);
      setIsAnimating(false);
    }, 150);
  }, [isFirstSlide, isAnimating]);

  // Go to specific slide
  const goToSlide = useCallback((index) => {
    if (isAnimating || index === currentIndex) return;
    
    setDirection(index > currentIndex ? 1 : -1);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
    }, 150);
  }, [currentIndex, isAnimating]);

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    if (diff > threshold) {
      // Swipe left - next
      nextSlide();
    } else if (diff < -threshold) {
      // Swipe right - previous
      prevSlide();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Enter' && isLastSlide) onComplete();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isLastSlide, onComplete]);

  // Get translated text with fallback
  const getText = (key, fallback) => {
    const translated = t(key, { defaultValue: '' });
    return translated && translated !== key ? translated : fallback;
  };

  // Handle skip
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  return (
    <div 
      className="flex flex-col h-full min-h-[500px]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3">
        {/* Language indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Globe className="h-4 w-4" />
          <span>{language === 'te' ? 'తెలుగు' : language === 'hi' ? 'हिंदी' : 'English'}</span>
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 text-blue-600 font-medium text-sm hover:bg-blue-50 rounded-lg transition-colors"
        >
          {t('onboarding.skip', language === 'te' ? 'దాటవేయి' : language === 'hi' ? 'छोड़ें' : 'Skip')}
        </button>
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        {/* Icon */}
        <div
          className={`
            relative w-32 h-32 sm:w-40 sm:h-40 rounded-3xl ${currentSlide.bgColor}
            flex items-center justify-center mb-8
            transition-all duration-300 ease-out
            ${isAnimating ? (direction > 0 ? 'translate-x-4 opacity-0' : '-translate-x-4 opacity-0') : 'translate-x-0 opacity-100'}
          `}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${currentSlide.color} opacity-10`} />
          
          {/* Icon or Emoji */}
          <span className="text-6xl sm:text-7xl relative z-10">
            {currentSlide.emoji}
          </span>

          {/* Decorative elements */}
          <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br ${currentSlide.color} opacity-60`} />
          <div className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-gradient-to-br ${currentSlide.color} opacity-40`} />
        </div>

        {/* Title */}
        <h2
          className={`
            text-2xl sm:text-3xl font-bold text-gray-900 text-center
            transition-all duration-300 ease-out
            ${isAnimating ? (direction > 0 ? 'translate-x-4 opacity-0' : '-translate-x-4 opacity-0') : 'translate-x-0 opacity-100'}
          `}
        >
          {getText(currentSlide.titleKey, currentSlide.titleFallback)}
        </h2>

        {/* Subtitle (Local language) */}
        <p
          className={`
            text-sm text-gray-500 text-center mt-1
            transition-all duration-300 ease-out delay-75
            ${isAnimating ? (direction > 0 ? 'translate-x-4 opacity-0' : '-translate-x-4 opacity-0') : 'translate-x-0 opacity-100'}
          `}
        >
          {getText(currentSlide.subtitleKey, currentSlide.subtitleFallback)}
        </p>

        {/* Description */}
        <p
          className={`
            text-gray-600 text-center mt-6 max-w-sm leading-relaxed
            transition-all duration-300 ease-out delay-100
            ${isAnimating ? (direction > 0 ? 'translate-x-4 opacity-0' : '-translate-x-4 opacity-0') : 'translate-x-0 opacity-100'}
          `}
        >
          {getText(currentSlide.descKey, currentSlide.descFallback)}
        </p>

        {/* Description Local */}
        <p
          className={`
            text-sm text-gray-500 text-center mt-2 max-w-sm
            transition-all duration-300 ease-out delay-150
            ${isAnimating ? (direction > 0 ? 'translate-x-4 opacity-0' : '-translate-x-4 opacity-0') : 'translate-x-0 opacity-100'}
          `}
        >
          {getText(currentSlide.descLocalKey, currentSlide.descLocalFallback)}
        </p>

        {/* Pagination Dots */}
        <div className="flex items-center gap-2 mt-8">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`
                transition-all duration-300 rounded-full
                ${index === currentIndex
                  ? 'w-8 h-2.5 bg-gradient-to-r from-blue-600 to-teal-500'
                  : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                }
              `}
              aria-label={`${t('onboarding.slide', 'Slide')} ${index + 1}`}
              aria-current={index === currentIndex ? 'step' : undefined}
            />
          ))}
        </div>

        {/* Progress text */}
        <p className="text-xs text-gray-400 mt-3">
          {currentIndex + 1} / {SLIDES.length}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-4">
          {/* Back Button */}
          <button
            type="button"
            onClick={prevSlide}
            disabled={isFirstSlide}
            className={`
              flex items-center justify-center gap-2
              px-5 py-3.5 rounded-xl
              border border-gray-300 text-gray-700 font-medium
              hover:bg-gray-50 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isFirstSlide ? 'invisible' : ''}
            `}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden sm:inline">
              {t('onboarding.back', language === 'te' ? 'వెనుక' : language === 'hi' ? 'पीछे' : 'Back')}
            </span>
          </button>

          {/* Next / Get Started Button */}
          <button
            type="button"
            onClick={nextSlide}
            className={`
              flex-1 flex items-center justify-center gap-2
              px-6 py-3.5 rounded-xl
              bg-gradient-to-r from-blue-600 to-teal-600
              hover:from-blue-700 hover:to-teal-700
              text-white font-semibold
              transition-all duration-200
              shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
            `}
          >
            {isLastSlide ? (
              <>
                <span>
                  {t('onboarding.getStarted', language === 'te' ? 'ప్రారంభించండి' : language === 'hi' ? 'शुरू करें' : 'Get Started')}
                </span>
                <Shield className="h-5 w-5" />
              </>
            ) : (
              <>
                <span>
                  {t('onboarding.next', language === 'te' ? 'తదుపరి' : language === 'hi' ? 'आगे' : 'Next')}
                </span>
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Swipe hint (mobile) */}
        <p className="text-xs text-gray-400 text-center mt-4 sm:hidden">
          {t('onboarding.swipeHint', '← Swipe to navigate →')}
        </p>
      </div>
    </div>
  );
};

export default OnboardingScreen;