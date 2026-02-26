// src/pages/patient/Settings.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Globe,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  MessageSquare,
  Moon,
  Sun,
  Monitor,
  Type,
  Mic,
  MicOff,
  Download,
  Trash2,
  HelpCircle,
  FileText,
  MessageCircle,
  Phone,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Loader2,
  LogOut,
  User,
  Heart,
  Clock,
  Vibrate,
  Zap,
  Accessibility,
  Contrast,
  MousePointer
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  Badge,
  Loader
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useVoice } from '../../hooks/useVoice';
import { authService, notificationService } from '../../services/api';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', size: '14px' },
  { value: 'medium', label: 'Medium', size: '16px' },
  { value: 'large', label: 'Large', size: '18px' },
  { value: 'extra-large', label: 'Extra Large', size: '20px' }
];

const SETTING_SECTIONS = [
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'voice', label: 'Voice & Accessibility', icon: Volume2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'data', label: 'Data & Storage', icon: Download },
  { id: 'help', label: 'Help & Support', icon: HelpCircle }
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
// TOGGLE SWITCH COMPONENT
// ============================================================================

const ToggleSwitch = ({ checked, onChange, disabled, loading }) => (
  <button
    type="button"
    onClick={() => !disabled && !loading && onChange(!checked)}
    disabled={disabled || loading}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${checked ? 'bg-primary-500' : 'bg-gray-200'}
      ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {loading ? (
      <Loader2 className="w-4 h-4 text-white absolute left-1/2 -translate-x-1/2 animate-spin" />
    ) : (
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    )}
  </button>
);

// ============================================================================
// SETTING ITEM COMPONENT
// ============================================================================

const SettingItem = ({ 
  icon: Icon, 
  label, 
  description, 
  children, 
  onClick,
  disabled,
  badge
}) => {
  const isClickable = !!onClick && !disabled;

  const content = (
    <div className={`
      flex items-center gap-4 p-4 
      ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
      ${disabled ? 'opacity-50' : ''}
    `}>
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{label}</p>
          {badge && <Badge variant="primary" size="sm">{badge}</Badge>}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
      {isClickable && !children && (
        <ChevronRight className="w-5 h-5 text-gray-400" />
      )}
    </div>
  );

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left border-b last:border-b-0"
      >
        {content}
      </button>
    );
  }

  return <div className="border-b last:border-b-0">{content}</div>;
};

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
    <Icon className="w-5 h-5 text-gray-500" />
    <h2 className="font-semibold text-gray-700">{title}</h2>
  </div>
);

// ============================================================================
// LANGUAGE SELECTOR MODAL
// ============================================================================

