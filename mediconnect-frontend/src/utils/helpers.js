/**
 * Helper Utility Functions
 * Reusable utility functions used throughout the application
 */

import { format, formatDistanceToNow, parseISO, isValid, differenceInYears } from 'date-fns';
import { enIN, hi } from 'date-fns/locale';
import {
  DATE_FORMAT,
  TIME_FORMAT,
  DATETIME_FORMAT,
  API_DATE_FORMAT,
  API_TIME_FORMAT,
  VITAL_RANGES,
  STORAGE_KEYS,
} from './constants';

// ==================== Date & Time Helpers ====================

/**
 * Get locale for date-fns based on language code
 * @param {string} language - Language code (en/hi/te)
 * @returns {Object} date-fns locale
 */
const getDateLocale = (language) => {
  const locales = {
    en: enIN,
    hi: hi,
    te: enIN, // Telugu falls back to English-India
  };
  return locales[language] || enIN;
};

/**
 * Format date to display format
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string (default: dd/MM/yyyy)
 * @param {string} language - Language code
 * @returns {string} Formatted date
 */
export const formatDate = (date, formatStr = DATE_FORMAT, language = 'en') => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, formatStr, { locale: getDateLocale(language) });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format time to display format
 * @param {string} time - Time string (HH:mm or HH:mm:ss)
 * @param {string} formatStr - Format string
 * @returns {string} Formatted time
 */
export const formatTime = (time, formatStr = TIME_FORMAT) => {
  if (!time) return '';
  
  try {
    // Create a date with the time
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
};

/**
 * Format duration in minutes to human readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30m" or "45m")
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Format datetime to display format
 * @param {string|Date} datetime - DateTime to format
 * @param {string} formatStr - Format string
 * @param {string} language - Language code
 * @returns {string} Formatted datetime
 */
export const formatDateTime = (datetime, formatStr = DATETIME_FORMAT, language = 'en') => {
  return formatDate(datetime, formatStr, language);
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @param {string} language - Language code
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date, language = 'en') => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: getDateLocale(language),
    });
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
};

/**
 * Format date for API requests
 * @param {Date} date - Date object
 * @returns {string} Formatted date (yyyy-MM-dd)
 */
export const formatDateForAPI = (date) => {
  if (!date || !isValid(date)) return '';
  return format(date, API_DATE_FORMAT);
};

/**
 * Format time for API requests
 * @param {Date|string} time - Time
 * @returns {string} Formatted time (HH:mm)
 */
export const formatTimeForAPI = (time) => {
  if (!time) return '';
  
  if (typeof time === 'string') {
    return time.substring(0, 5); // Return HH:mm from HH:mm:ss
  }
  
  return format(time, API_TIME_FORMAT);
};

/**
 * Calculate age from date of birth
 * @param {string|Date} dob - Date of birth
 * @returns {number} Age in years
 */
