# apps/chatbot/chat_engine.py
"""
Chat Engine for MediConnect.
Handles intent detection, response generation, and conversation flow.
Village-focused with multi-language support.
"""

import re
import random
import logging
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.conf import settings

from .models import (
    Intent, ResponseTemplate, ChatSession, ChatMessage,
    HealthTip, FAQ
)

logger = logging.getLogger(__name__)


# ============================================
# LANGUAGE DETECTOR
# ============================================

class LanguageDetector:
    """
    Simple language detection for Telugu, Hindi, and English.
    """
    
    # Telugu Unicode range: 0C00-0C7F
    TELUGU_PATTERN = re.compile(r'[\u0C00-\u0C7F]')
    
    # Hindi/Devanagari Unicode range: 0900-097F
    HINDI_PATTERN = re.compile(r'[\u0900-\u097F]')
    
    @classmethod
    def detect(cls, text: str) -> str:
        """
        Detect language of text.
        Returns: 'te' for Telugu, 'hi' for Hindi, 'en' for English
        """
        if not text:
            return 'en'
        
        telugu_chars = len(cls.TELUGU_PATTERN.findall(text))
        hindi_chars = len(cls.HINDI_PATTERN.findall(text))
        
        # If more than 20% of text is Telugu
        if telugu_chars > len(text) * 0.2:
            return 'te'
        
        # If more than 20% of text is Hindi
        if hindi_chars > len(text) * 0.2:
            return 'hi'
        
        return 'en'


# ============================================
# INTENT CLASSIFIER
# ============================================

class IntentClassifier:
    """
    Classifies user messages into intents.
    Uses keyword matching and pattern recognition.
    """
    
    def __init__(self):
        self._load_intents()
    
    def _load_intents(self):
        """Load all active intents from database."""
        self.intents = list(
            Intent.objects.filter(is_active=True)
            .order_by('-priority')
        )
        
        # Build keyword index
        self.keyword_index = {}  # keyword -> intent
        for intent in self.intents:
            for lang in ['en', 'te', 'hi']:
                for keyword in intent.get_keywords(lang):
                    self.keyword_index[keyword.lower()] = intent
    
    def classify(self, text: str, language: str = 'en') -> Tuple[Optional[Intent], float]:
        """
        Classify text into an intent.
        
        Returns:
            Tuple of (Intent, confidence)
        """
        if not text:
            return None, 0.0
        
        text_lower = text.lower().strip()
        
        # Method 1: Check for emergency keywords first
        emergency_intent = self._check_emergency(text_lower, language)
        if emergency_intent:
            return emergency_intent, 1.0
        
        # Method 2: Exact keyword matching
        matched_intent, confidence = self._keyword_match(text_lower)
        if matched_intent and confidence > 0.7:
            return matched_intent, confidence
        
        # Method 3: Pattern matching
        pattern_intent = self._pattern_match(text_lower)
        if pattern_intent:
            return pattern_intent, 0.8
        
        # Method 4: Fuzzy keyword matching
        fuzzy_intent, fuzzy_conf = self._fuzzy_match(text_lower)
        if fuzzy_intent:
            return fuzzy_intent, fuzzy_conf
        
        # Default to general intent
        general_intent = self._get_default_intent()
        return general_intent, 0.3
    
    def _check_emergency(self, text: str, language: str) -> Optional[Intent]:
        """Check for emergency keywords."""
        emergency_keywords = {
            'en': ['emergency', 'urgent', 'help', 'dying', 'accident', 'blood', 'unconscious', 'heart attack', 'cant breathe'],
            'te': ['ఎమర్జెన్సీ', 'అత్యవసరం', 'సహాయం', 'ప్రమాదం', 'రక్తం', 'స్పృహ లేదు', 'గుండె పోటు'],
            'hi': ['इमरजेंसी', 'आपातकाल', 'मदद', 'दुर्घटना', 'खून', 'बेहोश', 'दिल का दौरा']
        }
        
        for keyword in emergency_keywords.get(language, []) + emergency_keywords['en']:
            if keyword in text:
                return Intent.objects.filter(
                    is_emergency=True, 
                    is_active=True
                ).first()
        
        return None
    
    def _keyword_match(self, text: str) -> Tuple[Optional[Intent], float]:
        """Match by keywords."""
        words = text.split()
        matched_intents = {}
        
        for word in words:
            if word in self.keyword_index:
                intent = self.keyword_index[word]
                matched_intents[intent.id] = matched_intents.get(intent.id, 0) + 1
        
        if matched_intents:
            # Get intent with most keyword matches
            best_intent_id = max(matched_intents, key=matched_intents.get)
            match_count = matched_intents[best_intent_id]
            
            # Calculate confidence based on match count
            confidence = min(0.5 + (match_count * 0.15), 0.95)
            
            return self._get_intent_by_id(best_intent_id), confidence
        
        return None, 0.0
    
    def _pattern_match(self, text: str) -> Optional[Intent]:
        """Match using regex patterns."""
        for intent in self.intents:
            if intent.patterns:
                for pattern in intent.patterns:
                    try:
                        if re.search(pattern, text, re.IGNORECASE):
                            return intent
                    except re.error:
                        continue
        return None
    
    def _fuzzy_match(self, text: str) -> Tuple[Optional[Intent], float]:
        """Fuzzy matching for partial keyword matches."""
        best_match = None
        best_score = 0
        
        for keyword, intent in self.keyword_index.items():
            if len(keyword) >= 3:
                if keyword in text or text in keyword:
                    score = len(keyword) / max(len(text), len(keyword))
                    if score > best_score:
                        best_score = score
                        best_match = intent
        
        if best_match and best_score > 0.3:
            return best_match, 0.4 + (best_score * 0.3)
        
        return None, 0.0
    
    def _get_intent_by_id(self, intent_id: int) -> Optional[Intent]:
        """Get intent by ID from cache."""
        for intent in self.intents:
            if intent.id == intent_id:
                return intent
        return None
    
    def _get_default_intent(self) -> Optional[Intent]:
        """Get default/fallback intent."""
        return Intent.objects.filter(
            name='general_query',
            is_active=True
        ).first()


