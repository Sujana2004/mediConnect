// src/pages/patient/Chatbot.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Volume2,
  Plus,
  X,
  Trash2,
  Bot,
  Stethoscope,
  Pill,
  Calendar,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Loader2,
  Settings,
  History,
  User,
  Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { useLanguage } from '../../hooks/useLanguage';
import { chatbotService } from '../../services/api';
import {
  Button,
  EmptyState,
  Modal,
  Select
} from '../../components/common';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_ACTIONS = [
  { id: 'symptoms', icon: Stethoscope, label: 'Check Symptoms', gradient: 'from-blue-500 to-cyan-600', emoji: '🩺', ring: 'ring-blue-400/20' },
  { id: 'medicines', icon: Pill, label: 'Medicine Info', gradient: 'from-green-500 to-emerald-600', emoji: '💊', ring: 'ring-green-400/20' },
  { id: 'appointment', icon: Calendar, label: 'Book Appointment', gradient: 'from-purple-500 to-violet-600', emoji: '📅', ring: 'ring-purple-400/20' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency Help', gradient: 'from-red-500 to-rose-600', emoji: '🚨', ring: 'ring-red-400/20' },
  { id: 'health_tips', icon: Lightbulb, label: 'Health Tips', gradient: 'from-amber-500 to-orange-600', emoji: '💡', ring: 'ring-amber-400/20' },
  { id: 'faq', icon: HelpCircle, label: 'FAQs', gradient: 'from-indigo-500 to-blue-600', emoji: '❓', ring: 'ring-indigo-400/20' }
];

const SUGGESTED_QUESTIONS = [
  "What are common symptoms of cold and flu?",
  "How can I manage diabetes at home?",
  "What should I do for a headache?",
  "How much water should I drink daily?",
  "What are the side effects of paracetamol?",
  "How can I improve my sleep quality?"
];

const MESSAGE_TYPES = {
  text: 'text',
  quick_replies: 'quick_replies',
  card: 'card',
  list: 'list',
  image: 'image',
  action: 'action',
  typing: 'typing',
  error: 'error'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const safeParseISO = (dateString) => {
  if (!dateString) return new Date();
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : new Date();
  } catch {
    return new Date();
  }
};

const formatTimestamp = (timestamp) => {
  try {
    return format(safeParseISO(timestamp), 'h:mm a');
  } catch {
    return '';
  }
};

const getRelativeTime = (timestamp) => {
  try {
    return formatDistanceToNow(safeParseISO(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
};

// ============================================================================
// MARKDOWN COMPONENTS
// ============================================================================

const MarkdownComponents = {
  h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="ml-2">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-primary-600 underline hover:text-primary-800">{children}</a>
  ),
  code: ({ children }) => (
    <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary-300 pl-3 italic my-2">{children}</blockquote>
  ),
};

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
    <div className="absolute top-0 left-0 w-72 h-72 bg-primary-500 rounded-full blur-3xl animate-blob" />
    <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500 rounded-full blur-3xl animate-blob animation-delay-2000" />
    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full blur-3xl animate-blob animation-delay-4000" />
  </div>
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/* ── Chat Header ── */
const ChatHeader = ({ onNewChat, onViewHistory, onSettings, isConnected, isLoading }) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-blue-600 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
      </div>
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
      />

      <div className="relative z-10 flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white/30 shadow-lg ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`} />
          </div>
          <div>
            <h2 className="font-black text-white tracking-tight text-sm sm:text-base">
              {t('chatbot.title', 'Health Assistant')}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-300 animate-pulse' : 'bg-gray-300'}`} />
              <p className="text-[10px] sm:text-xs font-medium text-white/70">
                {isLoading
                  ? t('chatbot.thinking', 'Thinking...')
                  : isConnected
                    ? t('chatbot.online', 'Online • Ready to help')
                    : t('chatbot.offline', 'Offline')
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button type="button" onClick={onNewChat} tabIndex={-1}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm rounded-xl sm:rounded-2xl transition-all border border-white/20 active:scale-90"
            title={t('chatbot.newChat', 'New Chat')}>
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button type="button" onClick={onViewHistory} tabIndex={-1}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm rounded-xl sm:rounded-2xl transition-all border border-white/20 active:scale-90"
            title={t('chatbot.history', 'Chat History')}>
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button type="button" onClick={onSettings} tabIndex={-1}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm rounded-xl sm:rounded-2xl transition-all border border-white/20 active:scale-90"
            title={t('common.settings', 'Settings')}>
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-6 rounded-t-[2rem]"
        style={{ background: 'linear-gradient(to bottom, transparent, #fafafa)' }} />
    </div>
  );
};

/* ── Message Bubble ── */
const MessageBubble = ({ message, onQuickReply, onFeedback, onCopy, onSpeak }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isBot = message.sender === 'bot';
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isError = message.type === MESSAGE_TYPES.error;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(message);
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    onFeedback?.(message.id, type);
  };

  if (message.type === MESSAGE_TYPES.typing) {
    return (
      <div className="flex items-start gap-2 sm:gap-3 mb-5 animate-fade-in">
        <div className="relative">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div className="bg-white rounded-3xl rounded-tl-md px-4 sm:px-5 py-3 sm:py-3.5 shadow-md border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || isSystem) {
    return (
      <div className={`flex items-start gap-3 mb-5 justify-center transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="max-w-md mx-auto">
          <div className={`rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 shadow-md border ${
            isError ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isError ? 'bg-red-100' : 'bg-blue-100'}`}>
                <AlertCircle className={`w-5 h-5 ${isError ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
              <p className={`text-sm font-medium ${isError ? 'text-red-800' : 'text-blue-800'}`}>{message.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 sm:gap-3 mb-4 sm:mb-5 transition-all duration-500 ${isUser ? 'flex-row-reverse' : ''} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {isBot && (
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-500/25 ring-2 sm:ring-4 ring-primary-100">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-md flex-shrink-0">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        </div>
      )}

      <div className={`max-w-[82%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative rounded-3xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-lg ${
          isUser
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-md'
            : 'bg-white text-gray-900 rounded-tl-md border border-gray-100'
        }`}>
          {isBot && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-400 to-blue-500 rounded-l-3xl" />}
          {isBot ? (
            <div className="prose prose-sm max-w-none pl-2 sm:pl-3">
              <ReactMarkdown components={MarkdownComponents}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap font-medium text-sm sm:text-base">{message.content}</p>
          )}
        </div>

        {isBot && message.quick_replies?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3 pl-2 sm:pl-3">
            {message.quick_replies.map((reply, index) => {
              const replyText = typeof reply === 'string' ? reply : (reply.text || reply.label || reply);
              return (
                <button key={index} type="button" onClick={() => onQuickReply?.(replyText)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border-2 border-primary-200 rounded-2xl text-xs sm:text-sm font-semibold text-primary-600 hover:bg-primary-50 hover:border-primary-300 active:scale-95 transition-all shadow-sm">
                  {replyText}
                </button>
              );
            })}
          </div>
        )}

        {isBot && (
          <div className="flex items-center gap-1 sm:gap-2 mt-2 sm:mt-3 pl-2 sm:pl-3">
            <button type="button" onClick={handleCopy} tabIndex={-1}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
              title={t('common.copy', 'Copy')}>
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
            <button type="button" onClick={() => onSpeak?.(message.content)} tabIndex={-1}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
              title={t('common.listen', 'Listen')}>
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <div className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-2">
              <button type="button" onClick={() => handleFeedback('helpful')} tabIndex={-1}
                className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-90 ${
                  feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                }`} title={t('chatbot.helpful', 'Helpful')}>
                <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button type="button" onClick={() => handleFeedback('not_helpful')} tabIndex={-1}
                className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-90 ${
                  feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                }`} title={t('chatbot.notHelpful', 'Not Helpful')}>
                <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
            <span className="text-[10px] sm:text-xs text-gray-400 ml-auto font-medium hidden sm:inline">
              {getRelativeTime(message.timestamp)}
            </span>
          </div>
        )}

        {isUser && (
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2 text-right font-medium">
            {formatTimestamp(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
};

/* ── Quick Actions Grid ── */
const QuickActionsGrid = ({ onAction }) => {
  const { t } = useTranslation();
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
        <h3 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide">
          {t('chatbot.quickActions', 'Quick Actions')}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {QUICK_ACTIONS.map((action, index) => (
          <button key={action.id} type="button" onClick={() => onAction(action)} tabIndex={-1}
            className="group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 active:scale-95 overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`} />
            <div className={`relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${action.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg ring-2 sm:ring-4 ${action.ring} group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
              <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
            </div>
            <span className="relative text-[10px] sm:text-xs font-bold text-gray-700 text-center leading-tight group-hover:text-gray-900 transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Suggested Questions ── */
const SuggestedQuestions = ({ questions, onSelect }) => {
  const { t } = useTranslation();
  return (
    <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
        <h3 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide">
          {t('chatbot.suggestedQuestions', 'Suggested Questions')}
        </h3>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {questions.map((question, index) => (
          <button key={index} type="button" onClick={() => onSelect(question)} tabIndex={-1}
            className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-gray-700 hover:text-primary-600 hover:shadow-md active:scale-95 transition-all border border-gray-200 hover:border-primary-200">
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Chat Input ── */
const ChatInput = ({ value, onChange, onSend, onVoiceInput, isListening, isLoading, disabled, interimTranscript }) => {
  const { t } = useTranslation();
  const { isSupported: voiceSupported } = useVoice();
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled && !isLoading && !isListening) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [disabled, isLoading, isListening]);

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleVoiceClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onVoiceInput();
  };

  return (
    <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? t('chatbot.speakNow', 'Speak now...')
                : t('chatbot.typePlaceholder', 'Type your health question...')
            }
            disabled={disabled || isLoading}
            rows={1}
            autoFocus
            className={`w-full px-4 py-3 sm:px-5 sm:py-3.5 pr-12 sm:pr-14 border-2 rounded-3xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 transition-all shadow-sm font-medium text-sm sm:text-base ${
              isListening
                ? 'border-red-300 bg-red-50/30'
                : 'border-gray-200'
            }`}
            style={{ maxHeight: '120px' }}
          />
          {voiceSupported && (
            <button type="button" onClick={handleVoiceClick}
              onMouseDown={(e) => e.preventDefault()} tabIndex={-1}
              disabled={disabled || isLoading}
              className={`absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2 rounded-2xl transition-all ${
                isListening
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse'
                  : 'text-gray-400 hover:text-white hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-600'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>

        <button type="button" onClick={handleSend}
          onMouseDown={(e) => e.preventDefault()} tabIndex={-1}
          disabled={!value.trim() || isLoading || disabled}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-xl shadow-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all flex-shrink-0"
          aria-label="Send message">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {isListening && (
        <div className="mt-2 sm:mt-3 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
            </div>
            <span className="text-red-700 text-xs sm:text-sm font-bold">
              {t('chatbot.listening', 'Listening...')}
            </span>
            <span className="text-red-500 text-[10px] sm:text-xs font-medium">
              {t('chatbot.tapToStop', 'Tap mic to stop')}
            </span>
            <div className="flex gap-0.5 ml-auto">
              {[...Array(5)].map((_, i) => (
                <div key={i}
                  className="w-1 bg-red-400 rounded-full animate-pulse"
                  style={{
                    height: `${12 + Math.random() * 12}px`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '0.5s'
                  }}
                />
              ))}
            </div>
          </div>
          {interimTranscript && (
            <p className="mt-1.5 text-xs text-red-600/70 italic truncate">
              "{interimTranscript}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Delete Confirmation Modal ── */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, sessionTitle }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('chatbot.deleteChat', 'Delete Chat')} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-red-900">{t('chatbot.deleteConfirmTitle', 'Delete this conversation?')}</p>
            <p className="text-sm text-red-700 mt-1">{sessionTitle || t('chatbot.untitledChat', 'Untitled Chat')}</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          {t('chatbot.deleteConfirmDesc', 'This action cannot be undone. All messages will be permanently deleted.')}
        </p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="rounded-2xl">{t('common.cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={onConfirm}
          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-2xl shadow-lg shadow-red-500/25">
          <Trash2 className="w-4 h-4 mr-2" />{t('common.delete', 'Delete')}
        </Button>
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════
   FIX: Chat History Sidebar — responsive for mobile & desktop
   Mobile: Full screen overlay with z-50
   Desktop: Panel within chat container (positioned absolutely within chat)
   ═══════════════════════════════════════════════════════════ */
const ChatHistorySidebar = ({
  isOpen, onClose, sessions, currentSessionId,
  onSelectSession, onDeleteSession, onNewChat, isLoadingSessions
}) => {
  const { t } = useTranslation();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, session: null });

  if (!isOpen) return null;

  const handleDeleteClick = (e, session) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, session });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.session) onDeleteSession(deleteModal.session.id);
    setDeleteModal({ isOpen: false, session: null });
  };

  return (
    <>
      {/* Mobile: Full overlay */}
      <div className="lg:hidden">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
        <div className="fixed inset-y-0 left-0 w-[85vw] max-w-80 bg-white z-50 shadow-2xl flex flex-col animate-slide-in-left">
          <SidebarContent
            t={t}
            onClose={onClose}
            onNewChat={onNewChat}
            sessions={sessions}
            currentSessionId={currentSessionId}
            isLoadingSessions={isLoadingSessions}
            onSelectSession={onSelectSession}
            handleDeleteClick={handleDeleteClick}
            getRelativeTime={getRelativeTime}
          />
        </div>
      </div>

      {/* Desktop: Panel within chat container */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-80 bg-white shadow-2xl z-20 border-r border-gray-200 animate-slide-in-left">
        <SidebarContent
          t={t}
          onClose={onClose}
          onNewChat={onNewChat}
          sessions={sessions}
          currentSessionId={currentSessionId}
          isLoadingSessions={isLoadingSessions}
          onSelectSession={onSelectSession}
          handleDeleteClick={handleDeleteClick}
          getRelativeTime={getRelativeTime}
        />
      </div>

      {/* Desktop: Click outside to close (overlay just for clicking, not blocking) */}
      <div 
        className="hidden lg:block absolute inset-0 z-10" 
        onClick={onClose}
        style={{ left: '320px' }}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, session: null })}
        onConfirm={handleConfirmDelete}
        sessionTitle={deleteModal.session?.title}
      />
    </>
  );
};

/* Extracted sidebar content to avoid duplication */
const SidebarContent = ({
  t, onClose, onNewChat, sessions, currentSessionId,
  isLoadingSessions, onSelectSession, handleDeleteClick, getRelativeTime
}) => (
  <>
    {/* Header */}
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-blue-600 text-white p-4 sm:p-5 flex-shrink-0">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20" />
      </div>
      <div className="relative z-10 flex items-center justify-between">
        <h3 className="font-black text-white flex items-center gap-2.5 text-sm sm:text-base">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <History className="w-4 h-4" />
          </div>
          {t('chatbot.chatHistory', 'Chat History')}
        </h3>
        <button type="button" onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-90">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* New Chat */}
    <div className="p-3 sm:p-4 flex-shrink-0">
      <button type="button" onClick={() => { onNewChat(); onClose(); }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl font-bold hover:from-primary-600 hover:to-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-500/25 text-sm sm:text-base">
        <Plus className="w-5 h-5" />{t('chatbot.newChat', 'New Chat')}
      </button>
    </div>

    {/* Sessions */}
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
      {isLoadingSessions ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : sessions?.length > 0 ? (
        sessions.map((session) => (
          <div key={session.id}
            className={`group relative p-3 sm:p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
              session.id === currentSessionId
                ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-300 shadow-md'
                : 'bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-200 hover:shadow-lg'
            }`}
            onClick={() => { onSelectSession(session); onClose(); }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <p className="font-bold text-gray-900 truncate text-sm">
                    {session.title || t('chatbot.untitledChat', 'New Conversation')}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {session.last_message_preview || session.last_message || 'No messages yet'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                    {getRelativeTime(session.updated_at)}
                  </span>
                  {session.message_count > 0 && (
                    <span className="flex items-center gap-1 text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full font-semibold">
                      <MessageSquare className="w-2.5 h-2.5" />{session.message_count}
                    </span>
                  )}
                </div>
              </div>

              <button type="button"
                onClick={(e) => handleDeleteClick(e, session)}
                className="p-2 rounded-xl transition-all active:scale-90 flex-shrink-0
                  text-red-500 bg-red-50 hover:bg-red-100
                  sm:text-gray-400 sm:bg-transparent sm:opacity-0
                  sm:group-hover:opacity-100 sm:hover:text-red-500 sm:hover:bg-red-50"
                title={t('common.delete', 'Delete')}
                aria-label={`Delete ${session.title || 'conversation'}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />
          </div>
          <p className="text-gray-900 font-bold mb-1 text-sm sm:text-base">{t('chatbot.noHistory', 'No chat history')}</p>
          <p className="text-xs sm:text-sm text-gray-500">{t('chatbot.noHistoryDesc', 'Start a conversation to see history here.')}</p>
        </div>
      )}
    </div>

    {sessions?.length > 0 && (
      <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center font-medium">
          {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}
        </p>
      </div>
    )}
  </>
);

/* ── Health Tip Card ── */
const HealthTipCard = ({ tip, onDismiss }) => {
  const { t } = useTranslation();
  if (!tip) return null;
  return (
    <div className="mx-3 sm:mx-4 mb-4 sm:mb-5 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-4 sm:p-5 text-white shadow-xl shadow-emerald-500/25">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="relative z-10 flex items-start gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-black text-white mb-1 text-sm sm:text-base">
            {tip.title || t('chatbot.dailyHealthTip', 'Daily Health Tip')}
          </h4>
          <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">{tip.content}</p>
        </div>
        <button type="button" onClick={onDismiss}
          className="p-1.5 sm:p-2 text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-all active:scale-90 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ── Settings Modal ── */
const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const [localSettings, setLocalSettings] = useState({
    voice_enabled: true, auto_speak: false, language: currentLanguage, ...settings
  });

  const handleSave = () => {
    onSave(localSettings);
    if (localSettings.language !== currentLanguage) changeLanguage(localSettings.language);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('chatbot.settings', 'Chat Settings')} size="sm">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">{t('common.language', 'Language')}</label>
          <Select value={localSettings.language}
            onChange={(e) => setLocalSettings({ ...localSettings, language: e.target.value })}
            options={supportedLanguages?.map(l => ({ value: l.code, label: l.nativeName || l.name })) || [
              { value: 'en', label: 'English' },
              { value: 'te', label: 'తెలుగు' },
              { value: 'hi', label: 'हिंदी' }
            ]}
            className="rounded-2xl"
          />
        </div>
        {[
          { key: 'voice_enabled', title: t('chatbot.voiceInput', 'Voice Input'), desc: t('chatbot.voiceInputDesc', 'Enable voice input') },
          { key: 'auto_speak', title: t('chatbot.autoSpeak', 'Auto Speak'), desc: t('chatbot.autoSpeakDesc', 'Auto read bot responses') }
        ].map(({ key, title, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200">
            <div>
              <p className="font-bold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
            </div>
            <button type="button"
              onClick={() => setLocalSettings({ ...localSettings, [key]: !localSettings[key] })}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                localSettings[key] ? 'bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-gray-300'
              }`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                localSettings[key] ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="rounded-2xl">{t('common.cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={handleSave}
          className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
          {t('common.save', 'Save')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Chatbot = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    speak
  } = useVoice();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [healthTip, setHealthTip] = useState(null);
  const [settings, setSettings] = useState({ voice_enabled: true, auto_speak: false });

  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const inputValueRef = useRef(inputValue);
  useEffect(() => { inputValueRef.current = inputValue; }, [inputValue]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (transcript && transcript.trim()) {
      setInputValue(transcript.trim());
      inputValueRef.current = transcript.trim();
    }
  }, [transcript]);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      setIsInitializing(true);
      try {
        const sessionResponse = await chatbotService.startSession({ language: currentLanguage });
        const newSessionId = sessionResponse.session?.id || sessionResponse.session_id;
        if (newSessionId) {
          setSessionId(newSessionId);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }

        try {
          const tipResponse = await chatbotService.getDailyHealthTip(currentLanguage);
          if (tipResponse.success && tipResponse.tip) setHealthTip(tipResponse.tip);
        } catch {}

        try {
          const historyResponse = await chatbotService.getSessions();
          setSessions(historyResponse.results || []);
        } catch {}

        setMessages([{
          id: 'welcome', sender: 'bot', type: MESSAGE_TYPES.text,
          content: `Hello ${user?.first_name || 'there'}! 👋\n\nI'm your **Health Assistant**. I can help you with:\n\n- 🩺 **Symptom checking** and health advice\n- 💊 **Medicine information** and reminders\n- 📅 **Appointment booking**\n- 🚨 **Emergency guidance**\n\nHow can I help you today?`,
          timestamp: new Date().toISOString()
        }]);
      } catch (err) {
        console.error('❌ Failed to initialize chatbot:', err);
        setIsConnected(false);
        setMessages([{
          id: 'init_error', sender: 'system', type: MESSAGE_TYPES.error,
          content: t('chatbot.initError', 'Failed to connect. Please check your internet connection and try again.'),
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, [user, t, currentLanguage]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    const messageText = inputValueRef.current.trim();
    if (!messageText || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}`, sender: 'user', type: MESSAGE_TYPES.text,
      content: messageText, timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    inputValueRef.current = '';
    clearTranscript();
    setShowSuggestions(false);
    setIsLoading(true);

    setMessages(prev => [...prev, {
      id: 'typing', sender: 'bot', type: MESSAGE_TYPES.typing, timestamp: new Date().toISOString()
    }]);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const newSessionResponse = await chatbotService.startSession({ language: currentLanguage });
        currentSessionId = newSessionResponse.session?.id || newSessionResponse.session_id;
        if (currentSessionId) setSessionId(currentSessionId);
        else throw new Error('Failed to create session');
      }

      const response = await chatbotService.sendMessage({
        session_id: currentSessionId, message: messageText, language: currentLanguage
      });

      let botContent = '';
      let quickReplies = [];
      if (response.assistant_message?.content) {
        botContent = response.assistant_message.content;
        quickReplies = response.quick_replies || [];
      } else if (response.message) {
        botContent = response.message;
      } else if (response.content) {
        botContent = response.content;
      }

      if (response.session_id && response.session_id !== sessionId) setSessionId(response.session_id);
      if (!botContent) throw new Error('No response content received');

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        return [...filtered, {
          id: `bot_${Date.now()}`, sender: 'bot', type: MESSAGE_TYPES.text,
          content: botContent, quick_replies: quickReplies, timestamp: new Date().toISOString()
        }];
      });

      if (settings.auto_speak && botContent) {
        speak(botContent.replace(/[*#_`~\[\]]/g, ''));
      }
    } catch (err) {
      console.error('❌ Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`, sender: 'system', type: MESSAGE_TYPES.error,
        content: t('chatbot.sendError', 'Sorry, I could not process your request. Please try again.'),
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, settings.auto_speak, speak, currentLanguage, t, clearTranscript]);

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      setInputValue('');
      inputValueRef.current = '';
      clearTranscript();
      startListening();
    }
  };

  const handleQuickAction = (action) => {
    const actionMessages = {
      symptoms: "I want to check my symptoms",
      medicines: "Tell me about medicines",
      appointment: "Help me book an appointment",
      emergency: "I need emergency help",
      health_tips: "Give me some health tips",
      faq: "Show me frequently asked questions"
    };
    const message = actionMessages[action.id];
    if (message) {
      setInputValue(message);
      inputValueRef.current = message;
      setTimeout(() => handleSendMessage(), 50);
    }
  };

  const handleQuickReply = (reply) => {
    const text = typeof reply === 'string' ? reply : (reply.text || reply.label || reply);
    setInputValue(text);
    inputValueRef.current = text;
    setTimeout(() => handleSendMessage(), 50);
  };

  const handleFeedback = async (messageId, feedbackType) => {
    try {
      await chatbotService.submitMessageFeedback({
        message_id: messageId, rating: feedbackType === 'helpful' ? 5 : 1, feedback_text: feedbackType
      });
    } catch (err) {
      console.error('❌ Error submitting feedback:', err);
    }
  };

  const handleCopyMessage = () => console.log('📋 Message copied');

  const handleSpeakMessage = (content) => {
    let detectedLang = 'en';
    if (/[\u0900-\u097F]/.test(content)) detectedLang = 'hi';
    else if (/[\u0C00-\u0C7F]/.test(content)) detectedLang = 'te';
    speak(content, { lang: detectedLang });
  };

  const handleSelectSuggestion = (question) => {
    setInputValue(question);
    inputValueRef.current = question;
    setTimeout(() => handleSendMessage(), 50);
  };

  const handleNewChat = async () => {
    try {
      const response = await chatbotService.startSession({ language: currentLanguage });
      const newSessionId = response.session?.id || response.session_id;
      if (newSessionId) setSessionId(newSessionId);
      setMessages([{
        id: 'welcome', sender: 'bot', type: MESSAGE_TYPES.text,
        content: `Hello ${user?.first_name || 'there'}! 👋\n\nI'm your **Health Assistant**. How can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
      setShowSuggestions(true);
      setShowHistory(false);
    } catch (err) {
      console.error('❌ Error starting new chat:', err);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await chatbotService.getSessions();
      setSessions(response.results || []);
    } catch (err) {
      console.error('❌ Error loading sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleViewHistory = () => { setShowHistory(true); loadSessions(); };

  const handleSelectSession = async (session) => {
    try {
      const response = await chatbotService.getSessionMessages(session.id);
      const messagesData = response.results || response.messages || response || [];
      const transformedMessages = messagesData.map(msg => ({
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        sender: msg.role === 'user' ? 'user' : 'bot',
        type: MESSAGE_TYPES.text, content: msg.content,
        timestamp: msg.created_at || new Date().toISOString()
      }));
      setSessionId(session.id);
      setMessages(transformedMessages.length > 0 ? transformedMessages : [{
        id: 'no_messages', sender: 'system', type: MESSAGE_TYPES.text,
        content: 'No messages in this conversation.', timestamp: new Date().toISOString()
      }]);
      setShowHistory(false);
      setShowSuggestions(false);
    } catch (err) {
      console.error('❌ Error loading session:', err);
    }
  };

  const handleDeleteSession = async (sessionIdToDelete) => {
    try {
      await chatbotService.deleteSession(sessionIdToDelete);
      setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      if (sessionIdToDelete === sessionId) handleNewChat();
    } catch (err) {
      try {
        await chatbotService.endSession(sessionIdToDelete);
        setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      } catch {}
    }
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('chatbot_settings', JSON.stringify(newSettings));
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative mb-5">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-blue-100 rounded-[2rem] animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          </div>
        </div>
        <p className="text-gray-600 font-semibold">{t('chatbot.initializing', 'Initializing chat...')}</p>
        <p className="text-gray-400 text-sm mt-1">Please wait...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 -m-4 md:-m-6 relative overflow-hidden">
      <AnimatedBackground />

      {/* Main chat container with relative positioning for desktop history panel */}
      <div className="relative z-10 flex-1 flex flex-col bg-white rounded-none md:rounded-3xl md:m-4 overflow-hidden shadow-2xl border border-gray-200">
        <ChatHeader
          onNewChat={handleNewChat}
          onViewHistory={handleViewHistory}
          onSettings={() => setShowSettings(true)}
          isConnected={isConnected}
          isLoading={isLoading}
        />

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50/30">
          {healthTip && messages.length <= 1 && (
            <HealthTipCard tip={healthTip} onDismiss={() => setHealthTip(null)} />
          )}
          {messages.length <= 1 && showSuggestions && (
            <QuickActionsGrid onAction={handleQuickAction} />
          )}
          <div className="p-3 sm:p-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message}
                onQuickReply={handleQuickReply} onFeedback={handleFeedback}
                onCopy={handleCopyMessage} onSpeak={handleSpeakMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          {messages.length <= 2 && showSuggestions && (
            <SuggestedQuestions questions={SUGGESTED_QUESTIONS} onSelect={handleSelectSuggestion} />
          )}
        </div>

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onVoiceInput={handleVoiceInput}
          isListening={isListening}
          isLoading={isLoading}
          disabled={!isConnected}
          interimTranscript={interimTranscript}
        />

        {/* Chat History Sidebar - positioned within chat container on desktop */}
        <ChatHistorySidebar
          isOpen={showHistory} onClose={() => setShowHistory(false)}
          sessions={sessions} currentSessionId={sessionId}
          onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession}
          onNewChat={handleNewChat} isLoadingSessions={isLoadingSessions}
        />
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)}
        settings={settings} onSave={handleSaveSettings}
      />

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-blob { animation: blob 7s infinite; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default Chatbot;