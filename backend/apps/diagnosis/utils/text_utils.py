"""
Text Utilities for Diagnosis App
================================
Functions for cleaning, normalizing, and processing text.
"""

import re
import unicodedata
from typing import List, Optional


class TextUtils:
    """Utility class for text processing."""
    
    @staticmethod
    def clean_symptom_name(name: str) -> str:
        """
        Clean and normalize a symptom name.
        
        Example:
            "dischromic _patches" -> "dischromic patches"
            "spotting_ urination" -> "spotting urination"
            "HEADACHE" -> "headache"
        """
        if not name:
            return ""
        
        # Convert to lowercase
        name = name.lower().strip()
        
        # Replace underscores with spaces
        name = name.replace('_', ' ')
        
        # Remove extra spaces
        name = re.sub(r'\s+', ' ', name)
        
        # Remove leading/trailing spaces
        name = name.strip()
        
        return name
    
    @staticmethod
    def symptom_to_code(name: str) -> str:
        """
        Convert symptom name to a code format.
        
        Example:
            "skin rash" -> "skin_rash"
            "Headache" -> "headache"
            "loss of appetite" -> "loss_of_appetite"
        """
        if not name:
            return ""
        
        # Clean first
        name = TextUtils.clean_symptom_name(name)
        
        # Replace spaces with underscores
        code = name.replace(' ', '_')
        
        # Remove any non-alphanumeric characters except underscore
        code = re.sub(r'[^a-z0-9_]', '', code)
        
        # Remove multiple underscores
        code = re.sub(r'_+', '_', code)
        
        return code
    
    @staticmethod
    def code_to_display_name(code: str) -> str:
        """
        Convert code to human-readable display name.
        
        Example:
            "skin_rash" -> "Skin Rash"
            "loss_of_appetite" -> "Loss Of Appetite"
        """
        if not code:
            return ""
        
        # Replace underscores with spaces
        name = code.replace('_', ' ')
        
        # Title case
        name = name.title()
        
        return name
    
    @staticmethod
    def clean_disease_name(name: str) -> str:
        """
        Clean and normalize a disease name.
        
        Example:
            "fungal infection" -> "Fungal Infection"
            "(vertigo) Paroymam able Positional Vertigo" -> clean version
        """
        if not name:
            return ""
        
        # Remove parentheses content at start
        name = re.sub(r'^\([^)]+\)\s*', '', name)
        
        # Clean extra spaces
        name = re.sub(r'\s+', ' ', name)
        
        # Strip and title case
        name = name.strip().title()
        
        return name
    
    @staticmethod
    def disease_to_code(name: str) -> str:
        """
        Convert disease name to code format.
        
        Example:
            "Fungal Infection" -> "fungal_infection"
            "Common Cold" -> "common_cold"
        """
        if not name:
            return ""
        
        # Lowercase
        code = name.lower().strip()
        
        # Remove parentheses content
        code = re.sub(r'\([^)]+\)', '', code)
        
        # Replace spaces with underscores
        code = code.replace(' ', '_')
        
        # Remove special characters
        code = re.sub(r'[^a-z0-9_]', '', code)
        
        # Remove multiple underscores
        code = re.sub(r'_+', '_', code)
        
        # Remove leading/trailing underscores
        code = code.strip('_')
        
        return code
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize text for NLP processing.
        
        - Lowercase
        - Remove extra whitespace
        - Normalize unicode
        """
        if not text:
            return ""
        
        # Unicode normalization
        text = unicodedata.normalize('NFKC', text)
        
        # Lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    @staticmethod
    def extract_keywords(text: str) -> List[str]:
        """
        Extract keywords from text (simple tokenization).
        """
        if not text:
            return []
        
        # Normalize
        text = TextUtils.normalize_text(text)
        
        # Split by non-alphanumeric
        words = re.split(r'[^a-z0-9]+', text)
        
        # Filter short words and common stop words
        stop_words = {
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
            'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
            'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'again', 'further', 'then', 'once',
            'here', 'there', 'when', 'where', 'why', 'how', 'all',
            'each', 'few', 'more', 'most', 'other', 'some', 'such',
            'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
            'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
            'until', 'while', 'although', 'though', 'after', 'before',
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
            'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
            'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its',
            'itself', 'they', 'them', 'their', 'theirs', 'themselves',
            'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
            'am', 'im', 'ive', 'dont', 'doesnt', 'didnt', 'wont', 'wouldnt',
            'cant', 'couldnt', 'shouldnt', 'mustnt', 'neednt', 'having'
        }
        
        keywords = [w for w in words if len(w) > 2 and w not in stop_words]
        
        return keywords
    
    @staticmethod
    def is_telugu(text: str) -> bool:
        """Check if text contains Telugu characters."""
        if not text:
            return False
        telugu_range = range(0x0C00, 0x0C7F)
        return any(ord(char) in telugu_range for char in text)
    
    @staticmethod
    def is_hindi(text: str) -> bool:
        """Check if text contains Hindi/Devanagari characters."""
        if not text:
            return False
        devanagari_range = range(0x0900, 0x097F)
        return any(ord(char) in devanagari_range for char in text)
    
    @staticmethod
    def detect_language(text: str) -> str:
        """
        Detect language of text.
        Returns: 'te' for Telugu, 'hi' for Hindi, 'en' for English
        """
        if not text:
            return 'en'
        
        if TextUtils.is_telugu(text):
            return 'te'
        elif TextUtils.is_hindi(text):
            return 'hi'
        return 'en'