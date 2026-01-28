"""
Chatbot Configuration
=====================
All configuration settings for the chatbot app.
"""

import os
from pathlib import Path

# =============================================================================
# AZURE OPENAI CONFIGURATION
# =============================================================================

AZURE_OPENAI_CONFIG = {
    'api_key': os.environ.get('AZURE_OPENAI_API_KEY', ''),
    'endpoint': os.environ.get('AZURE_OPENAI_ENDPOINT', ''),
    'deployment_name': os.environ.get('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-35-turbo'),
    'api_version': os.environ.get('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
    
    # Model parameters
    'max_tokens': 500,
    'temperature': 0.7,
    'top_p': 0.95,
    'frequency_penalty': 0.0,
    'presence_penalty': 0.0,
}

# =============================================================================
# AZURE SPEECH CONFIGURATION
# =============================================================================

AZURE_SPEECH_CONFIG = {
    'key': os.environ.get('AZURE_SPEECH_KEY', ''),
    'region': os.environ.get('AZURE_SPEECH_REGION', 'centralindia'),
    
    # Voice names for Text-to-Speech
    'voices': {
        'en': 'en-IN-NeerjaNeural',      # Indian English female
        'te': 'te-IN-ShrutiNeural',       # Telugu female
        'hi': 'hi-IN-SwaraNeural',        # Hindi female
    },
    
    # Speech-to-Text languages
    'stt_languages': {
        'en': 'en-IN',
        'te': 'te-IN',
        'hi': 'hi-IN',
    },
}

# =============================================================================
# AZURE TRANSLATOR CONFIGURATION
# =============================================================================

AZURE_TRANSLATOR_CONFIG = {
    'key': os.environ.get('AZURE_TRANSLATOR_KEY', ''),
    'endpoint': os.environ.get('AZURE_TRANSLATOR_ENDPOINT', 'https://api.cognitive.microsofttranslator.com/'),
    'region': os.environ.get('AZURE_TRANSLATOR_REGION', 'centralindia'),
}

# =============================================================================
# SYSTEM PROMPTS FOR DIFFERENT CONTEXTS
# =============================================================================

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
2. NEVER give definitive medical diagnoses
3. ALWAYS recommend consulting a doctor for serious symptoms
4. Be culturally sensitive to Indian rural context
5. Use simple words, avoid complex medical jargon
6. Be warm, empathetic, and patient
7. If unsure, say so and recommend seeing a doctor

RESPONSE FORMAT:
- Keep responses short (2-3 sentences for simple queries)
- Use bullet points for lists
- Always end serious symptom discussions with doctor recommendation

EMERGENCY RECOGNITION:
If user mentions: chest pain, difficulty breathing, severe bleeding, unconsciousness, 
poisoning, snake bite, or similar emergencies - IMMEDIATELY advise calling emergency 
services (108 in India) and provide basic first-aid if applicable.""",

    'symptoms': """You are helping a user understand their symptoms.

APPROACH:
1. Ask clarifying questions about symptoms (duration, severity, location)
2. Gather relevant information (age, existing conditions)
3. Provide possible explanations (NOT diagnoses)
4. Recommend appropriate action (rest, home remedies, or doctor visit)

REMEMBER:
- Do NOT diagnose - suggest possibilities
- For children, elderly, or pregnant women - always recommend doctor
- Multiple severe symptoms = recommend immediate medical attention""",

    'appointment': """You are helping a user book a doctor appointment.

INFORMATION TO GATHER:
1. Type of doctor needed (general, specialist)
2. Preferred date and time
3. Any specific doctor preference
4. Urgency level

PROVIDE:
- Available time slots
- Doctor information
- What to bring to appointment
- Preparation instructions if any""",

    'emergency': """EMERGENCY MODE ACTIVATED

PRIORITY ACTIONS:
1. Assess if life-threatening (breathing, bleeding, consciousness)
2. Advise calling 108 (India emergency number) immediately
3. Provide relevant first-aid instructions
4. Keep user calm
5. Ask if someone else can help

COMMON EMERGENCIES:
- Chest pain: Stay calm, sit upright, call 108
- Severe bleeding: Apply pressure, elevate if possible
- Difficulty breathing: Sit upright, loosen clothing
- Snake bite: Stay still, don't cut/suck, go to hospital
- Burns: Cool water (not ice), cover loosely""",
}

# =============================================================================
# INTENT CLASSIFICATION
# =============================================================================

INTENT_KEYWORDS = {
    'symptoms': [
        'fever', 'pain', 'headache', 'cough', 'cold', 'stomach', 'vomiting',
        'diarrhea', 'rash', 'itching', 'swelling', 'weakness', 'tired',
        'nausea', 'dizziness', 'body ache', 'sore throat', 'breathing',
        'symptom', 'feeling', 'unwell', 'sick', 'problem', 'issue',
        # Telugu
        'జ్వరం', 'నొప్పి', 'తలనొప్పి', 'దగ్గు', 'జలుబు',
        # Hindi  
        'बुखार', 'दर्द', 'सिरदर्द', 'खांसी', 'जुकाम',
    ],
    'appointment': [
        'appointment', 'book', 'schedule', 'doctor', 'visit', 'meet',
        'consultation', 'check up', 'checkup', 'available', 'slot',
        # Telugu
        'అపాయింట్మెంట్', 'డాక్టర్', 'నియామకం',
        # Hindi
        'अपॉइंटमेंट', 'डॉक्टर', 'मिलना',
    ],
    'emergency': [
        'emergency', 'urgent', 'ambulance', 'accident', 'blood', 'bleeding',
        'unconscious', 'not breathing', 'heart attack', 'stroke', 'poison',
        'snake', 'bite', 'burn', 'severe', 'critical', 'dying', 'help',
        '108', 'hospital',
        # Telugu
        'అత్యవసరం', 'రక్తం', 'ప్రమాదం',
        # Hindi
        'आपातकाल', 'खून', 'दुर्घटना',
    ],
    'medicine': [
        'medicine', 'tablet', 'drug', 'prescription', 'dose', 'dosage',
        'pharmacy', 'medical store', 'side effect', 'interaction',
        # Telugu
        'మందు', 'టాబ్లెట్',
        # Hindi
        'दवाई', 'गोली',
    ],
    'greeting': [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'namaste', 'namaskar', 'vanakkam',
        # Telugu
        'నమస్కారం', 'నమస్తే',
        # Hindi
        'नमस्ते', 'नमस्कार',
    ],
}

# =============================================================================
# SESSION CONFIGURATION
# =============================================================================

SESSION_CONFIG = {
    # Maximum messages to include in context
    'max_context_messages': 10,
    
    # Session expires after this many hours of inactivity
    'session_timeout_hours': 24,
    
    # Maximum messages per session before suggesting new session
    'max_messages_per_session': 100,
    
    # Token limit for context (leave room for response)
    'max_context_tokens': 3000,
}

# =============================================================================
# RATE LIMITING
# =============================================================================

RATE_LIMITS = {
    # Messages per minute per user
    'messages_per_minute': 10,
    
    # Voice messages per hour per user
    'voice_per_hour': 20,
    
    # New sessions per day per user
    'sessions_per_day': 50,
}

# =============================================================================
# LANGUAGE DETECTION
# =============================================================================

LANGUAGE_CONFIG = {
    # Unicode ranges for language detection
    'telugu_range': (0x0C00, 0x0C7F),
    'hindi_range': (0x0900, 0x097F),
    
    # Default language
    'default_language': 'en',
}

# =============================================================================
# RESPONSE TEMPLATES
# =============================================================================

RESPONSE_TEMPLATES = {
    'greeting': {
        'en': "Hello! I'm MediConnect, your health assistant. How can I help you today?",
        'te': "నమస్కారం! నేను మెడికనెక్ట్, మీ ఆరోగ్య సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?",
        'hi': "नमस्ते! मैं मेडीकनेक्ट हूं, आपका स्वास्थ्य सहायक। मैं आपकी कैसे मदद कर सकता हूं?",
    },
    'error': {
        'en': "I'm sorry, I'm having trouble understanding. Could you please try again?",
        'te': "క్షమించండి, నాకు అర్థం కావడం లేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.",
        'hi': "क्षमा करें, मुझे समझने में परेशानी हो रही है। कृपया फिर से कोशिश करें।",
    },
    'emergency': {
        'en': "🚨 This sounds like an emergency! Please call 108 immediately for an ambulance.",
        'te': "🚨 ఇది అత్యవసర పరిస్థితి! దయచేసి వెంటనే 108 కు కాల్ చేయండి.",
        'hi': "🚨 यह आपातकालीन स्थिति लग रही है! कृपया तुरंत 108 पर कॉल करें।",
    },
    'doctor_recommendation': {
        'en': "Based on what you've described, I recommend consulting a doctor. Would you like me to help you book an appointment?",
        'te': "మీరు చెప్పిన దాని ఆధారంగా, డాక్టర్‌ను సంప్రదించమని నేను సిఫార్సు చేస్తున్నాను. అపాయింట్‌మెంట్ బుక్ చేయడంలో సహాయం కావాలా?",
        'hi': "आपने जो बताया उसके आधार पर, मैं डॉक्टर से परामर्श करने की सलाह देता हूं। क्या आप चाहते हैं कि मैं अपॉइंटमेंट बुक करने में मदद करूं?",
    },
    'session_end': {
        'en': "Thank you for chatting with MediConnect. Take care of your health! 🙏",
        'te': "మెడికనెక్ట్‌తో చాట్ చేసినందుకు ధన్యవాదాలు. మీ ఆరోగ్యాన్ని జాగ్రత్తగా చూసుకోండి! 🙏",
        'hi': "मेडीकनेक्ट से बात करने के लिए धन्यवाद। अपने स्वास्थ्य का ध्यान रखें! 🙏",
    },
}