"""
Send Test Notification Command
==============================
Send a test push notification to verify FCM is working.

Usage:
    python manage.py send_test_notification --phone=+919876543210
    python manage.py send_test_notification --user-id=<uuid>
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

from apps.notifications.services import get_notification_service
from apps.notifications.constants import NotificationType


User = get_user_model()


class Command(BaseCommand):
    help = 'Send a test notification to a user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--phone',
            type=str,
            help='User phone number (e.g., +919876543210)',
        )
        parser.add_argument(
            '--user-id',
            type=str,
            help='User UUID',
        )
        parser.add_argument(
            '--title',
            type=str,
            default='Test Notification',
            help='Notification title',
        )
        parser.add_argument(
            '--body',
            type=str,
            default='This is a test notification from MediConnect!',
            help='Notification body',
        )

    def handle(self, *args, **options):
        # Get user
        user = None
        
        if options['phone']:
            try:
                user = User.objects.get(phone_number=options['phone'])
            except User.DoesNotExist:
                raise CommandError(f"User with phone {options['phone']} not found")
        
        elif options['user_id']:
            try:
                user = User.objects.get(id=options['user_id'])
            except User.DoesNotExist:
                raise CommandError(f"User with ID {options['user_id']} not found")
        
        else:
            # Get first user
            user = User.objects.first()
            if not user:
                raise CommandError("No users found in database")
        
        self.stdout.write(f'\nSending test notification to: {user.phone_number}')
        
        # Check for device tokens
        from apps.notifications.models import DeviceToken
        tokens = DeviceToken.objects.filter(user=user, is_active=True)
        
        if not tokens.exists():
            self.stdout.write(self.style.WARNING(
                f'  ⚠️  No active device tokens for this user.'
            ))
            self.stdout.write(
                '  The notification will be stored in-app but push won\'t be sent.'
            )
        else:
            self.stdout.write(f'  Found {tokens.count()} active device token(s)')
        
        # Send notification
        service = get_notification_service()
        
        notification = service.send_notification(
            user=user,
            notification_type=NotificationType.GENERAL,
            title=options['title'],
            body=options['body'],
            priority='high',
            data={'test': 'true', 'timestamp': str(__import__('time').time())},
            skip_preferences_check=True,
        )
        
        if notification:
            self.stdout.write(self.style.SUCCESS(
                f'\n✅ Notification sent successfully!'
            ))
            self.stdout.write(f'   ID: {notification.id}')
            self.stdout.write(f'   Status: {notification.status}')
            self.stdout.write(f'   Title: {notification.title}')
            self.stdout.write(f'   Body: {notification.body}')
        else:
            self.stdout.write(self.style.ERROR(
                '\n❌ Failed to send notification'
            ))