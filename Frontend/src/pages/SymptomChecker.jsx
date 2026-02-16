import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Thermometer,
  Heart,
  Brain,
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Video,
  X,
  Bone,
  Eye,
  Stethoscope,
  Pill,
  RefreshCw,
} from 'lucide-react';
import { diagnosisAPI } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { useVoiceOutput } from '../hooks/useVoiceOutput';

// ============================================
// CONSTANTS
// ============================================
const STEPS = {
  SELECT_SYMPTOMS: 1,
  ADDITIONAL_DETAILS: 2,
  RESULTS: 3,
};

const SEVERITY_LEVELS = [
  { value: 'mild', color: 'green' },
  { value: 'moderate', color: 'yellow' },
  { value: 'severe', color: 'orange' },
  { value: 'emergency', color: 'red' },
];

const DURATION_OPTIONS = ['few_hours', '1_2_days', '3_7_days', '1_2_weeks', 'more_than_2_weeks'];

const GENDER_OPTIONS = ['male', 'female', 'other'];

// ============================================
// SYMPTOM DATA WITH TRANSLATIONS
// (In production, fetch from diagnosisAPI.symptoms.list())
// ============================================
const SYMPTOM_CATEGORIES = [
  {
    id: 'general',
    icon: Activity,
    labels: { en: 'General', hi: 'सामान्य', te: 'సాధారణ' },
    symptoms: [
      { id: 'fever', labels: { en: 'Fever', hi: 'बुखार', te: 'జ్వరం' } },
      { id: 'fatigue', labels: { en: 'Fatigue', hi: 'थकान', te: 'అలసట' } },
      { id: 'weight_loss', labels: { en: 'Weight Loss', hi: 'वजन कम होना', te: 'బరువు తగ్గడం' } },
      { id: 'night_sweats', labels: { en: 'Night Sweats', hi: 'रात को पसीना', te: 'రాత్రి చెమటలు' } },
      { id: 'body_pain', labels: { en: 'Body Pain', hi: 'शरीर दर्द', te: 'శరీరం నొప్పి' } },
      { id: 'chills', labels: { en: 'Chills', hi: 'ठंड लगना', te: 'చలి వణుకు' } },
    ],
  },
  {
    id: 'respiratory',
    icon: Thermometer,
    labels: { en: 'Respiratory', hi: 'श्वसन', te: 'శ్వాసకోశ' },
    symptoms: [
      { id: 'cough', labels: { en: 'Cough', hi: 'खांसी', te: 'దగ్గు' } },
      { id: 'shortness_of_breath', labels: { en: 'Shortness of Breath', hi: 'सांस फूलना', te: 'ఊపిరి ఆడకపోవడం' } },
      { id: 'chest_pain', labels: { en: 'Chest Pain', hi: 'सीने में दर्द', te: 'ఛాతీ నొప్పి' } },
      { id: 'sore_throat', labels: { en: 'Sore Throat', hi: 'गले में खराश', te: 'గొంతు నొప్పి' } },
      { id: 'runny_nose', labels: { en: 'Runny Nose', hi: 'नाक बहना', te: 'ముక్కు కారడం' } },
      { id: 'wheezing', labels: { en: 'Wheezing', hi: 'घरघराहट', te: 'శ్వాస శబ్దం' } },
    ],
  },
  {
    id: 'cardiovascular',
    icon: Heart,
    labels: { en: 'Heart & Circulation', hi: 'हृदय और रक्तसंचार', te: 'గుండె & రక్తప్రసరణ' },
    symptoms: [
      { id: 'palpitations', labels: { en: 'Palpitations', hi: 'धड़कन तेज होना', te: 'గుండె దడ' } },
      { id: 'chest_tightness', labels: { en: 'Chest Tightness', hi: 'सीने में जकड़न', te: 'ఛాతీ బిగుతు' } },
      { id: 'dizziness', labels: { en: 'Dizziness', hi: 'चक्कर आना', te: 'తల తిరగడం' } },
      { id: 'swelling_legs', labels: { en: 'Swollen Legs', hi: 'पैरों में सूजन', te: 'కాళ్ళు వాపు' } },
    ],
  },
  {
    id: 'neurological',
    icon: Brain,
    labels: { en: 'Neurological', hi: 'तंत्रिका संबंधी', te: 'నరాల సంబంధిత' },
    symptoms: [
      { id: 'headache', labels: { en: 'Headache', hi: 'सिरदर्द', te: 'తలనొప్పి' } },
      { id: 'numbness', labels: { en: 'Numbness/Tingling', hi: 'सुन्नपन', te: 'మొద్దుబారడం' } },
      { id: 'confusion', labels: { en: 'Confusion', hi: 'भ्रम', te: 'గందరగోళం' } },
      { id: 'vision_changes', labels: { en: 'Vision Changes', hi: 'दृष्टि में बदलाव', te: 'చూపు మార్పులు' } },
      { id: 'memory_issues', labels: { en: 'Memory Issues', hi: 'याददाश्त की समस्या', te: 'జ్ఞాపకశక్తి సమస్యలు' } },
    ],
  },
  {
    id: 'digestive',
    icon: Pill,
    labels: { en: 'Digestive', hi: 'पाचन संबंधी', te: 'జీర్ణ సంబంధిత' },
    symptoms: [
      { id: 'nausea', labels: { en: 'Nausea', hi: 'मतली', te: 'వికారం' } },
      { id: 'vomiting', labels: { en: 'Vomiting', hi: 'उल्टी', te: 'వాంతులు' } },
      { id: 'diarrhea', labels: { en: 'Diarrhea', hi: 'दस्त', te: 'విరేచనాలు' } },
      { id: 'abdominal_pain', labels: { en: 'Abdominal Pain', hi: 'पेट दर्द', te: 'కడుపు నొప్పి' } },
      { id: 'bloating', labels: { en: 'Bloating', hi: 'पेट फूलना', te: 'ఉబ్బరం' } },
      { id: 'loss_of_appetite', labels: { en: 'Loss of Appetite', hi: 'भूख न लगना', te: 'ఆకలి లేకపోవడం' } },
    ],
  },
  {
    id: 'musculoskeletal',
    icon: Bone,
    labels: { en: 'Muscles & Joints', hi: 'मांसपेशियां और जोड़', te: 'కండరాలు & కీళ్ళు' },
    symptoms: [
      { id: 'joint_pain', labels: { en: 'Joint Pain', hi: 'जोड़ों का दर्द', te: 'కీళ్ళ నొప్పి' } },
      { id: 'back_pain', labels: { en: 'Back Pain', hi: 'पीठ दर्द', te: 'వీపు నొప్పి' } },
      { id: 'muscle_weakness', labels: { en: 'Muscle Weakness', hi: 'मांसपेशियों में कमजोरी', te: 'కండరాల బలహీనత' } },
      { id: 'stiffness', labels: { en: 'Stiffness', hi: 'अकड़न', te: 'వడదెబ్బ' } },
    ],
  },
  {
    id: 'skin_eyes',
    icon: Eye,
    labels: { en: 'Skin & Eyes', hi: 'त्वचा और आंखें', te: 'చర్మం & కళ్ళు' },
    symptoms: [
      { id: 'rash', labels: { en: 'Rash', hi: 'दाने', te: 'దద్దుర్లు' } },
      { id: 'itching', labels: { en: 'Itching', hi: 'खुजली', te: 'దురద' } },
      { id: 'yellow_skin', labels: { en: 'Yellow Skin/Eyes', hi: 'त्वचा/आँख पीली होना', te: 'చర్మం/కళ్ళు పసుపు' } },
      { id: 'eye_pain', labels: { en: 'Eye Pain', hi: 'आँख में दर्द', te: 'కంటి నొప్పి' } },
    ],
  },
];

