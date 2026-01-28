# """
# Main Chat Service
# =================
# Orchestrates all chatbot services - the main entry point for chat functionality.
# """

# import logging
# from typing import Dict, Optional, Tuple, List
# from django.utils import timezone
# from django.db import transaction

# from ..models import ChatSession, ChatMessage, FAQ, HealthTip, QuickReply
# from ..config import RESPONSE_TEMPLATES, SESSION_CONFIG
# from .language_service import LanguageDetectionService
# from .intent_service import IntentDetectionService
# from .translation_service import get_translation_service
# from .openai_service import get_openai_service
# from .speech_service import get_speech_service

# logger = logging.getLogger(__name__)


# class ChatService:
#     """
#     Main orchestration service for chatbot functionality.
#     Coordinates language detection, translation, intent detection, and AI responses.
#     """
    
#     def __init__(self):
#         self.translation_service = get_translation_service()
#         self.openai_service = get_openai_service()
#         self.speech_service = get_speech_service()
    
#     def start_session(self, user, language: str = 'en') -> ChatSession:
#         """
#         Start a new chat session for user.
        
#         Args:
#             user: Django user instance
#             language: Preferred language code
            
#         Returns:
#             New ChatSession instance
#         """
#         session = ChatSession.objects.create(
#             user=user,
#             language=language,
#             status='active'
#         )
        
#         logger.info(f"Started new chat session {session.id} for user {user.id}")
#         return session
    
#     def get_or_create_active_session(self, user, language: str = 'en') -> ChatSession:
#         """
#         Get existing active session or create new one.
#         """
#         # Check for recent active session
#         recent_session = ChatSession.objects.filter(
#             user=user,
#             status='active'
#         ).order_by('-updated_at').first()
        
#         if recent_session:
#             # Check if session hasn't expired
#             hours_inactive = (timezone.now() - recent_session.updated_at).total_seconds() / 3600
#             if hours_inactive < SESSION_CONFIG['session_timeout_hours']:
#                 return recent_session
#             else:
#                 # Expire old session
#                 recent_session.status = 'expired'
#                 recent_session.save()
        
#         # Create new session
#         return self.start_session(user, language)
    
#     def process_message(
#         self,
#         session: ChatSession,
#         message_text: str,
#         message_type: str = 'text',
#         voice_audio_url: str = None,
#         include_voice_response: bool = False
#     ) -> Dict:
#         """
#         Process incoming user message and generate response.
        
#         This is the main entry point for handling chat messages.
        
#         Args:
#             session: Active chat session
#             message_text: User's message text
#             message_type: 'text' or 'voice'
#             voice_audio_url: URL to voice recording if voice message
#             include_voice_response: Whether to generate TTS audio for response
            
#         Returns:
#             Dict with response data
#         """
#         result = {
#             'success': False,
#             'user_message': None,
#             'assistant_message': None,
#             'quick_replies': [],
#             'error': None
#         }
        
#         try:
#             # 1. Detect language
#             detected_lang, lang_confidence = LanguageDetectionService.detect(message_text)
            
#             # Use session language if detection confidence is low
#             if lang_confidence < 0.5:
#                 detected_lang = session.language
            
#             # 2. Save user message
#             user_msg = self._save_user_message(
#                 session=session,
#                 content=message_text,
#                 message_type=message_type,
#                 language=detected_lang,
#                 voice_url=voice_audio_url
#             )
#             result['user_message'] = {
#                 'id': str(user_msg.id),
#                 'content': message_text,
#                 'language': detected_lang,
#                 'intent': user_msg.detected_intent
#             }
            
#             # 3. Detect intent
#             intent, intent_confidence, intent_metadata = IntentDetectionService.detect(message_text)
#             user_msg.detected_intent = intent
#             user_msg.intent_confidence = intent_confidence
#             user_msg.extracted_entities = intent_metadata
#             user_msg.save()
            
#             # Update session's last intent
#             session.last_intent = intent
#             session.save(update_fields=['last_intent', 'updated_at'])
            
#             # 4. Check for emergency
#             if intent == 'emergency':
#                 response_text = self._handle_emergency(detected_lang)
            
#             # 5. Check FAQ first for quick response
#             elif self._check_faq(message_text, detected_lang):
#                 faq_response = self._check_faq(message_text, detected_lang)
#                 response_text = faq_response
            
