// src/components/consultation/ChatPanel.jsx
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  X,
  Send,
  Paperclip,
  Image,
  FileText,
  Smile,
  Mic,
  MicOff
} from 'lucide-react';
import { Avatar, Button } from '../common';

/**
 * Chat Message Component
 */
const ChatMessage = memo(({ message, isOwn, showAvatar = true }) => {
  const formattedTime = message.timestamp
    ? format(new Date(message.timestamp), 'HH:mm')
    : '';

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar && (
        <Avatar
          src={message.sender?.avatar}
          name={message.sender?.name || 'User'}
          size="sm"
          className="flex-shrink-0"
        />
      )}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-4 py-2 rounded-2xl
            ${isOwn
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
            }
          `}
        >
          {message.type === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {message.type === 'image' && (
            <img
              src={message.content}
              alt="Shared image"
              className="max-w-full rounded-lg"
            />
          )}
          {message.type === 'file' && (
            <a
              href={message.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm underline"
            >
              <FileText size={16} />
              {message.fileName || 'Download file'}
            </a>
          )}
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formattedTime}
        </p>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

/**
 * ChatPanel Component
 * In-call chat sidebar
 */
const ChatPanel = memo(({
  isOpen = false,
  messages = [],
  currentUserId,
  onClose,
  onSendMessage,
  onSendFile,
  onTyping,
  typingUsers = [],
  className = ''
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  /**
   * Scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /**
   * Focus input when panel opens
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    onTyping?.();
  }, [onTyping]);

  /**
   * Handle send message
   */
  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    onSendMessage?.({
      type: 'text',
      content: trimmedValue,
      timestamp: new Date().toISOString()
    });

    setInputValue('');
  }, [inputValue, onSendMessage]);

  /**
   * Handle key press
   */
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Handle file select
   */
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onSendFile?.(file);
    e.target.value = '';
  }, [onSendFile]);

  /**
   * Handle file button click
   */
  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Toggle voice recording
   */
  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
    // Voice recording logic would go here
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`
        flex flex-col bg-white border-l border-gray-200
        w-full sm:w-80 h-full
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          {t('consultation.chat')}
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">{t('consultation.noMessages')}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={message.id || index}
              message={message}
              isOwn={message.sender?.id === currentUserId}
              showAvatar={
                index === 0 ||
                messages[index - 1]?.sender?.id !== message.sender?.id
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2">
          <p className="text-xs text-gray-500 italic">
            {typingUsers.length === 1
              ? t('consultation.userTyping', { name: typingUsers[0].name })
              : t('consultation.multipleTyping')
            }
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-end gap-2">
          {/* Attachment button */}
          <button
            onClick={handleFileButtonClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 flex-shrink-0"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={t('consultation.typeMessage')}
              rows={1}
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              style={{ maxHeight: '120px' }}
            />
          </div>

          {/* Send/Voice button */}
          {inputValue.trim() ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 flex items-center justify-center text-white flex-shrink-0"
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              onClick={toggleRecording}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }
              `}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';

ChatPanel.propTypes = {
  isOpen: PropTypes.bool,
  messages: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.oneOf(['text', 'image', 'file']),
    content: PropTypes.string,
    fileName: PropTypes.string,
    timestamp: PropTypes.string,
    sender: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      avatar: PropTypes.string
    })
  })),
  currentUserId: PropTypes.string,
  onClose: PropTypes.func,
  onSendMessage: PropTypes.func,
  onSendFile: PropTypes.func,
  onTyping: PropTypes.func,
  typingUsers: PropTypes.array,
  className: PropTypes.string
};

export default ChatPanel;