export const calculateAge = (dob) => {
  if (!dob) return 0;
  
  try {
    const dateObj = typeof dob === 'string' ? parseISO(dob) : dob;
    if (!isValid(dateObj)) return 0;
    
    return differenceInYears(new Date(), dateObj);
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
};

/**
 * Check if a date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export const isPastDate = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dateObj < today;
};

// ==================== String Helpers ====================

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize first letter of each word
 * @param {string} str - String to title case
 * @returns {string} Title cased string
 */
export const titleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 50) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Indian phone number format
  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
  }
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.substring(2, 7)} ${digits.substring(7)}`;
  }
  
  return phone;
};

/**
 * Mask phone number for privacy
 * @param {string} phone - Phone number
 * @returns {string} Masked phone number
 */
export const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `${digits.substring(0, 2)}******${digits.substring(digits.length - 2)}`;
  }
  
  return phone;
};

/**
 * Slugify string
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
export const slugify = (str) => {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ==================== Number Helpers ====================

/**
 * Format currency (Indian Rupees)
 * @param {number} amount - Amount
 * @param {boolean} showSymbol - Show ₹ symbol
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined) return '';
  
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format number with Indian numbering system
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  
  return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Clamp number between min and max
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped number
 */
export const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

// ==================== Object/Array Helpers ====================

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Error deep cloning:', error);
    return obj;
  }
};

/**
 * Remove empty/null/undefined values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
export const cleanObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => !isEmpty(value))
  );
};

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Sort array of objects by key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
export const sortBy = (array, key, order = 'asc') => {
  if (!Array.isArray(array)) return [];
  
  return [...array].sort((a, b) => {
    const valueA = a[key];
    const valueB = b[key];
    
    if (valueA < valueB) return order === 'asc' ? -1 : 1;
    if (valueA > valueB) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Remove duplicates from array
 * @param {Array} array - Array with duplicates
 * @param {string} key - Key to check for duplicates (for objects)
 * @returns {Array} Array without duplicates
 */
export const removeDuplicates = (array, key = null) => {
  if (!Array.isArray(array)) return [];
  
  if (key) {
    const seen = new Set();
    return array.filter((item) => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(array)];
};

// ==================== Vital Signs Helpers ====================

/**
 * Check if vital sign is in normal range
 * @param {string} type - Vital type
 * @param {number} value - Vital value
 * @returns {string} Status ('normal', 'low', 'high')
 */
export const getVitalStatus = (type, value) => {
  const range = VITAL_RANGES[type];
  if (!range || !range.normal) return 'unknown';
  
  if (value < range.normal.min) return 'low';
  if (value > range.normal.max) return 'high';
  return 'normal';
};

/**
 * Get vital status color
 * @param {string} status - Vital status
 * @returns {string} Color class
 */
export const getVitalStatusColor = (status) => {
  const colors = {
    normal: 'text-green-600',
    low: 'text-blue-600',
    high: 'text-red-600',
    unknown: 'text-gray-600',
  };
  return colors[status] || colors.unknown;
};

/**
 * Calculate BMI
 * @param {number} weightKg - Weight in kg
 * @param {number} heightCm - Height in cm
 * @returns {Object} BMI value and category
 */
export const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return { value: 0, category: 'unknown' };
  
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBMI = Math.round(bmi * 10) / 10;
  
  let category = 'normal';
  if (bmi < 18.5) category = 'underweight';
  else if (bmi >= 25 && bmi < 30) category = 'overweight';
  else if (bmi >= 30) category = 'obese';
  
  return { value: roundedBMI, category };
};

// ==================== Storage Helpers ====================

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from storage:', error);
    return defaultValue;
  }
};

/**
 * Set item in localStorage with JSON stringify
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export const setToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to storage:', error);
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from storage:', error);
  }
};

/**
 * Clear all app-related items from localStorage
 */
export const clearAppStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

// ==================== URL Helpers ====================

/**
 * Build URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} Full URL
 */
export const buildUrl = (baseUrl, params = {}) => {
  const cleanParams = cleanObject(params);
  const queryString = new URLSearchParams(cleanParams).toString();
  
  if (!queryString) return baseUrl;
  return `${baseUrl}?${queryString}`;
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string
 * @returns {Object} Parsed parameters
 */
export const parseQueryString = (queryString) => {
  if (!queryString) return {};
  
  const params = new URLSearchParams(queryString);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
};

// ==================== File Helpers ====================

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Get file extension
 * @param {string} filename - File name
 * @returns {string} Extension
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Check if file is an image
 * @param {string} filename - File name or MIME type
 * @returns {boolean}
 */
export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext) || filename.startsWith('image/');
};

// ==================== Debounce & Throttle ====================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeoutId = null;
  
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle = false;
  
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// ==================== Misc Helpers ====================

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Check if device supports touch
 * @returns {boolean}
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get device type
 * @returns {string} Device type ('mobile', 'tablet', 'desktop')
 */
export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Scroll to top of page
 * @param {boolean} smooth - Use smooth scrolling
 */
export const scrollToTop = (smooth = true) => {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto',
  });
};

/**
 * Scroll to element
 * @param {string} elementId - Element ID
 * @param {number} offset - Offset from top
 */
export const scrollToElement = (elementId, offset = 0) => {
  const element = document.getElementById(elementId);
  if (element) {
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

export default {
  // Date/Time
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  getRelativeTime,
  formatDateForAPI,
  formatTimeForAPI,
  calculateAge,
  isToday,
  isPastDate,
  // String
  capitalize,
  titleCase,
  truncate,
  getInitials,
  formatPhoneNumber,
  maskPhoneNumber,
  slugify,
  // Number
  formatCurrency,
  formatNumber,
  generateRandomString,
  clamp,
  // Object/Array
  isEmpty,
  deepClone,
  cleanObject,
  groupBy,
  sortBy,
  removeDuplicates,
  // Vitals
  getVitalStatus,
  getVitalStatusColor,
  calculateBMI,
  // Storage
  getFromStorage,
  setToStorage,
  removeFromStorage,
  clearAppStorage,
  // URL
  buildUrl,
  parseQueryString,
  // File
  formatFileSize,
  getFileExtension,
  isImageFile,
  // Debounce/Throttle
  debounce,
  throttle,
  // Misc
  sleep,
  copyToClipboard,
  isMobile,
  isTouchDevice,
  getDeviceType,
  scrollToTop,
  scrollToElement,
};