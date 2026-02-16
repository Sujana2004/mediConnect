// src/components/consultation/JitsiMeet.jsx
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Loader } from '../common';

/**
 * Environment check for logging
 */
const isDev = import.meta.env.DEV;

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => isDev && console.error(...args),
};

/**
 * Jitsi Meet configuration defaults
 */
const DEFAULT_CONFIG = {
  disableDeepLinking: true,
  prejoinPageEnabled: false,
  startWithAudioMuted: false,
  startWithVideoMuted: false,
  enableClosePage: false,
  disableInviteFunctions: true,
  enableNoisyMicDetection: true,
  enableNoAudioDetection: true,
  enableTalkWhileMuted: true,
  disableRemoteMute: true,
  remoteVideoMenu: {
    disableKick: true,
    disableGrantModerator: true
  },
  disableProfile: true,
  hideConferenceSubject: false,
  hideConferenceTimer: false,
  hiddenPremeetingButtons: ['invite', 'select-background'],
  toolbarButtons: [
    'microphone',
    'camera',
    'closedcaptions',
    'desktop',
    'fullscreen',
    'fodeviceselection',
    'hangup',
    'chat',
    'settings',
    'videoquality',
    'tileview'
  ],
  notifications: [],
  disableModeratorIndicator: false,
  enableLobbyChat: false
};

/**
 * Default interface configuration
 */
const DEFAULT_INTERFACE_CONFIG = {
  SHOW_JITSI_WATERMARK: false,
  SHOW_WATERMARK_FOR_GUESTS: false,
  SHOW_BRAND_WATERMARK: false,
  SHOW_POWERED_BY: false,
  SHOW_PROMOTIONAL_CLOSE_PAGE: false,
  DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
  DISABLE_FOCUS_INDICATOR: false,
  DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
  DISABLE_VIDEO_BACKGROUND: false,
  GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
  MOBILE_APP_PROMO: false,
  HIDE_INVITE_MORE_HEADER: true,
  DISABLE_RINGING: false,
  ENABLE_DIAL_OUT: false,
  FILM_STRIP_MAX_HEIGHT: 120,
  VERTICAL_FILMSTRIP: true,
  CLOSE_PAGE_GUEST_HINT: false,
  RECENT_LIST_ENABLED: false,
  SETTINGS_SECTIONS: ['devices', 'language'],
  VIDEO_QUALITY_LABEL_DISABLED: false
};

/**
 * JitsiMeet Component
 * Integrates Jitsi Meet for video consultations
 */
