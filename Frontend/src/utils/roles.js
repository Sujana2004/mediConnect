// src/utils/roles.js

/**
 * User Role Constants
 * Defines all possible user roles in the application
 */
export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin', // For future admin panel
};

/**
 * Role Display Names (for UI)
 */
export const ROLE_LABELS = {
  [ROLES.PATIENT]: 'Patient',
  [ROLES.DOCTOR]: 'Doctor',
  [ROLES.ADMIN]: 'Administrator',
};

/**
 * Role Labels in different languages
 */
export const ROLE_LABELS_I18N = {
  [ROLES.PATIENT]: {
    en: 'Patient',
    hi: 'मरीज',
    te: 'రోగి',
  },
  [ROLES.DOCTOR]: {
    en: 'Doctor',
    hi: 'डॉक्टर',
    te: 'వైద్యుడు',
  },
  [ROLES.ADMIN]: {
    en: 'Administrator',
    hi: 'प्रशासक',
    te: 'నిర్వాహకుడు',
  },
};

/**
 * Route paths for each role's dashboard
 */
export const ROLE_DASHBOARD_PATHS = {
  [ROLES.PATIENT]: '/patient',
  [ROLES.DOCTOR]: '/doctor',
  [ROLES.ADMIN]: '/admin',
};

/**
 * Default redirect paths after login
 */
export const ROLE_HOME_PATHS = {
  [ROLES.PATIENT]: '/patient/home',
  [ROLES.DOCTOR]: '/doctor/home',
  [ROLES.ADMIN]: '/admin/dashboard',
};

/**
 * Check if user has a specific role
 * @param {object} user - User object
 * @param {string} requiredRole - Required role
 * @returns {boolean}
 */
export const hasRole = (user, requiredRole) => {
  if (!user || !user.role) return false;
  return user.role === requiredRole;
};

/**
 * Check if user has any of the specified roles
 * @param {object} user - User object
 * @param {string[]} roles - Array of allowed roles
 * @returns {boolean}
 */
export const hasAnyRole = (user, roles) => {
  if (!user || !user.role || !Array.isArray(roles)) return false;
  return roles.includes(user.role);
};

/**
 * Check if user is a patient
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isPatient = (user) => {
  return hasRole(user, ROLES.PATIENT);
};

/**
 * Check if user is a doctor
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isDoctor = (user) => {
  return hasRole(user, ROLES.DOCTOR);
};

/**
 * Check if user is an admin
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return hasRole(user, ROLES.ADMIN);
};

/**
 * Check if user is a healthcare provider (doctor or admin)
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isHealthcareProvider = (user) => {
  return hasAnyRole(user, [ROLES.DOCTOR, ROLES.ADMIN]);
};

/**
 * Get role label for display
 * @param {string} role - Role string
 * @param {string} language - Language code (optional)
 * @returns {string}
 */
export const getRoleLabel = (role, language = 'en') => {
  if (ROLE_LABELS_I18N[role] && ROLE_LABELS_I18N[role][language]) {
    return ROLE_LABELS_I18N[role][language];
  }
  return ROLE_LABELS[role] || role || 'Unknown';
};

/**
 * Get dashboard path for a role
 * @param {string} role - User role
 * @returns {string}
 */
export const getDashboardPath = (role) => {
  return ROLE_DASHBOARD_PATHS[role] || '/';
};

/**
 * Get home path for a role (after login)
 * @param {string} role - User role
 * @returns {string}
 */
export const getHomePath = (role) => {
  return ROLE_HOME_PATHS[role] || '/';
};

/**
 * Get home path from user object
 * @param {object} user - User object
 * @returns {string}
 */
export const getUserHomePath = (user) => {
  if (!user || !user.role) return '/';
  return getHomePath(user.role);
};

/**
 * Validate if a role string is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

/**
 * Get all available roles
 * @returns {string[]}
 */
export const getAllRoles = () => {
  return Object.values(ROLES);
};

