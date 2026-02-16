// src/pages/patient/Chatbot.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Trash2,
  Download,
  Share2,
  RefreshCw,
  Clock,
  Calendar,
  User,
  Bot,
  Stethoscope,
  Pill,
  Heart,
  Activity,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Zap,
  BookOpen,
  Phone,
  Video,
  MapPin,
  ExternalLink,
  Image,
  Paperclip,
  Smile,
  Languages,
  Settings,
  History,
  Star
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { useLanguage } from '../../hooks/useLanguage';
import { chatbotService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Input,
  TextArea,
  Select
} from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_ACTIONS = [
  { id: 'symptoms', icon: Stethoscope, label: 'Check Symptoms', color: 'bg-blue-100 text-blue-600' },
  { id: 'medicines', icon: Pill, label: 'Medicine Info', color: 'bg-green-100 text-green-600' },
  { id: 'appointment', icon: Calendar, label: 'Book Appointment', color: 'bg-purple-100 text-purple-600' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency Help', color: 'bg-red-100 text-red-600' },
  { id: 'health_tips', icon: Lightbulb, label: 'Health Tips', color: 'bg-amber-100 text-amber-600' },
  { id: 'faq', icon: HelpCircle, label: 'FAQs', color: 'bg-cyan-100 text-cyan-600' }
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
  typing: 'typing'
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Chat Header
const ChatHeader = ({ 
  session, 
  onNewChat, 
  onViewHistory, 
  onSettings,
  isConnected 
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{t('chatbot.title')}</h2>
          <p className="text-xs text-gray-500">
            {isConnected ? t('chatbot.online') : t('chatbot.offline')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChat}
          title={t('chatbot.newChat')}
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewHistory}
          title={t('chatbot.history')}
        >
          <History className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettings}
          title={t('common.settings')}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

// Message Bubble
const MessageBubble = ({ 
  message, 
  onQuickReply, 
  onAction,
  onFeedback,
  onCopy,
  onSpeak
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback);

  const isBot = message.sender === 'bot';
  const isUser = message.sender === 'user';

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

  // Typing indicator
  if (message.type === MESSAGE_TYPES.typing) {
    return (
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-md'
            : 'bg-gray-100 text-gray-900 rounded-tl-md'
        }`}>
          {/* Text Content */}
          {message.type === MESSAGE_TYPES.text && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Card Content */}
          {message.type === MESSAGE_TYPES.card && message.card && (
            <div className="space-y-3">
              {message.content && <p>{message.content}</p>}
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                {message.card.image && (
                  <img 
                    src={message.card.image} 
                    alt={message.card.title}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <h4 className="font-semibold text-gray-900">{message.card.title}</h4>
                {message.card.subtitle && (
                  <p className="text-sm text-gray-600">{message.card.subtitle}</p>
                )}
                {message.card.action && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={() => onAction?.(message.card.action)}
                  >
                    {message.card.action.label}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* List Content */}
          {message.type === MESSAGE_TYPES.list && message.list && (
            <div className="space-y-2">
              {message.content && <p className="mb-3">{message.content}</p>}
              {message.list.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 p-2 bg-white rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Content */}
          {message.type === MESSAGE_TYPES.action && message.action && (
            <div className="space-y-3">
              {message.content && <p>{message.content}</p>}
              <div className="flex flex-wrap gap-2">
                {message.action.buttons?.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.variant || 'outline'}
                    size="sm"
                    leftIcon={button.icon && <button.icon className="w-4 h-4" />}
                    onClick={() => onAction?.(button)}
                    className={isUser ? 'border-white/30 text-white hover:bg-white/10' : ''}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Replies */}
        {message.type === MESSAGE_TYPES.quick_replies && message.quick_replies && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.quick_replies.map((reply, index) => (
              <button
                key={index}
                onClick={() => onQuickReply?.(reply)}
                className="px-3 py-1.5 bg-white border border-primary-200 rounded-full text-sm text-primary-600 hover:bg-primary-50 transition-colors"
              >
                {reply.label || reply}
              </button>
            ))}
          </div>
        )}

        {/* Message Actions (for bot messages) */}
        {isBot && message.type !== MESSAGE_TYPES.typing && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={t('common.copy')}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onSpeak?.(message.content)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={t('common.listen')}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => handleFeedback('helpful')}
                className={`p-1 transition-colors ${
                  feedback === 'helpful' 
                    ? 'text-green-500' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={t('chatbot.helpful')}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleFeedback('not_helpful')}
                className={`p-1 transition-colors ${
                  feedback === 'not_helpful' 
                    ? 'text-red-500' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={t('chatbot.notHelpful')}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {formatDistanceToNow(parseISO(message.timestamp), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Timestamp for user messages */}
        {isUser && (
          <p className="text-xs text-gray-400 mt-1 text-right">
            {format(parseISO(message.timestamp), 'h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
};

// Quick Actions Grid
const QuickActionsGrid = ({ onAction }) => {
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        {t('chatbot.quickActions')}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-lg ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs text-gray-700 text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Suggested Questions
const SuggestedQuestions = ({ questions, onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 border-t border-gray-100">
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        {t('chatbot.suggestedQuestions')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

// Chat Input
const ChatInput = ({
  value,
  onChange,
  onSend,
  onVoiceInput,
  isListening,
  isLoading,
  disabled
}) => {
  const { t } = useTranslation();
  const { isSupported: voiceSupported } = useVoice();
  const inputRef = useRef(null);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chatbot.typePlaceholder')}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
            style={{ maxHeight: '120px' }}
          />
          
          {/* Voice Input Button */}
          {voiceSupported && (
            <button
              onClick={onVoiceInput}
              disabled={disabled || isLoading}
              className={`absolute right-3 bottom-3 p-1.5 rounded-full transition-colors ${
                isListening
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Send Button */}
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={!value.trim() || isLoading || disabled}
          className="rounded-full p-3"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Voice Listening Indicator */}
      {isListening && (
        <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {t('chatbot.listening')}
        </div>
      )}
    </div>
  );
};

// Chat History Sidebar
const ChatHistorySidebar = ({ 
  isOpen, 
  onClose, 
  sessions, 
  currentSessionId,
  onSelectSession, 
  onDeleteSession,
  onNewChat 
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600" />
            {t('chatbot.chatHistory')}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onNewChat}
          >
            {t('chatbot.newChat')}
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group p-3 rounded-xl cursor-pointer transition-colors ${
                  session.id === currentSessionId
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => onSelectSession(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {session.title || t('chatbot.untitledChat')}
                    </p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {session.last_message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(session.updated_at, 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={MessageSquare}
              title={t('chatbot.noHistory')}
              description={t('chatbot.noHistoryDesc')}
              compact
            />
          )}
        </div>
      </div>
    </>
  );
};

// Health Tip Card
const HealthTipCard = ({ tip, onDismiss }) => {
  const { t } = useTranslation();

  if (!tip) return null;

  return (
    <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Lightbulb className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-green-900">{t('chatbot.dailyHealthTip')}</h4>
          <p className="text-sm text-green-700 mt-1">{tip.content}</p>
          {tip.source && (
            <p className="text-xs text-green-600 mt-2">— {tip.source}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-green-400 hover:text-green-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Settings Modal
const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const [localSettings, setLocalSettings] = useState({
    voice_enabled: true,
    auto_speak: false,
    language: currentLanguage,
    ...settings
  });

  const handleSave = () => {
    onSave(localSettings);
    if (localSettings.language !== currentLanguage) {
      changeLanguage(localSettings.language);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('chatbot.settings')}
      size="sm"
    >
      <div className="space-y-4">
        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('common.language')}
          </label>
          <Select
            value={localSettings.language}
            onChange={(e) => setLocalSettings({ ...localSettings, language: e.target.value })}
            options={supportedLanguages.map(l => ({
              value: l.code,
              label: l.nativeName
            }))}
          />
        </div>

        {/* Voice Enabled */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">{t('chatbot.voiceInput')}</p>
            <p className="text-sm text-gray-500">{t('chatbot.voiceInputDesc')}</p>
          </div>
          <button
            onClick={() => setLocalSettings({ ...localSettings, voice_enabled: !localSettings.voice_enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localSettings.voice_enabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.voice_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Auto Speak */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">{t('chatbot.autoSpeak')}</p>
            <p className="text-sm text-gray-500">{t('chatbot.autoSpeakDesc')}</p>
          </div>
          <button
            onClick={() => setLocalSettings({ ...localSettings, auto_speak: !localSettings.auto_speak })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localSettings.auto_speak ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.auto_speak ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {t('common.save')}
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
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    clearTranscript,
    speak,
    stopSpeaking
  } = useVoice();

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [healthTip, setHealthTip] = useState(null);
  const [settings, setSettings] = useState({
    voice_enabled: true,
    auto_speak: false
  });

  // UI State
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(prev => prev + ' ' + transcript);
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        // Start new session
        const response = await chatbotService.startSession();
        setSessionId(response.data?.session_id);

        // Get health tip
        const tipResponse = await chatbotService.getDailyTip();
        setHealthTip(tipResponse.data);

        // Get chat history
        const historyResponse = await chatbotService.getSessions();
        setSessions(historyResponse.data || []);

        // Add welcome message
        setMessages([{
          id: 'welcome',
          sender: 'bot',
          type: MESSAGE_TYPES.text,
          content: t('chatbot.welcomeMessage', { name: user?.first_name || 'there' }),
          timestamp: new Date().toISOString()
        }]);

      } catch (err) {
        console.error('Error initializing chatbot:', err);
        
        // Mock welcome message
        setMessages([{
          id: 'welcome',
          sender: 'bot',
          type: MESSAGE_TYPES.text,
          content: `Hello ${user?.first_name || 'there'}! 👋 I'm your health assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }]);

        setHealthTip({
          content: "Drink at least 8 glasses of water daily to stay hydrated and maintain optimal body function.",
          source: "World Health Organization"
        });

        setSessions([
          { id: 1, title: 'Headache remedies', last_message: 'Try applying a cold compress...', updated_at: new Date().toISOString() },
          { id: 2, title: 'Diabetes diet', last_message: 'Focus on low glycemic foods...', updated_at: new Date(Date.now() - 86400000).toISOString() }
        ]);
      }
    };

    initSession();
  }, [user, t]);

  // Handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      type: MESSAGE_TYPES.text,
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    setIsLoading(true);

    // Add typing indicator
    setMessages(prev => [...prev, {
      id: 'typing',
      sender: 'bot',
      type: MESSAGE_TYPES.typing,
      timestamp: new Date().toISOString()
    }]);

    try {
      const response = await chatbotService.sendMessage(sessionId, inputValue.trim());
      
      // Remove typing indicator and add response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        return [...filtered, {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          type: response.data?.type || MESSAGE_TYPES.text,
          content: response.data?.message || response.data?.content,
          quick_replies: response.data?.quick_replies,
          card: response.data?.card,
          list: response.data?.list,
          action: response.data?.action,
          timestamp: new Date().toISOString()
        }];
      });

      // Auto speak if enabled
      if (settings.auto_speak && response.data?.message) {
        speak(response.data.message);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      
      // Remove typing indicator and add error/mock response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        return [...filtered, {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          type: MESSAGE_TYPES.text,
          content: getMockResponse(userMessage.content),
          quick_replies: ['Tell me more', 'Book a doctor', 'Health tips'],
          timestamp: new Date().toISOString()
        }];
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, sessionId, isLoading, settings.auto_speak, speak]);

  // Mock response generator
  const getMockResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('headache') || lowerQuery.includes('head pain')) {
      return "For headaches, I recommend:\n\n1. 💧 Stay hydrated - drink plenty of water\n2. 🛏️ Rest in a quiet, dark room\n3. 💊 Take over-the-counter pain relievers like paracetamol\n4. 🧊 Apply a cold compress to your forehead\n\nIf headaches persist for more than 3 days or are severe, please consult a doctor.";
    }
    if (lowerQuery.includes('fever') || lowerQuery.includes('temperature')) {
      return "For fever management:\n\n1. 🌡️ Monitor your temperature regularly\n2. 💧 Stay hydrated with water and fluids\n3. 🛏️ Get plenty of rest\n4. 💊 Take paracetamol for relief\n\n⚠️ Seek medical help if fever exceeds 103°F (39.4°C) or lasts more than 3 days.";
    }
    if (lowerQuery.includes('cold') || lowerQuery.includes('cough')) {
      return "For cold and cough relief:\n\n1. 🍯 Honey and warm water\n2. 🌿 Steam inhalation\n3. 💧 Stay hydrated\n4. 🛏️ Get adequate rest\n5. 🧂 Gargle with salt water\n\nMost colds resolve within 7-10 days. Consult a doctor if symptoms worsen.";
    }
    if (lowerQuery.includes('appointment') || lowerQuery.includes('doctor')) {
      return "I can help you book an appointment! 📅\n\nYou can:\n• Browse doctors by specialization\n• Check available time slots\n• Book video or audio consultations\n\nWould you like me to help you find a doctor?";
    }
    
    return "Thank you for your question. Based on what you've described, I recommend consulting with a healthcare professional for personalized advice. Would you like me to help you find a doctor or provide some general health information?";
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleQuickAction = (action) => {
    const actionMessages = {
      symptoms: "I want to check my symptoms",
      medicines: "Tell me about my medicines",
      appointment: "Help me book an appointment",
      emergency: "I need emergency help",
      health_tips: "Give me some health tips",
      faq: "Show me frequently asked questions"
    };

    setInputValue(actionMessages[action.id] || '');
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleQuickReply = (reply) => {
    const text = typeof reply === 'string' ? reply : reply.label;
    setInputValue(text);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleAction = (action) => {
    if (action.navigate) {
      navigate(action.navigate);
    } else if (action.url) {
      window.open(action.url, '_blank');
    }
  };

  const handleFeedback = async (messageId, feedback) => {
    try {
      await chatbotService.submitFeedback({
        message_id: messageId,
        feedback
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleCopyMessage = (message) => {
    // Analytics tracking could go here
  };

  const handleSpeakMessage = (content) => {
    speak(content);
  };

  const handleSelectSuggestion = (question) => {
    setInputValue(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleNewChat = async () => {
    try {
      const response = await chatbotService.startSession();
      setSessionId(response.data?.session_id);
      setMessages([{
        id: 'welcome',
        sender: 'bot',
        type: MESSAGE_TYPES.text,
        content: t('chatbot.welcomeMessage', { name: user?.first_name || 'there' }),
        timestamp: new Date().toISOString()
      }]);
      setShowSuggestions(true);
      setShowHistory(false);
    } catch (err) {
      console.error('Error starting new chat:', err);
    }
  };

  const handleSelectSession = async (session) => {
    try {
      const response = await chatbotService.getSessionMessages(session.id);
      setSessionId(session.id);
      setMessages(response.data || []);
      setShowHistory(false);
      setShowSuggestions(false);
    } catch (err) {
      console.error('Error loading session:', err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await chatbotService.endSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    // Save to localStorage or API
  };

  const handleDismissHealthTip = () => {
    setHealthTip(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-gray-50 -m-4 md:-m-6">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-white rounded-none md:rounded-xl md:m-4 overflow-hidden shadow-sm border border-gray-200">
        {/* Header */}
        <ChatHeader
          session={{ id: sessionId }}
          onNewChat={handleNewChat}
          onViewHistory={() => setShowHistory(true)}
          onSettings={() => setShowSettings(true)}
          isConnected={isConnected}
        />

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {/* Health Tip */}
          {healthTip && messages.length <= 1 && (
            <HealthTipCard tip={healthTip} onDismiss={handleDismissHealthTip} />
          )}

          {/* Quick Actions (shown when no messages) */}
          {messages.length <= 1 && showSuggestions && (
            <QuickActionsGrid onAction={handleQuickAction} />
          )}

          {/* Messages */}
          <div className="p-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onQuickReply={handleQuickReply}
                onAction={handleAction}
                onFeedback={handleFeedback}
                onCopy={handleCopyMessage}
                onSpeak={handleSpeakMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (shown when few messages) */}
          {messages.length <= 2 && showSuggestions && (
            <SuggestedQuestions
              questions={SUGGESTED_QUESTIONS}
              onSelect={handleSelectSuggestion}
            />
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onVoiceInput={handleVoiceInput}
          isListening={isListening}
          isLoading={isLoading}
          disabled={!isConnected}
        />
      </div>

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default Chatbot;