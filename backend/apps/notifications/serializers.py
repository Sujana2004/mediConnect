"""
Notification Serializers
========================
Request/Response serializers for notification API endpoints.
"""

from rest_framework import serializers
from django.utils import timezone

from .models import (
    Notification,
    NotificationTemplate,
    UserNotificationPreference,
    DeviceToken,
    ScheduledNotification,
)
from .constants import (
    NotificationType,
    NotificationPriority,
    NotificationStatus,
    NotificationChannel,
    DEFAULT_NOTIFICATION_PREFERENCES,
    NON_DISABLEABLE_TYPES,
)


# =============================================================================
# DEVICE TOKEN SERIALIZERS
# =============================================================================

class RegisterDeviceTokenSerializer(serializers.Serializer):
    """Request serializer for registering FCM device token."""
    
    token = serializers.CharField(
        min_length=100,
        max_length=500,
        help_text="Firebase Cloud Messaging (FCM) token"
    )
    device_type = serializers.ChoiceField(
        choices=['android', 'ios', 'web'],
        default='web',
        help_text="Type of device"
    )
    device_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default='',
        help_text="User-friendly device name"
    )
    device_id = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default='',
        help_text="Unique device identifier"
    )
    
    def validate_token(self, value):
        """Validate FCM token format."""
        value = value.strip()
        if len(value) < 100:
            raise serializers.ValidationError(
                "Invalid FCM token format. Token too short."
            )
        return value


class DeviceTokenSerializer(serializers.ModelSerializer):
    """Serializer for device token details."""
    
    class Meta:
        model = DeviceToken
        fields = [
            'id',
            'device_type',
            'device_name',
            'device_id',
            'is_active',
            'last_used_at',
            'created_at',
        ]
        read_only_fields = fields


class UnregisterDeviceTokenSerializer(serializers.Serializer):
    """Request serializer for unregistering device token."""
    
    token = serializers.CharField(
        help_text="FCM token to unregister"
    )


# =============================================================================
# NOTIFICATION PREFERENCE SERIALIZERS
# =============================================================================

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences."""
    
    class Meta:
        model = UserNotificationPreference
        fields = [
            'notifications_enabled',
            'push_enabled',
            'quiet_hours_enabled',
            'quiet_hours_start',
            'quiet_hours_end',
            'type_preferences',
            'preferred_language',
            'updated_at',
        ]
        read_only_fields = ['updated_at']
    
    def validate_type_preferences(self, value):
        """Validate type preferences don't disable required notifications."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be a dictionary")
        
        # Ensure emergency types stay enabled
        for ntype in NON_DISABLEABLE_TYPES:
            if ntype in value and not value[ntype]:
                raise serializers.ValidationError(
                    f"Cannot disable {ntype} notifications"
                )
        
        return value


class UpdatePreferenceSerializer(serializers.Serializer):
    """Request serializer for updating a single preference."""
    
    notification_type = serializers.ChoiceField(
        choices=NotificationType.CHOICES,
        help_text="Type of notification to update"
    )
    enabled = serializers.BooleanField(
        help_text="Whether to enable or disable"
    )
    
    def validate(self, data):
        """Validate preference can be changed."""
        if data['notification_type'] in NON_DISABLEABLE_TYPES and not data['enabled']:
            raise serializers.ValidationError(
                f"Cannot disable {data['notification_type']} notifications"
            )
        return data


class QuietHoursSerializer(serializers.Serializer):
    """Request serializer for updating quiet hours."""
    
    enabled = serializers.BooleanField(
        help_text="Enable or disable quiet hours"
    )
    start_time = serializers.TimeField(
        required=False,
        help_text="Quiet hours start time (HH:MM)"
    )
    end_time = serializers.TimeField(
        required=False,
        help_text="Quiet hours end time (HH:MM)"
    )
    
    def validate(self, data):
        """Validate quiet hours times are provided when enabled."""
        if data.get('enabled'):
            if 'start_time' not in data or 'end_time' not in data:
                # Use defaults if not provided
                data.setdefault('start_time', '22:00')
                data.setdefault('end_time', '07:00')
        return data


# =============================================================================
# NOTIFICATION SERIALIZERS
# =============================================================================

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notification details."""
    
    is_read = serializers.BooleanField(read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'body',
            'priority',
            'status',
            'action_url',
            'data',
            'icon',
            'color',
            'image_url',
            'is_read',
            'time_ago',
            'read_at',
            'created_at',
        ]
        read_only_fields = fields
    
    def get_time_ago(self, obj) -> str:
        """Get human-readable time ago string."""
        now = timezone.now()
        diff = now - obj.created_at
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes}m ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours}h ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%d %b")


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification list."""
    
    is_read = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'body',
            'icon',
            'color',
            'is_read',
            'created_at',
        ]
        read_only_fields = fields


