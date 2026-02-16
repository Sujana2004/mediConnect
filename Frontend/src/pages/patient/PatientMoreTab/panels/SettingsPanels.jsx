// pages/patient/PatientMoreTab/panels/SettingsPanels.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  Moon,
  Volume2,
  Check,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Trash2,
  Lock,
  Fingerprint,
  Sun,
  Shield,
  FileText,
} from 'lucide-react';

import ToggleSwitch from '../../../../components/common/ToggleSwitch';
import { DetailPanel, ActionButton, InfoCard } from '../components';
import {
  LANGUAGES,
  TEXT_SIZES,
  VOICE_COMMANDS,
  SYNC_FREQUENCY_OPTIONS,
  CACHE_OPTIONS,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from '../constants';

// ============================================
// NOTIFICATION SETTINGS PANEL
// ============================================
export const NotificationSettingsPanel = ({ settings, onToggle, onClose }) => (
  <DetailPanel title="Notification Settings" onClose={onClose}>
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Health Notifications</h4>
        <div className="divide-y">
          <ToggleSwitch
            label="Appointment Reminders"
            description="Get notified before your appointments"
            enabled={settings.notifications.appointments}
            onToggle={() => onToggle('notifications', 'appointments')}
          />
          <ToggleSwitch
            label="Medication Reminders"
            description="Never miss your medications"
            enabled={settings.notifications.medications}
            onToggle={() => onToggle('notifications', 'medications')}
          />
          <ToggleSwitch
            label="Lab Results Ready"
            description="Know when your results are available"
            enabled={settings.notifications.labResults}
            onToggle={() => onToggle('notifications', 'labResults')}
          />
          <ToggleSwitch
            label="Health Tips & Articles"
            description="Receive helpful health information"
            enabled={settings.notifications.healthTips}
            onToggle={() => onToggle('notifications', 'healthTips')}
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Emergency Alerts</h4>
        <ToggleSwitch
          label="Emergency Alerts"
          description="Critical health and safety notifications"
          enabled={settings.notifications.emergencyAlerts}
          onToggle={() => onToggle('notifications', 'emergencyAlerts')}
        />
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Other</h4>
        <ToggleSwitch
          label="Promotions & Offers"
          description="Deals from partner pharmacies and labs"
          enabled={settings.notifications.promotions}
          onToggle={() => onToggle('notifications', 'promotions')}
        />
      </div>
    </div>
  </DetailPanel>
);

NotificationSettingsPanel.propTypes = {
  settings: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// QUIET HOURS PANEL
// ============================================
export const QuietHoursPanel = ({ settings, setSettings, onClose }) => (
  <DetailPanel title="Quiet Hours" onClose={onClose}>
    <div className="space-y-6">
      <InfoCard
        icon={Moon}
        title="Do Not Disturb"
        description="Silence non-urgent notifications"
        color="indigo"
      />

      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Enable Quiet Hours"
          description="Mute notifications during specified hours"
          enabled={settings.quietHours.enabled}
          onToggle={() =>
            setSettings((prev) => ({
              ...prev,
              quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled },
            }))
          }
        />
      </div>

      {settings.quietHours.enabled && (
        <div className="bg-white border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={settings.quietHours.start}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  quietHours: { ...prev.quietHours, start: e.target.value },
                }))
              }
              className="w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={settings.quietHours.end}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  quietHours: { ...prev.quietHours, end: e.target.value },
                }))
              }
              className="w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Emergency SOS alerts and critical health notifications will always come through,
          even during quiet hours.
        </p>
      </div>
    </div>
  </DetailPanel>
);

