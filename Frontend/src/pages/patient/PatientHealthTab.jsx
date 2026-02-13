import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingUp,
  Activity,
  Thermometer,
  Droplets,
  Apple,
} from 'lucide-react';

const SUB_TABS = [
  { id: 'symptoms', icon: Stethoscope, labelKey: 'patient.health.symptoms' },
  { id: 'vitals', icon: Heart, labelKey: 'patient.health.vitals' },
  { id: 'history', icon: History, labelKey: 'patient.health.history' },
];

const COMMON_SYMPTOMS = [
  { id: 'fever', icon: '🤒', nameEn: 'Fever', nameTe: 'జ్వరం' },
  { id: 'headache', icon: '🤕', nameEn: 'Headache', nameTe: 'తలనొప్పి' },
  { id: 'nausea', icon: '🤢', nameEn: 'Nausea', nameTe: 'వాంతి' },
  { id: 'tiredness', icon: '😴', nameEn: 'Tiredness', nameTe: 'అలసట' },
  { id: 'body_pain', icon: '😫', nameEn: 'Body Pain', nameTe: 'నొప్పి' },
  { id: 'weakness', icon: '💪', nameEn: 'Weakness', nameTe: 'బలహీనత' },
  { id: 'dizziness', icon: '😵', nameEn: 'Dizziness', nameTe: 'మైకం' },
  { id: 'cough', icon: '🫁', nameEn: 'Cough', nameTe: 'దగ్గు' },
];

const PatientHealthTab = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState('symptoms');
  const [symptomText, setSymptomText] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [vitals, setVitals] = useState({
    systolic: 120,
    diastolic: 80,
    heartRate: 72,
    temperature: 98.6,
    oxygen: 98,
    bloodSugar: 110,
    sugarType: 'fasting',
  });
  const [diagnosisHistory, setDiagnosisHistory] = useState([
    { id: 1, date: '25 Jan 2025, 3:30 PM', symptoms: 'Headache, Fever', diagnosis: 'Common Cold (75%)' },
    { id: 2, date: '20 Jan 2025, 10:15 AM', symptoms: 'Stomach Pain, Nausea', diagnosis: 'Indigestion (82%)' },
  ]);

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSymptomText((prev) => prev + ' [Voice not supported in this browser]');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === 'te' ? 'te-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      setSymptomText((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.start();
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setAnalysisResult({
      symptoms: selectedSymptoms.length ? COMMON_SYMPTOMS.filter((s) => selectedSymptoms.includes(s.id)).map((s) => s.nameEn) : symptomText.split(/[,.]/).filter(Boolean).slice(0, 5) || ['Fever', 'Headache'],
      conditions: [
        { name: 'Common Cold', nameTe: 'సాధారణ జలుబు', match: 75, severity: 'MILD' },
        { name: 'Viral Fever', nameTe: 'వైరల్ జ్వరం', match: 68, severity: 'MODERATE' },
        { name: 'Flu (Influenza)', nameTe: 'ఫ్లూ', match: 52, severity: 'MODERATE' },
      ],
      recommendation: 'Take rest and stay hydrated. Monitor temperature. If symptoms persist for 3+ days, consult a doctor.',
    });
    setAnalyzing(false);
  };

  const hasInput = symptomText.trim() || selectedSymptoms.length > 0;
  const handleViewAllHistory = () => {
  alert('View All History - This would navigate to a full history page');
  // You could also navigate to a dedicated page:
  // navigate('/patient/history/all');
};
 
