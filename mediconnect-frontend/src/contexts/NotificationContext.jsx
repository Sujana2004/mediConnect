// src/contexts/NotificationContext.jsx
/**
 * Notification Context
 * Manages push notifications and FCM integration
 * Uses sessionStorage for caching - no window listeners
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuthStore } from '../store';
import api from '../config/api';
import toast from 'react-hot-toast';

// Create context
const NotificationContext = createContext(null);

// Session storage keys
const STORAGE_KEYS = {
  FCM_TOKEN: 'fcm_token',
  PERMISSION: 'fcm_permission',
  SUPPORTED: 'fcm_supported'
};

/**
 * Safe sessionStorage getter
 */
const getFromSession = (key, defaultValue = null) => {
  try {
    const value = sessionStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safe sessionStorage setter
 */
const setToSession = (key, value) => {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, String(value));
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear all notification-related session data
 */
const clearSessionData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
  } catch {
    // Ignore
  }
};

/**
 * Get initial permission status
 */
const getInitialPermission = () => {
  // Check sessionStorage first
  const cached = getFromSession(STORAGE_KEYS.PERMISSION);
  if (cached && ['granted', 'denied', 'default'].includes(cached)) {
    return cached;
  }
  
  // Fall back to Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  
  return 'default';
};

/**
 * Notification Provider Component
 */
