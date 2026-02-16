// src/components/emergency/FloatingSOSButton.jsx
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import SOSModal from './SOSModal';

/**
 * Floating SOS button - Fixed position emergency button
 * Shows on mobile/tablet layouts as a FAB (Floating Action Button)
 */
const FloatingSOSButton = ({
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'bottom-center'
  offset = { bottom: 80, right: 16 }, // Custom positioning
  size = 'default', // 'small', 'default', 'large'
  showLabel = false, // Show "SOS" text
  pulse = true, // Show pulse animation
}) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Position classes
  const getPositionStyles = () => {
    const base = { position: 'fixed', zIndex: 50 };
    
    switch (position) {
      case 'bottom-left':
        return { ...base, bottom: offset.bottom, left: offset.left || 16 };
      case 'bottom-center':
        return { ...base, bottom: offset.bottom, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
      default:
        return { ...base, bottom: offset.bottom, right: offset.right || 16 };
    }
  };

  // Size classes
  const sizeClasses = {
    small: 'w-12 h-12',
    default: 'w-14 h-14',
    large: 'w-16 h-16',
  };

  const iconSizes = {
    small: 'h-5 w-5',
    default: 'h-7 w-7',
    large: 'h-8 w-8',
  };

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }, []);

  // Handle press
  const handlePress = () => {
    setIsPressed(true);
    triggerHaptic();
    setShowModal(true);
    
    // Reset pressed state
    setTimeout(() => setIsPressed(false), 200);
  };

  return (
    <>
      {/* SOS Button */}
      <button
        type="button"
        onClick={handlePress}
        style={getPositionStyles()}
        className={`
          ${sizeClasses[size]}
          rounded-full
          bg-gradient-to-br from-red-600 to-red-700
          hover:from-red-700 hover:to-red-800
          active:scale-95
          text-white shadow-lg
          flex items-center justify-center
          focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-opacity-50
          transition-all duration-200
          ${isPressed ? 'scale-95' : ''}
          group
        `}
        aria-label={t('emergency.sosButton', 'SOS Emergency')}
        aria-haspopup="dialog"
        aria-expanded={showModal}
      >
        {/* Icon */}
        <AlertTriangle 
          className={`${iconSizes[size]} ${isPressed ? 'scale-90' : ''} transition-transform`} 
        />
        
        {/* Optional Label */}
        {showLabel && (
          <span className="ml-1 font-bold text-sm">SOS</span>
        )}

        {/* Pulse Animation */}
        {pulse && !showModal && (
          <>
            <span 
              className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40"
              aria-hidden="true"
            />
            <span 
              className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"
              style={{ animationDelay: '0.5s' }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Tooltip */}
        <span 
          className="
            absolute right-full mr-3 
            px-3 py-1.5 
            bg-gray-900 text-white text-sm font-medium
            rounded-lg shadow-lg
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            whitespace-nowrap
            pointer-events-none
            hidden sm:block
          "
          role="tooltip"
        >
          {t('emergency.sosButton', 'SOS Emergency')}
          {/* Arrow */}
          <span 
            className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-gray-900"
            aria-hidden="true"
          />
        </span>

        {/* Ripple effect on press */}
        {isPressed && (
          <span 
            className="absolute inset-0 rounded-full bg-white opacity-30 animate-ripple"
            aria-hidden="true"
          />
        )}
      </button>

      {/* SOS Modal */}
      <SOSModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};

export default FloatingSOSButton;