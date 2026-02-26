// src/store/authStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api, { setAuthTokens, clearAuthTokens } from '../config/api';
import { firebaseSignOut } from '../config/firebase';

/**
 * Environment check for development logging
 */
const isDev = import.meta.env.DEV;

/**
 * Safe logger - only logs in development
 */
const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => isDev && console.error(...args),
  warn: (...args) => isDev && console.warn(...args),
};


/**
 * Create safe storage wrapper
 */
const createSafeStorage = () => ({
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Storage unavailable (private browsing, quota exceeded)
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Storage unavailable
    }
  },
});

/**
 * Helper function to extract error message from API response
 */
const extractErrorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return error.message || 'An unexpected error occurred';
  }

  if (typeof data === 'string') {
    return data;
  }

  // Check for message field
  if (data.message) {
    return data.message;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.error) {
    return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  }

  // Check for errors object (Django REST style)
  if (data.errors) {
    const errorMessages = [];
    for (const [, messages] of Object.entries(data.errors)) {
      if (Array.isArray(messages)) {
        errorMessages.push(...messages);
      } else {
        errorMessages.push(messages);
      }
    }
    if (errorMessages.length > 0) {
      return errorMessages.join('. ');
    }
  }

  if (data.non_field_errors) {
    return Array.isArray(data.non_field_errors)
      ? data.non_field_errors.join(', ')
      : data.non_field_errors;
  }

  // Field-specific errors at root level
  const fieldErrors = [];
  for (const [field, errors] of Object.entries(data)) {
    if (field === 'success' || field === 'message') continue;
    if (Array.isArray(errors)) {
      fieldErrors.push(`${field}: ${errors.join(', ')}`);
    } else if (typeof errors === 'string') {
      fieldErrors.push(`${field}: ${errors}`);
    }
  }

  if (fieldErrors.length > 0) {
    return fieldErrors.join('; ');
  }

  return 'An unexpected error occurred';
};

/**
 * Helper function to clean payload - removes null, undefined, empty strings
 */
const cleanPayload = (data) => {
  const cleaned = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
};

/**
 * Helper to parse auth response with different structures
 */