function NotificationProvider({ children }) {
  // Initialize state from sessionStorage
  const [fcmToken, setFcmToken] = useState(() => getFromSession(STORAGE_KEYS.FCM_TOKEN));
  const [permission, setPermission] = useState(getInitialPermission);
  const [isSupported, setIsSupported] = useState(() => getFromSession(STORAGE_KEYS.SUPPORTED) === 'true');
  const [isLoading, setIsLoading] = useState(true);

  // Refs for cleanup
  const messageUnsubscribeRef = useRef(null);
  const fcmModuleRef = useRef(null);
  const initAttemptedRef = useRef(false);

  // Get auth state from store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  /**
   * Load FCM module lazily
   */
  const loadFCMModule = useCallback(async () => {
    if (fcmModuleRef.current) {
      return fcmModuleRef.current;
    }

    try {
      const module = await import('../services/fcm');
      fcmModuleRef.current = module;
      return module;
    } catch (error) {
      console.warn('FCM: Module not available:', error.message);
      return null;
    }
  }, []);

  /**
   * Check notification support on mount
   */
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check basic browser support
        const hasNotificationAPI = typeof window !== 'undefined' && 'Notification' in window;
        const hasServiceWorker = 'serviceWorker' in navigator;
        const hasPushManager = 'PushManager' in window;
        
        if (!hasNotificationAPI || !hasServiceWorker || !hasPushManager) {
          setIsSupported(false);
          setToSession(STORAGE_KEYS.SUPPORTED, 'false');
          setIsLoading(false);
          return;
        }

        // Update permission from actual API
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
        setToSession(STORAGE_KEYS.PERMISSION, currentPermission);

        // Check FCM support
        const fcm = await loadFCMModule();
        if (fcm?.isFCMSupported) {
          const fcmSupported = await fcm.isFCMSupported();
          setIsSupported(fcmSupported);
          setToSession(STORAGE_KEYS.SUPPORTED, String(fcmSupported));
        } else {
          setIsSupported(true);
          setToSession(STORAGE_KEYS.SUPPORTED, 'true');
        }
      } catch (error) {
        console.warn('FCM: Support check failed:', error.message);
        setIsSupported(false);
        setToSession(STORAGE_KEYS.SUPPORTED, 'false');
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, [loadFCMModule]);

  /**
   * Send token to backend
   */
  const sendTokenToBackend = useCallback(async (token) => {
    if (!token || !isAuthenticated) return false;

    try {
      await api.post('/auth/settings/fcm-token/', { fcm_token: token });
      console.log('✅ FCM: Token sent to backend');
      return true;
    } catch (error) {
      console.warn('❌ FCM: Failed to send token:', error.message);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Initialize FCM when authenticated
   */
  useEffect(() => {
    if (!isAuthenticated || !isSupported || initAttemptedRef.current) return;

    const initializeFCM = async () => {
      initAttemptedRef.current = true;

      // Check if we have a cached token
      const cachedToken = getFromSession(STORAGE_KEYS.FCM_TOKEN);
      if (cachedToken) {
        setFcmToken(cachedToken);
        await sendTokenToBackend(cachedToken);
        return;
      }

      // Only try to get new token if permission already granted
      if (Notification.permission !== 'granted') {
        return;
      }

      try {
        const fcm = await loadFCMModule();
        if (!fcm?.getFCMToken) return;

        const token = await fcm.getFCMToken();

        if (token) {
          setFcmToken(token);
          setToSession(STORAGE_KEYS.FCM_TOKEN, token);
          setPermission('granted');
          setToSession(STORAGE_KEYS.PERMISSION, 'granted');
          await sendTokenToBackend(token);
        }
      } catch (error) {
        console.warn('FCM: Initialization error:', error.message);
      }
    };

    initializeFCM();
  }, [isAuthenticated, isSupported, loadFCMModule, sendTokenToBackend]);

  /**
   * Setup foreground message listener
   */
  useEffect(() => {
    if (!isAuthenticated || !isSupported || !fcmToken) return;

    const setupListener = async () => {
      try {
        const fcm = await loadFCMModule();
        if (!fcm?.onForegroundMessage) return;

        // Clean up previous listener
        if (messageUnsubscribeRef.current) {
          messageUnsubscribeRef.current();
          messageUnsubscribeRef.current = null;
        }

        messageUnsubscribeRef.current = fcm.onForegroundMessage((payload) => {
          console.log('📩 FCM: Foreground message:', payload);

          const { notification, data } = payload;
          const title = notification?.title || 'MediConnect';
          const body = notification?.body || 'You have a new notification';

          // Show toast notification
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 text-lg">🔔</span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="mt-1 text-sm text-gray-500">{body}</p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            ),
            { duration: 5000 }
          );

          // Show browser notification if document is hidden
          if (document.hidden && fcm.showLocalNotification) {
            fcm.showLocalNotification(title, {
              body,
              tag: data?.tag || 'mediconnect',
              url: data?.url || '/',
              data
            });
          }
        });
      } catch (error) {
        console.warn('FCM: Message listener setup failed:', error.message);
      }
    };

    setupListener();

    // Cleanup on unmount or dependency change
    return () => {
      if (messageUnsubscribeRef.current) {
        messageUnsubscribeRef.current();
        messageUnsubscribeRef.current = null;
      }
    };
  }, [isAuthenticated, isSupported, fcmToken, loadFCMModule]);

  /**
   * Request notification permission (user-triggered)
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return { success: false, permission: 'unsupported' };
    }

    setIsLoading(true);

    try {
      // Request browser permission
      const browserPermission = await Notification.requestPermission();
      setPermission(browserPermission);
      setToSession(STORAGE_KEYS.PERMISSION, browserPermission);

      if (browserPermission !== 'granted') {
        setIsLoading(false);
        return { success: false, permission: browserPermission };
      }

      // Get FCM token
      const fcm = await loadFCMModule();
      if (fcm?.getFCMToken) {
        const token = await fcm.getFCMToken();

        if (token) {
          setFcmToken(token);
          setToSession(STORAGE_KEYS.FCM_TOKEN, token);

          if (isAuthenticated) {
            await sendTokenToBackend(token);
          }

          toast.success('Notifications enabled!');
          setIsLoading(false);
          return { success: true, permission: 'granted' };
        }
      }

      setIsLoading(false);
      return { success: true, permission: browserPermission };
    } catch (error) {
      console.error('FCM: Permission request error:', error);
      setIsLoading(false);
      return { success: false, permission: 'error' };
    }
  }, [isSupported, isAuthenticated, loadFCMModule, sendTokenToBackend]);

  /**
   * Show local notification
   */
  const showNotification = useCallback((title, options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('FCM: Notifications not available');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/badge.png',
        tag: options.tag || 'mediconnect-notification',
        ...options
      });

      // Handle click - use location.assign instead of window.location.href
      notification.onclick = () => {
        notification.close();
        if (options.url && typeof options.url === 'string') {
          location.assign(options.url);
        }
      };

      // Auto-close
      const duration = options.duration || 5000;
      setTimeout(() => {
        notification.close();
      }, duration);

      return notification;
    } catch (error) {
      console.error('FCM: Failed to show notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  /**
   * Clear notification data (for logout)
   */
  const clearNotificationData = useCallback(async () => {
    try {
      // Clean up listener
      if (messageUnsubscribeRef.current) {
        messageUnsubscribeRef.current();
        messageUnsubscribeRef.current = null;
      }

      // Delete FCM token
      const fcm = await loadFCMModule();
      if (fcm?.deleteFCMToken) {
        await fcm.deleteFCMToken();
      }

      // Clear session storage
      clearSessionData();

      // Reset state
      setFcmToken(null);
      initAttemptedRef.current = false;

      console.log('FCM: Notification data cleared');
    } catch (error) {
      console.warn('FCM: Clear data error:', error.message);
    }
  }, [loadFCMModule]);

  const value = {
    fcmToken,
    permission,
    isSupported,
    isLoading,
    requestPermission,
    showNotification,
    clearNotificationData,
    isEnabled: isSupported && permission === 'granted' && !!fcmToken
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook to use notifications
 */
function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
}

// Named exports only
export { NotificationContext, NotificationProvider, useNotifications };