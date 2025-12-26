import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Bot,
  User,
  Paperclip,
  Mic,
  Image,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Download,
  Clock,
  Sparkles,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { chatbotAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: t('chatbot.welcome'),
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    },
    {
      id: 2,
      text: t('chatbot.howCanIHelp'),
      sender: 'bot',
      timestamp: new Date(Date.now() + 1000),
      type: 'text'
    }
  ]);
  const { user } = useAuth();

  useEffect(() => {
    const formatName = (name) => {
      if (!name) return '';
      return name
        .toString()
        .split(/[\s._-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    if (user?.name) {
      setMessages(prev => {
        const copy = [...prev];
        copy[0] = { ...copy[0], text: `${t('chatbot.welcome')}, ${formatName(user.name)}` };
        return copy;
      });
    }
  }, [user, t]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([
    t('chatbot.quick1'),
    t('chatbot.quick2'),
    t('chatbot.quick3'),
    t('chatbot.quick4'),
    t('chatbot.quick5'),
    t('chatbot.quick6')
  ]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage(text);
      
      const botResponse = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        suggestions: response.data.suggestions || []
      };

      setMessages(prev => [...prev, botResponse]);
      
      // Update quick replies based on response
      if (response.data.quickReplies) {
        setQuickReplies(response.data.quickReplies);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response
      const fallbackResponse = {
        id: messages.length + 2,
        text: t('chatbot.fallbackResponse'),
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        suggestions: []
      };

      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply) => {
    sendMessage(reply);
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        sendMessage(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } else {
      alert(t('chatbot.voiceNotSupported'));
    }
  };

  const handleFeedback = (messageId, feedback) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
  };

  const renderMessage = (message) => {
    const isBot = message.sender === 'bot';
    
    return (
      <div
        key={message.id}
        className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
      >
        <div className={`max-w-3xl ${isBot ? 'ml-2' : 'mr-2'}`}>
          <div className="flex items-center mb-1">
            {isBot ? (
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">MediBot</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">You</span>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-green-600" />
                </div>
              </div>
            )}
            <span className="text-xs text-gray-500 ml-2">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <div className={`rounded-2xl p-4 ${
            isBot
              ? 'bg-white border border-gray-200 shadow-sm'
              : 'bg-blue-600 text-white'
          }`}>
            <div className="prose prose-sm max-w-none">
              {message.type === 'text' ? (
                <p className="whitespace-pre-wrap">{message.text}</p>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  {/* For other message types like images, files */}
                </div>
              )}
            </div>

            {isBot && message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-600 mb-2">{t('chatbot.suggestedQuestions')}:</p>
                {message.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(suggestion)}
                    className="block w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {isBot && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFeedback(message.id, 'like')}
                    className={`p-1 rounded ${
                      message.feedback === 'like' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleFeedback(message.id, 'dislike')}
                    className={`p-1 rounded ${
                      message.feedback === 'dislike' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(message.text)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('chatbot.aiPowered')}
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-600 to-teal-600 rounded-full mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('chatbot.title')}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('chatbot.subtitle')}
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="flex items-center text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {t('chatbot.online')}
            </div>
            <div className="flex items-center text-sm text-blue-600">
              <MessageSquare className="h-3 w-3 mr-1" />
              {t('chatbot.medicalAssistant')}
            </div>
            <div className="flex items-center text-sm text-purple-600">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('chatbot.aiPowered')}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
          <div className="flex h-[600px]">
            {/* Chat History Panel */}
            <div className="w-64 border-r bg-gray-50 p-4 hidden md:block">
              <h3 className="font-semibold text-gray-700 mb-4">{t('chatbot.chatHistory')}</h3>
              <div className="space-y-2">
                {[].map((chat, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-3 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {t('chatbot.chat')} {index + 1}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Today
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">{t('chatbot.reminder')}</h4>
                <p className="text-blue-700 text-sm">
                  {t('chatbot.reminderText')}
                </p>
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Messages Container */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {messages.map(renderMessage)}
                
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="ml-2">
                      <div className="flex items-center mb-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">MediBot</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Replies */}
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm transition-colors border border-blue-200"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
                        placeholder={t('chatbot.typeMessage')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      />
                      <div className="absolute right-3 top-3 flex items-center space-x-2">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Image className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleVoiceInput}
                          className={`p-1 ${
                            isRecording
                              ? 'text-red-600 animate-pulse'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => sendMessage(inputText)}
                    disabled={!inputText.trim() || isLoading}
                    className={`p-3 rounded-full ${
                      inputText.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                {/* Tips */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    {t('chatbot.tips')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-xl border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t('chatbot.feature1')}</h3>
            <p className="text-gray-600 text-sm">{t('chatbot.feature1Desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t('chatbot.feature2')}</h3>
            <p className="text-gray-600 text-sm">{t('chatbot.feature2Desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t('chatbot.feature3')}</h3>
            <p className="text-gray-600 text-sm">{t('chatbot.feature3Desc')}</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-yellow-900 mb-2">{t('chatbot.disclaimerTitle')}</h4>
              <p className="text-yellow-800 text-sm">
                {t('chatbot.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;