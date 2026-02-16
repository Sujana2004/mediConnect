// src/components/consultation/VideoConsult.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Phone,
  Mic,
  MicOff,
  VideoOff,
  Settings,
  Users,
  MessageSquare,
  Monitor,
  MonitorOff,
  Maximize,
  Minimize,
  PhoneOff,
  Clock,
  AlertCircle,
  Loader2,
  WifiOff,
  RefreshCw,
  X,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { consultationAPI } from '../../services/api';

// Jitsi Meet external API script URL
const JITSI_SCRIPT_URL = 'https://meet.jit.si/external_api.js';

const VideoConsult = ({
  consultationId,
  appointment,
  onEnd,
  onError,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Refs
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Consultation state
  const [consultation, setConsultation] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, waiting, connecting, connected, ended, error
  const [error, setError] = useState(null);

  // Call state
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Participants
  const [participants, setParticipants] = useState([]);
  const [dominantSpeaker, setDominantSpeaker] = useState(null);

  // Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Timer
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const timerRef = useRef(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);

  // Jitsi configuration
  const [jitsiConfig, setJitsiConfig] = useState(null);

  // Load Jitsi script
  useEffect(() => {
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = JITSI_SCRIPT_URL;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    loadJitsiScript().catch((err) => {
      console.error('Failed to load Jitsi script:', err);
      setError(t('video.jitsiLoadError', 'Failed to load video call service'));
      setStatus('error');
    });
  }, [t]);

  // Fetch consultation details
  useEffect(() => {
    const fetchConsultation = async () => {
      if (!consultationId) {
        setError(t('video.noConsultation', 'No consultation ID provided'));
        setStatus('error');
        return;
      }

      try {
        setStatus('loading');

        // Get consultation details
        const response = await consultationAPI.getById(consultationId);
        setConsultation(response.data);

        // Get Jitsi config from backend
        const configResponse = await consultationAPI.getJitsiConfig();
        setJitsiConfig(configResponse.data);

        // Check if user can join
        if (response.data.status === 'completed' || response.data.status === 'cancelled') {
          setError(t('video.consultationEnded', 'This consultation has ended'));
          setStatus('ended');
          return;
        }

        setStatus('waiting');
      } catch (err) {
        console.error('Failed to fetch consultation:', err);
        setError(err.message || t('video.fetchError', 'Failed to load consultation'));
        setStatus('error');
      }
    };

    fetchConsultation();
  }, [consultationId, t]);

  // Initialize Jitsi when ready
  const initializeJitsi = useCallback(async () => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current || !consultation || !jitsiConfig) {
      return;
    }

    try {
      setStatus('connecting');

      // Generate room name
      const roomName = consultation.room_name || `mediconnect-${consultationId}`;

      // User display name
      const displayName = user?.full_name || user?.name || (user?.role === 'doctor' ? 'Doctor' : 'Patient');

      // Jitsi options
      const options = {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          enableClosePage: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
          enableNoisyMicDetection: true,
          enableNoAudioDetection: true,
          enableTalkWhileMuted: true,
          disableRemoteMute: user?.role !== 'doctor',
          remoteVideoMenu: {
            disableKick: user?.role !== 'doctor',
          },
          toolbarButtons: [
            'microphone',
            'camera',
            'desktop',
            'fullscreen',
            'hangup',
            'chat',
            'settings',
            'videoquality',
            'tileview',
          ],
          // Recording (if enabled)
          recordingService: {
            enabled: false,
          },
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          SHOW_POWERED_BY: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          TOOLBAR_ALWAYS_VISIBLE: true,
          DEFAULT_BACKGROUND: '#1a1a1a',
          DEFAULT_REMOTE_DISPLAY_NAME: user?.role === 'doctor' ? 'Patient' : 'Doctor',
          SETTINGS_SECTIONS: ['devices', 'language'],
        },
        userInfo: {
          displayName: displayName,
          email: user?.email || '',
        },
      };

      // Add JWT if provided by backend
      if (jitsiConfig.jwt) {
        options.jwt = jitsiConfig.jwt;
      }

      // Initialize Jitsi API
      const api = new window.JitsiMeetExternalAPI(
        jitsiConfig.domain || 'meet.jit.si',
        options
      );

      jitsiApiRef.current = api;

      // Event listeners
      api.addListener('videoConferenceJoined', handleConferenceJoined);
      api.addListener('videoConferenceLeft', handleConferenceLeft);
      api.addListener('participantJoined', handleParticipantJoined);
      api.addListener('participantLeft', handleParticipantLeft);
      api.addListener('audioMuteStatusChanged', handleAudioMuteChange);
      api.addListener('videoMuteStatusChanged', handleVideoMuteChange);
      api.addListener('screenSharingStatusChanged', handleScreenShareChange);
      api.addListener('dominantSpeakerChanged', handleDominantSpeakerChange);
      api.addListener('chatUpdated', handleChatUpdate);
      api.addListener('readyToClose', handleReadyToClose);

      // Notify backend that user joined
      await consultationAPI.join(consultationId);

    } catch (err) {
      console.error('Failed to initialize Jitsi:', err);
      setError(t('video.initError', 'Failed to start video call'));
      setStatus('error');
    }
  }, [consultation, jitsiConfig, consultationId, user, t]);

  // Jitsi event handlers
  const handleConferenceJoined = useCallback((data) => {
    console.log('Conference joined:', data);
    setStatus('connected');
    setCallStartTime(new Date());

    // Start timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Add self to participants
    setParticipants((prev) => [
      ...prev.filter((p) => p.id !== 'self'),
      {
        id: 'self',
        name: user?.full_name || user?.name || 'You',
        role: user?.role || 'patient',
        isLocal: true,
      },
    ]);
  }, [user]);

  const handleConferenceLeft = useCallback(() => {
    console.log('Conference left');
    setStatus('ended');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const handleParticipantJoined = useCallback((data) => {
    console.log('Participant joined:', data);
    setParticipants((prev) => [
      ...prev.filter((p) => p.id !== data.id),
      {
        id: data.id,
        name: data.displayName || 'Participant',
        role: data.displayName?.toLowerCase().includes('dr') ? 'doctor' : 'patient',
        isLocal: false,
      },
    ]);
  }, []);

  const handleParticipantLeft = useCallback((data) => {
    console.log('Participant left:', data);
    setParticipants((prev) => prev.filter((p) => p.id !== data.id));
  }, []);

  const handleAudioMuteChange = useCallback((data) => {
    setIsAudioMuted(data.muted);
  }, []);

  const handleVideoMuteChange = useCallback((data) => {
    setIsVideoMuted(data.muted);
  }, []);

  const handleScreenShareChange = useCallback((data) => {
    setIsScreenSharing(data.on);
  }, []);

  const handleDominantSpeakerChange = useCallback((data) => {
    setDominantSpeaker(data.id);
  }, []);

  const handleChatUpdate = useCallback((data) => {
    if (data.isOpen !== undefined) {
      setIsChatOpen(data.isOpen);
    }
    if (data.unreadCount !== undefined && !isChatOpen) {
      setUnreadCount(data.unreadCount);
    }
  }, [isChatOpen]);

  const handleReadyToClose = useCallback(() => {
    handleEndCall();
  }, []);

  // Control functions
  const toggleAudio = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  };

  const toggleScreenShare = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleShareScreen');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      jitsiContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleChat = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleChat');
    }
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0);
    }
  };

  const handleJoinCall = async () => {
    try {
      // Join waiting room first
      await consultationAPI.joinWaitingRoom(consultationId);
      
      // Initialize Jitsi
      await initializeJitsi();
    } catch (err) {
      console.error('Failed to join call:', err);
      setError(err.message || t('video.joinError', 'Failed to join call'));
    }
  };

  const handleEndCall = async () => {
    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Dispose Jitsi
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      // Notify backend
      if (user?.role === 'doctor') {
        await consultationAPI.end(consultationId, {
          duration_seconds: callDuration,
        });
      }

      setStatus('ended');

      // Callback
      if (onEnd) {
        onEnd({ duration: callDuration });
      }
    } catch (err) {
      console.error('Error ending call:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, []);

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      } catch (err) {
        console.error('Failed to get devices:', err);
      }
    };

    getDevices();
  }, []);

  // Format duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render loading state
  if (status === 'loading') {
    return (
      <div className="bg-gray-900 text-white rounded-xl overflow-hidden h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">{t('video.loading', 'Loading consultation...')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="bg-gray-900 text-white rounded-xl overflow-hidden h-96 flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">{t('video.error', 'Something went wrong')}</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('video.retry', 'Retry')}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('video.goBack', 'Go Back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render ended state
  if (status === 'ended') {
    return (
      <div className="bg-gray-900 text-white rounded-xl overflow-hidden h-96 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-lg font-medium mb-2">{t('video.callEnded', 'Call Ended')}</p>
          <p className="text-gray-400 mb-4">
            {t('video.duration', 'Duration')}: {formatDuration(callDuration)}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('video.close', 'Close')}
          </button>
        </div>
      </div>
    );
  }

  // Render waiting room
  if (status === 'waiting') {
    return (
      <div className="bg-gray-900 text-white rounded-xl overflow-hidden">
        {/* Preview Area */}
        <div className="h-96 bg-black relative flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              {user?.role === 'doctor' ? (
                <span className="text-5xl">👨‍⚕️</span>
              ) : (
                <span className="text-5xl">👤</span>
              )}
            </div>
            <p className="text-xl font-medium mb-2">
              {user?.full_name || user?.name || t('video.you', 'You')}
            </p>
            <p className="text-gray-400 mb-6">
              {t('video.readyToJoin', 'Ready to join the consultation?')}
            </p>

            {/* Consultation Info */}
            {consultation && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6 max-w-sm mx-auto text-left">
                <p className="text-sm text-gray-400 mb-1">
                  {user?.role === 'doctor' ? t('video.patient', 'Patient') : t('video.doctor', 'Doctor')}
                </p>
                <p className="font-medium">
                  {user?.role === 'doctor'
                    ? consultation.patient_name
                    : `Dr. ${consultation.doctor_name}`}
                </p>
                {consultation.reason && (
                  <>
                    <p className="text-sm text-gray-400 mt-2 mb-1">{t('video.reason', 'Reason')}</p>
                    <p className="text-sm">{consultation.reason}</p>
                  </>
                )}
              </div>
            )}

            {/* Device Preview Controls */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={`p-3 rounded-full ${
                  isAudioMuted ? 'bg-red-600' : 'bg-gray-700'
                } hover:opacity-90 transition-colors`}
              >
                {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className={`p-3 rounded-full ${
                  isVideoMuted ? 'bg-red-600' : 'bg-gray-700'
                } hover:opacity-90 transition-colors`}
              >
                {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoinCall}
              className="px-8 py-3 bg-green-600 rounded-full hover:bg-green-700 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <Video className="h-5 w-5" />
              {t('video.joinNow', 'Join Now')}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-800 p-4">
          <p className="text-sm text-gray-400 text-center">
            💡 {t('video.tip', 'Ensure you have a stable internet connection and good lighting')}
          </p>
        </div>
      </div>
    );
  }

  // Render active call (connecting/connected)
  return (
    <div className="bg-gray-900 text-white rounded-xl overflow-hidden relative">
      {/* Jitsi Container */}
      <div
        ref={jitsiContainerRef}
        className="h-96 md:h-[500px] bg-black"
      />

      {/* Connecting Overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-300">{t('video.connecting', 'Connecting...')}</p>
          </div>
        </div>
      )}

      {/* Custom Controls Overlay (for mobile) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:hidden">
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioMuted ? 'bg-red-600' : 'bg-gray-800/80'
            }`}
          >
            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoMuted ? 'bg-red-600' : 'bg-gray-800/80'
            }`}
          >
            {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
          <button
            onClick={handleEndCall}
            className="p-3 bg-red-600 rounded-full hover:bg-red-700"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
          <button
            onClick={toggleChat}
            className="p-3 bg-gray-800/80 rounded-full relative"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Call Info Bar */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Participants */}
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm">
                {participants.length} {t('video.participants', 'participants')}
              </span>
            </div>

            {/* Duration */}
            {status === 'connected' && (
              <div className="flex items-center text-green-400">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
              </div>
            )}

            {/* Chat button (desktop) */}
            <button
              onClick={toggleChat}
              className="hidden md:flex items-center text-sm text-blue-400 hover:text-blue-300 relative"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('video.chat', 'Chat')}
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center text-sm ${
              status === 'connected' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status === 'connected' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
              }`} />
              {status === 'connected'
                ? t('video.connected', 'Connected')
                : t('video.connecting', 'Connecting...')}
            </div>

            {/* Fullscreen (desktop) */}
            <button
              onClick={toggleFullscreen}
              className="hidden md:block p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>

            {/* End call (desktop) */}
            <button
              onClick={handleEndCall}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              {t('video.endCall', 'End Call')}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t('video.settings', 'Settings')}</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-700 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Audio Device */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                {t('video.microphone', 'Microphone')}
              </label>
              <select
                value={selectedAudioDevice}
                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Video Device */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                {t('video.camera', 'Camera')}
              </label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('video.done', 'Done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConsult;