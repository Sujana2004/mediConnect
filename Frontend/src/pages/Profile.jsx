import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { setUserData } from '../hooks/storage';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Lock,
  Heart,
  FileText,
  CreditCard,
  Settings,
  Camera,
  Edit2,
  Save,
  X,
  Key,
  LogOut,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Award,
  Users,
  Clock
} from 'lucide-react';
import { userAPI } from '../services/api';

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: true,
    appointmentReminders: true,
    medicineReminders: true,
    emergencyAlerts: true
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await userAPI.getProfile();
      setProfileData(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Mock data for demo
      setTimeout(() => {
        const mockProfile = {
          name: user?.name || 'John Doe',
          email: user?.email || 'john.doe@example.com',
          phone: '+91 9876543210',
          address: '123 Main Street, Delhi, India - 110001',
          dateOfBirth: '1990-01-15',
          gender: 'male',
          bloodGroup: 'O+',
          height: '175 cm',
          weight: '70 kg',
          emergencyContact: '+91 9123456789',
          emergencyContactName: 'Jane Doe',
          allergies: ['Penicillin', 'Dust'],
          chronicConditions: ['Asthma'],
          lastCheckup: '2024-01-10',
          nextCheckup: '2024-07-10'
        };
        setProfileData(mockProfile);
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await userAPI.updateProfile(profileData);

      // Update auth context and localStorage so session reflects changes
      try {
        if (updateUserProfile) updateUserProfile(profileData);
        setUserData({ ...JSON.parse(localStorage.getItem('mediconnect_user') || '{}'), ...profileData });
      } catch (e) {
        console.warn('Failed to update stored user data:', e);
      }

      // If backend returns updated user, prefer that
      if (res?.data) {
        const serverUser = res.data.user || res.data;
        if (serverUser) {
          if (updateUserProfile) updateUserProfile(serverUser);
          setUserData({ ...JSON.parse(localStorage.getItem('mediconnect_user') || '{}'), ...serverUser });
          setProfileData(prev => ({ ...prev, ...serverUser }));
        }
      }

      setIsEditing(false);
      // Show success message
    } catch (error) {
      console.error('Error updating profile:', error);
      // If network error (backend unreachable), persist changes locally and inform user
      const isNetworkError = error?.status === 0 || error?.code === 'ERR_NETWORK' || error?.originalError?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
      if (isNetworkError) {
        try {
          if (updateUserProfile) updateUserProfile(profileData);
          setUserData({ ...JSON.parse(localStorage.getItem('mediconnect_user') || '{}'), ...profileData });
        } catch (e) {
          console.warn('Failed to save profile locally:', e);
        }
        alert(t('profile.updateOffline') || 'Profile saved locally. It will sync when the server is available.');
      } else {
        // Prefer server-provided message when available
        const serverMsg = error?.message || error?.response?.data?.message || error?.response?.data || null;
        if (serverMsg) {
          // If it's an object, stringify small message
          const msg = typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg).slice(0, 200);
          alert(msg);
        } else {
          alert(t('profile.updateError'));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('profile.passwordMismatch'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert(t('profile.passwordLength'));
      return;
    }

    try {
      await userAPI.changePassword(passwordData);
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      alert(t('profile.passwordChanged'));
    } catch (error) {
      console.error('Error changing password:', error);
      alert(t('profile.passwordChangeError'));
    }
  };

  const handleDownloadData = () => {
    try {
      const data = profileData || {};
      const docHtml = `
        <html>
        <head>
          <title>Profile Export</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111827 }
            h1 { font-size: 24px; margin-bottom: 8px }
            .field { margin-bottom: 8px }
            .label { font-weight: 600; color: #374151 }
            .value { margin-left: 6px; color: #111827 }
            .section { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px }
          </style>
        </head>
        <body>
          <h1>Profile Data Export</h1>
          <div class="field"><span class="label">Name:</span><span class="value">${data.name || ''}</span></div>
          <div class="field"><span class="label">Email:</span><span class="value">${data.email || ''}</span></div>
          <div class="field"><span class="label">Phone:</span><span class="value">${data.phone || ''}</span></div>
          <div class="field"><span class="label">Address:</span><span class="value">${data.address || ''}</span></div>
          <div class="field"><span class="label">Date of Birth:</span><span class="value">${data.dateOfBirth || ''}</span></div>
          <div class="section">
            <h2>Medical Info</h2>
            <div class="field"><span class="label">Blood Group:</span><span class="value">${data.bloodGroup || ''}</span></div>
            <div class="field"><span class="label">Allergies:</span><span class="value">${(data.allergies || []).join(', ')}</span></div>
            <div class="field"><span class="label">Chronic Conditions:</span><span class="value">${(data.chronicConditions || []).join(', ')}</span></div>
          </div>
          <div class="section">
            <h2>Emergency Contact</h2>
            <div class="field"><span class="label">Name:</span><span class="value">${data.emergencyContactName || ''}</span></div>
            <div class="field"><span class="label">Phone:</span><span class="value">${data.emergencyContact || ''}</span></div>
          </div>
        </body>
        </html>
      `;

      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Please allow popups to download profile.');
        return;
      }
      w.document.open();
      w.document.write(docHtml);
      w.document.close();
      // Give the new window a moment to render then trigger print
      setTimeout(() => {
        w.focus();
        w.print();
        // don't auto-close: let user save or cancel; close after short delay
        setTimeout(() => { try { w.close(); } catch(e){} }, 1500);
      }, 500);
    } catch (e) {
      console.error('Download profile error', e);
      alert(t('profile.downloadError') || 'Failed to prepare profile for download.');
    }
  };

  const stats = user?.role === 'doctor' ? [
    { label: t('profile.totalPatients'), value: '125', icon: <Users className="h-5 w-5" /> },
    { label: t('profile.consultations'), value: '89', icon: <Clock className="h-5 w-5" /> },
    { label: t('profile.rating'), value: '4.8', icon: <Award className="h-5 w-5" /> },
    { label: t('profile.experience'), value: '12 years', icon: <Stethoscope className="h-5 w-5" /> }
  ] : [
    { label: t('profile.consultations'), value: '12', icon: <Clock className="h-5 w-5" /> },
    { label: t('profile.healthRecords'), value: '8', icon: <FileText className="h-5 w-5" /> },
    { label: t('profile.activeMedicines'), value: '3', icon: <Heart className="h-5 w-5" /> },
    { label: t('profile.daysActive'), value: '45', icon: <User className="h-5 w-5" /> }
  ];

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.fullName')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={profileData?.name || ''}
              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              disabled={!isEditing}
              className={`pl-10 block w-full px-3 py-2 border ${
                isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
              } rounded-lg`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.email')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={profileData?.email || ''}
              disabled
              className="pl-10 block w-full px-3 py-2 border border-transparent bg-gray-50 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.phone')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              value={profileData?.phone || ''}
              onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              disabled={!isEditing}
              className={`pl-10 block w-full px-3 py-2 border ${
                isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
              } rounded-lg`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.dateOfBirth')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              value={profileData?.dateOfBirth || ''}
              onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
              disabled={!isEditing}
              className={`pl-10 block w-full px-3 py-2 border ${
                isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
              } rounded-lg`}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.address')}
          </label>
          <div className="relative">
            <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <textarea
              value={profileData?.address || ''}
              onChange={(e) => setProfileData({...profileData, address: e.target.value})}
              disabled={!isEditing}
              rows="3"
              className={`pl-10 block w-full px-3 py-2 border ${
                isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
              } rounded-lg`}
            />
          </div>
        </div>
      </div>

      {user?.role === 'patient' && (
        <div className="border-t pt-6">
          <h4 className="font-bold text-gray-900 mb-4">{t('profile.healthInfo')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.bloodGroup')}
              </label>
              <input
                type="text"
                value={profileData?.bloodGroup || ''}
                onChange={(e) => setProfileData({...profileData, bloodGroup: e.target.value})}
                disabled={!isEditing}
                className={`block w-full px-3 py-2 border ${
                  isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
                } rounded-lg`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.height')}
              </label>
              <input
                type="text"
                value={profileData?.height || ''}
                onChange={(e) => setProfileData({...profileData, height: e.target.value})}
                disabled={!isEditing}
                className={`block w-full px-3 py-2 border ${
                  isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
                } rounded-lg`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.weight')}
              </label>
              <input
                type="text"
                value={profileData?.weight || ''}
                onChange={(e) => setProfileData({...profileData, weight: e.target.value})}
                disabled={!isEditing}
                className={`block w-full px-3 py-2 border ${
                  isEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'
                } rounded-lg`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Bell className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <h4 className="font-bold text-blue-900">{t('profile.notificationSettings')}</h4>
            <p className="text-blue-700 text-sm">{t('profile.notificationDescription')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(notifications).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900">
                {t(`profile.${key}`)}
              </div>
              <div className="text-sm text-gray-500">
                {t(`profile.${key}Desc`)}
              </div>
            </div>
            <button
              onClick={() => setNotifications({...notifications, [key]: !value})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                value ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <h4 className="font-bold text-green-900">{t('profile.security')}</h4>
            <p className="text-green-700 text-sm">{t('profile.securityDescription')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Key className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{t('profile.changePassword')}</div>
                <div className="text-sm text-gray-500">{t('profile.passwordLastChanged')}: 30 days ago</div>
              </div>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              {t('profile.change')}
            </button>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Lock className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{t('profile.twoFactorAuth')}</div>
                <div className="text-sm text-gray-500">{t('profile.addExtraSecurity')}</div>
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              {t('profile.enable')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('profile.title')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('profile.subtitle')}
              </p>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-0">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('profile.cancel')}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? t('profile.saving') : t('profile.save')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t('profile.editProfile')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <User className="h-16 w-16 text-blue-600" />
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{profileData?.name}</h3>
                <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mt-2">
                  {user?.role === 'doctor' ? (
                    <>
                      <Stethoscope className="h-3 w-3 mr-1" />
                      {t('profile.doctor')}
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 mr-1" />
                      {t('profile.patient')}
                    </>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{profileData?.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{profileData?.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h4 className="font-bold text-gray-900 mb-4">{t('profile.overview')}</h4>
              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 bg-white rounded-lg mr-3">
                        <div className="text-blue-600">{stat.icon}</div>
                      </div>
                      <span className="text-gray-700">{stat.label}</span>
                    </div>
                    <span className="font-bold text-gray-900">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border mb-6">
              <div className="flex border-b">
                {['personal', 'notifications', 'security', 'billing'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-sm font-medium ${
                      activeTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t(`profile.${tab}`)}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : activeTab === 'personal' ? (
                  renderPersonalInfo()
                ) : activeTab === 'notifications' ? (
                  renderNotifications()
                ) : activeTab === 'security' ? (
                  renderSecurity()
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t('profile.billingComingSoon')}
                    </h3>
                    <p className="text-gray-600">
                      {t('profile.billingDescription')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={logout}
                  className="p-4 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex flex-col items-center justify-center"
                >
                  <LogOut className="h-6 w-6 mb-2" />
                  <span className="font-medium">{t('profile.logout')}</span>
                </button>
                <button onClick={handleDownloadData} className="p-4 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 flex flex-col items-center justify-center">
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="font-medium">{t('profile.downloadData')}</span>
                </button>
                <button className="p-4 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 flex flex-col items-center justify-center">
                  <Settings className="h-6 w-6 mb-2" />
                  <span className="font-medium">{t('profile.advancedSettings')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('profile.changePassword')}
                </h3>
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {t('profile.passwordRequirements')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('profile.updatePassword')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;