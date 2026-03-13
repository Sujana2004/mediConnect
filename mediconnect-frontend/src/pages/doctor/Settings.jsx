// src/pages/doctor/Settings.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Bell,
  Lock,
  Shield,
  Globe,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Volume2,
  Eye,
  EyeOff,
  Video,
  Mic,
  HelpCircle,
  FileText,
  MessageSquare,
  Mail,
  Phone,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  LogOut,
  Trash2,
  Download,
  Fingerprint,
  Calendar,
  Palette,
  Type,
  Zap,
  Database,
  Cloud,
  Share2,
  Star
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useVoice } from '../../hooks/useVoice';
import { authService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Select
} from '../../components/common';

// ============================================================================
// CONSTANTS
// ============================================================================

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="p-2 bg-primary-100 rounded-lg">
      <Icon className="w-5 h-5 text-primary-600" />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
  </div>
);

const SettingToggle = ({ 
  icon: Icon, 
  label, 
  description, 
  value, 
  onChange,
  disabled = false 
}) => (
  <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl ${
    disabled ? 'opacity-50' : ''
  }`}>
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2 bg-white rounded-lg">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      )}
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-primary-600' : 'bg-gray-200'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const SettingLink = ({ 
  icon: Icon, 
  label, 
  description, 
  onClick,
  badge,
  danger = false 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
      danger 
        ? 'bg-red-50 hover:bg-red-100' 
        : 'bg-gray-50 hover:bg-gray-100'
    }`}
  >
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={`p-2 rounded-lg ${danger ? 'bg-red-100' : 'bg-white'}`}>
          <Icon className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-gray-600'}`} />
        </div>
      )}
      <div className="text-left">
        <p className={`font-medium ${danger ? 'text-red-700' : 'text-gray-900'}`}>
          {label}
        </p>
        {description && (
          <p className={`text-sm ${danger ? 'text-red-500' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <Badge variant={danger ? 'danger' : 'primary'} size="sm">
          {badge}
        </Badge>
      )}
      <ChevronRight className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-gray-400'}`} />
    </div>
  </button>
);

const SettingSelect = ({ 
  icon: Icon, 
  label, 
  description, 
  value, 
  options,
  onChange 
}) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2 bg-white rounded-lg">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      )}
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      className="w-32"
    />
  </div>
);

// Account Settings Section
const AccountSettingsSection = ({ onChangePassword, onTwoFactor, onSessions }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <SectionHeader
        icon={Shield}
        title={t('settings.accountSecurity')}
        description={t('settings.accountSecurityDesc')}
      />

      <div className="space-y-3">
        <SettingLink
          icon={Lock}
          label={t('settings.changePassword')}
          description={t('settings.changePasswordDesc')}
          onClick={onChangePassword}
        />

        <SettingLink
          icon={Fingerprint}
          label={t('settings.twoFactorAuth')}
          description={t('settings.twoFactorAuthDesc')}
          onClick={onTwoFactor}
          badge={t('common.recommended')}
        />

        <SettingLink
          icon={Smartphone}
          label={t('settings.activeSessions')}
          description={t('settings.activeSessionsDesc')}
          onClick={onSessions}
        />
      </div>
    </Card>
  );
};

// Appearance Settings Section
const AppearanceSettingsSection = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();

  return (
    <Card>
      <SectionHeader
        icon={Palette}
        title={t('settings.appearance')}
        description={t('settings.appearanceDesc')}
      />

      <div className="space-y-3">
        <SettingSelect
          icon={Globe}
          label={t('common.language')}
          description={t('settings.languageDesc')}
          value={currentLanguage}
          options={supportedLanguages.map(l => ({
            value: l.code,
            label: l.nativeName
          }))}
          onChange={changeLanguage}
        />

        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white rounded-lg">
              <Palette className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t('settings.theme')}</p>
              <p className="text-sm text-gray-500">{t('settings.themeDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2 ml-12">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onChange('theme', option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                  settings.theme === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <option.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <SettingSelect
          icon={Type}
          label={t('settings.fontSize')}
          description={t('settings.fontSizeDesc')}
          value={settings.fontSize}
          options={FONT_SIZE_OPTIONS.map(o => ({
            value: o.value,
            label: o.label
          }))}
          onChange={(value) => onChange('fontSize', value)}
        />

        <SettingToggle
          icon={Zap}
          label={t('settings.reduceMotion')}
          description={t('settings.reduceMotionDesc')}
          value={settings.reduceMotion}
          onChange={(value) => onChange('reduceMotion', value)}
        />
      </div>
    </Card>
  );
};

