// src/utils/apiHelpers.js

/**
 * Extracts the actual data from backend responses.
 * 
 * Backend wraps custom actions in: { success, message, data: { ... } }
 * But default DRF CRUD may return data directly.
 * This function handles both cases.
 */
export const extractData = (response) => {
  if (!response) return null;
  
  // If response has our wrapper structure { success, data }
  if (typeof response === 'object' && 'success' in response && 'data' in response) {
    return response.data;
  }
  
  // Already unwrapped (direct data)
  return response;
};

/**
 * Extract room info from any consultation-related response.
 * Handles all possible locations where room_name might be.
 */
export const extractRoomInfo = (data) => {
  if (!data) return null;
  
  const roomName = 
    data.room_name ||
    data.roomName ||
    data.room?.room_name ||
    data.room?.roomName ||
    data.embed_config?.roomName ||
    null;
  
  const jitsiDomain =
    data.jitsi_domain ||
    data.domain ||
    data.room?.jitsi_domain ||
    data.embed_config?.domain ||
    'meet.jit.si';
  
  const jwt = data.jwt || data.token || null;
  
  if (!roomName) return null;
  
  return {
    room_name: roomName,
    jitsi_domain: jitsiDomain,
    jwt,
    join_url: data.join_url || null,
    room_url: data.room_url || null,
    is_moderator: data.is_moderator || false,
    is_audio_only: data.is_audio_only || false,
    embed_config: data.embed_config || null,
    // spread remaining
    ...data,
  };
};

/**
 * Extract array results from paginated or plain responses.
 */
export const extractResults = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.data?.results && Array.isArray(data.data.results)) return data.data.results;
  return [];
};