
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Edit,
  X,
  Check,
  AlertCircle,
  Shield,
  Briefcase,
  GraduationCap,
  Building,
  Globe,
  Settings,
  Lock,
  Bell,
  LogOut,
  ChevronRight,
  Upload,
  Trash2,
  Stethoscope,
  Languages,
  IndianRupee,
  CheckCircle,
  Plus,
  Pencil,
  Star
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Input,
  TextArea,
  Select
} from '../../components/common';
import { formatDate } from '../../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Endocrinologist',
  'Gastroenterologist',
  'Neurologist',
  'Oncologist',
  'Ophthalmologist',
  'Orthopedic Surgeon',
  'Pediatrician',
  'Psychiatrist',
  'Pulmonologist',
  'Radiologist',
  'Urologist',
  'Other'
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' }
];

const APP_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Profile Header
const ProfileHeader = ({ profile, onEditPhoto, onEditProfile }) => {
  const { t } = useTranslation();

  return (
    <Card className="relative overflow-hidden">
      {/* Cover Background */}
      <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-700" />

      {/* Profile Content */}
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              name={`${profile?.first_name} ${profile?.last_name}`}
              src={profile?.avatar}
              size="2xl"
              className="ring-4 ring-white"
            />
            <button
              onClick={onEditPhoto}
              className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full text-white hover:bg-primary-700 transition-colors shadow-lg"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 sm:mb-2">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dr. {profile?.first_name} {profile?.last_name}
                </h1>
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Stethoscope className="w-4 h-4" />
                  {profile?.specialization || t('doctor.specialist')}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  {profile?.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{profile.rating.toFixed(1)}</span>
                      <span className="text-gray-500 text-sm">
                        ({profile.total_reviews || 0} {t('common.reviews')})
                      </span>
                    </div>
                  )}
                  {profile?.experience_years && (
                    <span className="text-gray-600 text-sm flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {profile.experience_years} {t('common.yearsExp')}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit className="w-4 h-4" />}
                onClick={onEditProfile}
              >
                {t('common.edit')}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {profile?.total_consultations || 0}
            </p>
            <p className="text-sm text-gray-500">{t('doctor.consultations')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {profile?.total_patients || 0}
            </p>
            <p className="text-sm text-gray-500">{t('doctor.patients')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {profile?.experience_years || 0}
            </p>
            <p className="text-sm text-gray-500">{t('common.yearsExp')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {profile?.rating?.toFixed(1) || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">{t('common.rating')}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Personal Information Section
const PersonalInfoSection = ({ profile, isEditing, formData, onChange, onSave, onCancel }) => {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            {t('doctor.personalInformation')}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button variant="primary" size="sm" onClick={onSave}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('common.firstName')}
            value={formData.first_name || ''}
            onChange={(e) => onChange('first_name', e.target.value)}
          />
          <Input
            label={t('common.lastName')}
            value={formData.last_name || ''}
            onChange={(e) => onChange('last_name', e.target.value)}
          />
          <Input
            label={t('common.email')}
            type="email"
            value={formData.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            disabled
          />
          <Input
            label={t('common.phone')}
            value={formData.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            disabled
          />
          <Select
            label={t('common.gender')}
            value={formData.gender || ''}
            onChange={(e) => onChange('gender', e.target.value)}
            options={[
              { value: 'male', label: t('common.male') },
              { value: 'female', label: t('common.female') },
              { value: 'other', label: t('common.other') }
            ]}
          />
          <Input
            label={t('common.dateOfBirth')}
            type="date"
            value={formData.date_of_birth || ''}
            onChange={(e) => onChange('date_of_birth', e.target.value)}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          {t('doctor.personalInformation')}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Mail className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('common.email')}</p>
            <p className="font-medium text-gray-900">{profile?.email || '-'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Phone className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('common.phone')}</p>
            <p className="font-medium text-gray-900">{profile?.phone || '-'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('common.gender')}</p>
            <p className="font-medium text-gray-900">
              {profile?.gender ? t(`common.${profile.gender}`) : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('common.dateOfBirth')}</p>
            <p className="font-medium text-gray-900">
              {profile?.date_of_birth ? formatDate(profile.date_of_birth, 'MMMM d, yyyy') : '-'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Professional Information Section
const ProfessionalInfoSection = ({ profile, isEditing, formData, onChange, onSave, onCancel }) => {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-600" />
            {t('doctor.professionalInformation')}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button variant="primary" size="sm" onClick={onSave}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={t('doctor.specialization')}
            value={formData.specialization || ''}
            onChange={(e) => onChange('specialization', e.target.value)}
            options={SPECIALIZATIONS.map(s => ({ value: s, label: s }))}
          />
          <Input
            label={t('doctor.experienceYears')}
            type="number"
            value={formData.experience_years || ''}
            onChange={(e) => onChange('experience_years', e.target.value)}
            min={0}
            max={60}
          />
          <Input
            label={t('doctor.registrationNumber')}
            value={formData.registration_number || ''}
            onChange={(e) => onChange('registration_number', e.target.value)}
          />
          <Input
            label={t('doctor.medicalCouncil')}
            value={formData.medical_council || ''}
            onChange={(e) => onChange('medical_council', e.target.value)}
            placeholder="e.g., Medical Council of India"
          />
          <Input
            label={t('doctor.consultationFee')}
            type="number"
            value={formData.consultation_fee || ''}
            onChange={(e) => onChange('consultation_fee', e.target.value)}
            leftIcon={<IndianRupee className="w-4 h-4" />}
          />
          <Input
            label={t('doctor.followUpFee')}
            type="number"
            value={formData.follow_up_fee || ''}
            onChange={(e) => onChange('follow_up_fee', e.target.value)}
            leftIcon={<IndianRupee className="w-4 h-4" />}
          />
          <div className="md:col-span-2">
            <TextArea
              label={t('doctor.about')}
              value={formData.about || ''}
              onChange={(e) => onChange('about', e.target.value)}
              rows={4}
              placeholder={t('doctor.aboutPlaceholder')}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" />
          {t('doctor.professionalInformation')}
        </h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Stethoscope className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('doctor.specialization')}</p>
              <p className="font-medium text-gray-900">{profile?.specialization || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('doctor.experience')}</p>
              <p className="font-medium text-gray-900">
                {profile?.experience_years ? `${profile.experience_years} ${t('common.years')}` : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('doctor.registrationNumber')}</p>
              <p className="font-medium text-gray-900">{profile?.registration_number || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('doctor.medicalCouncil')}</p>
              <p className="font-medium text-gray-900">{profile?.medical_council || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('doctor.consultationFee')}</p>
              <p className="font-medium text-gray-900">
                {profile?.consultation_fee ? `₹${profile.consultation_fee}` : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('doctor.followUpFee')}</p>
              <p className="font-medium text-gray-900">
                {profile?.follow_up_fee ? `₹${profile.follow_up_fee}` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        {profile?.about && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-2">{t('doctor.about')}</h4>
            <p className="text-gray-600">{profile.about}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

// Education & Qualifications
const EducationSection = ({ qualifications, onAdd, onEdit, onDelete }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-600" />
          {t('doctor.education')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
        >
          {t('common.add')}
        </Button>
      </div>

      {qualifications && qualifications.length > 0 ? (
        <div className="space-y-4">
          {qualifications.map((qual, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{qual.degree}</h4>
                  <p className="text-gray-600">{qual.institution}</p>
                  <p className="text-sm text-gray-500">{qual.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(qual)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(qual)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={t('doctor.noEducation')}
          description={t('doctor.addEducationDesc')}
          compact
          action={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onAdd}
            >
              {t('doctor.addEducation')}
            </Button>
          }
        />
      )}
    </Card>
  );
};

// Languages Section
const LanguagesSection = ({ languages, onEdit }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Languages className="w-5 h-5 text-primary-600" />
          {t('doctor.languagesSpoken')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      {languages && languages.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {languages.map((lang, index) => (
            <Badge key={index} variant="secondary" size="lg">
              {LANGUAGES.find(l => l.value === lang)?.label || lang}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">{t('doctor.noLanguagesAdded')}</p>
      )}
    </Card>
  );
};

// Settings Section
const SettingsSection = ({ 
  currentLanguage, 
  onLanguageChange, 
  onChangePassword, 
  onNotificationSettings, 
  onLogout 
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary-600" />
        {t('common.settings')}
      </h3>

      <div className="space-y-3">
        {/* Language */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t('common.language')}</p>
              <p className="text-sm text-gray-500">{t('common.selectLanguage')}</p>
            </div>
          </div>
          <Select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            options={APP_LANGUAGES.map(l => ({
              value: l.code,
              label: l.nativeName
            }))}
            className="w-32"
          />
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationSettings}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{t('common.notifications')}</p>
              <p className="text-sm text-gray-500">{t('doctor.manageNotifications')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Change Password */}
        <button
          onClick={onChangePassword}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{t('common.changePassword')}</p>
              <p className="text-sm text-gray-500">{t('doctor.updatePassword')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-red-700">{t('common.logout')}</p>
              <p className="text-sm text-red-500">{t('common.logoutDesc')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400" />
        </button>
      </div>
    </Card>
  );
};

// Edit Photo Modal
const EditPhotoModal = ({ isOpen, onClose, currentPhoto, onSave, isLoading }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setFile(null);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (file) {
      onSave(file);
    }
  }, [file, onSave]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setFile(null);
    onSave(null);
  }, [onSave]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.editPhoto')}
      size="sm"
    >
      <div className="text-center">
        <div className="mb-6">
          <Avatar
            src={preview || currentPhoto}
            name="Profile"
            size="2xl"
            className="mx-auto"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('common.upload')}
          </Button>
          {(preview || currentPhoto) && (
            <Button
              variant="outline"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleRemove}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {t('common.remove')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={!file}
        >
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
};

// Add Education Modal
const AddEducationModal = ({ isOpen, onClose, education, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    degree: '',
    institution: '',
    year: ''
  });

  // Reset form when modal opens or education changes
  useEffect(() => {
    if (isOpen) {
      if (education) {
        setFormData({
          degree: education.degree || '',
          institution: education.institution || '',
          year: education.year || ''
        });
      } else {
        setFormData({ degree: '', institution: '', year: '' });
      }
    }
  }, [education, isOpen]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={education ? t('doctor.editEducation') : t('doctor.addEducation')}
      size="md"
    >
      <div className="space-y-4">
        <Input
          label={t('doctor.degree')}
          value={formData.degree}
          onChange={(e) => handleChange('degree', e.target.value)}
          placeholder="e.g., MBBS, MD, MS"
        />
        <Input
          label={t('doctor.institution')}
          value={formData.institution}
          onChange={(e) => handleChange('institution', e.target.value)}
          placeholder="e.g., AIIMS Delhi"
        />
        <Input
          label={t('doctor.yearOfCompletion')}
          type="number"
          value={formData.year}
          onChange={(e) => handleChange('year', e.target.value)}
          placeholder="e.g., 2015"
          min={1970}
          max={new Date().getFullYear()}
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={!formData.degree || !formData.institution || !formData.year}
        >
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
};

// Edit Languages Modal
const EditLanguagesModal = ({ isOpen, onClose, selectedLanguages, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState([]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(selectedLanguages || []);
    }
  }, [selectedLanguages, isOpen]);

  const toggleLanguage = useCallback((langCode) => {
    setSelected(prev => {
      if (prev.includes(langCode)) {
        return prev.filter(l => l !== langCode);
      }
      return [...prev, langCode];
    });
  }, []);

  const handleSave = useCallback(() => {
    onSave(selected);
  }, [selected, onSave]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.editLanguages')}
      size="md"
    >
      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => toggleLanguage(lang.value)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              selected.includes(lang.value)
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{lang.label}</span>
              {selected.includes(lang.value) && (
                <CheckCircle className="w-5 h-5 text-primary-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
        >
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
};

// Logout Confirmation Modal
const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.logout')}
      size="sm"
    >
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-gray-700">{t('common.logoutConfirm')}</p>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={isLoading}
        >
          {t('common.logout')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorProfile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Edit modes
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});

  // Modals
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [educationToEdit, setEducationToEdit] = useState(null);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authService.getProfile();
      setProfile(response.data);
      setFormData(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(t('errors.failedToLoadProfile'));

      // Mock data
      const mockProfile = {
        id: 1,
        first_name: user?.first_name || 'John',
        last_name: user?.last_name || 'Smith',
        email: user?.email || 'dr.john@example.com',
        phone: user?.phone || '+91 98765 43210',
        gender: 'male',
        date_of_birth: '1980-05-15',
        avatar: null,
        specialization: 'General Physician',
        experience_years: 15,
        registration_number: 'MCI-12345',
        medical_council: 'Medical Council of India',
        consultation_fee: 500,
        follow_up_fee: 300,
        about: 'Experienced general physician with expertise in treating common ailments, chronic disease management, and preventive healthcare.',
        rating: 4.8,
        total_reviews: 256,
        total_consultations: 1520,
        total_patients: 890,
        qualifications: [
          { degree: 'MBBS', institution: 'AIIMS Delhi', year: '2005' },
          { degree: 'MD (General Medicine)', institution: 'PGIMER Chandigarh', year: '2009' }
        ],
        languages_spoken: ['en', 'hi', 'te']
      };
      setProfile(mockProfile);
      setFormData(mockProfile);
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handlers
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveSection = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await authService.updateProfile(formData);
      setProfile(formData);
      setEditingSection(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t('errors.failedToUpdateProfile'));
    } finally {
      setIsActionLoading(false);
    }
  }, [formData, t]);

  const handleCancelEdit = useCallback(() => {
    setFormData(profile);
    setEditingSection(null);
  }, [profile]);

  const handleSavePhoto = useCallback(async (file) => {
    try {
      setIsActionLoading(true);
      if (file) {
        await authService.updateProfilePicture(file);
      }
      setShowPhotoModal(false);
      fetchProfile();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(t('errors.failedToUploadPhoto'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchProfile, t]);

  const handleAddEducation = useCallback(() => {
    setEducationToEdit(null);
    setShowEducationModal(true);
  }, []);

  const handleEditEducation = useCallback((education) => {
    setEducationToEdit(education);
    setShowEducationModal(true);
  }, []);

  const handleSaveEducation = useCallback(async (educationData) => {
    try {
      setIsActionLoading(true);
      // Save education logic - would need a specific API endpoint
      const updatedQualifications = educationToEdit
        ? profile.qualifications.map(q => q === educationToEdit ? educationData : q)
        : [...(profile.qualifications || []), educationData];
      
      await authService.updateProfile({ qualifications: updatedQualifications });
      setShowEducationModal(false);
      setEducationToEdit(null);
      fetchProfile();
    } catch (err) {
      console.error('Error saving education:', err);
      setError(t('errors.failedToSaveEducation'));
    } finally {
      setIsActionLoading(false);
    }
  }, [educationToEdit, profile, fetchProfile, t]);

  const handleDeleteEducation = useCallback(async (education) => {
    try {
      const updatedQualifications = profile.qualifications.filter(q => q !== education);
      await authService.updateProfile({ qualifications: updatedQualifications });
      fetchProfile();
    } catch (err) {
      console.error('Error deleting education:', err);
      setError(t('errors.failedToDeleteEducation'));
    }
  }, [profile, fetchProfile, t]);

  const handleSaveLanguages = useCallback(async (languages) => {
    try {
      setIsActionLoading(true);
      await authService.updateProfile({ languages_spoken: languages });
      setProfile(prev => ({ ...prev, languages_spoken: languages }));
      setShowLanguagesModal(false);
    } catch (err) {
      console.error('Error saving languages:', err);
      setError(t('errors.failedToSaveLanguages'));
    } finally {
      setIsActionLoading(false);
    }
  }, [t]);

  const handleChangeLanguage = useCallback(async (langCode) => {
    try {
      await authService.changeLanguage({ language: langCode });
      i18n.changeLanguage(langCode);
    } catch (err) {
      console.error('Error changing language:', err);
    }
  }, [i18n]);

  const handleChangePassword = useCallback(() => {
    navigate('/doctor/settings/password');
  }, [navigate]);

  const handleNotificationSettings = useCallback(() => {
    navigate('/doctor/notifications/settings');
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setIsActionLoading(false);
    }
  }, [logout, navigate]);

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            {t('common.dismiss')}
          </Button>
        </div>
      )}

      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        onEditPhoto={() => setShowPhotoModal(true)}
        onEditProfile={() => setEditingSection('personal')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <PersonalInfoSection
            profile={profile}
            isEditing={editingSection === 'personal'}
            formData={formData}
            onChange={handleFormChange}
            onSave={handleSaveSection}
            onCancel={handleCancelEdit}
          />

          {/* Professional Information */}
          <ProfessionalInfoSection
            profile={profile}
            isEditing={editingSection === 'professional'}
            formData={formData}
            onChange={handleFormChange}
            onSave={handleSaveSection}
            onCancel={handleCancelEdit}
          />

          {/* Education */}
          <EducationSection
            qualifications={profile?.qualifications}
            onAdd={handleAddEducation}
            onEdit={handleEditEducation}
            onDelete={handleDeleteEducation}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Languages */}
          <LanguagesSection
            languages={profile?.languages_spoken}
            onEdit={() => setShowLanguagesModal(true)}
          />

          {/* Settings */}
          <SettingsSection
            currentLanguage={i18n.language}
            onLanguageChange={handleChangeLanguage}
            onChangePassword={handleChangePassword}
            onNotificationSettings={handleNotificationSettings}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <EditPhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        currentPhoto={profile?.avatar}
        onSave={handleSavePhoto}
        isLoading={isActionLoading}
      />

      <AddEducationModal
        isOpen={showEducationModal}
        onClose={() => {
          setShowEducationModal(false);
          setEducationToEdit(null);
        }}
        education={educationToEdit}
        onSave={handleSaveEducation}
        isLoading={isActionLoading}
      />

      <EditLanguagesModal
        isOpen={showLanguagesModal}
        onClose={() => setShowLanguagesModal(false)}
        selectedLanguages={profile?.languages_spoken}
        onSave={handleSaveLanguages}
        isLoading={isActionLoading}
      />

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default DoctorProfile;