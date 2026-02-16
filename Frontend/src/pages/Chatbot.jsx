import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Bot,
  User,
  Paperclip,
  Mic,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Menu,
  X,
  Plus,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { chatbotAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Unique ID generator
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [error, setError] = useState(null);
  
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Quick replies - computed based on current language
  const quickReplies = [
    t('chatbot.quick1', 'What are the symptoms of fever?'),
    t('chatbot.quick2', 'How to manage diabetes?'),
    t('chatbot.quick3', 'Tips for better sleep'),
    t('chatbot.quick4', 'When should I see a doctor?'),
    t('chatbot.quick5', 'Home remedies for cold'),
    t('chatbot.quick6', 'How to reduce stress?')
  ];

  // Format user name
  const formatName = useCallback((name) => {
    if (!name) return '';
    return name
      .toString()
      .split(/[\s._-]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, []);

  // Initialize session and welcome message
  useEffect(() => {
    initializeChat();
    loadChatHistory();
    
    return () => {
      // Cleanup speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      // Cleanup speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Start a new session
      const response = await chatbotAPI.startSession({
        language: i18n.language
      });
      
      if (response.data?.session_id) {
        setSessionId(response.data.session_id);
      }
    } catch (err) {
      console.error('Failed to start chat session:', err);
      // Generate local session ID as fallback
      setSessionId(`local_${Date.now()}`);
    }

    // Add welcome messages
    const welcomeMessages = [
      {
        id: generateId(),
        text: user?.name 
          ? `${t('chatbot.welcome', 'Hello')}, ${formatName(user.name)}! 👋`
          : t('chatbot.welcome', 'Hello! Welcome to MediConnect Health Assistant.'),
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      },
      {
        id: generateId(),
        text: t('chatbot.howCanIHelp', 'How can I help you with your health queries today?'),
        sender: 'bot',
        timestamp: new Date(Date.now() + 500),
        type: 'text'
      },
      {
        id: generateId(),
        text: t('chatbot.disclaimerInline', '⚠️ Please note: I provide general health information for reference only. Always consult a qualified doctor for medical advice, diagnosis, or treatment.'),
        sender: 'bot',
        timestamp: new Date(Date.now() + 1000),
        type: 'disclaimer'
      }
    ];
    
    setMessages(welcomeMessages);
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatbotAPI.listSessions();
      if (response.data?.sessions) {
        setChatHistory(response.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Send message
  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: generateId(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatbotAPI.sendMessage({
        session_id: sessionId,
        message: text.trim(),
        language: i18n.language
      });
      
      const botResponse = {
        id: generateId(),
        text: response.data?.response || response.data?.message || t('chatbot.fallbackResponse', "I'm here to help with your health queries."),
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        suggestions: response.data?.suggestions || [],
        sources: response.data?.sources || []
      };

      setMessages(prev => [...prev, botResponse]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(t('chatbot.errorSending', 'Failed to send message. Please try again.'));
      
      // Add fallback response
      const fallbackResponse = {
        id: generateId(),
        text: t('chatbot.fallbackResponse', "I apologize, but I'm having trouble processing your request. Please try again or consult with a healthcare professional for immediate assistance."),
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };

      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle quick reply
  const handleQuickReply = (reply) => {
    sendMessage(reply);
  };

  // Handle voice input
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError(t('chatbot.voiceNotSupported', 'Voice input is not supported in your browser.'));
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Set language based on app language
    const langMap = {
      'en': 'en-IN',
      'te': 'te-IN',
      'hi': 'hi-IN'
    };
    recognition.lang = langMap[i18n.language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setInputText(transcript);
        // Auto-send after voice input
        setTimeout(() => sendMessage(transcript), 500);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'no-speech') {
        setError(t('chatbot.noSpeech', 'No speech detected. Please try again.'));
      } else if (event.error === 'not-allowed') {
        setError(t('chatbot.micPermissionDenied', 'Microphone permission denied. Please enable it in your browser settings.'));
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  // Handle feedback
  const handleFeedback = async (messageId, feedback) => {
    // Update local state
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );

    // Send feedback to API
    try {
      await chatbotAPI.submitMessageFeedback({
        session_id: sessionId,
        message_id: messageId,
        feedback: feedback,
        language: i18n.language
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  // Copy message text
  const handleCopy = async (messageId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Text to speech
  const handleSpeak = (messageId, text) => {
    if (!window.speechSynthesis) {
      setError(t('chatbot.speechNotSupported', 'Text-to-speech is not supported in your browser.'));
      return;
    }

    // If already speaking this message, stop
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language
    const langMap = {
      'en': 'en-IN',
      'te': 'te-IN',
      'hi': 'hi-IN'
    };
    utterance.lang = langMap[i18n.language] || 'en-IN';
    utterance.rate = 0.9;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start new chat
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    initializeChat();
    setShowSidebar(false);
  };

  // Load previous chat
  const handleLoadChat = async (chatSessionId) => {
    try {
      const response = await chatbotAPI.getSessionMessages(chatSessionId);
      if (response.data?.messages) {
        setMessages(response.data.messages.map(msg => ({
          ...msg,
          id: msg.id || generateId(),
          timestamp: new Date(msg.timestamp)
        })));
        setSessionId(chatSessionId);
      }
      setShowSidebar(false);
    } catch (err) {
      console.error('Failed to load chat:', err);
      setError(t('chatbot.errorLoadingChat', 'Failed to load chat history.'));
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatSessionId, e) => {
    e.stopPropagation();
    try {
      await chatbotAPI.deleteSession(chatSessionId);
      setChatHistory(prev => prev.filter(c => c.session_id !== chatSessionId));
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Render message
  const renderMessage = (message) => {
    const isBot = message.sender === 'bot';
    const isDisclaimer = message.type === 'disclaimer';
    const isError = message.type === 'error';
    
    return (
      <div
        key={message.id}
        className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
      >
        <div className={`max-w-[85%] sm:max-w-[75%] ${isBot ? 'order-2' : 'order-1'}`}>
          {/* Message Header */}
          <div className={`flex items-center gap-2 mb-1 ${isBot ? '' : 'justify-end'}`}>
            {isBot && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">
              {isBot ? t('chatbot.botName', 'MediBot') : t('chatbot.you', 'You')}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {!isBot && (
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          
          {/* Message Content */}
          <div className={`rounded-2xl p-4 ${
            isDisclaimer
              ? 'bg-amber-50 border border-amber-200'
              : isError
                ? 'bg-red-50 border border-red-200'
                : isBot
                  ? 'bg-white border border-gray-200 shadow-sm'
                  : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
          }`}>
            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
              isDisclaimer ? 'text-amber-800' : isError ? 'text-red-700' : ''
            }`}>
              {message.text}
            </p>

            {/* Suggestions */}
            {isBot && message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">
                  {t('chatbot.suggestedQuestions', 'You might also ask')}:
                </p>
                <div className="space-y-1">
                  {message.suggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(suggestion)}
                      className="block w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bot Message Actions */}
            {isBot && !isDisclaimer && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  {/* Thumbs Up */}
                  <button
                    onClick={() => handleFeedback(message.id, 'like')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      message.feedback === 'like' 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                    aria-label={t('chatbot.helpful', 'Mark as helpful')}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  
                  {/* Thumbs Down */}
                  <button
                    onClick={() => handleFeedback(message.id, 'dislike')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      message.feedback === 'dislike' 
                        ? 'text-red-600 bg-red-50' 
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    aria-label={t('chatbot.notHelpful', 'Mark as not helpful')}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  
                  {/* Copy */}
                  <button
                    onClick={() => handleCopy(message.id, message.text)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      copiedMessageId === message.id
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={t('chatbot.copy', 'Copy message')}
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* Text to Speech */}
                  <button
                    onClick={() => handleSpeak(message.id, message.text)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      speakingMessageId === message.id
                        ? 'text-blue-600 bg-blue-50 animate-pulse'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    aria-label={t('chatbot.speak', 'Read aloud')}
                  >
                    {speakingMessageId === message.id ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center text-xs text-gray-400">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('chatbot.aiPowered', 'AI Powered')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-600 to-teal-600 rounded-full mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {t('chatbot.title', 'Health Assistant')}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
            {t('chatbot.subtitle', 'Get instant answers to your health questions')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              {t('chatbot.online', 'Online')}
            </div>
            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              <MessageSquare className="h-3 w-3 mr-1" />
              {t('chatbot.medicalAssistant', 'Medical Assistant')}
            </div>
            <div className="flex items-center text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('chatbot.aiPowered', 'AI Powered')}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
          <div className="flex h-[500px] sm:h-[600px]">
            {/* Sidebar Toggle for Mobile */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden absolute top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-md border"
              aria-label={t('chatbot.toggleHistory', 'Toggle chat history')}
            >
              {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Chat History Sidebar */}
            <div className={`
              ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
              md:translate-x-0 absolute md:relative z-20 w-64 h-full
              border-r bg-gray-50 p-4 transition-transform duration-300
            `}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">
                  {t('chatbot.chatHistory', 'Chat History')}
                </h3>
                <button
                  onClick={handleNewChat}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label={t('chatbot.newChat', 'Start new chat')}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-2 overflow-y-auto max-h-[calc(100%-120px)]">
                {chatHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {t('chatbot.noHistory', 'No previous chats')}
                  </p>
                ) : (
                  chatHistory.map((chat) => (
                    <button
                      key={chat.session_id}
                      onClick={() => handleLoadChat(chat.session_id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors group ${
                        sessionId === chat.session_id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-white border border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm text-gray-900 truncate flex-1">
                          {chat.title || t('chatbot.untitledChat', 'Chat')}
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(chat.session_id, e)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={t('chatbot.deleteChat', 'Delete chat')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(chat.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              {/* Reminder Box */}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-900 text-sm">
                      {t('chatbot.reminder', 'Important')}
                    </h4>
                    <p className="text-amber-700 text-xs mt-1">
                      {t('chatbot.reminderText', 'This AI provides general information only. Always consult a doctor for medical advice.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay for mobile sidebar */}
            {showSidebar && (
              <div 
                className="md:hidden fixed inset-0 bg-black/50 z-10"
                onClick={() => setShowSidebar(false)}
              />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Error Banner */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                    <button 
                      onClick={() => setError(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Container */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
              >
                {messages.map(renderMessage)}
                
                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[85%]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {t('chatbot.botName', 'MediBot')}
                        </span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="ml-2 text-sm text-gray-500">
                            {t('chatbot.thinking', 'Thinking...')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Replies */}
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.slice(0, 4).map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm transition-colors border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t('chatbot.typeMessage', 'Type your health question...')}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {/* Voice Input */}
                      <button
                        onClick={handleVoiceInput}
                        disabled={isLoading}
                        className={`p-2 rounded-full transition-colors ${
                          isRecording
                            ? 'text-red-600 bg-red-50 animate-pulse'
                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        } disabled:opacity-50`}
                        aria-label={isRecording ? t('chatbot.stopRecording', 'Stop recording') : t('chatbot.startRecording', 'Start voice input')}
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Send Button */}
                  <button
                    onClick={() => sendMessage(inputText)}
                    disabled={!inputText.trim() || isLoading}
                    className={`p-3 rounded-full transition-all flex-shrink-0 ${
                      inputText.trim() && !isLoading
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label={t('chatbot.send', 'Send message')}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-red-600 text-sm">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    {t('chatbot.listening', 'Listening...')}
                  </div>
                )}

                {/* Tips */}
                <p className="mt-2 text-center text-xs text-gray-400">
                  {t('chatbot.tips', 'Ask about symptoms, medicines, or general health advice')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <div className="bg-white p-4 sm:p-6 rounded-xl border">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
              {t('chatbot.feature1', 'Symptom Checker')}
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              {t('chatbot.feature1Desc', 'Describe your symptoms and get possible causes')}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl border">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
              {t('chatbot.feature2', 'Health Tips')}
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              {t('chatbot.feature2Desc', 'Get personalized health and wellness advice')}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl border">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <Volume2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
              {t('chatbot.feature3', 'Voice Support')}
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              {t('chatbot.feature3Desc', 'Speak your questions and listen to responses')}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 mb-1 sm:mb-2 text-sm sm:text-base">
                {t('chatbot.disclaimerTitle', 'Important Medical Disclaimer')}
              </h4>
              <p className="text-amber-800 text-xs sm:text-sm">
                {t('chatbot.disclaimer', 'This AI Health Assistant provides general health information for reference purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. If you think you may have a medical emergency, call your doctor or emergency services immediately.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;