const LanguageSelectorModal = ({ isOpen, onClose, currentLanguage, languages, onSelect, isChanging }) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.selectLanguage', 'Select Language')}
      size="sm"
    >
      <div className="space-y-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            disabled={isChanging}
            className={`
              w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all
              ${currentLanguage === lang.code 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div>
              <p className="font-medium text-gray-900">{lang.nativeName}</p>
              <p className="text-sm text-gray-500">{lang.name}</p>
            </div>
            {currentLanguage === lang.code && (
              <Check className="w-5 h-5 text-primary-500" />
            )}
            {isChanging && currentLanguage !== lang.code && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
};

// ============================================================================
// CHANGE PASSWORD MODAL
// ============================================================================

// const ChangePasswordModal = ({ isOpen, onClose, onSave, isSaving }) => {
//   const { t } = useTranslation();
//   const [formData, setFormData] = useState({
//     current_password: '',
//     new_password: '',
//     confirm_password: ''
//   });
//   const [showPasswords, setShowPasswords] = useState({
//     current: false,
//     new: false,
//     confirm: false
//   });
//   const [errors, setErrors] = useState({});

//   useEffect(() => {
//     if (!isOpen) {
//       setFormData({ current_password: '', new_password: '', confirm_password: '' });
//       setErrors({});
//       setShowPasswords({ current: false, new: false, confirm: false });
//     }
//   }, [isOpen]);

//   const validate = () => {
//     const newErrors = {};
    
//     if (!formData.current_password) {
//       newErrors.current_password = t('validation.required', 'Required');
//     }
    
//     if (!formData.new_password) {
//       newErrors.new_password = t('validation.required', 'Required');
//     } else if (formData.new_password.length < 8) {
//       newErrors.new_password = t('validation.passwordLength', 'At least 8 characters');
//     } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)) {
//       newErrors.new_password = t('validation.passwordStrength', 'Include uppercase, lowercase, and number');
//     }
    
//     if (!formData.confirm_password) {
//       newErrors.confirm_password = t('validation.required', 'Required');
//     } else if (formData.new_password !== formData.confirm_password) {
//       newErrors.confirm_password = t('validation.passwordMismatch', 'Passwords do not match');
//     }
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validate()) {
//       onSave({
//         current_password: formData.current_password,
//         new_password: formData.new_password
//       });
//     }
//   };

//   const PasswordInput = ({ name, label, value, onChange, show, onToggleShow, error }) => (
//     <div>
//       <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
//       <div className="relative">
//         <input
//           type={show ? 'text' : 'password'}
//           value={value}
//           onChange={(e) => onChange(name, e.target.value)}
//           className={`
//             w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500
//             ${error ? 'border-red-500' : 'border-gray-300'}
//           `}
//           placeholder="••••••••"
//         />
//         <button
//           type="button"
//           onClick={onToggleShow}
//           className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//         >
//           {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//         </button>
//       </div>
//       {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
//     </div>
//   );

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={onClose}
//       title={t('settings.changePassword', 'Change Password')}
//       size="md"
//     >
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <PasswordInput
//           name="current_password"
//           label={t('settings.currentPassword', 'Current Password')}
//           value={formData.current_password}
//           onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
//           show={showPasswords.current}
//           onToggleShow={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
//           error={errors.current_password}
//         />

//         <PasswordInput
//           name="new_password"
//           label={t('settings.newPassword', 'New Password')}
//           value={formData.new_password}
//           onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
//           show={showPasswords.new}
//           onToggleShow={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
//           error={errors.new_password}
//         />

//         <PasswordInput
//           name="confirm_password"
//           label={t('settings.confirmPassword', 'Confirm New Password')}
//           value={formData.confirm_password}
//           onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
//           show={showPasswords.confirm}
//           onToggleShow={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
//           error={errors.confirm_password}
//         />

//         {/* Password Requirements */}
//         <div className="bg-gray-50 p-3 rounded-lg">
//           <p className="text-sm font-medium text-gray-700 mb-2">
//             {t('settings.passwordRequirements', 'Password must contain:')}
//           </p>
//           <ul className="space-y-1 text-sm">
//             <li className={`flex items-center gap-2 ${formData.new_password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
//               {formData.new_password.length >= 8 ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
//               {t('settings.min8Chars', 'At least 8 characters')}
//             </li>
//             <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.new_password) ? 'text-green-600' : 'text-gray-500'}`}>
//               {/[A-Z]/.test(formData.new_password) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
//               {t('settings.uppercase', 'One uppercase letter')}
//             </li>
//             <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.new_password) ? 'text-green-600' : 'text-gray-500'}`}>
//               {/[a-z]/.test(formData.new_password) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
//               {t('settings.lowercase', 'One lowercase letter')}
//             </li>
//             <li className={`flex items-center gap-2 ${/\d/.test(formData.new_password) ? 'text-green-600' : 'text-gray-500'}`}>
//               {/\d/.test(formData.new_password) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
//               {t('settings.number', 'One number')}
//             </li>
//           </ul>
//         </div>

//         <div className="flex gap-3 pt-4">
//           <Button
//             type="button"
//             variant="outline"
//             className="flex-1"
//             onClick={onClose}
//             disabled={isSaving}
//           >
//             {t('common.cancel', 'Cancel')}
//           </Button>
//           <Button
//             type="submit"
//             variant="primary"
//             className="flex-1"
//             loading={isSaving}
//           >
//             {t('settings.updatePassword', 'Update Password')}
//           </Button>
//         </div>
//       </form>
//     </Modal>
//   );
// };

// ============================================================================
// DELETE ACCOUNT MODAL
// ============================================================================

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'DELETE';

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const canDelete = confirmText === requiredText;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.deleteAccount', 'Delete Account')}
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">
                {t('settings.deleteWarning', 'This action cannot be undone')}
              </p>
              <p className="text-sm text-red-600 mt-1">
                {t('settings.deleteWarningDesc', 'All your data including appointments, health records, and prescriptions will be permanently deleted.')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('settings.typeToConfirm', 'Type "DELETE" to confirm:')}
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="font-mono"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            loading={isDeleting}
            disabled={!canDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('settings.deleteAccount', 'Delete Account')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// EXPORT DATA MODAL
// ============================================================================

const ExportDataModal = ({ isOpen, onClose, onExport, isExporting }) => {
  const { t } = useTranslation();
  const [selectedData, setSelectedData] = useState({
    profile: true,
    health_records: true,
    appointments: true,
    prescriptions: true,
    consultations: true
  });

  const dataTypes = [
    { key: 'profile', label: t('settings.profileData', 'Profile Information'), icon: User },
    { key: 'health_records', label: t('settings.healthRecords', 'Health Records'), icon: Heart },
    { key: 'appointments', label: t('settings.appointments', 'Appointments'), icon: Clock },
    { key: 'prescriptions', label: t('settings.prescriptions', 'Prescriptions'), icon: FileText },
    { key: 'consultations', label: t('settings.consultations', 'Consultations'), icon: MessageSquare }
  ];

  const handleToggle = (key) => {
    setSelectedData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    const selected = Object.entries(selectedData)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    onExport(selected);
  };

  const hasSelection = Object.values(selectedData).some(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.exportData', 'Export Your Data')}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t('settings.exportDesc', 'Select the data you want to export. The data will be downloaded as a JSON file.')}
        </p>

        <div className="space-y-2">
          {dataTypes.map(({ key, label, icon: Icon }) => (
            <label
              key={key}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${selectedData[key] ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <input
                type="checkbox"
                checked={selectedData[key]}
                onChange={() => handleToggle(key)}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <Icon className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isExporting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleExport}
            loading={isExporting}
            disabled={!hasSelection}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('settings.export', 'Export')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { currentLanguage, supportedLanguages, changeLanguage, isChanging: isLanguageChanging } = useLanguage();
  const { 
    voiceEnabled, 
    voiceCommandsEnabled, 
    textToSpeechEnabled,
    speechRate,
    toggleVoiceAssistance,
    setVoiceCommandsEnabled,
    setTextToSpeechEnabled,
    setSpeechRate,
    isSupported: isVoiceSupported
  } = useVoice();

  // State - NO MOCK DATA
  const [settings, setSettings] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  
  // Error state
  const [error, setError] = useState(null);
  
  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Modals
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Active section from URL
  const activeSection = searchParams.get('section');

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

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Scroll to section if specified in URL
  useEffect(() => {
    if (activeSection) {
      const element = document.getElementById(`section-${activeSection}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeSection, isLoading]);

  // API: Load settings
  const loadSettings = async () => {
    if (!isOnline) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load user settings/preferences
      const profileResponse = await authService.getProfile();
      setSettings(profileResponse.data?.settings || {
        theme: 'system',
        font_size: 'medium',
        high_contrast: false,
        reduce_motion: false
      });

      // Load notification preferences
      try {
        const notifResponse = await notificationService.getPreferences();
        setNotificationPrefs(notifResponse.data);
      } catch (notifErr) {
        console.log('Failed to load notification preferences:', notifErr);
        setNotificationPrefs({
          push_enabled: true,
          email_enabled: true,
          sms_enabled: false,
          sound_enabled: true
        });
      }

    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  // API: Update setting
  const updateSetting = async (key, value) => {
    setSavingKey(key);
    try {
      const updatedSettings = { ...settings, [key]: value };
      await authService.updateProfile({ settings: updatedSettings });
      setSettings(updatedSettings);
      toast.success(t('settings.saved', 'Setting saved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.saveError', 'Failed to save setting'));
    } finally {
      setSavingKey(null);
    }
  };

  // API: Update notification preference
  const updateNotificationPref = async (key, value) => {
    setSavingKey(`notif_${key}`);
    try {
      const updatedPrefs = { ...notificationPrefs, [key]: value };
      await notificationService.updatePreferences(updatedPrefs);
      setNotificationPrefs(updatedPrefs);
      toast.success(t('settings.saved', 'Setting saved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.saveError', 'Failed to save setting'));
    } finally {
      setSavingKey(null);
    }
  };

  // API: Change language
  const handleLanguageChange = async (langCode) => {
    try {
      await changeLanguage(langCode);
      // Also update backend
      await authService.updateLanguage(langCode);
      setShowLanguageModal(false);
      toast.success(t('settings.languageChanged', 'Language changed'));
    } catch (err) {
      toast.error(t('settings.languageError', 'Failed to change language'));
    }
  };

  // API: Change password
  // const handleChangePassword = async (data) => {
  //   setIsSaving(true);
  //   try {
  //     await authService.changePassword(data);
  //     toast.success(t('settings.passwordChanged', 'Password changed successfully'));
  //     setShowPasswordModal(false);
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || t('settings.passwordError', 'Failed to change password'));
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  // API: Export data
  const handleExportData = async (dataTypes) => {
    setIsSaving(true);
    try {
      const response = await authService.exportData(dataTypes);
      
      // Create download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mediconnect-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t('settings.dataExported', 'Data exported successfully'));
      setShowExportModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.exportError', 'Failed to export data'));
    } finally {
      setIsSaving(false);
    }
  };

  // API: Delete account
  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      await authService.deleteAccount();
      await logout();
      navigate('/login', { replace: true });
      toast.success(t('settings.accountDeleted', 'Account deleted'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.deleteError', 'Failed to delete account'));
    } finally {
      setIsSaving(false);
    }
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
      return <ErrorState message={error} onRetry={loadSettings} />;
    }

    return (
      <div className="space-y-4">
        {/* Language Section */}
        <div id="section-language">
          <Card className="overflow-hidden">
            <SectionHeader icon={Globe} title={t('settings.language', 'Language')} />
            <SettingItem
              icon={Globe}
              label={t('settings.appLanguage', 'App Language')}
              description={getCurrentLanguageName()}
              onClick={() => setShowLanguageModal(true)}
            />
          </Card>
        </div>

        {/* Voice & Accessibility Section */}
        <div id="section-voice">
          <Card className="overflow-hidden">
            <SectionHeader icon={Volume2} title={t('settings.voiceAccessibility', 'Voice & Accessibility')} />
            
            <SettingItem
              icon={voiceEnabled ? Volume2 : VolumeX}
              label={t('settings.voiceAssistance', 'Voice Assistance')}
              description={t('settings.voiceAssistanceDesc', 'Enable voice features throughout the app')}
            >
              <ToggleSwitch
                checked={voiceEnabled}
                onChange={toggleVoiceAssistance}
                disabled={!isVoiceSupported}
              />
            </SettingItem>

            <SettingItem
              icon={Mic}
              label={t('settings.voiceCommands', 'Voice Commands')}
              description={t('settings.voiceCommandsDesc', 'Control the app with your voice')}
              disabled={!voiceEnabled}
            >
              <ToggleSwitch
                checked={voiceCommandsEnabled}
                onChange={setVoiceCommandsEnabled}
                disabled={!voiceEnabled}
              />
            </SettingItem>

            <SettingItem
              icon={MessageSquare}
              label={t('settings.textToSpeech', 'Text to Speech')}
              description={t('settings.textToSpeechDesc', 'Read content aloud')}
              disabled={!voiceEnabled}
            >
              <ToggleSwitch
                checked={textToSpeechEnabled}
                onChange={setTextToSpeechEnabled}
                disabled={!voiceEnabled}
              />
            </SettingItem>

            <SettingItem
              icon={Zap}
              label={t('settings.speechRate', 'Speech Rate')}
              description={`${speechRate}x`}
              disabled={!voiceEnabled || !textToSpeechEnabled}
            >
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                disabled={!voiceEnabled || !textToSpeechEnabled}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </SettingItem>

            <SettingItem
              icon={Contrast}
              label={t('settings.highContrast', 'High Contrast')}
              description={t('settings.highContrastDesc', 'Increase color contrast')}
            >
              <ToggleSwitch
                checked={settings?.high_contrast || false}
                onChange={(value) => updateSetting('high_contrast', value)}
                loading={savingKey === 'high_contrast'}
              />
            </SettingItem>

            <SettingItem
              icon={MousePointer}
              label={t('settings.reduceMotion', 'Reduce Motion')}
              description={t('settings.reduceMotionDesc', 'Minimize animations')}
            >
              <ToggleSwitch
                checked={settings?.reduce_motion || false}
                onChange={(value) => updateSetting('reduce_motion', value)}
                loading={savingKey === 'reduce_motion'}
              />
            </SettingItem>
          </Card>
        </div>

        {/* Notifications Section */}
        <div id="section-notifications">
          <Card className="overflow-hidden">
            <SectionHeader icon={Bell} title={t('settings.notifications', 'Notifications')} />
            
            <SettingItem
              icon={Bell}
              label={t('settings.pushNotifications', 'Push Notifications')}
              description={t('settings.pushDesc', 'Receive notifications on your device')}
            >
              <ToggleSwitch
                checked={notificationPrefs?.push_enabled || false}
                onChange={(value) => updateNotificationPref('push_enabled', value)}
                loading={savingKey === 'notif_push_enabled'}
              />
            </SettingItem>

            <SettingItem
              icon={Mail}
              label={t('settings.emailNotifications', 'Email Notifications')}
              description={t('settings.emailDesc', 'Receive notifications via email')}
            >
              <ToggleSwitch
                checked={notificationPrefs?.email_enabled || false}
                onChange={(value) => updateNotificationPref('email_enabled', value)}
                loading={savingKey === 'notif_email_enabled'}
              />
            </SettingItem>

            <SettingItem
              icon={Smartphone}
              label={t('settings.smsNotifications', 'SMS Notifications')}
              description={t('settings.smsDesc', 'Receive notifications via SMS')}
            >
              <ToggleSwitch
                checked={notificationPrefs?.sms_enabled || false}
                onChange={(value) => updateNotificationPref('sms_enabled', value)}
                loading={savingKey === 'notif_sms_enabled'}
              />
            </SettingItem>

            <SettingItem
              icon={Volume2}
              label={t('settings.notificationSound', 'Notification Sound')}
              description={t('settings.soundDesc', 'Play sound for notifications')}
            >
              <ToggleSwitch
                checked={notificationPrefs?.sound_enabled || false}
                onChange={(value) => updateNotificationPref('sound_enabled', value)}
                loading={savingKey === 'notif_sound_enabled'}
              />
            </SettingItem>

            <SettingItem
              icon={Bell}
              label={t('settings.manageNotifications', 'Manage Notification Types')}
              description={t('settings.manageNotificationsDesc', 'Customize which notifications you receive')}
              onClick={() => navigate('/patient/notifications?settings=true')}
            />
          </Card>
        </div>

        {/* Appearance Section */}
        <div id="section-appearance">
          <Card className="overflow-hidden">
            <SectionHeader icon={Sun} title={t('settings.appearance', 'Appearance')} />
            
            <div className="p-4 border-b">
              <p className="font-medium text-gray-900 mb-3">{t('settings.theme', 'Theme')}</p>
              <div className="flex gap-2">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('theme', value)}
                    disabled={savingKey === 'theme'}
                    className={`
                      flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                      ${settings?.theme === value 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${savingKey === 'theme' ? 'opacity-50' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              <p className="font-medium text-gray-900 mb-3">{t('settings.fontSize', 'Font Size')}</p>
              <div className="flex gap-2">
                {FONT_SIZE_OPTIONS.map(({ value, label, size }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('font_size', value)}
                    disabled={savingKey === 'font_size'}
                    className={`
                      flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                      ${settings?.font_size === value 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${savingKey === 'font_size' ? 'opacity-50' : ''}
                    `}
                  >
                    <span style={{ fontSize: size }} className="font-medium">Aa</span>
                    <span className="text-xs text-gray-500">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Privacy & Security Section */}
        <div id="section-privacy">
          <Card className="overflow-hidden">
            <SectionHeader icon={Shield} title={t('settings.privacySecurity', 'Privacy & Security')} />
            
            {/* <SettingItem
              icon={Lock}
              label={t('settings.changePassword', 'Change Password')}
              description={t('settings.changePasswordDesc', 'Update your account password')}
              onClick={() => setShowPasswordModal(true)}
            /> */}

            <SettingItem
              icon={Eye}
              label={t('settings.profileVisibility', 'Profile Visibility')}
              description={t('settings.profileVisibilityDesc', 'Control who can see your profile')}
              onClick={() => navigate('/patient/profile?privacy=true')}
            />

            <SettingItem
              icon={Shield}
              label={t('settings.dataSharing', 'Data Sharing')}
              description={t('settings.dataSharingDesc', 'Manage how your data is shared')}
              onClick={() => navigate('/patient/health-records?sharing=true')}
            />
          </Card>
        </div>

        {/* Data & Storage Section */}
        <div id="section-data">
          <Card className="overflow-hidden">
            <SectionHeader icon={Download} title={t('settings.dataStorage', 'Data & Storage')} />
            
            <SettingItem
              icon={Download}
              label={t('settings.exportData', 'Export Your Data')}
              description={t('settings.exportDataDesc', 'Download a copy of your data')}
              onClick={() => setShowExportModal(true)}
            />

            <SettingItem
              icon={Trash2}
              label={t('settings.deleteAccount', 'Delete Account')}
              description={t('settings.deleteAccountDesc', 'Permanently delete your account and data')}
              onClick={() => setShowDeleteModal(true)}
            />
          </Card>
        </div>

        {/* Help & Support Section */}
        <div id="section-help">
          <Card className="overflow-hidden">
            <SectionHeader icon={HelpCircle} title={t('settings.helpSupport', 'Help & Support')} />
            
            <SettingItem
              icon={HelpCircle}
              label={t('settings.faq', 'FAQs')}
              description={t('settings.faqDesc', 'Frequently asked questions')}
              onClick={() => window.open('/faq', '_blank')}
            />

            <SettingItem
              icon={MessageCircle}
              label={t('settings.contactSupport', 'Contact Support')}
              description={t('settings.contactSupportDesc', 'Get help from our team')}
              onClick={() => window.open('mailto:support@mediconnect.com')}
            />

            <SettingItem
              icon={Phone}
              label={t('settings.helpline', 'Helpline')}
              description="1800-XXX-XXXX"
              onClick={() => window.open('tel:1800XXXXXXX')}
            />

            <SettingItem
              icon={FileText}
              label={t('settings.termsOfService', 'Terms of Service')}
              onClick={() => window.open('/terms', '_blank')}
            />

            <SettingItem
              icon={Shield}
              label={t('settings.privacyPolicy', 'Privacy Policy')}
              onClick={() => window.open('/privacy', '_blank')}
            />
          </Card>
        </div>

        {/* App Version */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            {t('settings.version', 'Version')} 1.0.0
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2024 MediConnect
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              {t('settings.title', 'Settings')}
            </h1>
            <button
              onClick={loadSettings}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* Modals */}
      <LanguageSelectorModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        currentLanguage={currentLanguage}
        languages={supportedLanguages}
        onSelect={handleLanguageChange}
        isChanging={isLanguageChanging}
      />

      {/* <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSave={handleChangePassword}
        isSaving={isSaving}
      /> */}

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isSaving}
      />

      <ExportDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportData}
        isExporting={isSaving}
      />
    </div>
  );
};

export default Settings;