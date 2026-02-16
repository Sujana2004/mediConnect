// src/pages/auth/DoctorRegScreen.jsx
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Stethoscope,
  GraduationCap,
  Building2,
  MapPin,
  Globe,
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  IndianRupee,
  Clock,
  Shield,
  Eye,
} from 'lucide-react';

// Constants
const SPECIALIZATIONS = [
  { value: 'general_physician', label: 'General Physician' },
  { value: 'cardiologist', label: 'Cardiologist' },
  { value: 'pediatrician', label: 'Pediatrician' },
  { value: 'gynecologist', label: 'Gynecologist' },
  { value: 'dermatologist', label: 'Dermatologist' },
  { value: 'ent', label: 'ENT Specialist' },
  { value: 'orthopedic', label: 'Orthopedic' },
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'neurologist', label: 'Neurologist' },
  { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'ayurveda', label: 'Ayurveda' },
  { value: 'homeopathy', label: 'Homeopathy' },
  { value: 'other', label: 'Other' },
];

const QUALIFICATIONS = [
  'MBBS',
  'MD',
  'MS',
  'MBBS, MD',
  'MBBS, MS',
  'BDS',
  'MDS',
  'BAMS',
  'BHMS',
  'DNB',
  'DM',
  'MCh',
  'Other',
];

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const DoctorRegScreen = ({ phone, onBack, onSubmit, isLoading: parentLoading, error: parentError }) => {
  const { t } = useTranslation();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Form data
  const [form, setForm] = useState({
    // Personal
    full_name: '',
    email: '',
    gender: '',
    date_of_birth: '',
    
    // Professional
    specialization: '',
    qualification: '',
    license_number: '',
    experience_years: '',
    
    // Practice
    hospital_name: '',
    hospital_address: '',
    city: '',
    state: '',
    pincode: '',
    
    // Additional
    languages: ['en'],
    bio: '',
    consultation_fee: '',
    
    // Documents
    license_document: null,
    degree_document: null,
    id_proof: null,
    profile_photo: null,
  });

  // Agreements
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeCertify, setAgreeCertify] = useState(false);

  // File previews
  const [filePreviews, setFilePreviews] = useState({
    license_document: null,
    degree_document: null,
    id_proof: null,
    profile_photo: null,
  });

  // File input refs
  const fileInputRefs = {
    license_document: useRef(null),
    degree_document: useRef(null),
    id_proof: useRef(null),
    profile_photo: useRef(null),
  };

  // Update form field
  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field error when user types
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  // Toggle language
  const toggleLanguage = (code) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter((l) => l !== code)
        : [...prev.languages, code],
    }));
  };

  // Handle file selection
  const handleFileSelect = (key, file) => {
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFieldErrors((prev) => ({
        ...prev,
        [key]: t('doctor.fileTooLarge', 'File size must be less than 5MB'),
      }));
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        [key]: t('doctor.invalidFileType', 'Only PDF, JPG, and PNG files are allowed'),
      }));
      return;
    }

    // Clear error
    setFieldErrors((prev) => ({ ...prev, [key]: null }));

    // Update form
    setForm((prev) => ({ ...prev, [key]: file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviews((prev) => ({ ...prev, [key]: e.target.result }));
      };
      reader.readAsDataURL(file);
    } else {
      // PDF preview placeholder
      setFilePreviews((prev) => ({ ...prev, [key]: 'pdf' }));
    }
  };

  // Remove file
  const removeFile = (key) => {
    setForm((prev) => ({ ...prev, [key]: null }));
    setFilePreviews((prev) => ({ ...prev, [key]: null }));
    if (fileInputRefs[key]?.current) {
      fileInputRefs[key].current.value = '';
    }
  };

  // Validate Step 1
  const validateStep1 = () => {
    const errors = {};

    if (!form.full_name?.trim()) {
      errors.full_name = t('doctor.nameRequired', 'Full name is required');
    }

    if (!form.email?.trim()) {
      errors.email = t('doctor.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = t('doctor.emailInvalid', 'Please enter a valid email');
    }

    if (!form.gender) {
      errors.gender = t('doctor.genderRequired', 'Gender is required');
    }

    if (!form.specialization) {
      errors.specialization = t('doctor.specializationRequired', 'Specialization is required');
    }

    if (!form.qualification?.trim()) {
      errors.qualification = t('doctor.qualificationRequired', 'Qualification is required');
    }

    if (!form.license_number?.trim()) {
      errors.license_number = t('doctor.licenseRequired', 'License number is required');
    }

    if (!form.experience_years) {
      errors.experience_years = t('doctor.experienceRequired', 'Experience is required');
    }

    if (!form.hospital_name?.trim()) {
      errors.hospital_name = t('doctor.hospitalRequired', 'Hospital/Clinic name is required');
    }

    if (!form.city?.trim()) {
      errors.city = t('doctor.cityRequired', 'City is required');
    }

    if (form.languages.length === 0) {
      errors.languages = t('doctor.languageRequired', 'Select at least one language');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Step 1 submit
  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
      setError('');
    }
  };

  // Handle final submit
  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    if (!agreeTerms) {
      setError(t('doctor.agreeTermsRequired', 'Please agree to the Terms of Service'));
      return;
    }

    if (!agreeCertify) {
      setError(t('doctor.certifyRequired', 'Please certify that the information is accurate'));
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add text fields
      formData.append('phone_number', phone);
      formData.append('full_name', form.full_name.trim());
      formData.append('email', form.email.trim());
      formData.append('gender', form.gender);
      if (form.date_of_birth) formData.append('date_of_birth', form.date_of_birth);
      formData.append('specialization', form.specialization);
      formData.append('qualification', form.qualification.trim());
      formData.append('license_number', form.license_number.trim());
      formData.append('experience_years', form.experience_years);
      formData.append('hospital_name', form.hospital_name.trim());
      if (form.hospital_address) formData.append('hospital_address', form.hospital_address.trim());
      formData.append('city', form.city.trim());
      if (form.state) formData.append('state', form.state.trim());
      if (form.pincode) formData.append('pincode', form.pincode.trim());
      formData.append('languages', JSON.stringify(form.languages));
      if (form.bio) formData.append('bio', form.bio.trim());
      formData.append('consultation_fee', form.consultation_fee || 0);

      // Add files
      if (form.license_document) {
        formData.append('license_document', form.license_document);
      }
      if (form.degree_document) {
        formData.append('degree_document', form.degree_document);
      }
      if (form.id_proof) {
        formData.append('id_proof', form.id_proof);
      }
      if (form.profile_photo) {
        formData.append('profile_photo', form.profile_photo);
      }

      // Submit
      const result = await onSubmit(formData);

      if (!result?.success) {
        setError(result?.error || t('doctor.registrationFailed', 'Registration failed'));
      }
    } catch (err) {
      setError(err.message || t('doctor.registrationFailed', 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format phone for display
  const formatPhone = (phoneNum) => {
    if (!phoneNum) return '';
    const digits = phoneNum.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phoneNum;
  };

  // Total steps
  const totalSteps = 2;

  // File upload component
  const FileUploadField = ({ name, label, required = false, accept = ".pdf,.jpg,.jpeg,.png" }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {form[name] ? (
        // File selected - show preview
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-shrink-0">
            {filePreviews[name] === 'pdf' ? (
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
            ) : filePreviews[name] ? (
              <img
                src={filePreviews[name]}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {form[name].name}
            </p>
            <p className="text-xs text-gray-500">
              {(form[name].size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeFile(name)}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // No file - show upload button
        <button
          type="button"
          onClick={() => fileInputRefs[name]?.current?.click()}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {t('doctor.clickToUpload', 'Click to upload')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF, JPG, PNG (max 5MB)
          </p>
        </button>
      )}

      <input
        ref={fileInputRefs[name]}
        type="file"
        accept={accept}
        onChange={(e) => handleFileSelect(name, e.target.files?.[0])}
        className="hidden"
      />

      {fieldErrors[name] && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button
          type="button"
          onClick={currentStep === 1 ? onBack : () => setCurrentStep(1)}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          aria-label={t('common.back', 'Back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {t('doctor.registrationTitle', 'Doctor Registration')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('doctor.step', 'Step {{current}} of {{total}}', { current: currentStep, total: totalSteps })}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-green-600">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">{t('doctor.secure', 'Secure')}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">
            {currentStep === 1
              ? t('doctor.step1Title', 'Personal & Professional')
              : t('doctor.step2Title', 'Documents & Verification')}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Step 1: Personal & Professional Details */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="p-4 space-y-6">
            {/* Phone (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('doctor.phone', 'Phone Number')}
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                <Phone className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700 font-medium">{formatPhone(phone)}</span>
                <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
              </div>
              <p className="mt-1 text-xs text-green-600">
                {t('doctor.phoneVerified', 'Phone number verified')}
              </p>
            </div>

            {/* Personal Details Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {t('doctor.personalDetails', 'Personal Details')}
              </h2>

              {/* Full Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.fullName', 'Full Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="Dr. Full Name"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.full_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.email', 'Email')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="doctor@example.com"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Gender */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.gender', 'Gender')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['male', 'female', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateField('gender', g)}
                      className={`py-3 px-4 border-2 rounded-lg text-sm font-medium transition-all ${
                        form.gender === g
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t(`doctor.gender_${g}`, g.charAt(0).toUpperCase() + g.slice(1))}
                    </button>
                  ))}
                </div>
                {fieldErrors.gender && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.gender}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.dateOfBirth', 'Date of Birth')}
                </label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Professional Details Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                {t('doctor.professionalDetails', 'Professional Details')}
              </h2>

              {/* Specialization */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.specialization', 'Specialization')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.specialization}
                  onChange={(e) => updateField('specialization', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.specialization ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">{t('doctor.selectSpecialization', 'Select Specialization')}</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.specialization && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.specialization}</p>
                )}
              </div>

              {/* Qualification */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.qualification', 'Qualification')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={form.qualification}
                    onChange={(e) => updateField('qualification', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.qualification ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">{t('doctor.selectQualification', 'Select Qualification')}</option>
                    {QUALIFICATIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.qualification && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.qualification}</p>
                )}
              </div>

              {/* License Number */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.licenseNumber', 'Medical License Number')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.license_number}
                  onChange={(e) => updateField('license_number', e.target.value)}
                  placeholder="MCI/State-XXXXX"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.license_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.license_number && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.license_number}</p>
                )}
              </div>

              {/* Experience Years */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.experience', 'Years of Experience')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.experience_years}
                    onChange={(e) => updateField('experience_years', e.target.value)}
                    placeholder="5"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.experience_years ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {fieldErrors.experience_years && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.experience_years}</p>
                )}
              </div>
            </div>

            {/* Practice Location Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {t('doctor.practiceLocation', 'Practice Location')}
              </h2>

              {/* Hospital Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.hospitalName', 'Hospital/Clinic Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.hospital_name}
                  onChange={(e) => updateField('hospital_name', e.target.value)}
                  placeholder="City Hospital"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.hospital_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.hospital_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.hospital_name}</p>
                )}
              </div>

              {/* Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.address', 'Address')}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={form.hospital_address}
                    onChange={(e) => updateField('hospital_address', e.target.value)}
                    placeholder="Full address"
                    rows={2}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('doctor.city', 'City')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('doctor.pincode', 'Pincode')}
                  </label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Languages */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.languages', 'Languages Spoken')} <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {LANGUAGES.map((lang) => (
                    <label
                      key={lang.code}
                      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        form.languages.includes(lang.code)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.languages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                        className="sr-only"
                      />
                      <Globe className="h-4 w-4" />
                      <span>{lang.nativeLabel}</span>
                      {form.languages.includes(lang.code) && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
                {fieldErrors.languages && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.languages}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('common.back', 'Back')}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all"
              >
                {t('doctor.continueToStep2', 'Continue to Step 2')}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Documents & Verification */}
        {currentStep === 2 && (
          <form onSubmit={handleFinalSubmit} className="p-4 space-y-6">
            {/* Verification Notice */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    {t('doctor.verificationNotice', 'Verification Required')}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('doctor.verificationMessage', 'Your account will be verified by our team within 24-48 hours. You will receive a notification once verified.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Photo */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                {t('doctor.profilePhoto', 'Profile Photo')}
              </h2>

              <div className="flex items-center gap-4">
                {filePreviews.profile_photo && filePreviews.profile_photo !== 'pdf' ? (
                  <div className="relative">
                    <img
                      src={filePreviews.profile_photo}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('profile_photo')}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.profile_photo?.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs mt-1">{t('doctor.addPhoto', 'Add Photo')}</span>
                  </button>
                )}
                <input
                  ref={fileInputRefs.profile_photo}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect('profile_photo', e.target.files?.[0])}
                  className="hidden"
                />
                <div className="text-sm text-gray-500">
                  <p>{t('doctor.photoHint', 'A professional photo helps patients recognize you')}</p>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                {t('doctor.uploadDocuments', 'Upload Documents')}
              </h2>

              <FileUploadField
                name="license_document"
                label={t('doctor.licenseDocument', 'Medical License Certificate')}
                required
              />

              <FileUploadField
                name="degree_document"
                label={t('doctor.degreeDocument', 'Educational Certificate')}
              />

              <FileUploadField
                name="id_proof"
                label={t('doctor.idProof', 'ID Proof (Aadhaar/PAN/Passport)')}
              />
            </div>

            {/* Additional Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('doctor.additionalInfo', 'Additional Information')}
              </h2>

              {/* Bio */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.bio', 'About You')}
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => updateField('bio', e.target.value.slice(0, 500))}
                  placeholder={t('doctor.bioPlaceholder', 'Brief description about your practice and expertise...')}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 text-right">
                  {form.bio.length}/500
                </p>
              </div>

              {/* Consultation Fee */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctor.consultationFee', 'Consultation Fee')}
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={form.consultation_fee}
                    onChange={(e) => updateField('consultation_fee', e.target.value)}
                    placeholder="500"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('doctor.feeHint', 'Enter 0 for free consultations')}
                </p>
              </div>
            </div>

            {/* Agreements */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {t('doctor.agreeTerms', 'I agree to the')}{' '}
                  <a href="/terms" className="text-blue-600 hover:underline">
                    {t('doctor.termsOfService', 'Terms of Service')}
                  </a>{' '}
                  {t('common.and', 'and')}{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    {t('doctor.privacyPolicy', 'Privacy Policy')}
                  </a>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeCertify}
                  onChange={(e) => setAgreeCertify(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {t('doctor.certifyAccuracy', 'I certify that all information provided is accurate and true')}
                </span>
              </label>
            </div>

            {/* Error Message */}
            {(error || parentError) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error || parentError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('common.back', 'Back')}
              </button>
              <button
                type="submit"
                disabled={!agreeTerms || !agreeCertify || isSubmitting || parentLoading}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(isSubmitting || parentLoading) ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('doctor.submitting', 'Submitting...')}
                  </>
                ) : (
                  t('doctor.submitForVerification', 'Submit for Verification')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DoctorRegScreen;