"""
MediConnect Chatbot Models
==========================
Database models for AI-powered healthcare chatbot with:
- Multi-language support (Telugu, Hindi, English)
- Voice message support
- Conversation context management
- Azure OpenAI integration tracking
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ChatSession(models.Model):
    """
    Represents a conversation session between user and chatbot.
    Each session maintains context for coherent conversations.
    """
    
    SESSION_STATUS = [
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('expired', 'Expired'),
    ]
    
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('te', 'Telugu'),
        ('hi', 'Hindi'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions'
    )
    
    # Session metadata
    title = models.CharField(
        max_length=255,
        blank=True,
        help_text="Auto-generated title based on first message"
    )
    language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='en'
    )
    status = models.CharField(
        max_length=20,
        choices=SESSION_STATUS,
        default='active'
    )
    
    # Context management for Azure OpenAI
    context_summary = models.TextField(
        blank=True,
        help_text="Summarized context for long conversations"
    )
    last_intent = models.CharField(
        max_length=50,
        blank=True,
        help_text="Last detected intent (symptoms, appointment, emergency, general)"
    )
    
    # Linked diagnosis session (if user discussed symptoms)
    linked_diagnosis = models.ForeignKey(
        'diagnosis.DiagnosisSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_sessions'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Token usage tracking (for Azure OpenAI billing)
    total_tokens_used = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'chatbot_sessions'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Chat {self.id} - {self.user.phone_number} ({self.language})"
    
    def end_session(self):
        """Mark session as ended."""
        self.status = 'ended'
        self.ended_at = timezone.now()
        self.save(update_fields=['status', 'ended_at', 'updated_at'])
    
    def get_message_count(self):
        """Get total messages in session."""
        return self.messages.count()
    
    def get_recent_messages(self, limit=10):
        """Get recent messages for context."""
        return self.messages.order_by('-created_at')[:limit][::-1]


class ChatMessage(models.Model):
    """
    Individual message in a chat session.
    Supports text and voice messages with translations.
    """
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    MESSAGE_TYPE = [
        ('text', 'Text'),
        ('voice', 'Voice'),
        ('quick_reply', 'Quick Reply'),
    ]
    
    INTENT_CHOICES = [
        ('symptoms', 'Symptoms Discussion'),
        ('appointment', 'Appointment Booking'),
        ('emergency', 'Emergency'),
        ('medicine', 'Medicine Inquiry'),
        ('general', 'General Health'),
        ('greeting', 'Greeting'),
        ('unknown', 'Unknown'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Message content
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE,
        default='text'
    )
    content = models.TextField(
        help_text="Original message content"
    )
    content_translated = models.TextField(
        blank=True,
        help_text="Translated content (to/from English for AI)"
    )
    
    # Language info
    original_language = models.CharField(
        max_length=5,
        default='en'
    )
    
    # Voice message data
    voice_audio_url = models.URLField(
        blank=True,
        help_text="URL to voice recording (Supabase Storage)"
    )
    voice_duration_seconds = models.FloatField(
        null=True,
        blank=True
    )
    
    # Intent detection (for user messages)
    detected_intent = models.CharField(
        max_length=30,
        choices=INTENT_CHOICES,
        default='unknown'
    )
    intent_confidence = models.FloatField(
        default=0.0,
        help_text="Confidence score 0-1"
    )
    
    # Extracted entities (symptoms, medicines, etc.)
    extracted_entities = models.JSONField(
        default=dict,
        blank=True,
        help_text="Extracted entities like symptoms, dates, etc."
    )
    
    # Azure OpenAI metadata (for assistant messages)
    model_used = models.CharField(
        max_length=50,
        blank=True,
        help_text="Azure OpenAI model used"
    )
    tokens_used = models.IntegerField(
        default=0
    )
    response_time_ms = models.IntegerField(
        default=0,
        help_text="Response generation time in milliseconds"
    )
    
    # Feedback
    feedback_rating = models.IntegerField(
        null=True,
        blank=True,
        help_text="User rating 1-5"
    )
    feedback_text = models.TextField(
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chatbot_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
            models.Index(fields=['detected_intent']),
        ]
    
    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"{self.role}: {preview}"


class FAQ(models.Model):
    """
    Frequently Asked Questions for quick responses.
    Multi-language support with pre-defined answers.
    """
    
    CATEGORY_CHOICES = [
        ('general', 'General Health'),
        ('symptoms', 'Symptoms'),
        ('medicine', 'Medicine'),
        ('appointment', 'Appointments'),
        ('emergency', 'Emergency'),
        ('app_usage', 'App Usage'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='general'
    )
    
    # Questions in all languages
    question_en = models.TextField()
    question_te = models.TextField(blank=True)
    question_hi = models.TextField(blank=True)
    
    # Answers in all languages
    answer_en = models.TextField()
    answer_te = models.TextField(blank=True)
    answer_hi = models.TextField(blank=True)
    
    # Keywords for matching
    keywords = models.JSONField(
        default=list,
        help_text="Keywords for FAQ matching"
    )
    
    # Ordering and visibility
    priority = models.IntegerField(
        default=0,
        help_text="Higher priority = shown first"
    )
    is_active = models.BooleanField(default=True)
    
    # Analytics
    view_count = models.IntegerField(default=0)
    helpful_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chatbot_faqs'
        ordering = ['-priority', 'category']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'
    
    def __str__(self):
        return f"[{self.category}] {self.question_en[:50]}"
    
    def get_question(self, language='en'):
        """Get question in specified language."""
        lang_map = {
            'en': self.question_en,
            'te': self.question_te or self.question_en,
            'hi': self.question_hi or self.question_en,
        }
        return lang_map.get(language, self.question_en)
    
    def get_answer(self, language='en'):
        """Get answer in specified language."""
        lang_map = {
            'en': self.answer_en,
            'te': self.answer_te or self.answer_en,
            'hi': self.answer_hi or self.answer_en,
        }
        return lang_map.get(language, self.answer_en)
    
    def increment_view(self):
        """Increment view count."""
        self.view_count += 1
        self.save(update_fields=['view_count'])


class HealthTip(models.Model):
    """
    Daily health tips for users.
    Multi-language support with categorization.
    """
    
    CATEGORY_CHOICES = [
        ('nutrition', 'Nutrition'),
        ('exercise', 'Exercise'),
        ('mental_health', 'Mental Health'),
        ('hygiene', 'Hygiene'),
        ('seasonal', 'Seasonal'),
        ('maternal', 'Maternal Health'),
        ('child', 'Child Health'),
        ('elderly', 'Elderly Care'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='general'
    )
    
    # Tips in all languages
    title_en = models.CharField(max_length=255)
    title_te = models.CharField(max_length=255, blank=True)
    title_hi = models.CharField(max_length=255, blank=True)
    
    content_en = models.TextField()
    content_te = models.TextField(blank=True)
    content_hi = models.TextField(blank=True)
    
    # Optional image
    image_url = models.URLField(blank=True)
    
    # Scheduling
    is_active = models.BooleanField(default=True)
    show_date = models.DateField(
        null=True,
        blank=True,
        help_text="Specific date to show this tip"
    )
    
    # Analytics
    view_count = models.IntegerField(default=0)
    like_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chatbot_health_tips'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.category}] {self.title_en}"
    
    def get_title(self, language='en'):
        """Get title in specified language."""
        lang_map = {
            'en': self.title_en,
            'te': self.title_te or self.title_en,
            'hi': self.title_hi or self.title_en,
        }
        return lang_map.get(language, self.title_en)
    
    def get_content(self, language='en'):
        """Get content in specified language."""
        lang_map = {
            'en': self.content_en,
            'te': self.content_te or self.content_en,
            'hi': self.content_hi or self.content_en,
        }
        return lang_map.get(language, self.content_en)


class QuickReply(models.Model):
    """
    Quick reply suggestions shown to users.
    Context-aware suggestions based on conversation.
    """
    
    CONTEXT_CHOICES = [
        ('start', 'Session Start'),
        ('symptoms', 'After Symptoms Discussion'),
        ('appointment', 'After Appointment'),
        ('diagnosis', 'After Diagnosis'),
        ('emergency', 'Emergency Context'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    context = models.CharField(
        max_length=30,
        choices=CONTEXT_CHOICES,
        default='general'
    )
    
    # Text in all languages
    text_en = models.CharField(max_length=100)
    text_te = models.CharField(max_length=100, blank=True)
    text_hi = models.CharField(max_length=100, blank=True)
    
    # What intent this triggers
    triggers_intent = models.CharField(
        max_length=30,
        blank=True,
        help_text="Intent this reply should trigger"
    )
    
    # Icon for visual representation
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon name (e.g., 'symptoms', 'doctor', 'medicine')"
    )
    
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'chatbot_quick_replies'
        ordering = ['context', '-priority']
    
    def __str__(self):
        return f"[{self.context}] {self.text_en}"
    
    def get_text(self, language='en'):
        """Get text in specified language."""
        lang_map = {
            'en': self.text_en,
            'te': self.text_te or self.text_en,
            'hi': self.text_hi or self.text_en,
        }
        return lang_map.get(language, self.text_en)


class ConversationFeedback(models.Model):
    """
    Overall feedback for a chat session.
    Used to improve chatbot responses.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    session = models.OneToOneField(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    
    # Ratings (1-5)
    overall_rating = models.IntegerField(
        help_text="Overall satisfaction 1-5"
    )
    helpfulness_rating = models.IntegerField(
        null=True,
        blank=True,
        help_text="How helpful was the chatbot"
    )
    ease_of_use_rating = models.IntegerField(
        null=True,
        blank=True,
        help_text="How easy was it to use"
    )
    
    # Text feedback
    feedback_text = models.TextField(blank=True)
    
    # What went well / what didn't
    liked_aspects = models.JSONField(
        default=list,
        blank=True
    )
    improvement_suggestions = models.TextField(blank=True)
    
    # Would recommend
    would_recommend = models.BooleanField(
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chatbot_conversation_feedback'
    
    def __str__(self):
        return f"Feedback for {self.session.id} - {self.overall_rating}/5"