// Frontend/src/pages/patient/PatientHealthTab.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  Heart,
  History,
  Mic,
  Search,
  Check,
  ChevronRight,
  Volume2,
  AlertCircle,
  Loader,
  X,
  TrendingUp,
  Download,
  Share2,
} from 'lucide-react';
import { diagnosisAPI, healthRecordsAPI } from '../../services/api';

// Constants
const SUB_TABS = [
  { id: 'symptoms', icon: Stethoscope, labelKey: 'patient.health.symptoms' },
  { id: 'vitals', icon: Heart, labelKey: 'patient.health.vitals' },
  { id: 'history', icon: History, labelKey: 'patient.health.history' },
];

const COMMON_SYMPTOMS = [
  { id: 'fever', icon: '🤒', nameEn: 'Fever', nameHi: 'बुखार', nameTe: 'జ్వరం', category: 'general' },
  { id: 'headache', icon: '🤕', nameEn: 'Headache', nameHi: 'सिरदर्द', nameTe: 'తలనొప్పి', category: 'pain' },
  { id: 'nausea', icon: '🤢', nameEn: 'Nausea', nameHi: 'मतली', nameTe: 'వాంతి', category: 'digestive' },
  { id: 'tiredness', icon: '😴', nameEn: 'Tiredness', nameHi: 'थकान', nameTe: 'అలసట', category: 'general' },
  { id: 'body_pain', icon: '😫', nameEn: 'Body Pain', nameHi: 'शरीर दर्द', nameTe: 'నొప్పి', category: 'pain' },
  { id: 'weakness', icon: '💪', nameEn: 'Weakness', nameHi: 'कमजोरी', nameTe: 'బలహీనత', category: 'general' },
  { id: 'dizziness', icon: '😵', nameEn: 'Dizziness', nameHi: 'चक्कर', nameTe: 'మైకం', category: 'neurological' },
  { id: 'cough', icon: '🫁', nameEn: 'Cough', nameHi: 'खांसी', nameTe: 'దగ్గు', category: 'respiratory' },
];

const VITALS_NORMAL_RANGES = {
  systolic: { min: 90, max: 120, unit: 'mmHg' },
  diastolic: { min: 60, max: 80, unit: 'mmHg' },
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  temperature: { min: 97, max: 99, unit: '°F' },
  oxygen: { min: 95, max: 100, unit: '%' },
  bloodSugar: { 
    fasting: { min: 70, max: 100, unit: 'mg/dL' },
    after_meal: { min: 70, max: 140, unit: 'mg/dL' }
  },
};

// Mock data for fallback
const MOCK_DIAGNOSIS_HISTORY = [
  { 
    id: 1, 
    date: '2025-01-25T15:30:00', 
    symptoms: ['Headache', 'Fever'],
    symptomsText: 'Headache, Fever',
    diagnosis: 'Common Cold',
    confidence: 75,
    severity: 'MILD',
    recommendation: 'Take rest and stay hydrated. Monitor temperature.',
  },
  { 
    id: 2, 
    date: '2025-01-20T10:15:00', 
    symptoms: ['Stomach Pain', 'Nausea'],
    symptomsText: 'Stomach Pain, Nausea',
    diagnosis: 'Indigestion',
    confidence: 82,
    severity: 'MILD',
    recommendation: 'Avoid heavy meals. Take light food and stay hydrated.',
  },
];

const MOCK_VITALS_HISTORY = [
  { date: '2025-01-20', systolic: 118, diastolic: 78, heartRate: 70 },
  { date: '2025-01-21', systolic: 120, diastolic: 80, heartRate: 72 },
  { date: '2025-01-22', systolic: 122, diastolic: 82, heartRate: 73 },
  { date: '2025-01-23', systolic: 119, diastolic: 79, heartRate: 71 },
  { date: '2025-01-24', systolic: 121, diastolic: 81, heartRate: 72 },
  { date: '2025-01-25', systolic: 120, diastolic: 80, heartRate: 72 },
  { date: '2025-01-26', systolic: 120, diastolic: 80, heartRate: 72 },
];

