import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Pediatrician', 'Gynecologist', 'Dermatologist', 'ENT', 'Orthopedic', 'Other'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'hi', label: 'हिंदी' },
];

export default function DoctorRegScreen({ phone, onBack, onSubmit }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeCertify, setAgreeCertify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    gender: '',
    specialization: '',
    qualification: '',
    license_number: '',
    experience_years: '',
    hospital_name: '',
    address: '',
    city: '',
    languages: ['en'],
    bio: '',
    consultation_fee: '',
    license_file: null,
    degree_file: null,
    id_proof_file: null,
    profile_photo: null,
  });

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleLang = (value) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(value) ? f.languages.filter((x) => x !== value) : [...f.languages, value],
    }));
  };

  const step1Valid =
    form.first_name?.trim() &&
    form.email?.trim() &&
    form.gender &&
    form.specialization &&
    form.qualification?.trim() &&
    form.license_number?.trim() &&
    form.experience_years &&
    form.hospital_name?.trim() &&
    form.city?.trim() &&
    form.languages.length > 0;

  const handleSubmitStep1 = (e) => {
    e.preventDefault();
    if (!step1Valid) return;
    setStep(2);
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    if (!agreeTerms || !agreeCertify) {
      setError('Please agree to the terms and certify accuracy');
      return;
    }
    setError('');
    setLoading(true);
    const payload = {
      phone,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      gender: form.gender,
      specialization: form.specialization,
      qualification: form.qualification.trim(),
      license_number: form.license_number.trim(),
      experience_years: Number(form.experience_years) || 0,
      hospital_name: form.hospital_name.trim(),
      address: form.address.trim() || undefined,
      city: form.city.trim(),
      languages: form.languages,
      bio: form.bio.trim() || undefined,
      consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : 0,
    };
    const result = await onSubmit(payload);
    setLoading(false);
    if (!result?.success) setError(result?.error || 'Registration failed');
  };

  return (
    <div className="flex flex-col p-6 pb-8">
      <div className="flex items-center gap-4 mb-4">
        <button type="button" onClick={step === 1 ? onBack : () => setStep(1)} className="p-2 -ml-2 text-gray-600">←</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Doctor Registration</h1>
        <span className="text-sm text-gray-500">🌐 తెలుగు ▼</span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">Step {step} of 2: {step === 1 ? 'Personal & Professional' : 'Document Verification'}</p>
        <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-primary-600 rounded-full" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleSubmitStep1} className="flex-1">
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Personal Details</h2>
            <label className="block text-sm text-gray-600 mt-2">Full Name *</label>
            <input type="text" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="Dr. Full name" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Phone</label>
            <input type="text" value={phone} readOnly className="w-full py-2.5 px-3 border rounded-lg mt-1 bg-gray-50" />
            <label className="block text-sm text-gray-600 mt-2">Email *</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="doctor@example.com" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Gender *</label>
            <div className="flex gap-4 mt-1">
              {['male', 'female', 'other'].map((g) => (
                <label key={g} className="flex items-center gap-2">
                  <input type="radio" name="gender" checked={form.gender === g} onChange={() => update('gender', g)} />
                  <span className="capitalize">{g}</span>
                </label>
              ))}
            </div>
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Professional Details</h2>
            <label className="block text-sm text-gray-600 mt-2">Specialization *</label>
            <select value={form.specialization} onChange={(e) => update('specialization', e.target.value)} className="w-full py-2.5 px-3 border rounded-lg mt-1">
              <option value="">Select</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label className="block text-sm text-gray-600 mt-2">Qualification *</label>
            <input type="text" value={form.qualification} onChange={(e) => update('qualification', e.target.value)} placeholder="e.g. MBBS, MD, MS" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Medical License Number *</label>
            <input type="text" value={form.license_number} onChange={(e) => update('license_number', e.target.value)} placeholder="License/registration number" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Years of Experience *</label>
            <input type="number" min="0" value={form.experience_years} onChange={(e) => update('experience_years', e.target.value)} className="w-full py-2.5 px-3 border rounded-lg mt-1" />
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Practice Location</h2>
            <label className="block text-sm text-gray-600 mt-2">Hospital/Clinic Name *</label>
            <input type="text" value={form.hospital_name} onChange={(e) => update('hospital_name', e.target.value)} placeholder="Name" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Address</label>
            <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Address" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">City *</label>
            <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Preferred Languages *</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {LANGUAGES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2">
                  <input type="checkbox" checked={form.languages.includes(value)} onChange={() => toggleLang(value)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>
          <div className="flex gap-4">
            <button type="button" onClick={onBack} className="px-6 py-3 border rounded-xl">Back</button>
            <button type="submit" disabled={!step1Valid} className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium disabled:opacity-50">Continue to Step 2</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmitFinal} className="flex-1">
          <p className="text-sm text-amber-700 mb-4">Your account will be verified by our team within 24-48 hours.</p>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Upload Documents (optional for demo)</h2>
            <label className="block text-sm text-gray-600 mt-2">Medical License Certificate (PDF/JPG, max 5MB)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg" onChange={(e) => update('license_file', e.target.files?.[0])} className="w-full py-2 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Educational Certificate</label>
            <input type="file" accept=".pdf,.jpg,.jpeg" onChange={(e) => update('degree_file', e.target.files?.[0])} className="w-full py-2 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">ID Proof (Aadhaar/PAN/Passport)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg" onChange={(e) => update('id_proof_file', e.target.files?.[0])} className="w-full py-2 border rounded-lg mt-1" />
          </section>
          <section className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Additional Information</h2>
            <label className="block text-sm text-gray-600 mt-2">Bio (max 500 chars)</label>
            <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={3} className="w-full py-2.5 px-3 border rounded-lg mt-1" />
            <label className="block text-sm text-gray-600 mt-2">Consultation Fee (₹) — 0 for free</label>
            <input type="number" min="0" value={form.consultation_fee} onChange={(e) => update('consultation_fee', e.target.value)} className="w-full py-2.5 px-3 border rounded-lg mt-1" />
          </section>
          <label className="flex items-start gap-2 mb-2">
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <span className="text-sm">I agree to the Terms of Service and Privacy Policy</span>
          </label>
          <label className="flex items-start gap-2 mb-6">
            <input type="checkbox" checked={agreeCertify} onChange={(e) => setAgreeCertify(e.target.checked)} />
            <span className="text-sm">I certify that all information provided is accurate and true</span>
          </label>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex gap-4">
            <button type="button" onClick={() => setStep(1)} className="px-6 py-3 border rounded-xl">Back</button>
            <button type="submit" disabled={!agreeTerms || !agreeCertify || loading} className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
