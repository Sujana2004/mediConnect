import React, { useState, useEffect, useRef } from 'react';
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
  Settings,
  Share2,
  FileText,
  Clock,
  User,
  Monitor,
  Upload,
  Download,
  Send
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { consultationAPI } from '../services/api';

const Consultation = () => {
  const { t } = useTranslation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState(roomId || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [consultationDetails, setConsultationDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('video');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (roomId) {
      fetchConsultationDetails();
    } else {
      generateRoomId();
    }
  }, [roomId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const generateRoomId = () => {
    const id = `mediconnect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setRoomName(id);
  };

  const fetchConsultationDetails = async () => {
    setIsLoading(true);
    try {
      // Mock consultation data
      setConsultationDetails({
        id: roomId,
        doctorName: 'Dr. Rajesh Sharma',
        doctorSpecialization: 'Cardiologist',
        patientName: 'Amit Patel',
        scheduledTime: '10:30 AM',
        duration: '30 minutes',
        status: 'in-progress',
        fee: 500
      });
    } catch (error) {
      console.error('Error fetching consultation details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiReady = (api) => {
    api.on('participantJoined', (participant) => {
      setParticipants(prev => [...prev, participant]);
    });

    api.on('participantLeft', (participant) => {
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
    });

    api.on('incomingMessage', (message) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: message.sender,
        text: message.message,
        timestamp: new Date().toISOString()
      }]);
    });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'You',
        text: newMessage,
        timestamp: new Date().toISOString()
      }]);
      setNewMessage('');
    }
  };

  const handleEndConsultation = async () => {
    if (window.confirm(t('consultation.confirmEnd'))) {
      try {
        await consultationAPI.endConsultation(roomId);
        navigate('/patient-dashboard');
      } catch (error) {
        console.error('Error ending consultation:', error);
      }
    }
  };

  const renderVideoConsultation = () => (
    <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden">
      {isJoined ? (
        typeof JitsiMeeting !== 'undefined' && JitsiMeeting ? (
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={roomName}
            configOverwrite={{
              startWithAudioMuted: isAudioMuted,
              startWithVideoMuted: isVideoMuted,
              disableModeratorIndicator: true,
              enableWelcomePage: false,
              enableClosePage: false,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              toolbarButtons: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                'security'
              ]
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
              SHOW_CHROME_EXTENSION_BANNER: false,
              MOBILE_APP_PROMO: false,
              HIDE_INVITE_MORE_HEADER: true
            }}
            getIFrameRef={(iframeRef) => { if(iframeRef) iframeRef.style.height = '100%'; }}
            onReadyToClose={() => {
              setIsJoined(false);
              navigate('/patient-dashboard');
            }}
            onApiReady={handleApiReady}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center text-white max-w-lg">
              <Video className="h-16 w-16 mx-auto mb-6 text-gray-400" />
              <h2 className="text-2xl font-bold mb-4">{t('consultation.externalJoinTitle') || 'Join the consultation'}</h2>
              <p className="text-gray-300 mb-4">{t('consultation.externalJoinDescription') || 'Video provider not available in this build — open the meeting in a new tab.'}</p>
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-400 mb-2">{t('consultation.roomId')}</div>
                <div className="text-xl font-mono">{roomName}</div>
              </div>
              <a
                href={`https://meet.jit.si/${encodeURIComponent(roomName)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
              >
                {t('consultation.openExternal') || 'Open Meet in new tab'}
              </a>
            </div>
          </div>
        )
      ) : (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center text-white max-w-lg">
            <Video className="h-16 w-16 mx-auto mb-6 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">{t('consultation.joinConsultation')}</h2>
            <p className="text-gray-300 mb-8">
              {t('consultation.joinDescription')}
            </p>
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">{t('consultation.roomId')}</div>
                <div className="text-xl font-mono">{roomName}</div>
              </div>
              <button
                onClick={() => setIsJoined(true)}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
              >
                {t('consultation.joinNow')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSidebar = () => (
    <div className="w-96 bg-white border-l flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-bold text-gray-900">{t('consultation.consultationDetails')}</h3>
        {consultationDetails && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('consultation.doctor')}</span>
              <span className="font-medium">{consultationDetails.doctorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('consultation.specialization')}</span>
              <span>{consultationDetails.doctorSpecialization}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('consultation.time')}</span>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {consultationDetails.scheduledTime}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {['chat', 'participants', 'files', 'prescription'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(`consultation.${tab}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {chatMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs rounded-lg p-3 ${
                    message.sender === 'You'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-xs font-medium mb-1">{message.sender}</div>
                    <div>{message.text}</div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('consultation.typeMessage')}
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="p-4 space-y-3">
            {participants.length > 0 ? (
              participants.map(participant => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{participant.displayName}</div>
                      <div className="text-sm text-gray-500">{participant.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Online</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('consultation.noParticipants')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="p-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">{t('consultation.uploadFiles')}</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {t('consultation.browseFiles')}
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {[].map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-500">{file.size}</div>
                    </div>
                  </div>
                  <Download className="h-5 w-5 text-gray-400 hover:text-blue-600 cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'prescription' && (
          <div className="p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-blue-900">{t('consultation.prescription')}</h4>
                <button className="text-blue-600 hover:text-blue-800">
                  <Download className="h-4 w-4" />
                </button>
              </div>
              <p className="text-blue-700 text-sm">
                {t('consultation.prescriptionDescription')}
              </p>
            </div>
            <button
              onClick={() => setShowPrescription(true)}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              {t('consultation.generatePrescription')}
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t space-y-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
              isAudioMuted ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isAudioMuted ? (
              <MicOff className="h-5 w-5 mr-2" />
            ) : (
              <Mic className="h-5 w-5 mr-2" />
            )}
            {isAudioMuted ? t('consultation.unmute') : t('consultation.mute')}
          </button>
          <button
            onClick={() => setIsVideoMuted(!isVideoMuted)}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
              isVideoMuted ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isVideoMuted ? (
              <VideoOff className="h-5 w-5 mr-2" />
            ) : (
              <Video className="h-5 w-5 mr-2" />
            )}
            {isVideoMuted ? t('consultation.startVideo') : t('consultation.stopVideo')}
          </button>
        </div>
        <button
          onClick={handleEndConsultation}
          className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center justify-center"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          {t('consultation.endConsultation')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Prescription Modal */}
      {showPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">{t('consultation.prescription')}</h3>
              {/* Prescription form would go here */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('consultation.medicationName')}
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="e.g., Paracetamol 500mg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('consultation.dosage')}
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="1 tablet"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('consultation.frequency')}
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="3 times daily"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('consultation.instructions')}
                  </label>
                  <textarea
                    rows="3"
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="After meals"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPrescription(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {t('consultation.cancel')}
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('consultation.savePrescription')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen">
        {/* Main Video Area */}
        {renderVideoConsultation()}

        {/* Sidebar */}
        {renderSidebar()}
      </div>
    </div>
  );
};

export default Consultation;