/**
 * Get available roles for registration (excludes admin)
 * @returns {string[]}
 */
export const getRegistrationRoles = () => {
  return [ROLES.PATIENT, ROLES.DOCTOR];
};

/**
 * Check if doctor is verified
 * @param {object} user - User object (doctor)
 * @returns {boolean}
 */
export const isDoctorVerified = (user) => {
  if (!isDoctor(user)) return false;
  return user.is_verified === true || user.doctor_profile?.is_verified === true;
};

/**
 * Check if user profile is complete
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isProfileComplete = (user) => {
  if (!user) return false;
  
  // Basic fields required for all users
  const basicFields = ['full_name', 'phone_number'];
  const hasBasicFields = basicFields.every(field => !!user[field]);
  
  if (!hasBasicFields) return false;
  
  // Role-specific validation
  if (isPatient(user)) {
    // Patients need date_of_birth and gender
    return !!user.date_of_birth && !!user.gender;
  }
  
  if (isDoctor(user)) {
    // Doctors need specialization and license
    const doctorProfile = user.doctor_profile || {};
    return !!doctorProfile.specialization && !!doctorProfile.license_number;
  }
  
  return true;
};

/**
 * Permission constants for fine-grained access control
 */
export const PERMISSIONS = {
  // Patient permissions
  VIEW_OWN_RECORDS: 'view_own_records',
  BOOK_APPOINTMENT: 'book_appointment',
  VIEW_DOCTORS: 'view_doctors',
  USE_CHATBOT: 'use_chatbot',
  USE_SYMPTOM_CHECKER: 'use_symptom_checker',
  MANAGE_FAMILY_HELPERS: 'manage_family_helpers',
  
  // Doctor permissions
  VIEW_PATIENT_RECORDS: 'view_patient_records',
  WRITE_PRESCRIPTION: 'write_prescription',
  MANAGE_APPOINTMENTS: 'manage_appointments',
  MANAGE_SCHEDULE: 'manage_schedule',
  VIEW_INCOME: 'view_income',
  
  // Admin permissions
  VERIFY_DOCTORS: 'verify_doctors',
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
};

/**
 * Role-based permissions mapping
 */
export const ROLE_PERMISSIONS = {
  [ROLES.PATIENT]: [
    PERMISSIONS.VIEW_OWN_RECORDS,
    PERMISSIONS.BOOK_APPOINTMENT,
    PERMISSIONS.VIEW_DOCTORS,
    PERMISSIONS.USE_CHATBOT,
    PERMISSIONS.USE_SYMPTOM_CHECKER,
    PERMISSIONS.MANAGE_FAMILY_HELPERS,
  ],
  [ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_PATIENT_RECORDS,
    PERMISSIONS.WRITE_PRESCRIPTION,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.MANAGE_SCHEDULE,
    PERMISSIONS.VIEW_INCOME,
    PERMISSIONS.USE_CHATBOT, // Doctors can also use chatbot for drug info
  ],
  [ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS), // Admin has all permissions
  ],
};

/**
 * Check if user has a specific permission
 * @param {object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
};

/**
 * Check if user has all specified permissions
 * @param {object} user - User object
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissions) => {
  if (!Array.isArray(permissions)) return false;
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user has any of the specified permissions
 * @param {object} user - User object
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissions) => {
  if (!Array.isArray(permissions)) return false;
  return permissions.some(permission => hasPermission(user, permission));
};

// Default export
export default {
  ROLES,
  ROLE_LABELS,
  ROLE_LABELS_I18N,
  ROLE_DASHBOARD_PATHS,
  ROLE_HOME_PATHS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasRole,
  hasAnyRole,
  isPatient,
  isDoctor,
  isAdmin,
  isHealthcareProvider,
  getRoleLabel,
  getDashboardPath,
  getHomePath,
  getUserHomePath,
  isValidRole,
  getAllRoles,
  getRegistrationRoles,
  isDoctorVerified,
  isProfileComplete,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
};