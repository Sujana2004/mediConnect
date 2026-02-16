// src/components/common/NotificationPermission.jsx
import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useNotifications } from '../../contexts';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

/**
 * Component to request notification permission
 * Shows a banner prompting user to enable notifications
 */
const NotificationPermission = ({ onDismiss }) => {
  const { t } = useTranslation();
  const { permission, isSupported, requestPermission, isLoading } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not supported, already granted, or dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const result = await requestPermission();
    
    if (result.success) {
      setDismissed(true);
      onDismiss?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-primary-50 border-l-4 border-primary-500 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Bell className="h-5 w-5 text-primary-600" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-primary-800">
            {t('notifications.enableTitle', 'Enable Notifications')}
          </p>
          <p className="mt-1 text-sm text-primary-700">
            {t(
              'notifications.enableDescription',
              'Get notified about appointments, medicine reminders, and important updates.'
            )}
          </p>
          <div className="mt-3 flex gap-3">
            <Button
              size="sm"
              onClick={handleEnable}
              loading={isLoading}
              leftIcon={<Bell size={16} />}
            >
              {t('notifications.enable', 'Enable')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
            >
              {t('common.later', 'Later')}
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-4 text-primary-500 hover:text-primary-700"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPermission;