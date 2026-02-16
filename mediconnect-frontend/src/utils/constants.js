/**
 * Application Constants
 * Centralized constants used throughout the application
 */

// ==================== App Info ====================
export const APP_NAME = 'MediConnect';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Rural Healthcare Platform for India';

// ==================== API Configuration ====================
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const API_TIMEOUT = 30000; // 30 seconds

// ==================== Authentication ====================
export const TOKEN_KEY = 'mediconnect_access_token';
export const REFRESH_TOKEN_KEY = 'mediconnect_refresh_token';
export const USER_KEY = 'mediconnect_user';
export const TOKEN_EXPIRY_KEY = 'mediconnect_token_expiry';

// ==================== User Roles ====================
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

// ==================== Languages ====================
export const LANGUAGES = {
  ENGLISH: 'en',
  HINDI: 'hi',
  TELUGU: 'te',
};

export const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
];

export const DEFAULT_LANGUAGE = 'en';

// ==================== Gender Options ====================
export const GENDER_OPTIONS = [
  { value: 'male', labelKey: 'common.male' },
  { value: 'female', labelKey: 'common.female' },
  { value: 'other', labelKey: 'common.other' },
];

// ==================== Blood Groups ====================
export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
];

// ==================== Doctor Specializations ====================
export const SPECIALIZATIONS = [
  { value: 'general_physician', labelKey: 'specializations.general_physician' },
  { value: 'pediatrician', labelKey: 'specializations.pediatrician' },
  { value: 'gynecologist', labelKey: 'specializations.gynecologist' },
  { value: 'dermatologist', labelKey: 'specializations.dermatologist' },
  { value: 'cardiologist', labelKey: 'specializations.cardiologist' },
  { value: 'orthopedic', labelKey: 'specializations.orthopedic' },
  { value: 'neurologist', labelKey: 'specializations.neurologist' },
  { value: 'psychiatrist', labelKey: 'specializations.psychiatrist' },
  { value: 'ophthalmologist', labelKey: 'specializations.ophthalmologist' },
  { value: 'ent', labelKey: 'specializations.ent' },
  { value: 'dentist', labelKey: 'specializations.dentist' },
  { value: 'pulmonologist', labelKey: 'specializations.pulmonologist' },
  { value: 'gastroenterologist', labelKey: 'specializations.gastroenterologist' },
  { value: 'urologist', labelKey: 'specializations.urologist' },
  { value: 'endocrinologist', labelKey: 'specializations.endocrinologist' },
  { value: 'oncologist', labelKey: 'specializations.oncologist' },
  { value: 'nephrologist', labelKey: 'specializations.nephrologist' },
  { value: 'rheumatologist', labelKey: 'specializations.rheumatologist' },
  { value: 'ayurveda', labelKey: 'specializations.ayurveda' },
  { value: 'homeopathy', labelKey: 'specializations.homeopathy' },
];

// ==================== Appointment Status ====================
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
};

export const APPOINTMENT_STATUS_COLORS = {
  scheduled: 'warning',
  confirmed: 'info',
  checked_in: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
  rescheduled: 'warning',
};

// ==================== Consultation Types ====================
export const CONSULTATION_TYPES = {
  VIDEO: 'video',
  AUDIO: 'audio',
  IN_PERSON: 'in_person',
  CHAT: 'chat',
};

export const CONSULTATION_TYPE_OPTIONS = [
  { value: 'video', labelKey: 'consultation.types.video', icon: 'Video' },
  { value: 'audio', labelKey: 'consultation.types.audio', icon: 'Phone' },
  { value: 'in_person', labelKey: 'consultation.types.in_person', icon: 'User' },
  { value: 'chat', labelKey: 'consultation.types.chat', icon: 'MessageSquare' },
];

// ==================== Consultation Status ====================
export const CONSULTATION_STATUS = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ==================== Queue Status ====================
export const QUEUE_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  IN_CONSULTATION: 'in_consultation',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
};

// ==================== Days of Week ====================
export const DAYS_OF_WEEK = [
  { value: 0, labelKey: 'days.monday', short: 'Mon' },
  { value: 1, labelKey: 'days.tuesday', short: 'Tue' },
  { value: 2, labelKey: 'days.wednesday', short: 'Wed' },
  { value: 3, labelKey: 'days.thursday', short: 'Thu' },
  { value: 4, labelKey: 'days.friday', short: 'Fri' },
  { value: 5, labelKey: 'days.saturday', short: 'Sat' },
  { value: 6, labelKey: 'days.sunday', short: 'Sun' },
];

// ==================== Time Slots ====================
export const DEFAULT_SLOT_DURATION = 15; // minutes
export const MIN_SLOT_DURATION = 10;
export const MAX_SLOT_DURATION = 60;

// ==================== Medicine Frequency ====================
export const MEDICINE_FREQUENCY = [
  { value: 'once_daily', labelKey: 'medicine.frequency.once_daily', times: 1 },
  { value: 'twice_daily', labelKey: 'medicine.frequency.twice_daily', times: 2 },
  { value: 'thrice_daily', labelKey: 'medicine.frequency.thrice_daily', times: 3 },
  { value: 'four_times_daily', labelKey: 'medicine.frequency.four_times_daily', times: 4 },
  { value: 'every_6_hours', labelKey: 'medicine.frequency.every_6_hours', times: 4 },
  { value: 'every_8_hours', labelKey: 'medicine.frequency.every_8_hours', times: 3 },
  { value: 'every_12_hours', labelKey: 'medicine.frequency.every_12_hours', times: 2 },
  { value: 'weekly', labelKey: 'medicine.frequency.weekly', times: 1 },
  { value: 'as_needed', labelKey: 'medicine.frequency.as_needed', times: 0 },
];

// ==================== Medicine Instructions ====================
export const MEDICINE_INSTRUCTIONS = [
  { value: 'before_food', labelKey: 'medicine.instructions.before_food' },
  { value: 'after_food', labelKey: 'medicine.instructions.after_food' },
  { value: 'with_food', labelKey: 'medicine.instructions.with_food' },
  { value: 'empty_stomach', labelKey: 'medicine.instructions.empty_stomach' },
  { value: 'bedtime', labelKey: 'medicine.instructions.bedtime' },
  { value: 'morning', labelKey: 'medicine.instructions.morning' },
];

// ==================== Allergy Types ====================
export const ALLERGY_TYPES = [
  { value: 'food', labelKey: 'allergies.types.food' },
  { value: 'drug', labelKey: 'allergies.types.drug' },
  { value: 'environmental', labelKey: 'allergies.types.environmental' },
  { value: 'insect', labelKey: 'allergies.types.insect' },
  { value: 'latex', labelKey: 'allergies.types.latex' },
  { value: 'other', labelKey: 'allergies.types.other' },
];

// ==================== Allergy Severity ====================
export const ALLERGY_SEVERITY = [
  { value: 'mild', labelKey: 'allergies.severity.mild', color: 'success' },
  { value: 'moderate', labelKey: 'allergies.severity.moderate', color: 'warning' },
  { value: 'severe', labelKey: 'allergies.severity.severe', color: 'error' },
];

// ==================== Condition Status ====================
export const CONDITION_STATUS = [
  { value: 'active', labelKey: 'conditions.status.active', color: 'error' },
  { value: 'managed', labelKey: 'conditions.status.managed', color: 'warning' },
  { value: 'resolved', labelKey: 'conditions.status.resolved', color: 'success' },
];

// ==================== Document Types ====================
export const DOCUMENT_TYPES = [
  { value: 'prescription', labelKey: 'documents.types.prescription' },
  { value: 'lab_report', labelKey: 'documents.types.lab_report' },
  { value: 'scan', labelKey: 'documents.types.scan' },
  { value: 'discharge_summary', labelKey: 'documents.types.discharge_summary' },
  { value: 'insurance', labelKey: 'documents.types.insurance' },
  { value: 'vaccination', labelKey: 'documents.types.vaccination' },
  { value: 'other', labelKey: 'documents.types.other' },
];

// ==================== Emergency Types ====================
export const EMERGENCY_TYPES = [
  { value: 'medical', labelKey: 'emergency.types.medical', icon: 'Heart', color: 'error' },
  { value: 'accident', labelKey: 'emergency.types.accident', icon: 'AlertTriangle', color: 'error' },
  { value: 'fire', labelKey: 'emergency.types.fire', icon: 'Flame', color: 'error' },
  { value: 'other', labelKey: 'emergency.types.other', icon: 'AlertCircle', color: 'warning' },
];

// ==================== Relationship Types ====================
export const RELATIONSHIP_TYPES = [
  { value: 'father', labelKey: 'relationships.father' },
  { value: 'mother', labelKey: 'relationships.mother' },
  { value: 'spouse', labelKey: 'relationships.spouse' },
  { value: 'son', labelKey: 'relationships.son' },
  { value: 'daughter', labelKey: 'relationships.daughter' },
  { value: 'brother', labelKey: 'relationships.brother' },
  { value: 'sister', labelKey: 'relationships.sister' },
  { value: 'grandfather', labelKey: 'relationships.grandfather' },
  { value: 'grandmother', labelKey: 'relationships.grandmother' },
  { value: 'uncle', labelKey: 'relationships.uncle' },
  { value: 'aunt', labelKey: 'relationships.aunt' },
  { value: 'friend', labelKey: 'relationships.friend' },
  { value: 'other', labelKey: 'relationships.other' },
];

