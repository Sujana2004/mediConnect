import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Phone } from 'lucide-react';

const EmergencyButton = ({ onSOS, disabled }) => {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      setIsActive(true);
      onSOS();
      // Reset after 3 seconds
      setTimeout(() => setIsActive(false), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`relative px-8 py-4 rounded-xl font-bold text-white flex items-center justify-center ${
        isActive
          ? 'animate-pulse bg-red-700'
          : disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
      } shadow-lg hover:shadow-xl transition-all`}
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center text-2xl">
          {isActive ? (
            <AlertTriangle className="h-8 w-8 mr-3 animate-bounce" />
          ) : (
            <Phone className="h-8 w-8 mr-3" />
          )}
          <span>{t('emergency.sosButton')}</span>
        </div>
        <div className="text-sm opacity-90 mt-1">
          {disabled ? t('emergency.sending') : t('emergency.pressForHelp')}
        </div>
      </div>
      
      {/* Emergency Rings Animation */}
      {isActive && (
        <>
          <div className="absolute inset-0 border-4 border-red-400 rounded-xl animate-ping"></div>
          <div className="absolute inset-0 border-4 border-red-300 rounded-xl animate-ping" style={{ animationDelay: '0.5s' }}></div>
        </>
      )}
    </button>
  );
};

export default EmergencyButton;