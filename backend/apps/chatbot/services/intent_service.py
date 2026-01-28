# """
# Intent Detection Service
# ========================
# Detects user intent from message text.
# Uses keyword matching and pattern recognition.
# """

# import re
# import logging
# from typing import Tuple, List, Dict
# from ..config import INTENT_KEYWORDS

# logger = logging.getLogger(__name__)


# class IntentDetectionService:
#     """
#     Detects the intent of a user message.
    
#     Intents:
#     - symptoms: User describing health symptoms
#     - appointment: User wants to book appointment
#     - emergency: Emergency situation
#     - medicine: Questions about medicine
#     - greeting: Hello/Hi type messages
#     - general: General health questions
#     """
    
#     # Intent priority (higher = more important)
#     INTENT_PRIORITY = {
#         'emergency': 100,
#         'symptoms': 80,
#         'appointment': 60,
#         'medicine': 50,
#         'greeting': 20,
#         'general': 10,
#     }
    
#     # Emergency patterns (regex)
#     EMERGENCY_PATTERNS = [
#         r'\b(can\'?t|cannot|unable)\s+(breathe|breathing)\b',
#         r'\b(chest|heart)\s+pain\b',
#         r'\bsevere\s+(pain|bleeding|headache)\b',
#         r'\b(unconscious|fainted|passed out)\b',
#         r'\b(snake|dog|animal)\s+bite\b',
#         r'\bpoisoning\b',
#         r'\b108\b',
#         r'\bambulance\b',
#     ]
    
#     # Symptom patterns
#     SYMPTOM_PATTERNS = [
#         r'\bi\s+(have|am having|feel|got)\b',
#         r'\bmy\s+(head|stomach|chest|throat|body)\b',
#         r'\bfeeling\s+(sick|unwell|dizzy|weak|tired)\b',
#         r'\bsince\s+\d+\s+(days?|hours?|weeks?)\b',
#         r'\bfor\s+\d+\s+(days?|hours?|weeks?)\b',
#     ]
    
#     # Appointment patterns
#     APPOINTMENT_PATTERNS = [
#         r'\b(book|schedule|make)\s+(an?\s+)?(appointment|booking)\b',
#         r'\b(see|visit|meet|consult)\s+(a\s+)?doctor\b',
#         r'\b(available|free)\s+(slots?|times?)\b',
#         r'\bwhen\s+can\s+i\s+(see|meet|visit)\b',
#     ]
    
#     @classmethod
#     def detect(cls, text: str) -> Tuple[str, float, Dict]:
#         """
#         Detect intent from message text.
        
#         Args:
#             text: User message text
            
#         Returns:
#             Tuple of (intent, confidence, metadata)
#         """
#         if not text or not text.strip():
#             return 'unknown', 0.0, {}
        
#         text_lower = text.lower().strip()
        
#         # Track all detected intents with scores
#         intent_scores: Dict[str, float] = {
#             'emergency': 0.0,
#             'symptoms': 0.0,
#             'appointment': 0.0,
#             'medicine': 0.0,
#             'greeting': 0.0,
#             'general': 0.0,
#         }
        
#         metadata = {
#             'matched_keywords': [],
#             'matched_patterns': [],
#         }
        
#         # 1. Check emergency patterns first (highest priority)
#         for pattern in cls.EMERGENCY_PATTERNS:
#             if re.search(pattern, text_lower):
#                 intent_scores['emergency'] += 0.4
#                 metadata['matched_patterns'].append(pattern)
        
#         # 2. Check keywords for all intents
#         for intent, keywords in INTENT_KEYWORDS.items():
#             for keyword in keywords:
#                 keyword_lower = keyword.lower()
#                 if keyword_lower in text_lower:
#                     intent_scores[intent] = intent_scores.get(intent, 0) + 0.2
#                     metadata['matched_keywords'].append(keyword)
        
#         # 3. Check symptom patterns
#         for pattern in cls.SYMPTOM_PATTERNS:
#             if re.search(pattern, text_lower):
#                 intent_scores['symptoms'] += 0.3
#                 metadata['matched_patterns'].append(pattern)
        
