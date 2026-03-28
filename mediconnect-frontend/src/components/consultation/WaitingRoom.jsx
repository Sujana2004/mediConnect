// src/components/consultation/WaitingRoom.jsx
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Video,
  Mic,
  MicOff,
  VideoOff,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  RefreshCw
} from 'lucide-react';
import { Button, Avatar, Card, Loader } from '../common';

/**
 * Device test status
 */
const DEVICE_STATUS = {
  TESTING: 'testing',
  SUCCESS: 'success',
  ERROR: 'error',
  IDLE: 'idle'
};

/**
 * WaitingRoom Component
 * Pre-consultation waiting area with device checks
 */
const WaitingRoom = memo(({
  doctor,
  appointment,
  position = 0,
  estimatedWait = 0,
  onJoin,
  onCancel,
  onDeviceTestComplete,
  isLoading = false,
  className = ''
}) => {
  const { t } = useTranslation();
  
  // State
  const [cameraStatus, setCameraStatus] = useState(DEVICE_STATUS.IDLE);
  const [micStatus, setMicStatus] = useState(DEVICE_STATUS.IDLE);
  const [videoStream, setVideoStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [devicesReady, setDevicesReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  //Use ref for stream cleanup to avoid stale closures
  const streamRef = useRef(null);

  /**
   * Test camera
   */
  const testCamera = useCallback(async () => {
    setCameraStatus(DEVICE_STATUS.TESTING);
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      setVideoStream(stream);
      setCameraStatus(DEVICE_STATUS.SUCCESS);
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      setCameraStatus(DEVICE_STATUS.ERROR);
      setErrorMessage(t('consultation.cameraError', 'Camera access denied or unavailable'));
      return false;
    }
  }, [t]);

  /**
   * Test microphone
   */
  const testMicrophone = useCallback(async () => {
    setMicStatus(DEVICE_STATUS.TESTING);
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getAudioTracks().forEach((track) => track.stop());
      setMicStatus(DEVICE_STATUS.SUCCESS);
      return true;
    } catch (err) {
      console.error('Microphone error:', err);
      setMicStatus(DEVICE_STATUS.ERROR);
      setErrorMessage(t('consultation.microphoneError', 'Microphone access denied or unavailable'));
      return false;
    }
  }, [t]);

  /**
   * Run device tests
   */
  const runDeviceTests = useCallback(async () => {
    const cameraOk = await testCamera();
    const micOk = await testMicrophone();
    const ready = cameraOk && micOk;
    setDevicesReady(ready);
    onDeviceTestComplete?.(ready);
  }, [testCamera, testMicrophone, onDeviceTestComplete]);

  /**
   * Cleanup video stream
   */
  // Fixed cleanup using ref
  const cleanupStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setVideoStream(null);
    }
  }, []);

  /**
   * Toggle camera
   */
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn((prev) => !prev);
    }
  }, []);

  /**
   * Toggle microphone
   */
  const toggleMicrophone = useCallback(() => {
    setIsMicOn((prev) => !prev);
  }, []);


  /**
   * Handle join
   */
  const handleJoin = useCallback(() => {
    cleanupStream();
    onJoin?.({ cameraEnabled: isCameraOn, micEnabled: isMicOn });
  }, [cleanupStream, onJoin, isCameraOn, isMicOn]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    cleanupStream();
    onCancel?.();
  }, [cleanupStream, onCancel]);

  /**
   * Run tests on mount
   */
  //Fixed: cleanup uses ref, no stale closure
  useEffect(() => {
    runDeviceTests();
    return () => {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fixed join button disabled logic
  const canJoin = devicesReady || 
    cameraStatus === DEVICE_STATUS.ERROR || 
    micStatus === DEVICE_STATUS.ERROR;

  /**
   * Format estimated wait time
   */
  const formatWaitTime = useCallback((minutes) => {
    if (minutes < 1) return t('consultation.lessThanMinute');
    if (minutes === 1) return t('consultation.oneMinute');
    return t('consultation.minutesWait', { minutes });
  }, [t]);

  return (
    <div className={`min-h-full bg-gray-50 p-4 sm:p-6 ${className}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('consultation.waitingRoom')}
          </h1>
          <p className="text-gray-500">
            {t('consultation.waitingRoomDesc')}
          </p>
        </div>

        {/* Doctor Info */}
        {doctor && (
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Avatar
                src={doctor.profile_picture}
                name={doctor.full_name || doctor.first_name}
                size="lg"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Dr. {doctor.full_name || doctor.first_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {doctor.specialization_display || doctor.specialization}
                </p>
              </div>
              {appointment?.consultation_type === 'video' && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Video size={18} />
                  <span className="text-sm font-medium">{t('consultation.video')}</span>
                </div>
              )}
              {appointment?.consultation_type === 'audio' && (
                <div className="flex items-center gap-1 text-green-600">
                  <Phone size={18} />
                  <span className="text-sm font-medium">{t('consultation.audio')}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Queue Position */}
        {position > 0 && (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock size={24} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  {t('consultation.queuePosition')}
                </p>
                <p className="text-2xl font-bold text-amber-900">
                  #{position}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-800">
                  {t('consultation.estimatedWait')}
                </p>
                <p className="font-semibold text-amber-900">
                  {formatWaitTime(estimatedWait)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Video Preview */}
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
            {videoStream && isCameraOn ? (
              <video
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover mirror"
                ref={(video) => {
                  if (video && videoStream) {
                    video.srcObject = videoStream;
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <User size={64} />
                <p className="mt-2 text-sm">
                  {cameraStatus === DEVICE_STATUS.ERROR
                    ? t('consultation.cameraUnavailable')
                    : t('consultation.cameraOff')
                  }
                </p>
              </div>
            )}

            {/* Camera/Mic controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={toggleMicrophone}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-colors
                  ${isMicOn
                    ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  }
                `}
                disabled={micStatus === DEVICE_STATUS.ERROR}
              >
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                onClick={toggleCamera}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-colors
                  ${isCameraOn
                    ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  }
                `}
                disabled={cameraStatus === DEVICE_STATUS.ERROR}
              >
                {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>
          </div>

          {/* Device Status */}
          <div className="p-4 bg-white border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('consultation.deviceCheck')}
            </h4>
            <div className="space-y-2">
              {/* Camera status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{t('consultation.camera')}</span>
                </div>
                <div className="flex items-center gap-1">
                  {cameraStatus === DEVICE_STATUS.TESTING && (
                    <Loader size="sm" />
                  )}
                  {cameraStatus === DEVICE_STATUS.SUCCESS && (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                  {cameraStatus === DEVICE_STATUS.ERROR && (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                  <span className={`text-sm ${
                    cameraStatus === DEVICE_STATUS.SUCCESS ? 'text-green-600' :
                    cameraStatus === DEVICE_STATUS.ERROR ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {cameraStatus === DEVICE_STATUS.TESTING && t('consultation.testing')}
                    {cameraStatus === DEVICE_STATUS.SUCCESS && t('consultation.ready')}
                    {cameraStatus === DEVICE_STATUS.ERROR && t('consultation.unavailable')}
                  </span>
                </div>
              </div>

              {/* Microphone status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{t('consultation.microphone')}</span>
                </div>
                <div className="flex items-center gap-1">
                  {micStatus === DEVICE_STATUS.TESTING && (
                    <Loader size="sm" />
                  )}
                  {micStatus === DEVICE_STATUS.SUCCESS && (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                  {micStatus === DEVICE_STATUS.ERROR && (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                  <span className={`text-sm ${
                    micStatus === DEVICE_STATUS.SUCCESS ? 'text-green-600' :
                    micStatus === DEVICE_STATUS.ERROR ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {micStatus === DEVICE_STATUS.TESTING && t('consultation.testing')}
                    {micStatus === DEVICE_STATUS.SUCCESS && t('consultation.ready')}
                    {micStatus === DEVICE_STATUS.ERROR && t('consultation.unavailable')}
                  </span>
                </div>
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Retry button */}
            {(cameraStatus === DEVICE_STATUS.ERROR || micStatus === DEVICE_STATUS.ERROR) && (
              <button
                onClick={runDeviceTests}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <RefreshCw size={14} />
                {t('consultation.retryDeviceTest')}
              </button>
            )}
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-4 bg-blue-50 border-blue-100">
          <h4 className="font-medium text-blue-900 mb-2">
            {t('consultation.tips')}
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {t('consultation.tip1')}</li>
            <li>• {t('consultation.tip2')}</li>
            <li>• {t('consultation.tip3')}</li>
            <li>• {t('consultation.tip4')}</li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            fullWidth
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleJoin}
            fullWidth
            loading={isLoading}
            disabled={!canJoin || isLoading}
            leftIcon={<Video size={18} />}
          >
            {t('consultation.joinCall', 'Join Call')}
          </Button>
        </div>
      </div>

      {/* CSS for mirrored video */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
});

WaitingRoom.displayName = 'WaitingRoom';

WaitingRoom.propTypes = {
  doctor: PropTypes.object,
  appointment: PropTypes.object,
  position: PropTypes.number,
  estimatedWait: PropTypes.number,
  onJoin: PropTypes.func,
  onCancel: PropTypes.func,
  onDeviceTestComplete: PropTypes.func,
  isLoading: PropTypes.bool,
  className: PropTypes.string
};

export default WaitingRoom;