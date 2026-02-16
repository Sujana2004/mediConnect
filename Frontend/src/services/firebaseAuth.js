// Frontend/src/services/firebaseAuth.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ============================================
// CHECK IF FIREBASE IS PROPERLY CONFIGURED
// ============================================
const isFirebaseConfigured = () => {
  const apiKey = firebaseConfig.apiKey;
  return (
    apiKey &&
    apiKey !== 'undefined' &&
    apiKey !== '' &&
    !apiKey.includes('your_') &&
    !apiKey.includes('your-') &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'undefined'
  );
};

// ============================================
// INITIALIZE FIREBASE (only if configured)
// ============================================
let app = null;
let auth = null;
let firebaseInitialized = false;

// Check if we should use mock auth
const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

if (!useMockAuth && isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = 'en';
    firebaseInitialized = true;
    console.log('%c[Firebase] Initialized successfully', 'color: #10b981');
  } catch (error) {
    console.warn('[Firebase] Initialization failed:', error.message);
    console.log('%c[Firebase] Using mock authentication', 'color: #f59e0b');
  }
} else {
  if (useMockAuth) {
    console.log('%c[Firebase] Mock auth enabled via VITE_USE_MOCK_AUTH', 'color: #3b82f6');
  } else {
    console.log('%c[Firebase] Not configured - using mock authentication', 'color: #f59e0b');
  }
}

// ============================================
// MODULE-LEVEL STATE
// ============================================
let confirmationResult = null;
let recaptchaVerifier = null;

// ============================================
// HELPER: Check if Firebase is available
// ============================================
export function isFirebaseAvailable() {
  return firebaseInitialized && auth !== null;
}

export function isFirebaseInitialized() {
  return firebaseInitialized;
}

// ============================================
// RECAPTCHA MANAGEMENT
// ============================================
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!isFirebaseAvailable()) {
    console.warn('[Firebase] Not available for reCAPTCHA setup');
    return null;
  }

  try {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (e) {
        // Ignore clear errors
      }
      recaptchaVerifier = null;
    }

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('[Firebase] reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.warn('[Firebase] reCAPTCHA expired');
        recaptchaVerifier = null;
      },
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('[Firebase] reCAPTCHA setup error:', error);
    return null;
  }
}

export function clearRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {
      // Ignore errors
    }
    recaptchaVerifier = null;
  }
}

// ============================================
// PHONE NUMBER UTILITIES
// ============================================
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Please enter your phone number.');
  }

  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (cleaned.startsWith('+91') && digits.length === 12) {
    return `+${digits}`;
  }

  throw new Error('Invalid phone number. Please enter a 10-digit Indian mobile number.');
}

// ============================================
// OTP FUNCTIONS
// ============================================
export async function sendOTP(phoneNumber, recaptchaContainerId = 'recaptcha-container') {
  if (!isFirebaseAvailable()) {
    return {
      success: false,
      error: 'Firebase not configured. Using mock authentication.',
      useMock: true,
    };
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const verifier = setupRecaptcha(recaptchaContainerId);

    if (!verifier) {
      throw new Error('Failed to setup verification');
    }

    confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
    console.log('[Firebase] OTP sent to:', normalizedPhone);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  } catch (error) {
    console.error('[Firebase] Send OTP error:', error);
    clearRecaptcha();

    return {
      success: false,
      error: parseFirebaseError(error),
    };
  }
}

export async function verifyOTP(otp) {
  if (!isFirebaseAvailable()) {
    return {
      success: false,
      error: 'Firebase not configured.',
      useMock: true,
    };
  }

  try {
    if (!confirmationResult) {
      throw new Error('No OTP request found. Please request a new OTP.');
    }

    if (!otp || !/^\d{6}$/.test(otp.trim())) {
      throw new Error('Please enter a valid 6-digit OTP.');
    }

    const result = await confirmationResult.confirm(otp.trim());
    const firebaseUser = result.user;
    const token = await firebaseUser.getIdToken(true);

    console.log('[Firebase] OTP verified for:', firebaseUser.phoneNumber);

    return {
      success: true,
      user: {
        uid: firebaseUser.uid,
        phoneNumber: firebaseUser.phoneNumber,
        displayName: firebaseUser.displayName,
      },
      token,
    };
  } catch (error) {
    console.error('[Firebase] Verify OTP error:', error);
    return {
      success: false,
      error: parseFirebaseError(error),
    };
  }
}

export async function resendOTP(phoneNumber, recaptchaContainerId = 'recaptcha-container') {
  confirmationResult = null;
  clearRecaptcha();
  return sendOTP(phoneNumber, recaptchaContainerId);
}

// ============================================
// TOKEN & USER FUNCTIONS
// ============================================
export async function getFirebaseToken(forceRefresh = false) {
  if (!isFirebaseAvailable() || !auth?.currentUser) {
    return null;
  }

  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (error) {
    console.error('[Firebase] Get token error:', error);
    return null;
  }
}

export const getIdToken = getFirebaseToken;

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export function isFirebaseAuthenticated() {
  return !!auth?.currentUser;
}

export function onAuthStateChange(callback) {
  if (!isFirebaseAvailable()) {
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

// ============================================
// SIGN OUT
// ============================================
export async function signOutFirebase() {
  try {
    if (isFirebaseAvailable()) {
      await firebaseSignOut(auth);
    }

    confirmationResult = null;
    clearRecaptcha();

    return { success: true };
  } catch (error) {
    console.error('[Firebase] Sign out error:', error);
    return {
      success: false,
      error: error.message || 'Sign out failed',
    };
  }
}

// ============================================
// ERROR PARSING
// ============================================
export function parseFirebaseError(error) {
  const errorCode = error?.code || '';

  const errorMessages = {
    'auth/invalid-phone-number': 'Invalid phone number format.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/quota-exceeded': 'SMS limit reached. Try again later.',
    'auth/invalid-verification-code': 'Invalid OTP. Please try again.',
    'auth/code-expired': 'OTP expired. Please request a new one.',
    'auth/missing-verification-code': 'Please enter the OTP.',
    'auth/invalid-verification-id': 'Session expired. Request a new OTP.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/captcha-check-failed': 'Verification failed. Refresh and try again.',
    'auth/invalid-api-key': 'Firebase not configured properly.',
    'auth/app-not-authorized': 'App not authorized for Firebase.',
  };

  return errorMessages[errorCode] || error?.message || 'An error occurred.';
}

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  setupRecaptcha,
  clearRecaptcha,
  normalizePhoneNumber,
  sendOTP,
  verifyOTP,
  resendOTP,
  getFirebaseToken,
  getIdToken,
  getCurrentUser,
  isFirebaseAuthenticated,
  isFirebaseInitialized,
  isFirebaseAvailable,
  onAuthStateChange,
  signOutFirebase,
  parseFirebaseError,
};