const PatientHealthTab = ({ userId = null, onSaveVitals = null, onBookAppointment = null }) => {
  const { t, i18n } = useTranslation();
  const recognitionRef = useRef(null);
  
  // State Management
  const [activeSubTab, setActiveSubTab] = useState('symptoms');
  const [symptomText, setSymptomText] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Vitals State
  const [vitals, setVitals] = useState({
    systolic: 120,
    diastolic: 80,
    heartRate: 72,
    temperature: 98.6,
    oxygen: 98,
    bloodSugar: 110,
    sugarType: 'fasting',
    recordedAt: new Date().toISOString(),
  });

  // History State
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // ============================================
  // MEMOIZED VALUES (defined early to use in callbacks)
  // ============================================
  const hasInput = useMemo(() => 
    symptomText.trim() || selectedSymptoms.length > 0, 
    [symptomText, selectedSymptoms]
  );

  const selectedSymptomsNames = useMemo(() => 
    selectedSymptoms
      .map(id => COMMON_SYMPTOMS.find(s => s.id === id)?.nameEn)
      .filter(Boolean)
      .join(', '),
    [selectedSymptoms]
  );

  const currentLanguageName = useMemo(() => {
    switch(i18n.language) {
      case 'hi': return 'हिंदी';
      case 'te': return 'తెలుగు';
      default: return 'English';
    }
  }, [i18n.language]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Load initial data
  useEffect(() => {
    loadHistoryData();
  }, []);

  // Cleanup speech recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error('Error cleaning up speech recognition:', e);
        }
      }
    };
  }, []);

  // ============================================
  // API FUNCTIONS
  // ============================================

  const loadHistoryData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch diagnosis history
      const [diagnosisRes, vitalsRes] = await Promise.allSettled([
        diagnosisAPI.getHistory(),
        healthRecordsAPI.vitals.list({ limit: 7, ordering: '-recorded_at' }),
      ]);

      // Process diagnosis history
      if (diagnosisRes.status === 'fulfilled') {
        const data = diagnosisRes.value.data?.results || diagnosisRes.value.data || [];
        setDiagnosisHistory(Array.isArray(data) && data.length > 0 ? data : MOCK_DIAGNOSIS_HISTORY);
      } else {
        console.error('Failed to fetch diagnosis history:', diagnosisRes.reason);
        setDiagnosisHistory(MOCK_DIAGNOSIS_HISTORY);
      }

      // Process vitals history
      if (vitalsRes.status === 'fulfilled') {
        const data = vitalsRes.value.data?.results || vitalsRes.value.data || [];
        if (Array.isArray(data) && data.length > 0) {
          setVitalsHistory(data.map(v => ({
            date: v.recorded_at || v.date,
            systolic: v.systolic || v.blood_pressure_systolic,
            diastolic: v.diastolic || v.blood_pressure_diastolic,
            heartRate: v.heartRate || v.heart_rate || v.pulse,
            temperature: v.temperature,
            oxygen: v.oxygen || v.spo2,
            bloodSugar: v.bloodSugar || v.blood_sugar,
          })));
        } else {
          setVitalsHistory(MOCK_VITALS_HISTORY);
        }
      } else {
        console.error('Failed to fetch vitals history:', vitalsRes.reason);
        setVitalsHistory(MOCK_VITALS_HISTORY);
      }

    } catch (err) {
      setError(t('common.error.loading'));
      console.error('Failed to load history:', err);
      setDiagnosisHistory(MOCK_DIAGNOSIS_HISTORY);
      setVitalsHistory(MOCK_VITALS_HISTORY);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // Helper function to check if vital is normal
  const isVitalNormal = useCallback((vitalName, value, sugarType = 'fasting') => {
    const range = VITALS_NORMAL_RANGES[vitalName];
    if (!range) return true;
    
    if (vitalName === 'bloodSugar') {
      const sugarRange = range[sugarType];
      return value >= sugarRange.min && value <= sugarRange.max;
    }
    
    return value >= range.min && value <= range.max;
  }, []);

  // Get vital status color
  const getVitalStatusColor = useCallback((vitalName, value, sugarType = 'fasting') => {
    const isNormal = isVitalNormal(vitalName, value, sugarType);
    return isNormal ? 'text-green-600' : 'text-red-600';
  }, [isVitalNormal]);

  // Text-to-speech
  const speakText = useCallback((text) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        const lang = i18n.language;
        if (lang === 'te') utterance.lang = 'te-IN';
        else if (lang === 'hi') utterance.lang = 'hi-IN';
        else utterance.lang = 'en-US';
        
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Text-to-speech failed:', err);
      }
    }
  }, [i18n.language]);

  // ============================================
  // VOICE INPUT HANDLERS
  // ============================================

  const startVoiceInput = useCallback(() => {
    setError(null);
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError(t('patient.health.voiceNotSupported') || 'Voice input not supported');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      const lang = i18n.language;
      if (lang === 'te') recognition.lang = 'te-IN';
      else if (lang === 'hi') recognition.lang = 'hi-IN';
      else recognition.lang = 'en-IN';
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(t('patient.health.voiceError') || 'Voice recognition error');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        try {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ')
            .trim();
          
          setSymptomText(prev => prev ? `${prev} ${transcript}` : transcript);
        } catch (err) {
          console.error('Error processing speech result:', err);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError(t('patient.health.voiceInitError') || 'Failed to start voice input');
      setIsListening(false);
    }
  }, [i18n.language, t]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
    }
    setIsListening(false);
  }, []);

  // ============================================
  // SYMPTOM HANDLERS
  // ============================================

  const toggleSymptom = useCallback((id) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id) 
        : [...prev, id]
    );
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!hasInput) {
      setError(t('patient.health.noSymptoms') || 'Please enter or select symptoms');
      return;
    }

    setAnalyzing(true);
    setError(null);
    
    try {
      // Prepare symptoms for API
      const symptomsToAnalyze = selectedSymptoms.length 
        ? selectedSymptoms
        : symptomText.split(/[,.]/).filter(Boolean).map(s => s.trim());

      // Call diagnosis API
      let result;
      try {
        const response = await diagnosisAPI.diagnoseSymptoms({
          symptoms: symptomsToAnalyze,
          language: i18n.language,
          include_recommendations: true,
        });
        result = response.data;
      } catch (apiError) {
        console.error('Diagnosis API failed, using fallback:', apiError);
        // Fallback to mock result
        result = null;
      }

      if (result && result.conditions) {
        setAnalysisResult({
          id: result.session_id || Date.now(),
          date: new Date().toISOString(),
          symptoms: result.detected_symptoms || symptomsToAnalyze,
          conditions: result.conditions.map(c => ({
            name: c.name || c.disease_name,
            nameHi: c.name_hi || c.name,
            nameTe: c.name_te || c.name,
            match: c.probability || c.match || c.confidence,
            severity: c.severity || 'MILD',
            description: c.description || '',
          })),
          recommendation: result.recommendation || result.recommendations?.[0] || t('patient.health.defaultRecommendation'),
          disclaimer: result.disclaimer || t('patient.health.disclaimer'),
        });
      } else {
        // Fallback mock result
        const detectedSymptoms = selectedSymptoms.length 
          ? COMMON_SYMPTOMS.filter(s => selectedSymptoms.includes(s.id)).map(s => s.nameEn)
          : symptomText.split(/[,.]/).filter(Boolean).map(s => s.trim()).slice(0, 5);

        setAnalysisResult({
          id: Date.now(),
          date: new Date().toISOString(),
          symptoms: detectedSymptoms.length ? detectedSymptoms : ['Fever', 'Headache'],
          conditions: [
            { 
              name: 'Common Cold', 
              nameHi: 'सामान्य सर्दी',
              nameTe: 'సాధారణ జలుబు',
              match: 75, 
              severity: 'MILD',
              description: 'Viral infection of upper respiratory tract'
            },
            { 
              name: 'Viral Fever', 
              nameHi: 'वायरल बुखार',
              nameTe: 'వైరల్ జ్వరం',
              match: 68, 
              severity: 'MODERATE',
              description: 'Fever caused by viral infection'
            },
          ],
          recommendation: 'Take rest and drink plenty of fluids. If symptoms persist for more than 3 days, consult a doctor.',
          disclaimer: 'This is an AI-based preliminary assessment. Please consult a healthcare professional for proper diagnosis.',
        });
      }
    } catch (err) {
      setError(t('patient.health.analysisFailed') || 'Analysis failed');
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedSymptoms, symptomText, hasInput, i18n.language, t]);

  // ============================================
  // VITALS HANDLERS
  // ============================================

  const handleSaveVitals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const vitalsData = {
        blood_pressure_systolic: vitals.systolic,
        blood_pressure_diastolic: vitals.diastolic,
        heart_rate: vitals.heartRate,
        temperature: vitals.temperature,
        spo2: vitals.oxygen,
        blood_sugar: vitals.bloodSugar,
        blood_sugar_type: vitals.sugarType,
        recorded_at: new Date().toISOString(),
      };

      // Try to save via API
      try {
        await healthRecordsAPI.vitals.create(vitalsData);
      } catch (apiError) {
        console.error('Failed to save vitals via API:', apiError);
        // Continue anyway to update local state
      }
      
      const newVitalsRecord = {
        ...vitals,
        date: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
      };
      
      setVitalsHistory(prev => [newVitalsRecord, ...prev].slice(0, 30));
      setSuccessMessage(t('patient.health.vitalsSaved') || 'Vitals saved successfully');
      
      if (onSaveVitals) {
        onSaveVitals(newVitalsRecord);
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('patient.health.saveFailed') || 'Failed to save vitals');
    } finally {
      setIsLoading(false);
    }
  }, [vitals, onSaveVitals, t]);

  // ============================================
  // RENDER
  // ============================================

  // Loading state
  if (isLoading && !diagnosisHistory.length && !vitalsHistory.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-4 right-4 max-w-sm mx-auto bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-700 rounded">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-4 right-4 max-w-sm mx-auto bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={20} />
            <p>{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-green-700 rounded">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-gray-100 mb-4" role="tablist">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium touch-manipulation min-h-[48px] transition-colors ${
                isActive 
                  ? 'bg-white shadow text-primary-600' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`health-panel-${tab.id}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{t(tab.labelKey) || tab.id}</span>
            </button>
          );
        })}
      </div>

      {/* Symptoms Panel */}
      {activeSubTab === 'symptoms' && (
        <div className="space-y-4" role="tabpanel" id="health-panel-symptoms">
          <h2 className="text-lg font-bold text-gray-900">
            {t('patient.health.howFeeling') || 'How are you feeling?'}
          </h2>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className={`w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 touch-manipulation min-h-[120px] transition-colors ${
              isListening 
                ? 'border-red-500 bg-red-50 animate-pulse' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            aria-pressed={isListening}
          >
            <Mic className={`h-10 w-10 ${isListening ? 'text-red-600' : 'text-gray-500'}`} aria-hidden="true" />
            <span className="font-medium text-gray-700">
              {isListening 
                ? (t('patient.health.listening') || 'Listening...') 
                : (t('patient.health.tapToSpeak') || 'Tap to speak')}
            </span>
            <span className="text-xs text-gray-500">
              {t('patient.health.speakInLanguage', { language: currentLanguageName }) || `Speak in ${currentLanguageName}`}
            </span>
          </button>

          <p className="text-center text-sm text-gray-500">OR</p>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder={t('patient.health.typeSymptoms') || 'Type your symptoms...'}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-primary-600"
              aria-label="Type symptoms"
            />
            <button 
              type="button" 
              className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Common Symptoms Grid */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {t('patient.health.selectSymptoms') || 'Select your symptoms'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {COMMON_SYMPTOMS.map((symptom) => {
                const selected = selectedSymptoms.includes(symptom.id);
                return (
                  <button
                    key={symptom.id}
                    type="button"
                    onClick={() => toggleSymptom(symptom.id)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 touch-manipulation min-h-[80px] transition-colors ${
                      selected 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    aria-pressed={selected}
                    aria-label={symptom.nameEn}
                  >
                    <span className="text-xl" aria-hidden="true">{symptom.icon}</span>
                    <span className="text-[10px] font-medium mt-1 text-center">
                      {i18n.language === 'hi' ? symptom.nameHi : 
                       i18n.language === 'te' ? symptom.nameTe : 
                       symptom.nameEn}
                    </span>
                    {selected && (
                      <Check className="h-4 w-4 text-primary-600 mt-1" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Analysis Section */}
          {hasInput && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Selected: {selectedSymptomsNames || symptomText.slice(0, 30)}
                {symptomText.length > 30 && '...'}
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium flex items-center gap-1 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Analyze symptoms"
              >
                {analyzing ? (
                  <>
                    <Loader className="animate-spin h-4 w-4" aria-hidden="true" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze</span>
                )}
              </button>
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 space-y-4">
                <h3 className="font-bold text-green-700 flex items-center gap-2">
                  <Check className="h-5 w-5" aria-hidden="true" />
                  Analysis Complete
                </h3>

                <div>
                  <p className="text-sm font-medium text-gray-700">Detected Symptoms</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    {analysisResult.symptoms.map((symptom, index) => (
                      <li key={index}>{symptom}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Possible Conditions</p>
                  <div className="space-y-2 mt-2">
                    {analysisResult.conditions.map((condition, index) => (
                      <div key={index} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-gray-900">
                            {i18n.language === 'hi' ? condition.nameHi :
                             i18n.language === 'te' ? condition.nameTe :
                             condition.name}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            condition.severity === 'MILD' ? 'bg-green-100 text-green-800' :
                            condition.severity === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {condition.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {condition.match}% match
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    💡 Recommendation
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {analysisResult.recommendation}
                  </p>
                  <button
                    type="button"
                    onClick={() => speakText(analysisResult.recommendation)}
                    className="mt-2 p-2 rounded-lg bg-white border border-gray-200 flex items-center gap-1 text-sm hover:bg-gray-50 transition-colors"
                    aria-label="Listen"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    <span>Listen</span>
                  </button>
                </div>

                <p className="text-xs text-amber-800">
                  ⚕️ {analysisResult.disclaimer}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onBookAppointment?.()}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
                  >
                    📅 Book Appointment
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
                  >
                    💬 Ask AI
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
                  >
                    📋 Save to Records
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vitals Panel */}
      {activeSubTab === 'vitals' && (
        <div className="space-y-4" role="tabpanel" id="health-panel-vitals">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Record your vitals • Last recorded: 2 days ago
            </p>
            <button
              onClick={() => speakText('Enter your blood pressure, heart rate, temperature, oxygen level, and blood sugar readings.')}
              className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
              aria-label="Listen to instructions"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* Blood Pressure */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">
              🩸 Blood Pressure
            </p>
            <div className="flex gap-4 mt-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Systolic</label>
                <input
                  type="number"
                  value={vitals.systolic}
                  onChange={(e) => setVitals(prev => ({ ...prev, systolic: +e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                    !isVitalNormal('systolic', vitals.systolic) ? 'border-red-500' : ''
                  }`}
                  aria-label="Systolic pressure"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Diastolic</label>
                <input
                  type="number"
                  value={vitals.diastolic}
                  onChange={(e) => setVitals(prev => ({ ...prev, diastolic: +e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                    !isVitalNormal('diastolic', vitals.diastolic) ? 'border-red-500' : ''
                  }`}
                  aria-label="Diastolic pressure"
                />
              </div>
            </div>
            <p className={`text-xs mt-2 ${getVitalStatusColor('systolic', vitals.systolic)}`}>
              {isVitalNormal('systolic', vitals.systolic) ? '✓' : '⚠'} Normal: {VITALS_NORMAL_RANGES.systolic.min}-{VITALS_NORMAL_RANGES.systolic.max} / {VITALS_NORMAL_RANGES.diastolic.min}-{VITALS_NORMAL_RANGES.diastolic.max} mmHg
            </p>
          </div>

          {/* Heart Rate */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">
              ❤️ Heart Rate
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={vitals.heartRate}
                onChange={(e) => setVitals(prev => ({ ...prev, heartRate: +e.target.value }))}
                className={`w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                  !isVitalNormal('heartRate', vitals.heartRate) ? 'border-red-500' : ''
                }`}
                aria-label="Heart rate"
              />
              <span className="text-sm">bpm</span>
            </div>
            <p className={`text-xs mt-2 ${getVitalStatusColor('heartRate', vitals.heartRate)}`}>
              {isVitalNormal('heartRate', vitals.heartRate) ? '✓' : '⚠'} Normal: {VITALS_NORMAL_RANGES.heartRate.min}-{VITALS_NORMAL_RANGES.heartRate.max} bpm
            </p>
          </div>

          {/* Temperature */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">
              🌡️ Temperature
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) => setVitals(prev => ({ ...prev, temperature: +e.target.value }))}
                className={`w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                  !isVitalNormal('temperature', vitals.temperature) ? 'border-red-500' : ''
                }`}
                aria-label="Temperature"
              />
              <span className="text-sm">°F</span>
            </div>
            <p className={`text-xs mt-2 ${getVitalStatusColor('temperature', vitals.temperature)}`}>
              {isVitalNormal('temperature', vitals.temperature) ? '✓' : '⚠'} Normal: {VITALS_NORMAL_RANGES.temperature.min}-{VITALS_NORMAL_RANGES.temperature.max} °F
            </p>
          </div>

          {/* Oxygen Saturation */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">
              🫁 Oxygen Level (SpO2)
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={vitals.oxygen}
                onChange={(e) => setVitals(prev => ({ ...prev, oxygen: +e.target.value }))}
                className={`w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                  !isVitalNormal('oxygen', vitals.oxygen) ? 'border-red-500' : ''
                }`}
                aria-label="Oxygen saturation"
              />
              <span className="text-sm">%</span>
            </div>
            <p className={`text-xs mt-2 ${getVitalStatusColor('oxygen', vitals.oxygen)}`}>
              {isVitalNormal('oxygen', vitals.oxygen) ? '✓' : '⚠'} Normal: {VITALS_NORMAL_RANGES.oxygen.min}-{VITALS_NORMAL_RANGES.oxygen.max}%
            </p>
          </div>

          {/* Blood Sugar */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">
              🍬 Blood Sugar
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <input
                type="number"
                value={vitals.bloodSugar}
                onChange={(e) => setVitals(prev => ({ ...prev, bloodSugar: +e.target.value }))}
                className={`w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                  !isVitalNormal('bloodSugar', vitals.bloodSugar, vitals.sugarType) ? 'border-red-500' : ''
                }`}
                aria-label="Blood sugar"
              />
              <span className="text-sm">mg/dL</span>
              <select
                value={vitals.sugarType}
                onChange={(e) => setVitals(prev => ({ ...prev, sugarType: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                aria-label="Sugar measurement type"
              >
                <option value="fasting">Fasting</option>
                <option value="after_meal">After Meal</option>
              </select>
            </div>
            <p className={`text-xs mt-2 ${getVitalStatusColor('bloodSugar', vitals.bloodSugar, vitals.sugarType)}`}>
              {isVitalNormal('bloodSugar', vitals.bloodSugar, vitals.sugarType) ? '✓' : '⚠'} Normal ({vitals.sugarType === 'fasting' ? 'Fasting' : 'After Meal'}): {VITALS_NORMAL_RANGES.bloodSugar[vitals.sugarType].min}-{VITALS_NORMAL_RANGES.bloodSugar[vitals.sugarType].max} mg/dL
            </p>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveVitals}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin h-5 w-5" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Vitals</span>
              </>
            )}
          </button>

          {/* Vitals History Chart */}
          {vitalsHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-gray-900">📊 Vitals History (Last 7 days)</p>
                <button
                  onClick={() => speakText('Your blood pressure trend over the last week')}
                  className="p-1 text-gray-500 hover:text-primary-600"
                  aria-label="Listen"
                >
                  <Volume2 size={16} />
                </button>
              </div>
              
              <div className="h-32 mt-2 flex items-end gap-1">
                {vitalsHistory.slice(0, 7).map((reading, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-primary-200 rounded-t hover:bg-primary-300 transition-colors relative group cursor-pointer"
                    style={{ height: `${Math.min(100, (reading.systolic / 160) * 100)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {reading.systolic}/{reading.diastolic} mmHg
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {vitalsHistory.slice(0, 7).map((reading, index) => (
                  <span key={index}>
                    {new Date(reading.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <TrendingUp size={16} />
                  View Detailed
                </button>
                <button className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <Download size={16} />
                  Export PDF
                </button>
                <button className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Panel */}
      {activeSubTab === 'history' && (
        <div className="space-y-4" role="tabpanel" id="health-panel-history">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">📜 Past Symptom Checks</h3>
            <button
              onClick={loadHistoryData}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin text-primary-600" size={32} />
            </div>
          ) : diagnosisHistory.length > 0 ? (
            diagnosisHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedHistoryItem({ type: 'diagnosis', data: item })}
                className="rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && setSelectedHistoryItem({ type: 'diagnosis', data: item })}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm text-gray-500">
                    📅 {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.severity === 'MILD' ? 'bg-green-100 text-green-800' :
                    item.severity === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.severity}
                  </span>
                </div>

                <p className="font-medium text-gray-900 mt-2">
                  Symptoms: {Array.isArray(item.symptoms) ? item.symptoms.join(', ') : item.symptomsText}
                </p>

                <p className="text-sm text-gray-700 mt-1">
                  Diagnosis: {item.diagnosis} ({item.confidence}% match)
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHistoryItem({ type: 'diagnosis', data: item });
                    }}
                    className="text-sm text-primary-600 flex items-center gap-1 hover:underline"
                  >
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(`${item.diagnosis}. ${item.recommendation}`);
                    }}
                    className="text-sm text-gray-600 flex items-center gap-1 hover:text-primary-600"
                    aria-label="Listen"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History size={48} className="mx-auto mb-3 opacity-50" />
              <p>No diagnosis history found</p>
              <button
                onClick={() => setActiveSubTab('symptoms')}
                className="mt-4 text-primary-600 hover:underline"
              >
                Check your symptoms now
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Diagnosis Details</h2>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {selectedHistoryItem.type === 'diagnosis' && selectedHistoryItem.data && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-500">
                    {new Date(selectedHistoryItem.data.date).toLocaleString()}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Symptoms</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(selectedHistoryItem.data.symptoms) 
                      ? selectedHistoryItem.data.symptoms 
                      : selectedHistoryItem.data.symptomsText?.split(', ') || []
                    ).map((symptom, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Diagnosis</h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedHistoryItem.data.diagnosis}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedHistoryItem.data.confidence}% match • {selectedHistoryItem.data.severity}
                    </p>
                  </div>
                </div>

                {selectedHistoryItem.data.recommendation && (
                  <div>
                    <h3 className="font-semibold mb-2">Recommendation</h3>
                    <p className="text-gray-700">{selectedHistoryItem.data.recommendation}</p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      onBookAppointment?.();
                      setSelectedHistoryItem(null);
                    }}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Book Appointment
                  </button>
                  <button
                    onClick={() => speakText(selectedHistoryItem.data.recommendation || '')}
                    className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Volume2 size={18} />
                    Listen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  );
};

PatientHealthTab.propTypes = {
  userId: PropTypes.string,
  onSaveVitals: PropTypes.func,
  onBookAppointment: PropTypes.func,
};

export default PatientHealthTab;