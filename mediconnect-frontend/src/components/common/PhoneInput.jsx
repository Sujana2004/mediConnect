import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Phone, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

/**
 * Phone Input component specifically for Indian phone numbers
 * Enhanced for mobile and desktop responsiveness
 */
const PhoneInput = forwardRef(({
  value = '',
  onChange,
  onBlur,
  onFocus,
  error,
  label,
  placeholder,
  disabled = false,
  required = false,
  showCountryCode = true,
  autoFocus = false,
  size = 'md',
  className = '',
  name,
  id,
  ...props
}, ref) => {
  const { t } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || name || 'phone-input';

  // Enhanced size styles for better mobile touch targets
  const sizeStyles = {
    sm: 'py-2.5 text-sm h-11',
    md: 'py-3 text-base h-12 sm:h-13',
    lg: 'py-4 text-lg h-14 sm:h-15'
  };

  // Enhanced font sizes for mobile readability
  const inputFontSize = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl'
  };

  // Format phone number (add spaces for readability)
  const formatPhoneNumber = (phone) => {
    const cleaned = (phone || '').replace(/\D/g, '').slice(0, 10);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  };

  // Handle input change
  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange?.({
      target: {
        name,
        value: rawValue
      }
    });
  };

  // Handle focus
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  // Handle blur
  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Validate phone number
  const isValidPhone = (phone) => {
    return /^[6-9]\d{9}$/.test(phone);
  };

  const cleanValue = (value || '').replace(/\D/g, '');
  const displayValue = formatPhoneNumber(value);
  const isValid = cleanValue.length === 10 && isValidPhone(cleanValue);

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm sm:text-base font-semibold text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative group">
        <div
          className={`
            flex items-center rounded-2xl border-2 bg-white
            transition-all duration-300 ease-out
            shadow-sm hover:shadow-md
            ${error 
              ? 'border-red-400 bg-red-50/30 focus-within:ring-4 focus-within:ring-red-100 focus-within:border-red-500' 
              : isFocused
                ? 'border-primary-500 ring-4 ring-primary-100 shadow-lg shadow-primary-200/50'
                : isValid
                  ? 'border-green-400 bg-green-50/30 hover:border-green-500'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}
          `}
        >
          {/* Country code */}
          {showCountryCode && (
            <div className={`
              flex items-center gap-2 pl-3 sm:pl-4 pr-2 sm:pr-3 
              border-r-2 border-gray-200
              ${sizeStyles[size]}
            `}>
              {/* India Flag Emoji */}
              <span className="text-xl sm:text-2xl" role="img" aria-label="India">🇮🇳</span>
              {/* Country Code */}
              <span className="text-gray-800 font-bold text-sm sm:text-base hidden xs:inline">+91</span>
              <span className="text-gray-800 font-bold text-sm sm:text-base xs:hidden">91</span>
            </div>
          )}

          {/* Phone icon (if no country code) */}
          {!showCountryCode && (
            <div className="pl-3 sm:pl-4 pr-2">
              <Smartphone size={20} className="text-gray-400" />
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder || t('auth.enterPhone', 'Enter phone number')}
            className={`
              flex-1 px-3 sm:px-4 bg-transparent
              focus:outline-none
              disabled:cursor-not-allowed
              placeholder:text-gray-400
              font-semibold tracking-wide
              ${inputFontSize[size]}
              ${sizeStyles[size]}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />

          {/* Validation indicator */}
          {cleanValue.length > 0 && (
            <div className="pr-3 sm:pr-4 flex items-center">
              {isValid ? (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle size={20} className="animate-scale-in" />
                  <span className="hidden sm:inline text-xs font-semibold">Valid</span>
                </div>
              ) : cleanValue.length === 10 ? (
                <div className="flex items-center gap-1.5 text-red-500">
                  <AlertCircle size={20} className="animate-shake" />
                  <span className="hidden sm:inline text-xs font-semibold">Invalid</span>
                </div>
              ) : (
                <span className="text-xs sm:text-sm text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                  {cleanValue.length}/10
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile helper - shows when focused */}
        {isFocused && cleanValue.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 sm:hidden">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
              <Smartphone size={16} className="flex-shrink-0" />
              <span>Enter 10-digit mobile number</span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div 
          id={`${inputId}-error`}
          className="mt-2 sm:mt-3 text-sm sm:text-base text-red-600 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
          role="alert"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Helper text */}
      {!error && cleanValue.length > 0 && cleanValue.length < 10 && (
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
            {10 - cleanValue.length}
          </span>
          <span>
            {10 - cleanValue.length} {t('common.digitsRemaining', 'more digits needed')}
          </span>
        </p>
      )}

      {/* Success message */}
      {isValid && !error && (
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-green-700 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-2.5">
          <CheckCircle size={14} className="flex-shrink-0" />
          <span className="font-medium">Valid mobile number ✓</span>
        </p>
      )}
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

PhoneInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  error: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  showCountryCode: PropTypes.bool,
  autoFocus: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string
};

export default PhoneInput;