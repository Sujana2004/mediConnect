/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const AUTH_ENDPOINTS = Object.freeze({
  LOGIN: '/auth/login/',
  LOGOUT: '/auth/logout/',
  REGISTER_PATIENT: '/auth/register/patient/',
  REGISTER_DOCTOR: '/auth/register/doctor/',
  REFRESH_TOKEN: '/auth/token/refresh/',
  PROFILE: '/auth/profile/',
  DOCTORS: '/auth/doctors/',
  HELPERS: '/auth/helpers/',
  DOCTOR_AVAILABILITY: '/auth/doctor/availability/',
  DOCTOR_LEAVES: '/auth/doctor/leaves/',
  CHANGE_LANGUAGE: '/auth/settings/language/',
  UPDATE_FCM_TOKEN: '/auth/settings/fcm-token/',
});

/**
 * Builds query string from filters object
 * @param {Object} filters - Filter key-value pairs
 * @returns {string} Query string (with leading ? if not empty)
 */
const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Constructs endpoint URL with optional ID and action
 * @param {string} baseEndpoint - Base endpoint path
 * @param {string|number|null} [id] - Optional resource ID
 * @param {string|null} [action] - Optional action suffix
 * @returns {string} Complete endpoint URL
 */
const buildEndpoint = (baseEndpoint, id = null, action = null) => {
  let endpoint = baseEndpoint;

  if (id !== null) {
    endpoint += `${id}/`;
  }

  if (action) {
    endpoint += `${action}/`;
  }

  return endpoint;
};

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const normalizeAvailabilityPayload = (slotData = {}) => ({
  day_of_week: Number(slotData.day_of_week),
  start_time: slotData.start_time,
  end_time: slotData.end_time,
  is_available: slotData.is_available ?? slotData.is_active ?? true,
  slot_duration: slotData.slot_duration ?? slotData.slot_duration_minutes ?? 30,
  max_appointments: slotData.max_appointments ?? slotData.max_patients_per_slot ?? 1,
});

const normalizeLeavePayload = (leaveData = {}) => {
  const isFullDay = leaveData.is_full_day ?? (leaveData.exception_type === 'leave');
  return {
    date: leaveData.date || leaveData.exception_date,
    reason: leaveData.reason || '',
    is_full_day: Boolean(isFullDay),
    ...(isFullDay ? {} : {
      start_time: leaveData.start_time,
      end_time: leaveData.end_time,
    }),
  };
};

/**
 * Login with Firebase token
 * @param {string} firebaseToken - Firebase ID token
 * @returns {Promise<Object>} User data with JWT tokens
 */
export const login = async (firebaseToken) => {
  const response = await api.post(AUTH_ENDPOINTS.LOGIN, {
    firebase_token: firebaseToken,
  });
  return response.data;
};

/**
 * Logout user and blacklist refresh token
 * @param {string} refreshToken - Refresh token to blacklist
 * @returns {Promise<Object>} Logout confirmation
 */
export const logout = async (refreshToken) => {
  const response = await api.post(AUTH_ENDPOINTS.LOGOUT, {
    refresh: refreshToken,
  });
  return response.data;
};

/**
 * Register a new patient
 * @param {Object} patientData - Patient registration data
 * @param {string} patientData.firebase_token - Firebase ID token
 * @param {string} patientData.full_name - Patient's full name
 * @param {string} patientData.date_of_birth - Date of birth (YYYY-MM-DD)
 * @param {string} patientData.gender - Gender (male/female/other)
 * @param {string} [patientData.email] - Email address
 * @param {string} [patientData.address] - Address
 * @param {string} [patientData.district] - District
 * @param {string} [patientData.state] - State
 * @param {string} [patientData.pincode] - Pincode
 * @param {string} [patientData.preferred_language] - Preferred language (en/hi/te)
 * @param {string} [patientData.blood_group] - Blood group
 * @param {string} [patientData.emergency_contact_name] - Emergency contact name
 * @param {string} [patientData.emergency_contact_phone] - Emergency contact phone
 * @returns {Promise<Object>} Registered patient data with tokens
 */
