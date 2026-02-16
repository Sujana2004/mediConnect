// src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../services/api';
import {
  sendOTP as firebaseSendOTP,
  verifyOTP as firebaseVerifyOTP,
  resendOTP as firebaseResendOTP,
  getFirebaseToken,
  signOutFirebase,
  normalizePhoneNumber,
  onAuthStateChange,
} from '../services/firebaseAuth';
import mockAuth from '../services/mockAuth';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  setTokens,
  getUser,
  setUser as setStoredUser,
  updateUser as updateStoredUser,
  clearAuthStorage,
  setPendingPhone,
  getPendingPhone,
  clearPendingPhone,
  updateLastActive,
} from '../hooks/storage';

// ============================================
// CONFIGURATION
// ============================================

// Use mock auth when Firebase is not configured or in dev mode
const USE_MOCK_AUTH =
  import.meta.env.VITE_USE_MOCK_AUTH === 'true' ||
  (!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.DEV);

if (USE_MOCK_AUTH) {
  console.info(
    '%c[AUTH] Using Mock Authentication',
    'color: #f59e0b; font-weight: bold; font-size: 14px;'
  );
  console.info(
    '%cMock OTP: 123456 | Test phones: +919876543210 (patient), +919876543212 (doctor)',
    'color: #6b7280;'
  );
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext(null);

// ============================================
// CUSTOM HOOK
// ============================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================
// HELPER: Get home path by role
// ============================================
function getUserHomePath(user) {
  if (!user?.role) return '/';
  switch (user.role) {
    case 'doctor':
      return user.is_verified ? '/doctor/home' : '/doctor/verification-pending';
    case 'patient':
      return '/patient/home';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/';
  }
}

// ============================================
// AUTH PROVIDER
// ============================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const authCheckDone = useRef(false);

  // ---- Check auth on mount (once) ----
  useEffect(() => {
    if (!authCheckDone.current) {
      authCheckDone.current = true;
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Firebase auth state listener (only when not mocking) ----
  useEffect(() => {
    if (USE_MOCK_AUTH) return;

    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (!firebaseUser && user) {
        console.warn('Firebase user signed out unexpectedly');
      }
    });

    return unsubscribe;
  }, [user]);

  // ============================================
  // CHECK AUTH (restore session on app load)
  // ============================================
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const storedUser = getUser();

      if (!token || !storedUser) {
        clearAuthStorage();
        setUser(null);
        setLoading(false);
        return;
      }

      // For mock auth, just restore from storage
      if (USE_MOCK_AUTH) {
        if (token.startsWith('mock-token-')) {
          setUser(storedUser);
          updateLastActive();
        } else {
          clearAuthStorage();
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // For real auth, validate JWT
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        const bufferTime = 60;

        if (decoded.exp && decoded.exp < currentTime + bufferTime) {
          console.log('Token expired or expiring soon, attempting refresh...');
          const refreshed = await refreshAuthToken();
          if (!refreshed) {
            setLoading(false);
            return;
          }
        } else {
          setUser(storedUser);
          updateLastActive();
        }
      } catch (decodeError) {
        console.warn('Token decode failed, trying profile fetch:', decodeError.message);
        try {
          const profileData = await fetchUserProfile();
          if (!profileData) {
            throw new Error('No profile data');
          }
        } catch {
          console.error('Profile fetch failed, clearing session');
          clearAuthStorage();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
      clearAuthStorage();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // FETCH USER PROFILE FROM BACKEND
  // ============================================
  const fetchUserProfile = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      const storedUser = getUser();
      if (storedUser) {
        setUser(storedUser);
        return storedUser;
      }
      return null;
    }

    try {
      const response = await authAPI.getProfile();
      const userData = response.data?.user || response.data;

      if (userData) {
        setStoredUser(userData);
        setUser(userData);
        updateLastActive();
        return userData;
      }

      return null;
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      if (err?.status === 401) {
        clearAuthStorage();
        setUser(null);
      }
      throw err;
    }
  }, []);

  // ============================================
  // REFRESH TOKEN
  // ============================================
  const refreshAuthToken = useCallback(async () => {
    if (USE_MOCK_AUTH) return true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        console.warn('No refresh token available');
        clearAuthStorage();
        setUser(null);
        return false;
      }

      const response = await authAPI.refreshToken(refreshToken);

      if (response.data?.access) {
        setToken(response.data.access);
        if (response.data.refresh) {
          setRefreshToken(response.data.refresh);
        }

        const storedUser = getUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          await fetchUserProfile();
        }

        updateLastActive();
        return true;
      }

      throw new Error('No access token in refresh response');
    } catch (err) {
      console.error('Token refresh failed:', err);
      clearAuthStorage();
      setUser(null);
      return false;
    }
  }, [fetchUserProfile]);

  // ============================================
  // SEND OTP
  // ============================================
  const sendOtp = useCallback(async (phoneNumber) => {
    setError(null);

    try {
      let result;

      if (USE_MOCK_AUTH) {
        result = await mockAuth.sendOTP(phoneNumber);
      } else {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        result = await firebaseSendOTP(normalizedPhone);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Store phone for registration step
      const phone = USE_MOCK_AUTH
        ? mockAuth.normalizePhoneNumber(phoneNumber)
        : normalizePhoneNumber(phoneNumber);
      setPendingPhone(phone);

      return { success: true, message: result.message };
    } catch (err) {
      const errorMessage = err.message || 'Failed to send OTP';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ============================================
  // VERIFY OTP
  // ============================================
  const verifyOtp = useCallback(
    async (otp) => {
      setError(null);

      try {
        // --- Step 1: Verify OTP (Firebase or Mock) ---
        let verifyResult;

        if (USE_MOCK_AUTH) {
          verifyResult = await mockAuth.verifyOTP(otp);
        } else {
          verifyResult = await firebaseVerifyOTP(otp);
        }

        if (!verifyResult.success) {
          throw new Error(verifyResult.error || 'OTP verification failed');
        }

        // --- Step 2: Check if new user needs registration (mock handles this) ---
        if (USE_MOCK_AUTH) {
          if (verifyResult.requiresRegistration) {
            return {
              success: true,
              requiresRegistration: true,
            };
          }

          // Mock user exists - complete login
          const mockUser = verifyResult.user;
          const mockToken = verifyResult.token;

          setTokens(mockToken, `mock-refresh-${Date.now()}`);
          setStoredUser(mockUser);
          setUser(mockUser);
          // In verifyOtp function, after setting user:
            console.log('=== LOGIN SUCCESS ===');
            console.log('Token saved:', getToken());
            console.log('User saved:', getUser());
            console.log('====================');

          clearPendingPhone();
          updateLastActive();

          // Add a small delay before navigation to ensure storage is written
          await new Promise(resolve => setTimeout(resolve, 100));

          const homePath = getUserHomePath(mockUser);
          navigate(homePath, { replace: true });

          return {
            success: true,
            requiresRegistration: false,
            role: mockUser.role,
          };
        }

        // --- Step 3: Real auth - send Firebase token to backend ---
        const firebaseToken =
          verifyResult.token || (await getFirebaseToken(true));

        if (!firebaseToken) {
          throw new Error(
            'Failed to get authentication token. Please try again.'
          );
        }

        const response = await authAPI.login(firebaseToken);

        if (!response.data) {
          throw new Error('Invalid response from server');
        }

        const {
          user: userData,
          tokens,
          requires_registration,
          access,
          refresh,
        } = response.data;

        // New user needs registration
        if (requires_registration) {
          return {
            success: true,
            requiresRegistration: true,
          };
        }

        // Existing user - complete login
        const accessToken = tokens?.access || access;
        const refreshToken = tokens?.refresh || refresh;

        if (accessToken) {
          setTokens(accessToken, refreshToken);
        }

        if (userData) {
          setStoredUser(userData);
          setUser(userData);
          clearPendingPhone();
          updateLastActive();

          const homePath = getUserHomePath(userData);
          navigate(homePath, { replace: true });

          return {
            success: true,
            requiresRegistration: false,
            role: userData.role,
          };
        }

        throw new Error('No user data received from server');
      } catch (err) {
        const errorMessage =
          err?.data?.detail ||
          err?.message ||
          err?.response?.data?.detail ||
          'OTP verification failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [navigate]
  );

  // ============================================
  // RESEND OTP
  // ============================================
  const resendOtp = useCallback(async (phoneNumber) => {
    setError(null);

    try {
      const phone = phoneNumber || getPendingPhone();
      if (!phone) {
        throw new Error('Phone number not found. Please start over.');
      }

      let result;

      if (USE_MOCK_AUTH) {
        result = await mockAuth.sendOTP(phone);
      } else {
        result = await firebaseResendOTP(phone);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to resend OTP');
      }

      return { success: true, message: result.message || 'OTP resent successfully' };
    } catch (err) {
      const errorMessage = err.message || 'Failed to resend OTP';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ============================================
  // REGISTER PATIENT
  // ============================================
  const registerPatient = useCallback(
    async (data) => {
      setError(null);

      try {
        const phoneNumber = getPendingPhone();
        if (!phoneNumber) {
          throw new Error(
            'Phone number not found. Please restart registration.'
          );
        }

        if (USE_MOCK_AUTH) {
          const mockResult = await mockAuth.register(
            { ...data, full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() },
            'patient'
          );

          if (!mockResult.success) {
            throw new Error(mockResult.error || 'Registration failed');
          }

          setTokens(mockResult.token, `mock-refresh-${Date.now()}`);
          setStoredUser(mockResult.user);
          setUser(mockResult.user);
          clearPendingPhone();
          updateLastActive();

          navigate('/patient/home', { replace: true });
          return { success: true };
        }

        // Real registration
        const firebaseToken = await getFirebaseToken(true);
        if (!firebaseToken) {
          throw new Error(
            'Authentication expired. Please verify your phone number again.'
          );
        }

        const response = await authAPI.registerPatient({
          ...data,
          phone_number: phoneNumber,
          firebase_token: firebaseToken,
        });

        if (!response.data) {
          throw new Error('Registration failed. Please try again.');
        }

        const { user: userData, tokens, access, refresh } = response.data;

        const accessToken = tokens?.access || access;
        const refreshToken = tokens?.refresh || refresh;
        if (accessToken) {
          setTokens(accessToken, refreshToken);
        }

        if (userData) {
          setStoredUser(userData);
          setUser(userData);
        }

        clearPendingPhone();
        updateLastActive();
        navigate('/patient/home', { replace: true });

        return { success: true };
      } catch (err) {
        const errorMessage =
          err?.data?.detail ||
          err?.response?.data?.detail ||
          err?.message ||
          'Patient registration failed';
        const fieldErrors = err?.data?.errors || err?.errors || null;

        setError(errorMessage);
        return { success: false, error: errorMessage, fieldErrors };
      }
    },
    [navigate]
  );

  // ============================================
  // REGISTER DOCTOR
  // ============================================
  const registerDoctor = useCallback(
    async (data) => {
      setError(null);

      try {
        const phoneNumber = getPendingPhone();
        if (!phoneNumber) {
          throw new Error(
            'Phone number not found. Please restart registration.'
          );
        }

        if (USE_MOCK_AUTH) {
          const mockResult = await mockAuth.register(
            { ...data, full_name: `Dr. ${data.first_name || ''} ${data.last_name || ''}`.trim() },
            'doctor'
          );

          if (!mockResult.success) {
            throw new Error(mockResult.error || 'Registration failed');
          }

          setTokens(mockResult.token, `mock-refresh-${Date.now()}`);
          setStoredUser(mockResult.user);
          setUser(mockResult.user);
          clearPendingPhone();
          updateLastActive();

          const status = mockResult.verificationStatus || 'pending';
          if (status === 'approved') {
            navigate('/doctor/home', { replace: true });
          } else {
            navigate('/doctor/verification-pending', { replace: true });
          }

          return { success: true, verificationStatus: status };
        }

        // Real registration
        const firebaseToken = await getFirebaseToken(true);
        if (!firebaseToken) {
          throw new Error(
            'Authentication expired. Please verify your phone number again.'
          );
        }

        const response = await authAPI.registerDoctor({
          ...data,
          phone_number: phoneNumber,
          firebase_token: firebaseToken,
        });

        if (!response.data) {
          throw new Error('Registration failed. Please try again.');
        }

        const {
          user: userData,
          tokens,
          access,
          refresh,
          verification_status,
        } = response.data;

        const accessToken = tokens?.access || access;
        const refreshToken = tokens?.refresh || refresh;
        if (accessToken) {
          setTokens(accessToken, refreshToken);
        }

        if (userData) {
          setStoredUser(userData);
          setUser(userData);
        }

        clearPendingPhone();
        updateLastActive();

        const status = verification_status || 'pending';
        if (status === 'approved') {
          navigate('/doctor/home', { replace: true });
        } else {
          navigate('/doctor/verification-pending', { replace: true });
        }

        return { success: true, verificationStatus: status };
      } catch (err) {
        const errorMessage =
          err?.data?.detail ||
          err?.response?.data?.detail ||
          err?.message ||
          'Doctor registration failed';
        const fieldErrors = err?.data?.errors || err?.errors || null;

        setError(errorMessage);
        return { success: false, error: errorMessage, fieldErrors };
      }
    },
    [navigate]
  );

  // ============================================
  // LOGOUT
  // ============================================
  const logout = useCallback(async () => {
    try {
      if (USE_MOCK_AUTH) {
        mockAuth.reset();
      } else {
        // Backend logout (non-blocking)
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          authAPI.logout(refreshToken).catch((err) => {
            console.warn('Backend logout failed (non-critical):', err?.message);
          });
        }

        // Firebase sign out
        await signOutFirebase();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state
      clearAuthStorage();
      setUser(null);
      setError(null);
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // ============================================
  // UPDATE USER PROFILE (local only)
  // ============================================
  const updateUserProfile = useCallback((updates) => {
    if (!updates || typeof updates !== 'object') return;

    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updatedUser = { ...prevUser, ...updates };
      updateStoredUser(updates);
      return updatedUser;
    });
  }, []);

  // ============================================
  // SAVE PROFILE TO BACKEND
  // ============================================
  const saveProfile = useCallback(
    async (profileData) => {
      setError(null);

      if (USE_MOCK_AUTH) {
        // Mock - just save locally
        updateUserProfile(profileData);
        return { success: true, data: { ...user, ...profileData } };
      }

      try {
        const response = await authAPI.patchProfile(profileData);
        const updatedData = response.data?.user || response.data;

        if (updatedData) {
          updateUserProfile(updatedData);
          return { success: true, data: updatedData };
        }

        throw new Error('No data returned from server');
      } catch (err) {
        const errorMessage =
          err?.data?.detail || err?.message || 'Failed to update profile';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [updateUserProfile, user]
  );

  // ============================================
  // QUICK LOGIN (dev only)
  // ============================================
  const quickLogin = useCallback(
    async (userKey) => {
      if (!USE_MOCK_AUTH) {
        console.warn('quickLogin is only available in mock auth mode');
        return { success: false, error: 'Not available' };
      }

      setError(null);

      try {
        const result = await mockAuth.quickLogin(userKey);

        if (!result.success) {
          throw new Error(result.error || 'Quick login failed');
        }

        setTokens(result.token, `mock-refresh-${Date.now()}`);
        setStoredUser(result.user);
        setUser(result.user);
        updateLastActive();

        const homePath = getUserHomePath(result.user);
        navigate(homePath, { replace: true });

        return { success: true, user: result.user };
      } catch (err) {
        const errorMessage = err.message || 'Quick login failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [navigate]
  );

  // ============================================
  // CLEAR ERROR
  // ============================================
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value = {
    // State
    user,
    loading,
    error,

    // Auth actions
    sendOtp,
    verifyOtp,
    resendOtp,
    registerPatient,
    registerDoctor,
    logout,
    clearError,

    // Profile
    updateUserProfile,
    saveProfile,
    fetchUserProfile,
    refreshAuthToken,

    // Dev tools
    quickLogin: USE_MOCK_AUTH ? quickLogin : undefined,
    isMockAuth: USE_MOCK_AUTH,

    // Computed
    isAuthenticated: !!user,
    isPatient: user?.role === 'patient',
    isDoctor: user?.role === 'doctor',
    isAdmin: user?.role === 'admin',
    isDoctorVerified: user?.role === 'doctor' && user?.is_verified === true,
    userRole: user?.role || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// EXPORTS
// ============================================
// Default export: the context object (for useContext)
// Named exports: useAuth hook and AuthProvider
export {AuthContext};