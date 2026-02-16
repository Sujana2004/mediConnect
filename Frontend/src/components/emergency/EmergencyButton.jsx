// src/components/emergency/EmergencyButton.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Phone,
  MapPin,
  X,
  Loader2,
  CheckCircle,
  PhoneCall,
  Shield,
} from 'lucide-react';
import { emergencyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Countdown duration before SOS is sent (seconds)
const COUNTDOWN_DURATION = 5;

// Emergency helpline numbers (India)
const EMERGENCY_NUMBERS = {
  ambulance: '108',
  police: '100',
  fire: '101',
  women: '181',
  national: '112',
};

const EmergencyButton = ({
  onSOS,
  onCancel,
  disabled = false,
  showQuickCall = true,
  size = 'large', // 'small', 'medium', 'large'
  variant = 'full', // 'full', 'compact', 'fab'
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // State
  const [status, setStatus] = useState('idle'); // idle, countdown, sending, sent, error
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [sosId, setSosId] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Refs
  const countdownRef = useRef(null);
  const audioRef = useRef(null);
  const vibrationRef = useRef(null);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(loc);
          setLocationError(null);
          resolve(loc);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError(error.message);
          // Resolve with null instead of rejecting - SOS should still work without location
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  // Pre-fetch location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Haptic feedback
  const triggerHaptic = useCallback((pattern = 'heavy') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [200],
        sos: [100, 50, 100, 50, 100, 200, 200, 50, 200, 50, 200, 200, 100, 50, 100, 50, 100],
        alarm: [500, 200, 500, 200, 500],
      };
      navigator.vibrate(patterns[pattern] || patterns.heavy);
    }
  }, []);

  // Stop vibration
  const stopHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    try {
      // Create audio context for alarm sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      audioRef.current = { oscillator, audioContext };

      // Siren effect
      let freq = 800;
      const interval = setInterval(() => {
        freq = freq === 800 ? 600 : 800;
        oscillator.frequency.value = freq;
      }, 500);

      vibrationRef.current = interval;
    } catch (err) {
      console.error('Audio error:', err);
    }
  }, []);

  // Stop alert sound
  const stopAlertSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.oscillator.stop();
      audioRef.current.audioContext.close();
      audioRef.current = null;
    }
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
  }, []);

  // Start SOS process
  const startSOS = useCallback(() => {
    setShowConfirmDialog(false);
    setStatus('countdown');
    setCountdown(COUNTDOWN_DURATION);
    setError(null);

    // Start haptic feedback
    triggerHaptic('alarm');

    // Start countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          sendSOS();
          return 0;
        }
        triggerHaptic('medium');
        return prev - 1;
      });
    }, 1000);
  }, [triggerHaptic]);

  // Cancel SOS
  const cancelSOS = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    stopHaptic();
    stopAlertSound();
    setStatus('idle');
    setCountdown(COUNTDOWN_DURATION);
    setShowConfirmDialog(false);

    if (onCancel) {
      onCancel();
    }
  }, [stopHaptic, stopAlertSound, onCancel]);

  // Send SOS to backend
  const sendSOS = useCallback(async () => {
    setStatus('sending');
    stopHaptic();

    try {
      // Get fresh location
      const currentLocation = await getCurrentLocation();

      // Play alarm sound
      playAlertSound();
      triggerHaptic('sos');

      // Prepare SOS data
      const sosData = {
        emergency_type: 'medical',
        latitude: currentLocation?.latitude || null,
        longitude: currentLocation?.longitude || null,
        accuracy: currentLocation?.accuracy || null,
        user_name: user?.full_name || user?.name || 'Unknown',
        user_phone: user?.phone_number || null,
        additional_info: {
          blood_group: user?.blood_group || null,
          allergies: user?.allergies || [],
          medical_conditions: user?.medical_conditions || [],
        },
      };

      // Send to API
      const response = await emergencyAPI.sos.quickTrigger(sosData);

      if (response.data) {
        setSosId(response.data.id || response.data.sos_id);
        setStatus('sent');

        // Callback
        if (onSOS) {
          onSOS({
            sosId: response.data.id,
            location: currentLocation,
            timestamp: new Date(),
          });
        }

        // Stop sound after 5 seconds
        setTimeout(() => {
          stopAlertSound();
        }, 5000);
      }
    } catch (err) {
      console.error('SOS Error:', err);
      setError(err.message || t('emergency.sendError', 'Failed to send SOS'));
      setStatus('error');
      stopAlertSound();

      // Retry after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }
  }, [getCurrentLocation, playAlertSound, triggerHaptic, stopAlertSound, user, onSOS, t]);

  // Handle button press
  const handlePress = () => {
    if (disabled || status !== 'idle') return;

    // Show confirmation dialog
    setShowConfirmDialog(true);
    triggerHaptic('heavy');
  };

  // Direct call to emergency number
  const callEmergency = (number) => {
    window.location.href = `tel:${number}`;
    triggerHaptic('medium');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      stopHaptic();
      stopAlertSound();
    };
  }, [stopHaptic, stopAlertSound]);

  // Size classes
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  // Render FAB variant
  if (variant === 'fab') {
    return (
      <>
        <button
          onClick={handlePress}
          disabled={disabled || status !== 'idle'}
          className={`fixed bottom-24 right-6 w-16 h-16 rounded-full shadow-xl z-40 flex items-center justify-center transition-all ${
            status === 'sent'
              ? 'bg-green-600'
              : status === 'error'
              ? 'bg-gray-600'
              : disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 hover:scale-110'
          }`}
          aria-label={t('emergency.sosButton', 'SOS Emergency')}
        >
          {status === 'sending' ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : status === 'sent' ? (
            <CheckCircle className="h-8 w-8 text-white" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-white" />
          )}

          {/* Pulse animation when idle */}
          {status === 'idle' && !disabled && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
          )}
        </button>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <ConfirmationDialog
            onConfirm={startSOS}
            onCancel={cancelSOS}
            location={location}
            t={t}
          />
        )}

        {/* Countdown Overlay */}
        {status === 'countdown' && (
          <CountdownOverlay
            countdown={countdown}
            onCancel={cancelSOS}
            t={t}
          />
        )}

        {/* Sent Overlay */}
        {status === 'sent' && (
          <SentOverlay
            sosId={sosId}
            location={location}
            onClose={() => setStatus('idle')}
            t={t}
          />
        )}
      </>
    );
  }

  // Render full variant
  return (
    <div className="w-full">
      {/* Main SOS Button */}
      <button
        onClick={handlePress}
        disabled={disabled || status !== 'idle'}
        className={`relative w-full ${sizeClasses[size]} rounded-xl font-bold text-white flex items-center justify-center ${
          status === 'sent'
            ? 'bg-green-600'
            : status === 'error'
            ? 'bg-red-800'
            : status === 'countdown' || status === 'sending'
            ? 'bg-red-700 animate-pulse'
            : disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:scale-95'
        } shadow-lg hover:shadow-xl transition-all`}
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center">
            {status === 'sending' ? (
              <Loader2 className="h-8 w-8 mr-3 animate-spin" />
            ) : status === 'sent' ? (
              <CheckCircle className="h-8 w-8 mr-3" />
            ) : status === 'countdown' ? (
              <span className="text-4xl font-bold mr-3">{countdown}</span>
            ) : (
              <AlertTriangle className="h-8 w-8 mr-3" />
            )}
            <span className="text-2xl">
              {status === 'sent'
                ? t('emergency.helpOnWay', 'Help is on the way!')
                : status === 'sending'
                ? t('emergency.sending', 'Sending SOS...')
                : status === 'countdown'
                ? t('emergency.sendingIn', 'Sending in...')
                : t('emergency.sosButton', 'SOS Emergency')}
            </span>
          </div>

          {status === 'idle' && (
            <div className="text-sm opacity-90 mt-1">
              {t('emergency.pressForHelp', 'Press for emergency help')}
            </div>
          )}

          {status === 'error' && (
            <div className="text-sm mt-1">
              {error || t('emergency.tryAgain', 'Tap to try again')}
            </div>
          )}
        </div>

        {/* Pulse Rings */}
        {(status === 'countdown' || status === 'sending') && (
          <>
            <span className="absolute inset-0 border-4 border-red-400 rounded-xl animate-ping opacity-75" />
            <span
              className="absolute inset-0 border-4 border-red-300 rounded-xl animate-ping opacity-50"
              style={{ animationDelay: '0.3s' }}
            />
          </>
        )}
      </button>

      {/* Location Status */}
      {status === 'idle' && (
        <div className="mt-2 flex items-center justify-center text-sm">
          {location ? (
            <span className="text-green-600 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {t('emergency.locationReady', 'Location ready')}
            </span>
          ) : locationError ? (
            <span className="text-amber-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {t('emergency.locationUnavailable', 'Location unavailable')}
            </span>
          ) : (
            <span className="text-gray-500 flex items-center">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {t('emergency.gettingLocation', 'Getting location...')}
            </span>
          )}
        </div>
      )}

      {/* Quick Call Buttons */}
      {showQuickCall && status === 'idle' && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => callEmergency(EMERGENCY_NUMBERS.ambulance)}
            className="flex flex-col items-center p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <PhoneCall className="h-5 w-5 text-red-600 mb-1" />
            <span className="text-xs font-medium text-red-700">
              {t('emergency.ambulance', 'Ambulance')}
            </span>
            <span className="text-xs text-red-600">{EMERGENCY_NUMBERS.ambulance}</span>
          </button>

          <button
            onClick={() => callEmergency(EMERGENCY_NUMBERS.police)}
            className="flex flex-col items-center p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Shield className="h-5 w-5 text-blue-600 mb-1" />
            <span className="text-xs font-medium text-blue-700">
              {t('emergency.police', 'Police')}
            </span>
            <span className="text-xs text-blue-600">{EMERGENCY_NUMBERS.police}</span>
          </button>

          <button
            onClick={() => callEmergency(EMERGENCY_NUMBERS.national)}
            className="flex flex-col items-center p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Phone className="h-5 w-5 text-orange-600 mb-1" />
            <span className="text-xs font-medium text-orange-700">
              {t('emergency.helpline', 'Helpline')}
            </span>
            <span className="text-xs text-orange-600">{EMERGENCY_NUMBERS.national}</span>
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmationDialog
          onConfirm={startSOS}
          onCancel={cancelSOS}
          location={location}
          t={t}
        />
      )}

      {/* Countdown Overlay */}
      {status === 'countdown' && (
        <CountdownOverlay
          countdown={countdown}
          onCancel={cancelSOS}
          t={t}
        />
      )}

      {/* Sent Overlay */}
      {status === 'sent' && (
        <SentOverlay
          sosId={sosId}
          location={location}
          onClose={() => setStatus('idle')}
          t={t}
        />
      )}
    </div>
  );
};

