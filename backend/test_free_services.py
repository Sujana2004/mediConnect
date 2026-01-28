"""
Test Free Services
==================
Tests all FREE services for MediConnect chatbot.

Run: python test_free_services.py
"""

import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediconnect.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()


def test_language_detection():
    """Test language detection (local, no API)."""
    print("\n" + "="*50)
    print("🔤 LANGUAGE DETECTION (Local - FREE)")
    print("="*50)
    
    from apps.chatbot.services.language_service import LanguageDetectionService
    
    tests = [
        ("Hello, how are you?", "en", "English"),
        ("నాకు జ్వరం ఉంది", "te", "Telugu"),
        ("मुझे बुखार है", "hi", "Hindi"),
        ("I have తలనొప్పి", "te", "Mixed"),
    ]
    
    all_passed = True
    for text, expected, desc in tests:
        lang, conf = LanguageDetectionService.detect(text)
        status = "✅" if lang == expected else "⚠️"
        if lang != expected:
            all_passed = False
        print(f"  {status} {desc}: '{text[:25]}...' → {lang} ({conf:.0%})")
    
    return all_passed


def test_translation():
    """Test translation (Google Translate - FREE)."""
    print("\n" + "="*50)
    print("🌐 TRANSLATION (Google Translate - FREE)")
    print("="*50)
    
    from apps.chatbot.services.free_translation_service import FreeTranslationService
    
    translator = FreeTranslationService()
    
    if not translator.is_configured:
        print("  ❌ Translation not available!")
        print("     Run: pip install deep-translator")
        return False
    
    print("  ✅ Translation service configured")
    
    tests = [
        ("Hello, how are you?", "te", "English → Telugu"),
        ("I have a headache", "hi", "English → Hindi"),
        ("నాకు జ్వరం ఉంది", "en", "Telugu → English"),
    ]
    
    all_passed = True
    for text, target, desc in tests:
        try:
            result = translator.translate(text, target)
            print(f"  ✅ {desc}")
            print(f"     '{text}' → '{result}'")
        except Exception as e:
            print(f"  ❌ {desc}: {e}")
            all_passed = False
    
    return all_passed


def test_groq():
    """Test Groq AI (FREE)."""
    print("\n" + "="*50)
    print("🤖 GROQ AI (FREE - Llama 3)")
    print("="*50)
    
    from apps.chatbot.services.groq_service import GroqService
    
    groq = GroqService()
    
    api_key = os.environ.get('GROQ_API_KEY', '')
    print(f"  API Key: {'✅ Set' if api_key else '❌ Not set'}")
    print(f"  Configured: {'✅ Yes' if groq.is_configured else '❌ No'}")
    
    if not groq.is_configured:
        print("\n  ⚠️  Groq not configured!")
        print("     1. Go to https://console.groq.com/")
        print("     2. Create free account")
        print("     3. Get API key")
        print("     4. Add to .env: GROQ_API_KEY=your_key")
        return False
    
    print(f"  Model: {groq.model}")
    print("\n  Testing AI responses...")
    
    # Test 1: Simple question
    print("\n  📝 Test 1: Health Question")
    response, error = groq.generate_response(
        "What should I do if I have a fever?",
        intent="symptoms"
    )
    if response:
        print(f"  ✅ Response received in {response.response_time_ms}ms")
        print(f"     Tokens: {response.tokens_used}")
        print(f"     Preview: {response.content[:100]}...")
    else:
        print(f"  ❌ Error: {error}")
        return False
    
    # Test 2: Emergency
    print("\n  📝 Test 2: Emergency Response")
    response, error = groq.generate_response(
        "My father has chest pain!",
        intent="emergency"
    )
    if response:
        print(f"  ✅ Response received")
        has_108 = "108" in response.content
        print(f"     Mentions 108: {'✅ Yes' if has_108 else '⚠️ No'}")
        print(f"     Preview: {response.content[:100]}...")
    else:
        print(f"  ❌ Error: {error}")
        return False
    
    return True


def test_intent_detection():
    """Test intent detection (local, no API)."""
    print("\n" + "="*50)
    print("🎯 INTENT DETECTION (Local - FREE)")
    print("="*50)
    
    from apps.chatbot.services.intent_service import IntentDetectionService
    
    tests = [
        ("Hello!", "greeting"),
        ("I have a headache and fever", "symptoms"),
        ("Book doctor appointment", "appointment"),
        ("My father is unconscious!", "emergency"),
        ("What medicine for cold?", "medicine"),
    ]
    
    all_passed = True
    for text, expected in tests:
        intent, conf, _ = IntentDetectionService.detect(text)
        status = "✅" if intent == expected else "⚠️"
        print(f"  {status} '{text}' → {intent} ({conf:.0%})")
        if intent != expected:
            all_passed = False
    
    return all_passed


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("🏥 MEDICONNECT - FREE SERVICES TEST")
    print("="*60)
    print("Testing all FREE services (no paid APIs!)")
    
    results = {
        "Language Detection": test_language_detection(),
        "Intent Detection": test_intent_detection(),
        "Translation": test_translation(),
        "Groq AI": test_groq(),
    }
    
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    
    for service, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {service}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL FREE SERVICES WORKING!")
        print("   Total cost: $0.00 💰")
    else:
        print("⚠️  SOME SERVICES NEED SETUP")
        print("   See errors above for details")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)