const JitsiMeet = memo(({
  roomName,
  userName,
  userEmail,
  isDoctor = false,
  onApiReady,
  onReadyToClose,
  onParticipantJoined,
  onParticipantLeft,
  onVideoConferenceJoined,
  onVideoConferenceLeft,
  onAudioMuteStatusChanged,
  onVideoMuteStatusChanged,
  onError,
  config = {},
  interfaceConfig = {},
  domain = 'meet.jit.si',
  jwt = null,
  className = ''
}) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const scriptLoadedRef = useRef(false);

  /**
   * Load Jitsi Meet External API script
   */
  const loadJitsiScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src*="external_api.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', resolve);
        existingScript.addEventListener('error', reject);
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Jitsi Meet API'));
      document.head.appendChild(script);
    });
  }, [domain]);

  /**
   * Initialize Jitsi Meet
   */
  const initializeJitsi = useCallback(async () => {
    if (!containerRef.current || !roomName) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load Jitsi script if needed
      if (!window.JitsiMeetExternalAPI) {
        await loadJitsiScript();
      }

      // Destroy existing instance
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }

      // Merge configurations
      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        subject: isDoctor ? t('consultation.doctorConsultation') : t('consultation.patientConsultation')
      };

      const mergedInterfaceConfig = {
        ...DEFAULT_INTERFACE_CONFIG,
        ...interfaceConfig,
        APP_NAME: 'MediConnect',
        NATIVE_APP_NAME: 'MediConnect'
      };

      // Create Jitsi Meet instance
      const options = {
        roomName: roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: mergedConfig,
        interfaceConfigOverwrite: mergedInterfaceConfig,
        userInfo: {
          displayName: userName || (isDoctor ? t('consultation.doctor') : t('consultation.patient')),
          email: userEmail || ''
        }
      };

      // Add JWT if provided
      if (jwt) {
        options.jwt = jwt;
      }

      logger.log('Initializing Jitsi Meet with options:', {
        roomName,
        userName,
        isDoctor
      });

      // Create API instance
      const api = new window.JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      // Set up event listeners
      api.addListener('videoConferenceJoined', (data) => {
        logger.log('Video conference joined:', data);
        setIsLoading(false);
        onVideoConferenceJoined?.(data);
      });

      api.addListener('videoConferenceLeft', (data) => {
        logger.log('Video conference left:', data);
        onVideoConferenceLeft?.(data);
      });

      api.addListener('readyToClose', () => {
        logger.log('Ready to close');
        onReadyToClose?.();
      });

      api.addListener('participantJoined', (data) => {
        logger.log('Participant joined:', data);
        onParticipantJoined?.(data);
      });

      api.addListener('participantLeft', (data) => {
        logger.log('Participant left:', data);
        onParticipantLeft?.(data);
      });

      api.addListener('audioMuteStatusChanged', (data) => {
        logger.log('Audio mute status:', data);
        onAudioMuteStatusChanged?.(data);
      });

      api.addListener('videoMuteStatusChanged', (data) => {
        logger.log('Video mute status:', data);
        onVideoMuteStatusChanged?.(data);
      });

      api.addListener('errorOccurred', (data) => {
        logger.error('Jitsi error:', data);
        setError(data.error || 'An error occurred');
        onError?.(data);
      });

      // Notify parent that API is ready
      onApiReady?.(api);

    } catch (err) {
      logger.error('Failed to initialize Jitsi:', err);
      setError(err.message || 'Failed to initialize video call');
      setIsLoading(false);
      onError?.(err);
    }
  }, [
    roomName,
    userName,
    userEmail,
    isDoctor,
    domain,
    jwt,
    config,
    interfaceConfig,
    loadJitsiScript,
    onApiReady,
    onReadyToClose,
    onParticipantJoined,
    onParticipantLeft,
    onVideoConferenceJoined,
    onVideoConferenceLeft,
    onAudioMuteStatusChanged,
    onVideoMuteStatusChanged,
    onError,
    t
  ]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeJitsi();

    return () => {
      if (apiRef.current) {
        logger.log('Disposing Jitsi API');
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [initializeJitsi]);

  /**
   * Expose API methods
   */
  useEffect(() => {
    if (apiRef.current && onApiReady) {
      onApiReady(apiRef.current);
    }
  }, [onApiReady]);

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6 ${className}`}>
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold mb-2">{t('consultation.connectionError')}</h3>
        <p className="text-gray-400 text-center mb-4">{error}</p>
        <button
          onClick={initializeJitsi}
          className="px-6 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
          <Loader size="lg" className="text-white" />
          <p className="text-white mt-4">{t('consultation.connecting')}</p>
        </div>
      )}

      {/* Jitsi container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
});

JitsiMeet.displayName = 'JitsiMeet';

JitsiMeet.propTypes = {
  roomName: PropTypes.string.isRequired,
  userName: PropTypes.string,
  userEmail: PropTypes.string,
  isDoctor: PropTypes.bool,
  onApiReady: PropTypes.func,
  onReadyToClose: PropTypes.func,
  onParticipantJoined: PropTypes.func,
  onParticipantLeft: PropTypes.func,
  onVideoConferenceJoined: PropTypes.func,
  onVideoConferenceLeft: PropTypes.func,
  onAudioMuteStatusChanged: PropTypes.func,
  onVideoMuteStatusChanged: PropTypes.func,
  onError: PropTypes.func,
  config: PropTypes.object,
  interfaceConfig: PropTypes.object,
  domain: PropTypes.string,
  jwt: PropTypes.string,
  className: PropTypes.string
};

export default JitsiMeet;