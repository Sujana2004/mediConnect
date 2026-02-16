import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable TextArea component
 */
const TextArea = forwardRef(({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  helperText,
  disabled = false,
  readOnly = false,
  required = false,
  fullWidth = true,
  rows = 4,
  maxLength,
  showCount = false,
  resize = 'vertical',
  className = '',
  textAreaClassName = '',
  name,
  id,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || name || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const currentLength = value?.length || 0;

  // Resize styles
  const resizeStyles = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
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
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      {/* TextArea */}
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`
          w-full px-4 py-3 rounded-lg border bg-white
          text-base transition-colors duration-200
          focus:outline-none focus:ring-2
          disabled:bg-gray-100 disabled:cursor-not-allowed
          read-only:bg-gray-50
          ${error 
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          }
          ${resizeStyles[resize] || resizeStyles.vertical}
          ${textAreaClassName}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` : 
          helperText ? `${inputId}-helper` : 
          undefined
        }
        {...props}
      />

      {/* Bottom row - error/helper and count */}
      <div className="flex justify-between items-start mt-1.5">
        <div className="flex-1">
          {/* Error message */}
          {error && (
            <p 
              id={`${inputId}-error`}
              className="text-sm text-danger-600 flex items-center gap-1"
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
              className="text-sm text-gray-500"
            >
              {helperText}
            </p>
          )}
        </div>

        {/* Character count */}
        {showCount && maxLength && (
          <span className={`
            text-sm ml-2 flex-shrink-0
            ${currentLength >= maxLength ? 'text-danger-600' : 'text-gray-400'}
          `}>
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});

TextArea.displayName = 'TextArea';

TextArea.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  rows: PropTypes.number,
  maxLength: PropTypes.number,
  showCount: PropTypes.bool,
  resize: PropTypes.oneOf(['none', 'vertical', 'horizontal', 'both']),
  className: PropTypes.string,
  textAreaClassName: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string
};

export default TextArea;