#         # 4. Check appointment patterns
#         for pattern in cls.APPOINTMENT_PATTERNS:
#             if re.search(pattern, text_lower):
#                 intent_scores['appointment'] += 0.3
#                 metadata['matched_patterns'].append(pattern)
        
#         # 5. Find the highest scoring intent
#         max_score = 0.0
#         detected_intent = 'general'
        
#         for intent, score in intent_scores.items():
#             # Apply priority weighting
#             weighted_score = score * (cls.INTENT_PRIORITY.get(intent, 10) / 100)
#             if score > 0 and (score > max_score or 
#                 (score == max_score and cls.INTENT_PRIORITY.get(intent, 0) > 
#                  cls.INTENT_PRIORITY.get(detected_intent, 0))):
#                 max_score = score
#                 detected_intent = intent
        
#         # Cap confidence at 1.0
#         confidence = min(max_score, 1.0)
        
#         # If very short message with greeting words, classify as greeting
#         if len(text.split()) <= 3 and intent_scores['greeting'] > 0:
#             detected_intent = 'greeting'
#             confidence = 0.9
        
#         # If no intent detected, default to general
#         if confidence < 0.1:
#             detected_intent = 'general'
#             confidence = 0.5
        
#         logger.debug(f"Intent detected: {detected_intent} (confidence: {confidence})")
        
#         return detected_intent, confidence, metadata
    
#     @classmethod
#     def is_emergency(cls, text: str) -> bool:
#         """Quick check if message indicates emergency."""
#         intent, confidence, _ = cls.detect(text)
#         return intent == 'emergency' and confidence > 0.3
    
#     @classmethod
#     def extract_symptoms_from_text(cls, text: str) -> List[str]:
#         """
#         Extract potential symptom mentions from text.
#         This is a simple extraction - diagnosis app does detailed extraction.
#         """
#         symptom_words = INTENT_KEYWORDS.get('symptoms', [])
#         text_lower = text.lower()
        
#         found_symptoms = []
#         for symptom in symptom_words:
#             if symptom.lower() in text_lower:
#                 found_symptoms.append(symptom)
        
#         return found_symptoms
    
#     @classmethod
#     def get_context_prompt(cls, intent: str) -> str:
#         """Get the appropriate system prompt based on intent."""
#         from ..config import SYSTEM_PROMPTS
        
#         if intent in SYSTEM_PROMPTS:
#             return SYSTEM_PROMPTS[intent]
#         return SYSTEM_PROMPTS['default']

"""
Intent Detection Service
========================
Detects user intent from message text.
Uses keyword matching and pattern recognition.
"""

import re
import logging
from typing import Tuple, List, Dict

logger = logging.getLogger(__name__)


