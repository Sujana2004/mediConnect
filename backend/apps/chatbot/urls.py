"""
Chatbot URL Configuration
=========================
URL patterns for chatbot API endpoints.
"""

from django.urls import path
from . import views

app_name = 'chatbot'

urlpatterns = [
    # ==========================================================================
    # SESSION ENDPOINTS
    # ==========================================================================
    path(
        'session/start/',
        views.start_session,
        name='start_session'
    ),
    path(
        'sessions/',
        views.list_sessions,
        name='list_sessions'
    ),
    path(
        'session/<uuid:session_id>/',
        views.get_session,
        name='get_session'
    ),
    path(
        'session/<uuid:session_id>/messages/',
        views.get_session_messages,
        name='get_session_messages'
    ),
    path(
        'session/<uuid:session_id>/end/',
        views.end_session,
        name='end_session'
    ),
    path(
        'session/<uuid:session_id>/delete/',
        views.delete_session,
        name='delete_session'
    ),
    
    # ==========================================================================
    # MESSAGE ENDPOINTS
    # ==========================================================================
    path(
        'message/',
        views.send_message,
        name='send_message'
    ),
    path(
        'message/voice/',
        views.send_voice_message,
        name='send_voice_message'
    ),
    
    # ==========================================================================
    # FAQ ENDPOINTS
    # ==========================================================================
    path(
        'faq/',
        views.list_faqs,
        name='list_faqs'
    ),
    path(
        'faq/categories/',
        views.get_faq_categories,
        name='faq_categories'
    ),
    path(
        'faq/<uuid:faq_id>/helpful/',
        views.mark_faq_helpful,
        name='mark_faq_helpful'
    ),
    
    # ==========================================================================
    # HEALTH TIPS ENDPOINTS
    # ==========================================================================
    path(
        'health-tips/',
        views.list_health_tips,
        name='list_health_tips'
    ),
    path(
        'health-tips/daily/',
        views.get_daily_tip,
        name='daily_tip'
    ),
    path(
        'health-tips/<uuid:tip_id>/like/',
        views.like_health_tip,
        name='like_health_tip'
    ),
    
    # ==========================================================================
    # QUICK REPLIES
    # ==========================================================================
    path(
        'suggestions/',
        views.get_quick_replies,
        name='quick_replies'
    ),
    
    # ==========================================================================
    # FEEDBACK ENDPOINTS
    # ==========================================================================
    path(
        'feedback/message/',
        views.submit_message_feedback,
        name='message_feedback'
    ),
    path(
        'feedback/conversation/',
        views.submit_conversation_feedback,
        name='conversation_feedback'
    ),
    
    # ==========================================================================
    # UTILITY ENDPOINTS
    # ==========================================================================
    path(
        'detect-language/',
        views.detect_language,
        name='detect_language'
    ),
    path(
        'translate/',
        views.translate_text,
        name='translate'
    ),
    path(
        'text-to-speech/',
        views.text_to_speech,
        name='text_to_speech'
    ),
    
    # ==========================================================================
    # SYSTEM ENDPOINTS
    # ==========================================================================
    path(
        'health/',
        views.health_check,
        name='health_check'
    ),
    path(
        'stats/',
        views.get_user_stats,
        name='user_stats'
    ),
]