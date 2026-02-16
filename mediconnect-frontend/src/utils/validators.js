/**
 * Validation Utility Functions
 * Form validation and data validation helpers
 */

import { z } from 'zod';
import { REGEX_PATTERNS, BLOOD_GROUPS } from './constants';

// ==================== Basic Validators ====================

/**
 * Check if value is required (not empty)
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return REGEX_PATTERNS.EMAIL.test(email.trim());
};

/**
 * Validate Indian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  
  // 10 digit number starting with 6-9
  if (digits.length === 10) {
    return REGEX_PATTERNS.PHONE_INDIA.test(digits);
  }
  
  // 12 digit with 91 prefix
  if (digits.length === 12 && digits.startsWith('91')) {
    return REGEX_PATTERNS.PHONE_INDIA.test(digits.substring(2));
  }
  
  return false;
};

/**
 * Validate Indian pincode
 * @param {string} pincode - Pincode to validate
 * @returns {boolean}
 */
export const isValidPincode = (pincode) => {
  if (!pincode) return false;
  return REGEX_PATTERNS.PINCODE_INDIA.test(pincode.trim());
};

/**
 * Validate Aadhaar number
 * @param {string} aadhaar - Aadhaar number to validate
 * @returns {boolean}
 */
export const isValidAadhaar = (aadhaar) => {
  if (!aadhaar) return false;
  const digits = aadhaar.replace(/\D/g, '');
  return REGEX_PATTERNS.AADHAAR.test(digits);
};

/**
 * Validate PAN number
 * @param {string} pan - PAN number to validate
 * @returns {boolean}
 */
export const isValidPAN = (pan) => {
  if (!pan) return false;
  return REGEX_PATTERNS.PAN.test(pan.trim().toUpperCase());
};

/**
 * Validate OTP (6 digits)
 * @param {string} otp - OTP to validate
 * @returns {boolean}
 */
export const isValidOTP = (otp) => {
  if (!otp) return false;
  return REGEX_PATTERNS.OTP.test(otp.trim());
};

/**
 * Validate name (letters, spaces, apostrophes, dots)
 * @param {string} name - Name to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {boolean}
 */
export const isValidName = (name, minLength = 2, maxLength = 100) => {
  if (!name) return false;
  const trimmed = name.trim();
  
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return false;
  }
  
  // Allow English, Hindi, and Telugu characters
  return (
    REGEX_PATTERNS.NAME.test(trimmed) ||
    REGEX_PATTERNS.NAME_HINDI.test(trimmed) ||
    REGEX_PATTERNS.NAME_TELUGU.test(trimmed)
  );
};

/**
 * Validate medical registration number
 * @param {string} regNumber - Registration number
 * @returns {boolean}
 */
export const isValidMedicalRegistration = (regNumber) => {
  if (!regNumber) return false;
  return REGEX_PATTERNS.MEDICAL_REGISTRATION.test(regNumber.trim().toUpperCase());
};

/**
 * Validate date is not in future
 * @param {Date|string} date - Date to validate
 * @returns {boolean}
 */
export const isNotFutureDate = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj <= new Date();
};

/**
 * Validate date is not in past
 * @param {Date|string} date - Date to validate
 * @returns {boolean}
 */
export const isNotPastDate = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj >= today;
};

/**
 * Validate age range
 * @param {Date|string} dob - Date of birth
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {boolean}
 */
export const isValidAge = (dob, minAge = 0, maxAge = 120) => {
  if (!dob) return false;
  
  const dateObj = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - dateObj.getFullYear();
  const monthDiff = today.getMonth() - dateObj.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
    age--;
  }
  
  return age >= minAge && age <= maxAge;
};

/**
 * Validate blood group
 * @param {string} bloodGroup - Blood group
 * @returns {boolean}
 */
export const isValidBloodGroup = (bloodGroup) => {
  if (!bloodGroup) return false;
  return BLOOD_GROUPS.includes(bloodGroup.toUpperCase());
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export const isValidURL = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeBytes - Maximum size in bytes
 * @returns {boolean}
 */
export const isValidFileSize = (file, maxSizeBytes) => {
  if (!file) return false;
  return file.size <= maxSizeBytes;
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array<string>} allowedTypes - Allowed MIME types
 * @returns {boolean}
 */
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !allowedTypes) return false;
  return allowedTypes.includes(file.type);
};

