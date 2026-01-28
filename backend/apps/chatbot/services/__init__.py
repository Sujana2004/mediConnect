# """
# Chatbot Services
# ================
# Service layer for chatbot functionality.
# """

# from .openai_service import AzureOpenAIService
# from .speech_service import AzureSpeechService
# from .translation_service import AzureTranslationService
# from .intent_service import IntentDetectionService
# from .language_service import LanguageDetectionService
# from .chat_service import ChatService

# __all__ = [
#     'AzureOpenAIService',
#     'AzureSpeechService',
#     'AzureTranslationService',
#     'IntentDetectionService',
#     'LanguageDetectionService',
#     'ChatService',
# ]

"""
Chatbot Services
================
All services for the chatbot functionality.
Using FREE alternatives - no paid APIs required!
"""

from .language_service import LanguageDetectionService
from .intent_service import IntentDetectionService
from .groq_service import GroqService, get_groq_service
from .free_translation_service import FreeTranslationService, get_free_translation_service

# For backwards compatibility, create aliases
def get_translation_service():
    """Get translation service (free version)."""
    return get_free_translation_service()

def get_openai_service():
    """Get AI service (Groq - free version)."""
    return get_groq_service()

# Speech service placeholder (handled in frontend with Web Speech API)
class DummySpeechService:
    """Placeholder - speech is handled in frontend."""
    is_configured = False
    speech_region = None
    
    def text_to_speech_base64(self, text, language):
        return None, "Speech is handled in frontend using Web Speech API"

def get_speech_service():
    """Speech is handled in frontend with Web Speech API."""
    return DummySpeechService()

__all__ = [
    'LanguageDetectionService',
    'IntentDetectionService',
    'GroqService',
    'get_groq_service',
    'FreeTranslationService',
    'get_free_translation_service',
    'get_translation_service',
    'get_openai_service',
    'get_speech_service',
]