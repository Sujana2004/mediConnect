import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Thermometer,
  Heart,
  Brain,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Share2,
  ChevronRight,
  MessageSquare,
  Filter,
  Video
} from 'lucide-react';
import { symptomCheckerAPI } from '../services/api';

const SymptomChecker = () => {
  const { t } = useTranslation();
  // Robust translation helper: if translation missing (returns key), convert key to readable text
  const tt = (key) => {
    try {
      const val = t(key);
      if (!val || val === key) {
        // humanize key: take last segment after dot and split camelCase/underscores
        const parts = key.split('.');
        const last = parts[parts.length - 1];
        const words = last
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_\-]/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1));
        return words.join(' ');
      }
      // ensure first letter is capitalized for consistency
      return val.charAt(0).toUpperCase() + val.slice(1);
    } catch (e) {
      return key;
    }
  };
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSymptoms, setFilteredSymptoms] = useState([]);

  const symptomCategories = [
    {
      id: 'general',
      name: tt('symptomChecker.general'),
      icon: <Activity className="h-5 w-5" />,
      symptoms: [
        { id: 'fever', name: tt('symptomChecker.fever') },
        { id: 'fatigue', name: tt('symptomChecker.fatigue') },
        { id: 'weight_loss', name: tt('symptomChecker.weightLoss') },
        { id: 'sweating', name: tt('symptomChecker.nightSweats') }
      ]
    },
    {
      id: 'respiratory',
      name: tt('SymptomChecker.respiratory'),
      icon: <Thermometer className="h-5 w-5" />,
      symptoms: [
        { id: 'cough', name: tt('SymptomChecker.cough') },
        { id: 'shortness_breath', name: tt('SymptomChecker.shortnessBreath') },
        { id: 'chest_pain', name: tt('SymptomChecker.chestPain') },
        { id: 'sore_throat', name: tt('SymptomChecker.soreThroat') }
      ]
    },
    {
      id: 'cardiovascular',
      name: tt('SymptomChecker.cardiovascular'),
      icon: <Heart className="h-5 w-5" />,
      symptoms: [
        { id: 'palpitations', name: tt('SymptomChecker.palpitations') },
        { id: 'chest_tightness', name: tt('SymptomChecker.chestTightness') },
        { id: 'dizziness', name: tt('SymptomChecker.dizziness') },
        { id: 'swelling_legs', name: tt('SymptomChecker.swellingLegs') }
      ]
    },
    {
      id: 'neurological',
      name: tt('symptomChecker.neurological'),
      icon: <Brain className="h-5 w-5" />,
      symptoms: [
        { id: 'headache', name: tt('symptomChecker.headache') },
        { id: 'numbness', name: tt('SymptomChecker.numbness') },
        { id: 'confusion', name: tt('SymptomChecker.confusion') },
        { id: 'seizures', name: tt('SymptomChecker.seizures') }
      ]
    }
  ];

  const allSymptoms = symptomCategories.flatMap(category => category.symptoms);

  useEffect(() => {
    if (searchQuery) {
      const filtered = allSymptoms.filter(symptom =>
        symptom.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSymptoms(filtered);
    } else {
      setFilteredSymptoms([]);
    }
  }, [searchQuery]);

  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0) {
      alert(tt('symptomChecker.selectAtLeastOne'));
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await symptomCheckerAPI.analyzeSymptoms({
        symptoms: selectedSymptoms,
        age: parseInt(age),
        gender,
        duration,
        severity
      });
      
      setAnalysisResult(response.data);
      setStep(3);
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      // Mock data for demo
      setTimeout(() => {
        setAnalysisResult({
          possibleConditions: [
            {
              name: t('SymptomChecker.commonCold'),
              probability: '65%',
              description: t('SymptomChecker.commonColdDesc'),
              severity: 'low',
              recommendations: [
                t('SymptomChecker.rest'),
                t('SymptomChecker.hydration'),
                t('SymptomChecker.overTheCounter')
              ]
            },
            {
              name: t('SymptomChecker.flu'),
              probability: '25%',
              description: t('SymptomChecker.fluDesc'),
              severity: 'medium',
              recommendations: [
                t('SymptomChecker.antiviral'),
                t('SymptomChecker.rest'),
                t('SymptomChecker.monitorFever')
              ]
            },
            {
              name: t('SymptomChecker.bronchitis'),
              probability: '10%',
              description: t('SymptomChecker.bronchitisDesc'),
              severity: 'medium',
              recommendations: [
                t('SymptomChecker.consultDoctor'),
                t('SymptomChecker.inhaler'),
                t('SymptomChecker.avoidIrritants')
              ]
            }
          ],
          emergencyWarning: selectedSymptoms.includes('chest_pain') || selectedSymptoms.includes('shortness_breath'),
          nextSteps: [
            t('SymptomChecker.monitorSymptoms'),
            t('SymptomChecker.stayHydrated'),
            t('SymptomChecker.consultIfWorsens')
          ]
        });
        setStep(3);
        setIsAnalyzing(false);
      }, 2000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tt('symptomChecker.searchSymptoms')}
          className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <Filter className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="bg-white border rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">{t('symptomChecker.searchResults')}</h3>
          <div className="space-y-2">
            {filteredSymptoms.map(symptom => (
              <button
                key={symptom.id}
                onClick={() => toggleSymptom(symptom.id)}
                className={`flex items-center justify-between w-full p-3 rounded-lg ${
                  selectedSymptoms.includes(symptom.id)
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span>{symptom.name}</span>
                {selectedSymptoms.includes(symptom.id) ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">
          {t('BrowseCategories')}
        </h2>
        {symptomCategories.map(category => (
          <div key={category.id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-50 rounded-lg mr-3">
                {category.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {category.symptoms.map(symptom => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`flex items-center justify-between p-3 rounded-lg min-h-[44px] ${
                    selectedSymptoms.includes(symptom.id)
                      ? 'bg-blue-50 border border-blue-200 whitespace-normal text-sm'
                      : 'border border-gray-200 hover:border-blue-300 whitespace-normal text-sm'
                  }`}
                >
                  <span className="break-words max-w-[75%]">{symptom.name}</span>
                  {selectedSymptoms.includes(symptom.id) ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">
        {tt('additionalDetails')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Age */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
            {tt('symptomChecker.age')}
          </label>
          <div className="relative">
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="0"
              max="120"
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 30"
            />
            <span className="absolute right-3 top-3 text-gray-500">years</span>
          </div>
        </div>

        {/* Gender */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
            {tt('symptomChecker.gender')}
          </label>
          <div className="grid grid-cols-3 gap-2">
              {['male', 'female', 'other'].map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`py-3 rounded-lg border ${
                  gender === g
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                {tt(`symptomChecker.${g}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {tt('symptomChecker.duration')}
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{tt('symptomChecker.selectDuration')}</option>
            <option value="hours">{tt('symptomChecker.hours')}</option>
            <option value="days">{tt('symptomChecker.days')}</option>
            <option value="weeks">{tt('symptomChecker.weeks')}</option>
            <option value="months">{tt('symptomChecker.months')}</option>
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {tt('symptomChecker.severity')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'mild', label: tt('symptomChecker.mild'), color: 'bg-green-100 text-green-800' },
              { value: 'moderate', label: tt('symptomChecker.moderate'), color: 'bg-yellow-100 text-yellow-800' },
              { value: 'severe', label: tt('symptomChecker.severe'), color: 'bg-orange-100 text-orange-800' },
              { value: 'emergency', label: tt('symptomChecker.emergency'), color: 'bg-red-100 text-red-800' }
            ].map(s => (
              <button
                key={s.value}
                onClick={() => setSeverity(s.value)}
                className={`py-3 rounded-lg border ${
                  severity === s.value
                    ? `border-blue-500 ${s.color}`
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <span className="text-sm whitespace-normal">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Symptoms Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">
          {tt('SelectedSymptoms')} ({selectedSymptoms.length})
        </h3>
        <div className="flex flex-wrap gap-2">
              {selectedSymptoms.map(symptomId => {
            const symptom = allSymptoms.find(s => s.id === symptomId);
            return (
              <span
                key={symptomId}
                className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-blue-300 text-blue-700 text-sm max-w-full break-words"
              >
                {symptom?.name}
                <button
                  onClick={() => toggleSymptom(symptomId)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      {analysisResult?.emergencyWarning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-3">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-bold text-red-900">
              {t('EmergencyWarning')}
            </h3>
          </div>
          <p className="text-red-700 mb-4">
            {t('SeekImmediate')}
          </p>
          <button className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
            🚨 {t('CallEmergency')}
          </button>
        </div>
      )}

      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('AnalysisResults')}
          </h2>
          <div className="flex space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Download className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Possible Conditions */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('PossibleConditions')}
          </h3>
          {analysisResult?.possibleConditions?.map((condition, index) => (
            <div key={index} className="border rounded-lg p-6 hover:shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{condition.name}</h4>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500">{t('symptomChecker.probability')}:</span>
                    <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {condition.probability}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  condition.severity === 'low' ? 'bg-green-100 text-green-800' :
                  condition.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {t(`symptomChecker.${condition.severity}`)}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{condition.description}</p>
              <div>
                <h5 className="font-medium text-gray-900 mb-2">{t('Recommendations')}:</h5>
                <ul className="space-y-2">
                  {condition.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Next Steps */}
        {analysisResult?.nextSteps && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              {t('NextSteps')}
            </h3>
            <div className="space-y-3">
              {analysisResult.nextSteps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-700 font-bold">{index + 1}</span>
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            <MessageSquare className="inline-block h-5 w-5 mr-2" />
            {t('chatWithDoctor')}
          </button>
          <button className="flex-1 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
            <Video className="inline-block h-5 w-5 mr-2" />
            {t('videoConsultation')}
          </button>
          <button
            onClick={() => {
              setStep(1);
              setSelectedSymptoms([]);
              setAnalysisResult(null);
            }}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            {t('NewCheck')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('SysmptomsChecker')}
          </h1>
          
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <React.Fragment key={stepNum}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {stepNum}
                  </div>
                  <div className="ml-2">
                    <div className="text-sm font-medium">
                      {t(`step${stepNum}`)}
                    </div>
                  </div>
                </div>
                {stepNum < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border p-6 sm:p-8">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Navigation Buttons */}
          {step < 3 && (
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {t('Back')}
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => {
                  if (step === 1) {
                    if (selectedSymptoms.length > 0) {
                      setStep(2);
                    } else {
                      alert(t('SelectAtLeastOne'));
                    }
                  } else if (step === 2) {
                    analyzeSymptoms();
                  }
                }}
                disabled={isAnalyzing}
                className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                  isAnalyzing
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('Analyzing')}
                  </>
                ) : step === 1 ? (
                  <>
                    {t('continue')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    {t('AnalyzeSymptoms')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 text-sm">
                {t('Disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;