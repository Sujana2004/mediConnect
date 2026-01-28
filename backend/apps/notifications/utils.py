"""
Notification Utilities
======================
Helper functions for the notifications system.
"""

import re
from datetime import datetime, timedelta, time
from typing import Optional, Dict, Any, List
from django.utils import timezone

from .constants import NotificationType, NotificationPriority


def format_template(template: str, context: Dict[str, Any]) -> str:
    """
    Format a template string with context variables.
    
    Supports placeholders like {doctor_name}, {appointment_time}, etc.
    
    Args:
        template: Template string with placeholders
        context: Dictionary of values to substitute
        
    Returns:
        Formatted string
        
    Example:
        >>> format_template("Hello {name}!", {"name": "John"})
        "Hello John!"
    """
    if not template:
        return ""
    
    if not context:
        return template
    
    try:
        # Use safe formatting that won't raise KeyError for missing keys
        result = template
        for key, value in context.items():
            placeholder = "{" + str(key) + "}"
            result = result.replace(placeholder, str(value))
        return result
    except Exception:
        return template


def calculate_next_notification_time(scheduled_notification) -> Optional[datetime]:
    """
    Calculate the next time a scheduled notification should be sent.
    
    Args:
        scheduled_notification: ScheduledNotification model instance
        
    Returns:
        Next datetime to send, or None if no more sends
    """
    now = timezone.now()
    today = now.date()
    
    # Check if schedule has ended
    if scheduled_notification.end_date and today > scheduled_notification.end_date:
        return None
    
    # Get scheduled time
    scheduled_time = scheduled_notification.scheduled_time
    
    if scheduled_notification.frequency == 'once':
        # One-time notification
        scheduled_datetime = timezone.make_aware(
            datetime.combine(scheduled_notification.start_date, scheduled_time)
        )
        if scheduled_datetime > now:
            return scheduled_datetime
        return None
    
    elif scheduled_notification.frequency == 'daily':
        # Daily notification
        next_send = timezone.make_aware(
            datetime.combine(today, scheduled_time)
        )
        if next_send <= now:
            next_send = timezone.make_aware(
                datetime.combine(today + timedelta(days=1), scheduled_time)
            )
        return next_send
    
    elif scheduled_notification.frequency == 'weekly':
        # Weekly notification on specific days
        days_of_week = scheduled_notification.days_of_week or [0]  # Default to Monday
        
        for i in range(8):  # Check next 7 days
            check_date = today + timedelta(days=i)
            if check_date.weekday() in days_of_week:
                next_send = timezone.make_aware(
                    datetime.combine(check_date, scheduled_time)
                )
                if next_send > now:
                    return next_send
        
        return None
    
    elif scheduled_notification.frequency == 'monthly':
        # Monthly notification on specific day
        day_of_month = scheduled_notification.day_of_month or 1
        
        # Try current month
        try:
            next_send = timezone.make_aware(
                datetime.combine(
                    today.replace(day=day_of_month),
                    scheduled_time
                )
            )
            if next_send > now:
                return next_send
        except ValueError:
            pass  # Day doesn't exist in current month
        
        # Try next month
        if today.month == 12:
            next_month = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
        
        try:
            next_send = timezone.make_aware(
                datetime.combine(
                    next_month.replace(day=day_of_month),
                    scheduled_time
                )
            )
            return next_send
        except ValueError:
            # Use last day of month if day doesn't exist
            last_day = (next_month.replace(month=next_month.month % 12 + 1, day=1) - timedelta(days=1)).day
            next_send = timezone.make_aware(
                datetime.combine(
                    next_month.replace(day=min(day_of_month, last_day)),
                    scheduled_time
                )
            )
            return next_send
    
    return None


def is_within_quiet_hours(
    quiet_start: time,
    quiet_end: time,
    check_time: Optional[datetime] = None
) -> bool:
    """
    Check if a given time is within quiet hours.
    
    Args:
        quiet_start: Quiet hours start time
        quiet_end: Quiet hours end time
        check_time: Time to check (defaults to now)
        
    Returns:
        True if within quiet hours
    """
    if check_time is None:
        check_time = timezone.localtime()
    
    current_time = check_time.time()
    
    if quiet_start <= quiet_end:
        # Normal range (e.g., 22:00 - 23:00)
        return quiet_start <= current_time <= quiet_end
    else:
        # Spans midnight (e.g., 22:00 - 07:00)
        return current_time >= quiet_start or current_time <= quiet_end


