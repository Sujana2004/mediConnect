"""
Azure OpenAI Service
====================
Handles AI-powered chat responses using Azure OpenAI (GPT-3.5/GPT-4).
"""

import os
import time
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from ..config import AZURE_OPENAI_CONFIG, SYSTEM_PROMPTS, SESSION_CONFIG

logger = logging.getLogger(__name__)

# Try to import OpenAI SDK
try:
    from openai import AzureOpenAI
    OPENAI_SDK_AVAILABLE = True
except ImportError:
    OPENAI_SDK_AVAILABLE = False
    logger.warning("OpenAI SDK not installed. Run: pip install openai")


@dataclass
class ChatResponse:
    """Response from Azure OpenAI."""
    content: str
    tokens_used: int
    model: str
    response_time_ms: int
    finish_reason: str


class AzureOpenAIService:
    """
    Manages conversations with Azure OpenAI.
    Handles context management, system prompts, and token limits.
    """
    
    def __init__(self):
        self.api_key = AZURE_OPENAI_CONFIG['api_key']
        self.endpoint = AZURE_OPENAI_CONFIG['endpoint']
        self.deployment_name = AZURE_OPENAI_CONFIG['deployment_name']
        self.api_version = AZURE_OPENAI_CONFIG['api_version']
        
        self.max_tokens = AZURE_OPENAI_CONFIG['max_tokens']
        self.temperature = AZURE_OPENAI_CONFIG['temperature']
        
        self.is_configured = bool(
            self.api_key and 
            self.endpoint and 
            self.deployment_name and
            OPENAI_SDK_AVAILABLE
        )
        
        self.client = None
        if self.is_configured:
            try:
                self.client = AzureOpenAI(
                    api_key=self.api_key,
                    api_version=self.api_version,
                    azure_endpoint=self.endpoint
                )
                logger.info("Azure OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Azure OpenAI client: {e}")
                self.is_configured = False
        else:
            if not OPENAI_SDK_AVAILABLE:
                logger.warning("OpenAI SDK not available")
            else:
                logger.warning("Azure OpenAI not fully configured. Check environment variables.")
    
    def _build_messages(
        self,
        user_message: str,
        conversation_history: List[Dict],
        system_prompt: str,
        context_data: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Build message list for API call with context management.
        
        Args:
            user_message: Current user message
            conversation_history: Previous messages in session
            system_prompt: System prompt to use
            context_data: Additional context (diagnosis results, etc.)
        """
        messages = []
        
        # 1. Add system prompt
        full_system_prompt = system_prompt
        
        # Add context data if available (diagnosis results, user health info)
        if context_data:
            context_str = "\n\nCONTEXT INFORMATION:\n"
            
            if 'diagnosis' in context_data:
                diagnosis = context_data['diagnosis']
                context_str += f"- Recent diagnosis predictions: {diagnosis.get('diseases', [])}\n"
                context_str += f"- Reported symptoms: {diagnosis.get('symptoms', [])}\n"
                context_str += f"- Severity: {diagnosis.get('severity', 'unknown')}\n"
            
            if 'user_info' in context_data:
                user_info = context_data['user_info']
                if user_info.get('age'):
                    context_str += f"- Patient age: {user_info['age']}\n"
                if user_info.get('gender'):
                    context_str += f"- Patient gender: {user_info['gender']}\n"
                if user_info.get('conditions'):
                    context_str += f"- Existing conditions: {user_info['conditions']}\n"
            
            full_system_prompt += context_str
        
        messages.append({
            "role": "system",
            "content": full_system_prompt
        })
        
        # 2. Add conversation history (limited to prevent token overflow)
        max_history = SESSION_CONFIG['max_context_messages']
        recent_history = conversation_history[-max_history:] if conversation_history else []
        
        for msg in recent_history:
            messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        # 3. Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        return messages
    
    def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict] = None,
        intent: str = 'general',
        context_data: Optional[Dict] = None,
        language: str = 'en'
    ) -> Tuple[Optional[ChatResponse], Optional[str]]:
        """
        Generate AI response for user message.
        
        Args:
            user_message: User's message (should be in English for best results)
            conversation_history: Previous messages in the conversation
            intent: Detected intent (symptoms, appointment, emergency, etc.)
            context_data: Additional context information
            language: User's language for response formatting
            
        Returns:
            Tuple of (ChatResponse, error_message)
        """
        if not self.is_configured:
            return None, "Azure OpenAI not configured"
        
        if not user_message or not user_message.strip():
            return None, "Empty message"
        
        try:
            start_time = time.time()
            
            # Get appropriate system prompt based on intent
            system_prompt = SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS['default'])
            
            # Add language instruction if not English
            if language != 'en':
                lang_names = {'te': 'Telugu', 'hi': 'Hindi'}
                lang_name = lang_names.get(language, 'the user\'s language')
                system_prompt += f"\n\nIMPORTANT: The user prefers {lang_name}. If possible, include simple {lang_name} words or phrases that rural Indian users would understand."
            
            # Build message list
            messages = self._build_messages(
                user_message=user_message,
                conversation_history=conversation_history or [],
                system_prompt=system_prompt,
                context_data=context_data
            )
            
            # Make API call
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=AZURE_OPENAI_CONFIG['top_p'],
                frequency_penalty=AZURE_OPENAI_CONFIG['frequency_penalty'],
                presence_penalty=AZURE_OPENAI_CONFIG['presence_penalty'],
            )
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            # Extract response content
            choice = response.choices[0]
            content = choice.message.content.strip()
            
            # Get token usage
            tokens_used = response.usage.total_tokens if response.usage else 0
            
            chat_response = ChatResponse(
                content=content,
                tokens_used=tokens_used,
                model=self.deployment_name,
                response_time_ms=response_time_ms,
                finish_reason=choice.finish_reason or 'stop'
            )
            
            logger.info(f"OpenAI response generated in {response_time_ms}ms, tokens: {tokens_used}")
            
            return chat_response, None
            
        except Exception as e:
            logger.error(f"Azure OpenAI error: {e}")
            return None, str(e)
    
    def generate_simple_response(self, user_message: str) -> str:
        """
        Generate a simple response without conversation history.
        Useful for quick responses or error fallbacks.
        """
        response, error = self.generate_response(user_message)
        
        if response:
            return response.content
        
        # Fallback response
        return "I apologize, but I'm having trouble processing your request. Please try again or consult a healthcare provider."
    
    def summarize_conversation(self, messages: List[Dict]) -> Optional[str]:
        """
        Summarize a long conversation to save context.
        Used when conversation exceeds token limits.
        """
        if not self.is_configured or not messages:
            return None
        
        try:
            # Build summary prompt
            conversation_text = "\n".join([
                f"{msg['role']}: {msg['content']}" 
                for msg in messages
            ])
            
            summary_prompt = f"""Summarize this healthcare conversation in 2-3 sentences, 
            focusing on the main health concern, symptoms mentioned, and any recommendations given:
            
            {conversation_text}"""
            
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes conversations."},
                    {"role": "user", "content": summary_prompt}
                ],
                max_tokens=150,
                temperature=0.3,
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Conversation summarization error: {e}")
            return None


# Singleton instance
_openai_service = None


def get_openai_service() -> AzureOpenAIService:
    """Get singleton OpenAI service instance."""
    global _openai_service
    if _openai_service is None:
        _openai_service = AzureOpenAIService()
    return _openai_service