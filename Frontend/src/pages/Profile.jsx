import React, { useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authAPI, notificationsAPI } from '../services/api';
import {
  setUser as saveUserToStorage,
  getUser as getUserFromStorage,
  updateUser as updateUserInStorage,
  getUserRole,
  isDoctor as checkIsDoctor,
  isPatient as checkIsPatient,
} from '../hooks/storage';
import { useVoiceOutput } from '../hooks/useVoiceOutput';
import { useLanguage } from '../hooks/useLanguage';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Heart,
  FileText,
  Settings,
  Camera,
  Edit2,
  Save,
  X,
  LogOut,
  Stethoscope,
  Award,
  Users,
  Clock,
  Download,
  Globe,
  Volume2,
  VolumeX,
  UserPlus,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'];

const PROFILE_TABS = {
  personal: {
    id: 'personal',
    icon: User,
    labels: {
      en: 'Personal Info',
      hi: 'व्यक्तिगत जानकारी',
      te: 'వ్యక్తిగత సమాచారం',
    },
  },
  notifications: {
    id: 'notifications',
    icon: Bell,
    labels: {
      en: 'Notifications',
      hi: 'सूचनाएं',
      te: 'నోటిఫికేషన్లు',
    },
  },
  preferences: {
    id: 'preferences',
    icon: Settings,
    labels: {
      en: 'Preferences',
      hi: 'प्राथमिकताएं',
      te: 'ప్రాధాన్యతలు',
    },
  },
  security: {
    id: 'security',
    icon: Shield,
    labels: {
      en: 'Security & Privacy',
      hi: 'सुरक्षा और गोपनीयता',
      te: 'భద్రత & గోప్యత',
    },
  },
};

