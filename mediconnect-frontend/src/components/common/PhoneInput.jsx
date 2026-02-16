import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Phone, AlertCircle, CheckCircle } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

/**
 * Phone Input component specifically for Indian phone numbers
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

  // Size styles
  const sizeStyles = {
    sm: 'py-2 text-sm',
    md: 'py-3 text-base',
    lg: 'py-3.5 text-lg'
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
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        <div
          className={`
            flex items-center rounded-xl border-2 bg-white
            transition-all duration-200
            ${error 
              ? 'border-danger-500 focus-within:ring-2 focus-within:ring-danger-100' 
              : isFocused
                ? 'border-primary-500 ring-4 ring-primary-100'
                : isValid
                  ? 'border-green-400 hover:border-green-500'
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${disabled ? 'bg-gray-50 opacity-60' : ''}
          `}
        >
          {/* Country code */}
          {showCountryCode && (
            <div className={`
              flex items-center gap-2 pl-4 pr-3 border-r border-gray-200
              ${sizeStyles[size]}
            `}>
              <span className="text-xl">🇮🇳</span>
              <span className="text-gray-700 font-semibold">+91</span>
            </div>
          )}

          {/* Phone icon (if no country code) */}
          {!showCountryCode && (
            <div className="pl-4 pr-2">
              <Phone size={20} className="text-gray-400" />
            </div>
          )}

          {/* Input field - REMOVED pattern attribute */}
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
              flex-1 px-3 bg-transparent
              focus:outline-none
              disabled:cursor-not-allowed
              placeholder:text-gray-400
              font-medium tracking-wide
              ${sizeStyles[size]}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />

          {/* Validation indicator */}
          {cleanValue.length > 0 && (
            <div className="pr-4">
              {isValid ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : cleanValue.length === 10 ? (
                <AlertCircle size={20} className="text-danger-500" />
              ) : (
                <span className="text-xs text-gray-400 font-medium">
                  {cleanValue.length}/10
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-2 text-sm text-danger-600 flex items-center gap-1.5"
          role="alert"
        >
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && cleanValue.length > 0 && cleanValue.length < 10 && (
        <p className="mt-2 text-sm text-gray-500">
          {10 - cleanValue.length} {t('common.digitsRemaining', 'more digits needed')}
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