"""
Azure Translation Service
=========================
Handles text translation using Azure Translator API.
"""

import os
import logging
import requests
import uuid
from typing import Optional, List, Dict

from ..config import AZURE_TRANSLATOR_CONFIG

logger = logging.getLogger(__name__)


class AzureTranslationService:
    """
    Translates text between English, Telugu, and Hindi using Azure Translator.
    """
    
    def __init__(self):
        self.api_key = AZURE_TRANSLATOR_CONFIG['key']
        self.endpoint = AZURE_TRANSLATOR_CONFIG['endpoint']
        self.region = AZURE_TRANSLATOR_CONFIG['region']
        self.is_configured = bool(self.api_key and self.endpoint)
        
        if not self.is_configured:
            logger.warning("Azure Translator not configured. Translation will be disabled.")
    
    def translate(
        self, 
        text: str, 
        target_language: str, 
        source_language: Optional[str] = None
    ) -> Optional[str]:
        """
        Translate text to target language.
        
        Args:
            text: Text to translate
            target_language: Target language code (en, te, hi)
            source_language: Source language code (optional, auto-detect if None)
            
        Returns:
            Translated text or None if failed
        """
        if not self.is_configured:
            logger.warning("Translation skipped - Azure Translator not configured")
            return text  # Return original text
        
        if not text or not text.strip():
            return text
        
        # Don't translate if same language
        if source_language and source_language == target_language:
            return text
        
        try:
            # Azure Translator API endpoint
            path = '/translate'
            url = self.endpoint + path
            
            params = {
                'api-version': '3.0',
                'to': target_language,
            }
            
            if source_language:
                params['from'] = source_language
            
            headers = {
                'Ocp-Apim-Subscription-Key': self.api_key,
                'Ocp-Apim-Subscription-Region': self.region,
                'Content-type': 'application/json',
                'X-ClientTraceId': str(uuid.uuid4()),
            }
            
            body = [{'text': text}]
            
            response = requests.post(
                url, 
                params=params, 
                headers=headers, 
                json=body,
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result and len(result) > 0:
                translations = result[0].get('translations', [])
                if translations:
                    translated_text = translations[0].get('text', text)
                    logger.debug(f"Translated '{text[:50]}...' to {target_language}")
                    return translated_text
            
            return text
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Translation API error: {e}")
            return text
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text
    
    def translate_to_english(self, text: str, source_language: str) -> str:
        """Translate text to English for AI processing."""
        if source_language == 'en':
            return text
        return self.translate(text, 'en', source_language) or text
    
    def translate_from_english(self, text: str, target_language: str) -> str:
        """Translate English text to target language."""
        if target_language == 'en':
            return text
        return self.translate(text, target_language, 'en') or text
    
    def translate_batch(
        self, 
        texts: List[str], 
        target_language: str,
        source_language: Optional[str] = None
    ) -> List[str]:
        """
        Translate multiple texts in a single API call.
        
        Args:
            texts: List of texts to translate
            target_language: Target language code
            source_language: Source language code (optional)
            
        Returns:
            List of translated texts
        """
        if not self.is_configured:
            return texts
        
        if not texts:
            return texts
        
        try:
            path = '/translate'
            url = self.endpoint + path
            
            params = {
                'api-version': '3.0',
                'to': target_language,
            }
            
            if source_language:
                params['from'] = source_language
            
            headers = {
                'Ocp-Apim-Subscription-Key': self.api_key,
                'Ocp-Apim-Subscription-Region': self.region,
                'Content-type': 'application/json',
                'X-ClientTraceId': str(uuid.uuid4()),
            }
            
            body = [{'text': t} for t in texts]
            
            response = requests.post(
                url,
                params=params,
                headers=headers,
                json=body,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            
            translated = []
            for i, item in enumerate(result):
                translations = item.get('translations', [])
                if translations:
                    translated.append(translations[0].get('text', texts[i]))
                else:
                    translated.append(texts[i])
            
            return translated
            
        except Exception as e:
            logger.error(f"Batch translation error: {e}")
            return texts
    
    def detect_language(self, text: str) -> Optional[str]:
        """
        Detect language using Azure Translator.
        Falls back to local detection if API fails.
        """
        if not self.is_configured:
            from .language_service import LanguageDetectionService
            lang, _ = LanguageDetectionService.detect(text)
            return lang
        
        try:
            path = '/detect'
            url = self.endpoint + path
            
            params = {'api-version': '3.0'}
            
            headers = {
                'Ocp-Apim-Subscription-Key': self.api_key,
                'Ocp-Apim-Subscription-Region': self.region,
                'Content-type': 'application/json',
            }
            
            body = [{'text': text}]
            
            response = requests.post(
                url,
                params=params,
                headers=headers,
                json=body,
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result and len(result) > 0:
                return result[0].get('language', 'en')
            
            return 'en'
            
        except Exception as e:
            logger.error(f"Language detection API error: {e}")
            # Fall back to local detection
            from .language_service import LanguageDetectionService
            lang, _ = LanguageDetectionService.detect(text)
            return lang


# Singleton instance
_translation_service = None


def get_translation_service() -> AzureTranslationService:
    """Get singleton translation service instance."""
    global _translation_service
    if _translation_service is None:
        _translation_service = AzureTranslationService()
    return _translation_service