const handleViewDetails = (item) => {
  alert(`View Details for: ${item.symptoms} - ${item.diagnosis}`);
  // You could also navigate to a detailed view:
  // navigate(`/patient/history/${item.id}`);
};

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-gray-100 mb-4">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium touch-manipulation min-h-[48px] ${isActive ? 'bg-white shadow text-primary-600' : 'text-gray-600'}`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.labelKey, tab.id === 'symptoms' ? 'Symptoms' : tab.id === 'vitals' ? 'Vitals' : 'History')}
            </button>
          );
        })}
      </div>

      {/* Symptoms sub-tab */}
      {activeSubTab === 'symptoms' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">🩺 {t('patient.health.howFeeling', 'How are you feeling today?')}</h2>

          {/* Voice input */}
          <button
            type="button"
            onClick={startVoiceInput}
            className={`w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 touch-manipulation min-h-[120px] ${isListening ? 'border-red-500 bg-red-50 animate-pulse' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'}`}
          >
            <Mic className={`h-10 w-10 ${isListening ? 'text-red-600' : 'text-gray-500'}`} />
            <span className="font-medium text-gray-700">{t('patient.health.tapToSpeak', 'TAP TO SPEAK')}</span>
            <span className="text-xs text-gray-500">{t('patient.health.teluguHindiEnglish', 'Tell me your symptoms in Telugu, Hindi or English')}</span>
          </button>

          <p className="text-center text-sm text-gray-500">OR</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder={t('patient.health.typeSymptoms', 'Type your symptoms...')}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-base"
            />
            <button type="button" className="p-3 rounded-xl bg-gray-100" aria-label="Search"><Search className="h-5 w-5" /></button>
          </div>

          {/* Common symptoms */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('patient.health.selectSymptoms', 'SELECT YOUR SYMPTOMS')}</p>
            <div className="grid grid-cols-4 gap-2">
              {COMMON_SYMPTOMS.map((s) => {
                const selected = selectedSymptoms.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSymptom(s.id)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 touch-manipulation min-h-[80px] ${selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-[10px] font-medium mt-1 text-center">{s.nameEn}</span>
                    <span className="text-[9px] text-gray-500">{s.nameTe}</span>
                    {selected && <Check className="h-4 w-4 text-primary-600 mt-1" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('patient.health.viewAllSymptoms', 'View all 132 symptoms')}</p>
          </div>

          {hasInput && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {t('patient.health.selected', 'Selected')}: {selectedSymptoms.map((id) => COMMON_SYMPTOMS.find((s) => s.id === id)?.nameEn).filter(Boolean).join(', ') || symptomText.slice(0, 30)}
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium flex items-center gap-1"
              >
                {analyzing ? t('patient.health.analyzing', 'Analyzing...') : t('patient.health.analyze', 'ANALYZE')} 🔍
              </button>
            </div>
          )}

          {/* Analysis result */}
          {analysisResult && (
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden space-y-4 p-4">
              <h3 className="font-bold text-green-700">✅ {t('patient.health.analysisComplete', 'ANALYSIS COMPLETE')}</h3>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('patient.health.detectedSymptoms', 'DETECTED SYMPTOMS')}</p>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                  {analysisResult.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">📊 {t('patient.health.possibleConditions', 'POSSIBLE CONDITIONS')}</p>
                <div className="space-y-2 mt-2">
                  {analysisResult.conditions.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="font-medium text-gray-900">{c.name} ({c.nameTe})</p>
                      <p className="text-xs text-gray-500">{c.match}% match • Severity: {c.severity}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-sm font-medium text-gray-800">💡 {t('patient.health.recommendation', 'RECOMMENDATION')}</p>
                <p className="text-sm text-gray-700 mt-1">{analysisResult.recommendation}</p>
                <button type="button" className="mt-2 p-2 rounded-lg bg-white border border-gray-200 flex items-center gap-1 text-sm">
                  <Volume2 className="h-4 w-4" /> {t('patient.listen', 'Listen')}
                </button>
                <p className="text-xs text-amber-800 mt-2">{t('patient.health.disclaimer', 'This is AI-based guidance only. For diagnosis, please consult a qualified doctor.')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm">📅 {t('patient.bookAppointment', 'Book Appointment')}</button>
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm">💬 {t('patient.askAI', 'Ask AI Chatbot')}</button>
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm">📋 {t('patient.saveToRecords', 'Save to Records')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vitals sub-tab */}
      {activeSubTab === 'vitals' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('patient.health.recordVitals', 'Record vitals')} • {t('patient.health.lastRecorded', 'Last')}: 2 days ago</p>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">🩸 {t('patient.health.bloodPressure', 'Blood Pressure')}</p>
            <div className="flex gap-4 mt-2">
              <div>
                <label className="text-xs text-gray-500">Systolic</label>
                <input type="number" value={vitals.systolic} onChange={(e) => setVitals((v) => ({ ...v, systolic: +e.target.value }))} className="w-20 px-2 py-1 border rounded" />
                <span className="text-xs"> mmHg</span>
              </div>
              <div>
                <label className="text-xs text-gray-500">Diastolic</label>
                <input type="number" value={vitals.diastolic} onChange={(e) => setVitals((v) => ({ ...v, diastolic: +e.target.value }))} className="w-20 px-2 py-1 border rounded" />
                <span className="text-xs"> mmHg</span>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-1">✅ Normal</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">❤️ {t('patient.health.heartRate', 'Heart Rate')}</p>
            <input type="number" value={vitals.heartRate} onChange={(e) => setVitals((v) => ({ ...v, heartRate: +e.target.value }))} className="w-24 px-2 py-1 border rounded mt-2" />
            <span className="text-sm"> bpm</span>
            <p className="text-xs text-green-600 mt-1">✅ Normal</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">🌡️ {t('patient.health.temperature', 'Temperature')}</p>
            <input type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals((v) => ({ ...v, temperature: +e.target.value }))} className="w-24 px-2 py-1 border rounded mt-2" />
            <span className="text-sm"> °F</span>
            <p className="text-xs text-green-600 mt-1">✅ Normal</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">🫁 {t('patient.health.oxygen', 'Oxygen (SpO2)')}</p>
            <input type="number" value={vitals.oxygen} onChange={(e) => setVitals((v) => ({ ...v, oxygen: +e.target.value }))} className="w-24 px-2 py-1 border rounded mt-2" />
            <span className="text-sm"> %</span>
            <p className="text-xs text-green-600 mt-1">✅ Normal</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900 flex items-center gap-2">🍬 {t('patient.health.bloodSugar', 'Blood Sugar')}</p>
            <input type="number" value={vitals.bloodSugar} onChange={(e) => setVitals((v) => ({ ...v, bloodSugar: +e.target.value }))} className="w-24 px-2 py-1 border rounded mt-2" />
            <span className="text-sm"> mg/dL</span>
            <select value={vitals.sugarType} onChange={(e) => setVitals((v) => ({ ...v, sugarType: e.target.value }))} className="ml-2 px-2 py-1 border rounded text-sm">
              <option value="fasting">Fasting</option>
              <option value="after_meal">After Meal</option>
            </select>
            <p className="text-xs text-green-600 mt-1">✅ Normal</p>
          </div>

          <button type="button" className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium">💾 {t('patient.health.saveVitals', 'Save Vitals')}</button>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-900">📊 {t('patient.health.vitalsHistory', 'Vitals History')} (Last 7 days)</p>
            <div className="h-32 mt-2 flex items-end gap-1">
              {[120, 118, 122, 119, 121, 120, 120].map((v, i) => (
                <div key={i} className="flex-1 bg-primary-200 rounded-t" style={{ height: `${(v / 140) * 100}%` }} title={v} />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Mon Tue Wed Thu Fri Sat Sun</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className="text-sm text-primary-600">{t('patient.health.viewDetailed', 'View detailed statistics')}</button>
              <button type="button" className="text-sm text-primary-600">{t('patient.health.exportPdf', 'Export PDF')}</button>
             <button type="button" onClick={handleViewAllHistory} className="text-sm text-primary-600">{t('patient.viewAll', 'View All')}</button>
            </div>
          </div>
        </div>
      )}

     {/* ================= HISTORY SUB TAB ================= */}
{activeSubTab === 'history' && (
  <div className="space-y-4">

    {/* Header */}
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-gray-900">
        📜 Past symptom checks
      </h3>

      {/* View All clickable */}
      <button
        onClick={() =>
          alert("Showing full history records...")
        }
        className="text-sm text-green-600 font-medium hover:underline"
      >
        View All
      </button>
    </div>

    {/* History Cards */}
    {diagnosisHistory.map((item) => (
      <div
        key={item.id}
        onClick={() => handleViewDetails(item)}
        className="rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition"
      >
        <p className="text-sm text-gray-500">
          📅 {item.date}
        </p>

        <p className="font-medium text-gray-900 mt-1">
          Symptoms: {item.symptoms}
        </p>

        <p className="text-sm text-gray-700 mt-1">
          Diagnosis: {item.diagnosis}
        </p>

        {/* View Details clickable */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevents double click
            handleViewDetails(item);
          }}
          className="mt-2 text-sm text-green-600 flex items-center gap-1 hover:underline"
        >
          View Details
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    ))}

  </div>
)}


      <div className="h-16" />
    </div>
  );
};

export default PatientHealthTab;
