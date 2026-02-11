"""
Chatbot Admin Configuration (Enhanced)
=======================================
Django admin configuration for chatbot models with visual indicators,
performance optimization, and bulk actions.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Avg, F, Q
from django.urls import reverse
from django.http import HttpResponse
import csv
from datetime import timedelta

from .models import (
    ChatSession,
    ChatMessage,
    FAQ,
    HealthTip,
    QuickReply,
    ConversationFeedback
)


# ============================================
# HELPER FUNCTIONS
# ============================================

def status_badge(status):
    """Generate colored badge for session status."""
    colors = {
        'active': '#27ae60',
        'ended': '#7f8c8d',
        'expired': '#e74c3c',
    }
    color = colors.get(status, '#95a5a6')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
        color, status.upper()
    )


def language_badge(lang):
    """Generate badge for language."""
    lang_map = {
        'en': ('🇺🇸 EN', '#3498db'),
        'hi': ('🇮🇳 HI', '#f39c12'),
        'te': ('🇮🇳 TE', '#27ae60'),
    }
    text, color = lang_map.get(lang, (lang.upper(), '#7f8c8d'))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 2px 8px; '
        'border-radius: 8px; font-size: 10px;">{}</span>',
        color, text
    )


def intent_badge(intent):
    """Generate colored badge for detected intent."""
    colors = {
        'symptoms': '#e74c3c',
        'appointment': '#3498db',
        'emergency': '#c0392b',
        'medicine': '#27ae60',
        'doctor': '#9b59b6',
        'general': '#7f8c8d',
        'greeting': '#1abc9c',
        'feedback': '#f39c12',
    }
    color = colors.get(intent, '#95a5a6')
    icon_map = {
        'symptoms': '🤒',
        'appointment': '📅',
        'emergency': '🚨',
        'medicine': '💊',
        'doctor': '👨‍⚕️',
        'greeting': '👋',
        'feedback': '📝',
    }
    icon = icon_map.get(intent, '💬')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 2px 8px; '
        'border-radius: 8px; font-size: 10px;">{} {}</span>',
        color, icon, (intent or 'unknown').title()
    )


def percentage_display(count, total, label=""):
    """Display count with percentage."""
    if total and total > 0:
        pct = (count / total) * 100
        return format_html(
            '<span title="{} of {}">{} <small style="color: #7f8c8d;">({}%)</small></span>',
            count, total, count, f'{pct:.0f}'
        )
    return str(count)


# ============================================
# CUSTOM FILTERS
# ============================================

class SessionDurationFilter(admin.SimpleListFilter):
    """Filter sessions by duration."""
    title = 'Session Duration'
    parameter_name = 'duration'
    
    def lookups(self, request, model_admin):
        return (
            ('short', '⚡ Short (< 5 messages)'),
            ('medium', '💬 Medium (5-15 messages)'),
            ('long', '📚 Long (> 15 messages)'),
        )
    
    def queryset(self, request, queryset):
        queryset = queryset.annotate(_msg_count=Count('messages'))
        if self.value() == 'short':
            return queryset.filter(_msg_count__lt=5)
        if self.value() == 'medium':
            return queryset.filter(_msg_count__gte=5, _msg_count__lte=15)
        if self.value() == 'long':
            return queryset.filter(_msg_count__gt=15)


class TranslationStatusFilter(admin.SimpleListFilter):
    """Filter FAQs/Tips by translation completeness."""
    title = 'Translation Status'
    parameter_name = 'translation'
    
    def lookups(self, request, model_admin):
        return (
            ('complete', '✅ All Languages'),
            ('partial', '🟡 Partial'),
            ('english_only', '🔴 English Only'),
        )
    
    def queryset(self, request, queryset):
        # Works for both FAQ and HealthTip
        if self.value() == 'complete':
            return queryset.exclude(
                Q(question_te='') | Q(question_te__isnull=True) if hasattr(queryset.model, 'question_te')
                else Q(title_te='') | Q(title_te__isnull=True)
            ).exclude(
                Q(question_hi='') | Q(question_hi__isnull=True) if hasattr(queryset.model, 'question_hi')
                else Q(title_hi='') | Q(title_hi__isnull=True)
            )
        # Add other cases as needed


class IntentFilter(admin.SimpleListFilter):
    """Filter messages by detected intent."""
    title = 'Detected Intent'
    parameter_name = 'intent'
    
    def lookups(self, request, model_admin):
        return (
            ('symptoms', '🤒 Symptoms'),
            ('appointment', '📅 Appointment'),
            ('emergency', '🚨 Emergency'),
            ('medicine', '💊 Medicine'),
            ('doctor', '👨‍⚕️ Doctor'),
            ('greeting', '👋 Greeting'),
            ('general', '💬 General'),
        )
    
    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(detected_intent=self.value())


# ============================================
# INLINE ADMINS
# ============================================

class ChatMessageInline(admin.TabularInline):
    """Inline view of chat messages in session."""
    model = ChatMessage
    extra = 0
    readonly_fields = ['role_badge', 'content_short', 'intent_display', 'created_at']
    fields = ['role_badge', 'content_short', 'intent_display', 'created_at']
    max_num = 20  # Limit to recent 20 messages
    ordering = ['-created_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def role_badge(self, obj):
        if obj.role == 'user':
            return format_html('<span style="color: #3498db;">👤 User</span>')
        return format_html('<span style="color: #27ae60;">🤖 Bot</span>')
    role_badge.short_description = 'Role'
    
    def content_short(self, obj):
        content = obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
        return content
    content_short.short_description = 'Message'
    
    def intent_display(self, obj):
        if obj.detected_intent:
            return intent_badge(obj.detected_intent)
        return '-'
    intent_display.short_description = 'Intent'


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    """Admin for chat sessions with conversation view."""
    
    list_display = [
        'id_short',
        'user_link',
        'language_display',
        'status_badge_display',
        'message_count_display',
        'intent_summary',
        'tokens_display',
        'duration_display',
        'created_at',
    ]
    list_filter = [SessionDurationFilter, 'status', 'language', 'created_at']
    search_fields = ['user__phone', 'id']  # ✅ FIXED: was phone_number
    readonly_fields = [
        'id', 'user', 'created_at', 'updated_at', 
        'ended_at', 'total_tokens_used'
    ]
    ordering = ['-updated_at']
    list_select_related = ['user']  # ✅ Performance optimization
    list_per_page = 25
    inlines = [ChatMessageInline]  # ✅ See messages inline
    actions = ['end_sessions', 'export_sessions_csv']
    date_hierarchy = 'created_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _message_count=Count('messages')
        )
    
    @admin.display(description='Session ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='User')
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
        return format_html('<span style="color: #bdc3c7;">Anonymous</span>')
    
    @admin.display(description='Lang')
    def language_display(self, obj):
        return language_badge(obj.language)
    
    @admin.display(description='Status')
    def status_badge_display(self, obj):
        return status_badge(obj.status)
    
    @admin.display(description='Messages')
    def message_count_display(self, obj):
        count = getattr(obj, '_message_count', obj.messages.count())
        if count >= 15:
            color = '#27ae60'
            label = 'Engaged'
        elif count >= 5:
            color = '#f39c12'
            label = 'Normal'
        else:
            color = '#e74c3c'
            label = 'Short'
        return format_html(
            '<span style="color: {};" title="{}">{} msgs</span>',
            color, label, count
        )
    
    @admin.display(description='Top Intent')
    def intent_summary(self, obj):
        """Show most common intent in session."""
        top_intent = obj.messages.exclude(
            detected_intent__isnull=True
        ).exclude(
            detected_intent=''
        ).values('detected_intent').annotate(
            count=Count('id')
        ).order_by('-count').first()
        
        if top_intent:
            return intent_badge(top_intent['detected_intent'])
        return '-'
    
    @admin.display(description='Tokens')
    def tokens_display(self, obj):
        tokens = obj.total_tokens_used or 0
        if tokens > 1000:
            return format_html('<span style="color: #e74c3c;">{}</span>', tokens)
        return tokens
    
    @admin.display(description='Duration')
    def duration_display(self, obj):
        if obj.ended_at and obj.created_at:
            duration = obj.ended_at - obj.created_at
            minutes = duration.total_seconds() / 60
            if minutes < 5:
                return format_html('<span style="color: #27ae60;">{:.0f} min</span>', minutes)
            elif minutes < 30:
                return format_html('<span style="color: #f39c12;">{:.0f} min</span>', minutes)
            return format_html('<span style="color: #e74c3c;">{:.0f} min</span>', minutes)
        return '-'
    
    @admin.action(description='🔒 End selected sessions')
    def end_sessions(self, request, queryset):
        count = queryset.filter(status='active').update(
            status='ended',
            ended_at=timezone.now()
        )
        self.message_user(request, f'{count} sessions ended.')
    
    @admin.action(description='📥 Export to CSV')
    def export_sessions_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="chat_sessions.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Session ID', 'User Phone', 'Language', 'Status', 'Messages', 'Tokens', 'Created'])
        
        for session in queryset.select_related('user').annotate(_msg_count=Count('messages')):
            writer.writerow([
                str(session.id),
                session.user.phone if session.user else 'Anonymous',
                session.language,
                session.status,
                session._msg_count,
                session.total_tokens_used,
                session.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin for chat messages with intent analysis."""
    
    list_display = [
        'id_short',
        'session_link',
        'role_badge',
        'message_type_badge',
        'content_preview',
        'intent_display',
        'created_at',
    ]
    list_filter = [IntentFilter, 'role', 'message_type', 'created_at']
    search_fields = ['content', 'session__id', 'session__user__phone']  # ✅ FIXED
    readonly_fields = ['id', 'session', 'created_at']
    ordering = ['-created_at']
    list_select_related = ['session', 'session__user']  # ✅ Performance
    list_per_page = 50
    actions = ['export_messages_csv', 'export_for_training']
    date_hierarchy = 'created_at'
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="font-size: 10px;">{}</code>',
            str(obj.id)[:6]
        )
    
    @admin.display(description='Session')
    def session_link(self, obj):
        url = reverse('admin:chatbot_chatsession_change', args=[obj.session.pk])
        user = obj.session.user.phone if obj.session.user else 'Anon'
        return format_html('<a href="{}">{}</a>', url, user[:10])
    
    @admin.display(description='Role')
    def role_badge(self, obj):
        if obj.role == 'user':
            return format_html(
                '<span style="background-color: #3498db; color: white; padding: 2px 8px; '
                'border-radius: 8px; font-size: 10px;">👤 USER</span>'
            )
        return format_html(
            '<span style="background-color: #27ae60; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">🤖 BOT</span>'
        )
    
    @admin.display(description='Type')
    def message_type_badge(self, obj):
        type_colors = {
            'text': '#7f8c8d',
            'quick_reply': '#3498db',
            'card': '#9b59b6',
            'action': '#e67e22',
        }
        color = type_colors.get(obj.message_type, '#95a5a6')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.message_type.title()
        )
    
    @admin.display(description='Content')
    def content_preview(self, obj):
        content = obj.content[:80] + '...' if len(obj.content) > 80 else obj.content
        return content
    
    @admin.display(description='Intent')
    def intent_display(self, obj):
        if obj.detected_intent:
            return intent_badge(obj.detected_intent)
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.action(description='📥 Export to CSV')
    def export_messages_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="chat_messages.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Session', 'Role', 'Content', 'Intent', 'Created'])
        
        for msg in queryset.select_related('session'):
            writer.writerow([
                str(msg.session.id)[:8],
                msg.role,
                msg.content,
                msg.detected_intent or '',
                msg.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response
    
    @admin.action(description='📊 Export for Intent Training')
    def export_for_training(self, request, queryset):
        """Export user messages for intent classification training."""
        user_messages = queryset.filter(role='user', detected_intent__isnull=False)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="intent_training_data.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['text', 'intent'])
        
        for msg in user_messages:
            writer.writerow([msg.content, msg.detected_intent])
        
        self.message_user(request, f'Exported {user_messages.count()} messages for training.')
        return response


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    """Admin for FAQs with translation status and effectiveness metrics."""
    
    list_display = [
        'question_preview',
        'category_badge',
        'translation_status',
        'priority',
        'effectiveness_display',
        'view_count',
        'is_active',
    ]
    list_filter = ['category', 'is_active', 'priority']
    search_fields = ['question_en', 'question_te', 'question_hi', 'keywords', 'answer_en']
    list_editable = ['priority', 'is_active']
    ordering = ['-priority', 'category']
    list_per_page = 25
    actions = ['activate_faqs', 'deactivate_faqs', 'export_faqs_csv']
    
    fieldsets = (
        ('English Content', {
            'fields': ('question_en', 'answer_en')
        }),
        ('Telugu Content (తెలుగు)', {
            'fields': ('question_te', 'answer_te'),
            'classes': ('collapse',)
        }),
        ('Hindi Content (हिंदी)', {
            'fields': ('question_hi', 'answer_hi'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('category', 'keywords', 'priority', 'is_active')
        }),
        ('📊 Statistics (Read Only)', {
            'fields': ('view_count', 'helpful_count'),
            'classes': ('collapse',),
            'description': 'Track FAQ effectiveness'
        }),
    )
    
    readonly_fields = ['view_count', 'helpful_count']
    
    @admin.display(description='Question')
    def question_preview(self, obj):
        q = obj.question_en[:50] + '...' if len(obj.question_en) > 50 else obj.question_en
        return q
    
    @admin.display(description='Category')
    def category_badge(self, obj):
        category_colors = {
            'general': '#7f8c8d',
            'symptoms': '#e74c3c',
            'appointments': '#3498db',
            'medicines': '#27ae60',
            'emergency': '#c0392b',
            'account': '#9b59b6',
        }
        color = category_colors.get(obj.category.lower() if obj.category else '', '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, obj.category or 'N/A'
        )
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        has_te = bool(obj.question_te and obj.answer_te)
        has_hi = bool(obj.question_hi and obj.answer_hi)
        
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ TE ✓ HI</span>')
        elif has_te:
            return format_html('<span style="color: #f39c12;">✓ TE ✗ HI</span>')
        elif has_hi:
            return format_html('<span style="color: #f39c12;">✗ TE ✓ HI</span>')
        return format_html('<span style="color: #e74c3c;">✗ EN only</span>')
    
    @admin.display(description='Priority')
    def priority_display(self, obj):
        if obj.priority >= 8:
            return format_html('<span style="color: #27ae60; font-weight: bold;">⬆️ {}</span>', obj.priority)
        elif obj.priority >= 5:
            return format_html('<span style="color: #f39c12;">{}</span>', obj.priority)
        return format_html('<span style="color: #bdc3c7;">{}</span>', obj.priority)
    
    @admin.display(description='Helpful %')
    def effectiveness_display(self, obj):
        if obj.view_count and obj.view_count > 0:
            rate = (obj.helpful_count / obj.view_count) * 100
            if rate >= 70:
                color = '#27ae60'
            elif rate >= 40:
                color = '#f39c12'
            else:
                color = '#e74c3c'
            return format_html(
                '<span style="color: {};">{:.0f}% ({}/{})</span>',
                color, rate, obj.helpful_count, obj.view_count
            )
        return format_html('<span style="color: #bdc3c7;">No data</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.action(description='✅ Activate selected FAQs')
    def activate_faqs(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} FAQs activated.')
    
    @admin.action(description='❌ Deactivate selected FAQs')
    def deactivate_faqs(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} FAQs deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_faqs_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="faqs_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Question (EN)', 'Answer (EN)', 'Question (TE)', 'Question (HI)', 'Category', 'Priority', 'Views', 'Helpful'])
        
        for faq in queryset:
            writer.writerow([
                faq.question_en,
                faq.answer_en,
                faq.question_te or '',
                faq.question_hi or '',
                faq.category,
                faq.priority,
                faq.view_count,
                faq.helpful_count
            ])
        
        return response


@admin.register(HealthTip)
class HealthTipAdmin(admin.ModelAdmin):
    """Admin for health tips with scheduling."""
    
    list_display = [
        'title_preview',
        'category_badge',
        'translation_status',
        'scheduled_display',
        'engagement_display',
        'is_active',
        'created_at',
    ]
    list_filter = ['category', 'is_active', 'show_date']
    search_fields = ['title_en', 'title_te', 'title_hi', 'content_en']
    list_editable = ['is_active']
    ordering = ['-created_at']
    list_per_page = 25
    actions = ['activate_tips', 'deactivate_tips', 'schedule_for_today']
    date_hierarchy = 'show_date'
    
    fieldsets = (
        ('English Content', {
            'fields': ('title_en', 'content_en')
        }),
        ('Telugu Content (తెలుగు)', {
            'fields': ('title_te', 'content_te'),
            'classes': ('collapse',)
        }),
        ('Hindi Content (हिंदी)', {
            'fields': ('title_hi', 'content_hi'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('category', 'image_url', 'show_date', 'is_active')
        }),
        ('📊 Engagement Stats', {
            'fields': ('view_count', 'like_count'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['view_count', 'like_count']
    
    @admin.display(description='Title')
    def title_preview(self, obj):
        return obj.title_en[:40] + '...' if len(obj.title_en) > 40 else obj.title_en
    
    @admin.display(description='Category')
    def category_badge(self, obj):
        category_colors = {
            'nutrition': '#27ae60',
            'exercise': '#3498db',
            'mental_health': '#9b59b6',
            'prevention': '#e67e22',
            'hygiene': '#1abc9c',
            'seasonal': '#f39c12',
        }
        color = category_colors.get(obj.category.lower() if obj.category else '', '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, obj.category or 'General'
        )
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        has_te = bool(obj.title_te and obj.content_te)
        has_hi = bool(obj.title_hi and obj.content_hi)
        
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ Both</span>')
        elif has_te or has_hi:
            return format_html('<span style="color: #f39c12;">Partial</span>')
        return format_html('<span style="color: #e74c3c;">EN only</span>')
    
    @admin.display(description='Scheduled')
    def scheduled_display(self, obj):
        if obj.show_date:
            today = timezone.now().date()
            if obj.show_date == today:
                return format_html('<span style="color: #27ae60; font-weight: bold;">📅 TODAY</span>')
            elif obj.show_date > today:
                return format_html('<span style="color: #3498db;">📆 {}</span>', obj.show_date.strftime('%m/%d'))
            return format_html('<span style="color: #bdc3c7;">{}</span>', obj.show_date.strftime('%m/%d'))
        return format_html('<span style="color: #f39c12;">Not scheduled</span>')
    
    @admin.display(description='Engagement')
    def engagement_display(self, obj):
        views = obj.view_count or 0
        likes = obj.like_count or 0
        if views > 0:
            rate = (likes / views) * 100
            return format_html(
                '<span title="{}% liked">👁️ {} | ❤️ {}</span>',
                f'{rate:.0f}', views, likes
            )
        return format_html('<span style="color: #bdc3c7;">No views</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.action(description='✅ Activate selected tips')
    def activate_tips(self, request, queryset):
        queryset.update(is_active=True)
    
    @admin.action(description='❌ Deactivate selected tips')
    def deactivate_tips(self, request, queryset):
        queryset.update(is_active=False)
    
    @admin.action(description='📅 Schedule for today')
    def schedule_for_today(self, request, queryset):
        today = timezone.now().date()
        count = queryset.update(show_date=today, is_active=True)
        self.message_user(request, f'{count} tips scheduled for today.')


@admin.register(QuickReply)
class QuickReplyAdmin(admin.ModelAdmin):
    """Admin for quick reply suggestions."""
    
    list_display = [
        'text_preview',
        'context_badge',
        'intent_display',
        'icon',
        'priority',
        'translation_status',
        'is_active',
    ]
    list_filter = ['context', 'triggers_intent', 'is_active']
    search_fields = ['text_en', 'text_te', 'text_hi']
    list_editable = ['priority', 'is_active']
    ordering = ['context', '-priority']
    list_per_page = 30
    
    fieldsets = (
        ('Content', {
            'fields': ('text_en', 'text_te', 'text_hi')
        }),
        ('Settings', {
            'fields': ('context', 'triggers_intent', 'icon', 'priority', 'is_active')
        }),
    )
    
    @admin.display(description='Text')
    def text_preview(self, obj):
        return obj.text_en[:30] + '...' if len(obj.text_en) > 30 else obj.text_en
    
    @admin.display(description='Context')
    def context_badge(self, obj):
        return format_html(
            '<span style="background-color: #7f8c8d; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            obj.context or 'general'
        )
    
    @admin.display(description='Triggers')
    def intent_display(self, obj):
        if obj.triggers_intent:
            return intent_badge(obj.triggers_intent)
        return '-'
    
    @admin.display(description='Priority')
    def priority_display(self, obj):
        bars = '●' * min(obj.priority, 5) + '○' * max(0, 5 - obj.priority)
        return format_html('<span style="color: #3498db;">{}</span>', bars)
    
    @admin.display(description='Langs')
    def translation_status(self, obj):
        has_te = bool(obj.text_te)
        has_hi = bool(obj.text_hi)
        status = []
        if has_te: status.append('TE')
        if has_hi: status.append('HI')
        if status:
            return format_html('<span style="color: #27ae60;">✓ {}</span>', ', '.join(status))
        return format_html('<span style="color: #e74c3c;">EN only</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">●</span>')
        return format_html('<span style="color: #e74c3c;">○</span>')


@admin.register(ConversationFeedback)
class ConversationFeedbackAdmin(admin.ModelAdmin):
    """Admin for conversation feedback analysis."""
    
    list_display = [
        'session_link',
        'user_display',
        'rating_stars',
        'helpfulness_display',
        'recommend_badge',
        'feedback_preview',
        'created_at',
    ]
    list_filter = ['overall_rating', 'would_recommend', 'helpfulness_rating', 'created_at']
    search_fields = ['feedback_text', 'session__id', 'session__user__phone']  # ✅ FIXED
    readonly_fields = ['session', 'created_at']
    ordering = ['-created_at']
    list_select_related = ['session', 'session__user']  # ✅ Performance
    list_per_page = 25
    date_hierarchy = 'created_at'
    actions = ['export_feedback_csv']
    
    @admin.display(description='Session')
    def session_link(self, obj):
        url = reverse('admin:chatbot_chatsession_change', args=[obj.session.pk])
        return format_html('<a href="{}"><code>{}</code></a>', url, str(obj.session.id)[:8])
    
    @admin.display(description='User')
    def user_display(self, obj):
        if obj.session.user:
            return obj.session.user.phone
        return 'Anonymous'
    
    @admin.display(description='Rating')
    def rating_stars(self, obj):
        filled = '⭐' * obj.overall_rating
        empty = '☆' * (5 - obj.overall_rating)
        color = '#27ae60' if obj.overall_rating >= 4 else '#f39c12' if obj.overall_rating >= 3 else '#e74c3c'
        return format_html('<span style="color: {};">{}{}</span>', color, filled, empty)
    
    @admin.display(description='Helpful')
    def helpfulness_display(self, obj):
        if obj.helpfulness_rating:
            color = '#27ae60' if obj.helpfulness_rating >= 4 else '#f39c12' if obj.helpfulness_rating >= 3 else '#e74c3c'
            return format_html('<span style="color: {};">{}/5</span>', color, obj.helpfulness_rating)
        return '-'
    
    @admin.display(description='Recommend')
    def recommend_badge(self, obj):
        if obj.would_recommend:
            return format_html('<span style="color: #27ae60;">👍 Yes</span>')
        elif obj.would_recommend is False:
            return format_html('<span style="color: #e74c3c;">👎 No</span>')
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.display(description='Feedback')
    def feedback_preview(self, obj):
        if obj.feedback_text:
            text = obj.feedback_text[:60] + '...' if len(obj.feedback_text) > 60 else obj.feedback_text
            return text
        return format_html('<span style="color: #bdc3c7;">No comment</span>')
    
    @admin.action(description='📥 Export Feedback CSV')
    def export_feedback_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="chatbot_feedback.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Session', 'User', 'Rating', 'Helpfulness', 'Recommend', 'Feedback', 'Created'])
        
        for fb in queryset.select_related('session', 'session__user'):
            writer.writerow([
                str(fb.session.id)[:8],
                fb.session.user.phone if fb.session.user else 'Anonymous',
                fb.overall_rating,
                fb.helpfulness_rating or '',
                fb.would_recommend,
                fb.feedback_text or '',
                fb.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response