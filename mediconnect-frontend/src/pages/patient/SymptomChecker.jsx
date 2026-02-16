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
  WifiOff
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

const isDev = import.meta.env.DEV;

// ============================================================================
// CONSTANTS
// ============================================================================

const BODY_PARTS = [
  { id: 'head', label: 'Head & Face', icon: '🧠' },
  { id: 'eyes', label: 'Eyes', icon: '👁️' },
  { id: 'ears', label: 'Ears', icon: '👂' },
  { id: 'nose', label: 'Nose', icon: '👃' },
  { id: 'throat', label: 'Throat & Mouth', icon: '👄' },
  { id: 'chest', label: 'Chest', icon: '🫁' },
  { id: 'heart', label: 'Heart', icon: '❤️' },
  { id: 'stomach', label: 'Stomach & Abdomen', icon: '🤰' },
  { id: 'back', label: 'Back', icon: '🔙' },
  { id: 'arms', label: 'Arms & Hands', icon: '💪' },
  { id: 'legs', label: 'Legs & Feet', icon: '🦵' },
  { id: 'skin', label: 'Skin', icon: '🖐️' },
  { id: 'general', label: 'General / Whole Body', icon: '🧍' }
];

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild', color: 'bg-green-100 text-green-700', description: 'Slightly uncomfortable' },
  { value: 'moderate', label: 'Moderate', color: 'bg-yellow-100 text-yellow-700', description: 'Noticeably affecting daily activities' },
  { value: 'severe', label: 'Severe', color: 'bg-orange-100 text-orange-700', description: 'Significantly painful or limiting' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700', description: 'Requires immediate attention' }
];

const DURATION_OPTIONS = [
  { value: 'hours', label: 'Few hours' },
  { value: '1day', label: '1 day' },
  { value: '2-3days', label: '2-3 days' },
  { value: 'week', label: 'About a week' },
  { value: '2weeks', label: '1-2 weeks' },
  { value: 'month', label: 'More than 2 weeks' },
  { value: 'chronic', label: 'Chronic (months/years)' }
];

const STEPS = [
  { id: 'input', label: 'Describe Symptoms' },
  { id: 'select', label: 'Select Symptoms' },
  { id: 'details', label: 'Add Details' },
  { id: 'results', label: 'View Results' }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Progress Steps
const ProgressSteps = ({ currentStep, steps }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            index < currentIndex
              ? 'bg-primary-600 text-white'
              : index === currentIndex
              ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {index < currentIndex ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>
          
          <span className={`hidden sm:block ml-2 text-sm font-medium ${
            index <= currentIndex ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {step.label}
          </span>

          {index < steps.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
              index < currentIndex ? 'bg-primary-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

// Step 1: Text Input for Symptoms
const SymptomInputStep = ({
  description,
  onDescriptionChange,
  onVoiceInput,
  isListening,
  onNext,
  isLoading
}) => {
  const { t } = useTranslation();
  const { isSupported } = useVoice();

  return (
    <Card>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t('symptomChecker.describeSymptoms', 'Describe Your Symptoms')}
        </h2>
        <p className="text-gray-500 mt-2">
          {t('symptomChecker.describeSymptomsDesc', 'Tell us what you are feeling in your own words')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <TextArea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t('symptomChecker.symptomsPlaceholder', 'e.g., I have had a headache and mild fever since yesterday...')}
            rows={5}
            className="pr-12"
          />
          
          {isSupported && (
            <button
              onClick={onVoiceInput}
              className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${
                isListening
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
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

        {isListening && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {t('symptomChecker.listening', 'Listening... speak your symptoms')}
          </div>
        )}

        {/* Example Prompts */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('symptomChecker.examplePrompts', 'Try these examples:')}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              t('symptomChecker.example1', 'I have a headache and mild fever since yesterday'),
              t('symptomChecker.example2', 'Stomach pain with nausea after eating'),
              t('symptomChecker.example3', 'Cough and sore throat for 3 days')
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => onDescriptionChange(example)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          rightIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          onClick={onNext}
          disabled={!description.trim() || isLoading}
        >
          {isLoading ? t('symptomChecker.analyzing', 'Analyzing...') : t('common.continue', 'Continue')}
        </Button>
      </div>
    </Card>
  );
};

// Step 2: Select Symptoms from List
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
        name: customSymptom,
        body_part: selectedBodyPart,
        is_custom: true
      });
      setCustomSymptom('');
      setShowAddModal(false);
    }
  };

  return (
    <Card>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t('symptomChecker.selectSymptoms', 'Select Your Symptoms')}
        </h2>
        <p className="text-gray-500 mt-2">
          {t('symptomChecker.selectSymptomsDesc', 'Confirm the symptoms detected and add any missing ones')}
        </p>
      </div>

      {/* Suggested Symptoms */}
      {suggestedSymptoms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-600" />
            {t('symptomChecker.suggestedSymptoms', 'AI Suggested Symptoms')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggestedSymptoms.map((symptom) => (
              <button
                key={symptom.id}
                onClick={() => onToggleSymptom(symptom)}
                className={`px-4 py-2 rounded-full border-2 transition-colors ${
                  selectedSymptoms.some(s => s.id === symptom.id)
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-primary-300 text-gray-700'
                }`}
              >
                {symptom.name}
                {selectedSymptoms.some(s => s.id === symptom.id) && (
                  <CheckCircle className="w-4 h-4 ml-2 inline" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Symptoms */}
      {selectedSymptoms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {t('symptomChecker.selectedSymptoms', 'Selected Symptoms')} ({selectedSymptoms.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedSymptoms.map((symptom) => (
              <div
                key={symptom.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full"
              >
                <span>{symptom.name}</span>
                <button
                  onClick={() => onToggleSymptom(symptom)}
                  className="hover:text-primary-900"
                  aria-label={t('common.remove', 'Remove')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Browse */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={t('symptomChecker.searchSymptoms', 'Search symptoms...')}
            className="flex-1"
          />
          <Button
            variant="outline"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            {t('symptomChecker.addCustom', 'Add Custom')}
          </Button>
        </div>

        {/* Browse by Body Part */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {t('symptomChecker.browseByBodyPart', 'Browse by Body Part')}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {BODY_PARTS.map((part) => (
              <button
                key={part.id}
                onClick={() => setSelectedBodyPart(part.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                  selectedBodyPart === part.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{part.icon}</span>
                <span className="text-xs text-center text-gray-700">{part.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Symptoms List */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
          {symptomsLoading ? (
            <div className="p-8 flex justify-center">
              <Loader size="md" />
            </div>
          ) : filteredSymptoms.length > 0 ? (
            filteredSymptoms.map((symptom) => (
              <button
                key={symptom.id}
                onClick={() => onToggleSymptom(symptom)}
                className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                  selectedSymptoms.some(s => s.id === symptom.id) ? 'bg-primary-50' : ''
                }`}
              >
                <span className="text-gray-900">{symptom.name}</span>
                {selectedSymptoms.some(s => s.id === symptom.id) ? (
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-400" />
                )}
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              {t('symptomChecker.noSymptomsFound', 'No symptoms found')}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          {t('common.back', 'Back')}
        </Button>
        <Button
          variant="primary"
          rightIcon={<ChevronRight className="w-4 h-4" />}
          onClick={onNext}
          disabled={selectedSymptoms.length === 0}
        >
          {t('common.continue', 'Continue')}
        </Button>
      </div>

      {/* Add Custom Symptom Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('symptomChecker.addCustomSymptom', 'Add Custom Symptom')}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label={t('symptomChecker.symptomName', 'Symptom Name')}
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            placeholder={t('symptomChecker.enterSymptomName', 'Enter symptom name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('symptomChecker.bodyPart', 'Body Part')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BODY_PARTS.slice(0, 6).map((part) => (
                <button
                  key={part.id}
                  onClick={() => setSelectedBodyPart(part.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
                    selectedBodyPart === part.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                >
                  <span>{part.icon}</span>
                  <span className="text-sm">{part.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleAddCustom}
            disabled={!customSymptom.trim()}
          >
            {t('common.add', 'Add')}
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

// Step 3: Add Details
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
    <Card>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t('symptomChecker.addDetails', 'Add Details')}
        </h2>
        <p className="text-gray-500 mt-2">
          {t('symptomChecker.addDetailsDesc', 'Help us understand your symptoms better')}
        </p>
      </div>

      <div className="space-y-6">
        {selectedSymptoms.map((symptom) => (
          <div key={symptom.code} className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-4">{symptom.name}</h3>

            {/* Severity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('symptomChecker.severity', 'Severity')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => onUpdateDetail(symptom.code, 'severity', level.value)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                      symptomDetails[symptom.code]?.severity === level.value
                        ? `${level.color} border-current`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('symptomChecker.duration', 'Duration')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DURATION_OPTIONS.slice(0, 4).map((duration) => (
                  <button
                    key={duration.value}
                    onClick={() => onUpdateDetail(symptom.code, 'duration', duration.value)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                      symptomDetails[symptom.code]?.duration === duration.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {duration.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('symptomChecker.frequency', 'Frequency')}
              </label>
              <div className="flex flex-wrap gap-2">
                {['Constant', 'Intermittent', 'Only at certain times', 'Getting worse'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => onUpdateDetail(symptom.code, 'frequency', freq)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                      symptomDetails[symptom.code]?.frequency === freq
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Additional Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('symptomChecker.additionalInfo', 'Additional Information')}
          </label>
          <TextArea
            value={additionalInfo}
            onChange={(e) => onAdditionalInfoChange(e.target.value)}
            placeholder={t('symptomChecker.additionalInfoPlaceholder', 'Any other details like medications, allergies, recent travel...')}
            rows={3}
          />
        </div>

        {/* Medical History Reminder */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">
              {t('symptomChecker.medicalHistoryReminder', 'Include relevant medical history')}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {t('symptomChecker.medicalHistoryReminderDesc', 'Mention any existing conditions, current medications, or allergies for better accuracy.')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          {t('common.back', 'Back')}
        </Button>
        <Button
          variant="primary"
          rightIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          onClick={onSubmit}
          loading={isLoading}
        >
          {isLoading ? t('symptomChecker.analyzing', 'Analyzing...') : t('symptomChecker.getResults', 'Get Results')}
        </Button>
      </div>
    </Card>
  );
};

// Step 4: Results
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
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
        label: t('symptomChecker.urgency.low', 'Low Urgency')
      },
      moderate: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: AlertCircle,
        label: t('symptomChecker.urgency.moderate', 'Moderate Urgency')
      },
      high: {
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: AlertTriangle,
        label: t('symptomChecker.urgency.high', 'High Urgency')
      },
      emergency: {
        color: 'bg-red-100 text-red-700 border-red-200',
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
      <div className={`rounded-xl border-2 p-6 ${urgencyConfig.color}`}>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/50 rounded-full">
            <UrgencyIcon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{urgencyConfig.label}</h2>
            <p className="mt-1">{results?.urgency_message}</p>
          </div>
        </div>

        {results?.urgency === 'emergency' && (
          <div className="mt-4 flex gap-3">
            <Button
              variant="danger"
              leftIcon={<Phone className="w-4 h-4" />}
              onClick={() => window.location.href = 'tel:112'}
            >
              {t('common.callEmergency', 'Call 112')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/patient/emergency')}
              className="bg-white"
            >
              {t('common.findNearbyHospital', 'Find Nearby Hospital')}
            </Button>
          </div>
        )}
      </div>

      {/* Possible Conditions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary-600" />
          {t('symptomChecker.possibleConditions', 'Possible Conditions')}
        </h3>

        <div className="space-y-4">
          {results?.conditions?.map((condition, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-gray-900">{condition.name}</h4>
                    <Badge variant={
                      condition.probability > 70 ? 'danger' :
                      condition.probability > 40 ? 'warning' : 'secondary'
                    }>
                      {condition.probability}% {t('common.match', 'match')}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mt-2">{condition.description}</p>
                </div>
              </div>

              {/* Matching Symptoms */}
              {condition.matching_symptoms?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {condition.matching_symptoms.map((symptom, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              )}

              {/* Common Treatments */}
              {condition.common_treatments?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">
                    {t('symptomChecker.commonTreatments', 'Common Treatments')}
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {condition.common_treatments.map((treatment, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Pill className="w-3 h-3 text-primary-500" />
                        {treatment}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                {t('symptomChecker.disclaimer', 'Important Disclaimer')}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {t('symptomChecker.disclaimerDesc', 'This is an AI-powered preliminary assessment and should not replace professional medical advice. Please consult a doctor for accurate diagnosis.')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      {results?.recommendations?.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-600" />
            {t('symptomChecker.recommendations', 'Recommendations')}
          </h3>

          <div className="space-y-3">
            {results.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="p-1.5 bg-primary-100 rounded-full">
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                </div>
                <p className="text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Specialist Recommendation */}
      {results?.recommended_specialist && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            {t('symptomChecker.recommendedSpecialist', 'Recommended Specialist')}
          </h3>

          <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">
                {results.recommended_specialist}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {t('symptomChecker.specialistDesc', 'We recommend consulting this specialist based on your symptoms')}
              </p>
            </div>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate(`/patient/doctors?specialization=${results.recommended_specialist}`)}
            >
              {t('symptomChecker.findDoctor', 'Find Doctor')}
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          leftIcon={<User className="w-4 h-4" />}
          onClick={onConsultDoctor}
          className="flex-1"
        >
          {t('symptomChecker.consultDoctor', 'Consult a Doctor')}
        </Button>
        <Button
          variant="outline"
          leftIcon={<FileText className="w-4 h-4" />}
          onClick={onSaveResults}
          loading={isSaving}
        >
          {t('symptomChecker.saveResults', 'Save Results')}
        </Button>
        <Button
          variant="ghost"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onStartOver}
        >
          {t('symptomChecker.startOver', 'Start Over')}
        </Button>
      </div>
    </div>
  );
};

// History Sidebar
const HistorySidebar = ({ history, isLoading, onSelectSession }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="lg:sticky lg:top-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          {t('symptomChecker.recentChecks', 'Recent Checks')}
        </h3>
        <div className="flex justify-center py-4">
          <Loader size="sm" />
        </div>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Card className="lg:sticky lg:top-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary-600" />
        {t('symptomChecker.recentChecks', 'Recent Checks')}
      </h3>

      <div className="space-y-3">
        {history.slice(0, 5).map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session)}
            className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <p className="font-medium text-gray-900 text-sm truncate">
              {session.symptoms?.slice(0, 2).join(', ') || t('symptomChecker.previousCheck', 'Previous check')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(session.created_at, 'MMM d, yyyy')}
            </p>
          </button>
        ))}
      </div>
    </Card>
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

  // ── Ref to prevent duplicate voice append ──
  const lastTranscriptRef = useRef('');

  // ── TanStack Query: Fetch all symptoms ──
  const {
    data: symptomsData,
    isLoading: symptomsLoading,
    isError: symptomsError
  } = useQuery({
    queryKey: ['symptoms'],
    queryFn: () => diagnosisService.getSymptoms(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: isOnline
  });

  const allSymptoms = useMemo(() => {
    // Backend returns {success, count, symptoms: [...]}
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
      // Still allow user to proceed to select step manually
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
      // Invalidate history so it refreshes
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

  // ── Voice transcript handler (with duplicate guard) ──
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      setDescription(prev => {
        const separator = prev.trim() ? ' ' : '';
        return prev + separator + transcript;
      });
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // ── Handlers ──
  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleAnalyzeDescription = useCallback(() => {
    if (!description.trim()) return;
    setError(null);
    analyzeMutation.mutate(description);
  }, [description, analyzeMutation]);

  const handleToggleSymptom = useCallback((symptom) => {
    setSelectedSymptoms(prev => {
      const exists = prev.some(s => s.code === symptom.code);
      if (exists) {
        return prev.filter(s => s.code !== symptom.code);
      }
      return [...prev, symptom];
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

    // API expects: {symptoms: ["code1", "code2"], language: "en", patient_age: N, patient_gender: "M"}
    const payload = {
      symptoms: selectedSymptoms.map(s => s.code),
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
      symptoms: selectedSymptoms.map(s => s.name),
      results: results,
      is_helpful: true
    });
  }, [results, selectedSymptoms, saveMutation]);

  const handleStartOver = useCallback(() => {
    setCurrentStep('input');
    setDescription('');
    setSuggestedSymptoms([]);
    setSelectedSymptoms([]);
    setSymptomDetails({});
    setAdditionalInfo('');
    setResults(null);
    setError(null);
    lastTranscriptRef.current = '';
  }, []);

  const handleSelectHistorySession = useCallback((session) => {
    loadSessionMutation.mutate(session.id);
  }, [loadSessionMutation]);

  // ══════════════════════════════════════════
  // RENDER: Offline State
  // ══════════════════════════════════════════
  if (!isOnline) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('symptomChecker.title', 'Symptom Checker')}
          </h1>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={WifiOff}
            title={t('common.offline', 'You are offline')}
            description={t('symptomChecker.offlineDesc', 'Symptom checker requires an internet connection to analyze your symptoms. Please check your connection.')}
            action={
              <Button
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw size={18} />}
              >
                {t('common.retry', 'Retry')}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER: Main
  // ══════════════════════════════════════════
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('symptomChecker.title', 'Symptom Checker')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('symptomChecker.subtitle', 'AI-powered preliminary health assessment')}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            {t('common.dismiss', 'Dismiss')}
          </Button>
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
              onDescriptionChange={setDescription}
              onVoiceInput={handleVoiceInput}
              isListening={isListening}
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
  );
};

export default SymptomChecker;