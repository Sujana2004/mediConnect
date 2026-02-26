// src/pages/patient/ConsultationRoom.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Video,
  AlertCircle,
  Clock,
  FileText,
  MessageCircle,
  WifiOff,
  RefreshCw,
  X
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
import { appointmentService } from '../../services/api';
import { useAuth } from '../../hooks';

const isDev = import.meta.env.DEV;

/**
 * Consultation states
 */
const CONSULTATION_STATES = {
  LOADING: 'loading',
  WAITING_ROOM: 'waiting_room',
  IN_CALL: 'in_call',
  ENDED: 'ended',
  ERROR: 'error'
};

/**
 * Patient Consultation Room Page
 * Fully dynamic — TanStack Query, mutations, offline detection, cleanup
 */
const ConsultationRoom = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Online status ──
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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);

  // ── Refs ──
  const jitsiApiRef = useRef(null);
  const containerRef = useRef(null);
  const hasJoinedRef = useRef(false); // Prevent duplicate join calls

  // ── Fetch appointment details ──
  const {
    data: appointmentData,
    isLoading: appointmentLoading,
    isError: appointmentError,
    refetch: refetchAppointment
  } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.getById(id),
    staleTime: 1000 * 60 * 2,
    enabled: isOnline
  });

  const appointment = appointmentData?.data || appointmentData;
  const doctor = appointment?.doctor;

  // ── Fetch consultation room info ──
  const {
    data: consultationData,
    isLoading: consultationLoading
  } = useQuery({
    queryKey: ['consultationRoom', id],
    queryFn: () => consultationService.getJoinInfo(id),
    enabled: isOnline && !!appointment && ['confirmed', 'waiting', 'in_progress'].includes(appointment?.status),
    staleTime: 1000 * 60,
  });

  // ── Join waiting room mutation ──
  const joinWaitingRoomMutation = useMutation({
    mutationFn: () => consultationService.joinWaitingRoom(id),
    onSuccess: (response) => {
      const data = response?.data || response;
      setRoomInfo(data);
      setConsultationState(CONSULTATION_STATES.WAITING_ROOM);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('consultation.joinError', 'Failed to join waiting room'));
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  });

  // ── Check-in mutation ──
  const checkInMutation = useMutation({
    mutationFn: () => appointmentService.checkIn(id),
    onSuccess: () => {
      refetchAppointment();
    },
    onError: (error) => {
      if (isDev) console.error('Check-in failed:', error);
    }
  });

  // ── End/leave consultation mutation ──
  const endConsultationMutation = useMutation({
    mutationFn: () => consultationService.leave(id),
    onSuccess: () => {
      setConsultationState(CONSULTATION_STATES.ENDED);
    },
    onError: () => {
      // Still transition to ended state even if API fails
      setConsultationState(CONSULTATION_STATES.ENDED);
    }
  });

  // ── Initialize consultation (with duplicate-join guard) ──
  useEffect(() => {
    if (appointmentLoading || consultationLoading) {
      setConsultationState(CONSULTATION_STATES.LOADING);
      return;
    }

    if (appointmentError || !appointment) {
      setConsultationState(CONSULTATION_STATES.ERROR);
      return;
    }

    const validStatuses = ['confirmed', 'waiting', 'in_progress'];
    if (!validStatuses.includes(appointment.status)) {
      setConsultationState(CONSULTATION_STATES.ERROR);
      return;
    }

    // Set room info from consultation data
    if (consultationData?.data || consultationData) {
      setRoomInfo(consultationData.data || consultationData);
    }

    // Auto-join waiting room only once
    if (appointment.status === 'confirmed' && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinWaitingRoomMutation.mutate();
    } else if (['waiting', 'in_progress'].includes(appointment.status)) {
      setConsultationState(CONSULTATION_STATES.WAITING_ROOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.status, appointmentLoading, appointmentError, consultationLoading, consultationData]);

  // ── Cleanup on unmount: leave consultation if in call ──
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.executeCommand('hangup');
          jitsiApiRef.current.dispose();
        } catch (e) {
          if (isDev) console.error('Jitsi cleanup error:', e);
        }
      }
      // Fire-and-forget leave call
      if (consultationState === CONSULTATION_STATES.IN_CALL) {
        consultationService.leave(id).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle join call from waiting room ──
  const handleJoinCall = useCallback(({ cameraEnabled, micEnabled }) => {
    setIsMuted(!micEnabled);
    setIsVideoOff(!cameraEnabled);
    setConsultationState(CONSULTATION_STATES.IN_CALL);

    if (appointment?.status === 'confirmed') {
      checkInMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.status]);

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
  }, []);

  /**
   * Handle video conference joined
   */
  const handleVideoConferenceJoined = useCallback(() => {
    toast.success(t('consultation.connected', 'Connected to consultation'));
  }, [t]);

  /**
   * Handle video conference left
   */
  const handleVideoConferenceLeft = useCallback(() => {
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  /**
   * Handle ready to close
   */
  const handleReadyToClose = useCallback(() => {
    setConsultationState(CONSULTATION_STATES.ENDED);
  }, []);

  /**
   * Handle participant joined
   */
  const handleParticipantJoined = useCallback((data) => {
    toast.success(
      t('consultation.participantJoined', {
        name: data?.displayName || t('consultation.someone', 'Someone'),
        defaultValue: `${data?.displayName || 'Someone'} joined`
      })
    );
  }, [t]);

  /**
   * Handle participant left
   */
  const handleParticipantLeft = useCallback((data) => {
    toast(
      t('consultation.participantLeft', {
        name: data?.displayName || t('consultation.someone', 'Someone'),
        defaultValue: `${data?.displayName || 'Someone'} left`
      })
    );
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
    if (isDev) console.error('Jitsi error:', error);
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
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      if (isDev) console.error('Fullscreen error:', err);
    }
  }, []);

  /**
   * Handle fullscreen change event
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * Handle end call
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
      jitsiApiRef.current.executeCommand('hangup');
    }

    endConsultationMutation.mutate();
  }, [endConsultationMutation]);

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
    hasJoinedRef.current = false;
    setConsultationState(CONSULTATION_STATES.LOADING);
    refetchAppointment();
  }, [refetchAppointment]);

  // ── Derived values ──
  const roomName = roomInfo?.room_name ||
                   roomInfo?.jitsi_room ||
                   `mediconnect-${id}-${Date.now()}`;

  const userName = user?.full_name || user?.first_name || t('consultation.patient', 'Patient');

  // ══════════════════════════════════════════
  // RENDER: Offline State
  // ══════════════════════════════════════════
  if (!isOnline && consultationState !== CONSULTATION_STATES.IN_CALL) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={WifiOff}
            title={t('common.offline', 'You are offline')}
            description={t('consultation.offlineDesc', 'A stable internet connection is required for video consultations. Please check your connection and try again.')}
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

  // ══════════════════════════════════════════
  // RENDER: Loading State
  // ══════════════════════════════════════════
  if (consultationState === CONSULTATION_STATES.LOADING) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" className="text-white" />
          <p className="text-white mt-4">
            {t('consultation.loading', 'Preparing your consultation...')}
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER: Error State
  // ══════════════════════════════════════════
  if (consultationState === CONSULTATION_STATES.ERROR) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto p-6 mt-12">
          <EmptyState
            icon={AlertCircle}
            title={t('consultation.notAvailable', 'Consultation not available')}
            description={t('consultation.notAvailableDesc', 'This consultation is no longer available or the appointment status has changed.')}
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

  // ══════════════════════════════════════════
  // RENDER: Ended State
  // ══════════════════════════════════════════
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
              onClick={() => navigate(`/patient/appointments/${id}`)}
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

  // ══════════════════════════════════════════
  // RENDER: Waiting Room State
  // ══════════════════════════════════════════
  if (consultationState === CONSULTATION_STATES.WAITING_ROOM) {
    return (
      <WaitingRoom
        doctor={doctor}
        appointment={appointment}
        position={roomInfo?.queue_position || 0}
        estimatedWait={roomInfo?.estimated_wait || 0}
        onJoin={handleJoinCall}
        onCancel={handleCancelWaiting}
        isLoading={joinWaitingRoomMutation.isPending}
      />
    );
  }

  // ══════════════════════════════════════════
  // RENDER: In-Call State
  // ══════════════════════════════════════════
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
          <JitsiMeet
            roomName={roomName}
            userName={userName}
            userEmail={user?.email}
            isDoctor={false}
            domain={roomInfo?.jitsi_domain || 'meet.jit.si'}
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
              loading={endConsultationMutation.isPending}
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