def get_notification_priority_for_type(notification_type: str) -> str:
    """
    Get appropriate priority for a notification type.
    
    Args:
        notification_type: Type of notification
        
    Returns:
        Priority string
    """
    # Emergency notifications are always urgent
    if notification_type in [
        NotificationType.EMERGENCY_ALERT,
        NotificationType.EMERGENCY_CONTACT_ALERT,
    ]:
        return NotificationPriority.URGENT
    
    # Appointment reminders are high priority
    if notification_type in [
        NotificationType.APPOINTMENT_REMINDER,
        NotificationType.MEDICINE_REMINDER,
    ]:
        return NotificationPriority.HIGH
    
    # Health tips are low priority
    if notification_type == NotificationType.HEALTH_TIP:
        return NotificationPriority.LOW
    
    # Default to normal
    return NotificationPriority.NORMAL


def should_send_notification(
    user_preferences,
    notification_type: str,
    priority: str
) -> bool:
    """
    Determine if a notification should be sent based on user preferences.
    
    Args:
        user_preferences: UserNotificationPreference instance
        notification_type: Type of notification
        priority: Notification priority
        
    Returns:
        True if notification should be sent
    """
    from .constants import NON_DISABLEABLE_TYPES
    
    # Emergency notifications always go through
    if notification_type in NON_DISABLEABLE_TYPES:
        return True
    
    # Check if notifications are enabled globally
    if not user_preferences.notifications_enabled:
        return False
    
    # Check if this type is enabled
    if not user_preferences.is_type_enabled(notification_type):
        return False
    
    # Check quiet hours (except for urgent notifications)
    if priority != NotificationPriority.URGENT:
        if user_preferences.is_quiet_hours_now():
            return False
    
    return True


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate text to a maximum length, adding suffix if truncated.
    
    Args:
        text: Text to truncate
        max_length: Maximum length including suffix
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)].rstrip() + suffix


def clean_fcm_token(token: str) -> str:
    """
    Clean and validate an FCM token.
    
    Args:
        token: FCM token string
        
    Returns:
        Cleaned token
    """
    if not token:
        return ""
    
    # Remove whitespace
    token = token.strip()
    
    # Basic validation (FCM tokens are typically 150+ characters)
    if len(token) < 100:
        return ""
    
    return token


def get_localized_time_string(dt: datetime, language: str = 'en') -> str:
    """
    Get a localized time string.
    
    Args:
        dt: Datetime to format
        language: Language code
        
    Returns:
        Formatted time string
    """
    local_dt = timezone.localtime(dt)
    
    # Format based on language
    if language == 'te':
        # Telugu format
        hour = local_dt.hour
        period = "ఉదయం" if hour < 12 else ("మధ్యాహ్నం" if hour < 17 else "సాయంత్రం")
        hour_12 = hour % 12 or 12
        return f"{hour_12}:{local_dt.minute:02d} {period}"
    
    elif language == 'hi':
        # Hindi format
        hour = local_dt.hour
        period = "सुबह" if hour < 12 else ("दोपहर" if hour < 17 else "शाम")
        hour_12 = hour % 12 or 12
        return f"{hour_12}:{local_dt.minute:02d} {period}"
    
    else:
        # English format
        return local_dt.strftime("%I:%M %p")


def get_localized_date_string(dt: datetime, language: str = 'en') -> str:
    """
    Get a localized date string.
    
    Args:
        dt: Datetime to format
        language: Language code
        
    Returns:
        Formatted date string
    """
    local_dt = timezone.localtime(dt)
    
    if language == 'te':
        # Telugu: "25 జనవరి 2024"
        months_te = [
            "", "జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్",
            "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"
        ]
        return f"{local_dt.day} {months_te[local_dt.month]} {local_dt.year}"
    
    elif language == 'hi':
        # Hindi: "25 जनवरी 2024"
        months_hi = [
            "", "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
            "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
        ]
        return f"{local_dt.day} {months_hi[local_dt.month]} {local_dt.year}"
    
    else:
        # English: "25 January 2024"
        return local_dt.strftime("%d %B %Y")


def batch_list(items: List, batch_size: int) -> List[List]:
    """
    Split a list into batches.
    
    Args:
        items: List to split
        batch_size: Size of each batch
        
    Returns:
        List of batches
    """
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]