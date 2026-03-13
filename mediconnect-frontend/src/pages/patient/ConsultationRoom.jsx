// src/pages/patient/ConsultationRoom.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { consultationService, appointmentService } from '../../services/api';
import { useAuth } from '../../hooks';

// ============================================================================
// CONSTANTS
// ============================================================================

const isDev = import.meta.env.DEV;

const CONSULTATION_STATES = {
  LOADING: 'loading',
  NO_CONSULTATION: 'no_consultation', // Appointment exists but no consultation yet
  WAITING_ROOM: 'waiting_room',
  IN_CALL: 'in_call',
  ENDED: 'ended',
  ERROR: 'error'
};

// Valid appointment statuses that can have consultations
const VALID_APPOINTMENT_STATUSES = ['confirmed', 'checked_in', 'in_progress'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const logger = {
  log: (...args) => isDev && console.log('[ConsultationRoom]', ...args),
  error: (...args) => isDev && console.error('[ConsultationRoom]', ...args),
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
  const { consultationId: routeConsultationId, id } = useParams();
  const appointmentId = routeConsultationId || id; // route uses :consultationId, value is appointment ID
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [consultationId, setConsultationId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [joinInfoRetryCount, setJoinInfoRetryCount] = useState(0);

  // ── Refs ──
  const jitsiApiRef = useRef(null);
  const containerRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Fetch appointment details
   */
  const {
    data: appointmentResponse,
    isLoading: appointmentLoading,
    isError: appointmentError,
    error: appointmentErrorData,
    refetch: refetchAppointment
  } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await appointmentService.getAppointmentById(appointmentId);
      return response?.data || response;
    },
    enabled: isOnline && !!appointmentId,
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  const appointment = appointmentResponse?.data || appointmentResponse;
  const doctor = appointment?.doctor_info || appointment?.doctor;

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Create consultation from appointment
   */
  const createConsultationMutation = useMutation({
    mutationFn: async () => {
      logger.log('Creating consultation from appointment:', appointmentId);
      const response = await consultationService.createFromAppointment(appointmentId, 'video');
      return response?.data || response;
    },
    onSuccess: (data) => {
      logger.log('Consultation created:', data);
      const consult = data?.data || data;
      setConsultationId(consult?.id);
      setRoomInfo(consult?.room_info || consult?.room);
      
      // Now join waiting room
      joinWaitingRoomMutation.mutate(consult?.id);
    },
    onError: (error) => {
      logger.error('Failed to create consultation:', error);
      
      // Check if consultation already exists
      if (error?.response?.status === 400 && 
          error?.response?.data?.message?.includes('already has a consultation')) {
        // Try to get existing consultation
        fetchExistingConsultation();
      } else {
        toast.error(getErrorMessage(error, t('consultation.createError', 'Failed to start consultation')));
        setConsultationState(CONSULTATION_STATES.ERROR);
      }
    }
  });

  /**
   * Join waiting room
   */
  const joinWaitingRoomMutation = useMutation({
    mutationFn: async (consultId) => {
      const targetId = consultId || consultationId;
      logger.log('Joining waiting room for consultation:', targetId);
      const response = await consultationService.joinWaitingRoom(targetId);
      return response?.data || response;
    },
    onSuccess: (data) => {
      logger.log('Joined waiting room:', data);
      const joinData = data?.data || data;
      setRoomInfo(prev => ({ ...prev, ...joinData }));
      setConsultationState(CONSULTATION_STATES.WAITING_ROOM);
    },
    onError: (error) => {
      logger.error('Failed to join waiting room:', error);
      toast.error(getErrorMessage(error, t('consultation.joinError', 'Failed to join waiting room')));
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  });

  /**
   * Get join info for call
   */
  const getJoinInfoMutation = useMutation({
    mutationFn: async (consultId) => {
      const targetId = consultId || consultationId;
      logger.log('Getting join info for consultation:', targetId);
      const response = await consultationService.getJoinInfo(targetId);
      return response?.data || response;
    },
    onSuccess: (data) => {
      logger.log('Got join info:', data);
      const joinData = data?.data || data;
      setRoomInfo(prev => ({ ...prev, ...joinData }));
    },
    onError: (error) => {
      logger.error('Failed to get join info:', error);
    }
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Fetch existing consultation for appointment
   */
  const fetchExistingConsultation = useCallback(async () => {
    try {
      logger.log('Fetching existing consultation for appointment:', appointmentId);
      
      // Get consultations and find one matching this appointment
      const response = await consultationService.getConsultations({ 
        appointment: appointmentId
      });

      const consultations =
        response?.data?.results ||
        response?.results ||
        response?.data ||
        (Array.isArray(response) ? response : []);
      const existingConsultation = consultations.find(c => 
        c.appointment === appointmentId || c.appointment?.id === appointmentId
      );

      if (existingConsultation) {
        logger.log('Found existing consultation:', existingConsultation.id);
        setConsultationId(existingConsultation.id);
        setRoomInfo(existingConsultation.room);
        
        if (existingConsultation.status === 'in_progress') {
          // Get join info and go directly to call
          getJoinInfoMutation.mutate(existingConsultation.id);
          setConsultationState(CONSULTATION_STATES.IN_CALL);
        } else {
          joinWaitingRoomMutation.mutate(existingConsultation.id);
        }
      } else {
        // No existing consultation, create new one
        createConsultationMutation.mutate();
      }
    } catch (error) {
      logger.error('Error fetching existing consultation:', error);
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  }, [appointmentId]);

  // ============================================================================
  // INITIALIZATION EFFECT
  // ============================================================================

  useEffect(() => {
    // Don't run if already initialized or still loading
    if (hasInitializedRef.current || appointmentLoading) {
      return;
    }

    // Handle appointment error
    if (appointmentError) {
      logger.error('Appointment error:', appointmentErrorData);
      setConsultationState(CONSULTATION_STATES.ERROR);
      return;
    }

    // Wait for appointment data
    if (!appointment) {
      return;
    }

    // Validate appointment status
    if (!VALID_APPOINTMENT_STATUSES.includes(appointment.status)) {
      logger.log('Invalid appointment status:', appointment.status);
      setConsultationState(CONSULTATION_STATES.ERROR);
      return;
    }

    // Mark as initialized
    hasInitializedRef.current = true;

    // Check if appointment already has a consultation
    if (appointment.consultation) {
      const consultId = typeof appointment.consultation === 'object' 
        ? appointment.consultation.id 
        : appointment.consultation;
      
      logger.log('Appointment has consultation:', consultId);
      setConsultationId(consultId);
      
      // Get join info and join waiting room
      joinWaitingRoomMutation.mutate(consultId);
    } else {
      // Create new consultation from appointment
      logger.log('Creating new consultation for appointment');
      createConsultationMutation.mutate();
    }
  }, [appointment, appointmentLoading, appointmentError]);

  // ============================================================================
  // CLEANUP EFFECT
  // ============================================================================

  useEffect(() => {
    return () => {
      // Cleanup Jitsi on unmount
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

  // ============================================================================
  // FULLSCREEN EFFECT
  // ============================================================================

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

  /**
   * Handle join call from waiting room
   */
  const handleJoinCall = useCallback(({ cameraEnabled, micEnabled }) => {
    setIsMuted(!micEnabled);
    setIsVideoOff(!cameraEnabled);
    
    // Get fresh join info before joining
    if (consultationId) {
      getJoinInfoMutation.mutate(consultationId);
      setJoinInfoRetryCount(0);
    }
    
    setConsultationState(CONSULTATION_STATES.IN_CALL);
  }, [consultationId]);

  /**
   * Handle cancel from waiting room
   */
  const handleCancelWaiting = useCallback(() => {
    navigate('/patient/appointments');
  }, [navigate]);

  /**
   * Handle Jitsi API ready
   */
  const handleApiReady = useCallback((api) => {
    jitsiApiRef.current = api;
    logger.log('Jitsi API ready');
  }, []);

  /**
   * Handle video conference joined
   */
  const handleVideoConferenceJoined = useCallback(() => {
    logger.log('Video conference joined');
    toast.success(t('consultation.connected', 'Connected to consultation'));
  }, [t]);

  /**
   * Handle video conference left
   */
  const handleVideoConferenceLeft = useCallback(() => {
    logger.log('Video conference left');
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  /**
   * Handle ready to close
   */
  const handleReadyToClose = useCallback(() => {
    logger.log('Ready to close');
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  /**
   * Handle participant joined
   */
  const handleParticipantJoined = useCallback((data) => {
    logger.log('Participant joined:', data);
    const name = data?.displayName || t('consultation.doctor', 'Doctor');
    toast.success(t('consultation.participantJoined', { name, defaultValue: `${name} joined` }));
  }, [t]);

  /**
   * Handle participant left
   */
  const handleParticipantLeft = useCallback((data) => {
    logger.log('Participant left:', data);
    const name = data?.displayName || t('consultation.someone', 'Someone');
    toast(t('consultation.participantLeft', { name, defaultValue: `${name} left` }));
  }, [t]);

  /**
   * Handle audio mute status change
   */
  const handleAudioMuteStatusChanged = useCallback((data) => {
    setIsMuted(data.muted);
  }, []);

  /**
   * Handle video mute status change
   */
  const handleVideoMuteStatusChanged = useCallback((data) => {
    setIsVideoOff(data.muted);
  }, []);

  /**
   * Handle Jitsi error
   */
  const handleJitsiError = useCallback((error) => {
    logger.error('Jitsi error:', error);
    toast.error(t('consultation.videoError', 'Video connection error occurred'));
  }, [t]);

  /**
   * Toggle mute
   */
  const handleToggleMute = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, []);

  /**
   * Toggle video
   */
  const handleToggleVideo = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  }, []);

  /**
   * Toggle chat
   */
  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      if (!prev) setUnreadMessages(0);
      return !prev;
    });
  }, []);

  /**
   * Toggle screen share
   */
  const handleToggleScreenShare = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleShareScreen');
      setIsScreenSharing(prev => !prev);
    }
  }, []);

  /**
   * Toggle fullscreen
   */
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

  /**
   * Handle end call button
   */
  const handleEndCall = useCallback(() => {
    setShowEndCallModal(true);
  }, []);

  /**
   * Confirm end call
   */
  const confirmEndCall = useCallback(() => {
    setShowEndCallModal(false);

    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.executeCommand('hangup');
      } catch (e) {
        logger.error('Hangup error:', e);
      }
    }

    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  /**
   * Handle send chat message
   */
  const handleSendMessage = useCallback((message) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sender: {
        id: user?.id?.toString(),
        name: user?.full_name || user?.first_name || t('consultation.patient', 'Patient'),
        avatar: user?.profile_picture
      }
    };

    setChatMessages(prev => [...prev, newMessage]);

    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('sendChatMessage', message.content);
    }
  }, [user, t]);

  /**
   * Handle back button
   */
  const handleBack = useCallback(() => {
    if (consultationState === CONSULTATION_STATES.IN_CALL) {
      setShowEndCallModal(true);
    } else {
      navigate('/patient/appointments');
    }
  }, [consultationState, navigate]);

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    hasInitializedRef.current = false;
    setConsultationState(CONSULTATION_STATES.LOADING);
    setConsultationId(null);
    setRoomInfo(null);
    setJoinInfoRetryCount(0);
    refetchAppointment();
  }, [refetchAppointment]);

  useEffect(() => {
    if (
      consultationState !== CONSULTATION_STATES.IN_CALL ||
      roomName ||
      !consultationId ||
      getJoinInfoMutation.isPending ||
      joinInfoRetryCount >= 2
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setJoinInfoRetryCount((count) => count + 1);
      getJoinInfoMutation.mutate(consultationId);
    }, 1200);

    return () => clearTimeout(timer);
  }, [consultationState, roomName, consultationId, getJoinInfoMutation.isPending, joinInfoRetryCount]);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const roomName = roomInfo?.room_name || roomInfo?.roomName || roomInfo?.meeting_room || '';
  const jitsiDomain = roomInfo?.jitsi_domain || roomInfo?.domain || 'meet.jit.si';
  const userName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || t('consultation.patient', 'Patient');

  const isLoading = consultationState === CONSULTATION_STATES.LOADING ||
                    appointmentLoading ||
                    createConsultationMutation.isPending ||
                    joinWaitingRoomMutation.isPending;

  // ============================================================================
  // RENDER: Offline State
  // ============================================================================

  if (!isOnline && consultationState !== CONSULTATION_STATES.IN_CALL) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={WifiOff}
            title={t('common.offline', 'You are offline')}
            description={t('consultation.offlineDesc', 'A stable internet connection is required for video consultations.')}
            action={
              <Button
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw size={18} />}
              >
                {t('common.retry', 'Retry')}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" className="text-white" />
          <p className="text-white mt-4">
            {createConsultationMutation.isPending 
              ? t('consultation.creating', 'Setting up your consultation...')
              : joinWaitingRoomMutation.isPending
                ? t('consultation.joining', 'Joining waiting room...')
                : t('consultation.loading', 'Preparing your consultation...')
            }
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Error State
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.ERROR) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={AlertCircle}
            title={t('consultation.notAvailable', 'Consultation not available')}
            description={t('consultation.notAvailableDesc', 'This consultation is not available. The appointment may not be confirmed yet or has already ended.')}
            action={
              <div className="flex flex-col gap-3 w-full">
                <Button onClick={handleRetry} leftIcon={<RefreshCw size={18} />}>
                  {t('common.retry', 'Retry')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/patient/appointments')}
                >
                  {t('consultation.backToAppointments', 'Back to Appointments')}
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Ended State
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.ENDED) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Phone size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('consultation.ended', 'Consultation Ended')}
          </h2>
          <p className="text-gray-500 mb-6">
            {t('consultation.endedDesc', 'Your consultation has ended. You can view the summary and prescription details.')}
          </p>

          {doctor && (
            <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
              <Avatar
                src={doctor.profile_picture}
                name={doctor.full_name || doctor.first_name}
                size="md"
              />
              <div className="text-left">
                <p className="font-medium text-gray-900">
                  Dr. {doctor.full_name || doctor.first_name}
                </p>
                <p className="text-sm text-gray-500">
                  {doctor.specialization_display || doctor.specialization}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              fullWidth
              onClick={() => navigate(`/patient/appointments/${appointmentId}`)}
              leftIcon={<FileText size={18} />}
            >
              {t('consultation.viewSummary', 'View Summary')}
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate('/patient/appointments')}
            >
              {t('consultation.backToAppointments', 'Back to Appointments')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Waiting Room State
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.WAITING_ROOM) {
    return (
      <WaitingRoom
        doctor={doctor}
        appointment={appointment}
        position={roomInfo?.queue_position || 0}
        estimatedWait={roomInfo?.estimated_wait || 0}
        onJoin={handleJoinCall}
        onCancel={handleCancelWaiting}
        isLoading={getJoinInfoMutation.isPending}
      />
    );
  }

  // ============================================================================
  // RENDER: In-Call State
  // ============================================================================

  if (!roomName && consultationState === CONSULTATION_STATES.IN_CALL && !getJoinInfoMutation.isPending) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={AlertCircle}
            title={t('consultation.connectingIssue', 'Unable to connect to consultation room')}
            description={t('consultation.connectingIssueDesc', 'We could not get room details. Please try again.')}
            action={
              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => {
                    if (consultationId) {
                      setJoinInfoRetryCount(0);
                      getJoinInfoMutation.mutate(consultationId);
                    }
                  }}
                  leftIcon={<RefreshCw size={18} />}
                  disabled={!consultationId}
                >
                  {t('common.retry', 'Retry')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/patient/appointments')}
                >
                  {t('consultation.backToAppointments', 'Back to Appointments')}
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen bg-gray-900 flex flex-col">
      {/* Header - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-gray-700"
            aria-label={t('common.back', 'Back')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <Avatar
              src={doctor?.profile_picture}
              name={doctor?.full_name || doctor?.first_name}
              size="sm"
            />
            <div>
              <p className="text-white font-medium text-sm">
                Dr. {doctor?.full_name || doctor?.first_name}
              </p>
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {t('consultation.connected', 'Connected')}
              </div>
            </div>
          </div>

          {/* Connection warning */}
          {!isOnline && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <WifiOff size={14} />
              {t('common.unstable', 'Unstable')}
            </div>
          )}

          {isOnline && <div className="w-10" />}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Video area */}
        <div className={`flex-1 relative ${isChatOpen ? 'hidden sm:block' : ''}`}>
          {roomName ? (
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
              onAudioMuteStatusChanged={handleAudioMuteStatusChanged}
              onVideoMuteStatusChanged={handleVideoMuteStatusChanged}
              onError={handleJitsiError}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <Loader size="lg" className="mx-auto mb-4" />
                <p>{t('consultation.connectingVideo', 'Connecting to video...')}</p>
              </div>
            </div>
          )}

          {/* Call Controls */}
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

        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          messages={chatMessages}
          currentUserId={user?.id?.toString()}
          onClose={() => setIsChatOpen(false)}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* End Call Confirmation Modal */}
      <Modal
        isOpen={showEndCallModal}
        onClose={() => setShowEndCallModal(false)}
        title={t('consultation.endCallConfirm', 'End Consultation?')}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            {t('consultation.endCallConfirmDesc', 'Are you sure you want to end this consultation? You will not be able to rejoin.')}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEndCallModal(false)}
              fullWidth
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmEndCall}
              fullWidth
            >
              {t('consultation.endCall', 'End Call')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConsultationRoom;