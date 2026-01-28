"""
Notification Models
===================
Database models for the notifications system.
Supports FCM push notifications and in-app notifications.
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

from .constants import (
    NotificationType,
    NotificationPriority,
    NotificationStatus,
    NotificationChannel,
    DEFAULT_NOTIFICATION_PREFERENCES,
    NON_DISABLEABLE_TYPES,
    NOTIFICATION_ICONS,
    NOTIFICATION_COLORS,
)


class NotificationTemplate(models.Model):
    """
    Reusable notification templates with multi-language support.
    Used to create consistent notifications across the app.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Template identification
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique template name (e.g., 'appointment_reminder_1hr')"
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.CHOICES,
        db_index=True
    )
    
    # Title in all languages (supports placeholders like {doctor_name})
    title_en = models.CharField(max_length=100)
    title_te = models.CharField(max_length=100, blank=True)
    title_hi = models.CharField(max_length=100, blank=True)
    
    # Body in all languages (supports placeholders)
    body_en = models.TextField(max_length=500)
    body_te = models.TextField(max_length=500, blank=True)
    body_hi = models.TextField(max_length=500, blank=True)
    
    # Default priority for this template
    priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.CHOICES,
        default=NotificationPriority.NORMAL
    )
    
    # Action when notification is tapped
    action_url = models.CharField(
        max_length=255,
        blank=True,
        help_text="Deep link or URL to open (e.g., '/appointments/{id}')"
    )
    
    # Visual customization
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon name for the notification"
    )
    color = models.CharField(
        max_length=20,
        blank=True,
        help_text="Color code (e.g., '#4CAF50')"
    )
    image_url = models.URLField(
        blank=True,
        help_text="Optional image to show in notification"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
        ordering = ['notification_type', 'name']
        indexes = [
            models.Index(fields=['notification_type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.notification_type}: {self.name}"
    
    def get_title(self, language: str = 'en') -> str:
        """Get title in specified language with fallback to English."""
        titles = {
            'en': self.title_en,
            'te': self.title_te or self.title_en,
            'hi': self.title_hi or self.title_en,
        }
        return titles.get(language, self.title_en)
    
    def get_body(self, language: str = 'en') -> str:
        """Get body in specified language with fallback to English."""
        bodies = {
            'en': self.body_en,
            'te': self.body_te or self.body_en,
            'hi': self.body_hi or self.body_en,
        }
        return bodies.get(language, self.body_en)
    
    def get_icon(self) -> str:
        """Get icon, falling back to default for notification type."""
        return self.icon or NOTIFICATION_ICONS.get(
            self.notification_type, 
            'bell'
        )
    
    def get_color(self) -> str:
        """Get color, falling back to default for notification type."""
        return self.color or NOTIFICATION_COLORS.get(
            self.notification_type,
            '#607D8B'
        )


class UserNotificationPreference(models.Model):
    """
    User preferences for receiving notifications.
    Controls which notification types the user wants to receive.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Master switch for all notifications
    notifications_enabled = models.BooleanField(
        default=True,
        help_text="Master switch to enable/disable all notifications"
    )
    
    # Push notification settings
    push_enabled = models.BooleanField(
        default=True,
        help_text="Enable push notifications"
    )
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(
        default=False,
        help_text="Enable quiet hours (no non-urgent notifications)"
    )
    quiet_hours_start = models.TimeField(
        default='22:00',
        help_text="Quiet hours start time"
    )
    quiet_hours_end = models.TimeField(
        default='07:00',
        help_text="Quiet hours end time"
    )
    
    # Per-type preferences (stored as JSON)
    # Format: {"appointment_reminder": true, "health_tip": false, ...}
    type_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Per-type notification preferences"
    )
    
    # Preferred language for notifications
    preferred_language = models.CharField(
        max_length=5,
        default='en',
        choices=[('en', 'English'), ('te', 'Telugu'), ('hi', 'Hindi')]
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_user_preferences'
    
    def __str__(self):
        return f"Preferences for {self.user}"
    
    def save(self, *args, **kwargs):
        """Ensure default preferences are set."""
        if not self.type_preferences:
            self.type_preferences = DEFAULT_NOTIFICATION_PREFERENCES.copy()
        super().save(*args, **kwargs)
    
    def is_type_enabled(self, notification_type: str) -> bool:
        """Check if a specific notification type is enabled."""
        # Emergency types cannot be disabled
        if notification_type in NON_DISABLEABLE_TYPES:
            return True
        
        # Check master switch
        if not self.notifications_enabled:
            return False
        
        # Check type-specific preference
        return self.type_preferences.get(
            notification_type,
            DEFAULT_NOTIFICATION_PREFERENCES.get(notification_type, True)
        )
    
    def set_type_preference(self, notification_type: str, enabled: bool) -> bool:
        """Set preference for a notification type. Returns False if not allowed."""
        if notification_type in NON_DISABLEABLE_TYPES:
            return False
        
        self.type_preferences[notification_type] = enabled
        self.save(update_fields=['type_preferences', 'updated_at'])
        return True
    
    def is_quiet_hours_now(self) -> bool:
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_enabled:
            return False
        
        now = timezone.localtime().time()
        start = self.quiet_hours_start
        end = self.quiet_hours_end
        
        if start <= end:
            return start <= now <= end
        else:
            # Quiet hours span midnight
            return now >= start or now <= end


class DeviceToken(models.Model):
    """
    Stores FCM device tokens for push notifications.
    A user can have multiple devices (phone, tablet, web browser).
    """
    
    DEVICE_TYPES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web Browser'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_tokens'
    )
    
    # FCM token
    token = models.TextField(
        unique=True,
        help_text="Firebase Cloud Messaging token"
    )
    
    # Device information
    device_type = models.CharField(
        max_length=20,
        choices=DEVICE_TYPES,
        default='web'
    )
    device_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="User-friendly device name (e.g., 'My Phone')"
    )
    device_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="Unique device identifier"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this token is still valid"
    )
    
    # Last activity
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time a notification was sent to this device"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_device_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['token']),
        ]
    
    def __str__(self):
        return f"{self.device_type} - {self.user}"
    
    def mark_used(self):
        """Update last used timestamp."""
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at'])
    
    def deactivate(self):
        """Mark token as inactive (e.g., when FCM returns invalid token)."""
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at'])


class Notification(models.Model):
    """
    Individual notification record.
    Stores both sent and pending notifications.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Recipient
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification content
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.CHOICES,
        db_index=True
    )
    title = models.CharField(max_length=100)
    body = models.TextField(max_length=500)
    
    # Optional: link to template used
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Priority and status
    priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.CHOICES,
        default=NotificationPriority.NORMAL
    )
    status = models.CharField(
        max_length=20,
        choices=NotificationStatus.CHOICES,
        default=NotificationStatus.PENDING
    )
    
    # Channels
    channels = models.JSONField(
        default=list,
        help_text="Channels used: ['push', 'in_app']"
    )
    
    # Action when tapped
    action_url = models.CharField(
        max_length=255,
        blank=True,
        help_text="Deep link to open when notification is tapped"
    )
    
    # Additional data payload
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional data to send with notification"
    )
    
    # Visual
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, blank=True)
    image_url = models.URLField(blank=True)
    
    # Scheduling
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When to send the notification (null = immediately)"
    )
    
    # Delivery tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Grouping (for collapsible notifications)
    group_key = models.CharField(
        max_length=100,
        blank=True,
        help_text="Group key for collapsible notifications"
    )
    
    # Related object (for linking to appointments, etc.)
    related_object_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Type of related object (e.g., 'appointment')"
    )
    related_object_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="ID of related object"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['user', 'read_at']),
            models.Index(fields=['notification_type', 'status']),
            models.Index(fields=['scheduled_at', 'status']),
            models.Index(fields=['related_object_type', 'related_object_id']),
        ]
    
    def __str__(self):
        return f"{self.notification_type}: {self.title[:30]}"
    
    def mark_as_sent(self):
        """Mark notification as sent."""
        self.status = NotificationStatus.SENT
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at', 'updated_at'])
    
    def mark_as_delivered(self):
        """Mark notification as delivered."""
        self.status = NotificationStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at', 'updated_at'])
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.read_at:
            self.status = NotificationStatus.READ
            self.read_at = timezone.now()
            self.save(update_fields=['status', 'read_at', 'updated_at'])
    
    def mark_as_failed(self, error_message: str):
        """Mark notification as failed."""
        self.status = NotificationStatus.FAILED
        self.error_message = error_message
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count', 'updated_at'])
    
    @property
    def is_read(self) -> bool:
        """Check if notification has been read."""
        return self.read_at is not None