// ==================== Zod Schemas ====================

/**
 * Phone number schema
 */
export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be 10 digits')
  .max(12, 'Invalid phone number')
  .refine(isValidPhone, 'Invalid Indian phone number');

/**
 * Email schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''));

/**
 * Name schema
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .refine((val) => isValidName(val), 'Invalid name format');

/**
 * OTP schema
 */
export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

/**
 * Pincode schema
 */
export const pincodeSchema = z
  .string()
  .length(6, 'Pincode must be 6 digits')
  .refine(isValidPincode, 'Invalid Indian pincode');

/**
 * Date of birth schema
 */
export const dobSchema = z
  .string()
  .or(z.date())
  .refine((val) => isNotFutureDate(val), 'Date of birth cannot be in the future')
  .refine((val) => isValidAge(val, 0, 120), 'Invalid date of birth');

/**
 * Patient registration schema
 */
export const patientRegistrationSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema,
  date_of_birth: dobSchema,
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  email: emailSchema,
  address: z.string().max(500, 'Address too long').optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: pincodeSchema.optional().or(z.literal('')),
  blood_group: z.enum([...BLOOD_GROUPS, ''], {
    errorMap: () => ({ message: 'Invalid blood group' }),
  }).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: phoneSchema.optional().or(z.literal('')),
  preferred_language: z.enum(['en', 'hi', 'te']).default('en'),
});

/**
 * Doctor registration schema
 */
export const doctorRegistrationSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema,
  date_of_birth: dobSchema,
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  email: emailSchema,
  specialization: z.string().min(1, 'Please select a specialization'),
  registration_number: z
    .string()
    .min(5, 'Registration number must be at least 5 characters')
    .max(20, 'Registration number too long')
    .refine(isValidMedicalRegistration, 'Invalid medical registration number'),
  registration_council: z.string().min(2, 'Please enter registration council'),
  experience_years: z
    .number({ invalid_type_error: 'Please enter years of experience' })
    .min(0, 'Experience cannot be negative')
    .max(70, 'Invalid experience years'),
  qualification: z.string().min(2, 'Please enter qualification'),
  bio: z.string().max(1000, 'Bio too long').optional(),
  consultation_fee: z
    .number({ invalid_type_error: 'Please enter consultation fee' })
    .min(0, 'Fee cannot be negative')
    .max(100000, 'Fee too high')
    .optional(),
  languages_spoken: z.array(z.string()).min(1, 'Select at least one language'),
  clinic_name: z.string().max(200).optional(),
  clinic_address: z.string().max(500).optional(),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  phone: phoneSchema,
});

/**
 * OTP verification schema
 */
export const otpVerificationSchema = z.object({
  otp: otpSchema,
});

/**
 * Appointment booking schema
 */
export const appointmentBookingSchema = z.object({
  doctor_id: z.number().or(z.string()).refine((val) => val, 'Please select a doctor'),
  date: z.string().or(z.date()).refine(isNotPastDate, 'Cannot book appointment in the past'),
  time_slot: z.string().min(1, 'Please select a time slot'),
  consultation_type: z.enum(['video', 'audio', 'in_person', 'chat'], {
    errorMap: () => ({ message: 'Please select consultation type' }),
  }),
  reason: z.string().max(500, 'Reason too long').optional(),
  symptoms: z.string().max(1000, 'Description too long').optional(),
});

/**
 * Vital signs schema
 */
