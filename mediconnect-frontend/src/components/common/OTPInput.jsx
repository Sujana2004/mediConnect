import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

/**
 * OTP Input component for 6-digit verification codes
 */
const OTPInput = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
  className = ''
}) => {
  const { t } = useLanguage();
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  // Sync external value with internal state
  useEffect(() => {
    if (value) {
      const otpArray = value.split('').slice(0, length);
      while (otpArray.length < length) otpArray.push('');
      setOtp(otpArray);
    }
  }, [value, length]);

  // Auto focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Handle input change
  const handleChange = (index, e) => {
    const inputValue = e.target.value;
    
    // Only allow numbers
    if (inputValue && !/^\d+$/.test(inputValue)) return;

    // Handle paste
    if (inputValue.length > 1) {
      const pastedValue = inputValue.slice(0, length);
      const newOtp = [...otp];
      
      for (let i = 0; i < pastedValue.length && index + i < length; i++) {
        newOtp[index + i] = pastedValue[i];
      }
      
      setOtp(newOtp);
      
      const otpString = newOtp.join('');
      onChange?.(otpString);
      
      if (otpString.length === length) {
        onComplete?.(otpString);
      }
      
      // Focus next empty or last input
      const nextIndex = Math.min(index + pastedValue.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Handle single character
    const newOtp = [...otp];
    newOtp[index] = inputValue;
    setOtp(newOtp);

    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Auto-focus next input
    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits entered
    if (otpString.length === length) {
      onComplete?.(otpString);
    }
  };

  // Handle key down
  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Clear current input
        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      const newOtp = pastedData.split('');
      while (newOtp.length < length) newOtp.push('');
      
      setOtp(newOtp);
      
      const otpString = newOtp.join('');
      onChange?.(otpString);
      
      if (otpString.length === length) {
        onComplete?.(otpString);
        inputRefs.current[length - 1]?.focus();
      } else {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  // Handle focus
  const handleFocus = (index) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className={className}>
      {/* OTP Inputs */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={length} // Allow paste
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`
              w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-semibold
              rounded-lg border-2 bg-white
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error
                ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                : digit
                  ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }
            `}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-3 text-sm text-danger-600 flex items-center justify-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  );
};

OTPInput.propTypes = {
  length: PropTypes.number,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onComplete: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  autoFocus: PropTypes.bool,
  className: PropTypes.string
};

export default OTPInput;