// src/components/common/ChatbotWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Minimize2,
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatbotAPI } from '../../services/api';

const ChatbotWidget = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Widget state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [bottomOffset, setBottomOffset] = useState('120px');
  const [widgetHeight, setWidgetHeight] = useState(500);

  // Chat state
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Speech recognition
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Compute widget position
  useEffect(() => {
    const computeOffset = () => {
      try {
        const screenH = window.screen?.height || 0;
        const innerH = window.innerHeight || 0;
        const possibleBar = Math.max(0, screenH - innerH);

        const desiredHeight = Math.min(500, Math.floor(innerH * 0.75));
        const basePadding = 8;
        const minTaskbarOffset = Math.max(15, possibleBar + basePadding);
        const minOffset = 100;
        const navbarGap = 72;

        let offset = Math.max(minOffset, minTaskbarOffset);
        const topPos = innerH - offset - desiredHeight;
        if (topPos < navbarGap) {
          const computed = innerH - desiredHeight - navbarGap;
          offset = Math.max(minTaskbarOffset, Math.min(offset, Math.max(12, computed)));
        }

        setBottomOffset(`${offset}px`);
        setWidgetHeight(desiredHeight);
      } catch (e) {
        setBottomOffset('100px');
        setWidgetHeight(500);
      }
    };

    computeOffset();
    window.addEventListener('resize', computeOffset);
    return () => window.removeEventListener('resize', computeOffset);
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'te' ? 'te-IN' : 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [i18n.language]);

  // Format user name
  const formatName = (name) => {
    if (!name) return '';
    return name
      .toString()
      .split(/[\s._-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Start chat session
  const startSession = useCallback(async () => {
    try {
      const response = await chatbotAPI.startSession({
        language: i18n.language,
      });

      if (response.data?.session_id) {
        setSessionId(response.data.session_id);
      }

      // Welcome message
      const welcomeName = user?.full_name || user?.name;
      const welcomeText = welcomeName
        ? `${t('chatbot.welcome', 'Hello')}, ${formatName(welcomeName)}! ${t('chatbot.howCanIHelp', 'How can I help you today?')}`
        : t('chatbot.welcomeGuest', 'Hello! I am MediBot, your AI health assistant. How can I help you today?');

      setMessages([
        {
          id: 'welcome',
          text: welcomeText,
          sender: 'bot',
          timestamp: new Date(),
        },
        {
          id: 'disclaimer',
          text: t('chatbot.disclaimer', '⚠️ Disclaimer: I provide general health information only. Please consult a doctor for medical advice, diagnosis, or treatment.'),
          sender: 'bot',
          type: 'disclaimer',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Failed to start chat session:', err);
      setMessages([
        {
          id: 'welcome',
          text: t('chatbot.welcomeOffline', 'Hello! I am MediBot. I am currently in offline mode, but I can still help with basic questions.'),
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, [t, i18n.language, user]);

  // Initialize session when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startSession();
    }
  }, [isOpen, messages.length, startSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Send message
  const sendMessage = async (textToSend = null) => {
    const messageText = textToSend || message.trim();
    if (!messageText || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatbotAPI.sendMessage({
        session_id: sessionId,
        message: messageText,
        language: i18n.language,
      });

      if (response.data) {
        const botMessage = {
          id: `bot-${Date.now()}`,
          text: response.data.response || response.data.message || t('chatbot.noResponse', 'I could not understand that. Please try again.'),
          sender: 'bot',
          timestamp: new Date(),
          suggestions: response.data.suggestions || [],
          confidence: response.data.confidence,
        };

        setMessages((prev) => [...prev, botMessage]);

        // Speak response if voice enabled
        if (voiceEnabled && synthRef.current) {
          speakText(botMessage.text);
        }
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      
      // Fallback response
      const fallbackMessage = {
        id: `bot-${Date.now()}`,
        text: t('chatbot.errorResponse', 'I am having trouble connecting right now. Please try again or consult a doctor for immediate help.'),
        sender: 'bot',
        type: 'error',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, fallbackMessage]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setError(t('chatbot.voiceNotSupported', 'Voice input is not supported in your browser'));
      return;
    }

    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Voice recognition error:', err);
        setIsListening(false);
      }
    }
  };

  // Speak text
  const speakText = (text) => {
    if (!synthRef.current) return;

    // Stop any current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Clear chat
  const clearChat = async () => {
    if (sessionId) {
      try {
        await chatbotAPI.endSession(sessionId);
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    }
    setSessionId(null);
    setMessages([]);
    setError(null);
    startSession();
  };

  // Quick replies
  const quickReplies = [
    { text: t('chatbot.quick1', 'I have a headache'), icon: '🤕' },
    { text: t('chatbot.quick2', 'Book appointment'), icon: '📅' },
    { text: t('chatbot.quick3', 'Medicine reminder'), icon: '💊' },
    { text: t('chatbot.quick4', 'Emergency help'), icon: '🚨' },
  ];

  // Render message
  const renderMessage = (msg) => {
    const isBot = msg.sender === 'bot';
    const isDisclaimer = msg.type === 'disclaimer';
    const isError = msg.type === 'error';

    return (
      <div
        key={msg.id}
        className={`mb-3 flex ${isBot ? 'justify-start' : 'justify-end'}`}
      >
        {isBot && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
            isBot
              ? isDisclaimer
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : isError
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-gray-100 text-gray-800'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          
          {/* Suggestions */}
          {msg.suggestions && msg.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {msg.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs px-2 py-1 bg-white/80 text-blue-700 rounded-full hover:bg-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className={`text-xs mt-1 ${isBot ? 'text-gray-500' : 'text-blue-100'}`}>
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all z-40 group"
          style={{ bottom: bottomOffset }}
          aria-label={t('chatbot.open', 'Open chat assistant')}
        >
          <MessageSquare className="h-6 w-6" />
          
          {/* Notification dot */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">1</span>
          </span>
          
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {t('chatbot.askMediBot', 'Ask MediBot')}
          </span>
        </button>
      )}

      {/* Chatbot Widget */}
      {isOpen && (
        <div
          className={`fixed right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-16' : ''
          }`}
          style={{
            bottom: bottomOffset,
            height: isMinimized ? '64px' : `${widgetHeight}px`,
            maxHeight: '80vh',
          }}
        >
          {/* Header */}
          <div
            className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-4 cursor-pointer flex-shrink-0"
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">MediBot</h3>
                  <p className="text-xs opacity-90">
                    {t('chatbot.aiAssistant', 'AI Health Assistant')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Voice toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoiceEnabled(!voiceEnabled);
                    if (isSpeaking) stopSpeaking();
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  title={voiceEnabled ? t('chatbot.muteVoice', 'Mute voice') : t('chatbot.enableVoice', 'Enable voice')}
                >
                  {voiceEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </button>

                {/* Clear chat */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearChat();
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  title={t('chatbot.clearChat', 'Clear chat')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Minimize */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  title={isMinimized ? t('chatbot.expand', 'Expand') : t('chatbot.minimize', 'Minimize')}
                >
                  <Minimize2 className="h-4 w-4" />
                </button>

                {/* Close */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  title={t('chatbot.close', 'Close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Online status */}
            {!isMinimized && (
              <div className="flex items-center mt-2 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>{t('chatbot.online', 'Online • Ready to help')}</span>
              </div>
            )}
          </div>

          {/* Body (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.map(renderMessage)}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center mr-2">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="flex items-center justify-center p-2">
                    <button
                      onClick={() => sendMessage(messages[messages.length - 2]?.text)}
                      className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('chatbot.retry', 'Retry')}
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length <= 3 && (
                <div className="px-4 py-2 bg-white border-t border-gray-100 flex-shrink-0">
                  <p className="text-xs text-gray-500 mb-2">
                    {t('chatbot.quickReplies', 'Quick options:')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(reply.text)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                      >
                        <span>{reply.icon}</span>
                        <span>{reply.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t bg-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* Voice Input Button */}
                  <button
                    onClick={toggleVoiceInput}
                    disabled={isLoading}
                    className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50`}
                    title={isListening ? t('chatbot.stopListening', 'Stop listening') : t('chatbot.startListening', 'Voice input')}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>

                  {/* Text Input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={
                      isListening
                        ? t('chatbot.listening', 'Listening...')
                        : t('chatbot.typeMessage', 'Type your message...')
                    }
                    disabled={isLoading || isListening}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50"
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => sendMessage()}
                    disabled={!message.trim() || isLoading}
                    className="p-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={t('chatbot.send', 'Send message')}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Speaking indicator */}
                {isSpeaking && (
                  <div className="flex items-center justify-center mt-2">
                    <button
                      onClick={stopSpeaking}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      {t('chatbot.speaking', 'Speaking... (tap to stop)')}
                    </button>
                  </div>
                )}
              </div>

              {/* Disclaimer Footer */}
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex-shrink-0">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {t('chatbot.footerDisclaimer', 'For informational purposes only. Consult a doctor for medical advice.')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;