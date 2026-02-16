import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Globe, Check, ChevronDown } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

/**
 * Language Switcher component
 */
const LanguageSwitcher = ({
  variant = 'dropdown', // 'dropdown' | 'buttons' | 'select' | 'minimal'
  showLabel = false,
  showFlag = false,
  size = 'md',
  className = ''
}) => {
  const { 
    currentLanguage, 
    currentLanguageInfo,
    supportedLanguages, 
    changeLanguage,
    isChanging,
    t 
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Size styles
  const sizeStyles = {
    sm: { button: 'px-2 py-1.5 text-sm', icon: 16 },
    md: { button: 'px-3 py-2 text-sm', icon: 18 },
    lg: { button: 'px-4 py-2.5 text-base', icon: 20 }
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle language change
  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  // Minimal variant - just icon
  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            p-2 rounded-full text-gray-600
            hover:bg-gray-100 transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500
          `}
          aria-label={t('settings.language')}
        >
          <Globe size={currentSize.icon} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={isChanging}
                className={`
                  w-full flex items-center justify-between px-4 py-2 text-sm
                  ${currentLanguage === lang.code
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  disabled:opacity-50
                `}
              >
                <span>{lang.nativeName}</span>
                {currentLanguage === lang.code && (
                  <Check size={16} className="text-primary-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Buttons variant - horizontal buttons
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && (
          <span className="text-sm text-gray-600 mr-2">
            {t('settings.language')}:
          </span>
        )}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isChanging}
              className={`
                ${currentSize.button} font-medium transition-colors
                ${currentLanguage === lang.code
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50
                border-r border-gray-200 last:border-r-0
              `}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Select variant - native select
  if (variant === 'select') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && (
          <label className="text-sm text-gray-600">
            {t('settings.language')}:
          </label>
        )}
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isChanging}
          className={`
            ${currentSize.button} rounded-lg border border-gray-300
            bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
            disabled:opacity-50
          `}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Default: Dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className={`
          flex items-center gap-2 ${currentSize.button}
          rounded-lg border border-gray-200 bg-white
          hover:bg-gray-50 transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500
          disabled:opacity-50
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe size={currentSize.icon} className="text-gray-500" />
        <span className="font-medium text-gray-700">
          {currentLanguageInfo?.nativeName}
        </span>
        <ChevronDown 
          size={currentSize.icon} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
          role="listbox"
        >
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isChanging}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 text-sm
                ${currentLanguage === lang.code
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50
              `}
              role="option"
              aria-selected={currentLanguage === lang.code}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-gray-400">{lang.name}</span>
              </div>
              {currentLanguage === lang.code && (
                <Check size={16} className="text-primary-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

LanguageSwitcher.propTypes = {
  variant: PropTypes.oneOf(['dropdown', 'buttons', 'select', 'minimal']),
  showLabel: PropTypes.bool,
  showFlag: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

export default LanguageSwitcher;