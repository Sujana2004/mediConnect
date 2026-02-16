// src/hooks/storage.js

/**
 * Local Storage Management for MediConnect
 * Handles tokens, user data, and app preferences
 *
 * IMPORTANT: This is the single source of truth for all client-side storage.
 * All components and services should import from here rather than
 * accessing localStorage directly.
 */

// ============================================
// STORAGE KEYS (centralized to prevent typos)
// ============================================
const KEYS = {
  ACCESS_TOKEN: 'mediconnect_access_token',
  REFRESH_TOKEN: 'mediconnect_refresh_token',
  TOKEN_EXPIRY: 'mediconnect_token_expiry',
  USER: 'mediconnect_user',
  LANGUAGE: 'mediconnect_language',
  FCM_TOKEN: 'mediconnect_fcm_token',
  THEME: 'mediconnect_theme',
  VOICE_ENABLED: 'mediconnect_voice_enabled',
  VOICE_RATE: 'mediconnect_voice_rate',
  ONBOARDING_COMPLETED: 'mediconnect_onboarding_completed',
  PENDING_PHONE: 'mediconnect_pending_phone',
  LAST_ACTIVE: 'mediconnect_last_active',
};

// ============================================
// VALID VALUES (prevents invalid data)
// ============================================
const VALID_LANGUAGES = ['en', 'hi', 'te'];
const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_ROLES = ['patient', 'doctor', 'admin'];

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// ============================================
// SAFE LOCALSTORAGE WRAPPER
// ============================================
const storage = {
  /**
   * Get a string value from localStorage
   * @param {string} key - Storage key
   * @param {string|null} defaultValue - Default if not found
   * @returns {string|null}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  /**
   * Set a string value in localStorage
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @returns {boolean} - Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      // Handle quota exceeded
      if (
        error instanceof DOMException &&
        (error.code === 22 ||
          error.code === 1014 ||
          error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        console.warn('localStorage quota exceeded. Attempting cleanup...');
        cleanupExpiredData();
        // Retry once after cleanup
        try {
          localStorage.setItem(key, value);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Remove a key from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} - Success status
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  },

  /**
   * Clear all localStorage
   * @returns {boolean} - Success status
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  /**
   * Get and parse a JSON value from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default if not found or parse fails
   * @returns {*} - Parsed value
   */
  getJSON(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      const parsed = JSON.parse(item);
      return parsed !== null ? parsed : defaultValue;
    } catch (error) {
      console.error(`Error parsing JSON from localStorage (${key}):`, error);
      // Remove corrupted data
      storage.remove(key);
      return defaultValue;
    }
  },

  /**
   * Stringify and set a JSON value in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to stringify and store
   * @returns {boolean} - Success status
   */
  setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error stringifying JSON to localStorage (${key}):`, error);
      return false;
    }
  },
};

// ============================================
// HELPER FUNCTION (defined early for use later)
// ============================================

/**
 * Clean up expired or stale data
 * Called when storage quota is exceeded
 */
const cleanupExpiredData = () => {
  try {
    // Remove expired token data
    const expiry = storage.get(KEYS.TOKEN_EXPIRY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      storage.remove(KEYS.ACCESS_TOKEN);
      storage.remove(KEYS.REFRESH_TOKEN);
      storage.remove(KEYS.TOKEN_EXPIRY);
      storage.remove(KEYS.USER);
    }

    // Remove stale pending phone
    storage.remove(KEYS.PENDING_PHONE);

    console.log('Storage cleanup completed');
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
};

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Get the current access token
 * @returns {string|null}
 */
export const getToken = () => {
  return storage.get(KEYS.ACCESS_TOKEN);
};

/**
 * Save the access token
 * @param {string} token
 * @returns {boolean}
 */
export const setToken = (token) => {
  if (!token || typeof token !== 'string') {
    console.error('Invalid token provided to setToken');
    return false;
  }
  return storage.set(KEYS.ACCESS_TOKEN, token);
};

/**
 * Remove the access token
 * @returns {boolean}
 */
export const removeToken = () => {
  return storage.remove(KEYS.ACCESS_TOKEN);
};

/**
 * Get the refresh token
 * @returns {string|null}
 */
export const getRefreshToken = () => {
  return storage.get(KEYS.REFRESH_TOKEN);
};

/**
 * Save the refresh token
 * @param {string} token
 * @returns {boolean}
 */
export const setRefreshToken = (token) => {
  if (!token || typeof token !== 'string') {
    console.error('Invalid token provided to setRefreshToken');
    return false;
  }
  return storage.set(KEYS.REFRESH_TOKEN, token);
};

/**
 * Remove the refresh token
 * @returns {boolean}
 */
export const removeRefreshToken = () => {
  return storage.remove(KEYS.REFRESH_TOKEN);
};

/**
 * Save both tokens at once (convenience for login)
 * @param {string} accessToken
 * @param {string} refreshToken
 * @returns {boolean}
 */
export const setTokens = (accessToken, refreshToken) => {
  const accessResult = setToken(accessToken);
  const refreshResult = refreshToken ? setRefreshToken(refreshToken) : true;
  return accessResult && refreshResult;
};

/**
 * Remove both tokens at once
 * @returns {boolean}
 */
export const removeTokens = () => {
  const accessResult = removeToken();
  const refreshResult = removeRefreshToken();
  storage.remove(KEYS.TOKEN_EXPIRY);
  return accessResult && refreshResult;
};

/**
 * Set token expiry timestamp
 * @param {number} expiryTimestamp - Unix timestamp in milliseconds
 * @returns {boolean}
 */
export const setTokenExpiry = (expiryTimestamp) => {
  return storage.set(KEYS.TOKEN_EXPIRY, String(expiryTimestamp));
};

/**
 * Check if token has expired based on stored expiry
 * @returns {boolean} - true if expired or no expiry set
 */
export const isTokenExpired = () => {
  const expiry = storage.get(KEYS.TOKEN_EXPIRY);
  if (!expiry) return false; // No expiry tracking, assume valid
  return Date.now() > parseInt(expiry, 10);
};

// ============================================
// ALIASES FOR API.JS COMPATIBILITY
// (Must be defined AFTER the original functions)
// ============================================

/** Alias for setToken - used by api.js */
export const saveToken = setToken;

/** Alias for setRefreshToken - used by api.js */
export const saveRefreshToken = setRefreshToken;

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Get the current user object
 * @returns {object|null}
 */
export const getUser = () => {
  return storage.getJSON(KEYS.USER);
};

/**
 * Save the user object
 * @param {object} user
 * @returns {boolean}
 */
export const setUser = (user) => {
  if (!user || typeof user !== 'object') {
    console.error('Invalid user data provided to setUser');
    return false;
  }
  return storage.setJSON(KEYS.USER, user);
};

/**
 * Update specific fields of the user object
 * @param {object} updates - Fields to update
 * @returns {boolean}
 */
export const updateUser = (updates) => {
  if (!updates || typeof updates !== 'object') {
    console.error('Invalid updates provided to updateUser');
    return false;
  }

  const currentUser = getUser();
  if (!currentUser) {
    console.warn('No user found to update');
    return false;
  }

  const updatedUser = { ...currentUser, ...updates };
  return setUser(updatedUser);
};

/**
 * Remove the user object
 * @returns {boolean}
 */
export const removeUser = () => {
  return storage.remove(KEYS.USER);
};

/**
 * Get the current user's role
 * @returns {string|null} - 'patient', 'doctor', 'admin', or null
 */
export const getUserRole = () => {
  const user = getUser();
  const role = user?.role || null;

  // Validate role
  if (role && !VALID_ROLES.includes(role)) {
    console.warn(`Invalid role found in storage: ${role}`);
    return null;
  }

  return role;
};

/**
 * Check if current user is a patient
 * @returns {boolean}
 */
export const isPatient = () => {
  return getUserRole() === 'patient';
};

/**
 * Check if current user is a doctor
 * @returns {boolean}
 */
export const isDoctor = () => {
  return getUserRole() === 'doctor';
};

// /**
//  * Check if current user is an admin
//  * @returns {boolean}
//  */
// export const isAdmin = () => {
//   return getUserRole() === 'admin';
// };

/**
 * Get the current user's ID
 * @returns {string|number|null}
 */
export const getUserId = () => {
  const user = getUser();
  return user?.id || null;
};

/**
 * Get the current user's display name
 * @returns {string}
 */
export const getUserDisplayName = () => {
  const user = getUser();
  if (!user) return '';

  if (user.full_name) return user.full_name;
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  if (user.name) return user.name;
  return user.phone_number || '';
};

// ============================================
// LANGUAGE MANAGEMENT
// ============================================

/**
 * Get the current language
 * @returns {string} - 'en', 'hi', or 'te'
 */
export const getLanguage = () => {
  const lang = storage.get(KEYS.LANGUAGE, 'en');
  // Validate stored language
  return VALID_LANGUAGES.includes(lang) ? lang : 'en';
};

/**
 * Set the preferred language
 * @param {string} lang - 'en', 'hi', or 'te'
 * @returns {boolean}
 */
export const setLanguage = (lang) => {
  if (!VALID_LANGUAGES.includes(lang)) {
    console.error(
      `Invalid language: ${lang}. Valid options: ${VALID_LANGUAGES.join(', ')}`
    );
    return false;
  }
  const result = storage.set(KEYS.LANGUAGE, lang);

  // Update HTML lang attribute for accessibility
  if (result) {
    try {
      document.documentElement.lang = lang;
      // Set text direction (future-proofing for RTL languages)
      document.documentElement.dir = 'ltr';
    } catch {
      // Not critical if this fails
    }
  }

  return result;
};

/**
 * Get the language display name
 * @param {string} code - Language code
 * @returns {string}
 */
export const getLanguageDisplayName = (code) => {
  const names = {
    en: 'English',
    hi: 'हिन्दी (Hindi)',
    te: 'తెలుగు (Telugu)',
  };
  return names[code] || code;
};

// ============================================
// FCM TOKEN MANAGEMENT
// ============================================

/**
 * Get the FCM (push notification) token
 * @returns {string|null}
 */
export const getFCMToken = () => {
  return storage.get(KEYS.FCM_TOKEN);
};

/**
 * Save the FCM token
 * @param {string} token
 * @returns {boolean}
 */
export const setFCMToken = (token) => {
  if (!token || typeof token !== 'string') {
    console.error('Invalid FCM token provided');
    return false;
  }
  return storage.set(KEYS.FCM_TOKEN, token);
};

/**
 * Remove the FCM token
 * @returns {boolean}
 */
export const removeFCMToken = () => {
  return storage.remove(KEYS.FCM_TOKEN);
};

/**
 * Check if FCM token has changed (useful to decide if re-registration needed)
 * @param {string} newToken
 * @returns {boolean}
 */
export const hasFCMTokenChanged = (newToken) => {
  const currentToken = getFCMToken();
  return currentToken !== newToken;
};

// ============================================
// VOICE SETTINGS
// ============================================

/**
 * Check if voice output is enabled
 * @returns {boolean}
 */
export const isVoiceEnabled = () => {
  const value = storage.get(KEYS.VOICE_ENABLED, 'true');
  return value === 'true';
};

/**
 * Enable or disable voice output
 * @param {boolean} enabled
 * @returns {boolean}
 */
export const setVoiceEnabled = (enabled) => {
  return storage.set(KEYS.VOICE_ENABLED, String(!!enabled));
};

/**
 * Get the voice speech rate
 * @returns {number} - Between 0.5 and 2.0
 */
export const getVoiceRate = () => {
  const rate = parseFloat(storage.get(KEYS.VOICE_RATE, '0.9'));
  if (isNaN(rate) || rate < 0.5 || rate > 2.0) return 0.9;
  return rate;
};

/**
 * Set the voice speech rate
 * @param {number} rate - Between 0.5 and 2.0
 * @returns {boolean}
 */
export const setVoiceRate = (rate) => {
  const numRate = parseFloat(rate);
  if (isNaN(numRate)) {
    console.error('Invalid voice rate provided');
    return false;
  }
  const clampedRate = Math.max(0.5, Math.min(2.0, numRate));
  return storage.set(KEYS.VOICE_RATE, String(clampedRate));
};

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Get the current theme
 * @returns {string} - 'light', 'dark', or 'system'
 */
export const getTheme = () => {
  const theme = storage.get(KEYS.THEME, 'light');
  return VALID_THEMES.includes(theme) ? theme : 'light';
};

/**
 * Set the preferred theme
 * @param {string} theme - 'light', 'dark', or 'system'
 * @returns {boolean}
 */
export const setTheme = (theme) => {
  if (!VALID_THEMES.includes(theme)) {
    console.error(
      `Invalid theme: ${theme}. Valid options: ${VALID_THEMES.join(', ')}`
    );
    return false;
  }
  return storage.set(KEYS.THEME, theme);
};

/**
 * Get the resolved theme (handles 'system' preference)
 * @returns {string} - 'light' or 'dark'
 */
export const getResolvedTheme = () => {
  const theme = getTheme();
  if (theme === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  }
  return theme;
};

// ============================================
// AUTHENTICATION STATUS
// ============================================

/**
 * Check if user is authenticated (has token + user data)
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = getToken();
  const user = getUser();

  if (!token || !user) return false;

  // Check token expiry if we're tracking it
  if (isTokenExpired()) {
    // Don't clear here - let the API interceptor handle refresh
    return false;
  }

  return true;
};

/**
 * Check if user has a valid session with complete data
 * @returns {boolean}
 */
export const hasValidSession = () => {
  if (!isAuthenticated()) return false;

  const user = getUser();
  const role = user?.role;

  return !!(user?.id && role && VALID_ROLES.includes(role));
};

// ============================================
// SESSION ACTIVITY TRACKING
// ============================================

/**
 * Update the last active timestamp
 * @returns {boolean}
 */
export const updateLastActive = () => {
  return storage.set(KEYS.LAST_ACTIVE, String(Date.now()));
};

/**
 * Check if the session has timed out due to inactivity
 * @returns {boolean}
 */
export const isSessionTimedOut = () => {
  const lastActive = storage.get(KEYS.LAST_ACTIVE);
  if (!lastActive) return false;

  const elapsed = Date.now() - parseInt(lastActive, 10);
  return elapsed > SESSION_TIMEOUT_MS;
};

/**
 * Get milliseconds since last activity
 * @returns {number|null}
 */
export const getTimeSinceLastActive = () => {
  const lastActive = storage.get(KEYS.LAST_ACTIVE);
  if (!lastActive) return null;
  return Date.now() - parseInt(lastActive, 10);
};

// ============================================
// ONBOARDING STATUS
// ============================================

/**
 * Mark onboarding as completed
 * @param {boolean} completed
 * @returns {boolean}
 */
export const setOnboardingCompleted = (completed = true) => {
  return storage.set(KEYS.ONBOARDING_COMPLETED, String(!!completed));
};

/**
 * Check if onboarding has been completed
 * @returns {boolean}
 */
export const isOnboardingCompleted = () => {
  const value = storage.get(KEYS.ONBOARDING_COMPLETED, 'false');
  return value === 'true';
};

/**
 * Clear onboarding status
 * @returns {boolean}
 */
export const clearOnboardingStatus = () => {
  return storage.remove(KEYS.ONBOARDING_COMPLETED);
};

// ============================================
// PENDING PHONE (for OTP flow)
// ============================================

/**
 * Save phone number pending OTP verification
 * @param {string} phone
 * @returns {boolean}
 */
export const setPendingPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    console.error('Invalid phone number provided');
    return false;
  }
  return storage.set(KEYS.PENDING_PHONE, phone);
};

/**
 * Get the pending phone number
 * @returns {string|null}
 */
export const getPendingPhone = () => {
  return storage.get(KEYS.PENDING_PHONE);
};

/**
 * Clear the pending phone number
 * @returns {boolean}
 */
export const clearPendingPhone = () => {
  return storage.remove(KEYS.PENDING_PHONE);
};

// ============================================
// CLEAR STORAGE
// ============================================

/**
 * Clear authentication-related storage only
 * Preserves: language, theme, voice settings, onboarding status
 * @returns {boolean}
 */
export const clearAuthStorage = () => {
  try {
    removeToken();
    removeRefreshToken();
    removeUser();
    removeFCMToken();
    clearPendingPhone();
    storage.remove(KEYS.TOKEN_EXPIRY);
    storage.remove(KEYS.LAST_ACTIVE);
    return true;
  } catch (error) {
    console.error('Error clearing auth storage:', error);
    return false;
  }
};

/** Alias for clearAuthStorage - used by api.js */
export const clearStorage = clearAuthStorage;

/**
 * Clear all storage including preferences
 * @returns {boolean}
 */
export const clearAllStorage = () => {
  return storage.clear();
};

// ============================================
// LEGACY SUPPORT / ALIASES
// ============================================

/** @deprecated Use getUser() instead */
export const getUserData = getUser;

/** @deprecated Use setUser() instead */
export const setUserData = setUser;

/** @deprecated Use removeUser() instead */
export const removeUserData = removeUser;

/**
 * Set the user's role
 * @param {string} role
 * @returns {boolean}
 */
export const setUserRole = (role) => {
  if (!VALID_ROLES.includes(role)) {
    console.error(
      `Invalid role: ${role}. Valid options: ${VALID_ROLES.join(', ')}`
    );
    return false;
  }

  const user = getUser();
  if (user) {
    return setUser({ ...user, role });
  }
  return setUser({ role });
};

/** @deprecated Use removeUser() instead */
export const removeUserRole = removeUser;

// ============================================
// STORAGE INFO / DEBUG
// ============================================

/**
 * Get storage usage information (useful for debugging)
 * @returns {object}
 */
export const getStorageInfo = () => {
  try {
    let totalSize = 0;
    const items = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = new Blob([key + value]).size;
      totalSize += size;

      // Only show mediconnect keys
      if (key.startsWith('mediconnect_')) {
        items[key] = {
          size: `${(size / 1024).toFixed(2)} KB`,
          hasValue: !!value,
          // Don't expose sensitive values
          preview:
            key.includes('token') || key.includes('TOKEN')
              ? '[REDACTED]'
              : value?.substring(0, 50),
        };
      }
    }

    return {
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      itemCount: localStorage.length,
      mediconnectItems: items,
      isAuthenticated: isAuthenticated(),
      userRole: getUserRole(),
      language: getLanguage(),
      theme: getTheme(),
    };
  } catch (error) {
    return { error: error.message };
  }
};

// ============================================
// EXPORT STORAGE KEYS
// ============================================
export const STORAGE_KEYS = KEYS;

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  // Token management
  getToken,
  setToken,
  saveToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  saveRefreshToken,
  removeRefreshToken,
  setTokens,
  removeTokens,
  setTokenExpiry,
  isTokenExpired,

  // User management
  getUser,
  setUser,
  updateUser,
  removeUser,
  getUserRole,
  getUserId,
  getUserDisplayName,
  isPatient,
  isDoctor,
  // isAdmin,

  // Legacy aliases
  getUserData,
  setUserData,
  removeUserData,
  setUserRole,
  removeUserRole,

  // Language
  getLanguage,
  setLanguage,
  getLanguageDisplayName,

  // FCM
  getFCMToken,
  setFCMToken,
  removeFCMToken,
  hasFCMTokenChanged,

  // Voice
  isVoiceEnabled,
  setVoiceEnabled,
  getVoiceRate,
  setVoiceRate,

  // Theme
  getTheme,
  setTheme,
  getResolvedTheme,

  // Auth status
  isAuthenticated,
  hasValidSession,

  // Session tracking
  updateLastActive,
  isSessionTimedOut,
  getTimeSinceLastActive,

  // Clear
  clearAuthStorage,
  clearStorage,
  clearAllStorage,

  // Onboarding
  setOnboardingCompleted,
  isOnboardingCompleted,
  clearOnboardingStatus,

  // Pending phone
  setPendingPhone,
  getPendingPhone,
  clearPendingPhone,

  // Debug
  getStorageInfo,

  // Keys
  STORAGE_KEYS,
};