#             # 6. Generate AI response
#             else:
#                 response_text = self._generate_ai_response(
#                     session=session,
#                     message=message_text,
#                     intent=intent,
#                     language=detected_lang
#                 )
            
#             # 7. Translate response if needed
#             if detected_lang != 'en':
#                 response_translated = self.translation_service.translate_from_english(
#                     response_text, detected_lang
#                 )
#             else:
#                 response_translated = response_text
            
#             # 8. Save assistant message
#             assistant_msg = self._save_assistant_message(
#                 session=session,
#                 content=response_translated,
#                 content_original=response_text if detected_lang != 'en' else '',
#                 language=detected_lang,
#                 intent=intent
#             )
            
#             result['assistant_message'] = {
#                 'id': str(assistant_msg.id),
#                 'content': response_translated,
#                 'content_english': response_text if detected_lang != 'en' else None,
#                 'language': detected_lang
#             }
            
#             # 9. Generate voice response if requested
#             if include_voice_response:
#                 audio_base64, audio_error = self.speech_service.text_to_speech_base64(
#                     response_translated, detected_lang
#                 )
#                 if audio_base64:
#                     result['assistant_message']['audio'] = audio_base64
#                     result['assistant_message']['audio_format'] = 'mp3'
            
#             # 10. Get quick reply suggestions
#             quick_replies = self._get_quick_replies(intent, detected_lang)
#             result['quick_replies'] = quick_replies
            
#             result['success'] = True
            
#         except Exception as e:
#             logger.error(f"Error processing message: {e}", exc_info=True)
#             result['error'] = str(e)
            
#             # Send error response in user's language
#             error_response = RESPONSE_TEMPLATES['error'].get(
#                 session.language, 
#                 RESPONSE_TEMPLATES['error']['en']
#             )
#             result['assistant_message'] = {
#                 'content': error_response,
#                 'language': session.language
#             }
        
#         return result
    
#     def _save_user_message(
#         self,
#         session: ChatSession,
#         content: str,
#         message_type: str,
#         language: str,
#         voice_url: str = None
#     ) -> ChatMessage:
#         """Save user message to database."""
        
#         # Translate to English for AI processing if needed
#         content_translated = ''
#         if language != 'en':
#             content_translated = self.translation_service.translate_to_english(content, language)
        
#         message = ChatMessage.objects.create(
#             session=session,
#             role='user',
#             message_type=message_type,
#             content=content,
#             content_translated=content_translated,
#             original_language=language,
#             voice_audio_url=voice_url or ''
#         )
        
#         return message
    
#     def _save_assistant_message(
#         self,
#         session: ChatSession,
#         content: str,
#         content_original: str,
#         language: str,
#         intent: str,
#         tokens_used: int = 0,
#         response_time_ms: int = 0
#     ) -> ChatMessage:
#         """Save assistant response to database."""
        
#         message = ChatMessage.objects.create(
#             session=session,
#             role='assistant',
#             message_type='text',
#             content=content,
#             content_translated=content_original,
#             original_language=language,
#             detected_intent=intent,
#             tokens_used=tokens_used,
#             response_time_ms=response_time_ms,
#             model_used=self.openai_service.deployment_name if self.openai_service.is_configured else ''
#         )
        
#         # Update session token count
#         session.total_tokens_used += tokens_used
#         session.save(update_fields=['total_tokens_used', 'updated_at'])
        
#         return message
    
#     def _handle_emergency(self, language: str) -> str:
#         """Handle emergency intent with immediate response."""
#         return RESPONSE_TEMPLATES['emergency'].get(
#             language, 
#             RESPONSE_TEMPLATES['emergency']['en']
#         )
    
#     def _check_faq(self, message: str, language: str) -> Optional[str]:
#         """Check if message matches any FAQ."""
#         message_lower = message.lower()
        
#         # Get active FAQs
#         faqs = FAQ.objects.filter(is_active=True)
        
#         for faq in faqs:
#             # Check keywords
#             keywords = faq.keywords or []
#             for keyword in keywords:
#                 if keyword.lower() in message_lower:
#                     faq.increment_view()
#                     return faq.get_answer(language)
        
#         return None
    
