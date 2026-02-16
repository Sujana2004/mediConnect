import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const STATES = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Other'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
];
const CONDITIONS = [
  { id: 'diabetes', labelKey: 'conditions.diabetes', labelEn: 'Diabetes' },
  { id: 'hypertension', labelKey: 'conditions.hypertension', labelEn: 'Hypertension / High BP' },
  { id: 'heart', labelKey: 'conditions.heart', labelEn: 'Heart Disease' },
  { id: 'asthma', labelKey: 'conditions.asthma', labelEn: 'Asthma' },
  { id: 'thyroid', labelKey: 'conditions.thyroid', labelEn: 'Thyroid' },
  { id: 'other', labelKey: 'conditions.other', labelEn: 'Other' },
];

export default function PatientRegScreen({ phone, onBack, onSubmit }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    preferred_language: 'te',
    height: '',
    weight: '',
    medical_conditions: [],
    other_condition: '',
    allergies: '',
    no_allergies: false,
  });

  // Get today's date for max date validation
  const today = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear error when user makes changes
    if (error) setError('');
  };

  const toggleCondition = (id) => {
    setForm((f) => ({
      ...f,
      medical_conditions: f.medical_conditions.includes(id)
        ? f.medical_conditions.filter((x) => x !== id)
        : [...f.medical_conditions, id],
    }));
    if (error) setError('');
  };

  const handleLanguageChange = (langCode) => {
    update('preferred_language', langCode);
    // Also change the app language
    i18n.changeLanguage(langCode);
  };

  const heightNum = Number(form.height) || 0;
  const weightNum = Number(form.weight) || 0;
  const bmi = heightNum && weightNum ? (weightNum / ((heightNum / 100) ** 2)).toFixed(1) : '';

  const getBMICategory = (bmiValue) => {
    const num = parseFloat(bmiValue);
    if (!num) return '';
    if (num < 18.5) return t('bmi.underweight', 'Underweight');
    if (num < 25) return t('bmi.normal', 'Normal');
    if (num < 30) return t('bmi.overweight', 'Overweight');
    return t('bmi.obese', 'Obese');
  };

  const step1Valid = 
    form.first_name?.trim().length >= 2 && 
    form.date_of_birth && 
    form.gender && 
    form.preferred_language;

  const handleSubmitStep1 = (e) => {
    e.preventDefault();
    if (!step1Valid) return;
    setStep(2);
  };

  const handleSubmitFinal = async (e, skipOptional = false) => {
    if (e) e.preventDefault();
    
    if (!agreeTerms) {
      setError(t('registration.agreeTermsError', 'Please agree to Terms of Service and Privacy Policy'));
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const payload = {
        phone,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        blood_group: form.blood_group || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state || undefined,
        pincode: form.pincode.replace(/\D/g, '').slice(0, 6) || undefined,
        preferred_language: form.preferred_language,
      };

      // Only include health details if not skipping
      if (!skipOptional) {
        if (heightNum) payload.height = heightNum;
        if (weightNum) payload.weight = weightNum;
        if (form.medical_conditions.length) {
          payload.medical_conditions = form.medical_conditions;
        }
        if (form.medical_conditions.includes('other') && form.other_condition.trim()) {
          payload.other_condition = form.other_condition.trim();
        }
        if (form.no_allergies) {
          payload.allergies = [];
        } else if (form.allergies.trim()) {
          payload.allergies = form.allergies
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      const result = await onSubmit(payload);
      
      if (!result?.success) {
        setError(result?.error || t('registration.failed', 'Registration failed'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('registration.networkError', 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep(1);
    }
  };

  return (
    <div className="flex flex-col p-6 pb-8 min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          type="button" 
          onClick={handleBack} 
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={t('common.back', 'Go back')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {t('registration.patientTitle', 'Patient Registration')}
        </h1>
        {/* Language Selector */}
        <select
          value={form.preferred_language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="text-sm text-gray-600 bg-transparent border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={t('common.selectLanguage', 'Select language')}
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          {t('registration.step', 'Step')} {step} {t('registration.of', 'of')} 2: {' '}
          {step === 1 
            ? t('registration.basicInfo', 'Basic Information') 
            : t('registration.healthInfo', 'Health Information (Optional)')}
        </p>
        <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-primary-600 rounded-full transition-all duration-300" 
            style={{ width: step === 1 ? '50%' : '100%' }} 
          />
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <form onSubmit={handleSubmitStep1} className="flex-1 flex flex-col">
          <div className="flex-1 space-y-6">
            {/* Personal Details Section */}
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">
                {t('registration.personalDetails', 'Personal Details')}
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="first_name" className="block text-sm text-gray-600">
                    {t('registration.firstName', 'First Name')} *
                  </label>
                  <input 
                    id="first_name"
                    type="text" 
                    value={form.first_name} 
                    onChange={(e) => update('first_name', e.target.value)} 
                    placeholder={t('registration.enterFirstName', 'Enter first name')}
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                    required
                    minLength={2}
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm text-gray-600">
                    {t('registration.lastName', 'Last Name')}
                  </label>
                  <input 
                    id="last_name"
                    type="text" 
                    value={form.last_name} 
                    onChange={(e) => update('last_name', e.target.value)} 
                    placeholder={t('registration.optional', 'Optional')}
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm text-gray-600">
                    {t('registration.phoneNumber', 'Phone Number')}
                  </label>
                  <input 
                    id="phone"
                    type="text" 
                    value={phone} 
                    readOnly 
                    className="w-full py-2.5 px-3 border border-gray-200 rounded-lg mt-1 bg-gray-50 text-gray-600 cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm text-gray-600">
                    {t('registration.dateOfBirth', 'Date of Birth')} *
                  </label>
                  <input 
                    id="date_of_birth"
                    type="date" 
                    value={form.date_of_birth} 
                    onChange={(e) => update('date_of_birth', e.target.value)} 
                    max={today}
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    {t('registration.gender', 'Gender')} *
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: 'male', label: t('registration.male', 'Male') },
                      { value: 'female', label: t('registration.female', 'Female') },
                      { value: 'other', label: t('registration.other', 'Other') },
                    ].map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="gender" 
                          value={value}
                          checked={form.gender === value} 
                          onChange={() => update('gender', value)} 
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="blood_group" className="block text-sm text-gray-600">
                    {t('registration.bloodGroup', 'Blood Group')}
                  </label>
                  <select 
                    id="blood_group"
                    value={form.blood_group} 
                    onChange={(e) => update('blood_group', e.target.value)} 
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('registration.select', 'Select')}</option>
                    {BLOOD_GROUPS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Address Section */}
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">
                {t('registration.address', 'Address')}
              </h2>
              
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={form.address} 
                  onChange={(e) => update('address', e.target.value)} 
                  placeholder={t('registration.addressPlaceholder', 'House No, Street, Area')}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                />
                
                <input 
                  type="text" 
                  value={form.city} 
                  onChange={(e) => update('city', e.target.value)} 
                  placeholder={t('registration.city', 'City')}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                />
                
                <select 
                  value={form.state} 
                  onChange={(e) => update('state', e.target.value)} 
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{t('registration.state', 'State')}</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                
                <input 
                  type="text" 
                  value={form.pincode} 
                  onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  placeholder={t('registration.pincode', 'PIN (6 digits)')}
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                />
              </div>
            </section>

            {/* Language Preference Section */}
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">
                {t('registration.languagePreference', 'Language Preference')}
              </h2>
              
              <div className="space-y-2">
                {LANGUAGES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="lang" 
                      value={value}
                      checked={form.preferred_language === value} 
                      onChange={() => handleLanguageChange(value)} 
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Step 1 Buttons */}
          <div className="flex gap-4 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={onBack} 
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common.back', 'Back')}
            </button>
            <button 
              type="submit" 
              disabled={!step1Valid} 
              className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
            >
              {t('registration.continueStep2', 'Continue to Step 2')}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Health Information */}
      {step === 2 && (
        <form onSubmit={handleSubmitFinal} className="flex-1 flex flex-col">
          <p className="text-sm text-gray-600 mb-4">
            {t('registration.healthInfoNote', 'This information helps us provide better care. You can skip and add later.')}
          </p>
          
          <div className="flex-1 space-y-6">
            {/* Health Details Section */}
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">
                {t('registration.healthDetails', 'Health Details')}
              </h2>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="height" className="block text-sm text-gray-600 mb-1">
                      {t('registration.height', 'Height')}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        id="height"
                        type="number" 
                        min="0" 
                        max="300"
                        value={form.height} 
                        onChange={(e) => update('height', e.target.value)} 
                        placeholder={t('registration.heightPlaceholder', 'Height')}
                        className="flex-1 py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                      />
                      <span className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        cm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="weight" className="block text-sm text-gray-600 mb-1">
                      {t('registration.weight', 'Weight')}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        id="weight"
                        type="number" 
                        min="0" 
                        max="500"
                        value={form.weight} 
                        onChange={(e) => update('weight', e.target.value)} 
                        placeholder={t('registration.weightPlaceholder', 'Weight')}
                        className="flex-1 py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                      />
                      <span className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                {bmi && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      {t('registration.bmi', 'BMI')}: <span className="font-medium text-gray-900">{bmi}</span>
                      <span className="ml-2 text-gray-500">({getBMICategory(bmi)})</span>
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Medical Conditions Section */}
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">
                {t('registration.medicalConditions', 'Medical Conditions')}
              </h2>
              
              <div className="space-y-2">
                {CONDITIONS.map(({ id, labelEn, labelKey }) => (
                  <label key={id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={form.medical_conditions.includes(id)} 
                      onChange={() => toggleCondition(id)} 
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-gray-700">{t(labelKey, labelEn)}</span>
                  </label>
                ))}
              </div>

              {form.medical_conditions.includes('other') && (
                <input 
                  type="text" 
                  value={form.other_condition} 
                  onChange={(e) => update('other_condition', e.target.value)} 
                  placeholder={t('registration.specifyOther', 'Please specify other medical conditions')}
                  className="w-full py-2.5 px-3 border border-gray-300 rounded-lg mt-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                />
              )}
            </section>

            {/* Allergies Section */}
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">
                {t('registration.allergies', 'Allergies')}
              </h2>
              
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 mb-3">
                <input 
                  type="checkbox" 
                  checked={form.no_allergies} 
                  onChange={(e) => {
                    update('no_allergies', e.target.checked);
                    if (e.target.checked) {
                      update('allergies', '');
                    }
                  }} 
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-gray-700">{t('registration.noAllergies', 'No known allergies')}</span>
              </label>

              <textarea 
                value={form.allergies} 
                onChange={(e) => update('allergies', e.target.value)} 
                placeholder={t('registration.allergiesPlaceholder', 'E.g., Penicillin, Peanuts (separate with commas)')}
                rows={2} 
                disabled={form.no_allergies}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" 
              />
            </section>

            {/* Terms Agreement */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
              <input 
                type="checkbox" 
                checked={agreeTerms} 
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (error) setError('');
                }} 
                className="w-4 h-4 mt-0.5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                {t('registration.agreeTerms', 'I agree to the')}{' '}
                <a href="/terms" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">
                  {t('registration.termsOfService', 'Terms of Service')}
                </a>{' '}
                {t('registration.and', 'and')}{' '}
                <a href="/privacy" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">
                  {t('registration.privacyPolicy', 'Privacy Policy')}
                </a>
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Step 2 Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              disabled={loading}
              className="px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t('common.back', 'Back')}
            </button>
            <button 
              type="button" 
              onClick={(e) => handleSubmitFinal(e, true)} 
              disabled={!agreeTerms || loading}
              className="px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('registration.skip', 'Skip')}
            </button>
            <button 
              type="submit" 
              disabled={!agreeTerms || loading} 
              className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('registration.submitting', 'Submitting...')}
                </>
              ) : (
                t('registration.complete', 'Complete Registration')
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}