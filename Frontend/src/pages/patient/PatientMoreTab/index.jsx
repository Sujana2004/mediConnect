// pages/patient/PatientMoreTab/index.jsx

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  User,
  Pencil,
  Eye,
  Users,
  Plus,
  Phone,
  Shield,
  BookOpen,
  Bell,
  Moon,
  Globe,
  Volume2,
  Sun,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Trash2,
  Lock,
  Fingerprint,
  FileText,
  Info,
  HelpCircle,
  MessageSquare,
  Star,
  ArrowLeft,
} from 'lucide-react';

// Shared Components
import Toast from '../../../components/common/Toast';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

// Local Components
import { MenuItem, Section } from './components';

// Panels
import { FullProfilePanel, EditProfilePanel } from './panels/ProfilePanels';
import {
  EmergencyContactsPanel,
  SOSSettingsPanel,
  FirstAidPanel,
  HelplinesPanel,
} from './panels/EmergencyPanels';
import {
  NotificationSettingsPanel,
  QuietHoursPanel,
  LanguagePanel,
  VoiceSettingsPanel,
  TextSizePanel,
  ContrastPanel,
  OfflineModePanel,
  AutoSyncPanel,
  DataUsagePanel,
  ClearCachePanel,
  ChangePasswordPanel,
  BiometricPanel,
  PrivacyPolicyPanel,
  TermsPanel,
  DeleteAccountPanel,
} from './panels/SettingsPanels';
import {
  AboutPanel,
  GuidePanel,
  FAQsPanel,
  ContactSupportPanel,
  FeedbackPanel,
  RateAppPanel,
} from './panels/SupportPanels';
import {
  ManageFamilyPanel,
  AddFamilyMemberModal,
  AddEmergencyContactModal,
  FamilyQuickSwitch,
} from './panels/FamilyPanels';

// Constants & Defaults
import {
  DEFAULT_SETTINGS,
  DEFAULT_PROFILE,
  DEFAULT_EMERGENCY_CONTACTS,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_SOS_SETTINGS,
} from './constants';

// Hooks
import { useToast } from '../../../hooks/useToast';