// ==================== Vital Signs Ranges ====================
export const VITAL_RANGES = {
  blood_pressure_systolic: { min: 70, max: 190, normal: { min: 90, max: 120 }, unit: 'mmHg' },
  blood_pressure_diastolic: { min: 40, max: 130, normal: { min: 60, max: 80 }, unit: 'mmHg' },
  heart_rate: { min: 40, max: 200, normal: { min: 60, max: 100 }, unit: 'bpm' },
  temperature: { min: 35, max: 42, normal: { min: 36.1, max: 37.2 }, unit: '°C' },
  oxygen_saturation: { min: 70, max: 100, normal: { min: 95, max: 100 }, unit: '%' },
  blood_sugar_fasting: { min: 50, max: 400, normal: { min: 70, max: 100 }, unit: 'mg/dL' },
  blood_sugar_pp: { min: 50, max: 500, normal: { min: 70, max: 140 }, unit: 'mg/dL' },
  weight: { min: 1, max: 300, unit: 'kg' },
  height: { min: 30, max: 250, unit: 'cm' },
};

// ==================== Indian States ====================
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// ==================== National Emergency Helplines ====================
export const EMERGENCY_HELPLINES = [
  { name: 'National Emergency', number: '112', icon: 'Phone' },
  { name: 'Ambulance', number: '102', icon: 'Ambulance' },
  { name: 'Police', number: '100', icon: 'Shield' },
  { name: 'Fire', number: '101', icon: 'Flame' },
  { name: 'Women Helpline', number: '181', icon: 'Heart' },
  { name: 'Child Helpline', number: '1098', icon: 'Baby' },
  { name: 'COVID Helpline', number: '1075', icon: 'Activity' },
  { name: 'Mental Health', number: '08046110007', icon: 'Brain' },
];

// ==================== Pagination ====================
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ==================== File Upload ====================
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ==================== Date/Time Formats ====================
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'hh:mm a';
export const DATETIME_FORMAT = 'dd/MM/yyyy hh:mm a';
export const API_DATE_FORMAT = 'yyyy-MM-dd';
export const API_TIME_FORMAT = 'HH:mm';
export const API_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

// ==================== Regex Patterns ====================
export const REGEX_PATTERNS = {
  PHONE_INDIA: /^[6-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PINCODE_INDIA: /^[1-9][0-9]{5}$/,
  AADHAAR: /^[2-9]{1}[0-9]{11}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  MEDICAL_REGISTRATION: /^[A-Z0-9]{5,15}$/,
  OTP: /^\d{6}$/,
  NAME: /^[a-zA-Z\s'.]+$/,
  NAME_HINDI: /^[\u0900-\u097F\s'.]+$/,
  NAME_TELUGU: /^[\u0C00-\u0C7F\s'.]+$/,
};

// ==================== Error Messages ====================
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

// ==================== Success Messages ====================
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful!',
  LOGOUT: 'Logged out successfully.',
  REGISTER: 'Registration successful!',
  PROFILE_UPDATED: 'Profile updated successfully.',
  APPOINTMENT_BOOKED: 'Appointment booked successfully.',
  APPOINTMENT_CANCELLED: 'Appointment cancelled.',
  PRESCRIPTION_CREATED: 'Prescription created successfully.',
  DOCUMENT_UPLOADED: 'Document uploaded successfully.',
  REMINDER_CREATED: 'Reminder created successfully.',
};

// ==================== Local Storage Keys ====================
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'mediconnect_access_token',
  REFRESH_TOKEN: 'mediconnect_refresh_token',
  USER: 'mediconnect_user',
  LANGUAGE: 'mediconnect_language',
  THEME: 'mediconnect_theme',
  VOICE_ENABLED: 'mediconnect_voice_enabled',
  VOICE_SETTINGS: 'mediconnect_voice_settings',
  RECENT_SEARCHES: 'mediconnect_recent_searches',
  FCM_TOKEN: 'mediconnect_fcm_token',
};

// ==================== Theme ====================
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// ==================== Breakpoints ====================
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ==================== Animation Durations ====================
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// ==================== Jitsi Configuration ====================
export const JITSI_CONFIG = {
  domain: 'meet.jit.si',
  defaultOptions: {
    roomName: '',
    width: '100%',
    height: '100%',
    parentNode: null,
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: false,
      enableWelcomePage: false,
      prejoinPageEnabled: false,
      disableDeepLinking: true,
    },
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'desktop', 'fullscreen',
        'hangup', 'chat', 'settings', 'videoquality',
      ],
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
    },
  },
};

export default {
  APP_NAME,
  APP_VERSION,
  API_BASE_URL,
  USER_ROLES,
  LANGUAGES,
  LANGUAGE_OPTIONS,
  SPECIALIZATIONS,
  APPOINTMENT_STATUS,
  CONSULTATION_TYPES,
  BLOOD_GROUPS,
  INDIAN_STATES,
  EMERGENCY_HELPLINES,
  REGEX_PATTERNS,
  STORAGE_KEYS,
  VITAL_RANGES,
};