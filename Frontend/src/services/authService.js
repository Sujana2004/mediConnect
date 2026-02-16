// src/services/authService.js
import firebaseAuth from './firebaseAuth';
import mockAuth from './mockAuth';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

/**
 * Unified Auth Service
 * Automatically switches between mock and real Firebase based on environment
 */
class AuthService {
  constructor() {
    this.isMockMode = USE_MOCK;
    console.log(`Auth Service initialized in ${this.isMockMode ? 'MOCK' : 'FIREBASE'} mode`);
  }

  /**
   * Normalize errors from different sources to consistent format
   */
  normalizeError(error) {
    // Firebase error format
    if (error?.code?.startsWith('auth/')) {
      return {
        code: error.code,
        message: this.getFirebaseErrorMessage(error.code),
        originalError: error,
      };
    }
    
    // Already normalized
    if (error?.code && error?.message) {
      return error;
    }
    
    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'An unexpected error occurred',
      originalError: error,
    };
  }

  /**
   * Get user-friendly Firebase error messages
   */
  getFirebaseErrorMessage(code) {
    const messages = {
      'auth/invalid-phone-number': 'Please enter a valid phone number',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/invalid-verification-code': 'Invalid OTP. Please check and try again',
      'auth/code-expired': 'OTP has expired. Please request a new one',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/quota-exceeded': 'Service temporarily unavailable. Please try later',
      'auth/captcha-check-failed': 'Verification failed. Please try again',
      'auth/missing-phone-number': 'Phone number is required',
    };
    return messages[code] || 'Authentication failed. Please try again';
  }

  // Send OTP
  async sendOTP(phoneNumber, recaptchaContainerId) {
    try {
      if (this.isMockMode) {
        return await mockAuth.sendOTP(phoneNumber);
      } else {
        return await firebaseAuth.sendOTP(phoneNumber, recaptchaContainerId);
      }
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // Verify OTP
  async verifyOTP(otp) {
    try {
      if (this.isMockMode) {
        return await mockAuth.verifyOTP(otp);
      } else {
        return await firebaseAuth.verifyOTP(otp);
      }
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // Resend OTP
  async resendOTP(phoneNumber, recaptchaContainerId) {
    try {
      if (this.isMockMode) {
        mockAuth.reset();
        return await mockAuth.sendOTP(phoneNumber);
      } else {
        return await firebaseAuth.resendOTP(phoneNumber, recaptchaContainerId);
      }
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // Sign out
  async signOut() {
    try {
      if (this.isMockMode) {
        mockAuth.reset();
        return { success: true };
      } else {
        return await firebaseAuth.signOut();
      }
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // Get current user
  getCurrentUser() {
    if (this.isMockMode) {
      return mockAuth.getCurrentMockUser();
    } else {
      return firebaseAuth.getCurrentUser();
    }
  }

  // Get mock users (only in mock mode)
  getMockUsers() {
    if (this.isMockMode) {
      return mockAuth.getAllMockUsers();
    }
    return [];
  }

  // Quick login (only in mock mode)
  async quickLogin(userKey) {
    if (!this.isMockMode) {
      throw new Error('Quick login only available in mock mode');
    }
    try {
      return await mockAuth.quickLogin(userKey);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // Check if in mock mode
  isMock() {
    return this.isMockMode;
  }

  /**
   * Add auth state listener (for real-time auth changes)
   */
  onAuthStateChange(callback) {
    if (this.isMockMode) {
      // Mock doesn't have real-time state changes
      return () => {}; // Return no-op unsubscribe
    } else {
      return firebaseAuth.onAuthStateChange?.(callback) || (() => {});
    }
  }
}

export default new AuthService();