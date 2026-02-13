import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Phone } from 'lucide-react';
import { emergencyAPI } from '../../services/api';

/**
 * Reusable SOS modal (used in web sidebar and mobile FAB).
 */
const SOSModal = ({ show, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isTriggering, setIsTriggering] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef(null);

  const handleHoldTrigger = () => {
    setIsTriggering(true);
    setHoldProgress(0);
    const duration = 3000;
    const start = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setHoldProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        triggerSOS();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsTriggering(false);
    setHoldProgress(0);
  };

  const triggerSOS = async () => {
    try {
      let location = { lat: null, lng: null };
      if (navigator.geolocation) {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      await emergencyAPI.sendSOS(location);
      onClose();
      navigate('/emergency');
    } catch (err) {
      console.error('SOS failed:', err);
      onClose();
      navigate('/emergency');
    } finally {
      setIsTriggering(false);
      setHoldProgress(0);
    }
  };

  const call108 = () => {
    window.location.href = 'tel:108';
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="flex items-center gap-2 text-red-600 font-bold">
            <AlertTriangle className="h-5 w-5" />
            {t('patient.emergencySOS', 'Emergency SOS')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label={t('patient.cancel', 'Cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-gray-700 text-sm">
            {t('patient.sosDisclaimer', 'Tap "Trigger SOS" to send emergency alert to your emergency contacts and nearby services. Your location will be shared.')}
          </p>
          <button
            type="button"
            onMouseDown={handleHoldTrigger}
            onTouchStart={handleHoldTrigger}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex flex-col items-center gap-2 relative overflow-hidden"
          >
            {isTriggering && (
              <div
                className="absolute inset-0 bg-red-800 transition-all duration-300"
                style={{ width: `${holdProgress}%` }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              {t('patient.triggerSOS', 'Trigger SOS Alert')}
            </span>
            <span className="relative text-sm opacity-90">
              {t('patient.hold3Seconds', 'Hold for 3 seconds')}
            </span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={call108}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              <Phone className="h-5 w-5" />
              {t('patient.call108', 'Call 108')}
            </button>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/emergency'); }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              {t('patient.emergencyPage', 'Emergency Page')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOSModal;
