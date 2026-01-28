"""
Cleanup Health Records
======================
Clean up old and orphaned health records data.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import os

from apps.health_records.models import (
    MedicalDocument,
    SharedRecord,
    VitalSign,
)
from apps.health_records.services import SharingService


class Command(BaseCommand):
    help = 'Clean up old health records data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--expired-shares',
            action='store_true',
            help='Deactivate expired shares'
        )
        parser.add_argument(
            '--orphaned-files',
            action='store_true',
            help='Delete orphaned document files'
        )
        parser.add_argument(
            '--old-vitals',
            type=int,
            default=0,
            help='Delete vital signs older than N days (0 = disabled)'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made\n'))
        
        total_cleaned = 0
        
        # Deactivate expired shares
        if options['expired_shares']:
            count = self.cleanup_expired_shares(dry_run)
            total_cleaned += count
        
        # Delete orphaned files
        if options['orphaned_files']:
            count = self.cleanup_orphaned_files(dry_run)
            total_cleaned += count
        
        # Delete old vital signs
        if options['old_vitals'] > 0:
            count = self.cleanup_old_vitals(options['old_vitals'], dry_run)
            total_cleaned += count
        
        # If no specific options, run default cleanup
        if not any([options['expired_shares'], options['orphaned_files'], options['old_vitals']]):
            self.stdout.write('Running default cleanup (expired shares)...\n')
            count = self.cleanup_expired_shares(dry_run)
            total_cleaned += count
        
        self.stdout.write(self.style.SUCCESS(f'\nTotal items cleaned: {total_cleaned}'))

    def cleanup_expired_shares(self, dry_run):
        """Deactivate expired shares."""
        self.stdout.write('Checking expired shares...')
        
        now = timezone.now()
        expired_shares = SharedRecord.objects.filter(
            is_active=True,
            is_permanent=False,
            expires_at__lt=now
        )
        
        count = expired_shares.count()
        
        if count > 0:
            self.stdout.write(f'  Found {count} expired shares')
            
            if not dry_run:
                expired_shares.update(is_active=False)
                self.stdout.write(self.style.SUCCESS(f'  Deactivated {count} expired shares'))
            else:
                self.stdout.write(f'  Would deactivate {count} shares')
        else:
            self.stdout.write('  No expired shares found')
        
        return count

    def cleanup_orphaned_files(self, dry_run):
        """Delete document files that don't have database records."""
        from django.conf import settings
        
        self.stdout.write('Checking orphaned files...')
        
        # Get all file paths from database
        db_files = set()
        for doc in MedicalDocument.objects.all():
            if doc.file:
                db_files.add(doc.file.name)
        
        # Check upload directory
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'health_records', 'documents')
        
        if not os.path.exists(upload_dir):
            self.stdout.write('  Upload directory does not exist')
            return 0
        
        orphaned_files = []
        
        for root, dirs, files in os.walk(upload_dir):
            for filename in files:
                file_path = os.path.join(root, filename)
                relative_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
                
                if relative_path not in db_files:
                    orphaned_files.append(file_path)
        
        count = len(orphaned_files)
        
        if count > 0:
            self.stdout.write(f'  Found {count} orphaned files')
            
            if not dry_run:
                for file_path in orphaned_files:
                    try:
                        os.remove(file_path)
                    except OSError as e:
                        self.stdout.write(self.style.WARNING(f'  Failed to delete {file_path}: {e}'))
                
                self.stdout.write(self.style.SUCCESS(f'  Deleted {count} orphaned files'))
            else:
                for file_path in orphaned_files[:5]:
                    self.stdout.write(f'    Would delete: {file_path}')
                if count > 5:
                    self.stdout.write(f'    ... and {count - 5} more')
        else:
            self.stdout.write('  No orphaned files found')
        
        return count

    def cleanup_old_vitals(self, days, dry_run):
        """Delete vital signs older than specified days."""
        self.stdout.write(f'Checking vital signs older than {days} days...')
        
        cutoff_date = timezone.now() - timedelta(days=days)
        old_vitals = VitalSign.objects.filter(recorded_at__lt=cutoff_date)
        
        count = old_vitals.count()
        
        if count > 0:
            self.stdout.write(f'  Found {count} old vital sign records')
            
            if not dry_run:
                old_vitals.delete()
                self.stdout.write(self.style.SUCCESS(f'  Deleted {count} old vital signs'))
            else:
                self.stdout.write(f'  Would delete {count} vital signs')
        else:
            self.stdout.write('  No old vital signs found')
        
        return count