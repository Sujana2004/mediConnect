"""
Free Translation Service
========================
Uses deep-translator library for free translation.
Supports Google Translate (free tier).
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import deep_translator
try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False
    logger.warning("deep-translator not installed. Run: pip install deep-translator")


class FreeTranslationService:
    """
    Free translation using Google Translate via deep-translator.
    No API key required!
    """
    
    # Language codes
    LANGUAGE_CODES = {
        'en': 'english',
        'te': 'telugu',
        'hi': 'hindi',
    }
    
    def __init__(self):
        self.is_configured = TRANSLATOR_AVAILABLE
        
        if self.is_configured:
            logger.info("✅ Free Translation Service initialized")
        else:
            logger.warning("Translation service not available")
    
    def translate(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> str:
        """
        Translate text to target language.
        
        Args:
            text: Text to translate
            target_language: Target language code (en, te, hi)
            source_language: Source language code (optional, auto-detect)
            
        Returns:
            Translated text
        """
        if not self.is_configured:
            logger.warning("Translation not available, returning original")
            return text
        
        if not text or not text.strip():
            return text
        
        # Don't translate if same language
        if source_language and source_language == target_language:
            return text
        
        try:
            # Get full language names
            target_lang = self.LANGUAGE_CODES.get(target_language, target_language)
            source_lang = 'auto'
            if source_language:
                source_lang = self.LANGUAGE_CODES.get(source_language, source_language)
            
            # Create translator
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            
            # Translate
            result = translator.translate(text)
            
            logger.debug(f"Translated to {target_language}: {text[:30]}... -> {result[:30]}...")
            
            return result or text
            
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text
    
    def translate_to_english(self, text: str, source_language: str) -> str:
        """Translate text to English."""
        if source_language == 'en':
            return text
        return self.translate(text, 'en', source_language)
    
    def translate_from_english(self, text: str, target_language: str) -> str:
        """Translate English text to target language."""
        if target_language == 'en':
            return text
        return self.translate(text, target_language, 'en')
    
    def detect_and_translate_to_english(self, text: str) -> tuple:
        """
        Detect language and translate to English.
        
        Returns:
            Tuple of (translated_text, detected_language)
        """
        from .language_service import LanguageDetectionService
        
        detected_lang, confidence = LanguageDetectionService.detect(text)
        
        if detected_lang == 'en':
            return text, 'en'
        
        translated = self.translate_to_english(text, detected_lang)
        return translated, detected_lang


# Singleton instance
_translation_service = None

def get_free_translation_service() -> FreeTranslationService:
    """Get translation service instance."""
    global _translation_service
    if _translation_service is None:
        _translation_service = FreeTranslationService()
    return _translation_service