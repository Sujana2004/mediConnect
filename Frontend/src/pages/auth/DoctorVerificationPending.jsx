import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function DoctorVerificationPending({ onContactSupport, onGoHome, onLogout }) {
  const { t } = useTranslation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  return (
    <div className="flex flex-col p-8 items-center justify-center">
      <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-5xl mb-6">⏳</div>
      <h1 className="text-xl font-bold text-gray-900 text-center">Registration Submitted Successfully!</h1>
      <p className="text-sm text-gray-500 text-center mt-1">రిజిస్ట్రేషన్ విజయవంతంగా సమర్పించబడింది!</p>
      <p className="text-gray-600 text-center mt-4">Your account is pending verification</p>
      <p className="text-sm text-gray-500 text-center">మీ ఖాతా ధృవీకరణ పెండింగ్‌లో ఉంది</p>

      <div className="w-full max-w-sm mt-8 p-4 rounded-xl border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-3">Verification Status</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>✅ Phone number verified</li>
          <li>✅ Documents uploaded</li>
          <li>⏳ Under review by our team</li>
        </ul>
        <p className="text-gray-500 text-sm mt-3">Estimated time: 24-48 hours</p>
        <p className="text-gray-500 text-sm">We'll notify you via SMS and email once verified.</p>
      </div>

      <div className="w-full max-w-sm mt-6 p-4 rounded-xl bg-gray-50">
        <h2 className="font-semibold text-gray-900 mb-2">What's Next?</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>Our team will verify your documents</li>
          <li>You'll receive a verification email/SMS</li>
          <li>Once approved, you can start accepting patients</li>
        </ol>
      </div>

      <div className="flex gap-4 mt-8">
        <button type="button" onClick={onContactSupport} className="px-6 py-3 border rounded-xl text-gray-700">
          📧 Contact Support
        </button>
        <button type="button" onClick={onGoHome} className="px-6 py-3 rounded-xl bg-primary-600 text-white font-medium">
          🏠 Go to Home
        </button>
      </div>
      <button type="button" onClick={handleLogout} className="mt-6 text-gray-500 text-sm underline">
        🚪 Logout
      </button>
    </div>
  );
}
