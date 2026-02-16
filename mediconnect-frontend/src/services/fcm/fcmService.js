/**
 * FCM (Firebase Cloud Messaging) Service
 * Handles push notifications for the application
 */

import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported, 
  deleteToken 
} from 'firebase/messaging';
import app from '../../config/firebase';

/**
 * VAPID key for web push notifications
 * @readonly
 */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Storage keys for FCM data
 * @readonly
 */
const STORAGE_KEYS = Object.freeze({
  FCM_TOKEN: 'fcm_token',
  FCM_PERMISSION: 'fcm_permission',
});

/**
 * Service worker activation timeout in milliseconds
 * @readonly
 */
const SW_ACTIVATION_TIMEOUT = 10000;

/**
 * Default notification auto-close duration in milliseconds
 * @readonly
 */
const DEFAULT_NOTIFICATION_DURATION = 5000;

// Module-level state
let messaging = null;
let serviceWorkerRegistration = null;
let messageUnsubscribe = null;

/**
 * Safe sessionStorage getter
 * @param {string} key - Storage key
 * @returns {string|null} Stored value or null
 */
const getFromStorage = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Safe sessionStorage setter
 * @param {string} key - Storage key
 * @param {string|null} value - Value to store (null removes the item)
 */
const setInStorage = (key, value) => {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // Silently fail for storage errors
  }
};

/**
 * Safe sessionStorage remover
 * @param {string} key - Storage key
 */
const removeFromStorage = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Silently fail for storage errors
  }
};

/**
 * Check if code is running in browser environment
 * @returns {boolean}
 */
const isBrowserEnvironment = () => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
};

/**
 * Check if required browser APIs are available
 * @returns {{supported: boolean, missing: string[]}}
 */
const checkBrowserAPIs = () => {
  const missing = [];

  if (!('serviceWorker' in navigator)) {
    missing.push('Service Workers');
  }

  if (!('PushManager' in window)) {
    missing.push('Push API');
  }

  if (!('Notification' in window)) {
    missing.push('Notifications');
  }

  return {
    supported: missing.length === 0,
    missing,
  };
};

/**
 * Check if FCM is supported in this browser
 * @returns {Promise<boolean>}
 */
export const isFCMSupported = async () => {
  try {
    if (!isBrowserEnvironment()) {
      console.warn('FCM: Not in browser environment');
      return false;
    }

    const { supported, missing } = checkBrowserAPIs();
    
    if (!supported) {
      console.warn(`FCM: Missing browser APIs: ${missing.join(', ')}`);
      return false;
    }

    const firebaseSupported = await isSupported();

    if (!firebaseSupported) {
      console.warn('FCM: Firebase Messaging not supported in this browser');
    }

    return firebaseSupported;
  } catch (error) {
    console.error('FCM: Support check failed:', error);
    return false;
  }
};

/**
 * Validate VAPID key is present and valid
 * @returns {boolean}
 */
const validateVapidKey = () => {
  const MIN_VAPID_KEY_LENGTH = 50;

  if (!VAPID_KEY) {
    console.error('FCM: VITE_FIREBASE_VAPID_KEY is not set in .env file');
    console.error('FCM: Get your VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates');
    return false;
  }

  if (VAPID_KEY.length < MIN_VAPID_KEY_LENGTH) {
    console.error('FCM: VAPID key appears to be invalid (too short)');
    return false;
  }

  return true;
};

/**
 * Get cached token from sessionStorage
 * @returns {string|null}
 */
const getCachedToken = () => {
  return getFromStorage(STORAGE_KEYS.FCM_TOKEN);
};

/**
 * Cache token in sessionStorage
 * @param {string|null} token - Token to cache or null to remove
 */
const cacheToken = (token) => {
  if (token) {
    setInStorage(STORAGE_KEYS.FCM_TOKEN, token);
  } else {
    removeFromStorage(STORAGE_KEYS.FCM_TOKEN);
  }
};

/**
 * Cache permission status in sessionStorage
 * @param {string} permission - Permission status
 */
