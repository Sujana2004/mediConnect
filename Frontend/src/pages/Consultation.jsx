import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  FileText,
  Clock,
  User,
  Upload,
  Download,
  Send,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  Menu,
  ExternalLink
} from 'lucide-react';
import { consultationAPI, consultationNotesAPI, consultationPrescriptionsAPI, consultationAttachmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Dynamic import for Jitsi to handle SSR and load failures
let JitsiMeeting = null;
try {
  const jitsiModule = require('@jitsi/react-sdk');
  JitsiMeeting = jitsiModule.JitsiMeeting;
} catch (e) {
  console.warn('Jitsi SDK not available:', e);
}

const Consultation = () => {
  const { t } = useTranslation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Determine user role
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';

  // State
  const [roomName, setRoomName] = useState(roomId || '');
  const [consultationId, setConsultationId] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [consultationDetails, setConsultationDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  
  // Prescription state
  const [showPrescription, setShowPrescription] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });
  const [savingPrescription, setSavingPrescription] = useState(false);
  
  // Files state
  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Refs
  const chatContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize consultation
  useEffect(() => {
    if (roomId) {
      fetchConsultationDetails();
    } else {
      generateRoomId();
      setIsLoading(false);
    }

    return () => {
      // Cleanup Jitsi API
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [roomId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages]);

  const generateRoomId = () => {
    const id = `mediconnect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setRoomName(id);
  };

  const fetchConsultationDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await consultationAPI.getById(roomId);
      const data = response.data;
      
      setConsultationDetails(data);
      setConsultationId(data.id);
      setRoomName(data.room_name || roomId);
      
      // Load existing notes as chat messages
      if (data.notes) {
        setChatMessages(data.notes.map(note => ({
          id: note.id,
          sender: note.created_by_name || 'Unknown',
          text: note.content,
          timestamp: note.created_at,
          isOwn: note.created_by === user?.id
        })));
      }
      
      // Load prescriptions
      if (data.prescriptions) {
        setPrescriptions(data.prescriptions);
      }
      
      // Load attachments
      if (data.attachments) {
        setFiles(data.attachments);
      }
      
    } catch (err) {
      console.error('Error fetching consultation details:', err);
      setError(t('consultation.errorLoading', 'Failed to load consultation details'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiReady = (api) => {
    jitsiApiRef.current = api;
    
    api.on('participantJoined', (participant) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === participant.id)) return prev;
        return [...prev, participant];
      });
    });

    api.on('participantLeft', (participant) => {
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
    });

    api.on('audioMuteStatusChanged', ({ muted }) => {
      setIsAudioMuted(muted);
    });

    api.on('videoMuteStatusChanged', ({ muted }) => {
      setIsVideoMuted(muted);
    });

    api.on('readyToClose', () => {
      handleEndConsultation();
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !consultationId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      sender: user?.name || 'You',
      text: messageText,
      timestamp: new Date().toISOString(),
      isOwn: true,
      pending: true
    };
    
    setChatMessages(prev => [...prev, tempMessage]);

    try {
      const response = await consultationNotesAPI.create(consultationId, {
        content: messageText,
        note_type: 'chat'
      });
      
      // Replace temp message with actual
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...response.data, isOwn: true, sender: user?.name || 'You' }
            : msg
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      // Mark message as failed
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, pending: false, failed: true }
            : msg
        )
      );
    }
  };

  const handleEndConsultation = async () => {
    const confirmMessage = isDoctor 
      ? t('consultation.confirmEndDoctor', 'Are you sure you want to end this consultation?')
      : t('consultation.confirmEndPatient', 'Are you sure you want to leave this consultation?');
      
    if (!window.confirm(confirmMessage)) return;

    try {
      if (isDoctor && consultationId) {
        await consultationAPI.end(consultationId, {
          end_notes: 'Consultation completed'
        });
      }
      
      // Navigate based on role
      navigate(isDoctor ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      console.error('Error ending consultation:', err);
      // Still navigate even if API fails
      navigate(isDoctor ? '/doctor/dashboard' : '/dashboard');
    }
  };

  const handleToggleAudio = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
    setIsAudioMuted(!isAudioMuted);
  };

  const handleToggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomName);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !consultationId) return;

    setUploadingFile(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', file.type.startsWith('image/') ? 'image' : 'document');
      
      const response = await consultationAttachmentsAPI.upload(consultationId, formData);
      setFiles(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(t('consultation.uploadError', 'Failed to upload file'));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm(t('consultation.confirmDeleteFile', 'Delete this file?'))) return;
    
    try {
      await consultationAttachmentsAPI.delete(consultationId, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  const handlePrescriptionChange = (field, value) => {
    setPrescriptionForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPrescription = () => {
    if (!prescriptionForm.medicine_name.trim()) return;
    
    setPrescriptions(prev => [...prev, {
      ...prescriptionForm,
      id: `temp-${Date.now()}`
    }]);
    
    setPrescriptionForm({
      medicine_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    });
  };

  const handleRemovePrescription = (index) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePrescriptions = async () => {
    if (prescriptions.length === 0 || !consultationId) return;
    
    setSavingPrescription(true);
    
    try {
      await consultationPrescriptionsAPI.bulkCreate(consultationId, prescriptions);
      setShowPrescription(false);
      // Refresh consultation details
      fetchConsultationDetails();
    } catch (err) {
      console.error('Error saving prescriptions:', err);
      setError(t('consultation.prescriptionError', 'Failed to save prescription'));
    } finally {
      setSavingPrescription(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get user display name
  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Guest';
    return user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t('consultation.loading', 'Loading consultation...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !consultationDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('consultation.errorTitle', 'Unable to Load')}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.goBack', 'Go Back')}
          </button>
        </div>
      </div>
    );
  }

  const renderVideoConsultation = () => (
    <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden absolute top-4 right-4 z-10 p-2 bg-gray-800 rounded-lg text-white"
        aria-label={t('consultation.toggleSidebar', 'Toggle sidebar')}
      >
        {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
        aria-label={t('common.goBack', 'Go back')}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {isJoined ? (
        JitsiMeeting ? (
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={roomName}
            userInfo={{
              displayName: getUserDisplayName(),
              email: user?.email || ''
            }}
            configOverwrite={{
              startWithAudioMuted: isAudioMuted,
              startWithVideoMuted: isVideoMuted,
              disableModeratorIndicator: true,
              enableWelcomePage: false,
              enableClosePage: false,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              toolbarButtons: [
                'microphone', 'camera', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'chat', 'raisehand',
                'videoquality', 'filmstrip', 'tileview', 'settings'
              ]
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
              SHOW_CHROME_EXTENSION_BANNER: false,
              MOBILE_APP_PROMO: false,
              HIDE_INVITE_MORE_HEADER: true,
              TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'desktop', 'fullscreen',
                'hangup', 'chat', 'raisehand', 'tileview'
              ]
            }}
            getIFrameRef={(iframeRef) => { 
              if (iframeRef) {
                iframeRef.style.height = '100%';
                iframeRef.style.width = '100%';
              }
            }}
            onReadyToClose={() => {
              setIsJoined(false);
              handleEndConsultation();
            }}
            onApiReady={handleApiReady}
          />
        ) : (
          // External Jitsi fallback
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center text-white max-w-lg">
              <Video className="h-16 w-16 mx-auto mb-6 text-blue-400" />
              <h2 className="text-2xl font-bold mb-4">
                {t('consultation.externalJoinTitle', 'Join Video Consultation')}
              </h2>
              <p className="text-gray-300 mb-6">
                {t('consultation.externalJoinDescription', 'Click below to open the video call in a new tab')}
              </p>
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <div className="text-sm text-gray-400 mb-2">{t('consultation.roomId', 'Room ID')}</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-mono">{roomName}</span>
                  <button
                    onClick={handleCopyRoomId}
                    className="p-1 text-gray-400 hover:text-white"
                    aria-label={t('consultation.copyRoomId', 'Copy room ID')}
                  >
                    {copiedRoomId ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <a
                href={`https://meet.jit.si/${encodeURIComponent(roomName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
              >
                <ExternalLink className="h-5 w-5" />
                {t('consultation.openExternal', 'Open Video Call')}
              </a>
            </div>
          </div>
        )
      ) : (
        // Pre-join screen
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center text-white max-w-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {t('consultation.joinConsultation', 'Join Consultation')}
            </h2>
            {consultationDetails && (
              <p className="text-gray-300 mb-2">
                {isDoctor 
                  ? `${t('consultation.withPatient', 'With')}: ${consultationDetails.patient_name || 'Patient'}`
                  : `${t('consultation.withDoctor', 'With')}: ${consultationDetails.doctor_name || 'Doctor'}`
                }
              </p>
            )}
            <p className="text-gray-400 mb-8">
              {t('consultation.joinDescription', 'Make sure your camera and microphone are ready')}
            </p>
            
            {/* Pre-join settings */}
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={`p-4 rounded-full ${
                  isAudioMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                aria-label={isAudioMuted ? t('consultation.unmute', 'Unmute') : t('consultation.mute', 'Mute')}
              >
                {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
              <button
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className={`p-4 rounded-full ${
                  isVideoMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                aria-label={isVideoMuted ? t('consultation.startVideo', 'Start video') : t('consultation.stopVideo', 'Stop video')}
              >
                {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">{t('consultation.roomId', 'Room ID')}</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-mono">{roomName}</span>
                  <button
                    onClick={handleCopyRoomId}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    {copiedRoomId ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsJoined(true)}
                className="w-full py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Video className="h-5 w-5" />
                {t('consultation.joinNow', 'Join Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSidebar = () => (
    <div className={`
      ${showSidebar ? 'translate-x-0' : 'translate-x-full'}
      lg:translate-x-0 fixed lg:relative right-0 top-0 z-20
      w-full sm:w-96 h-full bg-white border-l flex flex-col
      transition-transform duration-300
    `}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{t('consultation.consultationDetails', 'Consultation Details')}</h3>
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {consultationDetails && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                {isDoctor ? t('consultation.patient', 'Patient') : t('consultation.doctor', 'Doctor')}
              </span>
              <span className="font-medium">
                {isDoctor ? consultationDetails.patient_name : consultationDetails.doctor_name}
              </span>
            </div>
            {consultationDetails.scheduled_start && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t('consultation.time', 'Time')}</span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(consultationDetails.scheduled_start).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('consultation.status', 'Status')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                consultationDetails.status === 'in_progress' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {consultationDetails.status || 'Active'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {[
          { id: 'chat', icon: MessageSquare, label: t('consultation.chat', 'Chat') },
          { id: 'participants', icon: Users, label: t('consultation.participants', 'People') },
          { id: 'files', icon: FileText, label: t('consultation.files', 'Files') },
          ...(isDoctor ? [{ id: 'prescription', icon: FileText, label: t('consultation.prescription', 'Rx') }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>{t('consultation.noMessages', 'No messages yet')}</p>
                  <p className="text-sm">{t('consultation.startConversation', 'Start the conversation')}</p>
                </div>
              ) : (
                chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.isOwn
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    } ${message.pending ? 'opacity-70' : ''} ${message.failed ? 'border-2 border-red-500' : ''}`}>
                      {!message.isOwn && (
                        <div className="text-xs font-medium mb-1 opacity-70">{message.sender}</div>
                      )}
                      <div className="text-sm">{message.text}</div>
                      <div className={`text-xs mt-1 ${message.isOwn ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                        {message.failed ? (
                          <span className="text-red-500">{t('consultation.failed', 'Failed')}</span>
                        ) : (
                          new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('consultation.typeMessage', 'Type a message...')}
                  className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('consultation.send', 'Send')}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Current user */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{getUserDisplayName()}</div>
                  <div className="text-sm text-gray-500">{isDoctor ? 'Doctor' : 'Patient'} (You)</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isAudioMuted && <Mic className="h-4 w-4 text-green-500" />}
                {!isVideoMuted && <Video className="h-4 w-4 text-green-500" />}
              </div>
            </div>

            {/* Other participants */}
            {participants.length > 0 ? (
              participants.map(participant => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{participant.displayName || 'Participant'}</div>
                      <div className="text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('consultation.waitingForOthers', 'Waiting for others to join...')}</p>
              </div>
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Upload area */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx"
              />
              {uploadingFile ? (
                <Loader2 className="h-10 w-10 mx-auto mb-3 text-blue-500 animate-spin" />
              ) : (
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              )}
              <p className="text-gray-600 text-sm">
                {uploadingFile 
                  ? t('consultation.uploading', 'Uploading...')
                  : t('consultation.uploadFiles', 'Click to upload files')
                }
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {t('consultation.supportedFormats', 'Images, PDF, DOC up to 10MB')}
              </p>
            </div>

            {/* Files list */}
            <div className="space-y-2">
              {files.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">
                  {t('consultation.noFiles', 'No files shared yet')}
                </p>
              ) : (
                files.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center min-w-0">
                      <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{file.file_name || file.name}</div>
                        <div className="text-xs text-gray-500">
                          {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={file.file_url || file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                        aria-label={t('consultation.download', 'Download')}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {file.uploaded_by === user?.id && (
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          aria-label={t('consultation.delete', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Prescription Tab (Doctor only) */}
        {activeTab === 'prescription' && isDoctor && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Existing prescriptions */}
            {prescriptions.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t('consultation.prescribedMedicines', 'Prescribed Medicines')}
                </h4>
                <div className="space-y-2">
                  {prescriptions.map((rx, index) => (
                    <div key={rx.id || index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-green-900">{rx.medicine_name}</div>
                          <div className="text-sm text-green-700">
                            {rx.dosage} • {rx.frequency} • {rx.duration}
                          </div>
                          {rx.instructions && (
                            <div className="text-xs text-green-600 mt-1">{rx.instructions}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePrescription(index)}
                          className="p-1 text-green-600 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add prescription button */}
            <button
              onClick={() => setShowPrescription(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              {t('consultation.addPrescription', 'Add Medicine')}
            </button>

            {/* Save button */}
            {prescriptions.length > 0 && (
              <button
                onClick={handleSavePrescriptions}
                disabled={savingPrescription}
                className="w-full mt-3 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingPrescription ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {t('consultation.savePrescription', 'Save Prescription')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleToggleAudio}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${
              isAudioMuted 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isAudioMuted ? t('consultation.unmute', 'Unmute') : t('consultation.mute', 'Mute')}
          </button>
          <button
            onClick={handleToggleVideo}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${
              isVideoMuted 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            {isVideoMuted ? t('consultation.startVideo', 'Video') : t('consultation.stopVideo', 'Video')}
          </button>
        </div>
        <button
          onClick={handleEndConsultation}
          className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <PhoneOff className="h-5 w-5" />
          {t('consultation.endConsultation', 'End Consultation')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescription && (
        <div 
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPrescription(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{t('consultation.addMedicine', 'Add Medicine')}</h3>
                <button
                  onClick={() => setShowPrescription(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('consultation.medicationName', 'Medicine Name')} *
                  </label>
                  <input
                    type="text"
                    value={prescriptionForm.medicine_name}
                    onChange={(e) => handlePrescriptionChange('medicine_name', e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Paracetamol 500mg"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('consultation.dosage', 'Dosage')}
                    </label>
                    <input
                      type="text"
                      value={prescriptionForm.dosage}
                      onChange={(e) => handlePrescriptionChange('dosage', e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1 tablet"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('consultation.frequency', 'Frequency')}
                    </label>
                    <input
                      type="text"
                      value={prescriptionForm.frequency}
                      onChange={(e) => handlePrescriptionChange('frequency', e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3 times daily"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('consultation.duration', 'Duration')}
                  </label>
                  <input
                    type="text"
                    value={prescriptionForm.duration}
                    onChange={(e) => handlePrescriptionChange('duration', e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="7 days"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('consultation.instructions', 'Instructions')}
                  </label>
                  <textarea
                    value={prescriptionForm.instructions}
                    onChange={(e) => handlePrescriptionChange('instructions', e.target.value)}
                    rows="2"
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="After meals, with water"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPrescription(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => {
                    handleAddPrescription();
                    setShowPrescription(false);
                  }}
                  disabled={!prescriptionForm.medicine_name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('consultation.addMedicine', 'Add Medicine')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex h-screen">
        {/* Video Area */}
        {renderVideoConsultation()}

        {/* Sidebar */}
        {renderSidebar()}

        {/* Mobile overlay */}
        {showSidebar && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-10"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Consultation;