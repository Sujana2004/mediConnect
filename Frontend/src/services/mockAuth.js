// src/services/mockAuth.js

/**
 * Mock Authentication Service
 * For development and testing without Firebase
 *
 * Enable by setting VITE_USE_MOCK_AUTH=true in .env
 * or by not providing Firebase config in development mode
 */

// ============================================
// MOCK USER DATABASE
// ============================================
const MOCK_USERS = {
  patient1: {
    id: 'mock-patient-001',
    phone: '+919876543210',
    phone_number: '+919876543210',
    role: 'patient',
    first_name: 'राजेश',
    last_name: 'कुमार',
    full_name: 'राजेश कुमार',
    email: 'rajesh@example.com',
    gender: 'male',
    date_of_birth: '1990-05-15',
    blood_group: 'O+',
    address: 'Delhi, India',
    is_registered: true,
    is_verified: true,
    profile_photo: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  patient2: {
    id: 'mock-patient-002',
    phone: '+919876543211',
    phone_number: '+919876543211',
    role: 'patient',
    first_name: 'Priya',
    last_name: 'Sharma',
    full_name: 'Priya Sharma',
    email: 'priya@example.com',
    gender: 'female',
    date_of_birth: '1995-08-20',
    blood_group: 'A+',
    address: 'Mumbai, India',
    is_registered: true,
    is_verified: true,
    profile_photo: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  doctor1: {
    id: 'mock-doctor-001',
    phone: '+919876543212',
    phone_number: '+919876543212',
    role: 'doctor',
    first_name: 'Amit',
    last_name: 'Patel',
    full_name: 'Dr. Amit Patel',
    email: 'dr.amit@example.com',
    specialization: 'General Physician',
    license_number: 'MCI-12345',
    experience_years: 10,
    consultation_fee: 500,
    rating: 4.5,
    total_patients: 125,
    total_consultations: 89,
    is_verified: true,
    is_registered: true,
    profile_photo: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  doctor2: {
    id: 'mock-doctor-002',
    phone: '+919876543213',
    phone_number: '+919876543213',
    role: 'doctor',
    first_name: 'Sunita',
    last_name: 'Reddy',
    full_name: 'Dr. Sunita Reddy',
    email: 'dr.sunita@example.com',
    specialization: 'Cardiologist',
    license_number: 'MCI-67890',
    experience_years: 15,
    consultation_fee: 1000,
    rating: 4.8,
    total_patients: 250,
    total_consultations: 180,
    is_verified: true,
    is_registered: true,
    profile_photo: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  doctorUnverified: {
    id: 'mock-doctor-003',
    phone: '+919876543214',
    phone_number: '+919876543214',
    role: 'doctor',
    first_name: 'Rahul',
    last_name: 'Gupta',
    full_name: 'Dr. Rahul Gupta',
    email: 'dr.rahul@example.com',
    specialization: 'Dermatologist',
    license_number: 'MCI-11111',
    experience_years: 3,
    consultation_fee: 400,
    is_verified: false,
    is_registered: true,
    profile_photo: null,
    created_at: '2024-06-01T00:00:00Z',
  },
};

// ============================================
// CONSTANTS
// ============================================
const MOCK_OTP = '123456';
const MOCK_DELAY_MS = 800;

// ============================================
// MODULE STATE
// ============================================
let currentMockUser = null;
let pendingPhone = null;
let otpSent = false;

// ============================================
// HELPER: Simulate network delay
// ============================================
function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// MOCK AUTH SERVICE
// ============================================
const mockAuth = {
  /**
   * Send mock OTP
   */
  async sendOTP(phoneNumber) {
    await delay();

    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      pendingPhone = normalizedPhone;
      otpSent = true;

      console.log(
        `%c[MOCK] OTP sent to ${normalizedPhone}. Use OTP: ${MOCK_OTP}`,
        'color: #10b981; font-weight: bold;'
      );

      return {
        success: true,
        message: `OTP sent successfully. (Dev: use ${MOCK_OTP})`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Verify mock OTP
   */
  async verifyOTP(otp) {
    await delay();

    if (!otpSent || !pendingPhone) {
      return {
        success: false,
        error: 'Please request OTP first.',
      };
    }

    if (otp !== MOCK_OTP) {
      return {
        success: false,
        error: `Invalid OTP. Use ${MOCK_OTP} for mock login.`,
      };
    }

    // Find existing user by phone
    const existingUser = Object.values(MOCK_USERS).find(
      (u) => u.phone === pendingPhone && u.is_registered
    );

    if (existingUser) {
      currentMockUser = existingUser;
      const mockToken = `mock-token-${existingUser.id}-${Date.now()}`;

      console.log(
        `%c[MOCK] User logged in: ${existingUser.full_name} (${existingUser.role})`,
        'color: #10b981; font-weight: bold;'
      );

      return {
        success: true,
        user: { ...existingUser },
        token: mockToken,
        requiresRegistration: false,
      };
    }

    // New user
    console.log(
      '%c[MOCK] New user detected, requires registration',
      'color: #f59e0b; font-weight: bold;'
    );

    return {
      success: true,
      requiresRegistration: true,
      phone: pendingPhone,
    };
  },

  /**
   * Quick login with preset mock user
   */
  async quickLogin(userKey) {
    await delay(400);

    const user = MOCK_USERS[userKey];

    if (!user || !user.is_registered) {
      return {
        success: false,
        error: `Invalid mock user key: ${userKey}`,
      };
    }

    currentMockUser = { ...user };
    const mockToken = `mock-token-${user.id}-${Date.now()}`;

    console.log(
      `%c[MOCK] Quick login: ${user.full_name} (${user.role})`,
      'color: #10b981; font-weight: bold;'
    );

    return {
      success: true,
      user: { ...user },
      token: mockToken,
    };
  },

  /**
   * Simulate registration
   */
  async register(userData, role) {
    await delay(1200);

    const newUser = {
      id: `mock-${role}-${Date.now()}`,
      phone: pendingPhone,
      phone_number: pendingPhone,
      role,
      ...userData,
      is_registered: true,
      is_verified: role === 'patient',
      profile_photo: null,
      created_at: new Date().toISOString(),
    };

    currentMockUser = newUser;
    const mockToken = `mock-token-${newUser.id}-${Date.now()}`;

    console.log(
      `%c[MOCK] User registered: ${newUser.full_name || 'Unknown'} (${role})`,
      'color: #10b981; font-weight: bold;'
    );

    return {
      success: true,
      user: { ...newUser },
      token: mockToken,
      verificationStatus: role === 'doctor' ? 'pending' : 'approved',
    };
  },

  /**
   * Get current mock user
   */
  getCurrentMockUser() {
    return currentMockUser ? { ...currentMockUser } : null;
  },

  /**
   * Get all mock users (for dev panel)
   */
  getAllMockUsers() {
    return { ...MOCK_USERS };
  },

  /**
   * Get mock user keys for quick login buttons
   */
  getQuickLoginOptions() {
    return Object.entries(MOCK_USERS)
      .filter(([, u]) => u.is_registered)
      .map(([key, u]) => ({
        key,
        name: u.full_name,
        role: u.role,
        phone: u.phone,
        isVerified: u.is_verified,
      }));
  },

  /**
   * Reset all mock auth state
   */
  reset() {
    currentMockUser = null;
    pendingPhone = null;
    otpSent = false;
    console.log('%c[MOCK] Auth state reset', 'color: #6b7280;');
  },

  /**
   * Normalize phone number
   */
  normalizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Please enter a phone number.');
    }

    const digits = phone.replace(/\D/g, '');

    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return `+91${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }

    if (phone.startsWith('+91') && digits.length === 12) {
      return `+${digits}`;
    }

    throw new Error('Invalid phone number. Enter a 10-digit Indian mobile number.');
  },

  /**
   * Get mock OTP value
   */
  getMockOTP() {
    return MOCK_OTP;
  },

  /**
   * Check if mock auth is active
   */
  isActive() {
    return true;
  },
};

export default mockAuth;