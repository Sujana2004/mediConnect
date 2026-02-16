import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ toast, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!toast) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600',
  };

  const Icon = icons[toast.type] || Info;

  return (
    <div 
      className={`fixed top-4 left-4 right-4 max-w-sm mx-auto z-[80] p-4 rounded-lg shadow-lg text-white ${colors[toast.type] || colors.info}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="flex-1 text-sm">{toast.message}</p>
        <button 
          onClick={onClose} 
          className="hover:opacity-80 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

Toast.propTypes = {
  toast: PropTypes.shape({
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  }),
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
};

export default Toast;