class IntentDetectionService:
    """
    Detects the intent of a user message.
    
    Intents:
    - symptoms: User describing health symptoms
    - appointment: User wants to book appointment
    - emergency: Emergency situation
    - medicine: Questions about medicine
    - greeting: Hello/Hi type messages
    - general: General health questions
    """
    
    # Keywords for each intent
    INTENT_KEYWORDS = {
        'emergency': [
            'emergency', 'urgent', 'ambulance', 'accident', 'blood', 'bleeding',
            'unconscious', 'not breathing', 'heart attack', 'stroke', 'poison',
            'snake', 'bite', 'burn', 'severe', 'critical', 'dying', 'help me',
            '108', 'hospital now', 'chest pain', 'cant breathe', "can't breathe",
            'fainted', 'collapsed', 'choking', 'suicide', 'overdose',
            # Telugu
            'అత్యవసరం', 'రక్తం', 'ప్రమాదం', 'స్పృహ లేదు', 'ఊపిరి',
            # Hindi
            'आपातकाल', 'खून', 'दुर्घटना', 'बेहोश', 'सांस नहीं',
        ],
        'symptoms': [
            'fever', 'pain', 'headache', 'cough', 'cold', 'stomach', 'vomiting',
            'diarrhea', 'rash', 'itching', 'swelling', 'weakness', 'tired',
            'nausea', 'dizziness', 'body ache', 'sore throat', 'breathing problem',
            'symptom', 'feeling sick', 'unwell', 'not feeling', 'suffering from',
            'i have', 'having', 'my head', 'my stomach', 'my body', 'my throat',
            'temperature', 'chills', 'sneezing', 'runny nose', 'infection',
            'acidity', 'gas', 'constipation', 'loose motion', 'motions',
            # Telugu
            'జ్వరం', 'నొప్పి', 'తలనొప్పి', 'దగ్గు', 'జలుబు', 'వాంతి',
            # Hindi
            'बुखार', 'दर्द', 'सिरदर्द', 'खांसी', 'जुकाम', 'उल्टी',
        ],
        'medicine': [
            'medicine', 'tablet', 'drug', 'prescription', 'dose', 'dosage',
            'pharmacy', 'medical store', 'side effect', 'interaction',
            'paracetamol', 'crocin', 'dolo', 'antibiotic', 'syrup', 'capsule',
            'ointment', 'cream', 'drops', 'injection', 'vaccine', 'vitamins',
            'what medicine', 'which medicine', 'medicine for', 'take medicine',
            'give medicine', 'buy medicine', 'need medicine',
            # Telugu
            'మందు', 'టాబ్లెట్', 'మాత్ర', 'ఔషధం',
            # Hindi
            'दवाई', 'दवा', 'गोली', 'टेबलेट',
        ],
        'appointment': [
            'appointment', 'book', 'schedule', 'doctor', 'visit', 'meet',
            'consultation', 'check up', 'checkup', 'available', 'slot',
            'see doctor', 'need doctor', 'want doctor', 'doctor appointment',
            'book appointment', 'schedule appointment', 'when can i see',
            'available time', 'free slot', 'cancel appointment', 'reschedule',
            # Telugu
            'అపాయింట్మెంట్', 'డాక్టర్', 'నియామకం',
            # Hindi
            'अपॉइंटमेंट', 'डॉक्टर', 'मिलना', 'दिखाना',
        ],
        'greeting': [
            'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
            'namaste', 'namaskar', 'vanakkam', 'howdy', 'greetings',
            'hi there', 'hello there', 'good day',
            # Telugu
            'నమస్కారం', 'నమస్తే', 'హలో',
            # Hindi
            'नमस्ते', 'नमस्कार', 'हैलो',
        ],
        'general': [
            'how to', 'what is', 'tell me', 'explain', 'why', 'when should',
            'tips', 'advice', 'suggest', 'recommend', 'help', 'guide',
            'healthy', 'health', 'diet', 'exercise', 'sleep', 'water',
            'weight', 'nutrition', 'food', 'eat', 'drink',
        ],
    }
    
    # Emergency patterns (regex) - highest priority
    EMERGENCY_PATTERNS = [
        r'\b(can\'?t|cannot|unable to)\s+(breathe|breathing)\b',
        r'\b(chest|heart)\s+pain\b',
        r'\bsevere\s+(pain|bleeding|headache|injury)\b',
        r'\b(unconscious|fainted|passed out|not responding)\b',
        r'\b(snake|dog|animal)\s+bite\b',
        r'\bpoisoning\b',
        r'\b(call|need)\s+(108|ambulance)\b',
        r'\bdying\b',
        r'\bheart\s+attack\b',
    ]
    
    # Symptom patterns
    SYMPTOM_PATTERNS = [
        r'\bi\s+(have|am having|got|feel|am feeling)\b',
        r'\bmy\s+(head|stomach|chest|throat|body|back|leg|arm|eye)\b',
        r'\bfeeling\s+(sick|unwell|dizzy|weak|tired|nauseous)\b',
        r'\bsince\s+\d+\s+(days?|hours?|weeks?|months?)\b',
        r'\bfor\s+(the\s+)?(past\s+)?\d+\s+(days?|hours?|weeks?)\b',
        r'\bsuffering\s+from\b',
    ]
    
    # Appointment patterns
    APPOINTMENT_PATTERNS = [
        r'\b(book|schedule|make|fix)\s+(an?\s+)?(appointment|booking)\b',
        r'\b(see|visit|meet|consult)\s+(a\s+)?doctor\b',
        r'\b(available|free)\s+(slots?|times?|hours?)\b',
        r'\bwhen\s+can\s+i\s+(see|meet|visit)\b',
        r'\bdoctor\s+appointment\b',
    ]
    
    # Medicine patterns
    MEDICINE_PATTERNS = [
        r'\b(what|which)\s+medicine\b',
        r'\bmedicine\s+for\b',
        r'\b(take|give|need|buy)\s+(a\s+)?medicine\b',
        r'\b(paracetamol|crocin|dolo|ibuprofen|aspirin)\b',
        r'\bside\s+effects?\b',
        r'\bdosage\b',
    ]
    
    @classmethod
    def detect(cls, text: str) -> Tuple[str, float, Dict]:
        """
        Detect intent from message text.
        
        Args:
            text: User message text
            
        Returns:
            Tuple of (intent, confidence, metadata)
        """
        if not text or not text.strip():
            return 'unknown', 0.0, {}
        
        text_lower = text.lower().strip()
        
        # Initialize scores
        scores = {
            'emergency': 0.0,
            'symptoms': 0.0,
            'medicine': 0.0,
            'appointment': 0.0,
            'greeting': 0.0,
            'general': 0.0,
        }
        
        metadata = {'matched_keywords': [], 'matched_patterns': []}
        
        # 1. Check emergency patterns FIRST (highest priority)
        for pattern in cls.EMERGENCY_PATTERNS:
            if re.search(pattern, text_lower):
                scores['emergency'] += 0.5
                metadata['matched_patterns'].append(('emergency', pattern))
        
        # 2. Check all keyword matches
        for intent, keywords in cls.INTENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    scores[intent] += 0.15
                    metadata['matched_keywords'].append((intent, keyword))
        
        # 3. Check symptom patterns
        for pattern in cls.SYMPTOM_PATTERNS:
            if re.search(pattern, text_lower):
                scores['symptoms'] += 0.25
                metadata['matched_patterns'].append(('symptoms', pattern))
        
        # 4. Check appointment patterns
        for pattern in cls.APPOINTMENT_PATTERNS:
            if re.search(pattern, text_lower):
                scores['appointment'] += 0.35
                metadata['matched_patterns'].append(('appointment', pattern))
        
        # 5. Check medicine patterns
        for pattern in cls.MEDICINE_PATTERNS:
            if re.search(pattern, text_lower):
                scores['medicine'] += 0.35
                metadata['matched_patterns'].append(('medicine', pattern))
        
        # 6. Special case: very short greetings
        if len(text.split()) <= 3:
            greeting_words = ['hi', 'hello', 'hey', 'namaste', 'namaskar']
            if any(word in text_lower for word in greeting_words):
                scores['greeting'] = max(scores['greeting'], 0.9)
        
        # 7. Find highest scoring intent
        max_score = 0.0
        detected_intent = 'general'
        
        # Priority order for ties: emergency > symptoms > medicine > appointment > greeting > general
        priority_order = ['emergency', 'symptoms', 'medicine', 'appointment', 'greeting', 'general']
        
        for intent in priority_order:
            score = scores[intent]
            if score > max_score:
                max_score = score
                detected_intent = intent
        
        # Cap confidence at 1.0
        confidence = min(max_score, 1.0)
        
        # Minimum confidence threshold
        if confidence < 0.1:
            detected_intent = 'general'
            confidence = 0.5
        
        logger.debug(f"Intent detected: {detected_intent} (confidence: {confidence})")
        
        return detected_intent, confidence, metadata
    
    @classmethod
    def is_emergency(cls, text: str) -> bool:
        """Quick check if message indicates emergency."""
        intent, confidence, _ = cls.detect(text)
        return intent == 'emergency' and confidence >= 0.3
    
    @classmethod
    def get_intent_description(cls, intent: str) -> str:
        """Get human-readable description of intent."""
        descriptions = {
            'emergency': 'Emergency situation requiring immediate attention',
            'symptoms': 'User describing health symptoms',
            'medicine': 'Questions about medicines or drugs',
            'appointment': 'Booking or managing doctor appointments',
            'greeting': 'Greeting or conversation starter',
            'general': 'General health questions or information',
        }
        return descriptions.get(intent, 'Unknown intent')