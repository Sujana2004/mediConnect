"""
Symptom Extractor
=================
Extract symptoms from natural language text using NLP techniques.

Methods:
1. Dictionary-based matching (fast, works offline)
2. Fuzzy matching for typos/variations
3. spaCy NER (if available)

This is optimized for village users who may describe symptoms
in simple language or with spelling mistakes.
"""

import re
import pickle
from typing import List, Dict, Tuple, Optional, Set
from pathlib import Path
from difflib import SequenceMatcher
import logging

from .config import MLConfig

logger = logging.getLogger(__name__)


class SymptomExtractor:
    """
    Extract symptoms from user text.
    
    Uses multiple strategies:
    1. Exact keyword matching
    2. Fuzzy matching for typos
    3. N-gram matching for phrases
    """
    
    def __init__(self):
        self.symptom_keywords: Dict[str, List[str]] = {}
        self.symptom_codes: List[str] = []
        self.all_keywords: Set[str] = set()
        self.is_loaded = False
        
        # Common symptom phrases (including variations)
        self.phrase_mappings = self._get_phrase_mappings()
    
    def _get_phrase_mappings(self) -> Dict[str, str]:
        """
        Get common phrase to symptom code mappings.
        Includes natural language variations.
        """
        return {
            # Fever variations
            'fever': 'high_fever',
            'high temperature': 'high_fever',
            'body temperature': 'high_fever',
            'feeling hot': 'high_fever',
            'burning up': 'high_fever',
            'mild fever': 'mild_fever',
            'slight fever': 'mild_fever',
            'low grade fever': 'mild_fever',
            
            # Headache variations
            'headache': 'headache',
            'head pain': 'headache',
            'head hurts': 'headache',
            'head ache': 'headache',
            'pain in head': 'headache',
            'my head hurts': 'headache',
            'splitting headache': 'headache',
            
            # Cough variations
            'cough': 'cough',
            'coughing': 'cough',
            'dry cough': 'cough',
            'wet cough': 'cough',
            'persistent cough': 'cough',
            'continuous cough': 'cough',
            
            # Cold variations
            'cold': 'cold_hands_and_feets',
            'common cold': 'continuous_sneezing',
            'runny nose': 'runny_nose',
            'blocked nose': 'congestion',
            'stuffy nose': 'congestion',
            'nasal congestion': 'congestion',
            
            # Stomach issues
            'stomach pain': 'stomach_pain',
            'stomach ache': 'stomach_pain',
            'tummy ache': 'stomach_pain',
            'belly pain': 'belly_pain',
            'abdominal pain': 'abdominal_pain',
            
            # Vomiting
            'vomiting': 'vomiting',
            'vomit': 'vomiting',
            'throwing up': 'vomiting',
            'feel like vomiting': 'nausea',
            'nausea': 'nausea',
            'feeling sick': 'nausea',
            
            # Diarrhea
            'diarrhea': 'diarrhoea',
            'loose motion': 'diarrhoea',
            'loose stool': 'diarrhoea',
            'watery stool': 'diarrhoea',
            
            # Fatigue
            'tired': 'fatigue',
            'tiredness': 'fatigue',
            'fatigue': 'fatigue',
            'exhausted': 'fatigue',
            'no energy': 'fatigue',
            'weakness': 'weakness_in_limbs',
            'feeling weak': 'weakness_in_limbs',
            
            # Skin issues
            'skin rash': 'skin_rash',
            'rash': 'skin_rash',
            'rashes': 'skin_rash',
            'itching': 'itching',
            'itchy': 'itching',
            'skin itching': 'itching',
            
            # Breathing
            'difficulty breathing': 'breathlessness',
            'shortness of breath': 'breathlessness',
            'cant breathe': 'breathlessness',
            'breathing problem': 'breathlessness',
            
            # Chest
            'chest pain': 'chest_pain',
            'pain in chest': 'chest_pain',
            'chest hurts': 'chest_pain',
            
            # Joint/muscle
            'joint pain': 'joint_pain',
            'muscle pain': 'muscle_pain',
            'body pain': 'muscle_pain',
            'body ache': 'muscle_pain',
            'back pain': 'back_pain',
            'knee pain': 'knee_pain',
            
            # Eyes
            'red eyes': 'redness_of_eyes',
            'eye redness': 'redness_of_eyes',
            'watery eyes': 'watering_from_eyes',
            'blurred vision': 'blurred_and_distorted_vision',
            
            # Throat
            'sore throat': 'throat_irritation',
            'throat pain': 'throat_irritation',
            'throat irritation': 'throat_irritation',
            
            # Sleep
            'cant sleep': 'insomnia',
            'sleeplessness': 'insomnia',
            'insomnia': 'insomnia',
            
            # Anxiety/Depression
            'anxiety': 'anxiety',
            'anxious': 'anxiety',
            'worried': 'anxiety',
            'depression': 'depression',
            'depressed': 'depression',
            'sad': 'depression',
            
            # Dizziness
            'dizzy': 'dizziness',
            'dizziness': 'dizziness',
            'vertigo': 'spinning_movements',
            'head spinning': 'spinning_movements',
            
            # Appetite
            'no appetite': 'loss_of_appetite',
            'loss of appetite': 'loss_of_appetite',
            'not hungry': 'loss_of_appetite',
            
            # Urination
            'frequent urination': 'polyuria',
            'burning urination': 'burning_micturition',
            'pain when urinating': 'burning_micturition',
            
            # Weight
            'weight loss': 'weight_loss',
            'losing weight': 'weight_loss',
            'weight gain': 'weight_gain',
        }
    
    def load_from_database(self):
        """Load symptom keywords from database."""
        try:
            from apps.diagnosis.models import Symptom, SymptomSynonym
            
            self.symptom_keywords = {}
            self.symptom_codes = []
            self.all_keywords = set()
            
            # Load all symptoms
            symptoms = Symptom.objects.filter(is_active=True)
            
            for symptom in symptoms:
                code = symptom.code
                self.symptom_codes.append(code)
                
                # Collect all keywords for this symptom
                keywords = set()
                
                # Add code variations
                keywords.add(code.lower())
                keywords.add(code.replace('_', ' ').lower())
                
                # Add name
                keywords.add(symptom.name_english.lower())
                
                # Add Telugu/Hindi names if available
                if symptom.name_telugu:
                    keywords.add(symptom.name_telugu.lower())
                if symptom.name_hindi:
                    keywords.add(symptom.name_hindi.lower())
                
                # Add stored keywords
                if symptom.keywords_english:
                    keywords.update([k.lower() for k in symptom.keywords_english])
                if symptom.keywords_telugu:
                    keywords.update(symptom.keywords_telugu)
                if symptom.keywords_hindi:
                    keywords.update(symptom.keywords_hindi)
                
                self.symptom_keywords[code] = list(keywords)
                self.all_keywords.update(keywords)
            
            # Load synonyms
            synonyms = SymptomSynonym.objects.select_related('symptom').all()
            for syn in synonyms:
                code = syn.symptom.code
                phrase = syn.phrase.lower()
                
                if code in self.symptom_keywords:
                    self.symptom_keywords[code].append(phrase)
                    self.all_keywords.add(phrase)
            
            self.is_loaded = True
            logger.info(f"Loaded {len(self.symptom_codes)} symptoms with keywords")
            
        except Exception as e:
            logger.error(f"Error loading symptoms from database: {e}")
            self.is_loaded = False
    
    def load_from_file(self, filepath: Optional[Path] = None):
        """Load symptom data from pickle file."""
        if filepath is None:
            filepath = MLConfig.get_model_path(MLConfig.SYMPTOM_LIST)
        
        try:
            with open(filepath, 'rb') as f:
                data = pickle.load(f)
                self.symptom_keywords = data.get('keywords', {})
                self.symptom_codes = data.get('codes', [])
                self.all_keywords = set(data.get('all_keywords', []))
                self.is_loaded = True
                logger.info(f"Loaded symptom data from {filepath}")
        except Exception as e:
            logger.error(f"Error loading symptom data: {e}")
            self.is_loaded = False
    
    def save_to_file(self, filepath: Optional[Path] = None):
        """Save symptom data to pickle file."""
        if filepath is None:
            filepath = MLConfig.get_model_path(MLConfig.SYMPTOM_LIST)
        
        data = {
            'keywords': self.symptom_keywords,
            'codes': self.symptom_codes,
            'all_keywords': list(self.all_keywords),
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        
        logger.info(f"Saved symptom data to {filepath}")
    
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess input text.
        
        - Lowercase
        - Remove extra whitespace
        - Basic cleaning
        """
        if not text:
            return ""
        
        # Lowercase
        text = text.lower().strip()
        
        # Remove special characters except spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def _fuzzy_match(self, word: str, keyword: str, threshold: float = 0.8) -> bool:
        """
        Check if word fuzzy matches keyword.
        Uses SequenceMatcher for similarity.
        """
        if len(word) < 3 or len(keyword) < 3:
            return word == keyword
        
        ratio = SequenceMatcher(None, word, keyword).ratio()
        return ratio >= threshold
    
    def _find_phrase_matches(self, text: str) -> List[str]:
        """Find symptom codes from phrase mappings."""
        found = []
        text_lower = text.lower()
        
        # Sort by phrase length (longer phrases first) for better matching
        sorted_phrases = sorted(
            self.phrase_mappings.items(),
            key=lambda x: len(x[0]),
            reverse=True
        )
        
        for phrase, symptom_code in sorted_phrases:
            if phrase in text_lower:
                if symptom_code not in found:
                    found.append(symptom_code)
                # Remove matched phrase to avoid double matching
                text_lower = text_lower.replace(phrase, ' ')
        
        return found
    
    def _find_keyword_matches(self, text: str) -> List[Tuple[str, float]]:
        """
        Find symptom codes using keyword matching.
        Returns list of (symptom_code, confidence) tuples.
        """
        found = []
        text_words = set(text.lower().split())
        
        for symptom_code, keywords in self.symptom_keywords.items():
            max_confidence = 0.0
            
            for keyword in keywords:
                keyword_words = keyword.lower().split()
                
                # Exact match for single word keywords
                if len(keyword_words) == 1:
                    if keyword in text_words:
                        max_confidence = max(max_confidence, 1.0)
                    else:
                        # Fuzzy match
                        for word in text_words:
                            if self._fuzzy_match(word, keyword, 0.85):
                                max_confidence = max(max_confidence, 0.85)
                
                # Phrase match for multi-word keywords
                else:
                    if keyword in text.lower():
                        max_confidence = max(max_confidence, 1.0)
            
            if max_confidence > 0:
                found.append((symptom_code, max_confidence))
        
        return found
    
    def extract(
        self, 
        text: str,
        min_confidence: float = 0.5
    ) -> Dict:
        """
        Extract symptoms from text.
        
        Args:
            text: User input text describing symptoms
            min_confidence: Minimum confidence threshold
            
        Returns:
            {
                'symptoms': ['fever', 'headache', ...],  # List of symptom codes
                'confidence': 0.85,  # Average confidence
                'details': [
                    {'symptom': 'fever', 'confidence': 0.9, 'matched_text': 'high fever'},
                    ...
                ]
            }
        """
        if not self.is_loaded:
            self.load_from_database()
        
        if not text:
            return {
                'symptoms': [],
                'confidence': 0.0,
                'details': []
            }
        
        # Preprocess
        processed_text = self.preprocess_text(text)
        
        # Find matches using multiple methods
        found_symptoms = {}  # symptom_code -> confidence
        
        # 1. Phrase mappings (highest priority)
        phrase_matches = self._find_phrase_matches(processed_text)
        for symptom_code in phrase_matches:
            found_symptoms[symptom_code] = max(
                found_symptoms.get(symptom_code, 0),
                0.95  # High confidence for phrase matches
            )
        
        # 2. Keyword matching
        keyword_matches = self._find_keyword_matches(processed_text)
        for symptom_code, confidence in keyword_matches:
            found_symptoms[symptom_code] = max(
                found_symptoms.get(symptom_code, 0),
                confidence
            )
        
        # Filter by minimum confidence
        filtered_symptoms = {
            code: conf for code, conf in found_symptoms.items()
            if conf >= min_confidence
        }
        
        # Build result
        symptoms = list(filtered_symptoms.keys())
        confidences = list(filtered_symptoms.values())
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        details = [
            {
                'symptom': code,
                'confidence': conf,
                'matched_text': self._get_matched_text(processed_text, code)
            }
            for code, conf in filtered_symptoms.items()
        ]
        
        # Sort by confidence
        details.sort(key=lambda x: x['confidence'], reverse=True)
        symptoms = [d['symptom'] for d in details]
        
        return {
            'symptoms': symptoms,
            'confidence': round(avg_confidence, 4),
            'details': details
        }
    
    def _get_matched_text(self, text: str, symptom_code: str) -> str:
        """Get the text that matched for a symptom."""
        # Check phrase mappings
        for phrase, code in self.phrase_mappings.items():
            if code == symptom_code and phrase in text:
                return phrase
        
        # Check keywords
        if symptom_code in self.symptom_keywords:
            for keyword in self.symptom_keywords[symptom_code]:
                if keyword.lower() in text.lower():
                    return keyword
        
        # Return code as display name
        return symptom_code.replace('_', ' ')
    
    def get_symptom_display_name(self, symptom_code: str) -> str:
        """Get display name for a symptom code."""
        try:
            from apps.diagnosis.models import Symptom
            symptom = Symptom.objects.filter(code=symptom_code).first()
            if symptom:
                return symptom.name_english
        except:
            pass
        
        # Fallback: convert code to title case
        return symptom_code.replace('_', ' ').title()


# Singleton instance
_symptom_extractor = None


def get_symptom_extractor() -> SymptomExtractor:
    """Get or create the symptom extractor singleton."""
    global _symptom_extractor
    if _symptom_extractor is None:
        _symptom_extractor = SymptomExtractor()
    return _symptom_extractor