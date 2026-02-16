// src/components/emergency/SOSModal.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  X,
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  PhoneCall,
  Shield,
  Users,
  Navigation,
  Volume2,
} from 'lucide-react';
import { emergencyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Emergency numbers (India)
const EMERGENCY_NUMBERS = {
  ambulance: '108',
  police: '100',
  national: '112',
};

// Hold duration in milliseconds
const HOLD_DURATION = 3000;

/**
 * SOS Modal - Emergency alert trigger with hold-to-send safety
 */
const SOSModal = ({ show, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [status, setStatus] = useState('idle'); // idle, holding, sending, success, error
  const [holdProgress, setHoldProgress] = useState(0);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending'); // pending, success, error
  const [error, setError] = useState(null);
  const [sosId, setSosId] = useState(null);

  // Refs
  const holdIntervalRef = useRef(null);
  const holdStartRef = useRef(null);
  const audioRef = useRef(null);

  // Get location on modal open
  useEffect(() => {
    if (show) {
      getLocation();
    }
    return () => {
      cleanup();
    };
  }, [show]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopVibration();
  }, []);

  // Get current location
  const getLocation = async () => {
    setLocationStatus('pending');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setLocationStatus('success');
    } catch (err) {
      console.error('Location error:', err);
      setLocationStatus('error');
    }
  };

  // Haptic feedback
  const triggerVibration = (pattern = [100]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const stopVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  // Play alert sound
  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Store for cleanup
      audioRef.current = { oscillator, audioContext };

      // Stop after 3 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.oscillator.stop();
          audioRef.current.audioContext.close();
          audioRef.current = null;
        }
      }, 3000);
    } catch (err) {
      console.error('Audio error:', err);
    }
  };

  // Handle hold start
  const handleHoldStart = () => {
    if (status !== 'idle') return;

    setStatus('holding');
    setHoldProgress(0);
    setError(null);
    holdStartRef.current = Date.now();

    // Vibrate pattern during hold
    triggerVibration([100, 50, 100, 50, 100]);

    // Progress interval
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);

      // Vibrate every second
      if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 50) / 1000)) {
        triggerVibration([50]);
      }

      // Trigger SOS when complete
      if (elapsed >= HOLD_DURATION) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        triggerSOS();
      }
    }, 50);
  };

  // Handle hold end (cancel)
  const handleHoldEnd = () => {
    if (status !== 'holding') return;

    cleanup();
    setStatus('idle');
    setHoldProgress(0);
  };

  // Trigger SOS
  const triggerSOS = async () => {
    setStatus('sending');
    stopVibration();

    try {
      // Play alert sound
      playAlertSound();

      // Strong vibration
      triggerVibration([200, 100, 200, 100, 200]);

      // Prepare SOS data
      const sosData = {
        emergency_type: 'medical',
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        accuracy: location?.accuracy || null,
      };

      // Send SOS using correct API method
      const response = await emergencyAPI.sos.quickTrigger(sosData);

      if (response.data) {
        setSosId(response.data.id || response.data.sos_id);
        setStatus('success');

        // Success vibration
        triggerVibration([100, 50, 100]);
      }
    } catch (err) {
      console.error('SOS error:', err);
      setError(err.message || t('emergency.sendError', 'Failed to send SOS alert'));
      setStatus('error');

      // Still navigate to emergency page
      setTimeout(() => {
        onClose();
        navigate('/emergency');
      }, 2000);
    }
  };

  // Direct call functions
  const callNumber = (number) => {
    triggerVibration([50]);
    window.location.href = `tel:${number}`;
  };

  // Handle close
  const handleClose = () => {
    if (status === 'holding' || status === 'sending') return;
    cleanup();
    setStatus('idle');
    setHoldProgress(0);
    onClose();
  };

  // Go to emergency page
  const goToEmergencyPage = () => {
    cleanup();
    onClose();
    navigate('/emergency');
  };

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => e.target === e.currentTarget && status === 'idle' && handleClose()}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-red-600 text-white">
          <span id="sos-title" className="flex items-center gap-2 font-bold text-lg">
            <AlertTriangle className="h-6 w-6" />
            {t('emergency.sosTitle', 'Emergency SOS')}
          </span>
          {status === 'idle' && (
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-red-700 transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status: Idle - Show trigger button */}
          {(status === 'idle' || status === 'holding') && (
            <>
              {/* Location Status */}
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                locationStatus === 'success'
                  ? 'bg-green-50 text-green-700'
                  : locationStatus === 'error'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-50 text-gray-600'
              }`}>
                {locationStatus === 'pending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('emergency.gettingLocation', 'Getting your location...')}
                  </>
                ) : locationStatus === 'success' ? (
                  <>
                    <MapPin className="h-4 w-4" />
                    {t('emergency.locationReady', 'Location ready to share')}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    {t('emergency.locationUnavailable', 'Location unavailable - SOS will still work')}
                  </>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-gray-600 text-sm">
                {t('emergency.sosDisclaimer', 'This will send an emergency alert to your emergency contacts and notify nearby services. Your location will be shared.')}
              </p>

              {/* SOS Trigger Button */}
              <button
                type="button"
                onMouseDown={handleHoldStart}
                onTouchStart={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchEnd={handleHoldEnd}
                onTouchCancel={handleHoldEnd}
                className="w-full py-5 rounded-xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold relative overflow-hidden shadow-lg active:shadow-md transition-shadow"
              >
                {/* Progress fill */}
                <div
                  className="absolute inset-0 bg-red-800 transition-all duration-100 ease-linear"
                  style={{ width: `${holdProgress}%` }}
                />

                {/* Content */}
                <div className="relative flex flex-col items-center gap-2">
                  <span className="flex items-center gap-2 text-xl">
                    <AlertTriangle className={`h-7 w-7 ${status === 'holding' ? 'animate-pulse' : ''}`} />
                    {status === 'holding'
                      ? t('emergency.holdingTrigger', 'Keep Holding...')
                      : t('emergency.triggerSOS', 'Trigger SOS Alert')}
                  </span>
                  <span className="text-sm opacity-90">
                    {status === 'holding'
                      ? `${Math.ceil((HOLD_DURATION - (holdProgress / 100) * HOLD_DURATION) / 1000)}s`
                      : t('emergency.hold3Seconds', 'Hold for 3 seconds')}
                  </span>
                </div>

                {/* Pulse rings when holding */}
                {status === 'holding' && (
                  <>
                    <span className="absolute inset-0 border-4 border-white/30 rounded-xl animate-ping" />
                  </>
                )}
              </button>
            </>
          )}

          {/* Status: Sending */}
          {status === 'sending' && (
            <div className="py-8 text-center">
              <Loader2 className="h-16 w-16 text-red-600 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('emergency.sendingSOS', 'Sending SOS Alert...')}
              </h3>
              <p className="text-gray-600">
                {t('emergency.pleaseWait', 'Please wait, alerting emergency services')}
              </p>
            </div>
          )}

          {/* Status: Success */}
          {status === 'success' && (
            <div className="py-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('emergency.sosSuccessTitle', 'SOS Alert Sent!')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('emergency.sosSuccessMessage', 'Emergency services and your contacts have been notified. Help is on the way.')}
              </p>

              {sosId && (
                <div className="bg-gray-100 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500">{t('emergency.referenceId', 'Reference ID')}</p>
                  <p className="font-mono font-bold text-gray-900">{sosId}</p>
                </div>
              )}

              {location && (
                <div className="flex items-center justify-center text-sm text-green-600 mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {t('emergency.locationShared', 'Location shared successfully')}
                </div>
              )}

              {/* Call Ambulance */}
              <button
                onClick={() => callNumber(EMERGENCY_NUMBERS.ambulance)}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 mb-3"
              >
                <PhoneCall className="h-5 w-5" />
                {t('emergency.callAmbulance', 'Call Ambulance')} ({EMERGENCY_NUMBERS.ambulance})
              </button>

              <button
                onClick={goToEmergencyPage}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                {t('emergency.viewDetails', 'View Emergency Details')}
              </button>
            </div>
          )}

          {/* Status: Error */}
          {status === 'error' && (
            <div className="py-6 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('emergency.sosErrorTitle', 'Alert Failed')}
              </h3>
              <p className="text-red-600 mb-4">
                {error || t('emergency.sosErrorMessage', 'Could not send SOS alert')}
              </p>
              <p className="text-gray-600 text-sm mb-4">
                {t('emergency.callDirectly', 'Please call emergency services directly:')}
              </p>

              <button
                onClick={() => callNumber(EMERGENCY_NUMBERS.ambulance)}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <PhoneCall className="h-5 w-5" />
                {t('emergency.callAmbulance', 'Call Ambulance')} ({EMERGENCY_NUMBERS.ambulance})
              </button>
            </div>
          )}

          {/* Quick Call Buttons (always visible except during sending/success) */}
          {(status === 'idle' || status === 'holding') && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => callNumber(EMERGENCY_NUMBERS.ambulance)}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <Phone className="h-5 w-5 text-red-600" />
                <span className="text-xs font-medium text-red-700">
                  {t('emergency.ambulance', 'Ambulance')}
                </span>
                <span className="text-xs text-red-600">{EMERGENCY_NUMBERS.ambulance}</span>
              </button>

              <button
                type="button"
                onClick={() => callNumber(EMERGENCY_NUMBERS.police)}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">
                  {t('emergency.police', 'Police')}
                </span>
                <span className="text-xs text-blue-600">{EMERGENCY_NUMBERS.police}</span>
              </button>

              <button
                type="button"
                onClick={() => callNumber(EMERGENCY_NUMBERS.national)}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                <Phone className="h-5 w-5 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">
                  {t('emergency.helpline', 'Helpline')}
                </span>
                <span className="text-xs text-orange-600">{EMERGENCY_NUMBERS.national}</span>
              </button>
            </div>
          )}

          {/* Emergency Page Link */}
          {(status === 'idle' || status === 'holding') && (
            <button
              type="button"
              onClick={goToEmergencyPage}
              className="w-full py-3 text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              {t('emergency.viewEmergencyPage', 'View Emergency Services & Contacts')}
            </button>
          )}
        </div>

        {/* Footer - User Info (only in idle) */}
        {status === 'idle' && user && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                {t('emergency.alertingAs', 'Alert will be sent as')}: <strong>{user.full_name || user.name}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSModal;