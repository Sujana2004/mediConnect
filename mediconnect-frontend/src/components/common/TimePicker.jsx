import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Clock, AlertCircle } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

/**
 * Time Picker component
 */
const TimePicker = ({
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  minTime,
  maxTime,
  interval = 30, // minutes
  format24h = false,
  className = '',
  name,
  id,
  ...props
}) => {
  const { t, formatTime } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const inputId = id || name || 'time-picker';

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    const startMinutes = minTime ? timeToMinutes(minTime) : 0;
    const endMinutes = maxTime ? timeToMinutes(maxTime) : 24 * 60 - interval;

    for (let minutes = startMinutes; minutes <= endMinutes; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time24 = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      // Convert to 12h format for display
      let displayTime;
      if (format24h) {
        displayTime = time24;
      } else {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        displayTime = `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
      }

      slots.push({ value: time24, label: displayTime });
    }

    return slots;
  }, [minTime, maxTime, interval, format24h]);

  // Helper to convert time string to minutes
  function timeToMinutes(time) {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  }

  // Get display value
  const getDisplayValue = () => {
    if (!value) return null;
    const slot = timeSlots.find(s => s.value === value);
    return slot?.label || formatTime(value);
  };

  // Handle time selection
  const handleSelect = (time) => {
    onChange?.({
      target: {
        name,
        value: time
      }
    });
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`}>
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

      {/* Input */}
      <button
        type="button"
        id={inputId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3
          rounded-lg border bg-white text-left
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error 
            ? 'border-danger-500' 
            : isOpen 
              ? 'border-primary-500 ring-2 ring-primary-100'
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
        {...props}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {getDisplayValue() || placeholder || t('doctors.selectTime')}
        </span>
        <Clock size={18} className="text-gray-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-64 overflow-y-auto">
          <div className="p-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => handleSelect(slot.value)}
                className={`
                  w-full px-4 py-2.5 text-left rounded-lg text-sm
                  transition-colors duration-150
                  ${value === slot.value
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-sm text-danger-600 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

TimePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  minTime: PropTypes.string,
  maxTime: PropTypes.string,
  interval: PropTypes.number,
  format24h: PropTypes.bool,
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string
};

export default TimePicker;