#     def _generate_ai_response(
#         self,
#         session: ChatSession,
#         message: str,
#         intent: str,
#         language: str
#     ) -> str:
#         """Generate AI response using Azure OpenAI."""
        
#         # Get conversation history
#         recent_messages = session.messages.order_by('-created_at')[:SESSION_CONFIG['max_context_messages']]
#         conversation_history = [
#             {
#                 'role': msg.role,
#                 'content': msg.content_translated if msg.content_translated else msg.content
#             }
#             for msg in reversed(recent_messages)
#         ]
        
#         # Prepare context data
#         context_data = {}
        
#         # Add linked diagnosis if available
#         if session.linked_diagnosis:
#             diagnosis = session.linked_diagnosis
#             context_data['diagnosis'] = {
#                 'diseases': [p.disease_name for p in diagnosis.predictions.all()[:3]],
#                 'symptoms': list(diagnosis.identified_symptoms.values_list('name', flat=True)),
#                 'severity': diagnosis.severity_level
#             }
        
#         # Add user info if available
#         try:
#             if hasattr(session.user, 'patient_profile'):
#                 profile = session.user.patient_profile
#                 context_data['user_info'] = {
#                     'age': profile.age,
#                     'gender': profile.gender,
#                     'conditions': profile.medical_conditions
#                 }
#         except Exception:
#             pass
        
#         # Get message in English for AI
#         message_for_ai = message
#         if language != 'en':
#             message_for_ai = self.translation_service.translate_to_english(message, language)
        
#         # Generate response
#         response, error = self.openai_service.generate_response(
#             user_message=message_for_ai,
#             conversation_history=conversation_history,
#             intent=intent,
#             context_data=context_data if context_data else None,
#             language=language
#         )
        
#         if response:
#             return response.content
        
#         # Fallback response
#         logger.warning(f"AI response failed: {error}, using fallback")
#         return self._get_fallback_response(intent, language)
    
#     def _get_fallback_response(self, intent: str, language: str) -> str:
#         """Get fallback response when AI fails."""
#         fallbacks = {
#             'symptoms': {
#                 'en': "I understand you're not feeling well. While I'm having trouble processing your request, please describe your symptoms to a doctor for proper diagnosis.",
#                 'te': "మీకు అస్వస్థత ఉందని నాకు అర్థమవుతోంది. సరైన నిర్ధారణ కోసం దయచేసి డాక్టర్‌కు మీ లక్షణాలను వివరించండి.",
#                 'hi': "मुझे समझ में आ रहा है कि आप ठीक महसूस नहीं कर रहे हैं। सही निदान के लिए कृपया डॉक्टर को अपने लक्षण बताएं।"
#             },
#             'general': RESPONSE_TEMPLATES['error']
#         }
        
#         intent_fallbacks = fallbacks.get(intent, fallbacks['general'])
#         return intent_fallbacks.get(language, intent_fallbacks['en'])
    
#     def _get_quick_replies(self, intent: str, language: str) -> List[Dict]:
#         """Get contextual quick reply suggestions."""
        
#         # Map intent to quick reply context
#         context_map = {
#             'greeting': 'start',
#             'symptoms': 'symptoms',
#             'appointment': 'appointment',
#             'emergency': 'emergency',
#         }
        
#         context = context_map.get(intent, 'general')
        
#         quick_replies = QuickReply.objects.filter(
#             is_active=True,
#             context__in=[context, 'general']
#         ).order_by('-priority')[:4]
        
#         return [
#             {
#                 'text': qr.get_text(language),
#                 'icon': qr.icon,
#                 'triggers_intent': qr.triggers_intent
#             }
#             for qr in quick_replies
#         ]
    
#     def process_voice_message(
#         self,
#         session: ChatSession,
#         audio_data: bytes,
#         audio_language: str = None
#     ) -> Dict:
#         """
#         Process voice message: STT -> Process -> TTS.
        
#         Args:
#             session: Active chat session
#             audio_data: Raw audio bytes
#             audio_language: Expected language of audio
            
#         Returns:
#             Dict with response and audio
#         """
#         # 1. Convert speech to text
#         language = audio_language or session.language
#         text, error = self.speech_service.speech_to_text(audio_data, language)
        
