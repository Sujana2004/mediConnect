"""
Azure Speech Service
====================
Handles Speech-to-Text and Text-to-Speech using Azure Speech Services.
"""

import os
import logging
import tempfile
import base64
from typing import Optional, Tuple
from pathlib import Path

from ..config import AZURE_SPEECH_CONFIG

logger = logging.getLogger(__name__)

# Try to import Azure Speech SDK
try:
    import azure.cognitiveservices.speech as speechsdk
    SPEECH_SDK_AVAILABLE = True
except ImportError:
    SPEECH_SDK_AVAILABLE = False
    logger.warning("Azure Speech SDK not installed. Run: pip install azure-cognitiveservices-speech")


class AzureSpeechService:
    """
    Handles speech-to-text (STT) and text-to-speech (TTS) operations.
    """
    
    def __init__(self):
        self.speech_key = AZURE_SPEECH_CONFIG['key']
        self.speech_region = AZURE_SPEECH_CONFIG['region']
        self.voices = AZURE_SPEECH_CONFIG['voices']
        self.stt_languages = AZURE_SPEECH_CONFIG['stt_languages']
        
        self.is_configured = bool(self.speech_key and self.speech_region and SPEECH_SDK_AVAILABLE)
        
        if not SPEECH_SDK_AVAILABLE:
            logger.warning("Azure Speech SDK not available")
        elif not self.speech_key:
            logger.warning("Azure Speech key not configured")
    
    def _get_speech_config(self) -> Optional['speechsdk.SpeechConfig']:
        """Get Azure Speech configuration."""
        if not self.is_configured:
            return None
        
        speech_config = speechsdk.SpeechConfig(
            subscription=self.speech_key,
            region=self.speech_region
        )
        return speech_config
    
    def speech_to_text(
        self, 
        audio_data: bytes, 
        language: str = 'en'
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Convert speech audio to text.
        
        Args:
            audio_data: Audio file bytes (WAV format preferred)
            language: Language code (en, te, hi)
            
        Returns:
            Tuple of (transcribed_text, error_message)
        """
        if not self.is_configured:
            return None, "Speech service not configured"
        
        try:
            speech_config = self._get_speech_config()
            
            # Set recognition language
            stt_language = self.stt_languages.get(language, 'en-IN')
            speech_config.speech_recognition_language = stt_language
            
            # Write audio to temp file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            try:
                # Create audio config from file
                audio_config = speechsdk.AudioConfig(filename=temp_path)
                
                # Create recognizer
                recognizer = speechsdk.SpeechRecognizer(
                    speech_config=speech_config,
                    audio_config=audio_config
                )
                
                # Perform recognition
                result = recognizer.recognize_once()
                
                if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                    logger.info(f"Speech recognized: {result.text[:50]}...")
                    return result.text, None
                elif result.reason == speechsdk.ResultReason.NoMatch:
                    return None, "No speech could be recognized"
                elif result.reason == speechsdk.ResultReason.Canceled:
                    cancellation = result.cancellation_details
                    error_msg = f"Speech recognition canceled: {cancellation.reason}"
                    if cancellation.error_details:
                        error_msg += f" - {cancellation.error_details}"
                    logger.error(error_msg)
                    return None, error_msg
                else:
                    return None, "Unknown recognition error"
                    
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except Exception as e:
            logger.error(f"Speech-to-text error: {e}")
            return None, str(e)
    
    def text_to_speech(
        self, 
        text: str, 
        language: str = 'en'
    ) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Convert text to speech audio.
        
        Args:
            text: Text to convert
            language: Language code (en, te, hi)
            
        Returns:
            Tuple of (audio_bytes, error_message)
        """
        if not self.is_configured:
            return None, "Speech service not configured"
        
        if not text or not text.strip():
            return None, "No text provided"
        
        try:
            speech_config = self._get_speech_config()
            
            # Set voice based on language
            voice_name = self.voices.get(language, self.voices['en'])
            speech_config.speech_synthesis_voice_name = voice_name
            
            # Set output format
            speech_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
            )
            
            # Create synthesizer with no audio output (we want bytes)
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=speech_config,
                audio_config=None
            )
            
            # Perform synthesis
            result = synthesizer.speak_text(text)
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logger.info(f"TTS completed for text: {text[:50]}...")
                return result.audio_data, None
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                error_msg = f"Speech synthesis canceled: {cancellation.reason}"
                if cancellation.error_details:
                    error_msg += f" - {cancellation.error_details}"
                logger.error(error_msg)
                return None, error_msg
            else:
                return None, "Unknown synthesis error"
                
        except Exception as e:
            logger.error(f"Text-to-speech error: {e}")
            return None, str(e)
    
    def text_to_speech_base64(
        self, 
        text: str, 
        language: str = 'en'
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Convert text to speech and return as base64 encoded string.
        Useful for sending audio in JSON responses.
        
        Returns:
            Tuple of (base64_audio, error_message)
        """
        audio_bytes, error = self.text_to_speech(text, language)
        
        if audio_bytes:
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            return audio_base64, None
        
        return None, error
    
    def get_available_voices(self, language: str = None) -> dict:
        """Get available voices, optionally filtered by language."""
        if language:
            return {language: self.voices.get(language)}
        return self.voices


# Singleton instance
_speech_service = None


def get_speech_service() -> AzureSpeechService:
    """Get singleton speech service instance."""
    global _speech_service
    if _speech_service is None:
        _speech_service = AzureSpeechService()
    return _speech_service