export const registerPatient = async (patientData) => {
  const response = await api.post(AUTH_ENDPOINTS.REGISTER_PATIENT, patientData);
  return response.data;
};

/**
 * Register a new doctor
 * @param {Object} doctorData - Doctor registration data
 * @param {string} doctorData.firebase_token - Firebase ID token
 * @param {string} doctorData.full_name - Doctor's full name
 * @param {string} doctorData.date_of_birth - Date of birth (YYYY-MM-DD)
 * @param {string} doctorData.gender - Gender (male/female/other)
 * @param {string} doctorData.specialization - Medical specialization
 * @param {string} doctorData.registration_number - Medical registration number
 * @param {string} doctorData.registration_council - Medical council name
 * @param {number} doctorData.experience_years - Years of experience
 * @param {string} doctorData.qualification - Medical qualification
 * @param {string} [doctorData.email] - Email address
 * @param {string} [doctorData.bio] - Doctor's bio
 * @param {number} [doctorData.consultation_fee] - Consultation fee
 * @param {Array<string>} [doctorData.languages_spoken] - Languages spoken
 * @param {string} [doctorData.clinic_name] - Clinic name
 * @param {string} [doctorData.clinic_address] - Clinic address
 * @returns {Promise<Object>} Registered doctor data with tokens
 */
export const registerDoctor = async (doctorData) => {
  const response = await api.post(AUTH_ENDPOINTS.REGISTER_DOCTOR, doctorData);
  return response.data;
};

/**
 * Refresh access token
 * @param {string} currentRefreshToken - Current refresh token
 * @returns {Promise<Object>} New access and refresh tokens
 */
export const refreshToken = async (currentRefreshToken) => {
  const response = await api.post(AUTH_ENDPOINTS.REFRESH_TOKEN, {
    refresh: currentRefreshToken,
  });
  return response.data;
};

/**
 * Get user profile
 * @returns {Promise<Object>} User profile data
 */
