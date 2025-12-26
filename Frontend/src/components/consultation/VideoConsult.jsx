import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Phone, Mic, MicOff, VideoOff, Settings, Users, MessageSquare } from 'lucide-react';

const VideoConsult = () => {
  const { t } = useTranslation();
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [participants, setParticipants] = useState([
    { id: 1, name: 'Dr. Sharma', role: 'doctor', isSpeaking: true },
    { id: 2, name: 'You', role: 'patient', isSpeaking: false }
  ]);

  const handleCall = () => {
    setIsInCall(true);
    // In real implementation, this would connect to Jitsi/WebRTC
  };

  const handleEndCall = () => {
    setIsInCall(false);
  };

  return (
    <div className="bg-gray-900 text-white rounded-xl overflow-hidden">
      {/* Video Grid */}
      <div className="h-96 bg-black relative">
        {isInCall ? (
          <div className="grid grid-cols-2 h-full">
            {participants.map(participant => (
              <div
                key={participant.id}
                className={`flex items-center justify-center border-2 ${
                  participant.isSpeaking ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    {participant.role === 'doctor' ? (
                      <span className="text-3xl">👨‍⚕️</span>
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  <div className="font-medium">{participant.name}</div>
                  <div className="text-sm text-gray-400">{participant.role}</div>
                  {participant.isSpeaking && (
                    <div className="mt-2 text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full">
                      Speaking...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{t('consultation.waitingToJoin')}</p>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`p-3 rounded-full ${
              isAudioMuted ? 'bg-red-600' : 'bg-gray-800'
            } hover:opacity-90`}
          >
            {isAudioMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => setIsVideoMuted(!isVideoMuted)}
            className={`p-3 rounded-full ${
              isVideoMuted ? 'bg-red-600' : 'bg-gray-800'
            } hover:opacity-90`}
          >
            {isVideoMuted ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </button>
          {isInCall ? (
            <button
              onClick={handleEndCall}
              className="p-3 bg-red-600 rounded-full hover:bg-red-700"
            >
              <Phone className="h-5 w-5 rotate-135" />
            </button>
          ) : (
            <button
              onClick={handleCall}
              className="p-3 bg-green-600 rounded-full hover:bg-green-700"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
          <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm">{participants.length} {t('consultation.participants')}</span>
            </div>
            <button className="flex items-center text-sm text-blue-400 hover:text-blue-300">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('consultation.chat')}
            </button>
          </div>
          <div className="text-sm text-gray-400">
            {isInCall ? t('consultation.connected') : t('consultation.disconnected')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoConsult;