// src/components/common/Loader.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Loader Component
 * Displays loading spinner with optional message
 * 
 * @param {object} props
 * @param {string} props.message - Loading message (optional)
 * @param {string} props.size - Size: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {boolean} props.fullScreen - Show as full-screen overlay (default: false)
 * 
 * @example
 * <Loader message="Loading data..." />
 * <Loader fullScreen />
 */
const Loader = ({ 
  message = null, 
  size = 'md',
  fullScreen = false 
}) => {
  const { t } = useTranslation();

  // Size configurations
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-2',
    lg: 'h-16 w-16 border-3',
    xl: 'h-24 w-24 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Spinner */}
      <div 
        className={`animate-spin rounded-full border-primary-600 border-t-transparent ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
      
      {/* Message */}
      {message && (
        <p className="text-secondary-600 text-sm font-medium animate-pulse">
          {message}
        </p>
      )}
      
      {/* Default message if none provided */}
      {!message && fullScreen && (
        <p className="text-secondary-600 text-sm font-medium animate-pulse">
          {t('common.loading')}
        </p>
      )}
    </div>
  );

  // Full-screen overlay loader
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  // Inline loader (centered in container)
  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      {spinner}
    </div>
  );
};

/**
 * Simple inline spinner (no container)
 */
export const Spinner = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-5 w-5 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
  };

  return (
    <div 
      className={`animate-spin rounded-full border-current border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Page-level loader with branding
 */
export const PageLoader = () => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-50 to-white z-[9999] flex flex-col items-center justify-center gap-6">
      {/* Logo/Brand */}
      <div className="text-center">
        <div className="w-20 h-20 bg-primary-500 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg">
          <svg 
            className="w-12 h-12 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-primary-900 mb-2">
          {t('common.appName')}
        </h2>
        <p className="text-secondary-500 text-sm">
          {t('auth.tagline')}
        </p>
      </div>

      {/* Spinner */}
      <div className="relative">
        <div className="h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>

      {/* Loading text */}
      <p className="text-secondary-600 text-sm font-medium animate-pulse">
        {t('common.loading')}
      </p>
    </div>
  );
};

/**
 * Skeleton loader for content placeholders
 */
export const SkeletonLoader = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="h-4 bg-secondary-200 rounded animate-pulse"
          style={{ width: `${100 - index * 10}%` }}
        />
      ))}
    </div>
  );
};

export default Loader;