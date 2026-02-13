import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function OTPVerifyScreen({ phone, onBack, onChangePhone, onVerify, sendOtp }) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSec, setResendSec] = useState(30);
  const inputRefs = useRef([]);
  const resendTimer = useRef(null);

  React.useEffect(() => {
    if (resendSec <= 0) return;
    resendTimer.current = setInterval(() => setResendSec((s) => s - 1), 1000);
    return () => clearInterval(resendTimer.current);
  }, [resendSec]);

  const otp = digits.join('');
  const complete = otp.length === 6;

  const focus = (i) => inputRefs.current[i]?.focus();

  const handleChange = (i, v) => {
    if (v && !/^\d$/.test(v)) return;
    const next = [...digits];
    next[i] = v.slice(-1);
    setDigits(next);
    setError('');
    if (v && i < 5) focus(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) focus(i - 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(next);
    setError('');
    focus(Math.min(pasted.length, 5));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complete) return;
    setError('');
    setLoading(true);
    const result = await onVerify(phone, otp);
    setLoading(false);
    if (result?.success && !result?.requiresRegistration) return;
    if (result?.success && result?.requiresRegistration) return;
    setError(result?.error || 'Invalid OTP. Please try again.');
  };

  const handleResend = async () => {
    if (resendSec > 0) return;
    setResendSec(30);
    await sendOtp(phone);
  };

  const displayPhone = phone.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={onBack} className="p-2 -ml-2 text-gray-600" aria-label="Back">←</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Verify OTP</h1>
        <span className="text-sm text-gray-500">🌐 తెలుగు ▼</span>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center text-4xl mb-6">📱</div>
        <p className="text-lg font-medium text-gray-900">Enter Verification Code</p>
        <p className="text-sm text-gray-500 mt-1">ధృవీకరణ కోడ్ నమోదు చేయండి</p>
        <p className="text-gray-600 mt-4 text-center">We've sent a 6-digit OTP to</p>
        <p className="font-medium text-gray-900">{displayPhone}</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-8">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            ))}
          </div>
          {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}

          <button
            type="submit"
            disabled={!complete || loading}
            className="w-full mt-8 py-4 rounded-xl bg-primary-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : '✅ Verify & Continue'}
          </button>
        </form>

        <p className="text-gray-600 mt-6 text-sm">Didn't receive OTP?</p>
        {resendSec > 0 ? (
          <p className="text-gray-500 text-sm">⏱️ Resend OTP in {resendSec} seconds</p>
        ) : (
          <button type="button" onClick={handleResend} className="text-primary-600 font-medium text-sm mt-1">
            🔄 Resend OTP
          </button>
        )}
        {/* Show test OTP hint in development or when SMS may not be configured */}
        {(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4 text-xs text-center">
            📱 SMS not set up? For testing, use OTP: <strong>123456</strong> to continue.
          </p>
        )}
        <button type="button" onClick={onChangePhone} className="text-gray-600 text-sm mt-4 underline">
          ✏️ Change Phone Number
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center pb-4">OTP is valid for 5 minutes.</p>
    </div>
  );
}
