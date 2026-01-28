"""
Chatbot Serializers
===================
Request/Response serializers for chatbot API endpoints.
"""

from rest_framework import serializers
from django.utils import timezone

from .models import (
    ChatSession,
    ChatMessage,
    FAQ,
    HealthTip,
    QuickReply,
    ConversationFeedback
)


# =============================================================================
# SESSION SERIALIZERS
# =============================================================================

class StartSessionSerializer(serializers.Serializer):
    """Request serializer for starting a new chat session."""
    
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        default='en',
        help_text="Preferred language: en (English), te (Telugu), hi (Hindi)"
    )
    
    linked_diagnosis_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Optional: Link to a diagnosis session for context"
    )


class ChatSessionSerializer(serializers.ModelSerializer):
    """Serializer for chat session details."""
    
    message_count = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id',
            'title',
            'language',
            'status',
            'last_intent',
            'message_count',
            'total_tokens_used',
            'duration_minutes',
            'created_at',
            'updated_at',
            'ended_at',
        ]
        read_only_fields = fields
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_duration_minutes(self, obj):
        if obj.ended_at:
            delta = obj.ended_at - obj.created_at
        else:
            delta = timezone.now() - obj.created_at
        return int(delta.total_seconds() / 60)


class ChatSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing sessions."""
    
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id',
            'title',
            'language',
            'status',
            'message_count',
            'last_message_preview',
            'updated_at',
        ]
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_last_message_preview(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            content = last_msg.content
            return content[:50] + '...' if len(content) > 50 else content
        return ''


# =============================================================================
# MESSAGE SERIALIZERS
# =============================================================================

class SendMessageSerializer(serializers.Serializer):
    """Request serializer for sending a text message."""
    
    session_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Session ID. If not provided, creates new session."
    )
    
    message = serializers.CharField(
        max_length=2000,
        help_text="User message text"
    )
    
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        required=False,
        default='en',
        help_text="Message language (auto-detected if not provided)"
    )
    
    include_voice_response = serializers.BooleanField(
        default=False,
        help_text="Whether to include TTS audio in response"
    )
    
    def validate_message(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Message cannot be empty")
        return value.strip()


class SendVoiceMessageSerializer(serializers.Serializer):
    """Request serializer for sending a voice message."""
    
    session_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Session ID. If not provided, creates new session."
    )
    
    audio = serializers.FileField(
        help_text="Audio file (WAV, MP3, WebM)"
    )
    
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        required=False,
        default='en',
        help_text="Expected language of audio"
    )
    
    def validate_audio(self, value):
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Audio file too large. Maximum 10MB.")
        return value


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat message details."""
    
    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'role',
            'message_type',
            'content',
            'content_translated',
            'original_language',
            'detected_intent',
            'intent_confidence',
            'voice_audio_url',
            'feedback_rating',
            'created_at',
        ]
        read_only_fields = fields


# =============================================================================
# FAQ SERIALIZERS
# =============================================================================

class FAQSerializer(serializers.ModelSerializer):
    """Serializer for FAQ items."""
    
    question = serializers.SerializerMethodField()
    answer = serializers.SerializerMethodField()
    
    class Meta:
        model = FAQ
        fields = [
            'id',
            'category',
            'question',
            'answer',
            'priority',
        ]
    
    def get_question(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_question(language)
    
    def get_answer(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_answer(language)


# =============================================================================
# HEALTH TIP SERIALIZERS
# =============================================================================

class HealthTipSerializer(serializers.ModelSerializer):
    """Serializer for health tips."""
    
    title = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()
    
    class Meta:
        model = HealthTip
        fields = [
            'id',
            'category',
            'title',
            'content',
            'image_url',
            'like_count',
        ]
    
    def get_title(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_title(language)
    
    def get_content(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_content(language)


# =============================================================================
# QUICK REPLY SERIALIZERS
# =============================================================================

class QuickReplySerializer(serializers.ModelSerializer):
    """Serializer for quick reply suggestions."""
    
    text = serializers.SerializerMethodField()
    
    class Meta:
        model = QuickReply
        fields = [
            'id',
            'context',
            'text',
            'icon',
            'triggers_intent',
        ]
    
    def get_text(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_text(language)


# =============================================================================
# FEEDBACK SERIALIZERS
# =============================================================================

class MessageFeedbackSerializer(serializers.Serializer):
    """Request serializer for message feedback."""
    
    message_id = serializers.UUIDField(
        help_text="ID of the message to rate"
    )
    
    rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        help_text="Rating from 1 (poor) to 5 (excellent)"
    )
    
    feedback_text = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional text feedback"
    )


class ConversationFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for conversation feedback."""
    
    class Meta:
        model = ConversationFeedback
        fields = [
            'id',
            'session',
            'overall_rating',
            'helpfulness_rating',
            'ease_of_use_rating',
            'feedback_text',
            'liked_aspects',
            'improvement_suggestions',
            'would_recommend',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SubmitConversationFeedbackSerializer(serializers.Serializer):
    """Request serializer for submitting conversation feedback."""
    
    session_id = serializers.UUIDField(
        help_text="ID of the chat session"
    )
    
    overall_rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        help_text="Overall satisfaction rating 1-5"
    )
    
    helpfulness_rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    
    ease_of_use_rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    
    feedback_text = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000
    )
    
    would_recommend = serializers.BooleanField(
        required=False,
        allow_null=True
    )


# =============================================================================
# UTILITY SERIALIZERS
# =============================================================================

class DetectLanguageSerializer(serializers.Serializer):
    """Request serializer for language detection."""
    
    text = serializers.CharField(
        max_length=1000,
        help_text="Text to detect language from"
    )


class TranslateTextSerializer(serializers.Serializer):
    """Request serializer for text translation."""
    
    text = serializers.CharField(
        max_length=5000,
        help_text="Text to translate"
    )
    
    target_language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        help_text="Target language code"
    )
    
    source_language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        required=False,
        help_text="Source language code (auto-detect if not provided)"
    )


class TextToSpeechSerializer(serializers.Serializer):
    """Request serializer for text-to-speech."""
    
    text = serializers.CharField(
        max_length=1000,
        help_text="Text to convert to speech"
    )
    
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        default='en',
        help_text="Language for speech synthesis"
    )