// ============================================
// MAIN COMPONENT
// ============================================
const PatientMoreTab = () => {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();

  // ==================== STATE ====================
  
  // Panel & Modal State
  const [activePanel, setActivePanel] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Expandable State
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);
  const [selectedFirstAid, setSelectedFirstAid] = useState(null);

  // Data State
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editedProfile, setEditedProfile] = useState({ ...DEFAULT_PROFILE });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [emergencyContacts, setEmergencyContacts] = useState(DEFAULT_EMERGENCY_CONTACTS);
  const [familyMembers, setFamilyMembers] = useState(DEFAULT_FAMILY_MEMBERS);
  const [sosSettings, setSosSettings] = useState(DEFAULT_SOS_SETTINGS);

  // Form State
  const [newContact, setNewContact] = useState({
    name: '',
    relation: 'Spouse',
    phone: '',
    primary: false,
  });

  const [newFamilyMember, setNewFamilyMember] = useState({
    name: '',
    relation: 'Spouse',
    age: '',
    gender: 'Male',
    bloodGroup: 'Unknown',
  });

  const [feedback, setFeedback] = useState({
    rating: 0,
    tags: [],
    message: '',
  });

  const [supportMessage, setSupportMessage] = useState({
    subject: 'Technical Issue',
    message: '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    text: '',
    password: '',
  });

  const [cacheSelection, setCacheSelection] = useState({
    images: true,
    documents: true,
    searchHistory: true,
    tempFiles: true,
  });

  // ==================== HELPER FUNCTIONS ====================

  const closePanel = useCallback(() => {
    setActivePanel(null);
    setSelectedFirstAid(null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  // ==================== SETTINGS HANDLERS ====================

  const toggleSetting = useCallback((category, setting) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting],
      },
    }));
  }, []);

  const toggleSimpleSetting = useCallback((setting) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  }, []);

  const toggleSosSetting = useCallback((setting) => {
    setSosSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  }, []);

  // ==================== PROFILE HANDLERS ====================

  const validateProfile = useCallback(() => {
    if (!editedProfile.name?.trim()) {
      showToast(t('validation.nameRequired', 'Name is required'), 'error');
      return false;
    }
    if (!editedProfile.phone?.trim()) {
      showToast(t('validation.phoneRequired', 'Phone number is required'), 'error');
      return false;
    }
    if (editedProfile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedProfile.email)) {
      showToast(t('validation.invalidEmail', 'Please enter a valid email'), 'error');
      return false;
    }
    return true;
  }, [editedProfile, showToast, t]);

  const handleSaveProfile = useCallback(async () => {
    if (!validateProfile()) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // await authAPI.updateProfile(editedProfile);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setProfile(editedProfile);
      closePanel();
      showToast(t('profile.updated', 'Profile updated successfully'), 'success');
    } catch (error) {
      showToast(error.message || t('profile.updateFailed', 'Failed to update profile'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [editedProfile, validateProfile, closePanel, showToast, t]);

  // ==================== EMERGENCY CONTACT HANDLERS ====================

  const handleAddEmergencyContact = useCallback(async () => {
    if (!newContact.name?.trim()) {
      showToast(t('validation.nameRequired', 'Name is required'), 'error');
      return;
    }
    if (!newContact.phone?.trim()) {
      showToast(t('validation.phoneRequired', 'Phone number is required'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      setEmergencyContacts((prev) => [...prev, { ...newContact, id: Date.now() }]);
      setNewContact({ name: '', relation: 'Spouse', phone: '', primary: false });
      closeModal();
      showToast(t('emergency.contactAdded', 'Emergency contact added'), 'success');
    } catch (error) {
      showToast(error.message || t('emergency.addFailed', 'Failed to add contact'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [newContact, closeModal, showToast, t]);

  const handleRemoveEmergencyContact = useCallback(
    (id) => {
      const contact = emergencyContacts.find((c) => c.id === id);
      if (contact?.primary) {
        showToast(t('emergency.cannotRemovePrimary', 'Cannot remove primary contact'), 'error');
        return;
      }

      setConfirmDialog({
        title: t('common.confirm', 'Confirm Delete'),
        message: t('emergency.confirmDelete', 'Are you sure you want to remove this emergency contact?'),
        confirmText: t('common.delete', 'Delete'),
        cancelText: t('common.cancel', 'Cancel'),
        type: 'danger',
        onConfirm: async () => {
          setIsLoading(true);
          try {
            // TODO: Replace with actual API call
            await new Promise((resolve) => setTimeout(resolve, 300));

            setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
            setConfirmDialog(null);
            showToast(t('emergency.contactRemoved', 'Contact removed'), 'info');
          } catch (error) {
            showToast(error.message || t('emergency.removeFailed', 'Failed to remove contact'), 'error');
          } finally {
            setIsLoading(false);
          }
        },
      });
    },
    [emergencyContacts, showToast, t]
  );

  // ==================== FAMILY MEMBER HANDLERS ====================

  const handleAddFamilyMember = useCallback(async () => {
    if (!newFamilyMember.name?.trim()) {
      showToast(t('validation.nameRequired', 'Name is required'), 'error');
      return;
    }
    if (!newFamilyMember.age) {
      showToast(t('validation.ageRequired', 'Age is required'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      const avatar = newFamilyMember.gender === 'Male' ? '👨' : newFamilyMember.gender === 'Female' ? '👩' : '👤';

      setFamilyMembers((prev) => [
        ...prev,
        {
          ...newFamilyMember,
          id: Date.now(),
          active: false,
          avatar,
        },
      ]);
      setNewFamilyMember({ name: '', relation: 'Spouse', age: '', gender: 'Male', bloodGroup: 'Unknown' });
      closeModal();
      showToast(t('family.memberAdded', 'Family member added'), 'success');
    } catch (error) {
      showToast(error.message || t('family.addFailed', 'Failed to add family member'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [newFamilyMember, closeModal, showToast, t]);

  const handleSwitchFamilyMember = useCallback(
    (id) => {
      setFamilyMembers((prev) =>
        prev.map((m) => ({
          ...m,
          active: m.id === id,
        }))
      );
      showToast(t('family.profileSwitched', 'Profile switched'), 'success');
    },
    [showToast, t]
  );

  const handleRemoveFamilyMember = useCallback(
    (id) => {
      const member = familyMembers.find((m) => m.id === id);
      if (member?.relation === 'Self') {
        showToast(t('family.cannotRemoveSelf', 'Cannot remove yourself'), 'error');
        return;
      }

      setConfirmDialog({
        title: t('common.confirm', 'Confirm Delete'),
        message: t('family.confirmDelete', 'Are you sure you want to remove this family member?'),
        confirmText: t('common.delete', 'Delete'),
        cancelText: t('common.cancel', 'Cancel'),
        type: 'danger',
        onConfirm: async () => {
          setIsLoading(true);
          try {
            // TODO: Replace with actual API call
            await new Promise((resolve) => setTimeout(resolve, 300));

            setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
            setConfirmDialog(null);
            showToast(t('family.memberRemoved', 'Family member removed'), 'info');
          } catch (error) {
            showToast(error.message || t('family.removeFailed', 'Failed to remove family member'), 'error');
          } finally {
            setIsLoading(false);
          }
        },
      });
    },
    [familyMembers, showToast, t]
  );

  // ==================== FEEDBACK HANDLERS ====================

  const toggleFeedbackTag = useCallback((tag) => {
    setFeedback((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (feedback.rating === 0) {
      showToast(t('feedback.ratingRequired', 'Please select a rating'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      showToast(t('feedback.thankYou', 'Thank you for your feedback!'), 'success');
      setFeedback({ rating: 0, tags: [], message: '' });
      closePanel();
    } catch (error) {
      showToast(error.message || t('feedback.submitFailed', 'Failed to submit feedback'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [feedback, closePanel, showToast, t]);

  // ==================== SUPPORT HANDLERS ====================

  const handleSendSupportMessage = useCallback(async () => {
    if (!supportMessage.message?.trim()) {
      showToast(t('support.messageRequired', 'Please enter a message'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      showToast(t('support.messageSent', "Message sent! We'll respond within 24 hours."), 'success');
      setSupportMessage({ subject: 'Technical Issue', message: '' });
      closePanel();
    } catch (error) {
      showToast(error.message || t('support.sendFailed', 'Failed to send message'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supportMessage, closePanel, showToast, t]);

  // ==================== PASSWORD HANDLERS ====================

  const handleChangePassword = useCallback(async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      showToast(t('password.allFieldsRequired', 'All fields are required'), 'error');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      showToast(t('password.mismatch', 'New passwords do not match'), 'error');
      return;
    }
    if (passwords.new.length < 8) {
      showToast(t('password.tooShort', 'Password must be at least 8 characters'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      showToast(t('password.changed', 'Password changed successfully'), 'success');
      setPasswords({ current: '', new: '', confirm: '' });
      closePanel();
    } catch (error) {
      showToast(error.message || t('password.changeFailed', 'Failed to change password'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [passwords, closePanel, showToast, t]);

  // ==================== CACHE HANDLERS ====================

  const handleClearCache = useCallback(() => {
    setConfirmDialog({
      title: t('settings.confirmClearCache', 'Clear Cache?'),
      message: t('settings.clearCacheWarning', 'This will clear selected cached data.'),
      confirmText: t('common.clear', 'Clear'),
      cancelText: t('common.cancel', 'Cancel'),
      type: 'warning',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          // TODO: Replace with actual cache clearing logic
          await new Promise((resolve) => setTimeout(resolve, 500));

          setSettings((prev) => ({
            ...prev,
            cache: {
              ...prev.cache,
              size: '0 MB',
              lastCleared: new Date().toISOString().split('T')[0],
            },
          }));
          setConfirmDialog(null);
          closePanel();
          showToast(t('settings.cacheCleared', 'Cache cleared successfully'), 'success');
        } catch (error) {
          showToast(error.message || t('settings.clearCacheFailed', 'Failed to clear cache'), 'error');
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [closePanel, showToast, t]);

  // ==================== AUTH HANDLERS ====================

  const handleLogout = useCallback(() => {
    setConfirmDialog({
      title: t('auth.confirmLogout', 'Confirm Logout'),
      message: t('auth.logoutMessage', 'Are you sure you want to sign out?'),
      confirmText: t('auth.logout', 'Sign Out'),
      cancelText: t('common.cancel', 'Cancel'),
      type: 'warning',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          // TODO: Replace with actual logout logic
          // await authAPI.logout();
          // clearAuthStorage();
          await new Promise((resolve) => setTimeout(resolve, 300));

          setConfirmDialog(null);
          showToast(t('auth.loggedOut', 'Logged out successfully'), 'success');
          // window.location.href = '/login';
        } catch (error) {
          showToast(error.message || t('auth.logoutFailed', 'Failed to logout'), 'error');
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [showToast, t]);

  const handleDeleteAccount = useCallback(() => {
    if (deleteConfirmation.text !== 'DELETE') {
      showToast(t('profile.typeDELETE', 'Please type DELETE to confirm'), 'error');
      return;
    }
    if (!deleteConfirmation.password) {
      showToast(t('profile.passwordRequired', 'Please enter your password'), 'error');
      return;
    }

    setConfirmDialog({
      title: t('profile.deleteAccount', 'Delete Account'),
      message: t('profile.deleteAccountWarning', 'This action cannot be undone.'),
      confirmText: t('profile.confirmDelete', 'Yes, Delete My Account'),
      cancelText: t('common.cancel', 'Cancel'),
      type: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          // TODO: Replace with actual API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          setConfirmDialog(null);
          showToast(t('profile.accountDeleted', 'Account deleted'), 'info');
          // window.location.href = '/';
        } catch (error) {
          showToast(error.message || t('profile.deleteFailed', 'Failed to delete account'), 'error');
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [deleteConfirmation, showToast, t]);

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast */}
      <Toast toast={toast} onClose={hideToast} />

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          type={confirmDialog.type}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
          isLoading={isLoading}
        />
      )}

      {/* ==================== PANELS ==================== */}

      {/* Profile Panels */}
      {activePanel === 'full-profile' && (
        <FullProfilePanel
          profile={profile}
          onClose={closePanel}
          onEdit={() => {
            setEditedProfile({ ...profile });
            setActivePanel('edit-profile');
          }}
          isLoading={isLoading}
        />
      )}

      {activePanel === 'edit-profile' && (
        <EditProfilePanel
          profile={profile}
          editedProfile={editedProfile}
          setEditedProfile={setEditedProfile}
          onClose={closePanel}
          onSave={handleSaveProfile}
          isLoading={isLoading}
        />
      )}

      {/* Emergency Panels */}
      {activePanel === 'emergency-contacts' && (
        <EmergencyContactsPanel
          contacts={emergencyContacts}
          onClose={closePanel}
          onAddContact={() => setActiveModal('add-contact')}
          onRemoveContact={handleRemoveEmergencyContact}
          isLoading={isLoading}
        />
      )}

      {activePanel === 'sos-settings' && (
        <SOSSettingsPanel
          sosSettings={sosSettings}
          onToggle={toggleSosSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'first-aid' && (
        <FirstAidPanel
          selectedGuide={selectedFirstAid}
          setSelectedGuide={setSelectedFirstAid}
          onClose={closePanel}
        />
      )}

      {activePanel === 'helplines' && <HelplinesPanel onClose={closePanel} />}

      {/* Settings Panels */}
      {activePanel === 'notification-settings' && (
        <NotificationSettingsPanel
          settings={settings}
          onToggle={toggleSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'quiet-hours' && (
        <QuietHoursPanel
          settings={settings}
          setSettings={setSettings}
          onClose={closePanel}
        />
      )}

      {activePanel === 'language' && (
        <LanguagePanel
          settings={settings}
          setSettings={setSettings}
          onClose={closePanel}
        />
      )}

      {activePanel === 'voice-settings' && (
        <VoiceSettingsPanel
          settings={settings}
          onToggle={toggleSimpleSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'text-size' && (
        <TextSizePanel
          settings={settings}
          setSettings={setSettings}
          onClose={closePanel}
        />
      )}

      {activePanel === 'contrast' && (
        <ContrastPanel
          settings={settings}
          onToggle={toggleSimpleSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'offline-mode' && (
        <OfflineModePanel
          settings={settings}
          onToggle={toggleSimpleSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'auto-sync' && (
        <AutoSyncPanel
          settings={settings}
          setSettings={setSettings}
          onToggle={toggleSimpleSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'data-usage' && (
        <DataUsagePanel settings={settings} onClose={closePanel} />
      )}

      {activePanel === 'clear-cache' && (
        <ClearCachePanel
          settings={settings}
          cacheSelection={cacheSelection}
          setCacheSelection={setCacheSelection}
          onClearCache={handleClearCache}
          isLoading={isLoading}
          onClose={closePanel}
        />
      )}

      {activePanel === 'change-password' && (
        <ChangePasswordPanel
          passwords={passwords}
          setPasswords={setPasswords}
          onChangePassword={handleChangePassword}
          isLoading={isLoading}
          onClose={closePanel}
        />
      )}

      {activePanel === 'biometric' && (
        <BiometricPanel
          settings={settings}
          onToggle={toggleSimpleSetting}
          onClose={closePanel}
        />
      )}

      {activePanel === 'privacy-policy' && <PrivacyPolicyPanel onClose={closePanel} />}

      {activePanel === 'terms' && <TermsPanel onClose={closePanel} />}

      {activePanel === 'delete-account' && (
        <DeleteAccountPanel
          deleteConfirmation={deleteConfirmation}
          setDeleteConfirmation={setDeleteConfirmation}
          onDelete={handleDeleteAccount}
          isLoading={isLoading}
          onClose={closePanel}
        />
      )}

      {/* Support Panels */}
      {activePanel === 'about' && <AboutPanel onClose={closePanel} />}

      {activePanel === 'guide' && (
        <GuidePanel
          expandedGuide={expandedGuide}
          setExpandedGuide={setExpandedGuide}
          onClose={closePanel}
        />
      )}

      {activePanel === 'faqs' && (
        <FAQsPanel
          expandedFaq={expandedFaq}
          setExpandedFaq={setExpandedFaq}
          onOpenContact={() => setActivePanel('contact')}
          onClose={closePanel}
        />
      )}

      {activePanel === 'contact' && (
        <ContactSupportPanel
          supportMessage={supportMessage}
          setSupportMessage={setSupportMessage}
          onSendMessage={handleSendSupportMessage}
          isLoading={isLoading}
          onClose={closePanel}
        />
      )}

      {activePanel === 'feedback' && (
        <FeedbackPanel
          feedback={feedback}
          setFeedback={setFeedback}
          onToggleTag={toggleFeedbackTag}
          onSubmit={handleSubmitFeedback}
          isLoading={isLoading}
          onClose={closePanel}
        />
      )}

      {activePanel === 'rate' && <RateAppPanel onClose={closePanel} />}

      {/* Family Panel */}
      {activePanel === 'manage-family' && (
        <ManageFamilyPanel
          familyMembers={familyMembers}
          onSwitchMember={handleSwitchFamilyMember}
          onEditMember={(member) => {
            // TODO: Implement edit family member
            console.log('Edit member:', member);
          }}
          onRemoveMember={handleRemoveFamilyMember}
          onAddMember={() => setActiveModal('add-family')}
          isLoading={isLoading}
          onClose={closePanel}
        />
      )}

      {/* ==================== MODALS ==================== */}

      {activeModal === 'add-contact' && (
        <AddEmergencyContactModal
          newContact={newContact}
          setNewContact={setNewContact}
          onAdd={handleAddEmergencyContact}
          isLoading={isLoading}
          onClose={closeModal}
        />
      )}

      {activeModal === 'add-family' && (
        <AddFamilyMemberModal
          newFamilyMember={newFamilyMember}
          setNewFamilyMember={setNewFamilyMember}
          onAdd={handleAddFamilyMember}
          isLoading={isLoading}
          onClose={closeModal}
        />
      )}

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-24">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-4 bg-gradient-to-r from-primary-500 to-primary-600">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5" /> Settings
            </h2>
          </div>
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-600">
                Patient | {profile.gender} | {profile.age} years
              </p>
              <p className="text-sm text-gray-600">
                Blood Group: <span className="text-red-600 font-semibold">{profile.bloodGroup}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3 px-4 pb-4">
            <button
              onClick={() => {
                setEditedProfile({ ...profile });
                setActivePanel('edit-profile');
              }}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 flex items-center justify-center gap-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
            <button
              onClick={() => setActivePanel('full-profile')}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Eye className="h-4 w-4" /> View Profile
            </button>
          </div>
        </div>

        {/* Family Members */}
        <FamilyQuickSwitch
          familyMembers={familyMembers}
          onSwitchMember={handleSwitchFamilyMember}
          onAddMember={() => setActiveModal('add-family')}
          onManageFamily={() => setActivePanel('manage-family')}
        />

        {/* Emergency Settings */}
        <Section title="🚨 Emergency Settings">
          <MenuItem
            icon={Phone}
            label="Emergency Contacts"
            onClick={() => setActivePanel('emergency-contacts')}
            value={`${emergencyContacts.length}`}
          />
          <MenuItem
            icon={Shield}
            label="SOS Settings"
            onClick={() => setActivePanel('sos-settings')}
          />
          <MenuItem
            icon={BookOpen}
            label="First Aid Guides"
            onClick={() => setActivePanel('first-aid')}
          />
          <MenuItem
            icon={Phone}
            label="Emergency Helplines"
            onClick={() => setActivePanel('helplines')}
          />
        </Section>

        {/* Notifications */}
        <Section title="🔔 Notifications">
          <MenuItem
            icon={Bell}
            label="Notification Settings"
            onClick={() => setActivePanel('notification-settings')}
          />
          <MenuItem
            icon={Moon}
            label="Quiet Hours"
            onClick={() => setActivePanel('quiet-hours')}
            value={settings.quietHours.enabled ? 'On' : 'Off'}
          />
        </Section>

        {/* Language & Accessibility */}
        <Section title="🌐 Language & Accessibility">
          <MenuItem
            icon={Globe}
            label="Language"
            onClick={() => setActivePanel('language')}
            value={settings.language}
          />
          <MenuItem
            icon={Volume2}
            label="Voice Assistant"
            onClick={() => setActivePanel('voice-settings')}
            value={settings.voiceAssistant ? 'On' : 'Off'}
          />
          <MenuItem
            icon={Settings}
            label="Text Size"
            onClick={() => setActivePanel('text-size')}
            value={settings.textSize.charAt(0).toUpperCase() + settings.textSize.slice(1)}
          />
          <MenuItem
            icon={Sun}
            label="High Contrast Mode"
            onClick={() => setActivePanel('contrast')}
            value={settings.highContrast ? 'On' : 'Off'}
          />
        </Section>

        {/* App Settings */}
        <Section title="⚙️ App Settings">
          <MenuItem
            icon={settings.offlineMode ? WifiOff : Wifi}
            label="Offline Mode"
            onClick={() => setActivePanel('offline-mode')}
            value={settings.offlineMode ? 'On' : 'Off'}
          />
          <MenuItem
            icon={RefreshCw}
            label="Auto Sync"
            onClick={() => setActivePanel('auto-sync')}
            value={settings.autoSync ? 'On' : 'Off'}
          />
          <MenuItem
            icon={Database}
            label="Data Usage"
            onClick={() => setActivePanel('data-usage')}
            value={settings.dataUsage.total}
          />
          <MenuItem
            icon={Trash2}
            label="Clear Cache"
            onClick={() => setActivePanel('clear-cache')}
            value={settings.cache.size}
          />
        </Section>

        {/* Privacy & Security */}
        <Section title="🔐 Privacy & Security">
          <MenuItem
            icon={Lock}
            label="Change Password"
            onClick={() => setActivePanel('change-password')}
          />
          <MenuItem
            icon={Fingerprint}
            label="Biometric Login"
            onClick={() => setActivePanel('biometric')}
            value={settings.biometric ? 'On' : 'Off'}
          />
          <MenuItem
            icon={Shield}
            label="Privacy Policy"
            onClick={() => setActivePanel('privacy-policy')}
          />
          <MenuItem
            icon={FileText}
            label="Terms of Service"
            onClick={() => setActivePanel('terms')}
          />
          <MenuItem
            icon={Trash2}
            label="Delete Account"
            onClick={() => setActivePanel('delete-account')}
            danger
          />
        </Section>

        {/* About & Support */}
        <Section title="ℹ️ About & Support">
          <MenuItem
            icon={Info}
            label="About MediConnect"
            onClick={() => setActivePanel('about')}
            value="v2.0.0"
          />
          <MenuItem
            icon={BookOpen}
            label="User Guide"
            onClick={() => setActivePanel('guide')}
          />
          <MenuItem
            icon={HelpCircle}
            label="FAQs"
            onClick={() => setActivePanel('faqs')}
          />
          <MenuItem
            icon={MessageSquare}
            label="Contact Support"
            onClick={() => setActivePanel('contact')}
          />
          <MenuItem
            icon={MessageSquare}
            label="Send Feedback"
            onClick={() => setActivePanel('feedback')}
          />
          <MenuItem
            icon={Star}
            label="Rate MediConnect"
            onClick={() => setActivePanel('rate')}
          />
        </Section>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" /> Sign Out
        </button>

        {/* Bottom Padding */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default PatientMoreTab;