"""
Cleanup Old Notifications
=========================
Remove old read notifications to keep database clean.

Usage:
    python manage.py cleanup_notifications
    python manage.py cleanup_notifications --days=60
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.notifications.models import Notification, NotificationLog


class Command(BaseCommand):
    help = 'Clean up old notifications and logs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Delete read notifications older than this many days (default: 30)',
        )
        parser.add_argument(
            '--log-days',
            type=int,
            default=7,
            help='Delete notification logs older than this many days (default: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        days = options['days']
        log_days = options['log_days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        log_cutoff_date = timezone.now() - timedelta(days=log_days)
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write('🧹 NOTIFICATION CLEANUP')
        self.stdout.write('='*50)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made\n'))
        
        # Count notifications to delete
        old_read_notifications = Notification.objects.filter(
            read_at__isnull=False,
            created_at__lt=cutoff_date
        )
        notification_count = old_read_notifications.count()
        
        # Count logs to delete
        old_logs = NotificationLog.objects.filter(
            created_at__lt=log_cutoff_date
        )
        log_count = old_logs.count()
        
        self.stdout.write(f'Read notifications older than {days} days: {notification_count}')
        self.stdout.write(f'Logs older than {log_days} days: {log_count}')
        
        if not dry_run:
            # Delete notifications
            if notification_count > 0:
                deleted, _ = old_read_notifications.delete()
                self.stdout.write(self.style.SUCCESS(
                    f'\n✅ Deleted {deleted} old notifications'
                ))
            
            # Delete logs
            if log_count > 0:
                deleted, _ = old_logs.delete()
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Deleted {deleted} old logs'
                ))
            
            if notification_count == 0 and log_count == 0:
                self.stdout.write('\nNothing to clean up!')
        
        self.stdout.write('\n' + '='*50)