import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const STATES = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Other'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
];
const CONDITIONS = [
  { id: 'diabetes', labelEn: 'Diabetes', labelTe: 'మధుమేహం' },
  { id: 'hypertension', labelEn: 'Hypertension / High BP', labelTe: 'రక్తపోటు' },
  { id: 'heart', labelEn: 'Heart Disease', labelTe: 'గుండె జబ్బు' },
  { id: 'asthma', labelEn: 'Asthma', labelTe: 'ఆస్తమా' },
  { id: 'thyroid', labelEn: 'Thyroid', labelTe: 'థైరాయిడ్' },
  { id: 'other', labelEn: 'Other', labelTe: 'ఇతర' },
];

export default function PatientRegScreen({ phone, onBack, onSubmit }) {
  const { t } = useTranslation();
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

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleCondition = (id) => {
    setForm((f) => ({
      ...f,
      medical_conditions: f.medical_conditions.includes(id)
        ? f.medical_conditions.filter((x) => x !== id)
        : [...f.medical_conditions, id],
    }));
  };

  const heightNum = Number(form.height) || 0;
  const weightNum = Number(form.weight) || 0;
  const bmi = heightNum && weightNum ? (weightNum / ((heightNum / 100) ** 2)).toFixed(1) : '';

  const step1Valid = form.first_name?.trim().length >= 2 && form.date_of_birth && form.gender && form.preferred_language;

  const handleSubmitStep1 = (e) => {
    e.preventDefault();
    if (!step1Valid) return;
    setStep(2);
  };

  const handleSubmitFinal = async (e) => {
    if (e) e.preventDefault();
    if (!agreeTerms) {
      setError('Please agree to Terms of Service and Privacy Policy');
      return;
    }
    setError('');
    setLoading(true);
    const payload = {
      phone,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      blood_group: form.blood_group || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state || undefined,
      pincode: form.pincode.replace(/\D/g, '').slice(0, 6) || undefined,
      preferred_language: form.preferred_language,
      height: heightNum || undefined,
      weight: weightNum || undefined,
      medical_conditions: form.medical_conditions.length ? form.medical_conditions : undefined,
other_condition: form.medical_conditions.includes('other') ? form.other_condition : undefined,
allergies: form.no_allergies ? [] : (form.allergies || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
    };
    const result = await onSubmit(payload);
    setLoading(false);
    if (!result?.success) setError(result?.error || 'Registration failed');
  };

  return (
    <div className="flex flex-col p-6 pb-8">
      <div className="flex items-center gap-4 mb-4">
        <button type="button" onClick={step === 1 ? onBack : () => setStep(1)} className="p-2 -ml-2 text-gray-600">←</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Patient Registration</h1>
        <span className="text-sm text-gray-500">🌐 తెలుగు ▼</span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">Step {step} of 2: {step === 1 ? 'Basic Information' : 'Health Information (Optional)'}</p>
        <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleSubmitStep1} className="flex-1">
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Personal Details</h2>
            <label className="block text-sm text-gray-600 mt-2">First Name *</label>
            <input type="text" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="Enter first name" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Last Name</label>
            <input type="text" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} placeholder="Optional" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Phone Number</label>
            <input type="text" value={phone} readOnly className="w-full py-2.5 px-3 border rounded-lg mt-1 bg-gray-50" />
            <label className="block text-sm text-gray-600 mt-2">Date of Birth *</label>
            <input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Gender *</label>
            <div className="flex gap-4 mt-1">
              {['male', 'female', 'other'].map((g) => (
                <label key={g} className="flex items-center gap-2">
                  <input type="radio" name="gender" checked={form.gender === g} onChange={() => update('gender', g)} />
                  <span className="capitalize">{g}</span>
                </label>
              ))}
            </div>
            <label className="block text-sm text-gray-600 mt-2">Blood Group</label>
            <select value={form.blood_group} onChange={(e) => update('blood_group', e.target.value)} className="w-full py-2.5 px-3 border rounded-lg mt-1">
              <option value="">Select</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Address</h2>
            <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="House No, Street, Area" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" className="w-full py-2.5 px-3 border rounded-lg mt-2" />
            <select value={form.state} onChange={(e) => update('state', e.target.value)} className="w-full py-2.5 px-3 border rounded-lg mt-2">
              <option value="">State</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input type="text" value={form.pincode} onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN (6 digits)" className="w-full py-2.5 px-3 border rounded-lg mt-2" />
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Language Preference</h2>
            {LANGUAGES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 mt-1">
                <input type="radio" name="lang" checked={form.preferred_language === value} onChange={() => update('preferred_language', value)} />
                <span>{label}</span>
              </label>
            ))}
          </section>
          <div className="flex gap-4">
            <button type="button" onClick={onBack} className="px-6 py-3 border rounded-xl">Back</button>
            <button type="submit" disabled={!step1Valid} className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium disabled:opacity-50">Continue to Step 2</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmitFinal} className="flex-1">
          <p className="text-sm text-gray-600 mb-4">This information helps us provide better care. You can skip and add later.</p>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Health Details</h2>
            <div className="flex gap-2">
              <input type="number" min="0" value={form.height} onChange={(e) => update('height', e.target.value)} placeholder="Height" className="flex-1 py-2.5 px-3 border rounded-lg" />
              <select className="w-24 py-2.5 px-2 border rounded-lg" defaultValue="cm"><option value="cm">cm</option></select>
            </div>
            <div className="flex gap-2 mt-2">
              <input type="number" min="0" value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="Weight" className="flex-1 py-2.5 px-3 border rounded-lg" />
              <select className="w-24 py-2.5 px-2 border rounded-lg" defaultValue="kg"><option value="kg">kg</option></select>
            </div>
            {bmi && <p className="text-sm text-gray-500 mt-1">BMI: {bmi}</p>}
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Medical Conditions</h2>
            {CONDITIONS.map(({ id, labelEn }) => (
              <label key={id} className="flex items-center gap-2 mt-1">
                <input type="checkbox" checked={form.medical_conditions.includes(id)} onChange={() => toggleCondition(id)} />
                <span>{labelEn}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 mt-2">
  <input type="checkbox" checked={form.no_allergies} onChange={(e) => update('no_allergies', e.target.checked)} />
  <span>None</span>
</label>
{form.medical_conditions.includes('other') && (
  <input 
    type="text" 
    value={form.other_condition} 
    onChange={(e) => update('other_condition', e.target.value)} 
    placeholder="Please specify other medical conditions" 
    className="w-full py-2.5 px-3 border rounded-lg mt-2" 
  />
)}
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Allergies</h2>
            <textarea value={form.allergies} onChange={(e) => update('allergies', e.target.value)} placeholder="E.g., Penicillin, Peanuts" rows={2} className="w-full py-2.5 px-3 border rounded-lg" disabled={form.no_allergies} />
          </section>
          <label className="flex items-start gap-2 mb-6">
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <span className="text-sm">I agree to the Terms of Service and Privacy Policy</span>
          </label>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex gap-4">
            <button type="button" onClick={() => setStep(1)} className="px-6 py-3 border rounded-xl">Back</button>
            <button type="button" onClick={handleSubmitFinal} className="px-6 py-3 border rounded-xl">Skip for now</button>
            <button type="submit" disabled={!agreeTerms || loading} className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium disabled:opacity-50">
              {loading ? 'Submitting...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