// Emergency symptoms that should trigger immediate warning
const EMERGENCY_SYMPTOMS = [
  'chest_pain',
  'shortness_of_breath',
  'confusion',
  'vision_changes',
  'chest_tightness',
];

// ============================================
// TRANSLATIONS
// ============================================
const TRANSLATIONS = {
  en: {
    title: 'Symptom Checker',
    subtitle: 'Select your symptoms to get a preliminary assessment',
    searchPlaceholder: 'Search symptoms...',
    browseCategories: 'Browse by Category',
    searchResults: 'Search Results',
    noSearchResults: 'No symptoms found matching your search',
    selectedSymptoms: 'Selected Symptoms',
    selectAtLeastOne: 'Please select at least one symptom',
    additionalDetails: 'Additional Details',
    age: 'Age',
    agePlaceholder: 'Enter your age',
    years: 'years',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    duration: 'How long have you had these symptoms?',
    selectDuration: 'Select duration',
    few_hours: 'A few hours',
    '1_2_days': '1-2 days',
    '3_7_days': '3-7 days',
    '1_2_weeks': '1-2 weeks',
    more_than_2_weeks: 'More than 2 weeks',
    severity: 'Severity',
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
    emergency: 'Emergency',
    step1: 'Select Symptoms',
    step2: 'Details',
    step3: 'Results',
    continue: 'Continue',
    back: 'Back',
    analyzeSymptoms: 'Analyze Symptoms',
    analyzing: 'Analyzing...',
    analysisResults: 'Analysis Results',
    possibleConditions: 'Possible Conditions',
    probability: 'Probability',
    recommendations: 'Recommendations',
    nextSteps: 'Recommended Next Steps',
    chatWithDoctor: 'Chat with Doctor',
    videoConsultation: 'Video Consultation',
    newCheck: 'New Check',
    emergencyWarning: '⚠️ Emergency Warning',
    seekImmediate:
      'Based on your symptoms, we recommend seeking immediate medical attention. Please call emergency services or visit the nearest hospital.',
    callEmergency: 'Call Emergency (112)',
    disclaimer:
      '⚕️ This symptom checker is for informational purposes only and does not constitute medical advice. It is NOT a substitute for professional medical diagnosis, treatment, or advice. If you are experiencing a medical emergency, please call emergency services immediately. Always consult a qualified healthcare provider for any health concerns.',
    disclaimerShort:
      'For reference only. Please consult a doctor if you feel any discomfort.',
    ageRequired: 'Please enter your age',
    invalidAge: 'Please enter a valid age (1-120)',
    genderRequired: 'Please select your gender',
    analysisError: 'Failed to analyze symptoms. Please try again.',
    noResults: 'No conditions found. Please try with different symptoms.',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  },
  hi: {
    title: 'लक्षण जांचकर्ता',
    subtitle: 'प्रारंभिक मूल्यांकन के लिए अपने लक्षण चुनें',
    searchPlaceholder: 'लक्षण खोजें...',
    browseCategories: 'श्रेणी के अनुसार ब्राउज़ करें',
    searchResults: 'खोज परिणाम',
    noSearchResults: 'आपकी खोज से मेल खाते कोई लक्षण नहीं मिले',
    selectedSymptoms: 'चयनित लक्षण',
    selectAtLeastOne: 'कृपया कम से कम एक लक्षण चुनें',
    additionalDetails: 'अतिरिक्त विवरण',
    age: 'उम्र',
    agePlaceholder: 'अपनी उम्र दर्ज करें',
    years: 'वर्ष',
    gender: 'लिंग',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    duration: 'ये लक्षण कब से हैं?',
    selectDuration: 'अवधि चुनें',
    few_hours: 'कुछ घंटे',
    '1_2_days': '1-2 दिन',
    '3_7_days': '3-7 दिन',
    '1_2_weeks': '1-2 सप्ताह',
    more_than_2_weeks: '2 सप्ताह से अधिक',
    severity: 'गंभीरता',
    mild: 'हल्का',
    moderate: 'मध्यम',
    severe: 'गंभीर',
    emergency: 'आपातकालीन',
    step1: 'लक्षण चुनें',
    step2: 'विवरण',
    step3: 'परिणाम',
    continue: 'जारी रखें',
    back: 'वापस',
    analyzeSymptoms: 'लक्षणों का विश्लेषण करें',
    analyzing: 'विश्लेषण हो रहा है...',
    analysisResults: 'विश्लेषण परिणाम',
    possibleConditions: 'संभावित स्थितियां',
    probability: 'संभावना',
    recommendations: 'सिफारिशें',
    nextSteps: 'अनुशंसित अगले कदम',
    chatWithDoctor: 'डॉक्टर से चैट करें',
    videoConsultation: 'वीडियो परामर्श',
    newCheck: 'नई जांच',
    emergencyWarning: '⚠️ आपातकालीन चेतावनी',
    seekImmediate:
      'आपके लक्षणों के आधार पर, हम तुरंत चिकित्सा सहायता लेने की सलाह देते हैं। कृपया आपातकालीन सेवाओं को कॉल करें या निकटतम अस्पताल जाएं।',
    callEmergency: 'आपातकालीन कॉल (112)',
    disclaimer:
      '⚕️ यह लक्षण जांचकर्ता केवल जानकारी के लिए है और यह चिकित्सा सलाह नहीं है। यह पेशेवर चिकित्सा निदान, उपचार या सलाह का विकल्प नहीं है। यदि आपको चिकित्सा आपातकाल है, तो कृपया तुरंत आपातकालीन सेवाओं को कॉल करें। किसी भी स्वास्थ्य चिंता के लिए हमेशा योग्य स्वास्थ्य सेवा प्रदाता से परामर्श करें।',
    disclaimerShort: 'केवल संदर्भ के लिए। यदि आपको कोई असुविधा हो तो कृपया डॉक्टर से परामर्श करें।',
    ageRequired: 'कृपया अपनी उम्र दर्ज करें',
    invalidAge: 'कृपया मान्य उम्र दर्ज करें (1-120)',
    genderRequired: 'कृपया अपना लिंग चुनें',
    analysisError: 'लक्षणों का विश्लेषण करने में विफल। कृपया पुनः प्रयास करें।',
    noResults: 'कोई स्थिति नहीं मिली। कृपया अलग लक्षणों के साथ प्रयास करें।',
    low: 'कम',
    medium: 'मध्यम',
    high: 'उच्च',
  },
  te: {
    title: 'లక్షణ తనిఖీ',
    subtitle: 'ప్రాథమిక అంచనా కోసం మీ లక్షణాలను ఎంచుకోండి',
    searchPlaceholder: 'లక్షణాలను వెతకండి...',
    browseCategories: 'వర్గం ప్రకారం బ్రౌజ్ చేయండి',
    searchResults: 'శోధన ఫలితాలు',
    noSearchResults: 'మీ శోధనకు సరిపోలే లక్షణాలు కనుగొనబడలేదు',
    selectedSymptoms: 'ఎంచుకున్న లక్షణాలు',
    selectAtLeastOne: 'దయచేసి కనీసం ఒక లక్షణాన్ని ఎంచుకోండి',
    additionalDetails: 'అదనపు వివరాలు',
    age: 'వయస్సు',
    agePlaceholder: 'మీ వయస్సు నమోదు చేయండి',
    years: 'సంవత్సరాలు',
    gender: 'లింగం',
    male: 'పురుషుడు',
    female: 'స్త్రీ',
    other: 'ఇతరం',
    duration: 'ఈ లక్షణాలు ఎంతకాలంగా ఉన్నాయి?',
    selectDuration: 'వ్యవధి ఎంచుకోండి',
    few_hours: 'కొన్ని గంటలు',
    '1_2_days': '1-2 రోజులు',
    '3_7_days': '3-7 రోజులు',
    '1_2_weeks': '1-2 వారాలు',
    more_than_2_weeks: '2 వారాలకు పైగా',
    severity: 'తీవ్రత',
    mild: 'తేలిక',
    moderate: 'మధ్యస్థం',
    severe: 'తీవ్రం',
    emergency: 'అత్యవసరం',
    step1: 'లక్షణాలు ఎంచుకోండి',
    step2: 'వివరాలు',
    step3: 'ఫలితాలు',
    continue: 'కొనసాగించు',
    back: 'వెనుకకు',
    analyzeSymptoms: 'లక్షణాలను విశ్లేషించు',
    analyzing: 'విశ్లేషిస్తోంది...',
    analysisResults: 'విశ్లేషణ ఫలితాలు',
    possibleConditions: 'సాధ్యమైన పరిస్థితులు',
    probability: 'సంభావ్యత',
    recommendations: 'సిఫార్సులు',
    nextSteps: 'సిఫార్సు చేసిన తదుపరి దశలు',
    chatWithDoctor: 'డాక్టర్‌తో చాట్ చేయండి',
    videoConsultation: 'వీడియో సంప్రదింపు',
    newCheck: 'కొత్త తనిఖీ',
    emergencyWarning: '⚠️ అత్యవసర హెచ్చరిక',
    seekImmediate:
      'మీ లక్షణాల ఆధారంగా, వెంటనే వైద్య సహాయం తీసుకోమని మేము సిఫార్సు చేస్తున్నాము. దయచేసి అత్యవసర సేవలకు కాల్ చేయండి లేదా సమీపంలోని ఆసుపత్రికి వెళ్ళండి.',
    callEmergency: 'అత్యవసర కాల్ (112)',
    disclaimer:
      '⚕️ ఈ లక్షణ తనిఖీ సమాచార ప్రయోజనాల కోసం మాత్రమే మరియు ఇది వైద్య సలహా కాదు. ఇది ప్రొఫెషనల్ వైద్య రోగ నిర్ధారణ, చికిత్స లేదా సలహాకు ప్రత్యామ్నాయం కాదు. మీకు వైద్య అత్యవసర పరిస్థితి ఉంటే, దయచేసి వెంటనే అత్యవసర సేవలకు కాల్ చేయండి.',
    disclaimerShort: 'సూచన కోసం మాత్రమే. మీకు ఏదైనా అసౌకర్యం ఉంటే దయచేసి వైద్యుడిని సంప్రదించండి.',
    ageRequired: 'దయచేసి మీ వయస్సు నమోదు చేయండి',
    invalidAge: 'దయచేసి చెల్లుబాటు అయ్యే వయస్సు నమోదు చేయండి (1-120)',
    genderRequired: 'దయచేసి మీ లింగం ఎంచుకోండి',
    analysisError: 'లక్షణాలను విశ్లేషించడంలో విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    noResults: 'పరిస్థితులు కనుగొనబడలేదు. దయచేసి వేరే లక్షణాలతో ప్రయత్నించండి.',
    low: 'తక్కువ',
    medium: 'మధ్యస్థం',
    high: 'ఎక్కువ',
  },
};

