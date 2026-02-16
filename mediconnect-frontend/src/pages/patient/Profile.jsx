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
import { authService, healthRecordsService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

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
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'other', label: 'Other' }
];

// ============================================================================
// ERROR COMPONENT
// ============================================================================

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.errorOccurred', 'Something went wrong')}
      </h3>
      <p className="text-gray-500 text-center mb-4 max-w-sm">
        {message || t('common.tryAgain', 'Please try again later')}
      </p>
      <Button variant="primary" onClick={onRetry}>
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
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center max-w-sm">
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
    <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-8">
      <div className="flex flex-col items-center">
        {/* Avatar with Edit Button */}
        <div className="relative mb-4">
          <Avatar
            src={profile?.profile_picture}
            name={profile?.full_name || 'User'}
            size="2xl"
            className="border-4 border-white shadow-lg"
          />
          <button
            onClick={onEditPhoto}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-primary-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Name & Info */}
        <h1 className="text-2xl font-bold mb-1">
          {profile?.full_name || t('profile.unnamed', 'Unnamed User')}
        </h1>
        <p className="text-primary-100 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          {profile?.phone_number || t('profile.noPhone', 'No phone number')}
        </p>
        
        {/* Verification Badge */}
        {profile?.is_verified && (
          <Badge variant="success" className="mt-2 bg-white/20 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('profile.verified', 'Verified')}
          </Badge>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// INFO SECTION COMPONENT
// ============================================================================

const InfoSection = ({ title, icon: Icon, children, onEdit, isEditing }) => {
  const { t } = useTranslation();

  return (
    <Card className="mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
          </div>
          {onEdit && !isEditing && (
            <button
              onClick={onEdit}
              className="text-primary-500 hover:text-primary-600 p-2 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </Card>
  );
};

// ============================================================================
// INFO ROW COMPONENT
// ============================================================================

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-3 border-b last:border-b-0">
    <div className="flex items-center gap-3 text-gray-500">
      {Icon && <Icon className="w-4 h-4" />}
      <span className="text-sm">{label}</span>
    </div>
    <span className="text-sm font-medium text-gray-900">
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
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isSaving}
          >
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
    if (healthProfile && isOpen) {
      setFormData({
        blood_group: healthProfile.blood_group || '',
        height: healthProfile.height || '',
        weight: healthProfile.weight || '',
        allergies: healthProfile.allergies?.join(', ') || '',
        chronic_conditions: healthProfile.chronic_conditions?.join(', ') || '',
        current_medications: healthProfile.current_medications?.join(', ') || ''
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={t('profile.bloodGroup', 'Blood Group')}
          value={formData.blood_group}
          onChange={(e) => setFormData(prev => ({ ...prev, blood_group: e.target.value }))}
          options={BLOOD_GROUP_OPTIONS}
          placeholder="Select blood group"
        />

        <div className="grid grid-cols-2 gap-4">
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

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isSaving}
          >
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
    <div className={`flex items-center justify-between py-3 border-b last:border-b-0 ${isDeleting ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar name={helper.name} size="sm" />
        <div>
          <p className="font-medium text-gray-900">{helper.name}</p>
          <p className="text-sm text-gray-500">{helper.relationship} • {helper.phone_number}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(helper)}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(helper)}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
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
          name: helper.name || '',
          phone_number: helper.phone_number || '',
          relationship: helper.relationship || '',
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
          value={formData.phone_number}
          onChange={(value) => setFormData(prev => ({ ...prev, phone_number: value }))}
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

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.can_book_appointments}
              onChange={(e) => setFormData(prev => ({ ...prev, can_book_appointments: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-700">
                {t('profile.canBookAppointments', 'Can book appointments')}
              </span>
              <p className="text-sm text-gray-500">
                {t('profile.canBookAppointmentsDesc', 'Allow this person to book appointments on your behalf')}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.can_view_records}
              onChange={(e) => setFormData(prev => ({ ...prev, can_view_records: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-700">
                {t('profile.canViewRecords', 'Can view health records')}
              </span>
              <p className="text-sm text-gray-500">
                {t('profile.canViewRecordsDesc', 'Allow this person to view your health records')}
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isSaving}
          >
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
      <div className="space-y-4">
        {preview ? (
          <div className="flex flex-col items-center">
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
            />
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
              }}
              className="mt-2 text-sm text-red-500 hover:text-red-600"
            >
              {t('common.remove', 'Remove')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <label className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">{t('profile.selectPhoto', 'Select Photo')}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-2">
              {t('profile.photoRequirements', 'JPG, PNG. Max 5MB')}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {hasPhoto && !preview && (
            <Button
              variant="danger"
              className="flex-1"
              onClick={onRemove}
              loading={isUploading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('profile.removePhoto', 'Remove Photo')}
            </Button>
          )}
          {preview && (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isUploading}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleUpload}
                loading={isUploading}
              >
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
      <div className="space-y-4">
        <p className="text-gray-600">
          {t('profile.logoutConfirm', 'Are you sure you want to logout from your account?')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            loading={isLoading}
          >
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
      w-full flex items-center gap-3 p-4 text-left transition-colors
      ${variant === 'danger' ? 'hover:bg-red-50' : 'hover:bg-gray-50'}
    `}
  >
    <div className={`
      w-10 h-10 rounded-full flex items-center justify-center
      ${variant === 'danger' ? 'bg-red-100' : 'bg-gray-100'}
    `}>
      <Icon className={`w-5 h-5 ${variant === 'danger' ? 'text-red-500' : 'text-gray-600'}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`font-medium ${variant === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
        {label}
      </p>
      {description && (
        <p className="text-sm text-gray-500 truncate">{description}</p>
      )}
    </div>
    {badge && (
      <Badge variant="primary" size="sm">{badge}</Badge>
    )}
    <ChevronRight className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-gray-400'}`} />
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

  // State - NO MOCK DATA
  const [profile, setProfile] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
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
      // Load user profile
      const profileResponse = await authService.getProfile();
      setProfile(profileResponse.data);

      // Load health profile
      try {
        const healthResponse = await healthRecordsService.getProfile();
        setHealthProfile(healthResponse.data);
      } catch (healthErr) {
        console.log('No health profile yet:', healthErr);
        setHealthProfile(null);
      }

      // Load helpers
      try {
        const helpersResponse = await authService.getHelpers();
        setHelpers(helpersResponse.data || []);
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
  const handleUpdatePersonalInfo = async (data) => {
    setIsSaving(true);
    try {
      const response = await authService.updateProfile(data);
      setProfile(prev => ({ ...prev, ...response.data }));
      toast.success(t('profile.updateSuccess', 'Profile updated successfully'));
      setShowEditPersonal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.updateError', 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  // API: Update health info
  const handleUpdateHealthInfo = async (data) => {
    setIsSaving(true);
    try {
      const response = await healthRecordsService.updateProfile(data);
      setHealthProfile(prev => ({ ...prev, ...response.data }));
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
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const response = await authService.updateProfile(formData);
      setProfile(prev => ({ ...prev, profile_picture: response.data.profile_picture }));
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
      await authService.updateProfile({ profile_picture: null });
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
  const handleSaveHelper = async (data) => {
    setIsSaving(true);
    try {
      if (editingHelper) {
        // Update existing helper
        const response = await authService.updateHelper(editingHelper.id, data);
        setHelpers(prev => prev.map(h => h.id === editingHelper.id ? response.data : h));
        toast.success(t('profile.helperUpdated', 'Helper updated'));
      } else {
        // Add new helper
        const response = await authService.addHelper(data);
        setHelpers(prev => [...prev, response.data]);
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
      await authService.deleteHelper(helper.id);
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
    if (healthProfile?.height && healthProfile?.weight) {
      const heightM = healthProfile.height / 100;
      const bmi = healthProfile.weight / (heightM * heightM);
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
        <div className="flex justify-center py-12">
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
            <Button variant="primary" onClick={loadProfileData}>
              {t('common.retry', 'Try Again')}
            </Button>
          }
        />
      );
    }

    return (
      <>
        {/* Personal Information */}
        <InfoSection
          title={t('profile.personalInfo', 'Personal Information')}
          icon={User}
          onEdit={() => setShowEditPersonal(true)}
        >
          <div className="space-y-0">
            <InfoRow
              icon={Mail}
              label={t('profile.email', 'Email')}
              value={profile.email}
            />
            <InfoRow
              icon={Calendar}
              label={t('profile.dateOfBirth', 'Date of Birth')}
              value={formatDate(profile.date_of_birth)}
            />
            <InfoRow
              icon={User}
              label={t('profile.age', 'Age')}
              value={calculateAge(profile.date_of_birth)}
            />
            <InfoRow
              icon={User}
              label={t('profile.gender', 'Gender')}
              value={profile.gender ? t(`profile.${profile.gender}`, profile.gender) : null}
            />
            <InfoRow
              icon={MapPin}
              label={t('profile.address', 'Address')}
              value={profile.address}
            />
          </div>
        </InfoSection>

        {/* Health Information */}
        <InfoSection
          title={t('profile.healthInfo', 'Health Information')}
          icon={Heart}
          onEdit={() => setShowEditHealth(true)}
        >
          <div className="space-y-0">
            <InfoRow
              icon={Droplet}
              label={t('profile.bloodGroup', 'Blood Group')}
              value={healthProfile?.blood_group}
            />
            <InfoRow
              icon={Activity}
              label={t('profile.height', 'Height')}
              value={healthProfile?.height ? `${healthProfile.height} cm` : null}
            />
            <InfoRow
              icon={Activity}
              label={t('profile.weight', 'Weight')}
              value={healthProfile?.weight ? `${healthProfile.weight} kg` : null}
            />
            <InfoRow
              icon={Activity}
              label={t('profile.bmi', 'BMI')}
              value={calculateBMI()}
            />
          </div>

          {/* Allergies */}
          {healthProfile?.allergies?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">{t('profile.allergies', 'Allergies')}</p>
              <div className="flex flex-wrap gap-2">
                {healthProfile.allergies.map((allergy, index) => (
                  <Badge key={index} variant="danger" size="sm">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chronic Conditions */}
          {healthProfile?.chronic_conditions?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">{t('profile.chronicConditions', 'Chronic Conditions')}</p>
              <div className="flex flex-wrap gap-2">
                {healthProfile.chronic_conditions.map((condition, index) => (
                  <Badge key={index} variant="warning" size="sm">
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
        >
          {helpers.length > 0 ? (
            <div className="space-y-0">
              {helpers.map((helper) => (
                <HelperCard
                  key={helper.id}
                  helper={helper}
                  onEdit={(h) => {
                    setEditingHelper(h);
                    setShowHelperModal(true);
                  }}
                  onDelete={handleDeleteHelper}
                  isDeleting={deletingHelperId === helper.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('profile.noHelpers', 'No helpers added yet')}
            </p>
          )}
          <Button
            variant="outline"
            fullWidth
            className="mt-4"
            onClick={() => {
              setEditingHelper(null);
              setShowHelperModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('profile.addHelper', 'Add Helper')}
          </Button>
        </InfoSection>

        {/* Settings & Actions */}
        <Card className="mb-4 overflow-hidden">
          <MenuItem
            icon={Globe}
            label={t('profile.language', 'Language')}
            description={getCurrentLanguageName()}
            onClick={() => navigate('/patient/settings?section=language')}
          />
          <MenuItem
            icon={Volume2}
            label={t('profile.voiceAssistance', 'Voice Assistance')}
            description={voiceEnabled ? t('common.on', 'On') : t('common.off', 'Off')}
            onClick={() => navigate('/patient/settings?section=voice')}
          />
          <MenuItem
            icon={Bell}
            label={t('profile.notifications', 'Notifications')}
            onClick={() => navigate('/patient/notifications')}
          />
          <MenuItem
            icon={Shield}
            label={t('profile.privacy', 'Privacy & Security')}
            onClick={() => navigate('/patient/settings?section=privacy')}
          />
          <MenuItem
            icon={Settings}
            label={t('profile.settings', 'All Settings')}
            onClick={() => navigate('/patient/settings')}
          />
          <MenuItem
            icon={HelpCircle}
            label={t('profile.help', 'Help & Support')}
            onClick={() => navigate('/patient/settings?section=help')}
          />
        </Card>

        {/* Logout */}
        <Card className="mb-4 overflow-hidden">
          <MenuItem
            icon={LogOut}
            label={t('profile.logout', 'Logout')}
            onClick={() => setShowLogoutModal(true)}
            variant="danger"
          />
        </Card>

        {/* App Version */}
        <p className="text-center text-sm text-gray-400 mb-8">
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
      <div className="p-4">
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
        healthProfile={healthProfile}
        onSave={handleUpdateHealthInfo}
        isSaving={isSaving}
      />

      <HelperModal
        isOpen={showHelperModal}
        onClose={() => {
          setShowHelperModal(false);
          setEditingHelper(null);
        }}
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