#         if error:
#             return {
#                 'success': False,
#                 'error': f"Could not understand audio: {error}"
#             }
        
#         # 2. Process as text message with voice response
#         return self.process_message(
#             session=session,
#             message_text=text,
#             message_type='voice',
#             include_voice_response=True
#         )
    
#     def end_session(self, session: ChatSession) -> Dict:
#         """End a chat session."""
#         session.end_session()
        
#         farewell = RESPONSE_TEMPLATES['session_end'].get(
#             session.language,
#             RESPONSE_TEMPLATES['session_end']['en']
#         )
        
#         return {
#             'success': True,
#             'message': farewell,
#             'session_id': str(session.id),
#             'messages_count': session.get_message_count(),
#             'tokens_used': session.total_tokens_used
#         }
    
#     def get_session_history(self, session: ChatSession) -> List[Dict]:
#         """Get all messages in a session."""
#         messages = session.messages.order_by('created_at')
        
#         return [
#             {
#                 'id': str(msg.id),
#                 'role': msg.role,
#                 'content': msg.content,
#                 'message_type': msg.message_type,
#                 'language': msg.original_language,
#                 'intent': msg.detected_intent,
#                 'created_at': msg.created_at.isoformat()
#             }
#             for msg in messages
#         ]
    
#     def get_daily_health_tip(self, language: str = 'en') -> Optional[Dict]:
#         """Get today's health tip."""
#         today = timezone.now().date()
        
#         # Check for date-specific tip
#         tip = HealthTip.objects.filter(
#             is_active=True,
#             show_date=today
#         ).first()
        
#         # Fall back to random active tip
#         if not tip:
#             tip = HealthTip.objects.filter(is_active=True).order_by('?').first()
        
#         if tip:
#             tip.view_count += 1
#             tip.save(update_fields=['view_count'])
            
#             return {
#                 'id': str(tip.id),
#                 'category': tip.category,
#                 'title': tip.get_title(language),
#                 'content': tip.get_content(language),
#                 'image_url': tip.image_url
#             }
        
#         return None


# # Singleton instance
# _chat_service = None


# def get_chat_service() -> ChatService:
#     """Get singleton chat service instance."""
#     global _chat_service
#     if _chat_service is None:
#         _chat_service = ChatService()
#     return _chat_service

"""
Main Chat Service
=================
Orchestrates all chatbot services using FREE alternatives.
"""

import logging
from typing import Dict, Optional, List
from django.utils import timezone

from ..models import ChatSession, ChatMessage, FAQ, HealthTip, QuickReply
from ..config import RESPONSE_TEMPLATES, SESSION_CONFIG
from .language_service import LanguageDetectionService
from .intent_service import IntentDetectionService
from .groq_service import get_groq_service
from .free_translation_service import get_free_translation_service

logger = logging.getLogger(__name__)


