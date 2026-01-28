"""
Notification Admin Configuration
================================
Django admin configuration for notification models.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from .models import (
    Notification,
    NotificationTemplate,
    UserNotificationPreference,
    DeviceToken,
    ScheduledNotification,
    NotificationLog,
)


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Admin for notification templates."""
    
    list_display = [
        'name',
        'notification_type',
        'priority',
        'is_active',
        'created_at',
    ]
    list_filter = ['notification_type', 'priority', 'is_active']
    search_fields = ['name', 'title_en', 'body_en']
    list_editable = ['is_active']
    ordering = ['notification_type', 'name']
    
    fieldsets = (
        ('Template Info', {
            'fields': ('name', 'notification_type', 'priority', 'is_active')
        }),
        ('English Content', {
            'fields': ('title_en', 'body_en')
        }),
        ('Telugu Content', {
            'fields': ('title_te', 'body_te'),
            'classes': ('collapse',)
        }),
        ('Hindi Content', {
            'fields': ('title_hi', 'body_hi'),
            'classes': ('collapse',)
        }),
        ('Action & Display', {
            'fields': ('action_url', 'icon', 'color', 'image_url')
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin for notifications."""
    
    list_display = [
        'id_short',
        'user_display',
        'notification_type',
        'title_short',
        'priority_badge',
        'status_badge',
        'is_read',
        'created_at',
    ]
    list_filter = ['notification_type', 'priority', 'status', 'created_at']
    search_fields = ['user__phone_number', 'title', 'body']
    readonly_fields = [
        'id', 'user', 'created_at', 'sent_at', 
        'delivered_at', 'read_at', 'error_message'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_display(self, obj):
        return obj.user.phone_number
    user_display.short_description = 'User'
    
    def title_short(self, obj):
        return obj.title[:40] + '...' if len(obj.title) > 40 else obj.title
    title_short.short_description = 'Title'
    
    def priority_badge(self, obj):
        colors = {
            'low': '#607D8B',
            'normal': '#4CAF50',
            'high': '#FF9800',
            'urgent': '#F44336',
        }
        color = colors.get(obj.priority, '#607D8B')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color, obj.priority.upper()
        )
    priority_badge.short_description = 'Priority'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#9E9E9E',
            'sent': '#2196F3',
            'delivered': '#4CAF50',
            'read': '#8BC34A',
            'failed': '#F44336',
            'cancelled': '#607D8B',
        }
        color = colors.get(obj.status, '#9E9E9E')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    def is_read(self, obj):
        return obj.read_at is not None
    is_read.boolean = True
    is_read.short_description = 'Read'


@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin for user notification preferences."""
    
    list_display = [
        'user_display',
        'notifications_enabled',
        'push_enabled',
        'quiet_hours_enabled',
        'preferred_language',
        'updated_at',
    ]
    list_filter = ['notifications_enabled', 'push_enabled', 'preferred_language']
    search_fields = ['user__phone_number']
    readonly_fields = ['user', 'created_at', 'updated_at']
    
    def user_display(self, obj):
        return obj.user.phone_number
    user_display.short_description = 'User'


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    """Admin for device tokens."""
    
    list_display = [
        'id_short',
        'user_display',
        'device_type',
        'device_name',
        'is_active',
        'last_used_at',
        'created_at',
    ]
    list_filter = ['device_type', 'is_active', 'created_at']
    search_fields = ['user__phone_number', 'device_name', 'device_id']
    readonly_fields = ['token', 'created_at', 'last_used_at']
    ordering = ['-created_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_display(self, obj):
        return obj.user.phone_number
    user_display.short_description = 'User'
    
    actions = ['deactivate_tokens', 'activate_tokens']
    
    @admin.action(description='Deactivate selected tokens')
    def deactivate_tokens(self, request, queryset):
        queryset.update(is_active=False)
    
    @admin.action(description='Activate selected tokens')
    def activate_tokens(self, request, queryset):
        queryset.update(is_active=True)


@admin.register(ScheduledNotification)
class ScheduledNotificationAdmin(admin.ModelAdmin):
    """Admin for scheduled notifications."""
    
    list_display = [
        'id_short',
        'user_display',
        'template_name',
        'frequency',
        'scheduled_time',
        'is_active',
        'next_send_at',
        'total_sent',
    ]
    list_filter = ['frequency', 'is_active', 'created_at']
    search_fields = ['user__phone_number', 'template__name']
    readonly_fields = ['last_sent_at', 'next_send_at', 'total_sent', 'created_at']
    ordering = ['scheduled_time']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_display(self, obj):
        return obj.user.phone_number
    user_display.short_description = 'User'
    
    def template_name(self, obj):
        return obj.template.name
    template_name.short_description = 'Template'


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """Admin for notification logs."""
    
    list_display = [
        'id_short',
        'notification_short',
        'channel',
        'success_badge',
        'error_code',
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
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def notification_short(self, obj):
        return str(obj.notification.id)[:8]
    notification_short.short_description = 'Notification'
    
    def success_badge(self, obj):
        if obj.success:
            return format_html(
                '<span style="color: #4CAF50;">✓ Success</span>'
            )
        else:
            return format_html(
                '<span style="color: #F44336;">✗ Failed</span>'
            )
    success_badge.short_description = 'Result'