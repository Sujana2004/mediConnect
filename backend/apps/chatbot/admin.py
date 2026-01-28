"""
Chatbot Admin Configuration
===========================
Django admin configuration for chatbot models.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ChatSession,
    ChatMessage,
    FAQ,
    HealthTip,
    QuickReply,
    ConversationFeedback
)


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    """Admin for chat sessions."""
    
    list_display = [
        'id_short',
        'user_phone',
        'language',
        'status',
        'message_count',
        'tokens_used',
        'created_at',
    ]
    list_filter = ['status', 'language', 'created_at']
    search_fields = ['user__phone_number', 'id']
    readonly_fields = [
        'id', 'user', 'created_at', 'updated_at', 
        'ended_at', 'total_tokens_used'
    ]
    ordering = ['-updated_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'Session ID'
    
    def user_phone(self, obj):
        return obj.user.phone_number
    user_phone.short_description = 'User'
    
    def message_count(self, obj):
        return obj.messages.count()
    message_count.short_description = 'Messages'
    
    def tokens_used(self, obj):
        return obj.total_tokens_used
    tokens_used.short_description = 'Tokens'


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin for chat messages."""
    
    list_display = [
        'id_short',
        'session_short',
        'role',
        'message_type',
        'content_preview',
        'detected_intent',
        'created_at',
    ]
    list_filter = ['role', 'message_type', 'detected_intent', 'created_at']
    search_fields = ['content', 'session__id']
    readonly_fields = ['id', 'session', 'created_at']
    ordering = ['-created_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def session_short(self, obj):
        return str(obj.session.id)[:8]
    session_short.short_description = 'Session'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    """Admin for FAQs."""
    
    list_display = [
        'question_preview',
        'category',
        'priority',
        'is_active',
        'view_count',
        'helpful_count',
    ]
    list_filter = ['category', 'is_active']
    search_fields = ['question_en', 'question_te', 'question_hi', 'keywords']
    list_editable = ['priority', 'is_active']
    ordering = ['-priority', 'category']
    
    fieldsets = (
        ('English Content', {
            'fields': ('question_en', 'answer_en')
        }),
        ('Telugu Content', {
            'fields': ('question_te', 'answer_te'),
            'classes': ('collapse',)
        }),
        ('Hindi Content', {
            'fields': ('question_hi', 'answer_hi'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('category', 'keywords', 'priority', 'is_active')
        }),
        ('Statistics', {
            'fields': ('view_count', 'helpful_count'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['view_count', 'helpful_count']
    
    def question_preview(self, obj):
        return obj.question_en[:60] + '...' if len(obj.question_en) > 60 else obj.question_en
    question_preview.short_description = 'Question'


@admin.register(HealthTip)
class HealthTipAdmin(admin.ModelAdmin):
    """Admin for health tips."""
    
    list_display = [
        'title_en',
        'category',
        'is_active',
        'show_date',
        'view_count',
        'like_count',
    ]
    list_filter = ['category', 'is_active', 'show_date']
    search_fields = ['title_en', 'title_te', 'title_hi', 'content_en']
    list_editable = ['is_active']
    ordering = ['-created_at']
    
    fieldsets = (
        ('English Content', {
            'fields': ('title_en', 'content_en')
        }),
        ('Telugu Content', {
            'fields': ('title_te', 'content_te'),
            'classes': ('collapse',)
        }),
        ('Hindi Content', {
            'fields': ('title_hi', 'content_hi'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('category', 'image_url', 'show_date', 'is_active')
        }),
        ('Statistics', {
            'fields': ('view_count', 'like_count'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['view_count', 'like_count']


@admin.register(QuickReply)
class QuickReplyAdmin(admin.ModelAdmin):
    """Admin for quick replies."""
    
    list_display = [
        'text_en',
        'context',
        'triggers_intent',
        'icon',
        'priority',
        'is_active',
    ]
    list_filter = ['context', 'is_active']
    search_fields = ['text_en', 'text_te', 'text_hi']
    list_editable = ['priority', 'is_active']
    ordering = ['context', '-priority']
    
    fieldsets = (
        ('Content', {
            'fields': ('text_en', 'text_te', 'text_hi')
        }),
        ('Settings', {
            'fields': ('context', 'triggers_intent', 'icon', 'priority', 'is_active')
        }),
    )


@admin.register(ConversationFeedback)
class ConversationFeedbackAdmin(admin.ModelAdmin):
    """Admin for conversation feedback."""
    
    list_display = [
        'session_short',
        'overall_rating_stars',
        'helpfulness_rating',
        'would_recommend',
        'created_at',
    ]
    list_filter = ['overall_rating', 'would_recommend', 'created_at']
    search_fields = ['feedback_text', 'session__id']
    readonly_fields = ['session', 'created_at']
    ordering = ['-created_at']
    
    def session_short(self, obj):
        return str(obj.session.id)[:8]
    session_short.short_description = 'Session'
    
    def overall_rating_stars(self, obj):
        stars = '⭐' * obj.overall_rating
        return format_html('<span style="color: gold;">{}</span>', stars)
    overall_rating_stars.short_description = 'Rating'