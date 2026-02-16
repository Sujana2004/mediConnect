import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { translateText } from '../../services/translation/translationService';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Component to display dynamically translated text
 * Use for: chatbot responses, user-generated content, API responses
 * DO NOT use for: UI labels, buttons (use i18n t() function instead)
 */
const TranslatedText = ({ 
  text, 
  sourceLang = 'en',
  className = '',
  showOriginal = false,
  fallback = null 
}) => {
  const { currentLanguage } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const translate = async () => {
      // No translation needed if same language or English target
      if (!text || sourceLang === currentLanguage) {
        setTranslatedText(text);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await translateText(text, sourceLang, currentLanguage);
        if (result.success) {
          setTranslatedText(result.translatedText);
        } else {
          setError(result.error);
          setTranslatedText(text); // Fallback to original
        }
      } catch (err) {
        setError(err.message);
        setTranslatedText(text);
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [text, sourceLang, currentLanguage]);

  if (isLoading) {
    return (
      <span className={`inline-block ${className}`}>
        {fallback || (
          <span className="animate-pulse bg-gray-200 rounded h-4 w-20 inline-block" />
        )}
      </span>
    );
  }

  return (
    <span className={className}>
      {translatedText}
      {showOriginal && translatedText !== text && (
        <span className="text-xs text-gray-400 ml-1">
          ({text})
        </span>
      )}
    </span>
  );
};

TranslatedText.propTypes = {
  text: PropTypes.string,
  sourceLang: PropTypes.oneOf(['en', 'hi', 'te']),
  className: PropTypes.string,
  showOriginal: PropTypes.bool,
  fallback: PropTypes.node
};

export default TranslatedText;