// Voice & Accessibility Settings Section
const VoiceAccessibilitySection = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const { voiceEnabled, toggleVoiceAssistance, isSupported } = useVoice();

  return (
    <Card>
      <SectionHeader
        icon={Volume2}
        title={t('settings.voiceAccessibility')}
        description={t('settings.voiceAccessibilityDesc')}
      />

      <div className="space-y-3">
        <SettingToggle
          icon={Volume2}
          label={t('settings.voiceAssistance')}
          description={t('settings.voiceAssistanceDesc')}
          value={voiceEnabled}
          onChange={toggleVoiceAssistance}
          disabled={!isSupported}
        />

        <SettingToggle
          icon={Mic}
          label={t('settings.voiceCommands')}
          description={t('settings.voiceCommandsDesc')}
          value={settings.voiceCommands}
          onChange={(value) => onChange('voiceCommands', value)}
          disabled={!isSupported}
        />

        <SettingToggle
          icon={MessageSquare}
          label={t('settings.textToSpeech')}
          description={t('settings.textToSpeechDesc')}
          value={settings.textToSpeech}
          onChange={(value) => onChange('textToSpeech', value)}
        />

        <SettingToggle
          icon={Eye}
          label={t('settings.highContrast')}
          description={t('settings.highContrastDesc')}
          value={settings.highContrast}
          onChange={(value) => onChange('highContrast', value)}
        />

        <SettingToggle
          icon={Type}
          label={t('settings.screenReader')}
          description={t('settings.screenReaderDesc')}
          value={settings.screenReader}
          onChange={(value) => onChange('screenReader', value)}
        />
      </div>
    </Card>
  );
};

// Consultation Settings Section
const ConsultationSettingsSection = ({ settings, onChange }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <SectionHeader
        icon={Video}
        title={t('settings.consultationSettings')}
        description={t('settings.consultationSettingsDesc')}
      />

      <div className="space-y-3">
        <SettingToggle
          icon={Video}
          label={t('settings.autoStartVideo')}
          description={t('settings.autoStartVideoDesc')}
          value={settings.autoStartVideo}
          onChange={(value) => onChange('autoStartVideo', value)}
        />

        <SettingToggle
          icon={Mic}
          label={t('settings.autoStartAudio')}
          description={t('settings.autoStartAudioDesc')}
          value={settings.autoStartAudio}
          onChange={(value) => onChange('autoStartAudio', value)}
        />

        <SettingToggle
          icon={Bell}
          label={t('settings.consultationReminders')}
          description={t('settings.consultationRemindersDesc')}
          value={settings.consultationReminders}
          onChange={(value) => onChange('consultationReminders', value)}
        />

        <SettingToggle
          icon={MessageSquare}
          label={t('settings.autoSaveNotes')}
          description={t('settings.autoSaveNotesDesc')}
          value={settings.autoSaveNotes}
          onChange={(value) => onChange('autoSaveNotes', value)}
        />
      </div>
    </Card>
  );
};

// Notification Settings Section
const NotificationSettingsSection = ({ settings, onChange, onManageNotifications }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <SectionHeader
        icon={Bell}
        title={t('settings.notifications')}
        description={t('settings.notificationsDesc')}
      />

      <div className="space-y-3">
        <SettingToggle
          icon={Bell}
          label={t('settings.pushNotifications')}
          description={t('settings.pushNotificationsDesc')}
          value={settings.pushNotifications}
          onChange={(value) => onChange('pushNotifications', value)}
        />

        <SettingToggle
          icon={Mail}
          label={t('settings.emailNotifications')}
          description={t('settings.emailNotificationsDesc')}
          value={settings.emailNotifications}
          onChange={(value) => onChange('emailNotifications', value)}
        />

        <SettingToggle
          icon={Phone}
          label={t('settings.smsNotifications')}
          description={t('settings.smsNotificationsDesc')}
          value={settings.smsNotifications}
          onChange={(value) => onChange('smsNotifications', value)}
        />

        <SettingToggle
          icon={Volume2}
          label={t('settings.soundAlerts')}
          description={t('settings.soundAlertsDesc')}
          value={settings.soundAlerts}
          onChange={(value) => onChange('soundAlerts', value)}
        />

        <SettingLink
          icon={Settings}
          label={t('settings.manageNotificationTypes')}
          description={t('settings.manageNotificationTypesDesc')}
          onClick={onManageNotifications}
        />
      </div>
    </Card>
  );
};