// ============================================
// TOAST NOTIFICATION (replaces alert())
// ============================================
const Toast = memo(({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertTriangle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Bell className="h-5 w-5 text-blue-500" />,
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full border rounded-lg p-4 shadow-lg 
        ${bgColors[type]} animate-slide-in`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{icons[type]}</div>
        <p className="ml-3 text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 opacity-70 hover:opacity-100"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

// ============================================
// LOADING SKELETON
// ============================================
const ProfileSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex flex-col items-center mb-6">
      <div className="w-32 h-32 bg-gray-200 rounded-full mb-4" />
      <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-24 bg-gray-200 rounded" />
    </div>
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="h-5 w-12 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// FORM FIELD COMPONENT
// ============================================
const FormField = memo(
  ({ label, icon: Icon, type = 'text', value, onChange, disabled, placeholder, options, required, error }) => {
    const inputClasses = `pl-10 block w-full px-3 py-2.5 border rounded-lg transition-colors
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    ${disabled ? 'border-transparent bg-gray-50 text-gray-700 cursor-not-allowed' : 'border-gray-300 bg-white'}
    ${error ? 'border-red-300 focus:ring-red-500' : ''}`;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400" />
            </div>
          )}

          {type === 'select' ? (
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={inputClasses}
            >
              <option value="">{placeholder || 'Select...'}</option>
              {options?.map((opt) => (
                <option key={opt.value || opt} value={opt.value || opt}>
                  {opt.label || opt}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder={placeholder}
              className={inputClasses}
            />
          ) : (
            <input
              type={type}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className={inputClasses}
            />
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// ============================================
// TOGGLE SWITCH COMPONENT
// ============================================
const ToggleSwitch = memo(({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex-1 mr-4">
      <div className="font-medium text-gray-900">{label}</div>
      {description && <div className="text-sm text-gray-500 mt-0.5">{description}</div>}
    </div>
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
          ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </div>
));

ToggleSwitch.displayName = 'ToggleSwitch';

// ============================================
// MAIN PROFILE COMPONENT
// ============================================
const Profile = () => {
  const { t } = useTranslation();
  const { user, logout, updateUserProfile } = useAuth();
  const { language, setLanguage: changeLanguage } = useLanguage();
  const { speak } = useVoiceOutput();

  // ---- State ----
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [originalData, setOriginalData] = useState(null); // For cancel/revert
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    appointment_reminders: true,
    medicine_reminders: true,
    emergency_alerts: true,
    push_notifications: true,
    sms_notifications: true,
    email_notifications: false,
  });

  const isUserDoctor = checkIsDoctor();
  const isUserPatient = checkIsPatient();

  // ---- Fetch Profile ----
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authAPI.getProfile();
      const data = response.data?.user || response.data;
      setProfileData(data);
      setOriginalData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to stored user data - no mock data
      const storedUser = getUserFromStorage();
      if (storedUser) {
        setProfileData(storedUser);
        setOriginalData(storedUser);
        showToast(
          t('profile.loadedFromCache', 'Showing cached profile data. Some info may be outdated.'),
          'warning'
        );
      } else {
        showToast(
          t('profile.loadError', 'Failed to load profile. Please try again.'),
          'error'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // ---- Fetch notification preferences ----
  const fetchNotificationPrefs = useCallback(async () => {
    try {
      const response = await notificationsAPI.getPreferences();
      if (response.data) {
        setNotificationPrefs((prev) => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchNotificationPrefs();
  }, [fetchProfile, fetchNotificationPrefs]);

  // ---- Toast helper ----
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // ---- Voice announce tab ----
  const announceTab = useCallback(
    (tabId) => {
      const tabConfig = PROFILE_TABS[tabId];
      if (tabConfig?.labels) {
        const label = tabConfig.labels[language] || tabConfig.labels.en;
        speak(label);
      }
    },
    [language, speak]
  );

  // ---- Validate profile data ----
  const validateProfile = useCallback(() => {
    const newErrors = {};

    if (!profileData?.full_name?.trim() && !profileData?.name?.trim()) {
      newErrors.name = t('validation.nameRequired', 'Name is required');
    }

    if (profileData?.phone_number || profileData?.phone) {
      const phone = profileData.phone_number || profileData.phone;
      const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        newErrors.phone = t('validation.invalidPhone', 'Invalid phone number');
      }
    }

    if (profileData?.date_of_birth) {
      const dob = new Date(profileData.date_of_birth);
      const today = new Date();
      if (dob >= today) {
        newErrors.dateOfBirth = t('validation.invalidDOB', 'Date of birth must be in the past');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [profileData, t]);

  // ---- Update profile field ----
  const updateField = useCallback((field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ---- Save Profile ----
  const handleSaveProfile = useCallback(async () => {
    if (!validateProfile()) {
      showToast(t('profile.fixErrors', 'Please fix the errors before saving'), 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await authAPI.patchProfile(profileData);
      const serverData = response.data?.user || response.data;

      // Update everywhere
      const updatedData = { ...profileData, ...serverData };
      setProfileData(updatedData);
      setOriginalData(updatedData);

      if (updateUserProfile) {
        updateUserProfile(updatedData);
      }
      updateUserInStorage(updatedData);

      setIsEditing(false);
      showToast(t('profile.updateSuccess', 'Profile updated successfully'), 'success');
      speak(t('profile.updateSuccess', 'Profile updated successfully'));
    } catch (error) {
      console.error('Error updating profile:', error);

      const isNetworkError =
        error?.status === 0 || error?.isNetworkError || error?.code === 'NETWORK_ERROR';

      if (isNetworkError) {
        // Save locally for offline support
        updateUserInStorage(profileData);
        if (updateUserProfile) {
          updateUserProfile(profileData);
        }
        showToast(
          t(
            'profile.savedOffline',
            'Profile saved locally. Changes will sync when connection is restored.'
          ),
          'warning'
        );
        setIsEditing(false);
      } else {
        const errorMsg =
          error?.message ||
          error?.errors
            ? Object.values(error.errors || {}).flat().join(', ')
            : t('profile.updateError', 'Failed to update profile. Please try again.');
        showToast(errorMsg, 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [profileData, validateProfile, updateUserProfile, showToast, speak, t]);

  // ---- Cancel editing ----
  const handleCancelEdit = useCallback(() => {
    setProfileData(originalData);
    setIsEditing(false);
    setErrors({});
  }, [originalData]);

  // ---- Photo upload ----
  const handlePhotoUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        showToast(t('profile.invalidImageType', 'Please upload a JPG, PNG, or WebP image'), 'error');
        return;
      }

      if (file.size > maxSize) {
        showToast(t('profile.imageTooLarge', 'Image must be less than 5MB'), 'error');
        return;
      }

      setPhotoUploading(true);
      try {
        const response = await authAPI.uploadProfilePhoto(file);
        const photoUrl = response.data?.photo_url || response.data?.profile_photo;

        if (photoUrl) {
          updateField('profile_photo', photoUrl);
          updateUserInStorage({ profile_photo: photoUrl });
          showToast(t('profile.photoUpdated', 'Profile photo updated'), 'success');
        }
      } catch (error) {
        console.error('Photo upload error:', error);
        showToast(t('profile.photoError', 'Failed to upload photo'), 'error');
      } finally {
        setPhotoUploading(false);
        // Reset file input
        e.target.value = '';
      }
    },
    [showToast, t, updateField]
  );

  // ---- Notification preference toggle ----
  const handleNotificationToggle = useCallback(
    async (key, value) => {
      const prev = { ...notificationPrefs };
      setNotificationPrefs((p) => ({ ...p, [key]: value }));

      try {
        await notificationsAPI.updateTypePreference({ type: key, enabled: value });
      } catch (error) {
        console.error('Error updating notification preference:', error);
        // Revert on failure
        setNotificationPrefs(prev);
        showToast(t('profile.notifUpdateError', 'Failed to update notification setting'), 'error');
      }
    },
    [notificationPrefs, showToast, t]
  );

  // ---- Download profile data ----
  const handleDownloadData = useCallback(() => {
    try {
      const data = profileData || {};
      // Sanitize data - remove sensitive fields
      const exportData = {
        name: data.full_name || data.name || '',
        phone: data.phone_number || data.phone || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
        address: data.address || '',
        blood_group: data.blood_group || '',
        allergies: data.allergies || [],
        conditions: data.chronic_conditions || [],
        emergency_contact: data.emergency_contact_name || '',
        emergency_phone: data.emergency_contact_phone || '',
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mediconnect_profile_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      showToast(t('profile.downloadSuccess', 'Profile data downloaded'), 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast(t('profile.downloadError', 'Failed to download profile data'), 'error');
    }
  }, [profileData, showToast, t]);

  // ---- Language change handler ----
  const handleLanguageChange = useCallback(
    (lang) => {
      changeLanguage(lang);
      showToast(
        lang === 'en'
          ? 'Language changed to English'
          : lang === 'hi'
          ? 'भाषा हिंदी में बदल दी गई'
          : 'భాష తెలుగులోకి మార్చబడింది',
        'success'
      );
    },
    [changeLanguage, showToast]
  );

  // ---- Stats based on role ----
  const getStats = useCallback(() => {
    if (isUserDoctor) {
      return [
        {
          label: t('profile.totalPatients', 'Total Patients'),
          value: profileData?.total_patients || '—',
          icon: <Users className="h-5 w-5" />,
        },
        {
          label: t('profile.consultations', 'Consultations'),
          value: profileData?.total_consultations || '—',
          icon: <Clock className="h-5 w-5" />,
        },
        {
          label: t('profile.rating', 'Rating'),
          value: profileData?.rating ? `${profileData.rating}/5` : '—',
          icon: <Award className="h-5 w-5" />,
        },
        {
          label: t('profile.experience', 'Experience'),
          value: profileData?.experience_years
            ? `${profileData.experience_years} yrs`
            : '—',
          icon: <Stethoscope className="h-5 w-5" />,
        },
      ];
    }

    return [
      {
        label: t('profile.consultations', 'Consultations'),
        value: profileData?.total_consultations || '—',
        icon: <Clock className="h-5 w-5" />,
      },
      {
        label: t('profile.healthRecords', 'Health Records'),
        value: profileData?.total_records || '—',
        icon: <FileText className="h-5 w-5" />,
      },
      {
        label: t('profile.activeMedicines', 'Active Medicines'),
        value: profileData?.active_medicines || '—',
        icon: <Heart className="h-5 w-5" />,
      },
      {
        label: t('profile.memberSince', 'Member Since'),
        value: profileData?.created_at
          ? new Date(profileData.created_at).toLocaleDateString()
          : '—',
        icon: <User className="h-5 w-5" />,
      },
    ];
  }, [profileData, isUserDoctor, t]);

  // ============================================
  // RENDER: Personal Info Tab
  // ============================================
  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          label={t('profile.fullName', 'Full Name')}
          icon={User}
          value={profileData?.full_name || profileData?.name || ''}
          onChange={(v) => updateField('full_name', v)}
          disabled={!isEditing}
          required
          error={errors.name}
        />

        <FormField
          label={t('profile.phone', 'Phone Number')}
          icon={Phone}
          type="tel"
          value={profileData?.phone_number || profileData?.phone || ''}
          onChange={(v) => updateField('phone_number', v)}
          disabled // Phone is the login identifier, not editable
        />

        <FormField
          label={t('profile.dateOfBirth', 'Date of Birth')}
          icon={Calendar}
          type="date"
          value={profileData?.date_of_birth || ''}
          onChange={(v) => updateField('date_of_birth', v)}
          disabled={!isEditing}
          error={errors.dateOfBirth}
        />

        <FormField
          label={t('profile.gender', 'Gender')}
          icon={User}
          type="select"
          value={profileData?.gender || ''}
          onChange={(v) => updateField('gender', v)}
          disabled={!isEditing}
          options={GENDER_OPTIONS.map((g) => ({
            value: g,
            label: t(`profile.gender_${g}`, g.replace('_', ' ')),
          }))}
          placeholder={t('profile.selectGender', 'Select gender')}
        />

        <div className="md:col-span-2">
          <FormField
            label={t('profile.address', 'Address')}
            icon={MapPin}
            type="textarea"
            value={profileData?.address || ''}
            onChange={(v) => updateField('address', v)}
            disabled={!isEditing}
          />
        </div>
      </div>

      {/* Health Info - Patient only */}
      {isUserPatient && (
        <div className="border-t pt-6">
          <h4 className="font-bold text-gray-900 mb-4">
            {t('profile.healthInfo', 'Health Information')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField
              label={t('profile.bloodGroup', 'Blood Group')}
              type="select"
              value={profileData?.blood_group || ''}
              onChange={(v) => updateField('blood_group', v)}
              disabled={!isEditing}
              options={BLOOD_GROUPS}
              placeholder={t('profile.selectBloodGroup', 'Select')}
            />
            <FormField
              label={t('profile.height', 'Height (cm)')}
              type="number"
              value={profileData?.height || ''}
              onChange={(v) => updateField('height', v)}
              disabled={!isEditing}
              placeholder="e.g., 175"
            />
            <FormField
              label={t('profile.weight', 'Weight (kg)')}
              type="number"
              value={profileData?.weight || ''}
              onChange={(v) => updateField('weight', v)}
              disabled={!isEditing}
              placeholder="e.g., 70"
            />
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      <div className="border-t pt-6">
        <h4 className="font-bold text-gray-900 mb-4">
          {t('profile.emergencyContact', 'Emergency Contact')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label={t('profile.emergencyContactName', 'Contact Name')}
            icon={UserPlus}
            value={profileData?.emergency_contact_name || ''}
            onChange={(v) => updateField('emergency_contact_name', v)}
            disabled={!isEditing}
          />
          <FormField
            label={t('profile.emergencyContactPhone', 'Contact Phone')}
            icon={Phone}
            type="tel"
            value={profileData?.emergency_contact_phone || ''}
            onChange={(v) => updateField('emergency_contact_phone', v)}
            disabled={!isEditing}
          />
        </div>
      </div>

      {/* Doctor-specific fields */}
      {isUserDoctor && (
        <div className="border-t pt-6">
          <h4 className="font-bold text-gray-900 mb-4">
            {t('profile.professionalInfo', 'Professional Information')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField
              label={t('profile.specialization', 'Specialization')}
              icon={Stethoscope}
              value={profileData?.specialization || ''}
              onChange={(v) => updateField('specialization', v)}
              disabled={!isEditing}
            />
            <FormField
              label={t('profile.experienceYears', 'Experience (Years)')}
              icon={Award}
              type="number"
              value={profileData?.experience_years || ''}
              onChange={(v) => updateField('experience_years', v)}
              disabled={!isEditing}
            />
            <FormField
              label={t('profile.licenseNumber', 'License Number')}
              icon={Shield}
              value={profileData?.license_number || ''}
              onChange={(v) => updateField('license_number', v)}
              disabled // License should not be editable by user
            />
            <FormField
              label={t('profile.consultationFee', 'Consultation Fee (₹)')}
              type="number"
              value={profileData?.consultation_fee || ''}
              onChange={(v) => updateField('consultation_fee', v)}
              disabled={!isEditing}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: Notifications Tab
  // ============================================
  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Bell className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900">
              {t('profile.notificationSettings', 'Notification Settings')}
            </h4>
            <p className="text-blue-700 text-sm">
              {t(
                'profile.notificationDescription',
                'Manage how and when you receive notifications'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <ToggleSwitch
          enabled={notificationPrefs.appointment_reminders}
          onChange={(v) => handleNotificationToggle('appointment_reminders', v)}
          label={t('profile.appointmentReminders', 'Appointment Reminders')}
          description={t(
            'profile.appointmentRemindersDesc',
            'Get reminded before your scheduled appointments'
          )}
        />
        <ToggleSwitch
          enabled={notificationPrefs.medicine_reminders}
          onChange={(v) => handleNotificationToggle('medicine_reminders', v)}
          label={t('profile.medicineReminders', 'Medicine Reminders')}
          description={t(
            'profile.medicineRemindersDesc',
            'Never miss your medication schedule'
          )}
        />
        <ToggleSwitch
          enabled={notificationPrefs.emergency_alerts}
          onChange={(v) => handleNotificationToggle('emergency_alerts', v)}
          label={t('profile.emergencyAlerts', 'Emergency Alerts')}
          description={t(
            'profile.emergencyAlertsDesc',
            'Critical health alerts and SOS notifications'
          )}
        />
        <ToggleSwitch
          enabled={notificationPrefs.push_notifications}
          onChange={(v) => handleNotificationToggle('push_notifications', v)}
          label={t('profile.pushNotifications', 'Push Notifications')}
          description={t('profile.pushNotificationsDesc', 'Receive push notifications on this device')}
        />
        <ToggleSwitch
          enabled={notificationPrefs.sms_notifications}
          onChange={(v) => handleNotificationToggle('sms_notifications', v)}
          label={t('profile.smsNotifications', 'SMS Notifications')}
          description={t('profile.smsNotificationsDesc', 'Receive important updates via SMS')}
        />
      </div>
    </div>
  );

  // ============================================
  // RENDER: Preferences Tab (Language, Voice, Theme)
  // ============================================
  const renderPreferences = () => (
    <div className="space-y-6">
      {/* Language Selection */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-gray-600" />
          {t('profile.language', 'Language')}
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            'profile.languageDescription',
            'Changing language will update the entire app interface'
          )}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
            { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`p-4 border-2 rounded-lg text-center transition-all
                focus:outline-none focus:ring-2 focus:ring-primary-500
                ${
                  language === lang.code
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              aria-pressed={language === lang.code}
            >
              <div className="font-bold text-gray-900">{lang.nativeName}</div>
              <div className="text-sm text-gray-500">{lang.name}</div>
              {language === lang.code && (
                <CheckCircle className="h-5 w-5 text-primary-600 mx-auto mt-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Settings */}
      <div className="border-t pt-6">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
          <Volume2 className="h-5 w-5 mr-2 text-gray-600" />
          {t('profile.voiceSettings', 'Voice Settings')}
        </h4>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={profileData?.voice_enabled !== false}
            onChange={(v) => {
              updateField('voice_enabled', v);
              // Also update in storage immediately
              const { setVoiceEnabled } = require('../hooks/storage');
              setVoiceEnabled(v);
            }}
            label={t('profile.voiceOutput', 'Voice Output')}
            description={t(
              'profile.voiceOutputDesc',
              'App will read out content when you navigate between sections'
            )}
          />
          <ToggleSwitch
            enabled={profileData?.voice_commands !== false}
            onChange={(v) => updateField('voice_commands', v)}
            label={t('profile.voiceCommands', 'Voice Commands')}
            description={t(
              'profile.voiceCommandsDesc',
              'Navigate the app using voice commands in your preferred language'
            )}
          />
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER: Security Tab
  // ============================================
  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-green-900">
              {t('profile.securityPrivacy', 'Security & Privacy')}
            </h4>
            <p className="text-green-700 text-sm">
              {t('profile.securityDescription', 'Manage your account security and data privacy')}
            </p>
          </div>
        </div>
      </div>

      {/* Login Method Info */}
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <div className="font-medium text-gray-900">
                {t('profile.loginMethod', 'Login Method')}
              </div>
              <div className="text-sm text-gray-500">
                {t('profile.phoneAuth', 'Phone number authentication (OTP)')}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('profile.active', 'Active')}
          </span>
        </div>
      </div>

      {/* Data Privacy */}
      <div className="space-y-3">
        <button
          onClick={handleDownloadData}
          className="w-full p-4 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center">
            <Download className="h-5 w-5 text-gray-400 mr-3" />
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {t('profile.downloadData', 'Download My Data')}
              </div>
              <div className="text-sm text-gray-500">
                {t('profile.downloadDataDesc', 'Export your profile and health data')}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>

        <button
          onClick={logout}
          className="w-full p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center">
            <LogOut className="h-5 w-5 text-red-500 mr-3" />
            <div className="text-left">
              <div className="font-medium text-red-700">
                {t('profile.logout', 'Logout')}
              </div>
              <div className="text-sm text-red-500">
                {t('profile.logoutDesc', 'Sign out of your account')}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
  );

  // ============================================
  // RENDER: Tab content
  // ============================================
  const renderTabContent = () => {
    if (isLoading) return <ProfileSkeleton />;

    switch (activeTab) {
      case 'personal':
        return renderPersonalInfo();
      case 'notifications':
        return renderNotifications();
      case 'preferences':
        return renderPreferences();
      case 'security':
        return renderSecurity();
      default:
        return renderPersonalInfo();
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {t('profile.title', 'My Profile')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('profile.subtitle', 'Manage your personal information and preferences')}
              </p>
            </div>

            {activeTab === 'personal' && (
              <div className="flex space-x-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
                        flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('actions.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                        flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {saving ? t('actions.saving', 'Saving...') : t('actions.save', 'Save')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                      flex items-center transition-colors focus:outline-none focus:ring-2 
                      focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('profile.editProfile', 'Edit Profile')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* ---- Left Sidebar ---- */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mx-auto bg-primary-100 flex items-center justify-center">
                    {profileData?.profile_photo ? (
                      <img
                        src={profileData.profile_photo}
                        alt={profileData?.full_name || 'Profile'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        profileData?.profile_photo ? 'hidden' : ''
                      }`}
                    >
                      <User className="h-14 w-14 sm:h-16 sm:w-16 text-primary-600" />
                    </div>
                  </div>

                  {isEditing && (
                    <label
                      className="absolute bottom-1 right-1 p-2 bg-primary-600 text-white rounded-full 
                        hover:bg-primary-700 cursor-pointer transition-colors shadow-md"
                      aria-label={t('profile.changePhoto', 'Change profile photo')}
                    >
                      {photoUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={photoUploading}
                      />
                    </label>
                  )}
                </div>

                {/* Name & Role */}
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {isLoading ? (
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
                  ) : (
                    profileData?.full_name || profileData?.name || '—'
                  )}
                </h3>

                <div
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2
                  bg-primary-100 text-primary-800"
                >
                  {isUserDoctor ? (
                    <>
                      <Stethoscope className="h-3 w-3 mr-1" />
                      {t('profile.doctor', 'Doctor')}
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 mr-1" />
                      {t('profile.patient', 'Patient')}
                    </>
                  )}
                </div>

                {/* Contact Info */}
                <div className="mt-4 space-y-2 text-left">
                  {(profileData?.phone_number || profileData?.phone) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                      <span className="truncate">
                        {profileData?.phone_number || profileData?.phone}
                      </span>
                    </div>
                  )}
                  {profileData?.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{profileData.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="font-bold text-gray-900 mb-4">
                {t('profile.overview', 'Overview')}
              </h4>
              <div className="space-y-3">
                {getStats().map((stat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center min-w-0">
                      <div className="p-2 bg-white rounded-lg mr-3 flex-shrink-0">
                        <div className="text-primary-600">{stat.icon}</div>
                      </div>
                      <span className="text-sm text-gray-700 truncate">{stat.label}</span>
                    </div>
                    <span className="font-bold text-gray-900 ml-2 flex-shrink-0">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Main Content ---- */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border mb-6">
              <div className="flex border-b overflow-x-auto" role="tablist">
                {Object.values(PROFILE_TABS).map((tab) => {
                  const Icon = tab.icon;
                  const label = tab.labels[language] || tab.labels.en;

                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`tabpanel-${tab.id}`}
                      id={`tab-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        announceTab(tab.id);
                      }}
                      className={`flex-1 min-w-0 py-3.5 px-3 text-sm font-medium flex items-center 
                        justify-center gap-2 whitespace-nowrap transition-colors
                        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500
                        ${
                          activeTab === tab.id
                            ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div
                className="p-5 sm:p-6"
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
              >
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Profile);