QuietHoursPanel.propTypes = {
  settings: PropTypes.object.isRequired,
  setSettings: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// LANGUAGE PANEL
// ============================================
export const LanguagePanel = ({ settings, setSettings, onClose }) => (
  <DetailPanel title="Language" onClose={onClose}>
    <div className="space-y-3">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setSettings((prev) => ({ ...prev, language: lang.name }))}
          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
            settings.language === lang.name
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div>
            <p className="font-medium text-gray-900">{lang.name}</p>
            <p className="text-sm text-gray-500">{lang.native}</p>
          </div>
          {settings.language === lang.name && (
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  </DetailPanel>
);

LanguagePanel.propTypes = {
  settings: PropTypes.object.isRequired,
  setSettings: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// VOICE SETTINGS PANEL
// ============================================
export const VoiceSettingsPanel = ({ settings, onToggle, onClose }) => (
  <DetailPanel title="Voice Assistant" onClose={onClose}>
    <div className="space-y-6">
      <InfoCard
        icon={Volume2}
        title="Voice Assistant"
        description="Hands-free app navigation"
        color="blue"
      />

      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Enable Voice Assistant"
          description="Control the app with your voice"
          enabled={settings.voiceAssistant}
          onToggle={() => onToggle('voiceAssistant')}
        />
      </div>

      {settings.voiceAssistant && (
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Available Voice Commands</h4>
          <div className="space-y-3">
            {VOICE_COMMANDS.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{item.command}</code>
                <span className="text-sm text-gray-500">{item.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActionButton variant="outline">Test Voice Recognition</ActionButton>
    </div>
  </DetailPanel>
);

VoiceSettingsPanel.propTypes = {
  settings: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// TEXT SIZE PANEL
// ============================================
export const TextSizePanel = ({ settings, setSettings, onClose }) => (
  <DetailPanel title="Text Size" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Choose a text size that&apos;s comfortable for you to read.</p>
      {TEXT_SIZES.map((size) => (
        <button
          key={size.id}
          onClick={() => setSettings((prev) => ({ ...prev, textSize: size.id }))}
          className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
            settings.textSize === size.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{size.label}</p>
              <p style={{ fontSize: size.preview }} className="text-gray-600 mt-1">
                Sample text preview
              </p>
            </div>
            {settings.textSize === size.id && (
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  </DetailPanel>
);

TextSizePanel.propTypes = {
  settings: PropTypes.object.isRequired,
  setSettings: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// HIGH CONTRAST PANEL
// ============================================
export const ContrastPanel = ({ settings, onToggle, onClose }) => (
  <DetailPanel title="High Contrast Mode" onClose={onClose}>
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Enable High Contrast"
          description="Increases visibility for better readability"
          enabled={settings.highContrast}
          onToggle={() => onToggle('highContrast')}
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Preview</h4>
        <div
          className={`p-4 rounded-xl ${
            settings.highContrast
              ? 'bg-black text-white border-2 border-white'
              : 'bg-gray-100 text-gray-900 border'
          }`}
        >
          <p className="font-bold mb-2">Sample Content</p>
          <p className="mb-3">This is how text will appear with your current settings.</p>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              settings.highContrast ? 'bg-yellow-400 text-black' : 'bg-primary-600 text-white'
            }`}
          >
            Sample Button
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          High contrast mode can help users with visual impairments or those reading in bright light conditions.
        </p>
      </div>
    </div>
  </DetailPanel>
);

ContrastPanel.propTypes = {
  settings: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// OFFLINE MODE PANEL
// ============================================
export const OfflineModePanel = ({ settings, onToggle, onClose }) => (
  <DetailPanel title="Offline Mode" onClose={onClose}>
    <div className="space-y-6">
      <InfoCard
        icon={settings.offlineMode ? WifiOff : Wifi}
        title={settings.offlineMode ? 'Offline Mode Active' : 'Online'}
        description={settings.offlineMode ? 'Using cached data only' : 'Connected to internet'}
        color={settings.offlineMode ? 'amber' : 'green'}
      />

      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Enable Offline Mode"
          description="Use app without internet connection"
          enabled={settings.offlineMode}
          onToggle={() => onToggle('offlineMode')}
        />
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Available Offline</h4>
        <ul className="space-y-2">
          {[
            'View saved appointments',
            'Medication reminders',
            'First aid guides',
            'Emergency contacts',
            'Downloaded medical records',
            'Saved prescriptions',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Not Available Offline</h4>
        <ul className="space-y-2">
          {[
            'Book new appointments',
            'Video consultations',
            'Real-time chat with doctors',
            'Sync new data',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <X className="h-4 w-4 text-red-500" />
              <span className="text-gray-500">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </DetailPanel>
);

OfflineModePanel.propTypes = {
  settings: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// AUTO SYNC PANEL
// ============================================
export const AutoSyncPanel = ({ settings, setSettings, onToggle, onClose }) => (
  <DetailPanel title="Auto Sync" onClose={onClose}>
    <div className="space-y-6">
      <InfoCard
        icon={RefreshCw}
        title="Auto Sync"
        description="Keep your data up to date automatically"
        color="blue"
      />

      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Enable Auto Sync"
          description="Automatically sync data in background"
          enabled={settings.autoSync}
          onToggle={() => onToggle('autoSync')}
        />
      </div>

      {settings.autoSync && (
        <>
          <div className="bg-white border rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Sync Frequency</label>
            <div className="space-y-2">
              {SYNC_FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings((prev) => ({ ...prev, syncFrequency: option.value }))}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between ${
                    settings.syncFrequency === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                >
                  <span className="text-sm">{option.label}</span>
                  {settings.syncFrequency === option.value && (
                    <Check className="h-4 w-4 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Sync Connection</h4>
            <ToggleSwitch
              label="Wi-Fi only"
              description="Save mobile data"
              enabled={settings.wifiOnly}
              onToggle={() => setSettings((prev) => ({ ...prev, wifiOnly: !prev.wifiOnly }))}
            />
            <ToggleSwitch
              label="Mobile data"
              description="Sync even without Wi-Fi"
              enabled={settings.mobileData}
              onToggle={() => setSettings((prev) => ({ ...prev, mobileData: !prev.mobileData }))}
            />
          </div>
        </>
      )}

      <div className="bg-gray-50 border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Last synced</p>
            <p className="font-medium text-gray-900">2 minutes ago</p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-primary-700">
            <RefreshCw className="h-4 w-4" /> Sync Now
          </button>
        </div>
      </div>
    </div>
  </DetailPanel>
);

AutoSyncPanel.propTypes = {
  settings: PropTypes.object.isRequired,
  setSettings: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// DATA USAGE PANEL
// ============================================
export const DataUsagePanel = ({ settings, onClose }) => (
  <DetailPanel title="Data Usage" onClose={onClose}>
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900">This Month</span>
          <span className="text-2xl font-bold text-primary-600">{settings.dataUsage.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all"
            style={{ width: `${settings.dataUsage.percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {settings.dataUsage.total} of {settings.dataUsage.limit} monthly limit
        </p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Usage Breakdown</h4>
        <div className="space-y-3">
          {settings.dataUsage.breakdown.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className="text-sm font-medium">{item.usage} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${(item.usage / 100) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Data Saver Mode"
          description="Reduce image quality to save data"
          enabled={false}
          onToggle={() => {}}
        />
      </div>
    </div>
  </DetailPanel>
);

DataUsagePanel.propTypes = {
  settings: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// CLEAR CACHE PANEL
// ============================================
export const ClearCachePanel = ({
  settings,
  cacheSelection,
  setCacheSelection,
  onClearCache,
  isLoading,
  onClose,
}) => (
  <DetailPanel title="Clear Cache" onClose={onClose}>
    <div className="space-y-6">
      <div className="bg-gray-50 border rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-gray-200 rounded-xl">
          <Database className="h-8 w-8 text-gray-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Cache Size</p>
          <p className="text-2xl font-bold text-gray-900">{settings.cache.size}</p>
          {settings.cache.lastCleared && (
            <p className="text-xs text-gray-500 mt-1">Last cleared: {settings.cache.lastCleared}</p>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Select data to clear</h4>
        <div className="space-y-3">
          {CACHE_OPTIONS.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`cache-${item.key}`}
                  checked={cacheSelection[item.key]}
                  onChange={() =>
                    setCacheSelection((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                  }
                  className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor={`cache-${item.key}`} className="text-gray-900 cursor-pointer">
                  {item.name}
                </label>
              </div>
              <span className="text-sm text-gray-500">{item.size}</span>
            </div>
          ))}
        </div>
      </div>

      <ActionButton onClick={onClearCache} loading={isLoading} variant="danger" icon={Trash2}>
        Clear Selected Cache
      </ActionButton>

      <p className="text-sm text-gray-500 text-center">
        Clearing cache will not delete your personal data or account information.
      </p>
    </div>
  </DetailPanel>
);

ClearCachePanel.propTypes = {
  settings: PropTypes.object.isRequired,
  cacheSelection: PropTypes.object.isRequired,
  setCacheSelection: PropTypes.func.isRequired,
  onClearCache: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// CHANGE PASSWORD PANEL
// ============================================
export const ChangePasswordPanel = ({
  passwords,
  setPasswords,
  onChangePassword,
  isLoading,
  onClose,
}) => {
  const passwordChecks = [
    { text: 'At least 8 characters', met: passwords.new.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(passwords.new) },
    { text: 'One lowercase letter', met: /[a-z]/.test(passwords.new) },
    { text: 'One number', met: /[0-9]/.test(passwords.new) },
    { text: 'One special character', met: /[!@#$%^&*]/.test(passwords.new) },
  ];

  const handleChange = (field) => (e) => {
    setPasswords((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <DetailPanel title="Change Password" onClose={onClose}>
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={handleChange('current')}
              placeholder="Enter current password"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={passwords.new}
              onChange={handleChange('new')}
              placeholder="Enter new password"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={handleChange('confirm')}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="bg-gray-50 border rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3">Password Requirements:</h4>
          <ul className="space-y-2 text-sm">
            {passwordChecks.map((req, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 ${req.met ? 'text-green-600' : 'text-gray-500'}`}
              >
                {req.met ? <Check className="h-4 w-4" /> : <div className="w-4 h-4 border rounded-full" />}
                {req.text}
              </li>
            ))}
          </ul>
        </div>

        <ActionButton
          onClick={onChangePassword}
          loading={isLoading}
          disabled={!passwords.current || !passwords.new || passwords.new !== passwords.confirm}
        >
          Update Password
        </ActionButton>
      </div>
    </DetailPanel>
  );
};

ChangePasswordPanel.propTypes = {
  passwords: PropTypes.object.isRequired,
  setPasswords: PropTypes.func.isRequired,
  onChangePassword: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// BIOMETRIC PANEL
// ============================================
export const BiometricPanel = ({ settings, onToggle, onClose }) => (
  <DetailPanel title="Biometric Login" onClose={onClose}>
    <div className="space-y-6">
      <InfoCard
        icon={Fingerprint}
        title="Biometric Authentication"
        description="Fingerprint & Face ID"
        color="blue"
      />

      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch
          label="Enable Biometric Login"
          description="Use fingerprint or face to login"
          enabled={settings.biometric}
          onToggle={() => onToggle('biometric')}
        />
      </div>

      {settings.biometric && (
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Use Biometrics For:</h4>
          <div className="space-y-1">
            <ToggleSwitch label="App Login" enabled={true} onToggle={() => {}} />
            <ToggleSwitch label="View Medical Records" enabled={true} onToggle={() => {}} />
            <ToggleSwitch label="Confirm Payments" enabled={true} onToggle={() => {}} />
            <ToggleSwitch label="Share Health Data" enabled={false} onToggle={() => {}} />
          </div>
        </div>
      )}

      <ActionButton variant="outline">Re-register Biometrics</ActionButton>
    </div>
  </DetailPanel>
);

BiometricPanel.propTypes = {
  settings: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// PRIVACY POLICY PANEL
// ============================================
export const PrivacyPolicyPanel = ({ onClose }) => (
  <DetailPanel title="Privacy Policy" onClose={onClose}>
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Last updated: January 1, 2024</p>

      {PRIVACY_SECTIONS.map((section, i) => (
        <div key={i} className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-2">{section.title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>
        </div>
      ))}

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-800">
          <strong>Questions?</strong> Contact our privacy team at privacy@mediconnect.com
        </p>
      </div>
    </div>
  </DetailPanel>
);

PrivacyPolicyPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};

// ============================================
// TERMS OF SERVICE PANEL
// ============================================
export const TermsPanel = ({ onClose }) => (
  <DetailPanel title="Terms of Service" onClose={onClose}>
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Last updated: January 1, 2024</p>

      {TERMS_SECTIONS.map((section, i) => (
        <div key={i} className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-2">{section.title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>
        </div>
      ))}
    </div>
  </DetailPanel>
);

TermsPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};

// ============================================
// DELETE ACCOUNT PANEL
// ============================================
export const DeleteAccountPanel = ({
  deleteConfirmation,
  setDeleteConfirmation,
  onDelete,
  isLoading,
  onClose,
}) => {
  const handleChange = (field) => (e) => {
    setDeleteConfirmation((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const deletionItems = [
    'All personal information',
    'Medical records and history',
    'Appointment history',
    'Prescription records',
    'Family member profiles',
    'All saved preferences',
    'Chat history with doctors',
  ];

  return (
    <DetailPanel title="Delete Account" onClose={onClose}>
      <div className="space-y-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-full">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-bold text-red-800">Warning: Permanent Action</h3>
          </div>
          <p className="text-sm text-red-700">
            Deleting your account will permanently remove all your data, including medical records,
            appointments, and health history. <strong>This action cannot be undone.</strong>
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">What will be deleted:</h4>
          <ul className="space-y-2">
            {deletionItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                <Trash2 className="h-4 w-4" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation.text}
              onChange={handleChange('text')}
              placeholder="Type DELETE"
              className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Enter your password
            </label>
            <input
              type="password"
              value={deleteConfirmation.password}
              onChange={handleChange('password')}
              placeholder="Enter password to confirm"
              className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <ActionButton
          onClick={onDelete}
          loading={isLoading}
          disabled={deleteConfirmation.text !== 'DELETE' || !deleteConfirmation.password}
          variant="danger"
        >
          Permanently Delete Account
        </ActionButton>

        <ActionButton onClick={onClose} variant="secondary" disabled={isLoading}>
          Cancel
        </ActionButton>
      </div>
    </DetailPanel>
  );
};

DeleteAccountPanel.propTypes = {
  deleteConfirmation: PropTypes.object.isRequired,
  setDeleteConfirmation: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};