// Privacy Settings Section
const PrivacySettingsSection = ({ settings, onChange }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <SectionHeader
        icon={Eye}
        title={t('settings.privacy')}
        description={t('settings.privacyDesc')}
      />

      <div className="space-y-3">
        <SettingToggle
          icon={Eye}
          label={t('settings.showOnlineStatus')}
          description={t('settings.showOnlineStatusDesc')}
          value={settings.showOnlineStatus}
          onChange={(value) => onChange('showOnlineStatus', value)}
        />

        <SettingToggle
          icon={Calendar}
          label={t('settings.showAvailability')}
          description={t('settings.showAvailabilityDesc')}
          value={settings.showAvailability}
          onChange={(value) => onChange('showAvailability', value)}
        />

        <SettingToggle
          icon={Star}
          label={t('settings.showReviews')}
          description={t('settings.showReviewsDesc')}
          value={settings.showReviews}
          onChange={(value) => onChange('showReviews', value)}
        />

        <SettingToggle
          icon={Share2}
          label={t('settings.allowProfileSharing')}
          description={t('settings.allowProfileSharingDesc')}
          value={settings.allowProfileSharing}
          onChange={(value) => onChange('allowProfileSharing', value)}
        />
      </div>
    </Card>
  );
};

// Data & Storage Section
const DataStorageSection = ({ onDeleteAccount }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <SectionHeader
        icon={Database}
        title={t('settings.dataStorage')}
        description={t('settings.dataStorageDesc')}
      />

      <div className="space-y-3">
        <SettingLink
          icon={Cloud}
          label={t('settings.cloudSync')}
          description={t('settings.cloudSyncDesc')}
          onClick={() => {}}
          badge={t('common.enabled')}
        />

        <SettingLink
          icon={Trash2}
          label={t('settings.deleteAccount')}
          description={t('settings.deleteAccountDesc')}
          onClick={onDeleteAccount}
          danger
        />
      </div>
    </Card>
  );
};

// Help & Support Section
const HelpSupportSection = ({ onFAQ, onContact, onTerms, onPrivacy }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <SectionHeader
        icon={HelpCircle}
        title={t('settings.helpSupport')}
        description={t('settings.helpSupportDesc')}
      />

      <div className="space-y-3">
        <SettingLink
          icon={HelpCircle}
          label={t('settings.faq')}
          description={t('settings.faqDesc')}
          onClick={onFAQ}
        />

        <SettingLink
          icon={MessageSquare}
          label={t('settings.contactSupport')}
          description={t('settings.contactSupportDesc')}
          onClick={onContact}
        />

        <SettingLink
          icon={FileText}
          label={t('settings.termsOfService')}
          onClick={onTerms}
        />

        <SettingLink
          icon={Shield}
          label={t('settings.privacyPolicy')}
          onClick={onPrivacy}
        />
      </div>
    </Card>
  );
};

// Change Password Modal
const ChangePasswordModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(() => {
    setError('');

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError(t('errors.allFieldsRequired'));
      return;
    }

    if (formData.newPassword.length < 8) {
      setError(t('errors.passwordTooShort'));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      return;
    }

    onSave(formData);
  }, [formData, onSave, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.changePassword')}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="relative">
          <Input
            label={t('settings.currentPassword')}
            type={showPasswords.current ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <Input
            label={t('settings.newPassword')}
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <Input
            label={t('settings.confirmPassword')}
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('settings.passwordRequirements')}
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${formData.newPassword.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
              {t('settings.minCharacters')}
            </li>
            <li className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${/[A-Z]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
              {t('settings.upperCase')}
            </li>
            <li className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${/[0-9]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
              {t('settings.oneNumber')}
            </li>
            <li className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${/[!@#$%^&*]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
              {t('settings.specialCharacter')}
            </li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isLoading}
        >
          {t('settings.updatePassword')}
        </Button>
      </div>
    </Modal>
  );
};

// Delete Account Modal
const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const canDelete = confirmText === 'DELETE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.deleteAccount')}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">{t('settings.deleteAccountWarning')}</p>
            <p className="text-sm text-red-700 mt-1">
              {t('settings.deleteAccountWarningDesc')}
            </p>
          </div>
        </div>

        <div>
          <p className="text-gray-700 mb-2">
            {t('settings.typeDeleteToConfirm')}
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('settings.whatWillBeDeleted')}
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• {t('settings.deleteItem1')}</li>
            <li>• {t('settings.deleteItem2')}</li>
            <li>• {t('settings.deleteItem3')}</li>
            <li>• {t('settings.deleteItem4')}</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={isLoading}
          disabled={!canDelete}
        >
          {t('settings.permanentlyDelete')}
        </Button>
      </div>
    </Modal>
  );
};

