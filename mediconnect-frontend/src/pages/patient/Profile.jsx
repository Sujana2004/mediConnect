// src/pages/patient/Profile.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Edit2,
  Camera,
  Save,
  X,
  ChevronRight,
  Shield,
  Bell,
  Globe,
  HelpCircle,
  LogOut,
  Heart,
  Droplet,
  Activity,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  WifiOff,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Plus,
  Settings,
  Volume2
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  Input,
  TextArea,
  Select,
  Badge,
  Avatar,
  EmptyState,
  Loader,
  PhoneInput
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useVoice } from '../../hooks/useVoice';
import { authService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// ============================================================================
// HELPERS - Normalize backend response to frontend shape
// ============================================================================

/**
 * Normalizes the backend profile API response into a flat object
 * the frontend components expect.
 *
 * Backend returns:
 * {
 *   success: true,
 *   data: {
 *     user: { id, phone, first_name, last_name, profile_photo, ... },
 *     profile: { blood_group, height_cm, weight_kg, allergies, ... }
 *   }
 * }
 *
 * Frontend expects a single object like:
 * {
 *   full_name, phone_number, profile_picture, email, date_of_birth,
 *   gender, address, is_verified,
 *   health_profile: { blood_group, height, weight, allergies, ... }
 * }
 */
const normalizeProfileResponse = (apiData) => {
  if (!apiData) return null;

  // apiData is the value of response.data.data (the nested data key)
  const userData = apiData.user || apiData;
  const patientProfile = apiData.profile || {};

  return {
    id: userData.id,
    full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null,
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    phone_number: userData.phone || '',
    email: userData.email || '',
    date_of_birth: userData.date_of_birth || '',
    gender: userData.gender || '',
    address: userData.address || '',
    village: userData.village || '',
    mandal: userData.mandal || '',
    district: userData.district || '',
    state: userData.state || '',
    pincode: userData.pincode || '',
    profile_picture: userData.profile_photo 
    ? (userData.profile_photo.startsWith('http') 
        ? userData.profile_photo 
        : `${import.meta.env.VITE_API_URL || ''}${userData.profile_photo}`)
    : null,
    preferred_language: userData.preferred_language || 'te',
    is_verified: userData.is_phone_verified || false,
    is_profile_complete: userData.is_profile_complete || false,
    role: userData.role || 'patient',

    // Nested health profile mapped from PatientProfile model fields
    health_profile: {
      blood_group: patientProfile.blood_group || '',
      height: patientProfile.height_cm || null,
      weight: patientProfile.weight_kg || null,
      bmi: patientProfile.bmi || null,
      allergies: patientProfile.allergies || [],
      chronic_conditions: patientProfile.chronic_conditions || [],
      current_medications: patientProfile.current_medications || [],
      past_surgeries: patientProfile.past_surgeries || [],
      family_history: patientProfile.family_history || [],
      emergency_contact_name: patientProfile.emergency_contact_name || '',
      emergency_contact_phone: patientProfile.emergency_contact_phone || '',
      emergency_contact_relation: patientProfile.emergency_contact_relation || '',
      has_insurance: patientProfile.has_insurance || false,
      insurance_provider: patientProfile.insurance_provider || '',
      insurance_id: patientProfile.insurance_id || '',
      is_literate: patientProfile.is_literate ?? true,
      needs_voice_assistance: patientProfile.needs_voice_assistance || false,
      needs_large_text: patientProfile.needs_large_text || false,
      total_appointments: patientProfile.total_appointments || 0,
      total_consultations: patientProfile.total_consultations || 0,
    },
  };
};

/**
 * Normalizes helpers API response.
 *
 * Backend returns:
 * {
 *   success: true,
 *   data: [{ id, helper_name, helper_phone, relationship, ... }]
 * }
 *
 * Frontend expects:
 * [{ id, name, phone_number, relationship, can_book_appointments, can_view_records }]
 */
const normalizeHelper = (h) => ({
  id: h.id,
  name: h.helper_name || h.name || '',
  phone_number: h.helper_phone || h.phone_number || '',
  relationship: h.relationship || '',
  can_book_appointments: h.can_book_appointments ?? true,
  can_view_records: h.can_view_records ?? false,
  can_chat_with_doctor: h.can_chat_with_doctor ?? true,
  can_manage_medications: h.can_manage_medications ?? true,
  is_primary: h.is_primary || false,
  is_active: h.is_active ?? true,
});

const normalizeHelpers = (apiData) => {
  if (!apiData) return [];
  const list = Array.isArray(apiData) ? apiData : apiData.data || [];
  return list.map(normalizeHelper);
};

/**
 * Converts frontend form data to the shape the backend expects for profile update.
 *
 * Backend PATCH/PUT /auth/profile/ expects PatientUpdateSerializer fields:
 * User-level: first_name, last_name, email, date_of_birth, gender, address, village, ...
 * Patient-level: blood_group, height_cm, weight_kg, allergies (array), ...
 */
const buildPersonalUpdatePayload = (formData) => {
  const payload = {};
  const fullName = (formData.full_name || '').trim();

  if (fullName) {
    const parts = fullName.split(/\s+/);
    payload.first_name = parts[0] || '';
    payload.last_name = parts.slice(1).join(' ') || '';
  }

  if (formData.email !== undefined) payload.email = formData.email || null;
  if (formData.date_of_birth !== undefined) payload.date_of_birth = formData.date_of_birth || null;
  if (formData.gender !== undefined) payload.gender = formData.gender || '';
  if (formData.address !== undefined) payload.address = formData.address || '';

  return payload;
};

const buildHealthUpdatePayload = (formData) => {
  const payload = {};

  if (formData.blood_group !== undefined) payload.blood_group = formData.blood_group;
  if (formData.height !== undefined && formData.height !== null) payload.height_cm = formData.height;
  if (formData.weight !== undefined && formData.weight !== null) payload.weight_kg = formData.weight;
  if (formData.allergies !== undefined) payload.allergies = formData.allergies;
  if (formData.chronic_conditions !== undefined) payload.chronic_conditions = formData.chronic_conditions;
  if (formData.current_medications !== undefined) payload.current_medications = formData.current_medications;

  return payload;
};

/**
 * Converts frontend helper form data to backend expected shape.
 *
 * Backend POST /auth/helpers/ expects AddFamilyHelperSerializer:
 * helper_name, helper_phone, relationship, can_book_appointments, ...
 */
const buildHelperPayload = (formData) => ({
  helper_name: formData.name || '',
  helper_phone: formData.phone_number || '',
  relationship: formData.relationship || '',
  can_book_appointments: formData.can_book_appointments ?? true,
  can_view_records: formData.can_view_records ?? false,
});

// ============================================================================
// Safely unwrap API response – handles both { success, data } and raw shapes
// ============================================================================

const unwrapResponse = (response) => {
  // authService methods already return response.data (axios unwrap)
  // Backend wraps in { success, data } – we want the inner `data`
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    return response.data;
  }
  return response;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'unknown', label: 'Unknown' }
];

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'grandson', label: 'Grandson' },
  { value: 'granddaughter', label: 'Granddaughter' },
  { value: 'other', label: 'Other' }
];