// Confirmation Dialog Component
const ConfirmationDialog = ({ onConfirm, onCancel, location, t }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center animate-scale-in">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {t('emergency.confirmTitle', 'Send Emergency SOS?')}
      </h2>

      <p className="text-gray-600 mb-4">
        {t('emergency.confirmMessage', 'This will alert emergency services and your emergency contacts with your location.')}
      </p>

      {location && (
        <div className="flex items-center justify-center text-sm text-green-600 mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          {t('emergency.locationWillBeSent', 'Your location will be shared')}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('emergency.cancel', 'Cancel')}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
        >
          {t('emergency.sendSOS', 'Send SOS')}
        </button>
      </div>
    </div>
  </div>
);

// Countdown Overlay Component
const CountdownOverlay = ({ countdown, onCancel, t }) => (
  <div className="fixed inset-0 bg-red-900/95 flex items-center justify-center z-50 p-4">
    <div className="text-center text-white">
      {/* Countdown Number */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="8"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeDasharray={440}
            strokeDashoffset={440 - (440 * (5 - countdown)) / 5}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-7xl font-bold">
          {countdown}
        </span>
      </div>

      <h2 className="text-2xl font-bold mb-2">
        {t('emergency.sendingIn', 'Sending SOS in...')}
      </h2>

      <p className="text-red-200 mb-8">
        {t('emergency.tapToCancel', 'Tap below to cancel')}
      </p>

      <button
        onClick={onCancel}
        className="px-8 py-4 bg-white text-red-600 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors flex items-center justify-center mx-auto"
      >
        <X className="h-6 w-6 mr-2" />
        {t('emergency.cancel', 'Cancel')}
      </button>
    </div>
  </div>
);

// Sent Overlay Component
const SentOverlay = ({ sosId, location, onClose, t }) => (
  <div className="fixed inset-0 bg-green-900/95 flex items-center justify-center z-50 p-4">
    <div className="text-center text-white max-w-sm">
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
        <CheckCircle className="h-12 w-12" />
      </div>

      <h2 className="text-2xl font-bold mb-2">
        {t('emergency.sosSuccessTitle', 'SOS Sent Successfully!')}
      </h2>

      <p className="text-green-200 mb-6">
        {t('emergency.sosSuccessMessage', 'Emergency services and your contacts have been notified. Help is on the way.')}
      </p>

      {sosId && (
        <div className="bg-white/10 rounded-lg p-3 mb-6">
          <p className="text-sm text-green-200">{t('emergency.referenceId', 'Reference ID')}</p>
          <p className="font-mono font-bold">{sosId}</p>
        </div>
      )}

      {location && (
        <div className="flex items-center justify-center text-sm text-green-200 mb-6">
          <MapPin className="h-4 w-4 mr-1" />
          {t('emergency.locationShared', 'Location shared')}:
          <span className="ml-1 font-mono">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </span>
        </div>
      )}

      <div className="space-y-3">
        <a
          href={`tel:${EMERGENCY_NUMBERS.ambulance}`}
          className="block w-full py-3 px-4 bg-white text-green-700 rounded-xl font-medium hover:bg-green-50 transition-colors"
        >
          <Phone className="h-5 w-5 inline mr-2" />
          {t('emergency.callAmbulance', 'Call Ambulance')} ({EMERGENCY_NUMBERS.ambulance})
        </a>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 border-2 border-white/30 rounded-xl font-medium hover:bg-white/10 transition-colors"
        >
          {t('emergency.close', 'Close')}
        </button>
      </div>
    </div>
  </div>
);

export default EmergencyButton;