// Active Sessions Modal
const ActiveSessionsModal = ({ isOpen, onClose, onLogoutSession, onLogoutAll, isLoading }) => {
  const { t } = useTranslation();

  const mockSessions = [
    {
      id: 1,
      device: 'Chrome on Windows',
      location: 'Mumbai, India',
      ip: '192.168.1.1',
      lastActive: new Date().toISOString(),
      isCurrent: true
    },
    {
      id: 2,
      device: 'Safari on iPhone',
      location: 'Delhi, India',
      ip: '192.168.1.2',
      lastActive: new Date(Date.now() - 3600000).toISOString(),
      isCurrent: false
    },
    {
      id: 3,
      device: 'Firefox on MacOS',
      location: 'Bangalore, India',
      ip: '192.168.1.3',
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      isCurrent: false
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.activeSessions')}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          {t('settings.activeSessionsInfo')}
        </p>

        <div className="space-y-3">
          {mockSessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                session.isCurrent 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  session.isCurrent ? 'bg-green-100' : 'bg-white'
                }`}>
                  <Monitor className={`w-5 h-5 ${
                    session.isCurrent ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{session.device}</p>
                    {session.isCurrent && (
                      <Badge variant="success" size="sm">
                        {t('settings.currentSession')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {session.location} • {session.ip}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('settings.lastActive')}: {new Date(session.lastActive).toLocaleString()}
                  </p>
                </div>
              </div>

              {!session.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLogoutSession(session.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  {t('settings.logout')}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          leftIcon={<LogOut className="w-4 h-4" />}
          onClick={onLogoutAll}
          loading={isLoading}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          {t('settings.logoutAllDevices')}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [settings, setSettings] = useState({
    theme: 'light',
    fontSize: 'medium',
    reduceMotion: false,
    voiceCommands: false,
    textToSpeech: true,
    highContrast: false,
    screenReader: false,
    autoStartVideo: true,
    autoStartAudio: true,
    consultationReminders: true,
    autoSaveNotes: true,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    soundAlerts: true,
    showOnlineStatus: true,
    showAvailability: true,
    showReviews: true,
    allowProfileSharing: true
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleChangePassword = useCallback(async (passwordData) => {
    try {
      setIsActionLoading(true);
      // API call would go here
      console.log('Change password:', passwordData);
      
      setShowPasswordModal(false);
      setSuccessMessage(t('settings.passwordChanged'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('errors.failedToChangePassword'));
    } finally {
      setIsActionLoading(false);
    }
  }, [t]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await logout();
      navigate('/login');
    } catch (err) {
      setError(t('errors.failedToDeleteAccount'));
    } finally {
      setIsActionLoading(false);
    }
  }, [logout, navigate, t]);

  const handleLogoutSession = useCallback(async (sessionId) => {
    try {
      console.log('Logout session:', sessionId);
    } catch (err) {
      setError(t('errors.failedToLogoutSession'));
    }
  }, [t]);

  const handleLogoutAllSessions = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await logout();
      navigate('/login');
    } catch (err) {
      setError(t('errors.failedToLogoutSessions'));
    } finally {
      setIsActionLoading(false);
    }
  }, [logout, navigate, t]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('common.settings')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('settings.pageDescription')}
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm">{successMessage}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

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
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AccountSettingsSection
            onChangePassword={() => setShowPasswordModal(true)}
            onTwoFactor={() => navigate('/doctor/settings/two-factor')}
            onSessions={() => setShowSessionsModal(true)}
          />

          <AppearanceSettingsSection
            settings={settings}
            onChange={handleSettingChange}
          />

          <VoiceAccessibilitySection
            settings={settings}
            onChange={handleSettingChange}
          />
        </div>

        <div className="space-y-6">
          <ConsultationSettingsSection
            settings={settings}
            onChange={handleSettingChange}
          />

          <NotificationSettingsSection
            settings={settings}
            onChange={handleSettingChange}
            onManageNotifications={() => navigate('/doctor/notifications')}
          />

          <PrivacySettingsSection
            settings={settings}
            onChange={handleSettingChange}
          />

          <DataStorageSection
            onDeleteAccount={() => setShowDeleteModal(true)}
          />

          <HelpSupportSection
            onFAQ={() => navigate('/faq')}
            onContact={() => navigate('/contact')}
            onTerms={() => navigate('/terms')}
            onPrivacy={() => navigate('/privacy')}
          />
        </div>
      </div>

      <div className="text-center text-sm text-gray-400 pt-6">
        <p>MediConnect v1.0.0</p>
        <p>© 2024 MediConnect. All rights reserved.</p>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSave={handleChangePassword}
        isLoading={isActionLoading}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isActionLoading}
      />

      <ActiveSessionsModal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        onLogoutSession={handleLogoutSession}
        onLogoutAll={handleLogoutAllSessions}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default DoctorSettings;