// ============================================================================
// ERROR COMPONENT
// ============================================================================

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        {t('common.errorOccurred', 'Something went wrong')}
      </h3>
      <p className="text-gray-400 text-center mb-6 max-w-xs text-sm">
        {message || t('common.tryAgain', 'Please try again later')}
      </p>
      <Button variant="primary" onClick={onRetry} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !px-6">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

// ============================================================================
// OFFLINE STATE COMPONENT
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-400 text-center max-w-xs text-sm">
        {t('common.checkConnection', 'Please check your internet connection and try again')}
      </p>
    </div>
  );
};

// ============================================================================
// PROFILE HEADER COMPONENT
// ============================================================================

const ProfileHeader = ({ profile, onEditPhoto, isUploading }) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* Background */}
      <div className="h-44 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/[0.07]" />
        <div className="absolute top-16 -left-10 w-32 h-32 rounded-full bg-white/[0.05]" />
        <div className="absolute bottom-4 right-16 w-16 h-16 rounded-full bg-white/[0.06]" />
        <div className="absolute top-6 left-1/4 w-2 h-2 rounded-full bg-white/30" />
        <div className="absolute top-14 right-1/3 w-1.5 h-1.5 rounded-full bg-white/20" />
      </div>

      {/* Centered Card */}
      <div className="px-5 -mt-24 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg shadow-violet-900/10 pt-0 pb-5 px-5 border border-violet-100/30">
          {/* Centered Avatar */}
          <div className="flex justify-center -mt-14">
            <div className="relative">
              <div className="rounded-full shadow-lg shadow-violet-500/25 ring-4 ring-violet-500/80">
                <Avatar
                  src={profile?.profile_picture}
                  name={profile?.full_name || 'User'}
                  size="2xl"
                />
              </div>
              <button
                onClick={onEditPhoto}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-9 h-9 bg-violet-600 rounded-full shadow-lg shadow-violet-600/30 flex items-center justify-center text-white hover:bg-violet-700 disabled:opacity-50 transition-colors ring-[3px] ring-white"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Name & Phone together */}
          <div className="text-center mt-4">
            <h1 className="text-xl font-bold text-gray-900">
              {profile?.full_name || t('profile.unnamed', 'Unnamed User')}
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Phone className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-sm text-gray-500">
                {profile?.phone_number || t('profile.noPhone', 'No phone number')}
              </span>
            </div>
            {profile?.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full mt-2.5">
                <CheckCircle className="w-3 h-3" />
                {t('profile.verified', 'Verified')}
              </span>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-3 text-center border border-violet-100/50">
              <Droplet className="w-4 h-4 text-violet-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 font-medium">Blood</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.health_profile?.blood_group || '—'}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-3 text-center border border-pink-100/50">
              <Activity className="w-4 h-4 text-pink-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 font-medium">Height</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.health_profile?.height ? `${profile.health_profile.height}cm` : '—'}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-3 text-center border border-indigo-100/50">
              <Heart className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 font-medium">Weight</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{profile?.health_profile?.weight ? `${profile.health_profile.weight}kg` : '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INFO SECTION COMPONENT
