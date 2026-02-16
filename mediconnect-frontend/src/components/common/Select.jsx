import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, AlertCircle } from 'lucide-react';

/**
 * Reusable Select component
 */
const Select = forwardRef(({
  label,
  options = [],
  value,
  onChange,
  onBlur,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = true,
  size = 'md',
  className = '',
  selectClassName = '',
  name,
  id,
  ...props
}, ref) => {
  const inputId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-3.5 text-lg'
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

      {/* Select wrapper */}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border bg-white appearance-none
            transition-colors duration-200 cursor-pointer
            focus:outline-none focus:ring-2
            disabled:bg-gray-100 disabled:cursor-not-allowed
            pr-10
            ${sizeStyles[size] || sizeStyles.md}
            ${error 
              ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
            }
            ${selectClassName}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : 
            undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="text-gray-400" size={18} />
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

Select.displayName = 'Select';

Select.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool
    })
  ).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  selectClassName: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string
};

export default Select;