class MarkReadSerializer(serializers.Serializer):
    """Request serializer for marking notifications as read."""
    
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of notification IDs to mark as read. If empty, marks all as read."
    )


class SendNotificationSerializer(serializers.Serializer):
    """Request serializer for sending a notification (admin use)."""
    
    user_id = serializers.UUIDField(
        required=False,
        help_text="User ID to send to. If not provided, sends to all users."
    )
    notification_type = serializers.ChoiceField(
        choices=NotificationType.CHOICES,
        default=NotificationType.GENERAL
    )
    title = serializers.CharField(max_length=100)
    body = serializers.CharField(max_length=500)
    priority = serializers.ChoiceField(
        choices=NotificationPriority.CHOICES,
        default=NotificationPriority.NORMAL
    )
    action_url = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True
    )
    data = serializers.DictField(
        required=False,
        default=dict
    )


class SendTemplateNotificationSerializer(serializers.Serializer):
    """Request serializer for sending notification from template."""
    
    user_id = serializers.UUIDField(
        help_text="User ID to send to"
    )
    template_name = serializers.CharField(
        max_length=100,
        help_text="Template name to use"
    )
    context = serializers.DictField(
        required=False,
        default=dict,
        help_text="Variables to substitute in template"
    )
    data = serializers.DictField(
        required=False,
        default=dict,
        help_text="Additional data payload"
    )


# =============================================================================
# NOTIFICATION TEMPLATE SERIALIZERS
# =============================================================================

class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates."""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'notification_type',
            'title_en',
            'title_te',
            'title_hi',
            'body_en',
            'body_te',
            'body_hi',
            'priority',
            'action_url',
            'icon',
            'color',
            'image_url',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template list."""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'notification_type',
            'title_en',
            'priority',
            'is_active',
        ]


# =============================================================================
# SCHEDULED NOTIFICATION SERIALIZERS
# =============================================================================

class ScheduledNotificationSerializer(serializers.ModelSerializer):
    """Serializer for scheduled notifications."""
    
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = ScheduledNotification
        fields = [
            'id',
            'template',
            'template_name',
            'frequency',
            'scheduled_time',
            'days_of_week',
            'day_of_month',
            'start_date',
            'end_date',
            'custom_data',
            'related_object_type',
            'related_object_id',
            'is_active',
            'last_sent_at',
            'next_send_at',
            'total_sent',
            'created_at',
        ]
        read_only_fields = [
            'id', 'last_sent_at', 'next_send_at', 'total_sent', 'created_at'
        ]


class CreateScheduledNotificationSerializer(serializers.Serializer):
    """Request serializer for creating scheduled notification."""
    
    template_name = serializers.CharField(
        max_length=100,
        help_text="Name of the template to use"
    )
    frequency = serializers.ChoiceField(
        choices=['once', 'daily', 'weekly', 'monthly'],
        default='daily'
    )
    scheduled_time = serializers.TimeField(
        help_text="Time of day to send (HH:MM)"
    )
    days_of_week = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False,
        default=list,
        help_text="Days of week for weekly frequency (0=Monday, 6=Sunday)"
    )
    day_of_month = serializers.IntegerField(
        min_value=1,
        max_value=31,
        required=False,
        help_text="Day of month for monthly frequency"
    )
    start_date = serializers.DateField(
        required=False,
        help_text="Start date (defaults to today)"
    )
    end_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="End date (null = forever)"
    )
    custom_data = serializers.DictField(
        required=False,
        default=dict
    )
    related_object_type = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True
    )
    related_object_id = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True
    )
    
    def validate(self, data):
        """Validate schedule settings."""
        frequency = data.get('frequency')
        
        if frequency == 'weekly':
            if not data.get('days_of_week'):
                raise serializers.ValidationError(
                    "days_of_week is required for weekly frequency"
                )
        
        if frequency == 'monthly':
            if not data.get('day_of_month'):
                raise serializers.ValidationError(
                    "day_of_month is required for monthly frequency"
                )
        
        return data


# =============================================================================
# STATISTICS SERIALIZERS
# =============================================================================

class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics."""
    
    total_notifications = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    read_count = serializers.IntegerField()
    notifications_today = serializers.IntegerField()
    notifications_this_week = serializers.IntegerField()
    by_type = serializers.DictField()


# =============================================================================
# HEALTH CHECK SERIALIZER
# =============================================================================

class NotificationHealthSerializer(serializers.Serializer):
    """Serializer for notification system health check."""
    
    status = serializers.CharField()
    fcm_configured = serializers.BooleanField()
    database_connected = serializers.BooleanField()
    active_device_tokens = serializers.IntegerField()
    pending_notifications = serializers.IntegerField()
    timestamp = serializers.DateTimeField()