const cachePermission = (permission) => {
  setInStorage(STORAGE_KEYS.FCM_PERMISSION, permission);
};

/**
 * Wait for service worker to activate
 * @param {ServiceWorker} sw - Service worker instance
 * @returns {Promise<void>}
 */
const waitForServiceWorkerActivation = (sw) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Service worker activation timeout'));
    }, SW_ACTIVATION_TIMEOUT);

    const handleStateChange = () => {
      if (sw.state === 'activated') {
        clearTimeout(timeout);
        sw.removeEventListener('statechange', handleStateChange);
        resolve();
      } else if (sw.state === 'redundant') {
        clearTimeout(timeout);
        sw.removeEventListener('statechange', handleStateChange);
        reject(new Error('Service worker became redundant'));
      }
    };

    sw.addEventListener('statechange', handleStateChange);
  });
};

/**
 * Register the Firebase messaging service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
const registerServiceWorker = async () => {
  try {
    // Return cached registration if available and active
    if (serviceWorkerRegistration?.active) {
      return serviceWorkerRegistration;
    }

    // Check for existing registration
    const existingReg = await navigator.serviceWorker.getRegistration('/');

    if (existingReg?.active?.scriptURL?.includes('firebase-messaging-sw.js')) {
      console.log('FCM: Using existing service worker');
      serviceWorkerRegistration = existingReg;
      return serviceWorkerRegistration;
    }

    // Register new service worker
    console.log('FCM: Registering service worker...');
    serviceWorkerRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );

    // Wait for activation based on current state
    if (serviceWorkerRegistration.installing) {
      await waitForServiceWorkerActivation(serviceWorkerRegistration.installing);
    } else if (serviceWorkerRegistration.waiting) {
      // Skip waiting if there's a waiting worker
      serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    console.log('FCM: Service worker registered successfully');
    return serviceWorkerRegistration;
  } catch (error) {
    console.error('FCM: Service worker registration failed:', error);
    serviceWorkerRegistration = null;
    return null;
  }
};

/**
 * Initialize Firebase Messaging
 * @returns {Promise<Object|null>} Messaging instance or null
 */
export const initializeMessaging = async () => {
  try {
    // Return existing instance
    if (messaging) {
      return messaging;
    }

    const supported = await isFCMSupported();
    if (!supported) {
      return null;
    }

    if (!validateVapidKey()) {
      return null;
    }

    messaging = getMessaging(app);
    console.log('FCM: Messaging initialized');

    return messaging;
  } catch (error) {
    console.error('FCM: Failed to initialize messaging:', error);
    return null;
  }
};

/**
 * Request notification permission from user
 * @returns {Promise<{success: boolean, permission: string, error?: string}>}
 */
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('FCM: Notifications not supported in this browser');
      return {
        success: false,
        permission: 'unsupported',
        error: 'Notifications are not supported in this browser',
      };
    }

    const currentPermission = Notification.permission;

    if (currentPermission === 'granted') {
      console.log('FCM: Notification permission already granted');
      cachePermission('granted');
      return { success: true, permission: 'granted' };
    }

    if (currentPermission === 'denied') {
      console.warn('FCM: Notification permission was denied by user');
      cachePermission('denied');
      return {
        success: false,
        permission: 'denied',
        error: 'Notification permission was denied. Please enable it in browser settings.',
      };
    }

    console.log('FCM: Requesting notification permission...');
    const permission = await Notification.requestPermission();

    console.log('FCM: Permission result:', permission);
    cachePermission(permission);

    return {
      success: permission === 'granted',
      permission,
      error: permission !== 'granted' ? 'User did not grant notification permission' : undefined,
    };
  } catch (error) {
    console.error('FCM: Permission request failed:', error);
    return {
      success: false,
      permission: 'error',
      error: error.message || 'Failed to request notification permission',
    };
  }
};

/**
 * Log specific FCM error codes
 * @param {Error} error - Error object
 */