class ScheduledNotification(models.Model):
    """
    Recurring or scheduled notifications.
    Used for medicine reminders, daily health tips, etc.
    """
    
    FREQUENCY_CHOICES = [
        ('once', 'Once'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scheduled_notifications'
    )
    
    # Template to use
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.CASCADE,
        related_name='scheduled_notifications'
    )
    
    # Schedule settings
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='once'
    )
    scheduled_time = models.TimeField(
        help_text="Time of day to send notification"
    )
    
    # For weekly frequency
    days_of_week = models.JSONField(
        default=list,
        blank=True,
        help_text="Days of week (0=Monday, 6=Sunday)"
    )
    
    # For monthly frequency
    day_of_month = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)]
    )
    
    # Date range
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="When to stop sending (null = forever)"
    )
    
    # Custom data to include
    custom_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom data to include in notification"
    )
    
    # Related object (e.g., medicine for reminders)
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.CharField(max_length=50, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    next_send_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics
    total_sent = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_scheduled'
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['next_send_at', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.template.name} - {self.frequency} at {self.scheduled_time}"
    
    def calculate_next_send(self):
        """Calculate and set the next send time."""
        from .utils import calculate_next_notification_time
        self.next_send_at = calculate_next_notification_time(self)
        self.save(update_fields=['next_send_at', 'updated_at'])


class NotificationLog(models.Model):
    """
    Log of all notification delivery attempts.
    Used for debugging and analytics.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    
    # Delivery attempt details
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.CHOICES
    )
    device_token = models.ForeignKey(
        DeviceToken,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Result
    success = models.BooleanField(default=False)
    error_code = models.CharField(max_length=50, blank=True)
    error_message = models.TextField(blank=True)
    
    # FCM response
    fcm_message_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="FCM message ID if successful"
    )
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification', '-created_at']),
            models.Index(fields=['success', '-created_at']),
        ]
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.channel} - {status}"