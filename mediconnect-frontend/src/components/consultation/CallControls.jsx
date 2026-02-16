// src/components/consultation/CallControls.jsx
import { useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageCircle,
  Monitor,
  MoreVertical,
  Settings,
  Maximize,
  Minimize,
  Users,
  Volume2,
  VolumeX
} from 'lucide-react';

/**
 * Control Button Component
 */
const ControlButton = memo(({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
  disabled = false,
  badge = null,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };

  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        relative ${sizeClasses[size]} rounded-full flex items-center justify-center
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${danger
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : active
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-gray-700/80 hover:bg-gray-600/80 text-white'
        }
        ${className}
      `}
    >
      <Icon size={iconSizes[size]} />
      {badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
});

ControlButton.displayName = 'ControlButton';

/**
 * CallControls Component
 * Video call control bar
 */
const CallControls = memo(({
  isMuted = false,
  isVideoOff = false,
  isChatOpen = false,
  isScreenSharing = false,
  isFullscreen = false,
  unreadMessages = 0,
  participantCount = 2,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onToggleScreenShare,
  onToggleFullscreen,
  onEndCall,
  onOpenSettings,
  showScreenShare = true,
  showChat = true,
  showParticipants = false,
  onShowParticipants,
  position = 'bottom',
  className = ''
}) => {
  const { t } = useTranslation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleToggleMute = useCallback(() => {
    onToggleMute?.();
  }, [onToggleMute]);

  const handleToggleVideo = useCallback(() => {
    onToggleVideo?.();
  }, [onToggleVideo]);

  const handleToggleChat = useCallback(() => {
    onToggleChat?.();
  }, [onToggleChat]);

  const handleToggleScreenShare = useCallback(() => {
    onToggleScreenShare?.();
  }, [onToggleScreenShare]);

  const handleToggleFullscreen = useCallback(() => {
    onToggleFullscreen?.();
  }, [onToggleFullscreen]);

  const handleEndCall = useCallback(() => {
    onEndCall?.();
  }, [onEndCall]);

  const handleOpenSettings = useCallback(() => {
    setShowMoreMenu(false);
    onOpenSettings?.();
  }, [onOpenSettings]);

  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0',
    top: 'top-0 left-0 right-0',
    floating: 'bottom-6 left-1/2 -translate-x-1/2'
  };

  return (
    <div
      className={`
        ${position === 'floating' ? 'absolute' : 'absolute'}
        ${positionClasses[position]}
        z-20
        ${className}
      `}
    >
      <div className={`
        flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4
        ${position === 'floating'
          ? 'bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl'
          : 'bg-gradient-to-t from-gray-900/90 to-transparent'
        }
      `}>
        {/* Mute Button */}
        <ControlButton
          icon={isMuted ? MicOff : Mic}
          label={isMuted ? t('consultation.unmute') : t('consultation.mute')}
          onClick={handleToggleMute}
          active={!isMuted}
        />

        {/* Video Button */}
        <ControlButton
          icon={isVideoOff ? VideoOff : Video}
          label={isVideoOff ? t('consultation.turnOnVideo') : t('consultation.turnOffVideo')}
          onClick={handleToggleVideo}
          active={!isVideoOff}
        />

        {/* Screen Share Button */}
        {showScreenShare && (
          <ControlButton
            icon={Monitor}
            label={isScreenSharing ? t('consultation.stopSharing') : t('consultation.shareScreen')}
            onClick={handleToggleScreenShare}
            active={isScreenSharing}
            className="hidden sm:flex"
          />
        )}

        {/* End Call Button */}
        <ControlButton
          icon={PhoneOff}
          label={t('consultation.endCall')}
          onClick={handleEndCall}
          danger
          size="lg"
        />

        {/* Chat Button */}
        {showChat && (
          <ControlButton
            icon={MessageCircle}
            label={t('consultation.chat')}
            onClick={handleToggleChat}
            active={isChatOpen}
            badge={unreadMessages > 0 ? unreadMessages : null}
          />
        )}

        {/* Participants Button */}
        {showParticipants && (
          <ControlButton
            icon={Users}
            label={t('consultation.participants')}
            onClick={onShowParticipants}
            badge={participantCount}
            className="hidden sm:flex"
          />
        )}

        {/* Fullscreen Button */}
        <ControlButton
          icon={isFullscreen ? Minimize : Maximize}
          label={isFullscreen ? t('consultation.exitFullscreen') : t('consultation.fullscreen')}
          onClick={handleToggleFullscreen}
          className="hidden sm:flex"
        />

        {/* More Menu */}
        <div className="relative sm:hidden">
          <ControlButton
            icon={MoreVertical}
            label={t('common.more')}
            onClick={() => setShowMoreMenu(prev => !prev)}
          />

          {showMoreMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMoreMenu(false)}
              />
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-xl overflow-hidden z-20">
                {showScreenShare && (
                  <button
                    onClick={handleToggleScreenShare}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Monitor size={18} />
                    {isScreenSharing ? t('consultation.stopSharing') : t('consultation.shareScreen')}
                  </button>
                )}
                <button
                  onClick={handleToggleFullscreen}
                  className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  {isFullscreen ? t('consultation.exitFullscreen') : t('consultation.fullscreen')}
                </button>
                <button
                  onClick={handleOpenSettings}
                  className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3"
                >
                  <Settings size={18} />
                  {t('common.settings')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

CallControls.displayName = 'CallControls';

CallControls.propTypes = {
  isMuted: PropTypes.bool,
  isVideoOff: PropTypes.bool,
  isChatOpen: PropTypes.bool,
  isScreenSharing: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  unreadMessages: PropTypes.number,
  participantCount: PropTypes.number,
  onToggleMute: PropTypes.func,
  onToggleVideo: PropTypes.func,
  onToggleChat: PropTypes.func,
  onToggleScreenShare: PropTypes.func,
  onToggleFullscreen: PropTypes.func,
  onEndCall: PropTypes.func,
  onOpenSettings: PropTypes.func,
  showScreenShare: PropTypes.bool,
  showChat: PropTypes.bool,
  showParticipants: PropTypes.bool,
  onShowParticipants: PropTypes.func,
  position: PropTypes.oneOf(['bottom', 'top', 'floating']),
  className: PropTypes.string
};

export default CallControls;