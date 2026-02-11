"""
Notification Admin Configuration (Enhanced)
============================================
Django admin configuration for notification models with visual indicators,
performance optimization, and delivery analytics.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.urls import reverse
from django.http import HttpResponse
import csv
from datetime import timedelta

from .models import (
    Notification,
    NotificationTemplate,
    UserNotificationPreference,
    DeviceToken,
    ScheduledNotification,
    NotificationLog,
)


# ============================================
# HELPER FUNCTIONS
# ============================================

def priority_badge(priority):
    """Generate colored badge for priority."""
    colors = {
        'low': '#607D8B',
        'normal': '#27ae60',
        'high': '#f39c12',
        'urgent': '#e74c3c',
        'critical': '#8e44ad',
    }
    icons = {
        'low': '↓',
        'normal': '•',
        'high': '↑',
        'urgent': '⚠️',
        'critical': '🚨',
    }
    color = colors.get(priority, '#607D8B')
    icon = icons.get(priority, '•')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, priority.upper()
    )


def status_badge(status):
    """Generate colored badge for notification status."""
    colors = {
        'pending': '#95a5a6',
        'queued': '#3498db',
        'sent': '#2196F3',
        'delivered': '#27ae60',
        'read': '#1abc9c',
        'failed': '#e74c3c',
        'cancelled': '#7f8c8d',
    }
    icons = {
        'pending': '⏳',
        'queued': '📤',
        'sent': '✈️',
        'delivered': '✓',
        'read': '👁️',
        'failed': '✗',
        'cancelled': '🚫',
    }
    color = colors.get(status, '#95a5a6')
    icon = icons.get(status, '•')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, status.upper()
    )


def time_ago(dt):
    """Human-readable time difference."""
    if not dt:
        return '-'
    
    now = timezone.now()
    diff = now - dt
    
    if diff.days > 0:
        return f'{diff.days}d ago'
    elif diff.seconds > 3600:
        return f'{diff.seconds // 3600}h ago'
    elif diff.seconds > 60:
        return f'{diff.seconds // 60}m ago'
    return 'Just now'


def time_until(dt):
    """Human-readable time until."""
    if not dt:
        return '-'
    
    now = timezone.now()
    if dt < now:
        return 'Overdue'
    
    diff = dt - now
    
    if diff.days > 0:
        return f'In {diff.days}d'
    elif diff.seconds > 3600:
        return f'In {diff.seconds // 3600}h'
    elif diff.seconds > 60:
        return f'In {diff.seconds // 60}m'
    return 'Soon'


# ============================================
# CUSTOM FILTERS
# ============================================

class DeliveryStatusFilter(admin.SimpleListFilter):
    """Filter by delivery status."""
    title = 'Delivery Status'
    parameter_name = 'delivery'
    
    def lookups(self, request, model_admin):
        return (
            ('pending', '⏳ Pending'),
            ('delivered', '✅ Delivered'),
            ('failed', '❌ Failed'),
            ('unread', '📬 Unread'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'pending':
            return queryset.filter(status='pending')
        if self.value() == 'delivered':
            return queryset.filter(status__in=['delivered', 'read'])
        if self.value() == 'failed':
            return queryset.filter(status='failed')
        if self.value() == 'unread':
            return queryset.filter(read_at__isnull=True).exclude(status='failed')


class NotificationTypeFilter(admin.SimpleListFilter):
    """Filter by notification type with icons."""
    title = 'Type'
    parameter_name = 'type'
    
    def lookups(self, request, model_admin):
        return (
            ('appointment_reminder', '📅 Appointment Reminder'),
            ('appointment_confirmed', '✅ Appointment Confirmed'),
            ('medicine_reminder', '💊 Medicine Reminder'),
            ('consultation_starting', '📞 Consultation Starting'),
            ('sos_alert', '🚨 SOS Alert'),
            ('health_tip', '💡 Health Tip'),
            ('lab_report_ready', '🔬 Lab Report'),
            ('prescription_ready', '📋 Prescription'),
        )
    
    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(notification_type=self.value())


class ScheduleStatusFilter(admin.SimpleListFilter):
    """Filter scheduled notifications by status."""
    title = 'Schedule Status'
    parameter_name = 'schedule_status'
    
    def lookups(self, request, model_admin):
        return (
            ('upcoming', '⏰ Upcoming (next 1 hour)'),
            ('today', '📅 Today'),
            ('overdue', '⚠️ Overdue'),
            ('inactive', '⏸️ Inactive'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'upcoming':
            return queryset.filter(
                is_active=True,
                next_send_at__gte=now,
                next_send_at__lte=now + timedelta(hours=1)
            )
        if self.value() == 'today':
            return queryset.filter(
                is_active=True,
                next_send_at__date=now.date()
            )
        if self.value() == 'overdue':
            return queryset.filter(
                is_active=True,
                next_send_at__lt=now
            )
        if self.value() == 'inactive':
            return queryset.filter(is_active=False)


# ============================================
# INLINE ADMINS
# ============================================

class NotificationLogInline(admin.TabularInline):
    """Inline view of notification logs."""
    model = NotificationLog
    extra = 0
    readonly_fields = ['channel', 'success_badge_inline', 'error_code', 'error_message', 'created_at']
    fields = ['channel', 'success_badge_inline', 'error_code', 'error_message', 'created_at']
    max_num = 5
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def success_badge_inline(self, obj):
        if obj.success:
            return format_html('<span style="color: #27ae60;">✓ Success</span>')
        return format_html('<span style="color: #e74c3c;">✗ Failed</span>')
    success_badge_inline.short_description = 'Result'


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Admin for notification templates with translation tracking."""
    
    list_display = [
        'name',
        'type_badge',
        'priority_display',
        'translation_status',
        'is_active',
        'usage_count',
        'created_at',
    ]
    list_filter = ['notification_type', 'priority', 'is_active']
    search_fields = ['name', 'title_en', 'body_en']
    list_editable = ['is_active']
    ordering = ['notification_type', 'name']
    list_per_page = 25
    actions = ['activate_templates', 'deactivate_templates', 'duplicate_template']
    
    fieldsets = (
        ('Template Info', {
            'fields': ('name', 'notification_type', 'priority', 'is_active'),
            'description': 'Basic template configuration'
        }),
        ('English Content', {
            'fields': ('title_en', 'body_en'),
            'description': 'Use {variable} for dynamic content. E.g., {patient_name}, {doctor_name}, {appointment_time}'
        }),
        ('Telugu Content (తెలుగు)', {
            'fields': ('title_te', 'body_te'),
            'classes': ('collapse',)
        }),
        ('Hindi Content (हिंदी)', {
            'fields': ('title_hi', 'body_hi'),
            'classes': ('collapse',)
        }),
        ('Action & Display', {
            'fields': ('action_url', 'icon', 'color', 'image_url'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _usage_count=Count('notifications')
        )
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        type_icons = {
            'appointment_reminder': '📅',
            'appointment_confirmed': '✅',
            'medicine_reminder': '💊',
            'consultation_starting': '📞',
            'sos_alert': '🚨',
            'health_tip': '💡',
            'lab_report_ready': '🔬',
            'prescription_ready': '📋',
        }
        icon = type_icons.get(obj.notification_type, '📧')
        return format_html(
            '<span title="{}">{} {}</span>',
            obj.notification_type,
            icon,
            obj.notification_type.replace('_', ' ').title()[:20]
        )
    
    @admin.display(description='Priority')
    def priority_display(self, obj):
        return priority_badge(obj.priority)
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        has_te = bool(obj.title_te and obj.body_te)
        has_hi = bool(obj.title_hi and obj.body_hi)
        
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ TE ✓ HI</span>')
        elif has_te:
            return format_html('<span style="color: #f39c12;">✓ TE ✗ HI</span>')
        elif has_hi:
            return format_html('<span style="color: #f39c12;">✗ TE ✓ HI</span>')
        return format_html('<span style="color: #e74c3c;">EN only</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.display(description='Used')
    def usage_count(self, obj):
        count = getattr(obj, '_usage_count', 0)
        return format_html('<strong>{}</strong> times', count)
    
    @admin.action(description='✅ Activate selected templates')
    def activate_templates(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} templates activated.')
    
    @admin.action(description='❌ Deactivate selected templates')
    def deactivate_templates(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} templates deactivated.')
    
    @admin.action(description='📋 Duplicate selected template')
    def duplicate_template(self, request, queryset):
        for template in queryset:
            template.pk = None
            template.name = f'{template.name} (Copy)'
            template.save()
        self.message_user(request, f'{queryset.count()} templates duplicated.')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin for notifications with delivery tracking."""
    
    list_display = [
        'id_short',
        'user_link',
        'type_icon',
        'title_short',
        'priority_display',
        'status_display',
        'read_badge',
        'time_display',
    ]
    list_filter = [DeliveryStatusFilter, NotificationTypeFilter, 'priority', 'created_at']
    search_fields = ['user__phone', 'title', 'body']  # ✅ FIXED: was phone_number
    readonly_fields = [
        'id', 'user', 'created_at', 'sent_at', 
        'delivered_at', 'read_at', 'error_message'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    list_select_related = ['user', 'template']  # ✅ Performance
    list_per_page = 30
    inlines = [NotificationLogInline]
    actions = ['mark_as_read', 'resend_notifications', 'export_notifications_csv']
    
    fieldsets = (
        ('Notification Info', {
            'fields': ('id', 'user', 'notification_type', 'template')
        }),
        ('Content', {
            'fields': ('title', 'body', 'data')
        }),
        ('Priority & Status', {
            'fields': ('priority', 'status', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'sent_at', 'delivered_at', 'read_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='ID')
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
        return '-'
    
    @admin.display(description='Type')
    def type_icon(self, obj):
        type_icons = {
            'appointment_reminder': ('📅', '#3498db'),
            'appointment_confirmed': ('✅', '#27ae60'),
            'medicine_reminder': ('💊', '#9b59b6'),
            'consultation_starting': ('📞', '#e67e22'),
            'sos_alert': ('🚨', '#e74c3c'),
            'health_tip': ('💡', '#f1c40f'),
            'lab_report_ready': ('🔬', '#1abc9c'),
            'prescription_ready': ('📋', '#2ecc71'),
        }
        icon, color = type_icons.get(obj.notification_type, ('📧', '#7f8c8d'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 12px;" title="{}">{}</span>',
            color, obj.notification_type, icon
        )
    
    @admin.display(description='Title')
    def title_short(self, obj):
        title = obj.title[:35] + '...' if len(obj.title) > 35 else obj.title
        return title
    
    @admin.display(description='Priority')
    def priority_display(self, obj):
        return priority_badge(obj.priority)
    
    @admin.display(description='Status')
    def status_display(self, obj):
        return status_badge(obj.status)
    
    @admin.display(description='Read')
    def read_badge(self, obj):
        if obj.read_at:
            return format_html(
                '<span style="color: #27ae60;" title="Read {}">👁️ Read</span>',
                obj.read_at.strftime('%m/%d %H:%M')
            )
        return format_html('<span style="color: #bdc3c7;">Unread</span>')
    
    @admin.display(description='Time')
    def time_display(self, obj):
        return time_ago(obj.created_at)
    
    @admin.action(description='👁️ Mark as read')
    def mark_as_read(self, request, queryset):
        count = queryset.filter(read_at__isnull=True).update(
            read_at=timezone.now(),
            status='read'
        )
        self.message_user(request, f'{count} notifications marked as read.')
    
    @admin.action(description='🔄 Resend failed notifications')
    def resend_notifications(self, request, queryset):
        failed = queryset.filter(status='failed')
        count = failed.update(status='pending', error_message='')
        self.message_user(request, f'{count} notifications queued for resend.')
    
    @admin.action(description='📥 Export to CSV')
    def export_notifications_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="notifications.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'User', 'Type', 'Title', 'Priority', 'Status', 'Created', 'Read'])
        
        for notif in queryset.select_related('user'):
            writer.writerow([
                str(notif.id)[:8],
                notif.user.phone if notif.user else '-',
                notif.notification_type,
                notif.title,
                notif.priority,
                notif.status,
                notif.created_at.strftime('%Y-%m-%d %H:%M'),
                notif.read_at.strftime('%Y-%m-%d %H:%M') if notif.read_at else '-'
            ])
        
        return response


@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin for user notification preferences."""
    
    list_display = [
        'user_link',
        'notifications_badge',
        'push_badge',
        'quiet_hours_display',
        'language_badge',
        'preference_summary',
        'updated_at',
    ]
    list_filter = ['notifications_enabled', 'push_enabled', 'quiet_hours_enabled', 'preferred_language']
    search_fields = ['user__phone']  # ✅ FIXED
    readonly_fields = ['user', 'created_at', 'updated_at']
    list_select_related = ['user']  # ✅ Performance
    list_per_page = 30
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Main Settings', {
            'fields': ('notifications_enabled', 'push_enabled', 'preferred_language')
        }),
        ('Quiet Hours', {
            'fields': ('quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end'),
            'description': 'No notifications during quiet hours'
        }),
        ('Notification Types', {
            'fields': ('type_preferences',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Notifications')
    def notifications_badge(self, obj):
        if obj.notifications_enabled:
            return format_html('<span style="color: #27ae60;">🔔 ON</span>')
        return format_html('<span style="color: #e74c3c;">🔕 OFF</span>')
    
    @admin.display(description='Push')
    def push_badge(self, obj):
        if obj.push_enabled:
            return format_html('<span style="color: #27ae60;">📱 ON</span>')
        return format_html('<span style="color: #e74c3c;">📵 OFF</span>')
    
    @admin.display(description='Quiet Hours')
    def quiet_hours_display(self, obj):
        if obj.quiet_hours_enabled:
            start = obj.quiet_hours_start.strftime('%H:%M') if obj.quiet_start_time else '22:00'
            end = obj.quiet_hours_end.strftime('%H:%M') if obj.quiet_end_time else '07:00'
            return format_html(
                '<span style="color: #9b59b6;">🌙 {} - {}</span>',
                start, end
            )
        return format_html('<span style="color: #bdc3c7;">Not set</span>')
    
    @admin.display(description='Language')
    def language_badge(self, obj):
        lang_map = {
            'en': ('🇺🇸 EN', '#3498db'),
            'hi': ('🇮🇳 HI', '#f39c12'),
            'te': ('🇮🇳 TE', '#27ae60'),
        }
        text, color = lang_map.get(obj.preferred_language, (obj.preferred_language, '#7f8c8d'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, text
        )
    
    @admin.display(description='Types Enabled')
    def preference_summary(self, obj):
        if hasattr(obj, 'enabled_types') and obj.enabled_types:
            count = len(obj.enabled_types) if isinstance(obj.enabled_types, list) else 0
            return f'{count} types'
        return 'All'


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    """Admin for device tokens (FCM)."""
    
    list_display = [
        'id_short',
        'user_link',
        'device_type_badge',
        'device_name',
        'active_badge',
        'last_used_display',
        'created_at',
    ]
    list_filter = ['device_type', 'is_active', 'created_at']
    search_fields = ['user__phone', 'device_name', 'device_id']  # ✅ FIXED
    readonly_fields = ['token', 'created_at', 'last_used_at']
    ordering = ['-last_used_at']
    list_select_related = ['user']  # ✅ Performance
    list_per_page = 30
    
    actions = ['deactivate_tokens', 'activate_tokens', 'delete_inactive_tokens']
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html('<code>{}</code>', str(obj.id)[:8])
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Device')
    def device_type_badge(self, obj):
        type_map = {
            'android': ('🤖', '#27ae60'),
            'ios': ('🍎', '#7f8c8d'),
            'web': ('🌐', '#3498db'),
        }
        icon, color = type_map.get(obj.device_type.lower() if obj.device_type else '', ('📱', '#95a5a6'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 11px;">{} {}</span>',
            color, icon, obj.device_type.upper() if obj.device_type else 'Unknown'
        )
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.display(description='Last Used')
    def last_used_display(self, obj):
        if obj.last_used_at:
            ago = time_ago(obj.last_used_at)
            # Highlight stale tokens
            days_old = (timezone.now() - obj.last_used_at).days
            if days_old > 30:
                return format_html('<span style="color: #e74c3c;">{}</span>', ago)
            elif days_old > 7:
                return format_html('<span style="color: #f39c12;">{}</span>', ago)
            return format_html('<span style="color: #27ae60;">{}</span>', ago)
        return '-'
    
    @admin.action(description='❌ Deactivate selected tokens')
    def deactivate_tokens(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} tokens deactivated.')
    
    @admin.action(description='✅ Activate selected tokens')
    def activate_tokens(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} tokens activated.')
    
    @admin.action(description='🗑️ Delete inactive tokens older than 30 days')
    def delete_inactive_tokens(self, request, queryset):
        cutoff = timezone.now() - timedelta(days=30)
        deleted, _ = queryset.filter(
            is_active=False,
            last_used_at__lt=cutoff
        ).delete()
        self.message_user(request, f'{deleted} old inactive tokens deleted.')


@admin.register(ScheduledNotification)
class ScheduledNotificationAdmin(admin.ModelAdmin):
    """Admin for scheduled notifications with countdown."""
    
    list_display = [
        'id_short',
        'user_link',
        'template_display',
        'frequency_badge',
        'scheduled_time_display',
        'next_send_display',
        'active_badge',
        'stats_display',
    ]
    list_filter = [ScheduleStatusFilter, 'frequency', 'is_active', 'created_at']
    search_fields = ['user__phone', 'template__name']  # ✅ FIXED
    readonly_fields = ['last_sent_at', 'next_send_at', 'total_sent', 'created_at']
    ordering = ['next_send_at']
    list_select_related = ['user', 'template']  # ✅ Performance
    list_per_page = 30
    actions = ['activate_schedules', 'deactivate_schedules', 'send_now']
    
    fieldsets = (
        ('Schedule Info', {
            'fields': ('user', 'template', 'frequency', 'scheduled_time', 'is_active')
        }),
        ('Schedule Status', {
            'fields': ('last_sent_at', 'next_send_at', 'total_sent'),
            'classes': ('collapse',)
        }),
        ('Custom Data', {
            'fields': ('custom_data',),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html('<code>{}</code>', str(obj.id)[:8])
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Template')
    def template_display(self, obj):
        if obj.template:
            url = reverse('admin:notifications_notificationtemplate_change', args=[obj.template.pk])
            return format_html('<a href="{}">{}</a>', url, obj.template.name[:25])
        return '-'
    
    @admin.display(description='Frequency')
    def frequency_badge(self, obj):
        freq_colors = {
            'once': '#7f8c8d',
            'daily': '#27ae60',
            'weekly': '#3498db',
            'monthly': '#9b59b6',
        }
        color = freq_colors.get(obj.frequency, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, obj.frequency.upper()
        )
    
    @admin.display(description='Time')
    def scheduled_time_display(self, obj):
        if obj.scheduled_time:
            return obj.scheduled_time.strftime('%H:%M')
        return '-'
    
    @admin.display(description='Next Send')
    def next_send_display(self, obj):
        if not obj.is_active:
            return format_html('<span style="color: #bdc3c7;">Paused</span>')
        
        if obj.next_send_at:
            countdown = time_until(obj.next_send_at)
            if countdown == 'Overdue':
                return format_html('<span style="color: #e74c3c;">⚠️ Overdue</span>')
            elif 'Soon' in countdown or 'In 0' in countdown:
                return format_html('<span style="color: #27ae60; font-weight: bold;">🔔 {}</span>', countdown)
            return format_html('<span style="color: #3498db;">{}</span>', countdown)
        return '-'
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Paused</span>')
    
    @admin.display(description='Stats')
    def stats_display(self, obj):
        return format_html(
            '<span title="Total sent">📤 {}</span>',
            obj.total_sent or 0
        )
    
    @admin.action(description='▶️ Activate selected schedules')
    def activate_schedules(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} schedules activated.')
    
    @admin.action(description='⏸️ Deactivate selected schedules')
    def deactivate_schedules(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} schedules paused.')
    
    @admin.action(description='📤 Send now (one time)')
    def send_now(self, request, queryset):
        # This would trigger sending - you'd need to implement the actual send logic
        count = queryset.filter(is_active=True).count()
        self.message_user(request, f'{count} notifications queued for immediate send.')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """Admin for notification delivery logs."""
    
    list_display = [
        'id_short',
        'notification_link',
        'channel_badge',
        'success_badge',
        'error_display',
        'fcm_id_short',
        'created_at',
    ]
    list_filter = ['channel', 'success', 'created_at']
    search_fields = ['notification__id', 'error_message', 'fcm_message_id']
    readonly_fields = [
        'notification', 'channel', 'device_token', 'success',
        'error_code', 'error_message', 'fcm_message_id', 'created_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    list_select_related = ['notification', 'notification__user']  # ✅ Performance
    list_per_page = 50
    actions = ['export_failed_logs']
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html('<code>{}</code>', str(obj.id)[:6])
    
    @admin.display(description='Notification')
    def notification_link(self, obj):
        if obj.notification:
            url = reverse('admin:notifications_notification_change', args=[obj.notification.pk])
            user = obj.notification.user.phone if obj.notification.user else 'Anon'
            return format_html('<a href="{}">{}</a>', url, user[:12])
        return '-'
    
    @admin.display(description='Channel')
    def channel_badge(self, obj):
        channel_map = {
            'fcm': ('🔔 FCM', '#f39c12'),
            'push': ('📱 Push', '#3498db'),
            'sms': ('💬 SMS', '#27ae60'),
            'email': ('📧 Email', '#9b59b6'),
        }
        text, color = channel_map.get(obj.channel.lower() if obj.channel else '', (obj.channel, '#7f8c8d'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, text
        )
    
    @admin.display(description='Result')
    def success_badge(self, obj):
        if obj.success:
            return format_html('<span style="color: #27ae60; font-weight: bold;">✓ Delivered</span>')
        return format_html('<span style="color: #e74c3c; font-weight: bold;">✗ Failed</span>')
    
    @admin.display(description='Error')
    def error_display(self, obj):
        if obj.error_code:
            return format_html(
                '<span style="color: #e74c3c;" title="{}">{}</span>',
                obj.error_message or '',
                obj.error_code
            )
        return '-'
    
    @admin.display(description='FCM ID')
    def fcm_id_short(self, obj):
        if obj.fcm_message_id:
            return format_html('<code>{}</code>', obj.fcm_message_id[:12] + '...')
        return '-'
    
    @admin.action(description='📥 Export failed logs')
    def export_failed_logs(self, request, queryset):
        failed = queryset.filter(success=False)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="failed_notifications.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Notification ID', 'Channel', 'Error Code', 'Error Message', 'Created'])
        
        for log in failed:
            writer.writerow([
                str(log.notification.id)[:8] if log.notification else '-',
                log.channel,
                log.error_code or '',
                log.error_message or '',
                log.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        self.message_user(request, f'Exported {failed.count()} failed logs.')
        return response