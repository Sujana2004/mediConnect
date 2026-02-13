import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import SOSModal from './SOSModal';

/**
 * Floating SOS button (only used when layout wants a FAB; web layout uses sidebar instead).
 */
const FloatingSOSButton = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-300"
        aria-label={t('emergency.sosButton', 'SOS Emergency')}
      >
        <AlertTriangle className="h-7 w-7" />
      </button>
      <SOSModal show={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

export default FloatingSOSButton;
