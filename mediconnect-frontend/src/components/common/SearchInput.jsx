import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Search, X, Mic, Loader2 } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';
import useVoice from '../../hooks/useVoice';

/**
 * Search Input component with voice support and debouncing
 */
const SearchInput = ({
  value = '',
  onChange,
  onSearch,
  onClear,
  placeholder,
  debounceMs = 300,
  showVoice = true,
  showClear = true,
  loading = false,
  disabled = false,
  autoFocus = false,
  size = 'md',
  variant = 'default',
  className = '',
  ...props
}) => {
  const { t } = useLanguage();
  const { 
    isSupported: voiceSupported, 
    isListening, 
    startListening, 
    stopListening,
    transcript,
    clearTranscript
  } = useVoice();

  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript) {
      setLocalValue(transcript);
      onChange?.(transcript);
      onSearch?.(transcript);
      clearTranscript();
    }
  }, [transcript, onChange, onSearch, clearTranscript]);

  // Size styles
  const sizeStyles = {
    sm: { input: 'py-2 text-sm', icon: 16, padding: 'pl-9 pr-9' },
    md: { input: 'py-2.5 text-base', icon: 18, padding: 'pl-10 pr-10' },
    lg: { input: 'py-3 text-lg', icon: 20, padding: 'pl-11 pr-11' }
  };

  // Variant styles
  const variantStyles = {
    default: `
      border border-gray-300 bg-white
      focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100
    `,
    filled: `
      border-0 bg-gray-100
      focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100
    `,
    minimal: `
      border-b border-gray-300 rounded-none
      focus-within:border-primary-500
    `
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // Debounced search
  const debouncedSearch = useCallback((searchValue) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch?.(searchValue);
    }, debounceMs);
  }, [debounceMs, onSearch]);

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
    
    if (debounceMs > 0) {
      debouncedSearch(newValue);
    }
  };

  // Handle clear
  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch?.(localValue);
    }

    if (e.key === 'Escape') {
      handleClear();
    }
  };

  // Handle voice click
  const handleVoiceClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasValue = localValue.length > 0;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          flex items-center rounded-lg transition-all duration-200
          ${variantStyles[variant] || variantStyles.default}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Search icon */}
        <div className="absolute left-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 
              size={currentSize.icon} 
              className="text-gray-400 animate-spin" 
            />
          ) : (
            <Search 
              size={currentSize.icon} 
              className={isFocused ? 'text-primary-500' : 'text-gray-400'}
            />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder || t('common.search')}
          className={`
            w-full bg-transparent rounded-lg
            focus:outline-none
            disabled:cursor-not-allowed
            placeholder:text-gray-400
            ${currentSize.input}
            ${currentSize.padding}
            ${showVoice && voiceSupported ? 'pr-20' : ''}
          `}
          {...props}
        />

        {/* Right side actions */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Clear button */}
          {showClear && hasValue && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Clear search"
            >
              <X size={currentSize.icon} />
            </button>
          )}

          {/* Voice button */}
          {showVoice && voiceSupported && (
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={disabled}
              className={`
                p-1.5 rounded-full transition-all duration-200
                ${isListening
                  ? 'bg-primary-600 text-white animate-pulse'
                  : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={isListening ? 'Stop listening' : 'Voice search'}
            >
              <Mic size={currentSize.icon} />
            </button>
          )}
        </div>
      </div>

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -bottom-6 left-0 right-0 text-center">
          <span className="text-xs text-primary-600 font-medium animate-pulse">
            {t('voice.listening')}
          </span>
        </div>
      )}
    </div>
  );
};

SearchInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSearch: PropTypes.func,
  onClear: PropTypes.func,
  placeholder: PropTypes.string,
  debounceMs: PropTypes.number,
  showVoice: PropTypes.bool,
  showClear: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  autoFocus: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['default', 'filled', 'minimal']),
  className: PropTypes.string
};

export default SearchInput;