const logFCMError = (error) => {
  const errorCode = error.code || '';
  
  const errorMessages = {
    'messaging/permission-blocked': 
      'Notifications are blocked. Please enable them in browser settings.',
    'messaging/unsupported-browser': 
      'This browser does not support Firebase Cloud Messaging.',
    'messaging/failed-service-worker-registration': 
      'Service worker registration failed. Check if firebase-messaging-sw.js exists in public folder.',
    'messaging/token-subscribe-failed': 
      'Failed to subscribe for push notifications. Check VAPID key and Firebase project settings.',
  };

  const message = errorMessages[errorCode];
  if (message) {
    console.error(`FCM: ${message}`);
  }
};

/**
 * Get FCM token for this device
 * @returns {Promise<string|null>}
 */
export const getFCMToken = async () => {
  try {
    console.log('FCM: Starting token acquisition...');

    // Check for cached token first
    const cachedToken = getCachedToken();
    if (cachedToken) {
      console.log('FCM: Using cached token');
      return cachedToken;
    }

    const supported = await isFCMSupported();
    if (!supported) {
      console.warn('FCM: Not supported, returning null');
      return null;
    }

    if (!validateVapidKey()) {
      console.error('FCM: Invalid VAPID key, returning null');
      return null;
    }

    const { success: permissionGranted, permission, error: permissionError } =
      await requestNotificationPermission();

    if (!permissionGranted) {
      console.warn('FCM: Permission not granted:', permission, permissionError);
      return null;
    }

    const swRegistration = await registerServiceWorker();
    if (!swRegistration) {
      console.error('FCM: Service worker registration failed');
      return null;
    }

    const messagingInstance = await initializeMessaging();
    if (!messagingInstance) {
      console.error('FCM: Messaging initialization failed');
      return null;
    }

    console.log('FCM: Requesting token with VAPID key...');

    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log('FCM: Token obtained successfully');
      console.log('FCM: Token preview:', `${token.substring(0, 30)}...`);
      cacheToken(token);
      return token;
    }

    console.warn('FCM: No token returned from getToken()');
    return null;
  } catch (error) {
    console.error('FCM: Failed to get token:', error);
    logFCMError(error);
    return null;
  }
};

/**
 * Delay helper using Promise
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get FCM token with retry logic
 * @param {number} [maxRetries=3] - Maximum retry attempts
 * @param {number} [delayMs=1000] - Delay between retries in milliseconds
 * @returns {Promise<string|null>}
 */
