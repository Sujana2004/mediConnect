import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Reusable Input component with validation support
 */
const Input = forwardRef(({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  success,
  helperText,
  disabled = false,
  readOnly = false,
  required = false,
  fullWidth = true,
  leftIcon = null,
  rightIcon = null,
  size = 'md',
  className = '',
  inputClassName = '',
  labelClassName = '',
  name,
  id,
  autoComplete,
  autoFocus = false,
  maxLength,
  minLength,
  pattern,
  min,
  max,
  step,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  // Size styles
  const sizeStyles = {
    sm: {
      input: 'px-3 py-2 text-sm',
      icon: 16,
      label: 'text-sm'
    },
    md: {
      input: 'px-4 py-3 text-base',
      icon: 18,
      label: 'text-sm'
    },
    lg: {
      input: 'px-4 py-3.5 text-lg',
      icon: 20,
      label: 'text-base'
    }
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // Input state styles
  const getInputStateStyles = () => {
    if (error) {
      return 'border-danger-500 focus:ring-danger-500 focus:border-danger-500';
    }
    if (success) {
      return 'border-green-500 focus:ring-green-500 focus:border-green-500';
    }
    return 'border-gray-300 focus:ring-primary-500 focus:border-primary-500';
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

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className={`
            block font-medium text-gray-700 mb-1.5
            ${currentSize.label}
            ${labelClassName}
          `}
        >
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={`${error ? 'text-danger-500' : 'text-gray-400'}`}>
              {typeof leftIcon === 'function' 
                ? leftIcon({ size: currentSize.icon }) 
                : leftIcon
              }
            </span>
          </div>
        )}

        {/* Input field */}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          min={min}
          max={max}
          step={step}
          className={`
            w-full rounded-lg border bg-white
            transition-colors duration-200
            focus:outline-none focus:ring-2
            disabled:bg-gray-100 disabled:cursor-not-allowed
            read-only:bg-gray-50
            ${currentSize.input}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon || isPassword || error || success ? 'pr-10' : ''}
            ${getInputStateStyles()}
            ${inputClassName}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : 
            undefined
          }
          {...props}
        />

        {/* Right side icons */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {/* Success icon */}
          {success && !isPassword && (
            <CheckCircle 
              className="text-green-500" 
              size={currentSize.icon} 
            />
          )}

          {/* Error icon */}
          {error && !isPassword && (
            <AlertCircle 
              className="text-danger-500" 
              size={currentSize.icon} 
            />
          )}

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={currentSize.icon} />
              ) : (
                <Eye size={currentSize.icon} />
              )}
            </button>
          )}

          {/* Custom right icon */}
          {rightIcon && !isPassword && !error && !success && (
            <span className="text-gray-400">
              {typeof rightIcon === 'function' 
                ? rightIcon({ size: currentSize.icon }) 
                : rightIcon
              }
            </span>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-1.5 text-sm text-danger-600 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p 
          id={`${inputId}-helper`}
          className="mt-1.5 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  error: PropTypes.string,
  success: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  leftIcon: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  rightIcon: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
  autoComplete: PropTypes.string,
  autoFocus: PropTypes.bool,
  maxLength: PropTypes.number,
  minLength: PropTypes.number,
  pattern: PropTypes.string,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  step: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default Input;