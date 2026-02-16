import { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter
} from 'date-fns';
import useLanguage from '../../hooks/useLanguage';

/**
 * Date Picker component
 */
const DatePicker = forwardRef(({
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  disabledDates = [],
  className = '',
  name,
  id,
  ...props
}, ref) => {
  const { t, formatDate } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  const inputId = id || name || 'date-picker';

  // Get days in current month view
  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  // Check if date is disabled
  const isDateDisabled = (date) => {
    if (minDate && isBefore(date, new Date(minDate))) return true;
    if (maxDate && isAfter(date, new Date(maxDate))) return true;
    return disabledDates.some(d => isSameDay(new Date(d), date));
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;
    
    onChange?.({
      target: {
        name,
        value: format(date, 'yyyy-MM-dd')
      }
    });
    setIsOpen(false);
  };

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`relative w-full ${className}`} ref={ref}>
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
      <div className="relative">
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
            {value 
              ? formatDate(value, { year: 'numeric', month: 'long', day: 'numeric' })
              : placeholder || t('doctors.selectDate')
            }
          </span>
          <Calendar size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full sm:w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((day) => (
              <div 
                key={day} 
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth().map((date, index) => {
              const isSelected = value && isSameDay(new Date(value), date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isDisabled = isDateDisabled(date);
              const isTodayDate = isToday(date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={isDisabled || !isCurrentMonth}
                  className={`
                    w-10 h-10 rounded-full text-sm font-medium
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                    ${isSelected
                      ? 'bg-primary-600 text-white'
                      : isTodayDate
                        ? 'bg-primary-100 text-primary-700'
                        : isCurrentMonth
                          ? 'text-gray-900 hover:bg-gray-100'
                          : 'text-gray-300'
                    }
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => handleDateClick(new Date())}
              className="w-full py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              {t('common.today')}
            </button>
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
});

DatePicker.displayName = 'DatePicker';

DatePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  disabledDates: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string
};

export default DatePicker;