// ============================================================================

const InfoSection = ({ title, icon: Icon, children, onEdit, isEditing, iconBg, iconColor }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100/80 shadow-sm shadow-gray-100/50">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg || 'bg-violet-50'}`}>
              <Icon className={`w-[18px] h-[18px] ${iconColor || 'text-violet-600'}`} />
            </div>
            <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          </div>
          {onEdit && !isEditing && (
            <button
              onClick={onEdit}
              className="text-violet-600 hover:bg-violet-50 p-2 rounded-xl transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// INFO ROW COMPONENT
// ============================================================================

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-b-0">
    <div className="flex items-center gap-2.5">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}
      <span className="text-sm text-gray-500">{label}</span>
    </div>
    <span className={`text-sm font-semibold text-right max-w-[50%] truncate ${value ? 'text-gray-900' : 'text-gray-300'}`}>
      {value || '—'}
    </span>
  </div>
);

// ============================================================================
// EDIT PERSONAL INFO MODAL
// ============================================================================

const EditPersonalInfoModal = ({ isOpen, onClose, profile, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        address: profile.address || ''
      });
      setErrors({});
    }
  }, [profile, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) {
      newErrors.full_name = t('validation.required', 'This field is required');
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail', 'Invalid email address');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.editPersonalInfo', 'Edit Personal Information')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Input
          label={t('profile.fullName', 'Full Name')}
          value={formData.full_name}
          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
          error={errors.full_name}
          required
          placeholder="Enter your full name"
        />
        <Input
          label={t('profile.email', 'Email')}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          error={errors.email}
          placeholder="Enter your email"
          leftIcon={<Mail className="w-4 h-4" />}
        />
        <Input
          label={t('profile.dateOfBirth', 'Date of Birth')}
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
          max={new Date().toISOString().split('T')[0]}
        />
        <Select
          label={t('profile.gender', 'Gender')}
          value={formData.gender}
          onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
          options={GENDER_OPTIONS}
          placeholder="Select gender"
        />
        <TextArea
          label={t('profile.address', 'Address')}
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          rows={3}
          placeholder="Enter your address"
        />
        <div className="flex gap-3 pt-3">
          <Button type="button" variant="outline" className="flex-1 !rounded-xl" onClick={onClose} disabled={isSaving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700" loading={isSaving}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// EDIT HEALTH INFO MODAL
// ============================================================================

const EditHealthInfoModal = ({ isOpen, onClose, healthProfile, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    blood_group: '',
    height: '',
    weight: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        blood_group: healthProfile?.blood_group || '',
        height: healthProfile?.height || '',
        weight: healthProfile?.weight || '',
        allergies: healthProfile?.allergies?.join(', ') || '',
        chronic_conditions: healthProfile?.chronic_conditions?.join(', ') || '',
        current_medications: healthProfile?.current_medications?.join(', ') || ''
      });
    }
  }, [healthProfile, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      chronic_conditions: formData.chronic_conditions ? formData.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      current_medications: formData.current_medications ? formData.current_medications.split(',').map(s => s.trim()).filter(Boolean) : []
    };
    onSave(processedData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.editHealthInfo', 'Edit Health Information')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Select
          label={t('profile.bloodGroup', 'Blood Group')}
          value={formData.blood_group}
          onChange={(e) => setFormData(prev => ({ ...prev, blood_group: e.target.value }))}
          options={BLOOD_GROUP_OPTIONS}
          placeholder="Select blood group"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('profile.height', 'Height (cm)')}
            type="number"
            value={formData.height}
            onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
            placeholder="170"
            min="50"
            max="250"
          />
          <Input
            label={t('profile.weight', 'Weight (kg)')}
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
            placeholder="70"
            min="20"
            max="300"
          />
        </div>
        <TextArea
          label={t('profile.allergies', 'Allergies')}
          value={formData.allergies}
          onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
          rows={2}
          placeholder="e.g., Penicillin, Peanuts (comma separated)"
        />
        <TextArea
          label={t('profile.chronicConditions', 'Chronic Conditions')}
          value={formData.chronic_conditions}
          onChange={(e) => setFormData(prev => ({ ...prev, chronic_conditions: e.target.value }))}
          rows={2}
          placeholder="e.g., Diabetes, Hypertension (comma separated)"
        />
        <TextArea
          label={t('profile.currentMedications', 'Current Medications')}
          value={formData.current_medications}
          onChange={(e) => setFormData(prev => ({ ...prev, current_medications: e.target.value }))}
          rows={2}
          placeholder="e.g., Metformin 500mg (comma separated)"
        />
        <div className="flex gap-3 pt-3">
          <Button type="button" variant="outline" className="flex-1 !rounded-xl" onClick={onClose} disabled={isSaving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700" loading={isSaving}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// HELPER CARD COMPONENT
// ============================================================================

const HelperCard = ({ helper, onEdit, onDelete, isDeleting }) => {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center justify-between py-3.5 border-b border-gray-50 last:border-b-0 ${isDeleting ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
          <span className="text-sm font-bold text-violet-600">
            {helper.name?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{helper.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="text-violet-500 font-medium capitalize">{helper.relationship}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            {helper.phone_number}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onEdit(helper)}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(helper)}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// ADD/EDIT HELPER MODAL
// ============================================================================

const HelperModal = ({ isOpen, onClose, helper, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    relationship: '',
    can_book_appointments: true,
    can_view_records: false
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (helper) {
        setFormData({
          name: String(helper.name || ''),
          phone_number: String(helper.phone_number || ''),
          relationship: String(helper.relationship || ''),
          can_book_appointments: helper.can_book_appointments ?? true,
          can_view_records: helper.can_view_records ?? false
        });
      } else {
        setFormData({
          name: '',
          phone_number: '',
          relationship: '',
          can_book_appointments: true,
          can_view_records: false
        });
      }
      setErrors({});
    }
  }, [helper, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('validation.required', 'This field is required');
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = t('validation.required', 'This field is required');
    }
    if (!formData.relationship) {
      newErrors.relationship = t('validation.required', 'This field is required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={helper ? t('profile.editHelper', 'Edit Helper') : t('profile.addHelper', 'Add Helper')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Input
          label={t('profile.helperName', 'Helper Name')}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          error={errors.name}
          required
          placeholder="Enter helper's name"
        />
        <PhoneInput
          label={t('profile.helperPhone', 'Phone Number')}
          value={formData.phone_number || ''}
          onChange={(e) => {
            const val = typeof e === 'string' ? e : (e?.target?.value || '');
            setFormData(prev => ({ ...prev, phone_number: val }));
          }}
          error={errors.phone_number}
          required
        />
        <Select
          label={t('profile.relationship', 'Relationship')}
          value={formData.relationship}
          onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
          options={RELATIONSHIP_OPTIONS}
          error={errors.relationship}
          required
          placeholder="Select relationship"
        />

        <div className="bg-violet-50/60 rounded-xl p-4 space-y-3 border border-violet-100/50">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Permissions</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.can_book_appointments}
              onChange={(e) => setFormData(prev => ({ ...prev, can_book_appointments: e.target.checked }))}
              className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                {t('profile.canBookAppointments', 'Can book appointments')}
              </span>
              <p className="text-xs text-gray-400">
                {t('profile.canBookAppointmentsDesc', 'Allow this person to book appointments on your behalf')}
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.can_view_records}
              onChange={(e) => setFormData(prev => ({ ...prev, can_view_records: e.target.checked }))}
              className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                {t('profile.canViewRecords', 'Can view health records')}
              </span>
              <p className="text-xs text-gray-400">
                {t('profile.canViewRecordsDesc', 'Allow this person to view your health records')}
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 pt-3">
          <Button type="button" variant="outline" className="flex-1 !rounded-xl" onClick={onClose} disabled={isSaving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700" loading={isSaving}>
            {helper ? t('common.save', 'Save') : t('common.add', 'Add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// PHOTO UPLOAD MODAL
// ============================================================================

const PhotoUploadModal = ({ isOpen, onClose, onUpload, onRemove, hasPhoto, isUploading }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreview(null);
    }
  }, [isOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.fileTooLarge', 'File size must be less than 5MB'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.invalidFileType', 'Please select an image file'));
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.changePhoto', 'Change Profile Photo')}
      size="sm"
    >
      <div className="space-y-4 pt-1">
        {preview ? (
          <div className="flex flex-col items-center">
            <img
              src={preview}
              alt="Preview"
              className="w-28 h-28 rounded-full object-cover border-4 border-violet-100"
            />
            <button
              onClick={() => { setSelectedFile(null); setPreview(null); }}
              className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium"
            >
              {t('common.remove', 'Remove')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <label className="w-28 h-28 rounded-full border-2 border-dashed border-violet-200 flex flex-col items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
              <Camera className="w-6 h-6 text-violet-300 mb-1" />
              <span className="text-xs text-violet-400 font-medium">{t('profile.selectPhoto', 'Select Photo')}</span>
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 mt-2">
              {t('profile.photoRequirements', 'JPG, PNG. Max 5MB')}
            </p>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          {hasPhoto && !preview && (
            <Button variant="danger" className="flex-1 !rounded-xl" onClick={onRemove} loading={isUploading}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('profile.removePhoto', 'Remove Photo')}
            </Button>
          )}
          {preview && (
            <>
              <Button variant="outline" className="flex-1 !rounded-xl" onClick={onClose} disabled={isUploading}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700" onClick={handleUpload} loading={isUploading}>
                <Save className="w-4 h-4 mr-2" />
                {t('common.save', 'Save')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// LOGOUT CONFIRMATION MODAL
// ============================================================================

const LogoutModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.logout', 'Logout')}
      size="sm"
    >
      <div className="space-y-4 pt-1">
        <p className="text-gray-500 text-sm">
          {t('profile.logoutConfirm', 'Are you sure you want to logout from your account?')}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 !rounded-xl" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" className="flex-1 !rounded-xl" onClick={onConfirm} loading={isLoading}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('profile.logout', 'Logout')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MENU ITEM COMPONENT
// ============================================================================

const MenuItem = ({ icon: Icon, label, description, onClick, variant = 'default', badge }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors
      ${variant === 'danger' ? 'hover:bg-red-50/60' : 'hover:bg-violet-50/30'}
      border-b border-gray-50 last:border-b-0
    `}
  >
    <div className={`
      w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
      ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-violet-50 text-violet-500'}
    `}>
      <Icon className="w-[18px] h-[18px]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${variant === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
        {label}
      </p>
      {description && (
        <p className="text-xs text-gray-400 truncate mt-0.5">{description}</p>
      )}
    </div>
    {badge && (
      <Badge variant="primary" size="sm">{badge}</Badge>
    )}
    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${variant === 'danger' ? 'text-red-300' : 'text-gray-300'}`} />
  </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentLanguage, supportedLanguages, changeLanguage } = useLanguage();
  const { voiceEnabled, toggleVoiceAssistance } = useVoice();

  // State
  const [profile, setProfile] = useState(null);
  const [helpers, setHelpers] = useState([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingHelperId, setDeletingHelperId] = useState(null);

  // Error state
  const [error, setError] = useState(null);

  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Modals
  const [showEditPersonal, setShowEditPersonal] = useState(false);
  const [showEditHealth, setShowEditHealth] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [editingHelper, setEditingHelper] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Online/Offline listener
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

  // Load data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  // API: Load all profile data
  const loadProfileData = async () => {
    if (!isOnline) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // authService.getProfile() calls GET /auth/profile/
      // which returns { success, data: { user: {...}, profile: {...} } }
      const profileResponse = await authService.getProfile();
      const rawData = unwrapResponse(profileResponse);
      const normalized = normalizeProfileResponse(rawData);
      setProfile(normalized);

      // Load helpers
      try {
        const helpersResponse = await authService.getHelpers();
        const rawHelpers = unwrapResponse(helpersResponse);
        setHelpers(normalizeHelpers(rawHelpers));
      } catch (helperErr) {
        console.log('No helpers yet:', helperErr);
        setHelpers([]);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // API: Update personal info
  const handleUpdatePersonalInfo = async (formData) => {
    setIsSaving(true);
    try {
      const payload = buildPersonalUpdatePayload(formData);
      const response = await authService.updateProfile(payload);
      const rawData = unwrapResponse(response);
      const normalized = normalizeProfileResponse(rawData);

      // Merge with existing profile to preserve health_profile
      setProfile(prev => ({
        ...prev,
        ...normalized,
        health_profile: normalized.health_profile || prev?.health_profile,
      }));

      toast.success(t('profile.updateSuccess', 'Profile updated successfully'));
      setShowEditPersonal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.updateError', 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  // API: Update health info
  const handleUpdateHealthInfo = async (formData) => {
    setIsSaving(true);
    try {
      const payload = buildHealthUpdatePayload(formData);
      // Health fields are part of the same profile update endpoint
      const response = await authService.updateProfile(payload);
      const rawData = unwrapResponse(response);
      const normalized = normalizeProfileResponse(rawData);

      setProfile(prev => ({
        ...prev,
        ...normalized,
      }));

      toast.success(t('profile.healthUpdateSuccess', 'Health information updated'));
      setShowEditHealth(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.updateError', 'Failed to update'));
    } finally {
      setIsSaving(false);
    }
  };

  // API: Upload photo
  const handlePhotoUpload = async (file) => {
    setIsUploading(true);
    try {
      const response = await authService.updateProfilePicture(file);
      const rawData = unwrapResponse(response);
      const normalized = normalizeProfileResponse(rawData);

      setProfile(prev => ({
        ...prev,
        profile_picture: normalized?.profile_picture || prev?.profile_picture,
      }));

      toast.success(t('profile.photoUpdated', 'Profile photo updated'));
      setShowPhotoModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.photoError', 'Failed to update photo'));
    } finally {
      setIsUploading(false);
    }
  };

  // API: Remove photo
  const handlePhotoRemove = async () => {
    setIsUploading(true);
    try {
      await authService.updateProfile({ profile_photo: null });
      setProfile(prev => ({ ...prev, profile_picture: null }));
      toast.success(t('profile.photoRemoved', 'Profile photo removed'));
      setShowPhotoModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.photoError', 'Failed to remove photo'));
    } finally {
      setIsUploading(false);
    }
  };

  // API: Add/Edit helper
  const handleSaveHelper = async (formData) => {
    setIsSaving(true);
    try {
      const payload = buildHelperPayload(formData);

      if (editingHelper) {
        const response = await authService.updateHelper(editingHelper.id, payload);
        const rawData = unwrapResponse(response);
        const normalized = normalizeHelper(rawData);
        setHelpers(prev => prev.map(h => h.id === editingHelper.id ? normalized : h));
        toast.success(t('profile.helperUpdated', 'Helper updated'));
      } else {
        const response = await authService.addHelper(payload);
        const rawData = unwrapResponse(response);
        const normalized = normalizeHelper(rawData);
        setHelpers(prev => [...prev, normalized]);
        toast.success(t('profile.helperAdded', 'Helper added'));
      }
      setShowHelperModal(false);
      setEditingHelper(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.helperError', 'Failed to save helper'));
    } finally {
      setIsSaving(false);
    }
  };

  // API: Delete helper
  const handleDeleteHelper = async (helper) => {
    setDeletingHelperId(helper.id);
    try {
      await authService.removeHelper(helper.id);
      setHelpers(prev => prev.filter(h => h.id !== helper.id));
      toast.success(t('profile.helperDeleted', 'Helper removed'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.helperDeleteError', 'Failed to remove helper'));
    } finally {
      setDeletingHelperId(null);
    }
  };

  // API: Logout
  const handleLogout = async () => {
    setIsSaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(t('profile.logoutError', 'Failed to logout'));
    } finally {
      setIsSaving(false);
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Calculate age
  const calculateAge = (dateString) => {
    if (!dateString) return null;
    try {
      const birthDate = parseISO(dateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} years`;
    } catch {
      return null;
    }
  };

  // Calculate BMI
  const calculateBMI = () => {
    const hp = profile?.health_profile;
    if (hp?.height && hp?.weight) {
      const heightM = hp.height / 100;
      const bmi = hp.weight / (heightM * heightM);
      return bmi.toFixed(1);
    }
    return null;
  };

  // Get current language name
  const getCurrentLanguageName = () => {
    const lang = supportedLanguages.find(l => l.code === currentLanguage);
    return lang?.nativeName || lang?.name || currentLanguage;
  };

  // Render content based on state
  const renderContent = () => {
    if (!isOnline) {
      return <OfflineState />;
    }

    if (isLoading) {
      return (
        <div className="flex justify-center py-16">
          <Loader size="lg" />
        </div>
      );
    }

    if (error) {
      return <ErrorState message={error} onRetry={loadProfileData} />;
    }

    if (!profile) {
      return (
        <EmptyState
          icon={User}
          title={t('profile.noProfile', 'Profile not found')}
          description={t('profile.noProfileDesc', 'Unable to load your profile information')}
          action={
            <Button variant="primary" onClick={loadProfileData} className="!bg-violet-600 hover:!bg-violet-700 !rounded-xl">
              {t('common.retry', 'Try Again')}
            </Button>
          }
        />
      );
    }

    const healthProfile = profile.health_profile;

    return (
      <>
        {/* Personal Information */}
        <InfoSection
          title={t('profile.personalInfo', 'Personal Information')}
          icon={User}
          onEdit={() => setShowEditPersonal(true)}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        >
          <div className="space-y-0">
            <InfoRow icon={Mail} label={t('profile.email', 'Email')} value={profile.email} />
            <InfoRow icon={Calendar} label={t('profile.dateOfBirth', 'Date of Birth')} value={formatDate(profile.date_of_birth)} />
            <InfoRow icon={User} label={t('profile.age', 'Age')} value={calculateAge(profile.date_of_birth)} />
            <InfoRow icon={User} label={t('profile.gender', 'Gender')} value={profile.gender ? t(`profile.${profile.gender}`, profile.gender) : null} />
            <InfoRow icon={MapPin} label={t('profile.address', 'Address')} value={profile.address} />
          </div>
        </InfoSection>

        {/* Health Information */}
        <InfoSection
          title={t('profile.healthInfo', 'Health Information')}
          icon={Heart}
          onEdit={() => setShowEditHealth(true)}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
        >
          <div className="space-y-0">
            <InfoRow icon={Droplet} label={t('profile.bloodGroup', 'Blood Group')} value={healthProfile?.blood_group} />
            <InfoRow icon={Activity} label={t('profile.height', 'Height')} value={healthProfile?.height ? `${healthProfile.height} cm` : null} />
            <InfoRow icon={Activity} label={t('profile.weight', 'Weight')} value={healthProfile?.weight ? `${healthProfile.weight} kg` : null} />
            <InfoRow icon={Activity} label={t('profile.bmi', 'BMI')} value={calculateBMI()} />
          </div>

          {/* Allergies */}
          {healthProfile?.allergies?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">{t('profile.allergies', 'Allergies')}</p>
              <div className="flex flex-wrap gap-1.5">
                {healthProfile.allergies.map((allergy, index) => (
                  <Badge key={index} variant="danger" size="sm" className="!rounded-lg !bg-red-50 !text-red-600 !border-red-100 !font-medium">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chronic Conditions */}
          {healthProfile?.chronic_conditions?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">{t('profile.chronicConditions', 'Chronic Conditions')}</p>
              <div className="flex flex-wrap gap-1.5">
                {healthProfile.chronic_conditions.map((condition, index) => (
                  <Badge key={index} variant="warning" size="sm" className="!rounded-lg !bg-amber-50 !text-amber-600 !border-amber-100 !font-medium">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </InfoSection>

        {/* Helpers / Family Members */}
        <InfoSection
          title={t('profile.helpers', 'Helpers & Family')}
          icon={Users}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        >
          {helpers.length > 0 ? (
            <div className="space-y-0">
              {helpers.map((helper) => (
                <HelperCard
                  key={helper.id}
                  helper={helper}
                  onEdit={(h) => { setEditingHelper(h); setShowHelperModal(true); }}
                  onDelete={handleDeleteHelper}
                  isDeleting={deletingHelperId === helper.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mx-auto mb-2.5">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {t('profile.noHelpers', 'No helpers added yet')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Add family members or caregivers
              </p>
            </div>
          )}
          <Button
            variant="outline"
            fullWidth
            className="mt-4 !rounded-xl !border-dashed !border-violet-200 !text-violet-600 hover:!bg-violet-50 hover:!border-violet-300 !font-medium"
            onClick={() => { setEditingHelper(null); setShowHelperModal(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('profile.addHelper', 'Add Helper')}
          </Button>
        </InfoSection>

        {/* Settings */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Settings
          </p>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm shadow-gray-100/50">
            <MenuItem icon={Globe} label={t('profile.language', 'Language')} description={getCurrentLanguageName()} onClick={() => navigate('/patient/settings?section=language')} />
            <MenuItem icon={Volume2} label={t('profile.voiceAssistance', 'Voice Assistance')} description={voiceEnabled ? t('common.on', 'On') : t('common.off', 'Off')} onClick={() => navigate('/patient/settings?section=voice')} />
            <MenuItem icon={Bell} label={t('profile.notifications', 'Notifications')} onClick={() => navigate('/patient/notifications')} />
            <MenuItem icon={Shield} label={t('profile.privacy', 'Privacy & Security')} onClick={() => navigate('/patient/settings?section=privacy')} />
            <MenuItem icon={Settings} label={t('profile.settings', 'All Settings')} onClick={() => navigate('/patient/settings')} />
            <MenuItem icon={HelpCircle} label={t('profile.help', 'Help & Support')} onClick={() => navigate('/patient/settings?section=help')} />
          </div>
        </div>

        {/* Logout */}
        <div className="mb-4">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm shadow-gray-100/50">
            <MenuItem
              icon={LogOut}
              label={t('profile.logout', 'Logout')}
              onClick={() => setShowLogoutModal(true)}
              variant="danger"
            />
          </div>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-gray-300 mb-8 font-medium">
          {t('profile.version', 'Version')} 1.0.0
        </p>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Header */}
      {profile && (
        <ProfileHeader
          profile={profile}
          onEditPhoto={() => setShowPhotoModal(true)}
          isUploading={isUploading}
        />
      )}

      {/* Content */}
      <div className="px-4 mt-5">
        {renderContent()}
      </div>

      {/* Modals */}
      <EditPersonalInfoModal
        isOpen={showEditPersonal}
        onClose={() => setShowEditPersonal(false)}
        profile={profile}
        onSave={handleUpdatePersonalInfo}
        isSaving={isSaving}
      />

      <EditHealthInfoModal
        isOpen={showEditHealth}
        onClose={() => setShowEditHealth(false)}
        healthProfile={profile?.health_profile}
        onSave={handleUpdateHealthInfo}
        isSaving={isSaving}
      />

      <HelperModal
        isOpen={showHelperModal}
        onClose={() => { setShowHelperModal(false); setEditingHelper(null); }}
        helper={editingHelper}
        onSave={handleSaveHelper}
        isSaving={isSaving}
      />

      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onUpload={handlePhotoUpload}
        onRemove={handlePhotoRemove}
        hasPhoto={!!profile?.profile_picture}
        isUploading={isUploading}
      />

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        isLoading={isSaving}
      />
    </div>
  );
};

export default Profile;