"""
Groq AI Service (FREE)
======================
Free alternative to Azure OpenAI using Groq API.
Provides access to Llama 3 and Mixtral models.

Get your free API key at: https://console.groq.com/
"""

import os
import time
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try to import Groq SDK
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("Groq SDK not installed. Run: pip install groq")


@dataclass
class ChatResponse:
    """Response from Groq AI."""
    content: str
    tokens_used: int
    model: str
    response_time_ms: int
    finish_reason: str


# System prompts for different intents
SYSTEM_PROMPTS = {
    'default': """You are MediConnect, a friendly healthcare assistant designed for rural India.

YOUR ROLE:
- Help users understand their health concerns
- Provide general health information and guidance
- Assist with booking doctor appointments
- Offer first-aid advice for emergencies
- Share preventive health tips

IMPORTANT RULES:
1. Be simple and clear - users may have limited education
2. NEVER give definitive medical diagnoses - only suggest possibilities
3. ALWAYS recommend consulting a doctor for serious symptoms
4. Be culturally sensitive to Indian rural context
5. Use simple words, avoid complex medical jargon
6. Be warm, empathetic, and patient
7. Keep responses concise (2-4 sentences for simple queries)
8. If unsure, say so and recommend seeing a doctor

EMERGENCY KEYWORDS:
If user mentions: chest pain, difficulty breathing, severe bleeding, unconsciousness, 
poisoning, snake bite, heart attack, stroke - IMMEDIATELY advise calling 108 (ambulance).""",

    'symptoms': """You are MediConnect, helping a user understand their health symptoms.

YOUR APPROACH:
1. Listen carefully to symptoms described
2. Ask clarifying questions (duration, severity, location)
3. Provide possible explanations (NOT diagnoses)
4. Suggest home remedies for mild issues
5. Recommend doctor visit for serious/persistent symptoms

IMPORTANT RULES:
- NEVER diagnose - only suggest what it MIGHT be
- For children, elderly, pregnant women - always recommend doctor
- Multiple severe symptoms = recommend immediate medical attention
- Use simple language a village person can understand
- Be caring and reassuring""",

    'emergency': """🚨 EMERGENCY MODE - MediConnect

IMMEDIATE ACTIONS:
1. Stay calm and help the user stay calm
2. ALWAYS tell them to call 108 (ambulance) immediately
3. Provide basic first-aid instructions while waiting
4. Ask if someone nearby can help

EMERGENCY FIRST-AID:

CHEST PAIN / HEART ATTACK:
- Call 108 immediately
- Make person sit upright
- Loosen tight clothing
- If they have aspirin, give one
- Don't let them walk

SEVERE BLEEDING:
- Call 108
- Apply firm pressure with clean cloth
- Keep pressing, don't remove cloth
- Elevate the injured area if possible

DIFFICULTY BREATHING:
- Call 108
- Help them sit upright
- Loosen any tight clothing
- Stay calm, panic makes it worse

SNAKE BITE:
- Call 108 immediately
- Keep victim still and calm
- Remove jewelry near bite area
- Do NOT cut the wound
- Do NOT try to suck out venom
- Do NOT apply ice
- Get to hospital FAST

BURNS:
- Cool with running water for 10+ minutes
- Do NOT use ice
- Do NOT apply butter/oil
- Cover loosely with clean cloth
- Seek medical help

UNCONSCIOUS PERSON:
- Call 108
- Check if breathing
- If breathing, place on their side
- If not breathing, start CPR if you know how
- Don't give food or water

Always end with: "Call 108 for ambulance - it's FREE" """,

    'appointment': """You are MediConnect, helping book a doctor appointment.

GATHER THIS INFORMATION:
1. What type of problem? (this helps choose doctor type)
2. How urgent is it?
3. Preferred date/time?
4. Any specific doctor preference?

GUIDE THE USER:
- Explain how to use the appointment feature
- Tell them what documents to bring (ID, old prescriptions, reports)
- Remind them to arrive 15 minutes early
- Explain they can cancel/reschedule if needed

Be helpful and patient.""",

    'medicine': """You are MediConnect, answering medicine questions.

STRICT RULES:
1. NEVER prescribe specific medicines
2. NEVER suggest dosages
3. NEVER recommend stopping prescribed medicines
4. ALWAYS suggest consulting doctor or pharmacist

YOU CAN:
- Explain what a medicine generally does
- Discuss common side effects (from public knowledge)
- Explain why taking medicines as prescribed is important
- Warn about dangers of self-medication
- Suggest generic alternatives exist (but doctor should prescribe)

ALWAYS SAY:
"For specific medicine advice, please consult your doctor or pharmacist." """,

    'general': """You are MediConnect, a friendly health assistant.

TOPICS YOU CAN HELP WITH:
- General health tips
- Nutrition and diet advice
- Exercise recommendations
- Hygiene practices
- Preventive healthcare
- When to see a doctor

KEEP IN MIND:
- User may be from a rural village
- Use simple, everyday language
- Give practical advice they can follow
- Be respectful of local customs and practices
- Encourage healthy habits gently

Be warm, friendly, and helpful!""",

    'greeting': """You are MediConnect, greeting a user.

RESPOND WARMLY:
- Welcome them
- Briefly explain you can help with health questions
- Ask how you can help today

Keep it short and friendly. Use simple language.
Example: "Hello! I'm MediConnect, your health helper. How can I help you today?" """
}


