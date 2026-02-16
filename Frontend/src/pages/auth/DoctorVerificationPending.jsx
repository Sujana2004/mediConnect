// src/pages/auth/DoctorVerificationPending.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  CheckCircle,
  Mail,
  Phone,
  FileText,
  Home,
  LogOut,
  HelpCircle,
  RefreshCw,
  Bell,
  Shield,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DoctorVerificationPending = ({
  onContinue,
  onContactSupport,
  onLogout,
  referenceId = null,
  submittedAt = null,
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  // State
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Calculate time since submission
  const [timeSince, setTimeSince] = useState('');

  useEffect(() => {
    if (submittedAt) {
      const updateTime = () => {
        const now = new Date();
        const submitted = new Date(submittedAt);
        const diffMs = now - submitted;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
          setTimeSince(t('pending.hoursAgo', '{{hours}}h {{mins}}m ago', { hours: diffHours, mins: diffMins }));
        } else {
          setTimeSince(t('pending.minsAgo', '{{mins}} minutes ago', { mins: diffMins }));
        }
      };

      updateTime();
      const interval = setInterval(updateTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [submittedAt, t]);

  // Copy reference ID
  const copyReferenceId = async () => {
    if (!referenceId) return;
    
    try {
      await navigator.clipboard.writeText(referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Check verification status
  const checkStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      // TODO: Call API to check verification status
      // const response = await authAPI.getProfile();
      // if (response.data?.is_verified) {
      //   onContinue();
      // }
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // For demo, show "still pending" message
    } catch (err) {
      console.error('Status check failed:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    if (onLogout) onLogout();
  };

  // Contact support via email
  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      const subject = encodeURIComponent(`Doctor Verification Status - ${referenceId || 'Request'}`);
      const body = encodeURIComponent(`
Hi MediConnect Support,

I submitted my doctor registration and would like to check on the verification status.

Name: ${user?.full_name || user?.name || 'N/A'}
Phone: ${user?.phone_number || 'N/A'}
Reference ID: ${referenceId || 'N/A'}

Please let me know the status of my verification.

Thank you.
      `.trim());
      
      window.location.href = `mailto:support@mediconnect.com?subject=${subject}&body=${body}`;
    }
  };

  // Verification steps
  const verificationSteps = [
    {
      id: 'phone',
      icon: Phone,
      label: t('pending.phoneVerified', 'Phone number verified'),
      labelLocal: 'ఫోన్ నంబర్ ధృవీకరించబడింది',
      status: 'completed',
    },
    {
      id: 'documents',
      icon: FileText,
      label: t('pending.documentsUploaded', 'Documents uploaded'),
      labelLocal: 'పత్రాలు అప్‌లోడ్ చేయబడ్డాయి',
      status: 'completed',
    },
    {
      id: 'review',
      icon: Shield,
      label: t('pending.underReview', 'Under review by our team'),
      labelLocal: 'మా బృందం సమీక్షలో ఉంది',
      status: 'pending',
    },
    {
      id: 'approval',
      icon: CheckCircle,
      label: t('pending.approval', 'Account approval'),
      labelLocal: 'ఖాతా ఆమోదం',
      status: 'upcoming',
    },
  ];

  return (
    <div className="flex flex-col items-center p-6 sm:p-8">
      {/* Success Animation */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center animate-pulse">
          <Clock className="h-12 w-12 text-amber-600" />
        </div>
        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-200 animate-ping opacity-20" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 text-center">
        {t('pending.title', 'Registration Submitted Successfully!')}
      </h1>
      <p className="text-sm text-gray-500 text-center mt-1">
        {t('pending.titleLocal', 'రిజిస్ట్రేషన్ విజయవంతంగా సమర్పించబడింది!')}
      </p>

      {/* Subtitle */}
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          {t('pending.accountPending', 'Your account is pending verification')}
        </p>
        <p className="text-sm text-gray-500">
          {t('pending.accountPendingLocal', 'మీ ఖాతా ధృవీకరణ పెండింగ్‌లో ఉంది')}
        </p>
      </div>

      {/* Reference ID (if available) */}
      {referenceId && (
        <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">
            {t('pending.referenceId', 'Reference ID')}:
          </span>
          <span className="font-mono font-bold text-gray-900">{referenceId}</span>
          <button
            onClick={copyReferenceId}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title={t('pending.copy', 'Copy')}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Time since submission */}
      {timeSince && (
        <p className="mt-2 text-xs text-gray-500">
          {t('pending.submitted', 'Submitted')}: {timeSince}
        </p>
      )}

      {/* Verification Status Card */}
      <div className="w-full max-w-sm mt-6 p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          {t('pending.verificationStatus', 'Verification Status')}
        </h2>

        <div className="space-y-4">
          {verificationSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';
            const isUpcoming = step.status === 'upcoming';

            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Step indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isPending
                        ? 'bg-amber-100 text-amber-600 animate-pulse'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isPending ? (
                      <Clock className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {/* Connector line */}
                  {index < verificationSteps.length - 1 && (
                    <div
                      className={`absolute left-1/2 top-8 w-0.5 h-6 -translate-x-1/2 ${
                        isCompleted ? 'bg-green-200' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className={`font-medium ${
                      isCompleted
                        ? 'text-green-700'
                        : isPending
                        ? 'text-amber-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estimated Time */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {t('pending.estimatedTime', 'Estimated time')}: 
            </span>
            <span className="font-medium text-gray-900">24-48 {t('pending.hours', 'hours')}</span>
          </div>
        </div>

        {/* Notification Info */}
        <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
          <Bell className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            {t('pending.notificationInfo', "We'll notify you via SMS and email once your account is verified.")}
          </span>
        </div>
      </div>

      {/* What's Next Card */}
      <div className="w-full max-w-sm mt-4 p-5 rounded-2xl bg-blue-50 border border-blue-100">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          {t('pending.whatsNext', "What's Next?")}
        </h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>{t('pending.step1', 'Our team will verify your documents')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>{t('pending.step2', "You'll receive a verification email/SMS")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>{t('pending.step3', 'Once approved, you can start accepting patients')}</span>
          </li>
        </ol>
      </div>

      {/* Check Status Button */}
      <button
        onClick={checkStatus}
        disabled={isCheckingStatus}
        className="mt-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
      >
        {isCheckingStatus ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('pending.checking', 'Checking status...')}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            {t('pending.checkStatus', 'Check verification status')}
          </>
        )}
      </button>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full max-w-sm">
        <button
          onClick={handleContactSupport}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          {t('pending.contactSupport', 'Contact Support')}
        </button>
        <button
          onClick={onContinue}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all"
        >
          <Home className="h-5 w-5" />
          {t('pending.goToHome', 'Go to Home')}
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          {t('pending.questions', 'Have questions?')}{' '}
          <a
            href="tel:+911234567890"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            {t('pending.callUs', 'Call us')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      {/* Logout Button */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="mt-4 flex items-center gap-2 text-gray-500 text-sm hover:text-red-600 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {t('pending.logout', 'Logout')}
      </button>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              {t('pending.logoutTitle', 'Logout?')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('pending.logoutMessage', "You'll need to login again to check your verification status.")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('pending.logout', 'Logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorVerificationPending;