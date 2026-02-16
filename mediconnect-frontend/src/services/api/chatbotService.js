/**
 * Chatbot API Service
 * Handles all chatbot-related API calls including messaging and health tips
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const CHATBOT_ENDPOINTS = Object.freeze({
  SESSION_START: '/chatbot/session/start/',
  SESSION_BASE: '/chatbot/session/',
  MESSAGE: '/chatbot/message/',
  VOICE_MESSAGE: '/chatbot/message/voice/',
  SESSIONS: '/chatbot/sessions/',
  FAQ: '/chatbot/faq/',
  HEALTH_TIPS: '/chatbot/health-tips/',
  TRANSLATE: '/chatbot/translate/',
  TTS: '/chatbot/text-to-speech/',
  DETECT_LANGUAGE: '/chatbot/detect-language/',
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

// ========== Chat Sessions ==========

/**
 * Start a new chat session
 * @param {Object} [sessionData] - Session data
 * @param {string} [sessionData.language] - Preferred language
 * @param {string} [sessionData.context] - Context (general/symptoms/medicines/appointments)
 * @returns {Promise<Object>} Session data with session_id
 */
export const startSession = async (sessionData = {}) => {
  const response = await api.post(CHATBOT_ENDPOINTS.SESSION_START, sessionData);
  return response.data;
};

/**
 * Get session messages
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} List of messages
 */
export const getSessionMessages = async (sessionId) => {
  const endpoint = buildEndpoint(CHATBOT_ENDPOINTS.SESSION_BASE, sessionId, 'messages');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * End a chat session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Session summary
 */
export const endSession = async (sessionId) => {
  const endpoint = buildEndpoint(CHATBOT_ENDPOINTS.SESSION_BASE, sessionId, 'end');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Get user's chat sessions
 * @param {Object} [filters] - Filter options
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated sessions list
 */
export const getSessions = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${CHATBOT_ENDPOINTS.SESSIONS}${queryString}`);
  return response.data;
};

// ========== Messaging ==========

/**
 * Send a text message to chatbot
 * @param {Object} messageData - Message data
 * @param {string} messageData.message - Message text
 * @param {string} messageData.session_id - Session ID
 * @param {string} [messageData.language] - Message language
 * @returns {Promise<Object>} Bot response
 */
export const sendMessage = async (messageData) => {
  const response = await api.post(CHATBOT_ENDPOINTS.MESSAGE, messageData);
  return response.data;
};

/**
 * Send a voice message to chatbot
 * @param {Object} voiceData - Voice message data
 * @param {Blob|File} voiceData.audio - Audio file/blob
 * @param {string} voiceData.session_id - Session ID
 * @param {string} [voiceData.language] - Audio language
 * @returns {Promise<Object>} Bot response
 */
export const sendVoiceMessage = async (voiceData) => {
  const formData = new FormData();
  formData.append('audio', voiceData.audio);
  formData.append('session_id', voiceData.session_id);

  if (voiceData.language) {
    formData.append('language', voiceData.language);
  }

  const response = await api.post(CHATBOT_ENDPOINTS.VOICE_MESSAGE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ========== FAQ & Health Tips ==========

/**
 * Get frequently asked questions
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.category] - FAQ category
 * @param {string} [filters.language] - Language code
 * @returns {Promise<Array>} List of FAQs
 */
export const getFAQs = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${CHATBOT_ENDPOINTS.FAQ}${queryString}`);
  return response.data;
};

/**
 * Get health tips
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.category] - Tips category
 * @param {string} [filters.language] - Language code
 * @returns {Promise<Array>} List of health tips
 */
export const getHealthTips = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${CHATBOT_ENDPOINTS.HEALTH_TIPS}${queryString}`);
  return response.data;
};

/**
 * Get daily health tip
 * @param {string} [language] - Language code
 * @returns {Promise<Object>} Daily health tip
 */
export const getDailyHealthTip = async (language = 'en') => {
  const queryString = buildQueryString({ language });
  const response = await api.get(`${CHATBOT_ENDPOINTS.HEALTH_TIPS}daily/${queryString}`);
  return response.data;
};

// ========== Translation & TTS ==========

/**
 * Translate text
 * @param {Object} translateData - Translation data
 * @param {string} translateData.text - Text to translate
 * @param {string} translateData.source_language - Source language code
 * @param {string} translateData.target_language - Target language code
 * @returns {Promise<Object>} Translated text
 */
export const translateText = async (translateData) => {
  const response = await api.post(CHATBOT_ENDPOINTS.TRANSLATE, translateData);
  return response.data;
};

/**
 * Convert text to speech
 * @param {Object} ttsData - TTS data
 * @param {string} ttsData.text - Text to convert
 * @param {string} [ttsData.language] - Language code
 * @param {string} [ttsData.voice] - Voice type (male/female)
 * @returns {Promise<Blob>} Audio blob
 */
export const textToSpeech = async (ttsData) => {
  const response = await api.post(CHATBOT_ENDPOINTS.TTS, ttsData, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Detect language of text
 * @param {Object} detectData - Detection data
 * @param {string} detectData.text - Text to analyze
 * @returns {Promise<Object>} Detected language info
 */
export const detectLanguage = async (detectData) => {
  const response = await api.post(CHATBOT_ENDPOINTS.DETECT_LANGUAGE, detectData);
  return response.data;
};

/**
 * Chatbot service default export
 * Groups all chatbot-related API methods
 */
export default {
  // Sessions
  startSession,
  getSessionMessages,
  endSession,
  getSessions,
  // Messaging
  sendMessage,
  sendVoiceMessage,
  // FAQ & Tips
  getFAQs,
  getHealthTips,
  getDailyHealthTip,
  // Translation & TTS
  translateText,
  textToSpeech,
  detectLanguage,
};