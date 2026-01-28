"""
Chatbot Views
=============
API views for chatbot functionality.
"""

import logging
from django.utils import timezone
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import (
    ChatSession,
    ChatMessage,
    FAQ,
    HealthTip,
    QuickReply,
    ConversationFeedback
)
from .serializers import (
    StartSessionSerializer,
    ChatSessionSerializer,
    ChatSessionListSerializer,
    SendMessageSerializer,
    SendVoiceMessageSerializer,
    ChatMessageSerializer,
    FAQSerializer,
    HealthTipSerializer,
    QuickReplySerializer,
    MessageFeedbackSerializer,
    SubmitConversationFeedbackSerializer,
    ConversationFeedbackSerializer,
    DetectLanguageSerializer,
    TranslateTextSerializer,
    TextToSpeechSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# PAGINATION
# =============================================================================

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_chat_service():
    """Get chat service instance."""
    from .services.chat_service import ChatService
    return ChatService()


def get_language_service():
    """Get language detection service."""
    from .services.language_service import LanguageDetectionService
    return LanguageDetectionService


def get_translation_service():
    """Get translation service instance."""
    from .services.translation_service import AzureTranslationService
    return AzureTranslationService()


def get_speech_service():
    """Get speech service instance."""
    from .services.speech_service import AzureSpeechService
    return AzureSpeechService()


def get_openai_service():
    """Get OpenAI service instance."""
    from .services.openai_service import AzureOpenAIService
    return AzureOpenAIService()


# =============================================================================
# SESSION ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request):
    """Start a new chat session."""
    serializer = StartSessionSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    chat_service = get_chat_service()
    
    session = chat_service.start_session(
        user=request.user,
        language=serializer.validated_data.get('language', 'en')
    )
    
    # Link diagnosis if provided
    diagnosis_id = serializer.validated_data.get('linked_diagnosis_id')
    if diagnosis_id:
        try:
            from apps.diagnosis.models import DiagnosisSession
            diagnosis = DiagnosisSession.objects.get(id=diagnosis_id, user=request.user)
            session.linked_diagnosis = diagnosis
            session.save(update_fields=['linked_diagnosis'])
        except Exception as e:
            logger.warning(f"Could not link diagnosis {diagnosis_id}: {e}")
    
    response_serializer = ChatSessionSerializer(session)
    
    return Response({
        'success': True,
        'session': response_serializer.data,
        'message': 'Chat session started successfully'
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    """List all chat sessions for the current user."""
    sessions = ChatSession.objects.filter(user=request.user)
    
    status_filter = request.query_params.get('status')
    if status_filter in ['active', 'ended', 'expired']:
        sessions = sessions.filter(status=status_filter)
    
    sessions = sessions.order_by('-updated_at')
    
    paginator = StandardPagination()
    page = paginator.paginate_queryset(sessions, request)
    
    serializer = ChatSessionListSerializer(page, many=True)
    
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session(request, session_id):
    """Get details of a specific chat session."""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ChatSessionSerializer(session)
    
    return Response({
        'success': True,
        'session': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session_messages(request, session_id):
    """Get all messages in a chat session."""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    messages = session.messages.order_by('created_at')
    
    paginator = StandardPagination()
    page = paginator.paginate_queryset(messages, request)
    
    serializer = ChatMessageSerializer(page, many=True)
    
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_session(request, session_id):
    """End a chat session."""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if session.status != 'active':
        return Response({
            'success': False,
            'error': 'Session is already ended'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    chat_service = get_chat_service()
    result = chat_service.end_session(session)
    
    return Response(result)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_session(request, session_id):
    """Delete a chat session and all its messages."""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    session.delete()
    
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# MESSAGE ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a text message to the chatbot."""
    serializer = SendMessageSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    chat_service = get_chat_service()
    
    # Get or create session
    session_id = data.get('session_id')
    
    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
            if session.status != 'active':
                session = chat_service.start_session(
                    user=request.user,
                    language=data.get('language', 'en')
                )
        except ChatSession.DoesNotExist:
            session = chat_service.start_session(
                user=request.user,
                language=data.get('language', 'en')
            )
    else:
        session = chat_service.get_or_create_active_session(
            user=request.user,
            language=data.get('language', 'en')
        )
    
    # Process message
    result = chat_service.process_message(
        session=session,
        message_text=data['message'],
        message_type='text',
        include_voice_response=data.get('include_voice_response', False)
    )
    
    result['session_id'] = str(session.id)
    
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_voice_message(request):
    """Send a voice message to the chatbot."""
    serializer = SendVoiceMessageSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    chat_service = get_chat_service()
    
    # Get or create session
    session_id = data.get('session_id')
    
    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            session = chat_service.start_session(
                user=request.user,
                language=data.get('language', 'en')
            )
    else:
        session = chat_service.get_or_create_active_session(
            user=request.user,
            language=data.get('language', 'en')
        )
    
    # Read audio data
    audio_file = data['audio']
    audio_data = audio_file.read()
    
    # Process voice message
    result = chat_service.process_voice_message(
        session=session,
        audio_data=audio_data,
        audio_language=data.get('language', 'en')
    )
    
    result['session_id'] = str(session.id)
    
    return Response(result)


# =============================================================================
# FAQ ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_faqs(request):
    """Get list of frequently asked questions."""
    language = request.query_params.get('language', 'en')
    category = request.query_params.get('category')
    
    faqs = FAQ.objects.filter(is_active=True)
    
    if category:
        faqs = faqs.filter(category=category)
    
    faqs = faqs.order_by('-priority', 'category')
    
    serializer = FAQSerializer(
        faqs, 
        many=True, 
        context={'language': language}
    )
    
    # Group by category
    categories = {}
    for faq in serializer.data:
        cat = faq['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(faq)
    
    return Response({
        'success': True,
        'faqs': serializer.data,
        'faqs_by_category': categories,
        'language': language
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_faq_categories(request):
    """Get list of FAQ categories with counts."""
    categories = FAQ.objects.filter(is_active=True).values('category').annotate(
        count=Count('id')
    ).order_by('category')
    
    category_names = {
        'general': 'General Health',
        'symptoms': 'Symptoms',
        'medicine': 'Medicine',
        'appointment': 'Appointments',
        'emergency': 'Emergency',
        'app_usage': 'App Usage',
    }
    
    result = [
        {
            'code': cat['category'],
            'name': category_names.get(cat['category'], cat['category']),
            'count': cat['count']
        }
        for cat in categories
    ]
    
    return Response({
        'success': True,
        'categories': result
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def mark_faq_helpful(request, faq_id):
    """Mark an FAQ as helpful."""
    try:
        faq = FAQ.objects.get(id=faq_id, is_active=True)
    except FAQ.DoesNotExist:
        return Response({
            'success': False,
            'error': 'FAQ not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    faq.helpful_count += 1
    faq.save(update_fields=['helpful_count'])
    
    return Response({
        'success': True,
        'message': 'Thank you for your feedback!'
    })


# =============================================================================
# HEALTH TIPS ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_health_tips(request):
    """Get list of health tips."""
    language = request.query_params.get('language', 'en')
    category = request.query_params.get('category')
    
    tips = HealthTip.objects.filter(is_active=True)
    
    if category:
        tips = tips.filter(category=category)
    
    tips = tips.order_by('-created_at')[:20]
    
    serializer = HealthTipSerializer(
        tips,
        many=True,
        context={'language': language}
    )
    
    return Response({
        'success': True,
        'tips': serializer.data,
        'language': language
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_daily_tip(request):
    """Get today's health tip."""
    language = request.query_params.get('language', 'en')
    
    chat_service = get_chat_service()
    tip = chat_service.get_daily_health_tip(language)
    
    if tip:
        return Response({
            'success': True,
            'tip': tip
        })
    
    return Response({
        'success': False,
        'message': 'No health tips available'
    }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def like_health_tip(request, tip_id):
    """Like a health tip."""
    try:
        tip = HealthTip.objects.get(id=tip_id, is_active=True)
    except HealthTip.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Health tip not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    tip.like_count += 1
    tip.save(update_fields=['like_count'])
    
    return Response({
        'success': True,
        'like_count': tip.like_count
    })


# =============================================================================
# QUICK REPLIES ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quick_replies(request):
    """Get quick reply suggestions based on context."""
    language = request.query_params.get('language', 'en')
    context = request.query_params.get('context', 'start')
    
    replies = QuickReply.objects.filter(
        is_active=True,
        context__in=[context, 'general']
    ).order_by('-priority')[:6]
    
    serializer = QuickReplySerializer(
        replies,
        many=True,
        context={'language': language}
    )
    
    return Response({
        'success': True,
        'quick_replies': serializer.data,
        'context': context,
        'language': language
    })


# =============================================================================
# FEEDBACK ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_message_feedback(request):
    """Submit feedback for a specific message."""
    serializer = MessageFeedbackSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    try:
        message = ChatMessage.objects.get(
            id=data['message_id'],
            session__user=request.user
        )
    except ChatMessage.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Message not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    message.feedback_rating = data['rating']
    message.feedback_text = data.get('feedback_text', '')
    message.save(update_fields=['feedback_rating', 'feedback_text'])
    
    return Response({
        'success': True,
        'message': 'Thank you for your feedback!'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_conversation_feedback(request):
    """Submit overall feedback for a chat session."""
    serializer = SubmitConversationFeedbackSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    try:
        session = ChatSession.objects.get(
            id=data['session_id'],
            user=request.user
        )
    except ChatSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if feedback already exists
    if hasattr(session, 'feedback'):
        return Response({
            'success': False,
            'error': 'Feedback already submitted for this session'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    feedback = ConversationFeedback.objects.create(
        session=session,
        overall_rating=data['overall_rating'],
        helpfulness_rating=data.get('helpfulness_rating'),
        ease_of_use_rating=data.get('ease_of_use_rating'),
        feedback_text=data.get('feedback_text', ''),
        would_recommend=data.get('would_recommend')
    )
    
    response_serializer = ConversationFeedbackSerializer(feedback)
    
    return Response({
        'success': True,
        'feedback': response_serializer.data,
        'message': 'Thank you for your feedback!'
    })


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def detect_language(request):
    """Detect language of provided text."""
    serializer = DetectLanguageSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    text = serializer.validated_data['text']
    
    LanguageDetectionService = get_language_service()
    language, confidence = LanguageDetectionService.detect(text)
    language_name = LanguageDetectionService.get_language_name(language)
    
    return Response({
        'success': True,
        'text': text[:100] + '...' if len(text) > 100 else text,
        'detected_language': language,
        'language_name': language_name,
        'confidence': round(confidence, 2)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def translate_text(request):
    """Translate text between languages."""
    serializer = TranslateTextSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    translation_service = get_translation_service()
    
    translated = translation_service.translate(
        text=data['text'],
        target_language=data['target_language'],
        source_language=data.get('source_language')
    )
    
    return Response({
        'success': True,
        'original_text': data['text'],
        'translated_text': translated,
        'target_language': data['target_language'],
        'source_language': data.get('source_language', 'auto')
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def text_to_speech(request):
    """Convert text to speech audio."""
    serializer = TextToSpeechSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    speech_service = get_speech_service()
    
    audio_base64, error = speech_service.text_to_speech_base64(
        text=data['text'],
        language=data['language']
    )
    
    if error:
        return Response({
            'success': False,
            'error': error
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': True,
        'audio': audio_base64,
        'format': 'mp3',
        'language': data['language']
    })


# =============================================================================
# HEALTH CHECK ENDPOINT
# =============================================================================

# @api_view(['GET'])
# @permission_classes([AllowAny])
# def health_check(request):
#     """Health check endpoint for chatbot services."""
#     openai_service = get_openai_service()
#     speech_service = get_speech_service()
#     translation_service = get_translation_service()
    
#     services = {
#         'azure_openai': {
#             'configured': openai_service.is_configured,
#             'model': openai_service.deployment_name if openai_service.is_configured else None
#         },
#         'azure_speech': {
#             'configured': speech_service.is_configured,
#             'region': speech_service.speech_region if speech_service.is_configured else None
#         },
#         'azure_translator': {
#             'configured': translation_service.is_configured
#         },
#         'database': {
#             'connected': True
#         }
#     }
    
#     all_configured = all([
#         services['azure_openai']['configured'],
#         services['database']['connected']
#     ])
    
#     return Response({
#         'status': 'healthy' if all_configured else 'degraded',
#         'services': services,
#         'timestamp': timezone.now().isoformat(),
#         'message': 'All core services operational' if all_configured else 'Some services not configured'
#     })

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for chatbot services."""
    
    from .services.groq_service import GroqService
    from .services.free_translation_service import FreeTranslationService
    
    groq = GroqService()
    translator = FreeTranslationService()
    
    services = {
        'ai_service': {
            'provider': 'Groq (FREE)',
            'configured': groq.is_configured,
            'model': groq.model if groq.is_configured else None
        },
        'translation': {
            'provider': 'Google Translate (FREE)',
            'configured': translator.is_configured
        },
        'speech': {
            'provider': 'Web Speech API (Frontend)',
            'configured': True,
            'note': 'Handled in browser, no backend config needed'
        },
        'language_detection': {
            'provider': 'Local (No API)',
            'configured': True
        },
        'database': {
            'connected': True
        }
    }
    
    all_ok = groq.is_configured and services['database']['connected']
    
    return Response({
        'status': 'healthy' if all_ok else 'degraded',
        'services': services,
        'timestamp': timezone.now().isoformat(),
        'message': 'All FREE services operational!' if all_ok else 'Some services need configuration',
        'cost': 'FREE - No paid APIs used! 🎉'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    """Get chatbot usage statistics for the current user."""
    user = request.user
    
    sessions = ChatSession.objects.filter(user=user)
    
    total_sessions = sessions.count()
    active_sessions = sessions.filter(status='active').count()
    total_messages = ChatMessage.objects.filter(session__user=user).count()
    total_tokens = sum(sessions.values_list('total_tokens_used', flat=True))
    
    recent_sessions = sessions.order_by('-updated_at')[:5]
    
    return Response({
        'success': True,
        'stats': {
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'total_messages': total_messages,
            'total_tokens_used': total_tokens,
        },
        'recent_sessions': ChatSessionListSerializer(recent_sessions, many=True).data
    })