const parseAuthResponse = (responseData) => {
  let user = null;
  let access = null;
  let refresh = null;

  logger.log('🔍 Parsing response structure:', Object.keys(responseData));

  // Structure 1: { success, message, data: { user, tokens: { access, refresh } } }
  if (responseData.data && responseData.data.tokens) {
    logger.log('📦 Using structure: data.tokens');
    user = responseData.data.user;
    access = responseData.data.tokens.access;
    refresh = responseData.data.tokens.refresh;
  }
  // Structure 2: { success, message, data: { user, patient_profile, tokens } }
  else if (responseData.data && responseData.data.user) {
    logger.log('📦 Using structure: data.user with nested tokens');
    user = responseData.data.user;
    if (responseData.data.tokens) {
      access = responseData.data.tokens.access;
      refresh = responseData.data.tokens.refresh;
    }
  }
  // Structure 3: { user, tokens: { access, refresh } }
  else if (responseData.tokens) {
    logger.log('📦 Using structure: root tokens');
    user = responseData.user;
    access = responseData.tokens.access;
    refresh = responseData.tokens.refresh;
  }
  // Structure 4: { user, access, refresh }
  else if (responseData.access && responseData.refresh) {
    logger.log('📦 Using structure: root access/refresh');
    user = responseData.user;
    access = responseData.access;
    refresh = responseData.refresh;
  }

  return { user, access, refresh };
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => {
        setAuthTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Login with Firebase token
      login: async (firebaseToken, fcmToken = null) => {
        set({ isLoading: true, error: null });

        try {
          const payload = { firebase_token: firebaseToken };

          if (fcmToken) {
            payload.fcm_token = fcmToken;
          }

          logger.log('🔐 Login request initiated');

          const response = await api.post('/auth/login/', payload);

          logger.log('✅ Login response received');

          const { user, access, refresh } = parseAuthResponse(response.data);

          logger.log('📦 Parsed:', {
            user: user ? '✅' : '❌',
            access: access ? '✅' : '❌',
            refresh: refresh ? '✅' : '❌'
          });

          if (!access || !refresh) {
            throw new Error('Invalid response: missing tokens');
          }

          setAuthTokens(access, refresh);

          set({
            user,
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user };
        } catch (error) {
          logger.error('❌ Login error:', error.message);

          const errorMessage = extractErrorMessage(error);

          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false
          });

          return { success: false, error: errorMessage };
        }
      },

      // Register patient
      registerPatient: async (firebaseToken, patientData) => {
        set({ isLoading: true, error: null });

        try {
          const rawPayload = {
            firebase_token: firebaseToken,
            ...patientData
          };

          const payload = cleanPayload(rawPayload);

          logger.log('📤 Register patient request initiated');

          const response = await api.post('/auth/register/patient/', payload);

          logger.log('✅ Register patient response received');

          const { user, access, refresh } = parseAuthResponse(response.data);

          logger.log('📦 Parsed:', {
            user: user ? '✅' : '❌',
            access: access ? '✅' : '❌',
            refresh: refresh ? '✅' : '❌'
          });

          if (!access || !refresh) {
            logger.error('❌ Token parsing failed');
            throw new Error('Invalid response: missing authentication tokens');
          }

          setAuthTokens(access, refresh);

          set({
            user,
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user };
        } catch (error) {
          logger.error('❌ Register patient error:', error.message);

          const errorMessage = extractErrorMessage(error);

          set({ isLoading: false, error: errorMessage });

          return { success: false, error: errorMessage };
        }
      },

      // Register doctor
      registerDoctor: async (firebaseToken, doctorData) => {
        set({ isLoading: true, error: null });

        try {
          const rawPayload = {
            firebase_token: firebaseToken,
            ...doctorData
          };

          const payload = cleanPayload(rawPayload);

          logger.log('📤 Register doctor request initiated');

          const response = await api.post('/auth/register/doctor/', payload);

          logger.log('✅ Register doctor response received');

          const { user, access, refresh } = parseAuthResponse(response.data);

          logger.log('📦 Parsed:', {
            user: user ? '✅' : '❌',
            access: access ? '✅' : '❌',
            refresh: refresh ? '✅' : '❌'
          });

          if (!access || !refresh) {
            logger.error('❌ Token parsing failed');
            throw new Error('Invalid response: missing authentication tokens');
          }

          setAuthTokens(access, refresh);

          set({
            user,
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user };
        } catch (error) {
          logger.error('❌ Register doctor error:', error.message);

          const errorMessage = extractErrorMessage(error);

          set({ isLoading: false, error: errorMessage });

          return { success: false, error: errorMessage };
        }
      },

      // Fetch current user profile
      fetchProfile: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return { success: false };

        set({ isLoading: true });

        try {
          const response = await api.get('/auth/profile/');
          
          // Backend returns { success, data: { user, profile } }
          const responseData = response.data;
          let user = null;

          if (responseData.data?.user) {
            // Merge user and profile data for easy access
            user = {
              ...responseData.data.user,
              profile: responseData.data.profile
            };
          } else {
            user = responseData.data || responseData;
          }

          set({ user, isLoading: false });

          return { success: true, user };
        } catch (error) {
          logger.error('❌ Fetch profile error:', error.message);
          set({ isLoading: false });
          return { success: false, error: extractErrorMessage(error) };
        }
      },

      // Update profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });

        try {
          const payload = cleanPayload(profileData);

          const response = await api.patch('/auth/profile/', payload);
          
          // Backend returns { success, message, data: { user, profile } }
          const responseData = response.data;
          let user = null;

          if (responseData.data?.user) {
            user = {
              ...responseData.data.user,
              profile: responseData.data.profile
            };
          } else {
            user = responseData.data || responseData;
          }

          set({ user, isLoading: false });

          return { success: true, user };
        } catch (error) {
          logger.error('❌ Update profile error:', error.message);
          const errorMessage = extractErrorMessage(error);

          set({ isLoading: false, error: errorMessage });

          return { success: false, error: errorMessage };
        }
      },

      // Logout
      logout: async () => {
        const { refreshToken } = get();

        set({ isLoading: true });

        try {
          if (refreshToken) {
            await api.post('/auth/logout/', { refresh: refreshToken });
          }
        } catch (error) {
          logger.warn('Backend logout error (continuing):', error.message);
        }

        try {
          await firebaseSignOut();
        } catch (error) {
          logger.warn('Firebase signout error (continuing):', error.message);
        }

        clearAuthTokens();

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          hasHydrated: true,
          error: null
        });

        return { success: true };
      },


      // Role checks
      isPatient: () => get().user?.role === 'patient',
      isDoctor: () => get().user?.role === 'doctor',
      isAdmin: () => get().user?.role === 'admin',

      // Get user's full name
      getFullName: () => {
        const { user } = get();
        if (!user) return '';
        return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      },

      // Reset store
      reset: () => {
        clearAuthTokens();

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(createSafeStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
        // Don't persist tokens here - they're in separate localStorage keys
        // managed by setAuthTokens/clearAuthTokens
      }),
      onRehydrateStorage: () => (state) => {
        // Restore tokens from separate localStorage keys
        if (state) {
          const accessToken = localStorage.getItem('accessToken');
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (accessToken && refreshToken) {
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
          } else {
            state.isAuthenticated = false;
            state.user = null;
          }

          state.hasHydrated = true;
        }
      }
    }
  )
);

export default useAuthStore;