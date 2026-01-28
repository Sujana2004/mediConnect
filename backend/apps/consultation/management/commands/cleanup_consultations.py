"""
Cleanup Old Consultation Data
=============================
Cleans up old consultation rooms and data.

Usage:
    python manage.py cleanup_consultations
    python manage.py cleanup_consultations --days 30
    python manage.py cleanup_consultations --dry-run
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.consultation.models import (
    ConsultationRoom,
    Consultation,
)


class Command(BaseCommand):
    help = 'Clean up old consultation data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Delete rooms older than this many days (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--expire-rooms',
            action='store_true',
            help='Also expire active rooms past their expiry time'
        )

    def handle(self, *args, **options):
        self.stdout.write("Starting consultation cleanup...")
        
        days = options['days']
        dry_run = options['dry_run']
        expire_rooms = options['expire_rooms']
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No data will be deleted"))
        
        now = timezone.now()
        cutoff = now - timedelta(days=days)
        
        # 1. Expire old rooms
        if expire_rooms:
            self.expire_old_rooms(now, dry_run)
        
        # 2. Delete old expired/ended rooms
        self.delete_old_rooms(cutoff, dry_run)
        
        # 3. Mark no-show consultations
        self.mark_no_shows(now, dry_run)
        
        # 4. Show statistics
        self.show_statistics()
        
        self.stdout.write(self.style.SUCCESS("\nCleanup completed!"))

    def expire_old_rooms(self, now, dry_run):
        """Expire rooms past their expiry time."""
        self.stdout.write("\n1. Expiring old rooms...")
        
        rooms = ConsultationRoom.objects.filter(
            expires_at__lt=now,
            status__in=['created', 'waiting']
        )
        
        count = rooms.count()
        
        if count > 0:
            if dry_run:
                self.stdout.write(f"   Would expire {count} rooms")
            else:
                rooms.update(status='expired')
                self.stdout.write(f"   Expired {count} rooms")
        else:
            self.stdout.write("   No rooms to expire")

    def delete_old_rooms(self, cutoff, dry_run):
        """Delete old expired/ended rooms."""
        self.stdout.write("\n2. Deleting old rooms...")
        
        # Only delete rooms that are expired/ended and have no associated consultation
        # or whose consultation is also old
        rooms = ConsultationRoom.objects.filter(
            created_at__lt=cutoff,
            status__in=['expired', 'ended']
        )
        
        count = rooms.count()
        
        if count > 0:
            if dry_run:
                self.stdout.write(f"   Would delete {count} old rooms")
            else:
                # We need to be careful here - only delete if consultation allows
                deleted = 0
                for room in rooms:
                    try:
                        if hasattr(room, 'consultation'):
                            consultation = room.consultation
                            if consultation.status in ['completed', 'cancelled', 'no_show']:
                                # Don't delete room, just leave it
                                pass
                        else:
                            room.delete()
                            deleted += 1
                    except Exception:
                        room.delete()
                        deleted += 1
                
                self.stdout.write(f"   Deleted {deleted} orphaned rooms")
        else:
            self.stdout.write("   No old rooms to delete")

    def mark_no_shows(self, now, dry_run):
        """Mark consultations as no-show if past scheduled time."""
        self.stdout.write("\n3. Marking no-shows...")
        
        # Consultations that are still scheduled but 30+ minutes past start
        cutoff = now - timedelta(minutes=30)
        
        consultations = Consultation.objects.filter(
            status__in=['scheduled', 'waiting_room'],
            scheduled_start__lt=cutoff
        )
        
        count = consultations.count()
        
        if count > 0:
            if dry_run:
                self.stdout.write(f"   Would mark {count} consultations as no-show")
                for c in consultations[:5]:
                    self.stdout.write(f"      - {c.id}: scheduled {c.scheduled_start}")
            else:
                with transaction.atomic():
                    for consultation in consultations:
                        consultation.status = 'no_show'
                        consultation.save(update_fields=['status', 'updated_at'])
                        
                        # Update room
                        consultation.room.status = 'expired'
                        consultation.room.save(update_fields=['status'])
                
                self.stdout.write(f"   Marked {count} consultations as no-show")
        else:
            self.stdout.write("   No consultations to mark as no-show")

    def show_statistics(self):
        """Show current statistics."""
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("CURRENT STATISTICS")
        self.stdout.write("=" * 50)
        
        # Room stats
        total_rooms = ConsultationRoom.objects.count()
        room_stats = {}
        for status, _ in ConsultationRoom.ROOM_STATUS_CHOICES:
            count = ConsultationRoom.objects.filter(status=status).count()
            if count > 0:
                room_stats[status] = count
        
        self.stdout.write(f"\nRooms ({total_rooms} total):")
        for status, count in room_stats.items():
            self.stdout.write(f"  - {status}: {count}")
        
        # Consultation stats
        total_consultations = Consultation.objects.count()
        consultation_stats = {}
        for status, _ in Consultation.STATUS_CHOICES:
            count = Consultation.objects.filter(status=status).count()
            if count > 0:
                consultation_stats[status] = count
        
        self.stdout.write(f"\nConsultations ({total_consultations} total):")
        for status, count in consultation_stats.items():
            self.stdout.write(f"  - {status}: {count}")
        
        self.stdout.write("=" * 50)