# ============================================
# RESPONSE GENERATOR
# ============================================

class ResponseGenerator:
    """
    Generates responses based on detected intent.
    """
    
    # Fallback responses for different languages
    FALLBACK_RESPONSES = {
        'en': [
            "I'm not sure I understand. Could you please rephrase that?",
            "I didn't quite catch that. Can you tell me more about your health concern?",
            "Could you please explain a bit more? I'm here to help with your health questions."
        ],
        'te': [
            "నేను అర్థం చేసుకోలేకపోయాను. దయచేసి మరోసారి చెప్పగలరా?",
            "మీ ఆరోగ్య సమస్య గురించి మరింత చెప్పగలరా?",
            "దయచేసి మీ సమస్య వివరించండి. నేను సహాయం చేయడానికి ఇక్కడ ఉన్నాను."
        ],
        'hi': [
            "मुझे समझ नहीं आया। कृपया दोबारा बताएं?",
            "अपनी स्वास्थ्य समस्या के बारे में और बताएं?",
            "कृपया अपनी समस्या बताएं। मैं मदद करने के लिए यहां हूं।"
        ]
    }
    
    # Greeting responses
    GREETING_RESPONSES = {
        'en': [
            "Hello! How can I help you with your health today?",
            "Hi there! I'm your health assistant. What's bothering you?",
            "Welcome! Tell me about your health concern."
        ],
        'te': [
            "నమస్కారం! మీ ఆరోగ్యం గురించి నేను ఎలా సహాయం చేయగలను?",
            "హాయ్! నేను మీ ఆరోగ్య సహాయకుడిని. మీకు ఏమి సమస్య?",
            "స్వాగతం! మీ ఆరోగ్య సమస్య గురించి చెప్పండి."
        ],
        'hi': [
            "नमस्ते! मैं आपकी स्वास्थ्य संबंधी कैसे मदद कर सकता हूं?",
            "हाय! मैं आपका स्वास्थ्य सहायक हूं। आपको क्या परेशानी है?",
            "स्वागत है! अपनी स्वास्थ्य समस्या बताएं।"
        ]
    }
    
    def generate(
        self, 
        intent: Optional[Intent], 
        language: str = 'en',
        context: Dict = None
    ) -> Dict:
        """
        Generate response for an intent.
        
        Returns:
            Dict with response text, type, quick_replies, etc.
        """
        if not intent:
            return self._get_fallback_response(language)
        
        # Get template responses for this intent
        templates = ResponseTemplate.objects.filter(
            intent=intent,
            is_active=True
        ).order_by('order')
        
        if not templates.exists():
            return self._get_fallback_response(language)
        
        # Select a random template if multiple exist
        template = random.choice(list(templates))
        
        response = {
            'text': template.get_response(language),
            'type': template.response_type,
            'should_speak': template.should_speak,
            'intent': intent.name,
            'category': intent.category
        }
        
        # Add quick replies if available
        quick_replies = template.get_quick_replies(language)
        if quick_replies:
            response['quick_replies'] = quick_replies
        
        # Add extra data
        if template.extra_data:
            response['extra_data'] = template.extra_data
        
        # Add action if this triggers diagnosis
        if intent.triggers_diagnosis:
            response['action'] = 'start_diagnosis'
        
        # Add emergency flag
        if intent.is_emergency:
            response['is_emergency'] = True
            response['action'] = 'emergency'
        
        return response
    
    def _get_fallback_response(self, language: str) -> Dict:
        """Get fallback response."""
        responses = self.FALLBACK_RESPONSES.get(language, self.FALLBACK_RESPONSES['en'])
        return {
            'text': random.choice(responses),
            'type': 'text',
            'should_speak': True,
            'intent': 'fallback',
            'quick_replies': self._get_help_suggestions(language)
        }
    
    def _get_help_suggestions(self, language: str) -> List[str]:
        """Get help suggestions as quick replies."""
        suggestions = {
            'en': ['Check symptoms', 'Book appointment', 'Emergency help', 'Health tips'],
            'te': ['లక్షణాలు చెప్పండి', 'అపాయింట్‌మెంట్ బుక్', 'అత్యవసర సహాయం', 'ఆరోగ్య చిట్కాలు'],
            'hi': ['लक्षण बताएं', 'अपॉइंटमेंट बुक करें', 'आपातकालीन मदद', 'स्वास्थ्य टिप्स']
        }
        return suggestions.get(language, suggestions['en'])
    
    def get_greeting(self, language: str = 'en') -> Dict:
        """Get greeting response."""
        responses = self.GREETING_RESPONSES.get(language, self.GREETING_RESPONSES['en'])
        return {
            'text': random.choice(responses),
            'type': 'text',
            'should_speak': True,
            'intent': 'greeting',
            'quick_replies': self._get_help_suggestions(language)
        }


