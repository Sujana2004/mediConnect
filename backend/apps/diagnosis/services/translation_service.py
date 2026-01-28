"""
Translation Service
===================
Handle multi-language support for diagnosis.
Supports: English, Telugu, Hindi

For village users who may not speak English.
"""

import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class TranslationService:
    """
    Handle translations between English, Telugu, and Hindi.
    
    For production, integrate with:
    - Azure Translator API (free tier: 2M chars/month)
    - Google Translate API
    
    For now, uses basic mappings for common medical terms.
    """
    
    # Common medical phrase translations
    ENGLISH_TO_TELUGU = {
        # Symptoms
        'fever': 'జ్వరం',
        'headache': 'తలనొప్పి',
        'cough': 'దగ్గు',
        'cold': 'జలుబు',
        'body pain': 'ఒళ్ళు నొప్పులు',
        'stomach pain': 'కడుపు నొప్పి',
        'vomiting': 'వాంతులు',
        'diarrhea': 'విరేచనాలు',
        'weakness': 'నీరసం',
        'dizziness': 'తల తిరగడం',
        'chest pain': 'ఛాతీ నొప్పి',
        'breathlessness': 'ఊపిరి ఆడకపోవడం',
        'skin rash': 'చర్మంపై దద్దుర్లు',
        'itching': 'దురద',
        'joint pain': 'కీళ్ల నొప్పి',
        'back pain': 'నడుము నొప్పి',
        'sore throat': 'గొంతు నొప్పి',
        'nausea': 'వికారం',
        'fatigue': 'అలసట',
        'anxiety': 'ఆందోళన',
        
        # Severity levels
        'low': 'తక్కువ',
        'medium': 'మధ్యస్థం',
        'high': 'ఎక్కువ',
        'critical': 'అత్యవసరం',
        
        # Recommendations
        'consult a doctor': 'వైద్యుడిని సంప్రదించండి',
        'seek immediate medical attention': 'వెంటనే వైద్య సహాయం పొందండి',
        'rest and stay hydrated': 'విశ్రాంతి తీసుకోండి మరియు నీళ్ళు తాగండి',
        'take medicine as prescribed': 'సూచించిన మందులు వాడండి',
        
        # Specialists
        'general physician': 'జనరల్ ఫిజీషియన్',
        'cardiologist': 'హృద్రోగ నిపుణుడు',
        'dermatologist': 'చర్మ వైద్యుడు',
        'neurologist': 'నరాల వైద్యుడు',
        'orthopedic': 'ఎముకల వైద్యుడు',
        'ent specialist': 'ముక్కు చెవి గొంతు వైద్యుడు',
        'gastroenterologist': 'జీర్ణకోశ వైద్యుడు',
    }
    
    ENGLISH_TO_HINDI = {
        # Symptoms
        'fever': 'बुखार',
        'headache': 'सिरदर्द',
        'cough': 'खांसी',
        'cold': 'सर्दी',
        'body pain': 'बदन दर्द',
        'stomach pain': 'पेट दर्द',
        'vomiting': 'उल्टी',
        'diarrhea': 'दस्त',
        'weakness': 'कमजोरी',
        'dizziness': 'चक्कर आना',
        'chest pain': 'सीने में दर्द',
        'breathlessness': 'सांस फूलना',
        'skin rash': 'त्वचा पर दाने',
        'itching': 'खुजली',
        'joint pain': 'जोड़ों में दर्द',
        'back pain': 'कमर दर्द',
        'sore throat': 'गले में खराश',
        'nausea': 'मतली',
        'fatigue': 'थकान',
        'anxiety': 'चिंता',
        
        # Severity levels
        'low': 'कम',
        'medium': 'मध्यम',
        'high': 'अधिक',
        'critical': 'गंभीर',
        
        # Recommendations
        'consult a doctor': 'डॉक्टर से मिलें',
        'seek immediate medical attention': 'तुरंत चिकित्सा सहायता लें',
        'rest and stay hydrated': 'आराम करें और पानी पीते रहें',
        'take medicine as prescribed': 'निर्धारित दवाई लें',
        
        # Specialists
        'general physician': 'जनरल फिजिशियन',
        'cardiologist': 'हृदय रोग विशेषज्ञ',
        'dermatologist': 'त्वचा विशेषज्ञ',
        'neurologist': 'न्यूरोलॉजिस्ट',
        'orthopedic': 'हड्डी रोग विशेषज्ञ',
        'ent specialist': 'नाक कान गला विशेषज्ञ',
        'gastroenterologist': 'पेट रोग विशेषज्ञ',
    }
    
    # Reverse mappings for input translation
    TELUGU_TO_ENGLISH = {v: k for k, v in ENGLISH_TO_TELUGU.items()}
    HINDI_TO_ENGLISH = {v: k for k, v in ENGLISH_TO_HINDI.items()}
    
    @classmethod
    def detect_language(cls, text: str) -> str:
        """
        Detect language of input text.
        
        Returns: 'en', 'te', or 'hi'
        """
        if not text:
            return 'en'
        
        # Check for Telugu characters (Unicode range)
        telugu_range = range(0x0C00, 0x0C7F)
        for char in text:
            if ord(char) in telugu_range:
                return 'te'
        
        # Check for Hindi/Devanagari characters
        devanagari_range = range(0x0900, 0x097F)
        for char in text:
            if ord(char) in devanagari_range:
                return 'hi'
        
        return 'en'
    
    @classmethod
    def translate_to_english(cls, text: str, source_lang: Optional[str] = None) -> Tuple[str, str]:
        """
        Translate text to English.
        
        Args:
            text: Input text
            source_lang: Source language ('te', 'hi', 'en') or None for auto-detect
            
        Returns:
            (translated_text, detected_language)
        """
        if not text:
            return '', 'en'
        
        # Detect language if not provided
        if source_lang is None:
            source_lang = cls.detect_language(text)
        
        if source_lang == 'en':
            return text, 'en'
        
        # For now, do simple word/phrase replacement
        # In production, use Azure Translator API
        translated = text.lower()
        
        if source_lang == 'te':
            for telugu, english in cls.TELUGU_TO_ENGLISH.items():
                translated = translated.replace(telugu.lower(), english)
        elif source_lang == 'hi':
            for hindi, english in cls.HINDI_TO_ENGLISH.items():
                translated = translated.replace(hindi.lower(), english)
        
        return translated, source_lang
    
    @classmethod
    def translate_from_english(cls, text: str, target_lang: str) -> str:
        """
        Translate text from English to target language.
        
        Args:
            text: English text
            target_lang: Target language ('te', 'hi', 'en')
            
        Returns:
            Translated text
        """
        if not text or target_lang == 'en':
            return text
        
        translated = text.lower()
        
        if target_lang == 'te':
            for english, telugu in cls.ENGLISH_TO_TELUGU.items():
                translated = translated.replace(english.lower(), telugu)
        elif target_lang == 'hi':
            for english, hindi in cls.ENGLISH_TO_HINDI.items():
                translated = translated.replace(english.lower(), hindi)
        
        return translated
    
    @classmethod
    def get_symptom_name(cls, symptom_code: str, language: str = 'en') -> str:
        """Get symptom name in specified language."""
        try:
            from apps.diagnosis.models import Symptom
            symptom = Symptom.objects.filter(code=symptom_code).first()
            if symptom:
                return symptom.get_name(language)
        except:
            pass
        
        # Fallback
        name = symptom_code.replace('_', ' ').title()
        if language == 'te':
            return cls.ENGLISH_TO_TELUGU.get(name.lower(), name)
        elif language == 'hi':
            return cls.ENGLISH_TO_HINDI.get(name.lower(), name)
        return name
    
    @classmethod
    def get_disease_name(cls, disease_code: str, language: str = 'en') -> str:
        """Get disease name in specified language."""
        try:
            from apps.diagnosis.models import Disease
            disease = Disease.objects.filter(code=disease_code).first()
            if disease:
                return disease.get_name(language)
        except:
            pass
        
        # Fallback
        return disease_code.replace('_', ' ').title()
    
    @classmethod
    def translate_severity(cls, severity: str, language: str = 'en') -> str:
        """Translate severity level."""
        if language == 'te':
            return cls.ENGLISH_TO_TELUGU.get(severity.lower(), severity)
        elif language == 'hi':
            return cls.ENGLISH_TO_HINDI.get(severity.lower(), severity)
        return severity
    
    @classmethod
    def translate_specialist(cls, specialist: str, language: str = 'en') -> str:
        """Translate specialist name."""
        if language == 'te':
            return cls.ENGLISH_TO_TELUGU.get(specialist.lower(), specialist)
        elif language == 'hi':
            return cls.ENGLISH_TO_HINDI.get(specialist.lower(), specialist)
        return specialist