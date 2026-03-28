// src/components/consultation/JitsiMeet.jsx
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Loader } from '../common';

const isDev = import.meta.env.DEV;

const logger = {
  log: (...args) => isDev && console.log('[JitsiMeet]', ...args),
  error: (...args) => console.error('[JitsiMeet]', ...args),
};

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
    disableGrantModerator: true,
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
    'tileview',
  ],
  notifications: [],
  disableModeratorIndicator: false,
  enableLobbyChat: false,
};

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
  VIDEO_QUALITY_LABEL_DISABLED: false,
};

/**
 * Load Jitsi external API script
 */
const loadJitsiScript = (domain) => {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="external_api.js"]'
    );
    if (existingScript) {
      if (window.JitsiMeetExternalAPI) {
        resolve();
      } else {
        existingScript.addEventListener('load', resolve);
        existingScript.addEventListener('error', reject);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error('Failed to load Jitsi Meet API'));
    document.head.appendChild(script);
  });
};

const JitsiMeet = memo(
  ({
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
    className = '',
  }) => {
    const { t } = useTranslation();
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Store callbacks in refs to avoid re-initialization
    const callbacksRef = useRef({});
    useEffect(() => {
      callbacksRef.current = {
        onApiReady,
        onReadyToClose,
        onParticipantJoined,
        onParticipantLeft,
        onVideoConferenceJoined,
        onVideoConferenceLeft,
        onAudioMuteStatusChanged,
        onVideoMuteStatusChanged,
        onError,
      };
    });

    /**
     * Initialize Jitsi — only depends on roomName, domain, 
     * userName, jwt (things that actually change the meeting)
     */
    const initializeJitsi = useCallback(async () => {
      if (!containerRef.current || !roomName) {
        logger.log('Skipping init: no container or roomName');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load script
        await loadJitsiScript(domain);

        // Dispose previous instance
        if (apiRef.current) {
          try {
            apiRef.current.dispose();
          } catch (e) {
            logger.error('Error disposing previous Jitsi:', e);
          }
          apiRef.current = null;
        }

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const mergedConfig = {
          ...DEFAULT_CONFIG,
          ...config,
          subject: isDoctor
            ? t('consultation.doctorConsultation', 'Doctor Consultation')
            : t('consultation.patientConsultation', 'Patient Consultation'),
        };

        const mergedInterfaceConfig = {
          ...DEFAULT_INTERFACE_CONFIG,
          ...interfaceConfig,
          APP_NAME: 'MediConnect',
          NATIVE_APP_NAME: 'MediConnect',
        };

        const options = {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: mergedConfig,
          interfaceConfigOverwrite: mergedInterfaceConfig,
          userInfo: {
            displayName:
              userName ||
              (isDoctor
                ? t('consultation.doctor', 'Doctor')
                : t('consultation.patient', 'Patient')),
            email: userEmail || '',
          },
        };

        if (jwt) {
          options.jwt = jwt;
        }

        logger.log('Initializing Jitsi Meet:', {
          roomName,
          domain,
          userName,
          isDoctor,
        });

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // ✅ Use callbacksRef so listeners always call latest callbacks
        api.addListener('videoConferenceJoined', (data) => {
          logger.log('Conference joined:', data);
          setIsLoading(false);
          callbacksRef.current.onVideoConferenceJoined?.(data);
        });

        api.addListener('videoConferenceLeft', (data) => {
          logger.log('Conference left:', data);
          callbacksRef.current.onVideoConferenceLeft?.(data);
        });

        api.addListener('readyToClose', () => {
          logger.log('Ready to close');
          callbacksRef.current.onReadyToClose?.();
        });

        api.addListener('participantJoined', (data) => {
          logger.log('Participant joined:', data);
          callbacksRef.current.onParticipantJoined?.(data);
        });

        api.addListener('participantLeft', (data) => {
          logger.log('Participant left:', data);
          callbacksRef.current.onParticipantLeft?.(data);
        });

        api.addListener('audioMuteStatusChanged', (data) => {
          callbacksRef.current.onAudioMuteStatusChanged?.(data);
        });

        api.addListener('videoMuteStatusChanged', (data) => {
          callbacksRef.current.onVideoMuteStatusChanged?.(data);
        });

        api.addListener('errorOccurred', (data) => {
          logger.error('Jitsi error:', data);
          setError(data.error || 'An error occurred');
          callbacksRef.current.onError?.(data);
        });

        // ✅ Single onApiReady call
        callbacksRef.current.onApiReady?.(api);
      } catch (err) {
        logger.error('Failed to initialize Jitsi:', err);
        setError(err.message || 'Failed to initialize video call');
        setIsLoading(false);
        callbacksRef.current.onError?.(err);
      }
      // ✅ Only re-init when these ACTUALLY change
    }, [roomName, domain, userName, userEmail, isDoctor, jwt, t]);

    // ✅ Initialize once when roomName/domain change — no infinite loop
    useEffect(() => {
      if (roomName) {
        initializeJitsi();
      }

      return () => {
        if (apiRef.current) {
          logger.log('Disposing Jitsi API on cleanup');
          try {
            apiRef.current.dispose();
          } catch (e) {
            logger.error('Dispose error:', e);
          }
          apiRef.current = null;
        }
      };
    }, [initializeJitsi]);

    /**
     * Retry handler
     */
    const handleRetry = useCallback(() => {
      setError(null);
      initializeJitsi();
    }, [initializeJitsi]);

    // Error state
    if (error) {
      return (
        <div
          className={`flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6 ${className}`}
        >
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">
            {t('consultation.connectionError', 'Connection Error')}
          </h3>
          <p className="text-gray-400 text-center mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      );
    }

    return (
      <div className={`relative w-full h-full ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
            <Loader size="lg" className="text-white" />
            <p className="text-white mt-4">
              {t('consultation.connecting', 'Connecting...')}
            </p>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>
    );
  }
);

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
  className: PropTypes.string,
};

export default JitsiMeet;