"""
Management command to show appointment statistics.

Usage:
    python manage.py appointment_stats
    python manage.py appointment_stats --today
    python manage.py appointment_stats --date 2025-01-15
    python manage.py appointment_stats --month 2025-01
"""

import logging
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from apps.appointments.models import (
    DoctorSchedule,
    ScheduleException,
    TimeSlot,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Display appointment statistics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--today',
            action='store_true',
            help='Show today\'s statistics',
        )
        parser.add_argument(
            '--date',
            type=str,
            help='Show statistics for a specific date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--month',
            type=str,
            help='Show statistics for a specific month (YYYY-MM)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Show all-time statistics',
        )

    def handle(self, *args, **options):
        show_today = options.get('today', False)
        date_str = options.get('date')
        month_str = options.get('month')
        show_all = options.get('all', False)

        self.stdout.write('')
        self.stdout.write('=' * 60)
        self.stdout.write('        MEDICONNECT APPOINTMENT STATISTICS')
        self.stdout.write('=' * 60)
        self.stdout.write('')

        if show_today or (not date_str and not month_str and not show_all):
            self._show_today_stats()
        
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                self._show_date_stats(target_date)
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('Invalid date format. Use YYYY-MM-DD.')
                )
        
        if month_str:
            try:
                year, month = map(int, month_str.split('-'))
                self._show_month_stats(year, month)
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('Invalid month format. Use YYYY-MM.')
                )
        
        if show_all:
            self._show_overall_stats()
        
        # Always show system stats
        self._show_system_stats()

    def _show_today_stats(self):
        """Show today's statistics."""
        today = timezone.now().date()
        
        self.stdout.write(
            self.style.HTTP_INFO(f'📅 TODAY ({today})')
        )
        self.stdout.write('-' * 40)
        
        appointments = Appointment.objects.filter(appointment_date=today)
        
        stats = appointments.values('status').annotate(count=Count('status'))
        status_counts = {s['status']: s['count'] for s in stats}
        
        total = appointments.count()
        
        self.stdout.write(f'  Total Appointments: {total}')
        self.stdout.write('')
        self.stdout.write('  By Status:')
        
        for status, display in Appointment.STATUS_CHOICES:
            count = status_counts.get(status, 0)
            if count > 0:
                self.stdout.write(f'    {display}: {count}')
        
        # Queue stats
        queue_today = AppointmentQueue.objects.filter(queue_date=today)
        queue_stats = queue_today.values('status').annotate(count=Count('status'))
        queue_counts = {s['status']: s['count'] for s in queue_stats}
        
        if queue_today.exists():
            self.stdout.write('')
            self.stdout.write('  Queue Status:')
            for status, display in AppointmentQueue.QUEUE_STATUS:
                count = queue_counts.get(status, 0)
                if count > 0:
                    self.stdout.write(f'    {display}: {count}')
        
        self.stdout.write('')

    def _show_date_stats(self, target_date):
        """Show statistics for a specific date."""
        self.stdout.write(
            self.style.HTTP_INFO(f'📅 DATE: {target_date}')
        )
        self.stdout.write('-' * 40)
        
        appointments = Appointment.objects.filter(appointment_date=target_date)
        
        stats = appointments.values('status').annotate(count=Count('status'))
        status_counts = {s['status']: s['count'] for s in stats}
        
        self.stdout.write(f'  Total: {appointments.count()}')
        
        for status, display in Appointment.STATUS_CHOICES:
            count = status_counts.get(status, 0)
            if count > 0:
                self.stdout.write(f'    {display}: {count}')
        
        self.stdout.write('')

    def _show_month_stats(self, year, month):
        """Show statistics for a specific month."""
        from calendar import monthrange
        
        _, last_day = monthrange(year, month)
        start_date = datetime(year, month, 1).date()
        end_date = datetime(year, month, last_day).date()
        
        self.stdout.write(
            self.style.HTTP_INFO(f'📅 MONTH: {year}-{month:02d}')
        )
        self.stdout.write('-' * 40)
        
        appointments = Appointment.objects.filter(
            appointment_date__gte=start_date,
            appointment_date__lte=end_date
        )
        
        stats = appointments.values('status').annotate(count=Count('status'))
        status_counts = {s['status']: s['count'] for s in stats}
        
        self.stdout.write(f'  Total Appointments: {appointments.count()}')
        self.stdout.write('')
        
        for status, display in Appointment.STATUS_CHOICES:
            count = status_counts.get(status, 0)
            if count > 0:
                self.stdout.write(f'    {display}: {count}')
        
        # Calculate completion rate
        completed = status_counts.get('completed', 0)
        total_relevant = completed + status_counts.get('cancelled', 0) + status_counts.get('no_show', 0)
        
        if total_relevant > 0:
            completion_rate = (completed / total_relevant) * 100
            self.stdout.write('')
            self.stdout.write(f'  Completion Rate: {completion_rate:.1f}%')
        
        self.stdout.write('')

    def _show_overall_stats(self):
        """Show all-time statistics."""
        self.stdout.write(
            self.style.HTTP_INFO('📊 ALL-TIME STATISTICS')
        )
        self.stdout.write('-' * 40)
        
        total_appointments = Appointment.objects.count()
        
        stats = Appointment.objects.values('status').annotate(count=Count('status'))
        status_counts = {s['status']: s['count'] for s in stats}
        
        self.stdout.write(f'  Total Appointments: {total_appointments}')
        self.stdout.write('')
        
        for status, display in Appointment.STATUS_CHOICES:
            count = status_counts.get(status, 0)
            percentage = (count / total_appointments * 100) if total_appointments > 0 else 0
            self.stdout.write(f'    {display}: {count} ({percentage:.1f}%)')
        
        # Booking type breakdown
        self.stdout.write('')
        self.stdout.write('  By Booking Type:')
        type_stats = Appointment.objects.values('booking_type').annotate(count=Count('booking_type'))
        
        for item in type_stats:
            self.stdout.write(f'    {item["booking_type"]}: {item["count"]}')
        
        self.stdout.write('')

    def _show_system_stats(self):
        """Show system-wide statistics."""
        self.stdout.write(
            self.style.HTTP_INFO('⚙️ SYSTEM STATUS')
        )
        self.stdout.write('-' * 40)
        
        # Doctor schedules
        schedule_count = DoctorSchedule.objects.count()
        active_schedules = DoctorSchedule.objects.filter(is_active=True).count()
        doctors_with_schedule = DoctorSchedule.objects.values('doctor').distinct().count()
        
        self.stdout.write(f'  Schedules: {schedule_count} ({active_schedules} active)')
        self.stdout.write(f'  Doctors with schedules: {doctors_with_schedule}')
        
        # Time slots
        today = timezone.now().date()
        total_slots = TimeSlot.objects.count()
        future_slots = TimeSlot.objects.filter(slot_date__gte=today).count()
        available_slots = TimeSlot.objects.filter(
            slot_date__gte=today,
            status='available'
        ).count()
        
        self.stdout.write('')
        self.stdout.write(f'  Total Slots: {total_slots}')
        self.stdout.write(f'  Future Slots: {future_slots}')
        self.stdout.write(f'  Available Slots: {available_slots}')
        
        # Reminders
        pending_reminders = AppointmentReminder.objects.filter(status='pending').count()
        sent_reminders = AppointmentReminder.objects.filter(status='sent').count()
        failed_reminders = AppointmentReminder.objects.filter(status='failed').count()
        
        self.stdout.write('')
        self.stdout.write(f'  Pending Reminders: {pending_reminders}')
        self.stdout.write(f'  Sent Reminders: {sent_reminders}')
        self.stdout.write(f'  Failed Reminders: {failed_reminders}')
        
        # Schedule exceptions
        future_exceptions = ScheduleException.objects.filter(
            exception_date__gte=today
        ).count()
        
        self.stdout.write('')
        self.stdout.write(f'  Upcoming Exceptions: {future_exceptions}')
        
        self.stdout.write('')
        self.stdout.write('=' * 60)
        self.stdout.write('')