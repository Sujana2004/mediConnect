import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import useVoice from '../../hooks/useVoice';
import useLanguage from '../../hooks/useLanguage';

/**
 * Voice Button component for speech input and text-to-speech
 */
const VoiceButton = ({
  mode = 'listen', // 'listen' | 'speak' | 'both'
  text = '', // Text to speak (for speak mode)
  onTranscript, // Callback when speech is recognized
  onListeningChange, // Callback when listening state changes
  size = 'md',
  variant = 'primary',
  showLabel = false,
  disabled = false,
  className = ''
}) => {
  const {
    isSupported,
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript
  } = useVoice();

  const { t } = useLanguage();
  const [localListening, setLocalListening] = useState(false);

  // Size styles
  const sizeStyles = {
    sm: { button: 'p-2', icon: 18 },
    md: { button: 'p-3', icon: 22 },
    lg: { button: 'p-4', icon: 28 },
    xl: { button: 'p-5', icon: 34 }
  };

  // Variant styles
  const variantStyles = {
    primary: {
      base: 'bg-primary-100 text-primary-600 hover:bg-primary-200',
      active: 'bg-primary-600 text-white'
    },
    secondary: {
      base: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      active: 'bg-gray-600 text-white'
    },
    danger: {
      base: 'bg-red-100 text-red-600 hover:bg-red-200',
      active: 'bg-red-600 text-white'
    },
    white: {
      base: 'bg-white text-gray-600 hover:bg-gray-50 shadow-md',
      active: 'bg-primary-600 text-white'
    }
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const currentVariant = variantStyles[variant] || variantStyles.primary;

  // Handle transcript changes
  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  // Handle listening state changes
  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
    setLocalListening(isListening);
  }, [isListening, onListeningChange]);

  // Handle listen button click
  const handleListenClick = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      startListening();
    }
  };

  // Handle speak button click
  const handleSpeakClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (text) {
      speak(text);
    }
  };

  // Not supported
  if (!isSupported) {
    return null;
  }

  // Listen mode button
  if (mode === 'listen') {
    return (
      <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={handleListenClick}
          disabled={disabled}
          className={`
            rounded-full transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${currentSize.button}
            ${localListening ? currentVariant.active : currentVariant.base}
            ${localListening ? 'animate-pulse shadow-lg' : ''}
          `}
          aria-label={localListening ? t('voice.stopListening') : t('voice.tapToSpeak')}
        >
          {localListening ? (
            <Mic size={currentSize.icon} className="animate-pulse" />
          ) : (
            <Mic size={currentSize.icon} />
          )}
        </button>
        
        {showLabel && (
          <span className="text-xs text-gray-500">
            {localListening ? t('voice.listening') : t('voice.tapToSpeak')}
          </span>
        )}

        {/* Listening indicator */}
        {localListening && (
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-4 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    );
  }

  // Speak mode button
  if (mode === 'speak') {
    return (
      <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={handleSpeakClick}
          disabled={disabled || !text}
          className={`
            rounded-full transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${currentSize.button}
            ${isSpeaking ? currentVariant.active : currentVariant.base}
          `}
          aria-label={isSpeaking ? t('voice.stopReading') : t('voice.readAloud')}
        >
          {isSpeaking ? (
            <VolumeX size={currentSize.icon} />
          ) : (
            <Volume2 size={currentSize.icon} />
          )}
        </button>

        {showLabel && (
          <span className="text-xs text-gray-500">
            {isSpeaking ? t('voice.stopReading') : t('voice.readAloud')}
          </span>
        )}
      </div>
    );
  }

  // Both mode - shows both buttons
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Listen button */}
      <button
        type="button"
        onClick={handleListenClick}
        disabled={disabled || isSpeaking}
        className={`
          rounded-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${currentSize.button}
          ${localListening ? currentVariant.active : currentVariant.base}
          ${localListening ? 'animate-pulse' : ''}
        `}
        aria-label={localListening ? t('voice.stopListening') : t('voice.tapToSpeak')}
      >
        {localListening ? (
          <MicOff size={currentSize.icon} />
        ) : (
          <Mic size={currentSize.icon} />
        )}
      </button>

      {/* Speak button */}
      <button
        type="button"
        onClick={handleSpeakClick}
        disabled={disabled || !text || localListening}
        className={`
          rounded-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${currentSize.button}
          ${isSpeaking ? currentVariant.active : currentVariant.base}
        `}
        aria-label={isSpeaking ? t('voice.stopReading') : t('voice.readAloud')}
      >
        {isSpeaking ? (
          <VolumeX size={currentSize.icon} />
        ) : (
          <Volume2 size={currentSize.icon} />
        )}
      </button>
    </div>
  );
};

/**
 * Floating Voice Button - fixed position voice input
 */
VoiceButton.Floating = ({
  onTranscript,
  position = 'bottom-right',
  className = ''
}) => {
  const { isSupported, isListening } = useVoice();
  const { t } = useLanguage();

  if (!isSupported) return null;

  const positionStyles = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4'
  };

  return (
    <div className={`fixed z-40 ${positionStyles[position]} ${className}`}>
      <VoiceButton
        mode="listen"
        size="lg"
        variant="white"
        onTranscript={onTranscript}
        showLabel={isListening}
      />
    </div>
  );
};

VoiceButton.propTypes = {
  mode: PropTypes.oneOf(['listen', 'speak', 'both']),
  text: PropTypes.string,
  onTranscript: PropTypes.func,
  onListeningChange: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'white']),
  showLabel: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string
};

VoiceButton.Floating.propTypes = {
  onTranscript: PropTypes.func,
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left']),
  className: PropTypes.string
};

export default VoiceButton;