// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set language for SMS
auth.languageCode = 'en';

// Module-level state (not attached to window)
let recaptchaVerifier = null;
let confirmationResult = null;

// Session storage keys
const STORAGE_KEYS = {
  PHONE_AUTH_STATE: 'phone_auth_state',
  LAST_OTP_SENT: 'last_otp_sent'
};

/**
 * Safe sessionStorage setter
 */
const setToSession = (key, value) => {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Safe sessionStorage getter
 */
const getFromSession = (key, defaultValue = null) => {
  try {
    const value = sessionStorage.getItem(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch {
    return defaultValue;
  }
};

/**
 * Clear reCAPTCHA verifier
 */
const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (error) {
      console.warn('Firebase: Error clearing reCAPTCHA:', error.message);
    }
    recaptchaVerifier = null;
  }
};

/**
 * Setup reCAPTCHA verifier
 * @param {string} containerId - DOM element ID for reCAPTCHA
 * @returns {RecaptchaVerifier}
 */
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  // Clear existing verifier
  clearRecaptcha();

  // Check if container exists
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Firebase: Container #${containerId} not found`);
    return null;
  }

  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('Firebase: reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('Firebase: reCAPTCHA expired');
        clearRecaptcha();
      },
      'error-callback': (error) => {
        console.error('Firebase: reCAPTCHA error:', error);
        clearRecaptcha();
      }
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('Firebase: Failed to setup reCAPTCHA:', error);
    return null;
  }
};

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - 10-digit phone number
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendOTP = async (phoneNumber) => {
  try {
    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return {
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      };
    }

    // Format with country code
    const formattedPhone = `+91${cleanPhone}`;

    // Rate limiting check (prevent spam)
    const lastOtpSent = getFromSession(STORAGE_KEYS.LAST_OTP_SENT);
    if (lastOtpSent) {
      const timeSinceLastOtp = Date.now() - lastOtpSent;
      if (timeSinceLastOtp < 30000) { // 30 seconds
        const waitTime = Math.ceil((30000 - timeSinceLastOtp) / 1000);
        return {
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another OTP`
        };
      }
    }

    // Setup reCAPTCHA
    const verifier = setupRecaptcha('recaptcha-container');
    if (!verifier) {
      return {
        success: false,
        message: 'Failed to initialize verification. Please refresh the page.'
      };
    }

    // Send OTP
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);

    // Store state
    setToSession(STORAGE_KEYS.PHONE_AUTH_STATE, 'otp_sent');
    setToSession(STORAGE_KEYS.LAST_OTP_SENT, Date.now());

    console.log('Firebase: OTP sent successfully');

    return {
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Firebase: Error sending OTP:', error);

    // Clear reCAPTCHA on error
    clearRecaptcha();
    confirmationResult = null;
    setToSession(STORAGE_KEYS.PHONE_AUTH_STATE, null);

    // Map error codes to user-friendly messages
    const errorMessages = {
      'auth/invalid-phone-number': 'Invalid phone number format',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/quota-exceeded': 'SMS quota exceeded. Please try again later',
      'auth/captcha-check-failed': 'Verification failed. Please try again',
      'auth/missing-phone-number': 'Phone number is required',
      'auth/user-disabled': 'This account has been disabled',
      'auth/operation-not-allowed': 'Phone authentication is not enabled'
    };

    const message = errorMessages[error.code] || error.message || 'Failed to send OTP';

    return {
      success: false,
      message
    };
  }
};

/**
 * Verify OTP
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{success: boolean, user?: object, token?: string, message?: string}>}
 */
export const verifyOTP = async (otp) => {
  try {
    // Validate OTP format
    const cleanOtp = otp.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit OTP'
      };
    }

    // Check if we have a pending confirmation
    if (!confirmationResult) {
      return {
        success: false,
        message: 'No OTP request found. Please request a new OTP.'
      };
    }

    // Verify OTP
    const result = await confirmationResult.confirm(cleanOtp);
    const user = result.user;

    // Get Firebase ID token
    const idToken = await user.getIdToken();

    // Clear state after successful verification
    confirmationResult = null;
    clearRecaptcha();
    setToSession(STORAGE_KEYS.PHONE_AUTH_STATE, 'verified');

    console.log('Firebase: OTP verified successfully');

    return {
      success: true,
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber
      },
      token: idToken
    };
  } catch (error) {
    console.error('Firebase: Error verifying OTP:', error);

    // Map error codes to user-friendly messages
    const errorMessages = {
      'auth/invalid-verification-code': 'Invalid OTP. Please check and try again',
      'auth/code-expired': 'OTP has expired. Please request a new one',
      'auth/missing-verification-code': 'Please enter the OTP',
      'auth/invalid-verification-id': 'Verification session expired. Please request a new OTP'
    };

    const message = errorMessages[error.code] || error.message || 'Failed to verify OTP';

    return {
      success: false,
      message
    };
  }
};

/**
 * Get current user's Firebase token
 * @param {boolean} forceRefresh - Force token refresh
 * @returns {Promise<string|null>}
 */
export const getFirebaseToken = async (forceRefresh = false) => {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken(forceRefresh);
    }
    return null;
  } catch (error) {
    console.error('Firebase: Error getting token:', error);
    return null;
  }
};

/**
 * Get current Firebase user
 * @returns {User|null}
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Sign out from Firebase
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);

    // Clear all auth-related state
    confirmationResult = null;
    clearRecaptcha();

    // Clear session storage
    setToSession(STORAGE_KEYS.PHONE_AUTH_STATE, null);
    setToSession(STORAGE_KEYS.LAST_OTP_SENT, null);

    console.log('Firebase: Signed out successfully');

    return { success: true };
  } catch (error) {
    console.error('Firebase: Error signing out:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to sign out'
    };
  }
};

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return auth.onAuthStateChanged(callback);
};

/**
 * Check if user is currently authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Clear all Firebase auth data (for cleanup/reset)
 */
export const clearFirebaseAuthData = () => {
  confirmationResult = null;
  clearRecaptcha();
  setToSession(STORAGE_KEYS.PHONE_AUTH_STATE, null);
  setToSession(STORAGE_KEYS.LAST_OTP_SENT, null);
};

// Export auth instance and app
export { auth };
export default app;