export const getFCMTokenWithRetry = async (maxRetries = 3, delayMs = 1000) => {
  // Check cache first
  const cachedToken = getCachedToken();
  if (cachedToken) {
    console.log('FCM: Returning cached token');
    return cachedToken;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`FCM: Token attempt ${attempt}/${maxRetries}`);

    const token = await getFCMToken();

    if (token) {
      return token;
    }

    if (attempt < maxRetries) {
      console.log(`FCM: Retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }

  console.warn('FCM: All retry attempts failed');
  return null;
};

/**
 * Listen for foreground messages
 * @param {Function} callback - Callback function for received messages
 * @returns {Function} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) {
    console.warn('FCM: Messaging not initialized, cannot listen for messages');
    return () => {};
  }

  // Clean up previous listener if exists
  if (messageUnsubscribe) {
    messageUnsubscribe();
  }

  console.log('FCM: Setting up foreground message listener');

  messageUnsubscribe = onMessage(messaging, (payload) => {
    console.log('FCM: Foreground message received:', payload);
    callback(payload);
  });

  return () => {
    if (messageUnsubscribe) {
      messageUnsubscribe();
      messageUnsubscribe = null;
    }
  };
};

/**
 * Handle notification click
 * @param {Notification} notification - Notification instance
 * @param {string} [url] - URL to navigate to
 */
const handleNotificationClick = (notification, url) => {
  notification.close();
  
  if (url && typeof url === 'string') {
    // Use window.location.href for navigation (unavoidable for notifications)
    window.location.href = url;
  }
};

/**
 * Show a local notification
 * @param {string} title - Notification title
 * @param {Object} [options] - Notification options
 * @param {string} [options.body] - Notification body
 * @param {string} [options.icon] - Notification icon
 * @param {string} [options.tag] - Notification tag
 * @param {string} [options.url] - URL to open on click
 * @param {boolean} [options.autoClose] - Whether to auto-close
 * @param {number} [options.duration] - Auto-close duration in ms
 * @returns {Notification|null}
 */
export const showLocalNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    console.warn('FCM: Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('FCM: Notification permission not granted');
    return null;
  }

  try {
    const {
      url,
      autoClose = true,
      duration = DEFAULT_NOTIFICATION_DURATION,
      ...notificationOptions
    } = options;

    const finalOptions = {
      icon: '/logo192.png',
      badge: '/badge.png',
      tag: 'mediconnect-notification',
      renotify: true,
      requireInteraction: false,
      silent: false,
      ...notificationOptions,
    };

    const notification = new Notification(title, finalOptions);

    notification.onclick = () => handleNotificationClick(notification, url);

    if (autoClose) {
      setTimeout(() => {
        notification.close();
      }, duration);
    }

    return notification;
  } catch (error) {
    console.error('FCM: Failed to show notification:', error);
    return null;
  }
};

/**
 * Delete FCM token (call on logout)
 * @returns {Promise<boolean>}
 */
export const deleteFCMToken = async () => {
  try {
    // Clear cached token
    cacheToken(null);

    // Clean up message listener
    if (messageUnsubscribe) {
      messageUnsubscribe();
      messageUnsubscribe = null;
    }

    if (!messaging) {
      console.log('FCM: No messaging instance to delete token from');
      return true;
    }

    await deleteToken(messaging);
    console.log('FCM: Token deleted successfully');
    return true;
  } catch (error) {
    console.error('FCM: Failed to delete token:', error);
    return false;
  }
};

/**
 * Get current notification permission status
 * @returns {string} Permission status ('granted', 'denied', 'default', or 'unsupported')
 */
export const getPermissionStatus = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Check if FCM is fully configured and ready
 * @returns {Promise<{ready: boolean, issues: string[]}>}
 */
export const checkFCMReadiness = async () => {
  const issues = [];
  const MIN_VAPID_KEY_LENGTH = 50;

  // Check browser APIs
  const { supported, missing } = checkBrowserAPIs();
  if (!supported) {
    issues.push(...missing.map((api) => `${api} not supported`));
  }

  // Check VAPID key
  if (!VAPID_KEY) {
    issues.push('VAPID key not configured (VITE_FIREBASE_VAPID_KEY)');
  } else if (VAPID_KEY.length < MIN_VAPID_KEY_LENGTH) {
    issues.push('VAPID key appears to be invalid');
  }

  // Check Firebase support
  try {
    const supported = await isSupported();
    if (!supported) {
      issues.push('Firebase Messaging not supported');
    }
  } catch (error) {
    issues.push(`Firebase Messaging check failed: ${error.message}`);
  }

  // Check permission
  if ('Notification' in window && Notification.permission === 'denied') {
    issues.push('Notification permission denied by user');
  }

  return {
    ready: issues.length === 0,
    issues,
  };
};

/**
 * Clear all FCM related data (for logout/reset)
 */
export const clearFCMData = () => {
  try {
    removeFromStorage(STORAGE_KEYS.FCM_TOKEN);
    removeFromStorage(STORAGE_KEYS.FCM_PERMISSION);

    if (messageUnsubscribe) {
      messageUnsubscribe();
      messageUnsubscribe = null;
    }

    console.log('FCM: Data cleared');
  } catch (error) {
    console.warn('FCM: Failed to clear data:', error.message);
  }
};

/**
 * FCM Service default export
 * Groups all FCM-related methods
 */
export default {
  // Support checks
  isFCMSupported,
  checkFCMReadiness,
  getPermissionStatus,
  // Initialization
  initializeMessaging,
  requestNotificationPermission,
  // Token management
  getFCMToken,
  getFCMTokenWithRetry,
  deleteFCMToken,
  // Messaging
  onForegroundMessage,
  showLocalNotification,
  // Cleanup
  clearFCMData,
};