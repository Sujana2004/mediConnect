// src/pages/patient/ConsultationRoom.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  AlertCircle,
  FileText,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  JitsiMeet,
  WaitingRoom,
  CallControls,
  ChatPanel
} from '../../components/consultation';
import { Card, Button, Loader, EmptyState, Modal, Avatar } from '../../components/common';
import { consultationService } from '../../services/api';
import { useAuth } from '../../hooks';
import { extractData, extractRoomInfo } from '../../utils/apiHelpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const isDev = import.meta.env.DEV;

const CONSULTATION_STATES = {
  LOADING: 'loading',
  WAITING_ROOM: 'waiting_room',
  JOINING_CALL: 'joining_call',
  IN_CALL: 'in_call',
  ENDED: 'ended',
  ERROR: 'error'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const logger = {
  log: (...args) => isDev && console.log('[PatientConsultation]', ...args),
  error: (...args) => console.error('[PatientConsultation]', ...args),
  debug: (...args) => isDev && console.debug('[PatientConsultation DEBUG]', ...args),
};

const getErrorMessage = (error, fallback = 'An error occurred') => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ConsultationRoom = () => {
  // ✅ Get consultation ID directly from route
  const { consultationId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Online Status ──
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── State ──
  const [consultationState, setConsultationState] = useState(CONSULTATION_STATES.LOADING);
  const [roomInfo, setRoomInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [pendingMediaSettings, setPendingMediaSettings] = useState(null);

  // ── Refs ──
  const jitsiApiRef = useRef(null);
  const containerRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // ============================================================================
  // ✅ QUERY: Fetch consultation directly by ID
  // ============================================================================

  const {
    data: consultation,
    isLoading: consultationLoading,
    isError: consultationError,
    error: consultationErrorData,
    refetch: refetchConsultation
  } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      logger.log('Fetching consultation:', consultationId);
      const response = await consultationService.getById(consultationId);
      logger.debug('Consultation response:', response);
      return extractData(response);
    },
    enabled: isOnline && !!consultationId,
    staleTime: 1000 * 60,
    retry: 2,
  });

  // ✅ Extract doctor info from consultation
  const doctor = consultation?.doctor_info;

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const joinWaitingRoomMutation = useMutation({
    mutationFn: () => {
      logger.log('Joining waiting room:', consultationId);
      return consultationService.joinWaitingRoom(consultationId);
    },
    onSuccess: (response) => {
      const data = extractData(response);
      logger.log('Joined waiting room:', data);

      const roomData = extractRoomInfo(data);
      setRoomInfo(prev => ({
        ...prev,
        ...data,
        ...(roomData || {}),
      }));

      setConsultationState(CONSULTATION_STATES.WAITING_ROOM);
    },
    onError: (error) => {
      logger.error('Failed to join waiting room:', error);
      toast.error(getErrorMessage(error, 'Failed to join waiting room'));
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  });

  const getJoinInfoMutation = useMutation({
    mutationFn: () => {
      logger.log('Getting join info:', consultationId);
      return consultationService.getJoinInfo(consultationId);
    },
    onSuccess: (response) => {
      const data = extractData(response);
      logger.log('Got join info:', data);

      const roomData = extractRoomInfo(data);

      if (!roomData?.room_name) {
        logger.error('No room_name in join info:', data);
        toast.error('Could not get room information. Please try again.');
        setConsultationState(CONSULTATION_STATES.WAITING_ROOM);
        return;
      }

      setRoomInfo(prev => ({ ...prev, ...roomData }));

      if (pendingMediaSettings) {
        setIsMuted(!pendingMediaSettings.micEnabled);
        setIsVideoOff(!pendingMediaSettings.cameraEnabled);
        setPendingMediaSettings(null);
      }

      setConsultationState(CONSULTATION_STATES.IN_CALL);
    },
    onError: (error) => {
      logger.error('Failed to get join info:', error);
      toast.error('Failed to connect to consultation room');
      setConsultationState(CONSULTATION_STATES.WAITING_ROOM);
    }
  });

  // ============================================================================
  // ✅ INITIALIZATION — Based on consultation status
  // ============================================================================

  useEffect(() => {
    if (consultationLoading || !consultation || hasInitializedRef.current) {
      return;
    }

    if (consultationError) {
      logger.error('Consultation error:', consultationErrorData);
      setConsultationState(CONSULTATION_STATES.ERROR);
      return;
    }

    logger.log('Consultation loaded:', consultation.id, 'Status:', consultation.status);
    hasInitializedRef.current = true;

    // Extract room info
    const roomData = extractRoomInfo(consultation);
    if (roomData) {
      logger.debug('Room info from consultation:', roomData);
      setRoomInfo(prev => ({ ...prev, ...roomData }));
    }

    const status = consultation.status;

    if (status === 'in_progress') {
      // Already in progress — join directly
      if (roomData?.room_name) {
        setConsultationState(CONSULTATION_STATES.IN_CALL);
      } else {
        setConsultationState(CONSULTATION_STATES.JOINING_CALL);
        getJoinInfoMutation.mutate();
      }
    } else if (['scheduled', 'waiting_room'].includes(status)) {
      // Join waiting room
      joinWaitingRoomMutation.mutate();
    } else if (['completed', 'cancelled', 'no_show'].includes(status)) {
      setConsultationState(CONSULTATION_STATES.ENDED);
    } else {
      logger.error('Unknown consultation status:', status);
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  }, [consultation, consultationLoading, consultationError]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.executeCommand('hangup');
          jitsiApiRef.current.dispose();
        } catch (e) {
          logger.error('Jitsi cleanup error:', e);
        }
        jitsiApiRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleJoinCall = useCallback(({ cameraEnabled, micEnabled }) => {
    logger.log('Join call requested');
    setPendingMediaSettings({ cameraEnabled, micEnabled });
    setConsultationState(CONSULTATION_STATES.JOINING_CALL);
    getJoinInfoMutation.mutate();
  }, [consultationId]);

  const handleCancelWaiting = useCallback(() => {
    navigate('/patient/appointments');
  }, [navigate]);

  const handleApiReady = useCallback((api) => {
    jitsiApiRef.current = api;
    logger.log('Jitsi API ready');
  }, []);

  const handleVideoConferenceJoined = useCallback(() => {
    logger.log('Video conference joined');
    toast.success(t('consultation.connected', 'Connected to consultation'));
  }, [t]);

  const handleVideoConferenceLeft = useCallback(() => {
    logger.log('Video conference left');
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  const handleReadyToClose = useCallback(() => {
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  const handleParticipantJoined = useCallback((data) => {
    const name = data?.displayName || 'Doctor';
    toast.success(`${name} joined`);
  }, []);

  const handleParticipantLeft = useCallback((data) => {
    const name = data?.displayName || 'Someone';
    toast(`${name} left`);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand('toggleAudio');
  }, []);

  const handleToggleVideo = useCallback(() => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand('toggleVideo');
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      if (!prev) setUnreadMessages(0);
      return !prev;
    });
  }, []);

  const handleToggleScreenShare = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleShareScreen');
      setIsScreenSharing(prev => !prev);
    }
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      logger.error('Fullscreen error:', err);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    setShowEndCallModal(true);
  }, []);

  const confirmEndCall = useCallback(() => {
    setShowEndCallModal(false);
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.executeCommand('hangup'); } catch (e) {}
    }
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  const handleSendMessage = useCallback((message) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sender: {
        id: user?.id?.toString(),
        name: user?.full_name || user?.first_name || 'Patient',
        avatar: user?.profile_picture
      }
    };
    setChatMessages(prev => [...prev, newMessage]);
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('sendChatMessage', message.content);
    }
  }, [user]);

  const handleBack = useCallback(() => {
    if (consultationState === CONSULTATION_STATES.IN_CALL) {
      setShowEndCallModal(true);
    } else {
      navigate('/patient/appointments');
    }
  }, [consultationState, navigate]);

  const handleRetry = useCallback(() => {
    hasInitializedRef.current = false;
    setConsultationState(CONSULTATION_STATES.LOADING);
    setRoomInfo(null);
    setPendingMediaSettings(null);
    refetchConsultation();
  }, [refetchConsultation]);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const roomName =
    roomInfo?.room_name ||
    roomInfo?.roomName ||
    consultation?.room?.room_name ||
    '';

  const jitsiDomain =
    roomInfo?.jitsi_domain ||
    roomInfo?.domain ||
    consultation?.room?.jitsi_domain ||
    'meet.jit.si';

  const userName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Patient';

  const isLoading =
    consultationState === CONSULTATION_STATES.LOADING ||
    consultationLoading ||
    joinWaitingRoomMutation.isPending;

  const isJoiningCall =
    consultationState === CONSULTATION_STATES.JOINING_CALL ||
    getJoinInfoMutation.isPending;

  // Debug
  useEffect(() => {
    if (isDev) {
      logger.debug('State:', {
        consultationState, consultationId, roomName, jitsiDomain,
        roomInfo, isLoading, isJoiningCall,
        consultationStatus: consultation?.status,
      });
    }
  }, [consultationState, consultationId, roomName, roomInfo, isLoading, isJoiningCall]);

  // ============================================================================
  // RENDER: Offline
  // ============================================================================

  if (!isOnline && consultationState !== CONSULTATION_STATES.IN_CALL) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={WifiOff}
            title="You are offline"
            description="A stable internet connection is required for video consultations."
            action={<Button onClick={() => window.location.reload()} leftIcon={<RefreshCw size={18} />}>Retry</Button>}
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Loading
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" className="text-white" />
          <p className="text-white mt-4">
            {joinWaitingRoomMutation.isPending
              ? 'Joining waiting room...'
              : 'Loading consultation...'}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Joining Call
  // ============================================================================

  if (isJoiningCall) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" className="text-white" />
          <p className="text-white mt-4">Connecting to video call...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Error
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.ERROR || consultationError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={AlertCircle}
            title="Consultation not available"
            description={getErrorMessage(consultationErrorData, 'This consultation is not available.')}
            action={
              <div className="flex flex-col gap-3 w-full">
                <Button onClick={handleRetry} leftIcon={<RefreshCw size={18} />}>Retry</Button>
                <Button variant="outline" onClick={() => navigate('/patient/appointments')}>
                  Back to Appointments
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Ended
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.ENDED) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Phone size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Consultation Ended</h2>
          <p className="text-gray-500 mb-6">Your consultation has ended.</p>

          {doctor && (
            <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
              <Avatar name={doctor.full_name || doctor.first_name} size="md" />
              <div className="text-left">
                <p className="font-medium text-gray-900">
                  Dr. {doctor.full_name || doctor.first_name}
                </p>
                <p className="text-sm text-gray-500">{doctor.specialization}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button fullWidth onClick={() => navigate('/patient/appointments')} leftIcon={<FileText size={18} />}>
              Back to Appointments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Waiting Room
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.WAITING_ROOM) {
    return (
      <WaitingRoom
        doctor={doctor}
        appointment={{ consultation_type: consultation?.consultation_type }}
        position={roomInfo?.queue_position || 0}
        estimatedWait={roomInfo?.estimated_wait || 0}
        onJoin={handleJoinCall}
        onCancel={handleCancelWaiting}
        isLoading={false}
      />
    );
  }

  // ============================================================================
  // RENDER: In-Call but no room
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.IN_CALL && !roomName) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={AlertCircle}
            title="Unable to connect"
            description="Could not get room details. Please try again."
            action={
              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => {
                    setConsultationState(CONSULTATION_STATES.JOINING_CALL);
                    getJoinInfoMutation.mutate();
                  }}
                  leftIcon={<RefreshCw size={18} />}
                  disabled={getJoinInfoMutation.isPending}
                >
                  Retry
                </Button>
                <Button variant="outline" onClick={() => navigate('/patient/appointments')}>
                  Back to Appointments
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: In-Call with Video
  // ============================================================================

  return (
    <div ref={containerRef} className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <Avatar name={doctor?.full_name || doctor?.first_name} size="sm" />
            <div>
              <p className="text-white font-medium text-sm">
                Dr. {doctor?.full_name || doctor?.first_name}
              </p>
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Connected
              </div>
            </div>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <WifiOff size={14} />
              Unstable
            </div>
          )}
          {isOnline && <div className="w-10" />}
        </div>
      )}

      {/* Video + Chat */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className={`flex-1 relative ${isChatOpen ? 'hidden sm:block' : ''}`}>
          <JitsiMeet
            roomName={roomName}
            userName={userName}
            userEmail={user?.email}
            isDoctor={false}
            domain={jitsiDomain}
            jwt={roomInfo?.jwt}
            onApiReady={handleApiReady}
            onReadyToClose={handleReadyToClose}
            onVideoConferenceJoined={handleVideoConferenceJoined}
            onVideoConferenceLeft={handleVideoConferenceLeft}
            onParticipantJoined={handleParticipantJoined}
            onParticipantLeft={handleParticipantLeft}
            onAudioMuteStatusChanged={(data) => setIsMuted(data.muted)}
            onVideoMuteStatusChanged={(data) => setIsVideoOff(data.muted)}
            onError={(err) => logger.error('Jitsi error:', err)}
            className="w-full h-full"
          />

          <CallControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isChatOpen={isChatOpen}
            isScreenSharing={isScreenSharing}
            isFullscreen={isFullscreen}
            unreadMessages={unreadMessages}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onToggleChat={handleToggleChat}
            onToggleScreenShare={handleToggleScreenShare}
            onToggleFullscreen={handleToggleFullscreen}
            onEndCall={handleEndCall}
            position="bottom"
          />
        </div>

        <ChatPanel
          isOpen={isChatOpen}
          messages={chatMessages}
          currentUserId={user?.id?.toString()}
          onClose={() => setIsChatOpen(false)}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* End Call Modal */}
      <Modal
        isOpen={showEndCallModal}
        onClose={() => setShowEndCallModal(false)}
        title="End Consultation?"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            Are you sure you want to end this consultation?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowEndCallModal(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmEndCall} fullWidth>
              End Call
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConsultationRoom;