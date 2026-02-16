import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import {
  Calendar,
  FileText,
  Pill,
  MessageSquare,
  Heart,
  Stethoscope,
  Mic,
  ChevronRight,
  Volume2,
  VolumeX,
  MapPin,
  Bell,
  X,
  Sun,
  Moon,
  CloudSun,
  AlertCircle,
  Loader,
  UserPlus,
  Users,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { appointmentsAPI, medicineAPI, healthRecordsAPI, emergencyAPI, chatbotAPI, patientAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

// Constants
const REMINDER_STATUS = {
  TAKEN: 'taken',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  SKIPPED: 'skipped',
};

const QUICK_ACTIONS = [
  { 
    id: 'symptoms', 
    emoji: '🩺', 
    icon: Stethoscope, 
    labelKey: 'patient.checkSymptoms', 
    subKey: 'patient.checkSymptomsSub', 
    path: '/patient-dashboard', 
    tab: 'health',
    color: 'bg-blue-50 text-blue-600',
  },
  { 
    id: 'chat', 
    emoji: '🤖', 
    icon: MessageSquare, 
    labelKey: 'patient.askAI', 
    subKey: 'patient.askAISub', 
    path: '/patient-dashboard', 
    tab: 'chat',
    color: 'bg-purple-50 text-purple-600',
  },
  { 
    id: 'book', 
    emoji: '📅', 
    icon: Calendar, 
    labelKey: 'patient.bookAppointment', 
    subKey: 'patient.bookAppointmentSub', 
    path: '/patient-dashboard', 
    tab: 'appointments',
    color: 'bg-green-50 text-green-600',
  },
  { 
    id: 'voice', 
    emoji: '🎤', 
    icon: Mic, 
    labelKey: 'patient.voiceAssistant', 
    subKey: 'patient.voiceAssistantSub', 
    path: '/patient-dashboard', 
    tab: 'health',
    color: 'bg-amber-50 text-amber-600',
  },
  { 
    id: 'records', 
    emoji: '📋', 
    icon: FileText, 
    labelKey: 'patient.myRecords', 
    subKey: 'patient.myRecordsSub', 
    path: '/patient-dashboard', 
    tab: 'records',
    color: 'bg-indigo-50 text-indigo-600',
  },
  { 
    id: 'medicines', 
    emoji: '💊', 
    icon: Pill, 
    labelKey: 'patient.medicines', 
    subKey: 'patient.medicinesSub', 
    path: '/medicines',
    color: 'bg-red-50 text-red-600',
  },
];

const FAMILY_MEMBERS_MOCK = [
  { id: 1, name: 'Lakshmi', relation: 'Mother', active: true, avatar: '👵', age: 58 },
  { id: 2, name: 'Raju', relation: 'Father', active: false, avatar: '👴', age: 62 },
  { id: 3, name: 'Arjun', relation: 'Son', active: false, avatar: '👦', age: 10 },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { icon: Sun, key: 'patient.goodMorning', color: 'text-amber-500' };
  if (hour < 17) return { icon: CloudSun, key: 'patient.goodAfternoon', color: 'text-blue-500' };
  return { icon: Moon, key: 'patient.goodEvening', color: 'text-indigo-500' };
};

const formatName = (name) => {
  if (!name) return '';
  return name
    .toString()
    .split(/[\s._-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .split(' ')[0];
};

const PatientHomeTab = ({ onNavigate = null, onSOSTrigger = null }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listen: startListening, stopListening, isListening } = useVoiceCommand({
    onCommand: (command) => {
      const lowerCommand = command.toLowerCase();
      if (lowerCommand.includes('sos') || lowerCommand.includes('emergency')) {
        handleSOS();
      } else if (lowerCommand.includes('appointment')) {
        handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'book'));
      } else if (lowerCommand.includes('medicine') || lowerCommand.includes('reminder')) {
        handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'medicines'));
      } else if (lowerCommand.includes('symptom')) {
        handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'symptoms'));
      } else if (lowerCommand.includes('chat') || lowerCommand.includes('ask')) {
        handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'chat'));
      }
      return true;
    },
    enabled: true,
  });
  const { speak, isSpeaking, stop: stopSpeaking } = useTextToSpeech();
  
  // State Management
  const [reminders, setReminders] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [healthScoreDetails, setHealthScoreDetails] = useState(null);
  const [healthTip, setHealthTip] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [sosData, setSosData] = useState(null);
  const [loading, setLoading] = useState({
    appointments: true,
    reminders: true,
    healthScore: true,
    healthTip: true,
  });
  const [error, setError] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const abortControllerRef = useRef(null);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [i18n.language]);

  // Fetch all data
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    fetchAllData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (isSpeaking) {
        stopSpeaking();
      }
    };
  }, []);


  const fetchAllData = async () => {
    setError(null);
    
    try {
      // Fetch appointments
      try {
        const appRes = await appointmentsAPI.getUpcoming({ limit: 1 });
        setNextAppointment(appRes.data?.[0] || null);
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
      } finally {
        setLoading(prev => ({ ...prev, appointments: false }));
      }

      // Fetch reminders
      try {
        const remindersRes = await medicineAPI.reminders.list({ date: new Date().toISOString().split('T')[0] });
        setReminders(remindersRes.data || []);
      } catch (err) {
        console.error('Failed to fetch reminders:', err);
        // Fallback to mock data if API fails
        setReminders([
          { 
            id: 1, 
            time: '09:00', 
            medicineName: 'Metformin 500mg', 
            instructions: 'After breakfast', 
            status: REMINDER_STATUS.TAKEN,
            dosage: '1 tablet',
          },
          { 
            id: 2, 
            time: '14:00', 
            medicineName: 'Aspirin 75mg', 
            instructions: 'After lunch', 
            status: REMINDER_STATUS.OVERDUE,
            dosage: '1 tablet',
          },
          { 
            id: 3, 
            time: '21:00', 
            medicineName: 'Metformin 500mg', 
            instructions: 'After dinner', 
            status: REMINDER_STATUS.PENDING,
            dosage: '1 tablet',
          },
        ]);
      } finally {
        setLoading(prev => ({ ...prev, reminders: false }));
      }

      // Fetch health score
      try {
        const scoreRes = await healthRecordsAPI.analytics.getScore();
        setHealthScore(scoreRes.data.score || 78);
        setHealthScoreDetails(scoreRes.data.details || {});
      } catch (err) {
        console.error('Failed to fetch health score:', err);
        setHealthScore(78);
      } finally {
        setLoading(prev => ({ ...prev, healthScore: false }));
      }

      // Fetch health tip
      try {
        const tipRes = await chatbotAPI.getDailyHealthTip();
        setHealthTip(tipRes.data);
      } catch (err) {
        console.error('Failed to fetch health tip:', err);
        setHealthTip({
          id: 1,
          title: {
            en: 'Drink 8 glasses of water daily',
            hi: 'रोज 8 गिलास पानी पिएं',
            te: 'రోజూ 8 గ్లాసుల నీళ్లు త్రాగండి',
          },
          description: {
            en: 'Staying hydrated helps your body function better and prevents many health issues.',
            hi: 'हाइड्रेटेड रहना आपके शरीर को बेहतर काम करने में मदद करता है और कई स्वास्थ्य समस्याओं को रोकता है।',
            te: 'హైడ్రేటెడ్ గా ఉండటం మీ శరీరం బాగా పనిచేయడానికి సహాయపడుతుంది మరియు అనేక ఆరోగ్య సమస్యలను నివారిస్తుంది.',
          },
          category: 'hydration',
        });
      } finally {
        setLoading(prev => ({ ...prev, healthTip: false }));
      }

      // Fetch family members
      try {
        const familyRes = await patientAPI.getFamilyMembers();
        setFamilyMembers(familyRes.data || []);
        if (familyRes.data?.length > 0) {
          setSelectedFamilyMember(familyRes.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch family members:', err);
        setFamilyMembers(FAMILY_MEMBERS_MOCK);
        setSelectedFamilyMember(FAMILY_MEMBERS_MOCK[0]);
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(t('common.error.loading'));
        console.error('Error fetching home data:', err);
      }
    }
  };

  const handleVoiceCommand = useCallback((command) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('sos') || lowerCommand.includes('emergency')) {
      handleSOS();
    } else if (lowerCommand.includes('appointment')) {
      handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'book'));
    } else if (lowerCommand.includes('medicine') || lowerCommand.includes('reminder')) {
      handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'medicines'));
    } else if (lowerCommand.includes('symptom')) {
      handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'symptoms'));
    } else if (lowerCommand.includes('chat') || lowerCommand.includes('ask')) {
      handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'chat'));
    }
  }, []);

  const handleQuickAction = useCallback((action) => {
    if (onNavigate) {
      onNavigate(action);
    } else if (action.tab) {
      navigate('/patient-dashboard', { state: { tab: action.tab } });
    } else if (action.path) {
      navigate(action.path);
    }
  }, [navigate, onNavigate]);

  const handleReminderAction = useCallback(async (reminderId, action) => {
    try {
      if (action === 'take') {
        await medicineAPI.reminderLogs.respond(reminderId, 'taken');
        setReminders(prev =>
          prev.map(r =>
            r.id === reminderId ? { ...r, status: REMINDER_STATUS.TAKEN } : r
          )
        );
      } else if (action === 'snooze') {
        await medicineAPI.reminderLogs.respond(reminderId, 'snoozed');
        // Optionally show snooze options
      }
    } catch (err) {
      console.error('Failed to update reminder:', err);
      setError(t('patient.reminderUpdateFailed'));
    }
  }, [t]);

  const handleSOS = useCallback(async () => {
    try {
      setSosActive(true);
      
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const sosResponse = await emergencyAPI.sos.quickTrigger({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        emergency_type: 'medical',
        timestamp: new Date().toISOString(),
      });

      setSosData(sosResponse.data);
      
      if (onSOSTrigger) {
        onSOSTrigger(sosResponse.data);
      }

      // Auto-cancel after 1 hour if not manually cancelled
      setTimeout(() => {
        setSosActive(false);
        setSosData(null);
      }, 3600000);

    } catch (err) {
      console.error('Failed to trigger SOS:', err);
      setError(t('emergency.sosFailed'));
      setSosActive(false);
    }
  }, [onSOSTrigger, t]);

  const handleCancelSOS = useCallback(async () => {
    try {
      if (sosData?.id) {
        await emergencyAPI.sos.cancel(sosData.id, 'User cancelled');
      }
    } catch (err) {
      console.error('Failed to cancel SOS:', err);
    } finally {
      setSosActive(false);
      setSosData(null);
    }
  }, [sosData]);

  const handleSpeakHealthTip = useCallback(() => {
    const tip = healthTip?.title?.[i18n.language] || healthTip?.title?.en;
    const description = healthTip?.description?.[i18n.language] || healthTip?.description?.en;
    if (tip && description) {
      speak(`${tip}. ${description}`);
    }
  }, [healthTip, i18n.language, speak]);

  const handleFamilyMemberSelect = useCallback((member) => {
    setSelectedFamilyMember(member);
    // Could trigger API to switch context
  }, []);

  // Loading state
  const isLoading = Object.values(loading).some(Boolean);

  if (isLoading && !reminders.length && !nextAppointment) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Skeleton Loaders */}
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-100 rounded-lg"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4 text-red-600" />
            </button>
          </div>
          <button
            onClick={fetchAllData}
            className="mt-2 text-sm text-red-700 font-medium hover:underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* SOS Banner */}
      {sosActive && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 animate-pulse">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-800">
                  {t('patient.sosAlertActive')}
                </p>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {t('patient.sosHelpOnWay')}
              </p>
              {sosData?.tracking_id && (
                <p className="text-xs text-red-600 mt-1">
                  {t('emergency.trackingId')}: {sosData.tracking_id}
                </p>
              )}
              <p className="text-xs text-red-600 mt-1">
                📍 {t('patient.locationShared')}: {sosData?.location || 'Getting location...'}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => navigate('/emergency')}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                {t('patient.viewDetails')}
              </button>
              <button
                type="button"
                onClick={handleCancelSOS}
                className="p-1.5 rounded-lg hover:bg-red-100"
                aria-label={t('patient.cancel')}
              >
                <X className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Command Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                isListening ? 'bg-red-100 animate-pulse' : 'bg-gray-100'
              }`}>
                <Mic className={`h-10 w-10 ${isListening ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <h3 className="text-lg font-bold mt-4">
                {isListening ? t('voice.listening') : t('voice.ready')}
              </h3>
              {transcript && (
                <p className="text-sm text-gray-600 mt-2">"{transcript}"</p>
              )}
              <div className="flex gap-2 mt-4">
                {isListening ? (
                  <button
                    onClick={stopListening}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    {t('voice.stop')}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      startListening();
                      setShowVoiceModal(false);
                    }}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    {t('voice.start')}
                  </button>
                )}
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Greeting Card */}
      <div className="rounded-xl bg-gradient-to-br from-primary-50 to-white border border-gray-200 p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${greeting.color} bg-opacity-20`}>
              <GreetingIcon className={`h-6 w-6 ${greeting.color}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {t(greeting.key)}, {formatName(user?.name)}!
              </h2>
              <p className="text-sm text-gray-500">{dateStr}</p>
            </div>
          </div>
          <button
            onClick={() => setShowVoiceModal(true)}
            className="p-2 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
            aria-label={t('voice.commands')}
          >
            <Mic className="h-5 w-5" />
          </button>
        </div>

        {/* Health Score */}
        {healthScore != null && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary-600" />
                <span className="text-sm text-gray-600">{t('patient.healthScore')}:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-primary-600">{healthScore}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  healthScore >= 80 ? 'bg-green-100 text-green-800' :
                  healthScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {healthScore >= 80 ? t('patient.excellent') :
                   healthScore >= 60 ? t('patient.good') :
                   t('patient.needsAttention')}
                </span>
              </div>
            </div>
            {/* Health Score Trend */}
            {healthScoreDetails?.trend && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3" />
                <span>{healthScoreDetails.trend}% {t('patient.fromLastMonth')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Medicine Reminders */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary-600" />
            <span>{t('patient.medicineRemindersToday')}</span>
            {reminders.filter(r => r.status === REMINDER_STATUS.PENDING).length > 0 && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                {reminders.filter(r => r.status === REMINDER_STATUS.PENDING).length}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => navigate('/medicines')}
            className="text-sm text-primary-600 font-medium hover:underline"
          >
            {t('patient.viewAll')}
          </button>
        </div>

        {loading.reminders ? (
          <div className="p-6 flex justify-center">
            <Loader className="animate-spin text-primary-600" size={24} />
          </div>
        ) : reminders.length > 0 ? (
          <div className="divide-y">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${
                      reminder.status === REMINDER_STATUS.OVERDUE ? 'text-red-500' :
                      reminder.status === REMINDER_STATUS.TAKEN ? 'text-green-500' :
                      'text-gray-400'
                    }`} />
                    <p className="font-medium text-gray-900">
                      {reminder.time} - {reminder.medicineName}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {reminder.instructions} • {reminder.dosage}
                  </p>
                  {reminder.status === REMINDER_STATUS.OVERDUE && (
                    <span className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {t('patient.overdue')}
                    </span>
                  )}
                </div>

                {reminder.status === REMINDER_STATUS.TAKEN ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('patient.taken')}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReminderAction(reminder.id, 'take')}
                      className="min-h-[44px] px-4 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      {t('patient.takeNow')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReminderAction(reminder.id, 'snooze')}
                      className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      {t('patient.snooze')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Pill className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">{t('patient.noReminders')}</p>
            <button
              type="button"
              className="mt-3 text-sm text-primary-600 font-medium hover:underline"
            >
              {t('patient.addReminder')}
            </button>
          </div>
        )}
      </div>

      {/* Next Appointment */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            <span>{t('patient.nextAppointment')}</span>
          </h3>
          <button
            type="button"
            onClick={() => handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'book'))}
            className="text-sm text-primary-600 font-medium hover:underline"
          >
            {t('patient.bookNew')}
          </button>
        </div>

        {loading.appointments ? (
          <div className="p-6 flex justify-center">
            <Loader className="animate-spin text-primary-600" size={24} />
          </div>
        ) : nextAppointment ? (
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{nextAppointment.doctorName}</p>
                <p className="text-sm text-gray-500">{nextAppointment.specialization}</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {t('appointments.status.confirmed')}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                📅 {new Date(nextAppointment.date).toLocaleDateString(i18n.language)} • {nextAppointment.time}
              </p>
              {nextAppointment.location && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{nextAppointment.location}</span>
                </p>
              )}
            </div>

            {nextAppointment.tokenNumber && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('patient.token')}</span>
                  <span className="font-bold text-primary-600">#{nextAppointment.tokenNumber}</span>
                </div>
                {nextAppointment.queuePosition && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">{t('patient.queue')}</span>
                    <span className="font-medium">{nextAppointment.queuePosition} {t('patient.patientsAhead')}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReminderAction(nextAppointment.id, 'remind')}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {t('patient.remindMe')}
              </button>
              {nextAppointment.location && (
                <button
                  type="button"
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(nextAppointment.location)}`, '_blank')}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  {t('patient.directions')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-3">{t('patient.noUpcomingAppointment')}</p>
            <button
              type="button"
              onClick={() => handleQuickAction(QUICK_ACTIONS.find(a => a.id === 'book'))}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t('patient.bookNew')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Action Cards */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">{t('patient.quickActions')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-primary-200 transition-all touch-manipulation min-h-[100px] group"
                aria-label={t(action.labelKey)}
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} bg-opacity-20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-5 w-5 ${action.color.replace('bg-', 'text-')}`} />
                </div>
                <span className="text-xs font-medium text-gray-900 text-center leading-tight">
                  {t(action.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Health Tip */}
      {healthTip && (
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span>{t('patient.healthTip')}</span>
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSpeakHealthTip}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={isSpeaking ? t('patient.stop') : t('patient.listen')}
              >
                {isSpeaking ? (
                  <VolumeX className="h-5 w-5 text-gray-600" />
                ) : (
                  <Volume2 className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <button
                type="button"
                onClick={() => fetchAllData()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={t('common.refresh')}
              >
                <Loader className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-gray-900 font-medium">
              {healthTip.title?.[i18n.language] || healthTip.title?.en}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {healthTip.description?.[i18n.language] || healthTip.description?.en}
            </p>
            {healthTip.category && (
              <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {t(`health.categories.${healthTip.category}`)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Family Members */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <span>{t('patient.familyMembers')}</span>
          </h3>
          <button
            type="button"
            className="text-sm text-primary-600 font-medium hover:underline"
            onClick={() => navigate('/family')}
          >
            {t('patient.manage')}
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleFamilyMemberSelect(member)}
                className={`flex-shrink-0 w-20 flex flex-col items-center p-2 rounded-xl border transition-all ${
                  selectedFamilyMember?.id === member.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                  {member.avatar || '👤'}
                </div>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">
                  {member.name}
                </span>
                <span className="text-[10px] text-gray-500 truncate w-full text-center">
                  {member.relation}
                </span>
                {member.active && (
                  <span className="text-[8px] text-green-600 mt-0.5">
                    {t('patient.active')}
                  </span>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() => navigate('/family/add')}
              className="flex-shrink-0 w-20 flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-600 hover:text-primary-600 transition-colors"
            >
              <UserPlus className="h-6 w-6" />
              <span className="text-xs mt-1">{t('patient.add')}</span>
            </button>
          </div>

          {selectedFamilyMember && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {t('patient.currentlyManaging')}: <span className="font-medium text-gray-700">{selectedFamilyMember.name}</span>
                {selectedFamilyMember.age && ` (${selectedFamilyMember.age} ${t('common.years')})`}
              </p>
              <button
                type="button"
                onClick={() => {/* Switch profile logic */}}
                className="mt-2 text-sm text-primary-600 font-medium hover:underline flex items-center gap-1"
              >
                {t('patient.switchProfile')}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom padding for navigation */}
      <div className="h-20" />
    </div>
  );
};

PatientHomeTab.propTypes = {
  onNavigate: PropTypes.func,
  onSOSTrigger: PropTypes.func,
};

export default PatientHomeTab;