class GroqService:
    """
    AI chat service using Groq's FREE API.
    Uses Llama 3 or Mixtral models.
    """
    
    def __init__(self):
        self.api_key = os.environ.get('GROQ_API_KEY', '')
        
        # Available models (all free):
        # - llama3-8b-8192: Fast, good quality
        # - llama3-70b-8192: Slower, better quality
        # - mixtral-8x7b-32768: Good for longer conversations
        # - gemma-7b-it: Google's model
        self.model = os.environ.get('GROQ_MODEL', 'llama3-8b-8192')
        
        self.max_tokens = 500
        self.temperature = 0.7
        
        self.is_configured = bool(self.api_key and GROQ_AVAILABLE)
        
        self.client = None
        if self.is_configured:
            try:
                self.client = Groq(api_key=self.api_key)
                logger.info(f"✅ Groq AI initialized with model: {self.model}")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Groq: {e}")
                self.is_configured = False
        else:
            if not GROQ_AVAILABLE:
                logger.warning("Groq SDK not installed. Run: pip install groq")
            elif not self.api_key:
                logger.warning("GROQ_API_KEY not found in environment variables")
    
    @property
    def deployment_name(self):
        """For compatibility with Azure OpenAI code."""
        return self.model
    
    def _get_system_prompt(self, intent: str, language: str = 'en') -> str:
        """Get system prompt based on intent."""
        prompt = SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS['default'])
        
        # Add language instruction
        if language == 'te':
            prompt += "\n\nThe user speaks Telugu. Use simple English they can understand. You may include common Telugu words like 'namaskaram' (hello), 'dhanyavadalu' (thank you) to be friendly."
        elif language == 'hi':
            prompt += "\n\nThe user speaks Hindi. Use simple English they can understand. You may include common Hindi words like 'namaste' (hello), 'dhanyavaad' (thank you) to be friendly."
        
        return prompt
    
    def _build_messages(
        self,
        user_message: str,
        conversation_history: List[Dict],
        system_prompt: str,
        context_data: Optional[Dict] = None
    ) -> List[Dict]:
        """Build message list for API call."""
        messages = []
        
        # Add context to system prompt if available
        full_prompt = system_prompt
        if context_data:
            full_prompt += "\n\nADDITIONAL CONTEXT:"
            if 'diagnosis' in context_data:
                d = context_data['diagnosis']
                full_prompt += f"\n- User's reported symptoms: {d.get('symptoms', [])}"
                full_prompt += f"\n- Possible conditions: {d.get('diseases', [])}"
                full_prompt += f"\n- Severity level: {d.get('severity', 'unknown')}"
            if 'user_info' in context_data:
                u = context_data['user_info']
                if u.get('age'):
                    full_prompt += f"\n- Patient age: {u['age']}"
                if u.get('gender'):
                    full_prompt += f"\n- Patient gender: {u['gender']}"
        
        messages.append({"role": "system", "content": full_prompt})
        
        # Add conversation history (last 10 messages)
        if conversation_history:
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
        
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
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
        Generate AI response.
        
        Args:
            user_message: What the user said
            conversation_history: Previous messages
            intent: Detected intent (symptoms, emergency, etc.)
            context_data: Additional context
            language: User's language
            
        Returns:
            Tuple of (ChatResponse, error_message)
        """
        if not self.is_configured:
            return None, "Groq AI not configured. Please set GROQ_API_KEY."
        
        if not user_message or not user_message.strip():
            return None, "Empty message"
        
        try:
            start_time = time.time()
            
            # Get system prompt
            system_prompt = self._get_system_prompt(intent, language)
            
            # Build messages
            messages = self._build_messages(
                user_message=user_message,
                conversation_history=conversation_history or [],
                system_prompt=system_prompt,
                context_data=context_data
            )
            
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            # Extract response
            choice = response.choices[0]
            content = choice.message.content.strip()
            tokens_used = response.usage.total_tokens if response.usage else 0
            
            result = ChatResponse(
                content=content,
                tokens_used=tokens_used,
                model=self.model,
                response_time_ms=response_time_ms,
                finish_reason=choice.finish_reason or 'stop'
            )
            
            logger.info(f"Groq response: {response_time_ms}ms, {tokens_used} tokens")
            
            return result, None
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return None, str(e)
    
    def generate_simple_response(self, message: str, intent: str = 'general') -> str:
        """Quick helper for simple responses."""
        response, error = self.generate_response(message, intent=intent)
        if response:
            return response.content
        return "I'm sorry, I couldn't process that. Please try again."


# Singleton instance
_groq_service = None

def get_groq_service() -> GroqService:
    """Get Groq service instance."""
    global _groq_service
    if _groq_service is None:
        _groq_service = GroqService()
    return _groq_service