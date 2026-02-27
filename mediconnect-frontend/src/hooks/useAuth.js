// src/hooks/useAuth.js
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { sendOTP, verifyOTP, getFirebaseToken } from '../config/firebase';
import { getFCMTokenWithRetry, deleteFCMToken } from '../services/fcm';

const useAuth = () => {
  const navigate = useNavigate();
  
  const {
    user,
    isAuthenticated,
    isLoading,
    hasHydrated,
    error,
    login,
    logout,
    registerPatient,
    registerDoctor,
    fetchProfile,
    updateProfile,
    setError,
    clearError,
    isPatient,
    isDoctor,
    isAdmin,
    getFullName
  } = useAuthStore();

  // Send OTP to phone number
  const sendPhoneOTP = useCallback(async (phoneNumber) => {
    clearError();
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return { 
        success: false, 
        error: 'Please enter a valid 10-digit phone number' 
      };
    }

    const result = await sendOTP(cleanPhone);
    
    if (!result.success) {
      setError(result.message);
    }
    
    return result;
  }, [clearError, setError]);

  // Verify OTP and login
  const verifyPhoneOTP = useCallback(async (otp) => {
    clearError();

    if (!otp || otp.length !== 6) {
      return { 
        success: false, 
        error: 'Please enter a valid 6-digit OTP' 
      };
    }

    const verifyResult = await verifyOTP(otp);
    
    if (!verifyResult.success) {
      setError(verifyResult.message);
      return verifyResult;
    }

    // Try to get FCM token
    let fcmToken = null;
    try {
      console.log('🔔 Getting FCM token for login...');
      fcmToken = await getFCMTokenWithRetry(2, 500);
      console.log('🔔 FCM token:', fcmToken ? '✅ obtained' : '⚠️ not available');
    } catch (fcmError) {
      console.warn('🔔 FCM token error (continuing without it):', fcmError.message);
    }

    const loginResult = await login(verifyResult.token, fcmToken);
    
    // ✅ Return the user object for immediate redirect
    return {
      ...loginResult,
      user: loginResult.user  // Make sure user is in the result
    };
  }, [clearError, setError, login]);

  // Register new patient
  const registerNewPatient = useCallback(async (tokenOrOtp, patientData) => {
    clearError();

    let firebaseToken = tokenOrOtp;

    // If it looks like an OTP (6 digits), verify it first
    if (/^\d{6}$/.test(tokenOrOtp)) {
      const verifyResult = await verifyOTP(tokenOrOtp);
      
      if (!verifyResult.success) {
        setError(verifyResult.message);
        return verifyResult;
      }
      
      firebaseToken = verifyResult.token;
    }

    if (!firebaseToken) {
      return {
        success: false,
        error: 'Authentication token is missing. Please verify your phone again.'
      };
    }

    // Try to get FCM token with retry
    let fcmToken = null;
    try {
      console.log('🔔 Getting FCM token for patient registration...');
      fcmToken = await getFCMTokenWithRetry(3, 1000);
      console.log('🔔 FCM token:', fcmToken ? '✅ obtained' : '⚠️ not available');
    } catch (fcmError) {
      console.warn('🔔 FCM token error (continuing without it):', fcmError.message);
    }

    // ✅ FIX: Only add fcm_token if it actually exists
    const registrationData = { ...patientData };
    
    if (fcmToken) {
      registrationData.fcm_token = fcmToken;
    }
    // If fcmToken is null/undefined, we simply don't include it

    console.log('📤 Registering patient:', {
      ...registrationData,
      fcm_token: fcmToken ? '[PRESENT]' : '[NOT INCLUDED]'
    });
    
    const result = await registerPatient(firebaseToken, registrationData);
    
    return result;
  }, [clearError, setError, registerPatient]);

  // Register new doctor
  // Accepts either a Firebase token directly OR an OTP to verify
    const registerNewDoctor = useCallback(async (tokenOrOtp, doctorData) => {
      clearError();

      let firebaseToken = tokenOrOtp;

      // If it looks like an OTP (6 digits), verify it first
      if (/^\d{6}$/.test(tokenOrOtp)) {
        const verifyResult = await verifyOTP(tokenOrOtp);
        
        if (!verifyResult.success) {
          setError(verifyResult.message);
          return verifyResult;
        }
        
        firebaseToken = verifyResult.token;
      }

      if (!firebaseToken) {
        return {
          success: false,
          error: 'Authentication token is missing. Please verify your phone again.'
        };
      }

      // Try to get FCM token with retry
      let fcmToken = null;
      try {
        console.log('🔔 Getting FCM token for doctor registration...');
        fcmToken = await getFCMTokenWithRetry(3, 1000);
        console.log('🔔 FCM token:', fcmToken ? '✅ obtained' : '⚠️ not available');
      } catch (fcmError) {
        console.warn('🔔 FCM token error (continuing without it):', fcmError.message);
      }

      const registrationData = { ...doctorData };
      
      if (fcmToken) {
        registrationData.fcm_token = fcmToken;
      }

      const result = await registerDoctor(firebaseToken, registrationData);
      
      return result;
    }, [clearError, setError, registerDoctor]);

    // Handle logout
    const handleLogout = useCallback(async () => {
      // Delete FCM token before logout
      try {
        await deleteFCMToken();
      } catch (fcmError) {
        console.warn(' Error deleting FCM token:', fcmError.message);
      }

      const result = await logout();
      
      if (result.success) {
        navigate('/login', { replace: true });
      }
      
      return result;
    }, [logout, navigate]);

    // Redirect based on role
  const redirectToDashboard = useCallback((userOverride = null) => {
    const currentUser = userOverride || user;
    
    // Use userOverride if provided (for immediate redirect after login)
    if (!currentUser) {
      console.log('redirectToDashboard: No user, going to login');
      navigate('/login', { replace: true });
      return;
    }

    const role = currentUser.role;
    console.log('redirectToDashboard: Navigating for role:', role);
    
    switch (role) {
      case 'doctor':
        navigate('/doctor/home', { replace: true });
        break;
      case 'patient':
        navigate('/patient/home', { replace: true });
        break;
      default:
        console.warn('Unknown role:', role);
        navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Check if profile is complete
  const isProfileComplete = useCallback(() => {
    if (!user) return false;
    
    // Basic check - customize based on your requirements
    const requiredFields = ['first_name', 'phone'];
    return requiredFields.every(field => !!user[field]);
  }, [user]);

  // Get Firebase token for API calls
  const getCurrentFirebaseToken = useCallback(async () => {
    try {
      const token = await getFirebaseToken();
      return token;
    } catch (error) {
      console.error('Error getting Firebase token:', error);
      return null;
    }
  }, []);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }
    return await fetchProfile();
  }, [isAuthenticated, fetchProfile]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    hasHydrated,
    error,

    // Role checks (call the functions to get boolean values)
    isPatient: isPatient(),
    isDoctor: isDoctor(),
    isAdmin: isAdmin(),
    
    // User info helpers
    fullName: getFullName(),
    userRole: user?.role || null,
    userId: user?.id || null,
    userPhone: user?.phone || null,
    userEmail: user?.email || null,
    profilePhoto: user?.profile_photo || null,

    // Auth actions
    sendPhoneOTP,
    verifyPhoneOTP,
    registerNewPatient,
    registerNewDoctor,
    handleLogout,
    updateProfile,
    refreshProfile,
    
    // Navigation
    redirectToDashboard,
    
    // Utilities
    isProfileComplete,
    getCurrentFirebaseToken,
    clearError
  };
};

export default useAuth;
export { useAuth };