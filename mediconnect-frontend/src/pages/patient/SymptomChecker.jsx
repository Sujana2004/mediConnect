// src/pages/patient/SymptomChecker.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope,
  Search,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Activity,
  Heart,
  Thermometer,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  Send,
  Loader2,
  Brain,
  Pill,
  Hospital,
  Phone,
  ArrowRight,
  HelpCircle,
  FileText,
  BookOpen,
  Shield,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  WifiOff,
  Sparkles,
  Eye,
  Ear,
  Wind,
  Smile,
  CircleDot,
  Hand,
  Footprints,
  Fingerprint,
  PersonStanding
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { diagnosisService } from '../../services/api';
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
  SearchInput
} from '../../components/common';
import { formatDate } from '../../utils/helpers';
import i18n from '../../i18n';

const isDev = import.meta.env.DEV;

// ============================================================================
// CONSTANTS
// ============================================================================

const BODY_PARTS = [
  { id: 'head', label: 'Head & Face', icon: Brain, emoji: '🧠', gradient: 'from-purple-500 to-violet-600' },
  { id: 'eyes', label: 'Eyes', icon: Eye, emoji: '👁️', gradient: 'from-blue-500 to-cyan-600' },
  { id: 'ears', label: 'Ears', icon: Ear, emoji: '👂', gradient: 'from-amber-500 to-orange-600' },
  { id: 'nose', label: 'Nose', icon: Wind, emoji: '👃', gradient: 'from-teal-500 to-emerald-600' },
  { id: 'throat', label: 'Throat & Mouth', icon: Smile, emoji: '👄', gradient: 'from-pink-500 to-rose-600' },
  { id: 'chest', label: 'Chest', icon: Wind, emoji: '🫁', gradient: 'from-sky-500 to-blue-600' },
  { id: 'heart', label: 'Heart', icon: Heart, emoji: '❤️', gradient: 'from-red-500 to-rose-600' },
  { id: 'stomach', label: 'Stomach', icon: CircleDot, emoji: '🤰', gradient: 'from-yellow-500 to-amber-600' },
  { id: 'back', label: 'Back', icon: Activity, emoji: '🔙', gradient: 'from-indigo-500 to-purple-600' },
  { id: 'arms', label: 'Arms & Hands', icon: Hand, emoji: '💪', gradient: 'from-emerald-500 to-green-600' },
  { id: 'legs', label: 'Legs & Feet', icon: Footprints, emoji: '🦵', gradient: 'from-orange-500 to-red-600' },
  { id: 'skin', label: 'Skin', icon: Fingerprint, emoji: '🖐️', gradient: 'from-fuchsia-500 to-pink-600' },
  { id: 'general', label: 'General', icon: PersonStanding, emoji: '🧍', gradient: 'from-violet-500 to-purple-600' }
];

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild', color: 'from-emerald-400 to-green-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200', description: 'Slightly uncomfortable' },
  { value: 'moderate', label: 'Moderate', color: 'from-amber-400 to-yellow-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200', description: 'Noticeably affecting daily activities' },
  { value: 'severe', label: 'Severe', color: 'from-orange-400 to-red-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200', description: 'Significantly painful or limiting' },
  { value: 'critical', label: 'Critical', color: 'from-red-500 to-rose-600', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200', description: 'Requires immediate attention' }
];

const DURATION_OPTIONS = [
  { value: 'hours', label: 'Few hours', icon: '⏱️' },
  { value: '1day', label: '1 day', icon: '📅' },
  { value: '2-3days', label: '2-3 days', icon: '📆' },
  { value: 'week', label: 'About a week', icon: '🗓️' },
  { value: '2weeks', label: '1-2 weeks', icon: '📋' },
  { value: 'month', label: '2+ weeks', icon: '📊' },
  { value: 'chronic', label: 'Chronic', icon: '🔄' }
];

const FREQUENCY_OPTIONS = [
  { value: 'Constant', label: 'Constant', icon: '🔴', description: 'Always present' },
  { value: 'Intermittent', label: 'Intermittent', icon: '🟡', description: 'Comes and goes' },
  { value: 'Only at certain times', label: 'Certain Times', icon: '🟢', description: 'Specific triggers' },
  { value: 'Getting worse', label: 'Getting Worse', icon: '📈', description: 'Progressively worse' }
];

const STEPS = [
  { id: 'input', label: 'Describe', icon: MessageSquare },
  { id: 'select', label: 'Select', icon: CheckCircle },
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'results', label: 'Results', icon: Stethoscope }
];

// ============================================================================
// ANIMATED BACKGROUND COMPONENT
// ============================================================================

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-fuchsia-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
  </div>
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Progress Steps - Enhanced
const ProgressSteps = ({ currentStep, steps }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="relative mb-8">
      {/* Background Line */}
      <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full mx-8 sm:mx-16" />
      <div 
        className="absolute top-6 left-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full mx-8 sm:mx-16 transition-all duration-500"
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />

      <div className="relative flex items-center justify-between px-4 sm:px-8">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`
                relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                ${isCompleted 
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30' 
                  : isCurrent 
                    ? 'bg-white text-violet-600 ring-4 ring-violet-500 shadow-xl' 
                    : 'bg-gray-100 text-gray-400'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
                )}
              </div>

              <span className={`
                mt-2 text-xs sm:text-sm font-semibold text-center transition-colors
                ${isCompleted || isCurrent ? 'text-violet-700' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Step 1: Text Input for Symptoms - Enhanced
const SymptomInputStep = ({
  description,
  onDescriptionChange,
  onVoiceInput,
  isListening,
  interimTranscript,
  onNext,
  isLoading
}) => {
  const { t } = useTranslation();
  const { isSupported } = useVoice();

  const examplePrompts = [
    t('symptomChecker.example1', 'I have a headache and mild fever since yesterday'),
    t('symptomChecker.example2', 'Stomach pain with nausea after eating'),
    t('symptomChecker.example3', 'Cough and sore throat for 3 days')
  ];

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-violet-100">
      {/* Decorative Header */}
      <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-16 -translate-x-16" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl ring-4 ring-white/20">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {t('symptomChecker.describeSymptoms', 'Describe Your Symptoms')}
          </h2>
          <p className="text-white/80 text-sm sm:text-base max-w-md mx-auto">
            {t('symptomChecker.describeSymptomsDesc', 'Tell us what you are feeling in your own words')}
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Text Area with Voice Button */}
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t('symptomChecker.symptomsPlaceholder', 'e.g., I have had a headache and mild fever since yesterday...')}
            rows={5}
            className={`
              w-full px-5 py-4 pr-14 border-2 rounded-2xl resize-none
              focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500
              transition-all text-gray-900 placeholder-gray-400 font-medium
              ${isListening 
                ? 'border-red-300 bg-red-50/30' 
                : 'border-gray-200 bg-gray-50/50'
              }
            `}
          />
          
          {isSupported && (
            <button
              onClick={onVoiceInput}
              type="button"
              className={`
                absolute right-3 bottom-3 p-3 rounded-2xl transition-all duration-300
                ${isListening
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse'
                  : 'bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600 hover:from-violet-500 hover:to-purple-600 hover:text-white hover:shadow-lg hover:shadow-violet-500/30'
                }
              `}
              aria-label={isListening ? t('common.stopListening', 'Stop listening') : t('common.startListening', 'Start voice input')}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Listening Indicator */}
        {isListening && (
          <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-200 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
              </div>
              <span className="text-red-700 text-sm font-bold">
                {t('symptomChecker.listening', 'Listening...')}
              </span>
              <span className="text-red-500 text-xs font-medium">
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
              <p className="mt-2 text-xs text-red-600/70 italic truncate">
                "{interimTranscript}"
              </p>
            )}
          </div>
        )}

        {/* Example Prompts */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-violet-800">
              {t('symptomChecker.examplePrompts', 'Try these examples:')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => onDescriptionChange(example)}
                className="px-4 py-2 bg-white border-2 border-violet-200 rounded-xl text-sm text-violet-700 font-medium hover:border-violet-400 hover:bg-violet-50 active:scale-95 transition-all shadow-sm"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <button
          onClick={onNext}
          disabled={!description.trim() || isLoading}
          className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('symptomChecker.analyzing', 'Analyzing...')}
            </>
          ) : (
            <>
              {t('common.continue', 'Continue')}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Step 2: Select Symptoms from List - Enhanced
const SymptomSelectStep = ({
  suggestedSymptoms,
  selectedSymptoms,
  onToggleSymptom,
  onAddCustomSymptom,
  searchQuery,
  onSearchChange,
  allSymptoms,
  symptomsLoading,
  onBack,
  onNext
}) => {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('general');

  const filteredSymptoms = useMemo(() => {
    let filtered = allSymptoms;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(query) ||
        s.category?.toLowerCase().includes(query)
      );
    }

    if (selectedBodyPart && selectedBodyPart !== 'general') {
      filtered = filtered.filter(s => s.body_part === selectedBodyPart);
    }

    return filtered;
  }, [searchQuery, allSymptoms, selectedBodyPart]);

  const handleAddCustom = () => {
    if (customSymptom.trim()) {
      onAddCustomSymptom({
        id: `custom_${Date.now()}`,
        code: `custom_${Date.now()}`,
        name: customSymptom,
        body_part: selectedBodyPart,
        is_custom: true
      });
      setCustomSymptom('');
      setShowAddModal(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-violet-100">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl ring-4 ring-white/20">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {t('symptomChecker.selectSymptoms', 'Select Your Symptoms')}
          </h2>
          <p className="text-white/80 text-sm sm:text-base max-w-md mx-auto">
            {t('symptomChecker.selectSymptomsDesc', 'Confirm the symptoms detected and add any missing ones')}
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* AI Suggested Symptoms */}
        {suggestedSymptoms.length > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-violet-800">
                {t('symptomChecker.suggestedSymptoms', 'AI Suggested Symptoms')}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedSymptoms.map((symptom) => {
                const isSelected = selectedSymptoms.some(s => s.id === symptom.id || s.code === symptom.code);
                return (
                  <button
                    key={symptom.id || symptom.code}
                    onClick={() => onToggleSymptom(symptom)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium transition-all active:scale-95
                      ${isSelected
                        ? 'border-violet-500 bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                        : 'border-violet-200 bg-white text-violet-700 hover:border-violet-400 hover:bg-violet-50'
                      }
                    `}
                  >
                    {symptom.name}
                    {isSelected && <CheckCircle className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Symptoms */}
        {selectedSymptoms.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-lg flex items-center justify-center text-xs">
                {selectedSymptoms.length}
              </span>
              {t('symptomChecker.selectedSymptoms', 'Selected Symptoms')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedSymptoms.map((symptom) => (
                <div
                  key={symptom.id || symptom.code}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium shadow-md"
                >
                  <span>{symptom.name}</span>
                  <button
                    onClick={() => onToggleSymptom(symptom)}
                    className="hover:bg-white/20 rounded-lg p-0.5 transition-colors"
                    aria-label={t('common.remove', 'Remove')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Add Custom */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('symptomChecker.searchSymptoms', 'Search symptoms...')}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 rounded-xl font-bold hover:from-violet-200 hover:to-purple-200 active:scale-95 transition-all border-2 border-violet-200"
          >
            <Plus className="w-5 h-5" />
            {t('symptomChecker.addCustom', 'Add Custom')}
          </button>
        </div>

        {/* Browse by Body Part */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-500" />
            {t('symptomChecker.browseByBodyPart', 'Browse by Body Part')}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3">
            {BODY_PARTS.map((part) => {
              const PartIcon = part.icon;
              const isSelected = selectedBodyPart === part.id;
              return (
                <button
                  key={part.id}
                  onClick={() => setSelectedBodyPart(part.id)}
                  className={`
                    group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-95
                    ${isSelected
                      ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all
                    ${isSelected
                      ? `bg-gradient-to-br ${part.gradient} shadow-lg`
                      : 'bg-gray-100 group-hover:bg-violet-100'
                    }
                  `}>
                    <span className="text-xl sm:text-2xl">{part.emoji}</span>
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight ${isSelected ? 'text-violet-700' : 'text-gray-600'}`}>
                    {part.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Symptoms List */}
        <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {symptomsLoading ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600 mb-3" />
                <p className="text-gray-500 font-medium">Loading symptoms...</p>
              </div>
            ) : filteredSymptoms.length > 0 ? (
              filteredSymptoms.map((symptom, index) => {
                const isSelected = selectedSymptoms.some(s => s.id === symptom.code || s.code === symptom.code);
                return (
                  <button
                    key={symptom.code}
                    onClick={() => onToggleSymptom(symptom)}
                    className={`
                      w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-b-0 
                      hover:bg-violet-50 transition-all text-left
                      ${isSelected ? 'bg-violet-50' : ''}
                    `}
                  >
                    <span className={`font-medium ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                      {symptom.name}
                    </span>
                    {isSelected ? (
                      <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                        <Plus className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  {t('symptomChecker.noSymptomsFound', 'No symptoms found')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 active:scale-[0.98] transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('common.back', 'Back')}
        </button>
        <button
          onClick={onNext}
          disabled={selectedSymptoms.length === 0}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {t('common.continue', 'Continue')}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Add Custom Symptom Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span>{t('symptomChecker.addCustomSymptom', 'Add Custom Symptom')}</span>
          </div>
        }
        size="sm"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('symptomChecker.symptomName', 'Symptom Name')}
            </label>
            <input
              type="text"
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              placeholder={t('symptomChecker.enterSymptomName', 'Enter symptom name')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              {t('symptomChecker.bodyPart', 'Body Part')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BODY_PARTS.slice(0, 6).map((part) => (
                <button
                  key={part.id}
                  onClick={() => setSelectedBodyPart(part.id)}
                  className={`
                    flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all
                    ${selectedBodyPart === part.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-violet-300'
                    }
                  `}
                >
                  <span className="text-lg">{part.emoji}</span>
                  <span className="text-xs font-medium text-gray-700 truncate">{part.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleAddCustom}
            disabled={!customSymptom.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600"
          >
            {t('common.add', 'Add')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// Step 3: Add Details - Enhanced
const SymptomDetailsStep = ({
  selectedSymptoms,
  symptomDetails,
  onUpdateDetail,
  additionalInfo,
  onAdditionalInfoChange,
  onBack,
  onSubmit,
  isLoading
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-violet-100">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl ring-4 ring-white/20">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {t('symptomChecker.addDetails', 'Add Details')}
          </h2>
          <p className="text-white/80 text-sm sm:text-base max-w-md mx-auto">
            {t('symptomChecker.addDetailsDesc', 'Help us understand your symptoms better')}
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {selectedSymptoms.map((symptom, idx) => (
          <div key={symptom.code || idx} className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 sm:p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                {idx + 1}
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{symptom.name}</h3>
            </div>

            {/* Severity */}
            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                {t('symptomChecker.severity', 'Severity')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_LEVELS.map((level) => {
                  const isSelected = symptomDetails[symptom.code]?.severity === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => onUpdateDetail(symptom.code, 'severity', level.value)}
                      className={`
                        relative overflow-hidden px-4 py-3 rounded-xl border-2 font-medium transition-all active:scale-95
                        ${isSelected
                          ? `${level.bgColor} ${level.borderColor} ${level.textColor} shadow-md`
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${level.color}`} />
                      )}
                      <span className="text-sm">{level.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                {t('symptomChecker.duration', 'Duration')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DURATION_OPTIONS.slice(0, 4).map((duration) => {
                  const isSelected = symptomDetails[symptom.code]?.duration === duration.value;
                  return (
                    <button
                      key={duration.value}
                      onClick={() => onUpdateDetail(symptom.code, 'duration', duration.value)}
                      className={`
                        flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all active:scale-95
                        ${isSelected
                          ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-md'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                        }
                      `}
                    >
                      <span>{duration.icon}</span>
                      <span className="text-sm truncate">{duration.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                {t('symptomChecker.frequency', 'Frequency')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FREQUENCY_OPTIONS.map((freq) => {
                  const isSelected = symptomDetails[symptom.code]?.frequency === freq.value;
                  return (
                    <button
                      key={freq.value}
                      onClick={() => onUpdateDetail(symptom.code, 'frequency', freq.value)}
                      className={`
                        flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 font-medium transition-all active:scale-95
                        ${isSelected
                          ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-md'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                        }
                      `}
                    >
                      <span className="text-lg">{freq.icon}</span>
                      <span className="text-xs">{freq.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Additional Information */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-500" />
            {t('symptomChecker.additionalInfo', 'Additional Information')}
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e) => onAdditionalInfoChange(e.target.value)}
            placeholder={t('symptomChecker.additionalInfoPlaceholder', 'Any other details like medications, allergies, recent travel...')}
            rows={3}
            className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl resize-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
          />
        </div>

        {/* Medical History Reminder */}
        <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-blue-800">
              {t('symptomChecker.medicalHistoryReminder', 'Include relevant medical history')}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {t('symptomChecker.medicalHistoryReminderDesc', 'Mention any existing conditions, current medications, or allergies for better accuracy.')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 active:scale-[0.98] transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('common.back', 'Back')}
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('symptomChecker.analyzing', 'Analyzing...')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {t('symptomChecker.getResults', 'Get Results')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Step 4: Results - Enhanced
const ResultsStep = ({
  results,
  onConsultDoctor,
  onStartOver,
  onSaveResults,
  isSaving
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getUrgencyConfig = (urgency) => {
    const configs = {
      low: {
        gradient: 'from-emerald-500 to-green-600',
        bg: 'from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        icon: CheckCircle,
        label: t('symptomChecker.urgency.low', 'Low Urgency')
      },
      moderate: {
        gradient: 'from-amber-500 to-yellow-600',
        bg: 'from-amber-50 to-yellow-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: AlertCircle,
        label: t('symptomChecker.urgency.moderate', 'Moderate Urgency')
      },
      high: {
        gradient: 'from-orange-500 to-red-500',
        bg: 'from-orange-50 to-red-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: AlertTriangle,
        label: t('symptomChecker.urgency.high', 'High Urgency')
      },
      emergency: {
        gradient: 'from-red-600 to-rose-700',
        bg: 'from-red-50 to-rose-50',
        border: 'border-red-300',
        text: 'text-red-700',
        icon: AlertTriangle,
        label: t('symptomChecker.urgency.emergency', 'Emergency')
      }
    };
    return configs[urgency] || configs.moderate;
  };

  const urgencyConfig = getUrgencyConfig(results?.urgency);
  const UrgencyIcon = urgencyConfig.icon;

  return (
    <div className="space-y-6">
      {/* Urgency Banner */}
      <div className={`relative overflow-hidden rounded-3xl border-2 ${urgencyConfig.border} bg-gradient-to-br ${urgencyConfig.bg} p-6 sm:p-8`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full -translate-y-20 translate-x-20" />
        
        <div className="relative z-10 flex items-start gap-4 sm:gap-6">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${urgencyConfig.gradient} flex items-center justify-center shadow-xl flex-shrink-0`}>
            <UrgencyIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl sm:text-2xl font-bold ${urgencyConfig.text}`}>{urgencyConfig.label}</h2>
            <p className={`mt-2 ${urgencyConfig.text} opacity-80`}>{results?.urgency_message}</p>
          </div>
        </div>

        {results?.urgency === 'emergency' && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => window.location.href = 'tel:112'}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all"
            >
              <Phone className="w-5 h-5" />
              {t('common.callEmergency', 'Call 112')}
            </button>
            <button
              onClick={() => navigate('/patient/emergency')}
              className="flex items-center gap-2 px-6 py-3 bg-white text-red-700 rounded-xl font-bold border-2 border-red-200 hover:bg-red-50 active:scale-95 transition-all"
            >
              <Hospital className="w-5 h-5" />
              {t('common.findNearbyHospital', 'Find Nearby Hospital')}
            </button>
          </div>
        )}
      </div>

      {/* Possible Conditions */}
      <div className="bg-white rounded-3xl shadow-xl border border-violet-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {t('symptomChecker.possibleConditions', 'Possible Conditions')}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {results?.conditions?.map((condition, index) => (
            <div
              key={index}
              className="relative overflow-hidden border-2 border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-violet-200 transition-all group"
            >
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${
                condition.probability > 70 ? 'from-red-500 to-rose-600' :
                condition.probability > 40 ? 'from-amber-500 to-yellow-600' : 'from-emerald-500 to-green-600'
              }`} />
              
              <div className="pl-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-lg">{condition.name}</h4>
                      <span className={`
                        px-3 py-1 rounded-full text-sm font-bold
                        ${condition.probability > 70 
                          ? 'bg-red-100 text-red-700' 
                          : condition.probability > 40 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }
                      `}>
                        {condition.probability}% {t('common.match', 'match')}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">{condition.description}</p>
                  </div>
                </div>

                {/* Matching Symptoms */}
                {condition.matching_symptoms?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {condition.matching_symptoms.map((symptom, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-violet-100 rounded-full text-xs font-medium text-violet-700"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                )}

                {/* Common Treatments */}
                {condition.common_treatments?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-violet-500" />
                      {t('symptomChecker.commonTreatments', 'Common Treatments')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {condition.common_treatments.map((treatment, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600" />
                          {treatment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mx-6 mb-6 p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-amber-800">
                {t('symptomChecker.disclaimer', 'Important Disclaimer')}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {t('symptomChecker.disclaimerDesc', 'This is an AI-powered preliminary assessment and should not replace professional medical advice. Please consult a doctor for accurate diagnosis.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {results?.recommendations?.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl border border-violet-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              {t('symptomChecker.recommendations', 'Recommendations')}
            </h3>
          </div>

          <div className="p-6 space-y-3">
            {results.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-700 font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialist Recommendation */}
      {results?.recommended_specialist && (
        <div className="bg-white rounded-3xl shadow-xl border border-violet-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              {t('symptomChecker.recommendedSpecialist', 'Recommended Specialist')}
            </h3>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Stethoscope className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {results.recommended_specialist}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('symptomChecker.specialistDesc', 'Recommended based on your symptoms')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/patient/doctors?specialization=${results.recommended_specialist}`)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all"
              >
                {t('symptomChecker.findDoctor', 'Find Doctor')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConsultDoctor}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700 active:scale-[0.98] transition-all"
        >
          <User className="w-5 h-5" />
          {t('symptomChecker.consultDoctor', 'Consult a Doctor')}
        </button>
        <button
          onClick={onSaveResults}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-violet-700 rounded-2xl font-bold border-2 border-violet-200 hover:bg-violet-50 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
          {t('symptomChecker.saveResults', 'Save Results')}
        </button>
        <button
          onClick={onStartOver}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 active:scale-[0.98] transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          {t('symptomChecker.startOver', 'Start Over')}
        </button>
      </div>
    </div>
  );
};

// History Sidebar - Enhanced
const HistorySidebar = ({ history, isLoading, onSelectSession }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-violet-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
          <h3 className="font-bold text-white flex items-center gap-3">
            <Clock className="w-5 h-5" />
            {t('symptomChecker.recentChecks', 'Recent Checks')}
          </h3>
        </div>
        <div className="p-6 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-violet-100 overflow-hidden sticky top-6">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
        <h3 className="font-bold text-white flex items-center gap-3">
          <Clock className="w-5 h-5" />
          {t('symptomChecker.recentChecks', 'Recent Checks')}
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {history.slice(0, 5).map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session)}
            className="w-full text-left p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl hover:from-violet-50 hover:to-purple-50 border border-gray-200 hover:border-violet-300 transition-all group"
          >
            <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-violet-700">
              {session.symptoms?.slice(0, 2).join(', ') || t('symptomChecker.previousCheck', 'Previous check')}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(session.created_at, 'MMM d, yyyy')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SymptomChecker = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    speak
  } = useVoice();

  // ── Online status ──
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Step state ──
  const [currentStep, setCurrentStep] = useState('input');
  const [error, setError] = useState(null);

  // ── Form state ──
  const [description, setDescription] = useState('');
  const [suggestedSymptoms, setSuggestedSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomDetails, setSymptomDetails] = useState({});
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);

  // ── Ref for description to avoid stale closures ──
  const descriptionRef = useRef(description);
  useEffect(() => { descriptionRef.current = description; }, [description]);

  // ── TanStack Query: Fetch all symptoms ──
  const {
    data: symptomsData,
    isLoading: symptomsLoading,
    isError: symptomsError
  } = useQuery({
    queryKey: ['symptoms'],
    queryFn: () => diagnosisService.getSymptoms(),
    staleTime: 1000 * 60 * 10,
    enabled: isOnline
  });

  const allSymptoms = useMemo(() => {
    return symptomsData?.symptoms || symptomsData?.results || symptomsData?.data || symptomsData || [];
  }, [symptomsData]);

  // ── TanStack Query: Fetch history ──
  const {
    data: historyData,
    isLoading: historyLoading
  } = useQuery({
    queryKey: ['diagnosisHistory'],
    queryFn: () => diagnosisService.getHistory(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const history = useMemo(() => {
    return historyData?.data || historyData || [];
  }, [historyData]);

  // ── Mutation: Analyze description (Step 1 → 2) ──
  const analyzeMutation = useMutation({
    mutationFn: (text) => diagnosisService.diagnoseFromText(text),
    onSuccess: (response) => {
      const data = response?.data || response;
      setSuggestedSymptoms(data?.suggested_symptoms || []);
      setCurrentStep('select');
    },
    onError: (err) => {
      if (isDev) console.error('Error analyzing description:', err);
      toast.error(t('symptomChecker.analyzeError', 'Failed to analyze symptoms. Please select manually.'));
      setSuggestedSymptoms([]);
      setCurrentStep('select');
    }
  });

  // ── Mutation: Diagnose from symptoms (Step 3 → 4) ──
  const diagnoseMutation = useMutation({
    mutationFn: (payload) => diagnosisService.diagnoseFromSymptoms(payload),
    onSuccess: (response) => {
      const data = response?.data || response;
      setResults(data);
      setCurrentStep('results');
      speak(t('symptomChecker.resultsReady', 'Your results are ready'));
      queryClient.invalidateQueries({ queryKey: ['diagnosisHistory'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error submitting symptoms:', err);
      toast.error(t('symptomChecker.diagnoseError', 'Failed to get diagnosis results. Please try again.'));
      setError(t('symptomChecker.diagnoseError', 'Failed to get diagnosis results. Please try again.'));
    }
  });

  // ── Mutation: Save results ──
  const saveMutation = useMutation({
    mutationFn: (data) => diagnosisService.submitFeedback(data),
    onSuccess: () => {
      toast.success(t('symptomChecker.resultsSaved', 'Results saved to your health records'));
      speak(t('symptomChecker.resultsSaved', 'Results saved'));
    },
    onError: (err) => {
      if (isDev) console.error('Error saving results:', err);
      toast.error(t('symptomChecker.saveError', 'Failed to save results'));
    }
  });

  // ── Mutation: Load history session ──
  const loadSessionMutation = useMutation({
    mutationFn: (sessionId) => diagnosisService.getSession(sessionId),
    onSuccess: (response) => {
      const data = response?.data || response;
      setResults(data);
      setCurrentStep('results');
    },
    onError: (err) => {
      if (isDev) console.error('Error loading session:', err);
      toast.error(t('symptomChecker.loadSessionError', 'Failed to load previous session'));
    }
  });

  // ═══════════════════════════════════════════════════════════
  // FIX: Voice transcript handler - similar to Chatbot
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setDescription(transcript.trim());
      descriptionRef.current = transcript.trim();
    }
  }, [transcript]);

  // ── Handlers ──
  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setDescription('');
      descriptionRef.current = '';
      clearTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleAnalyzeDescription = useCallback(() => {
    const text = descriptionRef.current.trim();
    if (!text) return;
    setError(null);
    clearTranscript();
    analyzeMutation.mutate(text);
  }, [analyzeMutation, clearTranscript]);

  const handleToggleSymptom = useCallback((symptom) => {
    setSelectedSymptoms(prev => {
      const symptomId = symptom.code || symptom.id;
      const exists = prev.some(s => (s.code || s.id) === symptomId);
      if (exists) {
        return prev.filter(s => (s.code || s.id) !== symptomId);
      }
      return [...prev, { ...symptom, code: symptomId }];
    });
  }, []);

  const handleAddCustomSymptom = useCallback((symptom) => {
    setSelectedSymptoms(prev => [...prev, symptom]);
  }, []);

  const handleUpdateDetail = useCallback((symptomCode, field, value) => {
    setSymptomDetails(prev => ({
      ...prev,
      [symptomCode]: {
        ...prev[symptomCode],
        [field]: value
      }
    }));
  }, []);

  const handleSubmitSymptoms = useCallback(() => {
    setError(null);

    const payload = {
      symptoms: selectedSymptoms.map(s => s.code || s.id),
      language: i18n.language || 'en',
      patient_age: user?.age || undefined,
      patient_gender: user?.gender || undefined
    };

    diagnoseMutation.mutate(payload);
  }, [selectedSymptoms, user, diagnoseMutation]);

  const handleConsultDoctor = useCallback(() => {
    navigate('/patient/doctors', {
      state: {
        symptoms: selectedSymptoms.map(s => s.name),
        diagnosis: results?.conditions?.[0]?.name
      }
    });
  }, [navigate, selectedSymptoms, results]);

  const handleSaveResults = useCallback(() => {
    if (!results) return;

    saveMutation.mutate({
      session_id: results.session_id,
      feedback: 'helpful',  // Backend expects: 'helpful' | 'not_helpful' | 'incorrect'
      comment: `Saved results for symptoms: ${selectedSymptoms.map(s => s.name).join(', ')}`
      // symptoms: selectedSymptoms.map(s => s.name),
      // results: results,
      // is_helpful: true
    });
    console.log('Saving feedback:', feedbackPayload); // Debug

    saveMutation.mutate(feedbackPayload);

  }, [results, selectedSymptoms, saveMutation, t]);

  const handleStartOver = useCallback(() => {
    setCurrentStep('input');
    setDescription('');
    setSuggestedSymptoms([]);
    setSelectedSymptoms([]);
    setSymptomDetails({});
    setAdditionalInfo('');
    setResults(null);
    setError(null);
    descriptionRef.current = '';
    clearTranscript();
  }, [clearTranscript]);

  const handleSelectHistorySession = useCallback((session) => {
    loadSessionMutation.mutate(session.id);
  }, [loadSessionMutation]);

  // ══════════════════════════════════════════
  // RENDER: Offline State
  // ══════════════════════════════════════════
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-500/30">
              <Stethoscope className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">
              {t('symptomChecker.title', 'Symptom Checker')}
            </h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 sm:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center mb-6">
                <WifiOff className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t('common.offline', 'You are offline')}
              </h2>
              <p className="text-gray-500 max-w-sm mb-6">
                {t('symptomChecker.offlineDesc', 'Symptom checker requires an internet connection to analyze your symptoms. Please check your connection.')}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                {t('common.retry', 'Retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER: Main
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 pb-20 md:pb-6 relative">
      <AnimatedBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl shadow-violet-500/30">
              <Stethoscope className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">
            {t('symptomChecker.title', 'Symptom Checker')}
          </h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm sm:text-base">
            {t('symptomChecker.subtitle', 'AI-powered preliminary health assessment')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-red-700 font-medium flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Progress Steps */}
        {currentStep !== 'results' && (
          <ProgressSteps currentStep={currentStep} steps={STEPS} />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {currentStep === 'input' && (
              <SymptomInputStep
                description={description}
                onDescriptionChange={(val) => {
                  setDescription(val);
                  descriptionRef.current = val;
                }}
                onVoiceInput={handleVoiceInput}
                isListening={isListening}
                interimTranscript={interimTranscript}
                onNext={handleAnalyzeDescription}
                isLoading={analyzeMutation.isPending}
              />
            )}

            {currentStep === 'select' && (
              <SymptomSelectStep
                suggestedSymptoms={suggestedSymptoms}
                selectedSymptoms={selectedSymptoms}
                onToggleSymptom={handleToggleSymptom}
                onAddCustomSymptom={handleAddCustomSymptom}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                allSymptoms={allSymptoms}
                symptomsLoading={symptomsLoading}
                onBack={() => setCurrentStep('input')}
                onNext={() => setCurrentStep('details')}
              />
            )}

            {currentStep === 'details' && (
              <SymptomDetailsStep
                selectedSymptoms={selectedSymptoms}
                symptomDetails={symptomDetails}
                onUpdateDetail={handleUpdateDetail}
                additionalInfo={additionalInfo}
                onAdditionalInfoChange={setAdditionalInfo}
                onBack={() => setCurrentStep('select')}
                onSubmit={handleSubmitSymptoms}
                isLoading={diagnoseMutation.isPending}
              />
            )}

            {currentStep === 'results' && (
              <ResultsStep
                results={results}
                onConsultDoctor={handleConsultDoctor}
                onStartOver={handleStartOver}
                onSaveResults={handleSaveResults}
                isSaving={saveMutation.isPending}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <HistorySidebar
              history={history}
              isLoading={historyLoading}
              onSelectSession={handleSelectHistorySession}
            />
          </div>
        </div>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-blob { animation: blob 7s infinite; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default SymptomChecker;