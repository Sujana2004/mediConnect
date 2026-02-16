// pages/patient/PatientMoreTab/components.jsx

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, ChevronRight } from 'lucide-react';

// ============================================
// DETAIL PANEL - Full screen sliding panel
// ============================================
export const DetailPanel = ({ title, children, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Close panel"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-8">{children}</div>
    </div>
  );
};

DetailPanel.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// MENU ITEM - Settings menu row
// ============================================
export const MenuItem = ({ icon: Icon, label, onClick, value, description, danger = false }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 border-b transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
      danger ? 'hover:bg-red-50' : ''
    }`}
  >
    <div className="flex items-center gap-3 flex-1">
      <div className={`p-2 rounded-lg ${danger ? 'bg-red-100' : 'bg-primary-100'}`}>
        <Icon className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-primary-600'}`} />
      </div>
      <div className="text-left">
        <span className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-800'}`}>{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-gray-500 font-medium">{value}</span>}
      <ChevronRight className={`h-4 w-4 ${danger ? 'text-red-400' : 'text-gray-400'}`} />
    </div>
  </button>
);

MenuItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  value: PropTypes.string,
  description: PropTypes.string,
  danger: PropTypes.bool,
};

// ============================================
// SECTION - Settings section wrapper
// ============================================
export const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b bg-gray-50">
      <h3 className="font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="divide-y">{children}</div>
  </div>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// ============================================
// LOADING SPINNER
// ============================================
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-white border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

// ============================================
// INPUT FIELD
// ============================================
export const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  ...props
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      {...props}
    />
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

InputField.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
};

// ============================================
// SELECT FIELD
// ============================================
export const SelectField = ({ label, value, onChange, options, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
    >
      {options.map((opt) => (
        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  </div>
);

SelectField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  required: PropTypes.bool,
};

// ============================================
// INFO CARD
// ============================================
export const InfoCard = ({ icon: Icon, title, description, color = 'blue', children }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };

  const iconColorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  const textColorClasses = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    red: 'text-red-900',
    amber: 'text-amber-900',
    indigo: 'text-indigo-900',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`p-3 rounded-xl ${iconColorClasses[color]}`}>
            <Icon className="h-8 w-8" />
          </div>
        )}
        <div>
          <h3 className={`font-bold ${textColorClasses[color]}`}>{title}</h3>
          {description && <p className={`text-sm ${textColorClasses[color]} opacity-80`}>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};

InfoCard.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'green', 'red', 'amber', 'indigo']),
  children: PropTypes.node,
};

// ============================================
// ACTION BUTTON
// ============================================
export const ActionButton = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon: Icon,
}) => {
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400',
    outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 disabled:border-gray-300 disabled:text-gray-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${fullWidth ? 'w-full' : ''} py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon className="h-5 w-5" />}
          {children}
        </>
      )}
    </button>
  );
};

ActionButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'outline']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  icon: PropTypes.elementType,
};