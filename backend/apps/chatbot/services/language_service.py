"""
Language Detection Service
==========================
Detects language from text using Unicode ranges.
No external API needed - works offline.
"""

import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


class LanguageDetectionService:
    """
    Detects language from text based on Unicode character ranges.
    Supports: Telugu (te), Hindi (hi), English (en)
    """
    
    # Unicode ranges for Indian languages
    TELUGU_RANGE = (0x0C00, 0x0C7F)
    HINDI_RANGE = (0x0900, 0x097F)  # Devanagari
    
    # Common Telugu words for additional detection
    TELUGU_WORDS = {
        'నేను', 'మీరు', 'ఏమి', 'ఎలా', 'నాకు', 'ఉంది', 'అవును', 
        'కాదు', 'ధన్యవాదాలు', 'నమస్కారం', 'సహాయం', 'డాక్టర్',
        'నొప్పి', 'జ్వరం', 'తలనొప్పి', 'దగ్గు', 'జలుబు'
    }
    
    # Common Hindi words for additional detection
    HINDI_WORDS = {
        'मैं', 'आप', 'क्या', 'कैसे', 'मुझे', 'है', 'हाँ', 
        'नहीं', 'धन्यवाद', 'नमस्ते', 'मदद', 'डॉक्टर',
        'दर्द', 'बुखार', 'सिरदर्द', 'खांसी', 'जुकाम'
    }
    
    @classmethod
    def detect(cls, text: str) -> Tuple[str, float]:
        """
        Detect language of the given text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Tuple of (language_code, confidence_score)
            language_code: 'te', 'hi', or 'en'
            confidence_score: 0.0 to 1.0
        """
        if not text or not text.strip():
            return 'en', 0.0
        
        text = text.strip()
        
        # Count characters in each language range
        telugu_count = 0
        hindi_count = 0
        english_count = 0
        total_alpha = 0
        
        for char in text:
            code_point = ord(char)
            
            if cls.TELUGU_RANGE[0] <= code_point <= cls.TELUGU_RANGE[1]:
                telugu_count += 1
                total_alpha += 1
            elif cls.HINDI_RANGE[0] <= code_point <= cls.HINDI_RANGE[1]:
                hindi_count += 1
                total_alpha += 1
            elif char.isalpha():
                english_count += 1
                total_alpha += 1
        
        if total_alpha == 0:
            return 'en', 0.5  # Default to English for numbers/symbols only
        
        # Calculate percentages
        telugu_pct = telugu_count / total_alpha
        hindi_pct = hindi_count / total_alpha
        english_pct = english_count / total_alpha
        
        # Additional word-based detection for mixed text
        words = set(text.split())
        telugu_word_match = len(words & cls.TELUGU_WORDS)
        hindi_word_match = len(words & cls.HINDI_WORDS)
        
        # Boost scores based on word matches
        if telugu_word_match > 0:
            telugu_pct += 0.2 * telugu_word_match
        if hindi_word_match > 0:
            hindi_pct += 0.2 * hindi_word_match
        
        # Determine language
        if telugu_pct > hindi_pct and telugu_pct > english_pct:
            confidence = min(telugu_pct, 1.0)
            return 'te', confidence
        elif hindi_pct > telugu_pct and hindi_pct > english_pct:
            confidence = min(hindi_pct, 1.0)
            return 'hi', confidence
        else:
            confidence = min(english_pct, 1.0)
            return 'en', confidence
    
    @classmethod
    def is_telugu(cls, text: str) -> bool:
        """Check if text is primarily Telugu."""
        lang, conf = cls.detect(text)
        return lang == 'te' and conf > 0.5
    
    @classmethod
    def is_hindi(cls, text: str) -> bool:
        """Check if text is primarily Hindi."""
        lang, conf = cls.detect(text)
        return lang == 'hi' and conf > 0.5
    
    @classmethod
    def is_english(cls, text: str) -> bool:
        """Check if text is primarily English."""
        lang, conf = cls.detect(text)
        return lang == 'en' and conf > 0.5
    
    @classmethod
    def get_language_name(cls, code: str) -> str:
        """Get full language name from code."""
        names = {
            'en': 'English',
            'te': 'Telugu',
            'hi': 'Hindi',
        }
        return names.get(code, 'Unknown')