class ChatService:
    """
    Main chat service - orchestrates all components.
    Uses Groq (free) for AI and Google Translate (free) for translation.
    """
    
    def __init__(self):
        self.ai_service = get_groq_service()
        self.translation_service = get_free_translation_service()
        
        logger.info(f"ChatService initialized:")
        logger.info(f"  - AI (Groq): {'✅ Ready' if self.ai_service.is_configured else '❌ Not configured'}")
        logger.info(f"  - Translation: {'✅ Ready' if self.translation_service.is_configured else '❌ Not configured'}")
    
    def start_session(self, user, language: str = 'en') -> ChatSession:
        """Start a new chat session."""
        session = ChatSession.objects.create(
            user=user,
            language=language,
            status='active'
        )
        logger.info(f"Started chat session {session.id} for user {user.id}")
        return session
    
    def get_or_create_active_session(self, user, language: str = 'en') -> ChatSession:
        """Get existing active session or create new one."""
        # Look for recent active session
        recent = ChatSession.objects.filter(
            user=user,
            status='active'
        ).order_by('-updated_at').first()
        
        if recent:
            # Check if not expired (24 hours)
            hours_inactive = (timezone.now() - recent.updated_at).total_seconds() / 3600
            if hours_inactive < SESSION_CONFIG.get('session_timeout_hours', 24):
                return recent
            else:
                recent.status = 'expired'
                recent.save()
        
        return self.start_session(user, language)
    
    def process_message(
        self,
        session: ChatSession,
        message_text: str,
        message_type: str = 'text',
        voice_audio_url: str = None,
        include_voice_response: bool = False
    ) -> Dict:
        """
        Process user message and generate response.
        
        This is the main entry point for chat.
        """
        result = {
            'success': False,
            'user_message': None,
            'assistant_message': None,
            'quick_replies': [],
            'error': None
        }
        
        try:
            # 1. Detect language
            detected_lang, confidence = LanguageDetectionService.detect(message_text)
            if confidence < 0.5:
                detected_lang = session.language
            
            # 2. Detect intent
            intent, intent_confidence, metadata = IntentDetectionService.detect(message_text)
            
            # 3. Save user message
            user_msg = self._save_user_message(
                session=session,
                content=message_text,
                message_type=message_type,
                language=detected_lang,
                intent=intent,
                voice_url=voice_audio_url
            )
            
            result['user_message'] = {
                'id': str(user_msg.id),
                'content': message_text,
                'language': detected_lang,
                'intent': intent
            }
            
            # 4. Update session
            session.last_intent = intent
            session.save(update_fields=['last_intent', 'updated_at'])
            
            # 5. Generate response based on intent
            if intent == 'emergency':
                response_text = self._handle_emergency(detected_lang)
            elif faq_response := self._check_faq(message_text, detected_lang):
                response_text = faq_response
            else:
                response_text = self._generate_ai_response(
                    session=session,
                    message=message_text,
                    intent=intent,
                    language=detected_lang
                )
            
            # 6. Translate response if needed
            if detected_lang != 'en' and self.translation_service.is_configured:
                response_translated = self.translation_service.translate_from_english(
                    response_text, detected_lang
                )
            else:
                response_translated = response_text
            
            # 7. Save assistant message
            assistant_msg = self._save_assistant_message(
                session=session,
                content=response_translated,
                content_original=response_text if detected_lang != 'en' else '',
                language=detected_lang,
                intent=intent
            )
            
            result['assistant_message'] = {
                'id': str(assistant_msg.id),
                'content': response_translated,
                'content_english': response_text if detected_lang != 'en' else None,
                'language': detected_lang
            }
            
            # 8. Note about voice response
            if include_voice_response:
                result['assistant_message']['voice_note'] = (
                    "Voice synthesis is handled in the frontend using Web Speech API. "
                    "Use the 'content' field with speechSynthesis.speak() in JavaScript."
                )
            
            # 9. Get quick replies
            result['quick_replies'] = self._get_quick_replies(intent, detected_lang)
            
            result['success'] = True
            
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            result['error'] = str(e)
            result['assistant_message'] = {
                'content': RESPONSE_TEMPLATES.get('error', {}).get(
                    session.language,
                    "I'm sorry, something went wrong. Please try again."
                ),
                'language': session.language
            }
        
        return result
    
    def _save_user_message(
        self,
        session: ChatSession,
        content: str,
        message_type: str,
        language: str,
        intent: str,
        voice_url: str = None
    ) -> ChatMessage:
        """Save user message to database."""
        # Translate to English for AI if needed
        content_translated = ''
        if language != 'en' and self.translation_service.is_configured:
            content_translated = self.translation_service.translate_to_english(content, language)
        
        return ChatMessage.objects.create(
            session=session,
            role='user',
            message_type=message_type,
            content=content,
            content_translated=content_translated,
            original_language=language,
            detected_intent=intent,
            voice_audio_url=voice_url or ''
        )
    
    def _save_assistant_message(
        self,
        session: ChatSession,
        content: str,
        content_original: str,
        language: str,
        intent: str,
        tokens_used: int = 0,
        response_time_ms: int = 0
    ) -> ChatMessage:
        """Save assistant response to database."""
        message = ChatMessage.objects.create(
            session=session,
            role='assistant',
            message_type='text',
            content=content,
            content_translated=content_original,
            original_language=language,
            detected_intent=intent,
            tokens_used=tokens_used,
            response_time_ms=response_time_ms,
            model_used=self.ai_service.model if self.ai_service.is_configured else ''
        )
        
        # Update session token count
        if tokens_used:
            session.total_tokens_used += tokens_used
            session.save(update_fields=['total_tokens_used', 'updated_at'])
        
        return message
    
    def _handle_emergency(self, language: str) -> str:
        """Handle emergency with immediate response."""
        emergency_responses = {
            'en': "🚨 EMERGENCY! Please call 108 immediately for an ambulance. This service is FREE. Stay calm and keep the patient still until help arrives.",
            'te': "🚨 అత్యవసరం! దయచేసి వెంటనే 108 కు కాల్ చేయండి. ఈ సేవ ఉచితం. ప్రశాంతంగా ఉండండి, సహాయం వచ్చే వరకు రోగిని కదలకుండా ఉంచండి.",
            'hi': "🚨 आपातकाल! कृपया तुरंत 108 पर कॉल करें। यह सेवा मुफ्त है। शांत रहें और मदद आने तक मरीज को स्थिर रखें।"
        }
        return emergency_responses.get(language, emergency_responses['en'])
    
    def _check_faq(self, message: str, language: str) -> Optional[str]:
        """Check if message matches any FAQ."""
        message_lower = message.lower()
        
        faqs = FAQ.objects.filter(is_active=True)
        
        for faq in faqs:
            keywords = faq.keywords or []
            for keyword in keywords:
                if keyword.lower() in message_lower:
                    faq.increment_view()
                    return faq.get_answer(language)
        
        return None
    
    def _generate_ai_response(
        self,
        session: ChatSession,
        message: str,
        intent: str,
        language: str
    ) -> str:
        """Generate AI response using Groq."""
        
        if not self.ai_service.is_configured:
            return self._get_fallback_response(intent, language)
        
        # Get conversation history
        recent_messages = session.messages.order_by('-created_at')[:10]
        history = [
            {
                'role': msg.role,
                'content': msg.content_translated or msg.content
            }
            for msg in reversed(list(recent_messages))
        ]
        
        # Build context
        context_data = {}
        
        if session.linked_diagnosis:
            try:
                diagnosis = session.linked_diagnosis
                context_data['diagnosis'] = {
                    'symptoms': list(diagnosis.identified_symptoms.values_list('name', flat=True)),
                    'diseases': [p.disease_name for p in diagnosis.predictions.all()[:3]],
                    'severity': diagnosis.severity_level
                }
            except Exception:
                pass
        
        try:
            if hasattr(session.user, 'patient_profile'):
                profile = session.user.patient_profile
                context_data['user_info'] = {
                    'age': getattr(profile, 'age', None),
                    'gender': getattr(profile, 'gender', None),
                }
        except Exception:
            pass
        
        # Translate message to English for AI
        message_for_ai = message
        if language != 'en' and self.translation_service.is_configured:
            message_for_ai = self.translation_service.translate_to_english(message, language)
        
        # Generate response
        response, error = self.ai_service.generate_response(
            user_message=message_for_ai,
            conversation_history=history,
            intent=intent,
            context_data=context_data if context_data else None,
            language=language
        )
        
        if response:
            return response.content
        
        logger.warning(f"AI failed: {error}")
        return self._get_fallback_response(intent, language)
    
    def _get_fallback_response(self, intent: str, language: str) -> str:
        """Fallback when AI is unavailable."""
        fallbacks = {
            'symptoms': {
                'en': "I understand you're not feeling well. Please describe your symptoms to a doctor for proper diagnosis. Would you like me to help you book an appointment?",
                'te': "మీకు అస్వస్థత ఉందని నాకు అర్థమవుతోంది. సరైన నిర్ధారణ కోసం దయచేసి డాక్టర్‌కు మీ లక్షణాలను వివరించండి. అపాయింట్‌మెంట్ బుక్ చేయడంలో సహాయం కావాలా?",
                'hi': "मुझे समझ में आ रहा है कि आप ठीक महसूस नहीं कर रहे हैं। सही निदान के लिए कृपया डॉक्टर को अपने लक्षण बताएं। क्या आप अपॉइंटमेंट बुक करना चाहेंगे?"
            },
            'emergency': {
                'en': "🚨 For emergencies, please call 108 immediately for an ambulance. This is a FREE service available 24/7.",
                'te': "🚨 అత్యవసర పరిస్థితుల కోసం, దయచేసి వెంటనే 108 కు కాల్ చేయండి. ఇది 24/7 అందుబాటులో ఉండే ఉచిత సేవ.",
                'hi': "🚨 आपातकाल के लिए, कृपया तुरंत 108 पर कॉल करें। यह 24/7 उपलब्ध मुफ्त सेवा है।"
            },
            'general': {
                'en': "I'm here to help with your health questions. What would you like to know?",
                'te': "మీ ఆరోగ్య ప్రశ్నలకు సహాయం చేయడానికి నేను ఇక్కడ ఉన్నాను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
                'hi': "मैं आपके स्वास्थ्य प्रश्नों में मदद करने के लिए यहां हूं। आप क्या जानना चाहेंगे?"
            }
        }
        
        intent_responses = fallbacks.get(intent, fallbacks['general'])
        return intent_responses.get(language, intent_responses['en'])
    
    def _get_quick_replies(self, intent: str, language: str) -> List[Dict]:
        """Get quick reply suggestions."""
        context_map = {
            'greeting': 'start',
            'symptoms': 'symptoms',
            'appointment': 'appointment',
            'emergency': 'emergency',
            'general': 'general'
        }
        
        context = context_map.get(intent, 'general')
        
        replies = QuickReply.objects.filter(
            is_active=True,
            context__in=[context, 'general']
        ).order_by('-priority')[:4]
        
        return [
            {
                'text': qr.get_text(language),
                'icon': qr.icon,
                'triggers_intent': qr.triggers_intent
            }
            for qr in replies
        ]
    
    def process_voice_message(
        self,
        session: ChatSession,
        audio_data: bytes,
        audio_language: str = None
    ) -> Dict:
        """
        Process voice message.
        Note: Actual speech-to-text is done in frontend using Web Speech API.
        This is kept for API compatibility.
        """
        return {
            'success': False,
            'error': (
                "Voice processing is handled in the frontend using Web Speech API. "
                "Please convert speech to text in the frontend and send as text message."
            ),
            'frontend_hint': {
                'api': 'Web Speech API',
                'recognition': 'window.SpeechRecognition or window.webkitSpeechRecognition',
                'synthesis': 'window.speechSynthesis',
                'languages': {
                    'en': 'en-IN',
                    'te': 'te-IN',
                    'hi': 'hi-IN'
                }
            }
        }
    
    def end_session(self, session: ChatSession) -> Dict:
        """End a chat session."""
        session.end_session()
        
        farewell = {
            'en': "Thank you for using MediConnect. Take care of your health! 🙏",
            'te': "MediConnect ఉపయోగించినందుకు ధన్యవాదాలు. మీ ఆరోగ్యాన్ని జాగ్రత్తగా చూసుకోండి! 🙏",
            'hi': "MediConnect का उपयोग करने के लिए धन्यवाद। अपने स्वास्थ्य का ध्यान रखें! 🙏"
        }
        
        return {
            'success': True,
            'message': farewell.get(session.language, farewell['en']),
            'session_id': str(session.id),
            'messages_count': session.messages.count(),
            'tokens_used': session.total_tokens_used
        }
    
    def get_session_history(self, session: ChatSession) -> List[Dict]:
        """Get all messages in a session."""
        messages = session.messages.order_by('created_at')
        
        return [
            {
                'id': str(msg.id),
                'role': msg.role,
                'content': msg.content,
                'message_type': msg.message_type,
                'language': msg.original_language,
                'intent': msg.detected_intent,
                'created_at': msg.created_at.isoformat()
            }
            for msg in messages
        ]
    
    def get_daily_health_tip(self, language: str = 'en') -> Optional[Dict]:
        """Get today's health tip."""
        today = timezone.now().date()
        
        # Try date-specific tip first
        tip = HealthTip.objects.filter(is_active=True, show_date=today).first()
        
        # Fall back to random tip
        if not tip:
            tip = HealthTip.objects.filter(is_active=True).order_by('?').first()
        
        if tip:
            tip.view_count += 1
            tip.save(update_fields=['view_count'])
            
            return {
                'id': str(tip.id),
                'category': tip.category,
                'title': tip.get_title(language),
                'content': tip.get_content(language),
                'image_url': tip.image_url
            }
        
        return None


# Singleton
_chat_service = None

def get_chat_service() -> ChatService:
    """Get chat service instance."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service