export const getProfile = async () => {
  const response = await api.get(AUTH_ENDPOINTS.PROFILE);
  return response.data;
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile data
 */
export const updateProfile = async (profileData) => {
  const response = await api.put(AUTH_ENDPOINTS.PROFILE, profileData);
  return response.data;
};

/**
 * Update profile picture
 * @param {File} imageFile - Image file to upload
 * @returns {Promise<Object>} Updated profile data with new image URL
 */
export const updateProfilePicture = async (imageFile) => {
  const formData = new FormData();
  formData.append('profile_photo', imageFile);

  const response = await api.patch(AUTH_ENDPOINTS.PROFILE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get list of verified doctors
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.specialization] - Filter by specialization
 * @param {string} [filters.language] - Filter by language spoken
 * @param {string} [filters.search] - Search query
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated list of doctors
 */
export const getDoctors = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${AUTH_ENDPOINTS.DOCTORS}${queryString}`);
  return response.data;
};

/**
 * Get doctor details by ID
 * @param {string|number} doctorId - Doctor's ID
 * @returns {Promise<Object>} Doctor details
 */
export const getDoctorById = async (doctorId) => {
  const endpoint = buildEndpoint(AUTH_ENDPOINTS.DOCTORS, doctorId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get list of family helpers
 * @returns {Promise<Array>} List of family helpers
 */
export const getHelpers = async () => {
  const response = await api.get(AUTH_ENDPOINTS.HELPERS);
  return response.data;
};

/**
 * Add a family helper
 * @param {Object} helperData - Helper data
 * @param {string} helperData.helper_name - Helper's name
 * @param {string} helperData.helper_phone - Helper's phone number (10 digits)
 * @param {string} helperData.relationship - Relationship (spouse/son/daughter/father/mother/brother/sister/other)
 * @param {boolean} [helperData.can_book_appointments=true] - Can book appointments
 * @param {boolean} [helperData.can_view_records=true] - Can view health records
 * @param {boolean} [helperData.can_chat_with_doctor=true] - Can chat with doctor
 * @param {boolean} [helperData.can_manage_medications=true] - Can manage medications
 * @param {boolean} [helperData.is_primary=false] - Is primary helper
 * @returns {Promise<Object>} Created helper data
 */
export const addHelper = async (helperData) => {
  const response = await api.post(AUTH_ENDPOINTS.HELPERS, helperData);
  return response.data;
};

/**
 * Remove a family helper
 * @param {string|number} helperId - Helper's ID
 * @returns {Promise<void>}
 */
export const removeHelper = async (helperId) => {
  const endpoint = buildEndpoint(AUTH_ENDPOINTS.HELPERS, helperId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Update a family helper
 * @param {string|number} helperId - Helper's ID
 * @param {Object} helperData - Updated helper data
 * @returns {Promise<Object>} Updated helper data
 */
export const updateHelper = async (helperId, helperData) => {
  const endpoint = buildEndpoint(AUTH_ENDPOINTS.HELPERS, helperId);
  const response = await api.put(endpoint, helperData);
  return response.data;
};

/**
 * Get doctor's own availability slots from users app endpoints.
 * @returns {Promise<Array>} Availability list
 */
export const getDoctorOwnAvailability = async () => {
  const response = await api.get(AUTH_ENDPOINTS.DOCTOR_AVAILABILITY);
  return unwrapList(response.data);
};

/**
 * Create or update doctor's availability slot (upsert by day_of_week).
 * @param {Object} slotData - Slot data in either users or appointments naming
 * @returns {Promise<Object>} Updated slot payload
 */
export const saveDoctorOwnAvailability = async (slotData) => {
  const response = await api.post(
    AUTH_ENDPOINTS.DOCTOR_AVAILABILITY,
    normalizeAvailabilityPayload(slotData)
  );
  return response.data;
};

/**
 * Delete doctor's availability slot by UUID.
 * @param {string} slotId - Availability UUID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteDoctorOwnAvailability = async (slotId) => {
  const endpoint = buildEndpoint(AUTH_ENDPOINTS.DOCTOR_AVAILABILITY, slotId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Get doctor's own leaves from users app endpoints.
 * @returns {Promise<Array>} Leave list
 */
export const getDoctorOwnLeaves = async () => {
  const response = await api.get(AUTH_ENDPOINTS.DOCTOR_LEAVES);
  return unwrapList(response.data);
};

/**
 * Add doctor's leave (full-day or partial-day).
 * @param {Object} leaveData - Leave payload
 * @returns {Promise<Object>} Created leave
 */
export const addDoctorOwnLeave = async (leaveData) => {
  const response = await api.post(
    AUTH_ENDPOINTS.DOCTOR_LEAVES,
    normalizeLeavePayload(leaveData)
  );
  return response.data;
};

/**
 * Delete doctor's leave by UUID.
 * @param {string} leaveId - Leave UUID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteDoctorOwnLeave = async (leaveId) => {
  const endpoint = buildEndpoint(AUTH_ENDPOINTS.DOCTOR_LEAVES, leaveId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Change user's preferred language
 * @param {string} language - Language code (en/hi/te)
 * @returns {Promise<Object>} Confirmation
 */
export const changeLanguage = async (language) => {
  const response = await api.post(AUTH_ENDPOINTS.CHANGE_LANGUAGE, { language });
  return response.data;
};

/**
 * Update FCM token for push notifications
 * @param {string} fcmToken - Firebase Cloud Messaging token
 * @returns {Promise<Object>} Confirmation
 */
export const updateFcmToken = async (fcmToken) => {
  const response = await api.post(AUTH_ENDPOINTS.UPDATE_FCM_TOKEN, {
    fcm_token: fcmToken,
  });
  return response.data;
};

/**
 * Authentication service default export
 * Groups all authentication-related API methods
 */
export default {
  login,
  logout,
  registerPatient,
  registerDoctor,
  refreshToken,
  getProfile,
  updateProfile,
  updateProfilePicture,
  getDoctors,
  getDoctorById,
  getHelpers,
  addHelper,
  removeHelper,
  updateHelper,
  getDoctorOwnAvailability,
  saveDoctorOwnAvailability,
  deleteDoctorOwnAvailability,
  getDoctorOwnLeaves,
  addDoctorOwnLeave,
  deleteDoctorOwnLeave,
  changeLanguage,
  updateFcmToken,
};