export const vitalsSchema = z.object({
  blood_pressure_systolic: z
    .number()
    .min(70, 'Systolic BP too low')
    .max(250, 'Systolic BP too high')
    .optional()
    .nullable(),
  blood_pressure_diastolic: z
    .number()
    .min(40, 'Diastolic BP too low')
    .max(150, 'Diastolic BP too high')
    .optional()
    .nullable(),
  heart_rate: z
    .number()
    .min(30, 'Heart rate too low')
    .max(250, 'Heart rate too high')
    .optional()
    .nullable(),
  temperature: z
    .number()
    .min(35, 'Temperature too low')
    .max(43, 'Temperature too high')
    .optional()
    .nullable(),
  oxygen_saturation: z
    .number()
    .min(50, 'SpO2 too low')
    .max(100, 'SpO2 cannot exceed 100')
    .optional()
    .nullable(),
  blood_sugar: z
    .number()
    .min(20, 'Blood sugar too low')
    .max(700, 'Blood sugar too high')
    .optional()
    .nullable(),
  weight_kg: z
    .number()
    .min(1, 'Weight too low')
    .max(500, 'Weight too high')
    .optional()
    .nullable(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

/**
 * Allergy schema
 */
export const allergySchema = z.object({
  allergen: z.string().min(1, 'Please enter allergen name').max(200),
  allergy_type: z.enum(['food', 'drug', 'environmental', 'insect', 'latex', 'other'], {
    errorMap: () => ({ message: 'Please select allergy type' }),
  }),
  severity: z.enum(['mild', 'moderate', 'severe'], {
    errorMap: () => ({ message: 'Please select severity' }),
  }),
  reaction: z.string().max(500, 'Description too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

/**
 * Medical condition schema
 */
export const conditionSchema = z.object({
  name: z.string().min(1, 'Please enter condition name').max(200),
  diagnosed_date: z.string().optional(),
  status: z.enum(['active', 'managed', 'resolved']).default('active'),
  is_chronic: z.boolean().default(false),
  notes: z.string().max(500, 'Notes too long').optional(),
});

/**
 * Emergency contact schema
 */
export const emergencyContactSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  relationship: z.string().min(1, 'Please select relationship'),
  is_primary: z.boolean().default(false),
  notify_on_sos: z.boolean().default(true),
});

/**
 * Medicine reminder schema
 */
export const medicineReminderSchema = z.object({
  medicine_name: z.string().min(1, 'Please enter medicine name').max(200),
  dosage: z.string().min(1, 'Please enter dosage').max(100),
  frequency: z.string().min(1, 'Please select frequency'),
  times: z.array(z.string()).min(1, 'Select at least one time'),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()).optional(),
  instructions: z.string().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Feedback schema
 */
export const feedbackSchema = z.object({
  rating: z.number().min(1, 'Please provide a rating').max(5),
  comment: z.string().max(1000, 'Comment too long').optional(),
  would_recommend: z.boolean().optional(),
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  full_name: nameSchema.optional(),
  email: emailSchema,
  address: z.string().max(500).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: pincodeSchema.optional().or(z.literal('')),
  blood_group: z.enum([...BLOOD_GROUPS, '']).optional(),
  preferred_language: z.enum(['en', 'hi', 'te']).optional(),
});

// ==================== Validation Helper Functions ====================

/**
 * Validate data against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Object} { success: boolean, data?: Object, errors?: Object }
 */
export const validateWithSchema = (schema, data) => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _: 'Validation failed' } };
  }
};

/**
 * Get error message for a field
 * @param {Object} errors - Errors object
 * @param {string} field - Field name
 * @returns {string|null} Error message or null
 */
export const getFieldError = (errors, field) => {
  if (!errors || !field) return null;
  return errors[field] || null;
};

/**
 * Check if field has error
 * @param {Object} errors - Errors object
 * @param {string} field - Field name
 * @returns {boolean}
 */
export const hasFieldError = (errors, field) => {
  return Boolean(getFieldError(errors, field));
};

export default {
  // Basic validators
  isRequired,
  isValidEmail,
  isValidPhone,
  isValidPincode,
  isValidAadhaar,
  isValidPAN,
  isValidOTP,
  isValidName,
  isValidMedicalRegistration,
  isNotFutureDate,
  isNotPastDate,
  isValidAge,
  isValidBloodGroup,
  isValidURL,
  isValidFileSize,
  isValidFileType,
  // Zod schemas
  phoneSchema,
  emailSchema,
  nameSchema,
  otpSchema,
  pincodeSchema,
  dobSchema,
  patientRegistrationSchema,
  doctorRegistrationSchema,
  loginSchema,
  otpVerificationSchema,
  appointmentBookingSchema,
  vitalsSchema,
  allergySchema,
  conditionSchema,
  emergencyContactSchema,
  medicineReminderSchema,
  feedbackSchema,
  profileUpdateSchema,
  // Helpers
  validateWithSchema,
  getFieldError,
  hasFieldError,
};