// ============================================
// TOAST COMPONENT
// ============================================
const Toast = memo(({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full border rounded-lg p-4 shadow-lg ${styles[type]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

// ============================================
// MAIN COMPONENT
// ============================================
const SymptomChecker = () => {
  const { t: i18nT } = useTranslation();
  const { language } = useLanguage();
  const { speak } = useVoiceOutput();
  const navigate = useNavigate();

  // ---- Local translation helper ----
  const t = useCallback(
    (key) => {
      const langTranslations = TRANSLATIONS[language] || TRANSLATIONS.en;
      return langTranslations[key] || TRANSLATIONS.en[key] || key;
    },
    [language]
  );

  // ---- Get symptom/category label in current language ----
  const getLabel = useCallback(
    (item) => {
      return item.labels?.[language] || item.labels?.en || item.id;
    },
    [language]
  );

  // ---- State ----
  const [step, setStep] = useState(STEPS.SELECT_SYMPTOMS);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [apiSymptoms, setApiSymptoms] = useState(null); // From backend if available

  // ---- Memoized flat symptom list ----
  const allSymptoms = useMemo(() => {
    const categories = apiSymptoms || SYMPTOM_CATEGORIES;
    return categories.flatMap((cat) => cat.symptoms);
  }, [apiSymptoms]);

  const categories = useMemo(() => {
    return apiSymptoms || SYMPTOM_CATEGORIES;
  }, [apiSymptoms]);

  // ---- Search filtered symptoms ----
  const filteredSymptoms = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    return allSymptoms.filter((symptom) => {
      const label = getLabel(symptom).toLowerCase();
      return label.includes(query) || symptom.id.includes(query);
    });
  }, [searchQuery, allSymptoms, getLabel]);

  // ---- Check if any emergency symptoms are selected ----
  const hasEmergencySymptoms = useMemo(() => {
    return selectedSymptoms.some((id) => EMERGENCY_SYMPTOMS.includes(id));
  }, [selectedSymptoms]);

  // ---- Fetch symptoms from backend ----
  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        const response = await diagnosisAPI.symptoms.list();
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setApiSymptoms(response.data);
        }
      } catch (error) {
        // Silently fall back to local symptom data
        console.warn('Using local symptom data:', error.message);
      }
    };

    fetchSymptoms();
  }, []);

  // ---- Voice announce on step change ----
  useEffect(() => {
    const stepLabels = {
      [STEPS.SELECT_SYMPTOMS]: t('step1'),
      [STEPS.ADDITIONAL_DETAILS]: t('step2'),
      [STEPS.RESULTS]: t('step3'),
    };
    speak(stepLabels[step] || '');
  }, [step, speak, t]);

  // ---- Toast helper ----
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // ---- Toggle symptom selection ----
  const toggleSymptom = useCallback((symptomId) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    );
  }, []);

  // ---- Validate step 2 ----
  const validateDetails = useCallback(() => {
    const newErrors = {};

    if (!age) {
      newErrors.age = t('ageRequired');
    } else {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        newErrors.age = t('invalidAge');
      }
    }

    if (!gender) {
      newErrors.gender = t('genderRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [age, gender, t]);

  // ---- Analyze symptoms ----
  const analyzeSymptoms = useCallback(async () => {
    if (!validateDetails()) return;

    setIsAnalyzing(true);
    try {
      const response = await diagnosisAPI.diagnoseSymptoms({
        symptoms: selectedSymptoms,
        patient_age: parseInt(age, 10),
        patient_gender: gender,
        duration,
        severity,
        language,
      });

      if (response.data) {
        setAnalysisResult({
          ...response.data,
          emergencyWarning: hasEmergencySymptoms || response.data.emergency_warning,
        });
        setStep(STEPS.RESULTS);
      } else {
        showToast(t('noResults'), 'warning');
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      showToast(
        error?.message || t('analysisError'),
        'error'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    selectedSymptoms,
    age,
    gender,
    duration,
    severity,
    language,
    hasEmergencySymptoms,
    validateDetails,
    showToast,
    t,
  ]);

  // ---- Reset checker ----
  const resetChecker = useCallback(() => {
    setStep(STEPS.SELECT_SYMPTOMS);
    setSelectedSymptoms([]);
    setAge('');
    setGender('');
    setDuration('');
    setSeverity('');
    setAnalysisResult(null);
    setErrors({});
    setSearchQuery('');
  }, []);

  // ---- Navigate to doctor ----
  const goToDoctor = useCallback(
    (type = 'chat') => {
      navigate('/patient/dashboard', {
        state: {
          tab: type === 'video' ? 'appointments' : 'chat',
          symptomData: {
            symptoms: selectedSymptoms,
            result: analysisResult,
          },
        },
      });
    },
    [navigate, selectedSymptoms, analysisResult]
  );

  // ============================================
  // RENDER: Step 1 - Select Symptoms
  // ============================================
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Medical Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
          <p className="text-amber-800 text-sm">{t('disclaimerShort')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-xl 
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label={t('searchPlaceholder')}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="bg-white border rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            {t('searchResults')} ({filteredSymptoms.length})
          </h3>
          {filteredSymptoms.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">{t('noSearchResults')}</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredSymptoms.map((symptom) => (
                <SymptomButton
                  key={symptom.id}
                  symptom={symptom}
                  selected={selectedSymptoms.includes(symptom.id)}
                  onClick={() => toggleSymptom(symptom.id)}
                  getLabel={getLabel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Symptoms Chips */}
      {selectedSymptoms.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <h3 className="font-semibold text-primary-900 mb-3">
            {t('selectedSymptoms')} ({selectedSymptoms.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedSymptoms.map((symptomId) => {
              const symptom = allSymptoms.find((s) => s.id === symptomId);
              if (!symptom) return null;
              return (
                <span
                  key={symptomId}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-white 
                    border border-primary-300 text-primary-700 text-sm"
                >
                  {getLabel(symptom)}
                  <button
                    onClick={() => toggleSymptom(symptomId)}
                    className="ml-2 text-primary-400 hover:text-primary-700 focus:outline-none"
                    aria-label={`Remove ${getLabel(symptom)}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Emergency Warning */}
      {hasEmergencySymptoms && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">{t('emergencyWarning')}</h4>
              <p className="text-red-700 text-sm mt-1">{t('seekImmediate')}</p>
              <a
                href="tel:112"
                className="inline-flex items-center mt-3 px-4 py-2 bg-red-600 text-white 
                  rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                🚨 {t('callEmergency')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{t('browseCategories')}</h2>
        {categories.map((category) => {
          const IconComponent = category.icon || Activity;
          return (
            <div key={category.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-primary-50 rounded-lg mr-3">
                  {typeof IconComponent === 'function' ? (
                    <IconComponent className="h-5 w-5 text-primary-600" />
                  ) : (
                    category.icon
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{getLabel(category)}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.symptoms.map((symptom) => (
                  <SymptomButton
                    key={symptom.id}
                    symptom={symptom}
                    selected={selectedSymptoms.includes(symptom.id)}
                    onClick={() => toggleSymptom(symptom.id)}
                    getLabel={getLabel}
                    isEmergency={EMERGENCY_SYMPTOMS.includes(symptom.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ============================================
  // RENDER: Step 2 - Additional Details
  // ============================================
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('additionalDetails')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('age')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setErrors((prev) => ({ ...prev, age: null }));
              }}
              min="1"
              max="120"
              className={`block w-full px-4 py-3 border rounded-xl focus:ring-2 
                focus:ring-primary-500 focus:border-primary-500
                ${errors.age ? 'border-red-300' : 'border-gray-300'}`}
              placeholder={t('agePlaceholder')}
              aria-label={t('age')}
              aria-invalid={!!errors.age}
            />
            <span className="absolute right-3 top-3.5 text-gray-400 text-sm">{t('years')}</span>
          </div>
          {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('gender')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('gender')}>
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                role="radio"
                aria-checked={gender === g}
                onClick={() => {
                  setGender(g);
                  setErrors((prev) => ({ ...prev, gender: null }));
                }}
                className={`py-3 rounded-lg border text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${
                    gender === g
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : `border-gray-300 hover:border-primary-300 ${
                          errors.gender ? 'border-red-300' : ''
                        }`
                  }`}
              >
                {t(g)}
              </button>
            ))}
          </div>
          {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('duration')}</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl 
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label={t('duration')}
          >
            <option value="">{t('selectDuration')}</option>
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t(d)}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('severity')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t('severity')}>
            {SEVERITY_LEVELS.map((s) => (
              <button
                key={s.value}
                role="radio"
                aria-checked={severity === s.value}
                onClick={() => setSeverity(s.value)}
                className={`py-2.5 px-2 rounded-lg border text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${
                    severity === s.value
                      ? `border-${s.color}-500 bg-${s.color}-50 text-${s.color}-800`
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                {t(s.value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Symptoms Summary */}
      <div className="bg-gray-50 border rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          {t('selectedSymptoms')} ({selectedSymptoms.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedSymptoms.map((symptomId) => {
            const symptom = allSymptoms.find((s) => s.id === symptomId);
            if (!symptom) return null;
            return (
              <span
                key={symptomId}
                className="inline-flex items-center px-3 py-1 rounded-full bg-white 
                  border border-gray-300 text-gray-700 text-sm"
              >
                {getLabel(symptom)}
                <button
                  onClick={() => toggleSymptom(symptomId)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${getLabel(symptom)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER: Step 3 - Results
  // ============================================
  const renderStep3 = () => {
    if (!analysisResult) return null;

    const conditions = analysisResult.possible_conditions || analysisResult.possibleConditions || [];

    return (
      <div className="space-y-6">
        {/* Emergency Warning */}
        {analysisResult.emergencyWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-red-900">{t('emergencyWarning')}</h3>
                <p className="text-red-700 mt-1">{t('seekImmediate')}</p>
                <a
                  href="tel:112"
                  className="inline-flex items-center mt-3 px-5 py-2.5 bg-red-600 text-white 
                    rounded-lg font-bold hover:bg-red-700 transition-colors"
                >
                  🚨 {t('callEmergency')}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('analysisResults')}</h2>
        </div>

        {/* Possible Conditions */}
        {conditions.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">{t('possibleConditions')}</h3>
            {conditions.map((condition, index) => {
              const condSeverity = condition.severity || 'medium';
              const severityColors = {
                low: 'bg-green-100 text-green-800',
                medium: 'bg-yellow-100 text-yellow-800',
                high: 'bg-red-100 text-red-800',
              };

              return (
                <div
                  key={index}
                  className="border rounded-xl p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {condition.name || condition.disease_name}
                      </h4>
                      <div className="flex items-center mt-1 gap-2">
                        <span className="text-sm text-gray-500">{t('probability')}:</span>
                        <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                          {condition.probability || condition.confidence || '—'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        severityColors[condSeverity] || severityColors.medium
                      }`}
                    >
                      {t(condSeverity)}
                    </span>
                  </div>

                  {condition.description && (
                    <p className="text-gray-600 mb-4 text-sm">{condition.description}</p>
                  )}

                  {/* Recommendations */}
                  {condition.recommendations && condition.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2 text-sm">
                        {t('recommendations')}:
                      </h5>
                      <ul className="space-y-1.5">
                        {condition.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noResults')}</p>
          </div>
        )}

        {/* Next Steps */}
        {analysisResult.next_steps && analysisResult.next_steps.length > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
            <h3 className="text-base font-semibold text-primary-900 mb-3">{t('nextSteps')}</h3>
            <div className="space-y-2.5">
              {analysisResult.next_steps.map((nextStep, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-primary-700 text-sm font-bold">{index + 1}</span>
                  </div>
                  <span className="text-sm text-primary-800">{nextStep}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => goToDoctor('chat')}
            className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
              font-medium flex items-center justify-center transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            {t('chatWithDoctor')}
          </button>
          <button
            onClick={() => goToDoctor('video')}
            className="flex-1 py-3 border border-primary-600 text-primary-600 rounded-lg 
              hover:bg-primary-50 font-medium flex items-center justify-center transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Video className="h-5 w-5 mr-2" />
            {t('videoConsultation')}
          </button>
          <button
            onClick={resetChecker}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg 
              hover:bg-gray-50 font-medium flex items-center justify-center transition-colors
              focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            {t('newCheck')}
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: Progress Bar
  // ============================================
  const renderProgressBar = () => {
    const steps = [
      { num: 1, label: t('step1') },
      { num: 2, label: t('step2') },
      { num: 3, label: t('step3') },
    ];

    return (
      <div className="mb-6" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                    ${
                      step >= s.num
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                >
                  {step > s.num ? <CheckCircle className="h-5 w-5" /> : s.num}
                </div>
                <span
                  className={`ml-2 text-sm font-medium hidden sm:inline
                    ${step >= s.num ? 'text-primary-700' : 'text-gray-400'}`}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 transition-colors ${
                    step > s.num ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: Navigation Buttons
  // ============================================
  const renderNavigation = () => {
    if (step === STEPS.RESULTS) return null;

    return (
      <div className="mt-6 pt-5 border-t border-gray-200 flex justify-between">
        {step > STEPS.SELECT_SYMPTOMS ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 
              font-medium flex items-center transition-colors
              focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('back')}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => {
            if (step === STEPS.SELECT_SYMPTOMS) {
              if (selectedSymptoms.length === 0) {
                showToast(t('selectAtLeastOne'), 'warning');
                return;
              }
              setStep(STEPS.ADDITIONAL_DETAILS);
            } else if (step === STEPS.ADDITIONAL_DETAILS) {
              analyzeSymptoms();
            }
          }}
          disabled={isAnalyzing || (step === STEPS.SELECT_SYMPTOMS && selectedSymptoms.length === 0)}
          className={`px-5 py-2.5 rounded-lg font-medium flex items-center transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            ${
              isAnalyzing || (step === STEPS.SELECT_SYMPTOMS && selectedSymptoms.length === 0)
                ? 'bg-primary-300 cursor-not-allowed text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              {t('analyzing')}
            </>
          ) : step === STEPS.SELECT_SYMPTOMS ? (
            <>
              {t('continue')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              {t('analyzeSymptoms')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </button>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600 text-sm sm:text-base">{t('subtitle')}</p>
        </div>

        {/* Progress */}
        {renderProgressBar()}

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 sm:p-7">
          {step === STEPS.SELECT_SYMPTOMS && renderStep1()}
          {step === STEPS.ADDITIONAL_DETAILS && renderStep2()}
          {step === STEPS.RESULTS && renderStep3()}

          {/* Navigation */}
          {renderNavigation()}
        </div>

        {/* Full Disclaimer */}
        <div className="mt-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-800 text-sm leading-relaxed">{t('disclaimer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SYMPTOM BUTTON SUB-COMPONENT
// ============================================
const SymptomButton = memo(({ symptom, selected, onClick, getLabel, isEmergency = false }) => (
  <button
    onClick={onClick}
    aria-pressed={selected}
    className={`flex items-center justify-between p-3 rounded-lg min-h-[44px] w-full 
      text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
      ${
        selected
          ? 'bg-primary-50 border border-primary-300'
          : `border border-gray-200 hover:border-primary-300 hover:bg-gray-50
             ${isEmergency ? 'border-l-2 border-l-red-400' : ''}`
      }`}
  >
    <span className="break-words flex-1 mr-2">
      {getLabel(symptom)}
      {isEmergency && !selected && (
        <AlertTriangle className="h-3 w-3 text-red-400 inline ml-1" />
      )}
    </span>
    {selected ? (
      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
    ) : (
      <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
    )}
  </button>
));

SymptomButton.displayName = 'SymptomButton';

export default memo(SymptomChecker);