# ============================================
# MAIN CHAT ENGINE
# ============================================

class ChatEngine:
    """
    Main chat engine that orchestrates conversation.
    """
    
    def __init__(self, language: str = 'te'):
        self.language = language
        self.language_detector = LanguageDetector()
        self.intent_classifier = IntentClassifier()
        self.response_generator = ResponseGenerator()
    
    def process_message(
        self,
        session: ChatSession,
        user_message: str,
        message_type: str = 'text'
    ) -> Dict:
        """
        Process a user message and generate response.
        
        Args:
            session: ChatSession object
            user_message: User's message text
            message_type: Type of message (text, voice, etc.)
            
        Returns:
            Dict with bot response
        """
        # Detect language if not set
        detected_language = self.language_detector.detect(user_message)
        if detected_language != 'en':
            self.language = detected_language
            session.language = detected_language
            session.save(update_fields=['language'])
        
        # Save user message
        user_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.USER,
            message_type=message_type,
            content=user_message,
            language=self.language
        )
        
        # Classify intent
        intent, confidence = self.intent_classifier.classify(
            user_message, 
            self.language
        )
        
        # Update message with intent
        if intent:
            user_msg.detected_intent = intent
            user_msg.intent_confidence = confidence
            user_msg.save(update_fields=['detected_intent', 'intent_confidence'])
        
        # Update session context
        context = session.context or {}
        context['last_intent'] = intent.name if intent else None
        context['last_message'] = user_message
        session.context = context
        session.current_intent = intent
        session.last_message_at = timezone.now()
        session.save()
        
        # Check for special intents
        if intent and intent.is_emergency:
            return self._handle_emergency(session, intent)
        
        if intent and intent.triggers_diagnosis:
            return self._handle_diagnosis(session, user_message)
        
        # Generate response
        response = self.response_generator.generate(
            intent, 
            self.language,
            context
        )
        
        # Check FAQ for better answer
        faq_answer = self._check_faq(user_message)
        if faq_answer and (not intent or confidence < 0.7):
            response = faq_answer
        
        # Save bot response
        bot_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            message_type=response.get('type', 'text'),
            content=response['text'],
            language=self.language,
            quick_replies=response.get('quick_replies', []),
            extra_data=response.get('extra_data', {})
        )
        
        # Build final response
        return {
            'success': True,
            'message_id': bot_msg.id,
            'response': response,
            'session_id': str(session.session_id),
            'language': self.language,
            'intent': intent.name if intent else 'unknown',
            'confidence': confidence
        }
    
    def _handle_emergency(self, session: ChatSession, intent: Intent) -> Dict:
        """Handle emergency situation."""
        emergency_responses = {
            'en': "🚨 EMERGENCY DETECTED!\n\nI'm alerting emergency services. Please:\n1. Stay calm\n2. Call 108 for ambulance\n3. Share your location\n\nHelp is on the way!",
            'te': "🚨 అత్యవసర పరిస్థితి!\n\nదయచేసి:\n1. ప్రశాంతంగా ఉండండి\n2. 108 కు కాల్ చేయండి\n3. మీ లొకేషన్ షేర్ చేయండి\n\nసహాయం వస్తోంది!",
            'hi': "🚨 आपातकालीन स्थिति!\n\nकृपया:\n1. शांत रहें\n2. 108 पर कॉल करें\n3. अपना लोकेशन शेयर करें\n\nमदद आ रही है!"
        }
        
        response_text = emergency_responses.get(self.language, emergency_responses['en'])
        
        bot_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            message_type='text',
            content=response_text,
            language=self.language,
            extra_data={'is_emergency': True}
        )
        
        return {
            'success': True,
            'message_id': bot_msg.id,
            'response': {
                'text': response_text,
                'type': 'text',
                'is_emergency': True,
                'action': 'emergency',
                'should_speak': True
            },
            'session_id': str(session.session_id),
            'language': self.language,
            'intent': 'emergency',
            'confidence': 1.0
        }
    
    def _handle_diagnosis(self, session: ChatSession, user_message: str) -> Dict:
        """Start diagnosis flow."""
        from apps.diagnosis.ml_service import get_diagnosis_engine
        
        # Create diagnosis session if not exists
        if not session.diagnosis_session:
            from apps.diagnosis.models import DiagnosisSession
            diagnosis_session = DiagnosisSession.objects.create(
                user=session.user,
                language=self.language,
                initial_complaint=user_message,
                status=DiagnosisSession.Status.STARTED
            )
            session.diagnosis_session = diagnosis_session
            session.save()
        
        # Process symptoms
        engine = get_diagnosis_engine(self.language)
        analysis = engine.analyze(user_message)
        
        if analysis['success'] and analysis['symptoms']:
            symptoms_text = ', '.join([
                s.get_name(self.language) for s in analysis['symptoms']
            ])
            
            response_texts = {
                'en': f"I understand you're experiencing: {symptoms_text}\n\nLet me analyze this. Do you have any other symptoms?",
                'te': f"మీకు ఈ లక్షణాలు ఉన్నాయని అర్థమవుతోంది: {symptoms_text}\n\nనేను విశ్లేషిస్తాను. మీకు ఇంకా ఏవైనా లక్షణాలు ఉన్నాయా?",
                'hi': f"मुझे समझ आया कि आपको ये लक्षण हैं: {symptoms_text}\n\nमैं इसका विश्लेषण करता हूं। क्या आपको और कोई लक्षण है?"
            }
            response_text = response_texts.get(self.language, response_texts['en'])
        else:
            response_texts = {
                'en': "Please describe your symptoms in more detail. What are you feeling?",
                'te': "దయచేసి మీ లక్షణాలను మరింత వివరంగా చెప్పండి. మీకు ఏమి అనిపిస్తోంది?",
                'hi': "कृपया अपने लक्षण विस्तार से बताएं। आपको क्या महसूस हो रहा है?"
            }
            response_text = response_texts.get(self.language, response_texts['en'])
        
        bot_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            message_type='text',
            content=response_text,
            language=self.language,
            quick_replies=self._get_symptom_quick_replies()
        )
        
        return {
            'success': True,
            'message_id': bot_msg.id,
            'response': {
                'text': response_text,
                'type': 'text',
                'action': 'diagnosis',
                'should_speak': True,
                'quick_replies': self._get_symptom_quick_replies()
            },
            'session_id': str(session.session_id),
            'language': self.language,
            'intent': 'symptom',
            'confidence': 0.9
        }
    
    def _get_symptom_quick_replies(self) -> List[str]:
        """Get symptom-related quick replies."""
        quick_replies = {
            'en': ['Fever', 'Headache', 'Stomach pain', 'Cough', 'No more symptoms'],
            'te': ['జ్వరం', 'తలనొప్పి', 'కడుపు నొప్పి', 'దగ్గు', 'ఇంకా లేవు'],
            'hi': ['बुखार', 'सिरदर्द', 'पेट दर्द', 'खांसी', 'और नहीं']
        }
        return quick_replies.get(self.language, quick_replies['en'])
    
    def _check_faq(self, text: str) -> Optional[Dict]:
        """Check if user query matches any FAQ."""
        text_lower = text.lower()
        
        faqs = FAQ.objects.filter(is_active=True)
        
        for faq in faqs:
            keywords = [k.strip().lower() for k in faq.keywords.split(',') if k.strip()]
            match_count = sum(1 for k in keywords if k in text_lower)
            
            if match_count >= 2 or any(len(k) > 5 and k in text_lower for k in keywords):
                faq.increment_view()
                return {
                    'text': faq.get_answer(self.language),
                    'type': 'text',
                    'should_speak': True,
                    'intent': 'faq',
                    'faq_id': faq.id
                }
        
        return None
    
    def get_health_tip(self) -> Dict:
        """Get a random health tip."""
        tips = HealthTip.objects.filter(is_active=True)
        
        if tips.exists():
            tip = random.choice(list(tips))
            return {
                'title': tip.get_title(self.language),
                'content': tip.get_content(self.language),
                'icon': tip.icon,
                'category': tip.category,
                'image': tip.image.url if tip.image else None
            }
        
        return None
    
    def start_session(self, user, language: str = 'te') -> Tuple[ChatSession, Dict]:
        """
        Start a new chat session with greeting.
        """
        session = ChatSession.objects.create(
            user=user,
            language=language,
            is_voice_enabled=True
        )
        
        self.language = language
        greeting = self.response_generator.get_greeting(language)
        
        # Save greeting message
        bot_msg = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            message_type='text',
            content=greeting['text'],
            language=language,
            quick_replies=greeting.get('quick_replies', [])
        )
        
        return session, {
            'success': True,
            'session_id': str(session.session_id),
            'message_id': bot_msg.id,
            'response': greeting,
            'language': language
        }


# ============================================
# SINGLETON INSTANCE
# ============================================

_chat_engine = None


def get_chat_engine(language: str = 'te') -> ChatEngine:
    """Get or create chat engine instance."""
    global _chat_engine
    
    if _chat_engine is None:
        _chat_engine = ChatEngine(language)
    else:
        _chat_engine.language = language
    
    return _chat_engine