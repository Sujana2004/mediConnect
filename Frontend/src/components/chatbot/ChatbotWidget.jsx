import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X, Send, Bot, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ChatbotWidget = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState('120px');
  const [widgetHeight, setWidgetHeight] = useState(600);
  useEffect(() => {
    const computeOffset = () => {
      try {
        const screenH = window.screen?.height || 0;
        const innerH = window.innerHeight || 0;
        const possibleBar = Math.max(0, screenH - innerH);

        // Desired widget height (cap at 600, allow up to 80% of viewport)
        const desiredHeight = Math.min(500, Math.floor(innerH * 0.8));

        // Baseline offsets
        const basePadding = 0.5; // padding above taskbar
        const minTaskbarOffset = Math.max(15, possibleBar + basePadding);
        const minOffset = 120; // prefer at least 120px from bottom to move widget further down

        // Try to ensure widget doesn't reach the top navbar area
        const navbarGap = 72; // leave this much space from top (adjustable)

        // Compute a bottom offset so that top position >= navbarGap
        let offset = Math.max(minOffset, minTaskbarOffset);
        const topPos = innerH - offset - desiredHeight;
        if (topPos < navbarGap) {
          // move widget down (reduce offset) so its top stays below navbarGap
          const computed = innerH - desiredHeight - navbarGap;
          offset = Math.max(minTaskbarOffset, Math.min(offset, Math.max(12, computed)));
        }

        setBottomOffset(`${offset}px`);
        setWidgetHeight(desiredHeight);
      } catch (e) {
          setBottomOffset('120px');
        setWidgetHeight(600);
      }
    };

    computeOffset();
    window.addEventListener('resize', computeOffset);
    return () => window.removeEventListener('resize', computeOffset);
  }, []);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
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

    const welcomeText = user?.name ? `${t('chatbotWidget.welcome')}, ${formatName(user.name)}` : t('chatbotWidget.welcome');
    setMessages([{ id: 1, text: welcomeText, sender: 'bot' }]);
  }, [t, user]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: t('chatbotWidget.response'),
        sender: 'bot'
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const quickReplies = [
    t('chatbotWidget.quick1'),
    t('chatbotWidget.quick2'),
    t('chatbotWidget.quick3'),
    t('chatbotWidget.quick4')
  ];

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl transition-all z-40"
        style={{ bottom: bottomOffset }}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chatbot Widget */}
        {isOpen && (
        <div
          className="fixed right-6 w-96 bg-white rounded-2xl shadow-2xl border z-50 flex flex-col"
          style={{ bottom: bottomOffset, height: `${widgetHeight}px`, maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">MediBot Assistant</h3>
                  <p className="text-sm opacity-90">AI Health Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span>Online • Ready to help</span>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`mb-3 ${msg.sender === 'user' ? 'text-right' : ''}`}
              >
                <div
                  className={`inline-block max-w-xs rounded-lg p-3 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Replies */}
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMessage(reply);
                    sendMessage();
                  }}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 border border-blue-200"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={t('chatbotWidget.typeMessage')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Minimize Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white p-1 rounded-full shadow-md"
          >
            <ChevronUp className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;