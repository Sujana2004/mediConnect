"""
Consultation Statistics
=======================
Display consultation statistics and reports.

Usage:
    python manage.py consultation_stats
    python manage.py consultation_stats --days 7
    python manage.py consultation_stats --doctor <doctor_id>
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Q
from django.contrib.auth import get_user_model

from apps.consultation.models import (
    Consultation,
    ConsultationFeedback,
    ConsultationNote,
    ConsultationPrescription,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Display consultation statistics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Statistics for the last N days (default: 30)'
        )
        parser.add_argument(
            '--doctor',
            type=str,
            help='Filter by doctor ID'
        )
        parser.add_argument(
            '--today',
            action='store_true',
            help='Show only today\'s statistics'
        )

    def handle(self, *args, **options):
        days = options['days']
        doctor_id = options.get('doctor')
        today_only = options['today']
        
        now = timezone.now()
        
        if today_only:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
            period_label = "Today"
        else:
            start_date = now - timedelta(days=days)
            end_date = now
            period_label = f"Last {days} days"
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(f"CONSULTATION STATISTICS - {period_label}")
        self.stdout.write("=" * 60)
        
        # Base queryset
        queryset = Consultation.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
            try:
                doctor = User.objects.get(id=doctor_id)
                self.stdout.write(f"Doctor: Dr. {doctor.first_name} {doctor.last_name}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Doctor not found: {doctor_id}"))
                return
        
        # Overall stats
        self.print_overall_stats(queryset)
        
        # By status
        self.print_status_breakdown(queryset)
        
        # By type
        self.print_type_breakdown(queryset)
        
        # By language
        self.print_language_breakdown(queryset)
        
        # Duration stats
        self.print_duration_stats(queryset)
        
        # Feedback stats
        self.print_feedback_stats(start_date, end_date, doctor_id)
        
        # Top doctors (if not filtered by doctor)
        if not doctor_id:
            self.print_top_doctors(start_date, end_date)
        
        # Upcoming consultations
        self.print_upcoming(doctor_id)
        
        self.stdout.write("\n" + "=" * 60)

    def print_overall_stats(self, queryset):
        """Print overall statistics."""
        self.stdout.write("\n📊 OVERALL STATISTICS")
        self.stdout.write("-" * 40)
        
        total = queryset.count()
        completed = queryset.filter(status='completed').count()
        cancelled = queryset.filter(status='cancelled').count()
        no_show = queryset.filter(status='no_show').count()
        scheduled = queryset.filter(status='scheduled').count()
        
        self.stdout.write(f"Total Consultations: {total}")
        self.stdout.write(f"Completed: {completed}")
        self.stdout.write(f"Cancelled: {cancelled}")
        self.stdout.write(f"No Show: {no_show}")
        self.stdout.write(f"Scheduled: {scheduled}")
        
        if total > 0:
            completion_rate = (completed / total) * 100
            self.stdout.write(f"\nCompletion Rate: {completion_rate:.1f}%")

    def print_status_breakdown(self, queryset):
        """Print breakdown by status."""
        self.stdout.write("\n📈 STATUS BREAKDOWN")
        self.stdout.write("-" * 40)
        
        status_counts = queryset.values('status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in status_counts:
            self.stdout.write(f"  {item['status']}: {item['count']}")

    def print_type_breakdown(self, queryset):
        """Print breakdown by consultation type."""
        self.stdout.write("\n🎥 CONSULTATION TYPE")
        self.stdout.write("-" * 40)
        
        type_counts = queryset.values('consultation_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        type_labels = {'video': '📹 Video', 'audio': '🎤 Audio', 'chat': '💬 Chat'}
        
        for item in type_counts:
            label = type_labels.get(item['consultation_type'], item['consultation_type'])
            self.stdout.write(f"  {label}: {item['count']}")

    def print_language_breakdown(self, queryset):
        """Print breakdown by language."""
        self.stdout.write("\n🌐 LANGUAGE")
        self.stdout.write("-" * 40)
        
        lang_counts = queryset.values('language').annotate(
            count=Count('id')
        ).order_by('-count')
        
        lang_labels = {'en': 'English', 'te': 'Telugu', 'hi': 'Hindi'}
        
        for item in lang_counts:
            label = lang_labels.get(item['language'], item['language'])
            self.stdout.write(f"  {label}: {item['count']}")

    def print_duration_stats(self, queryset):
        """Print duration statistics."""
        self.stdout.write("\n⏱️ DURATION STATISTICS")
        self.stdout.write("-" * 40)
        
        completed = queryset.filter(status='completed', actual_duration__isnull=False)
        
        if completed.exists():
            stats = completed.aggregate(
                avg_duration=Avg('actual_duration'),
                total_duration=Sum('actual_duration'),
                min_duration=Avg('actual_duration'),
                max_duration=Avg('actual_duration'),
            )
            
            avg = stats['avg_duration'] or 0
            total = stats['total_duration'] or 0
            
            self.stdout.write(f"  Average Duration: {avg:.1f} minutes")
            self.stdout.write(f"  Total Time: {total} minutes ({total/60:.1f} hours)")
        else:
            self.stdout.write("  No completed consultations with duration data")

    def print_feedback_stats(self, start_date, end_date, doctor_id=None):
        """Print feedback statistics."""
        self.stdout.write("\n⭐ FEEDBACK STATISTICS")
        self.stdout.write("-" * 40)
        
        feedback_qs = ConsultationFeedback.objects.filter(
            consultation__created_at__gte=start_date,
            consultation__created_at__lte=end_date
        )
        
        if doctor_id:
            feedback_qs = feedback_qs.filter(consultation__doctor_id=doctor_id)
        
        if feedback_qs.exists():
            stats = feedback_qs.aggregate(
                avg_overall=Avg('overall_rating'),
                avg_communication=Avg('communication_rating'),
                avg_technical=Avg('technical_quality_rating'),
                total=Count('id'),
            )
            
            self.stdout.write(f"  Total Feedbacks: {stats['total']}")
            self.stdout.write(f"  Average Overall: {stats['avg_overall']:.1f}/5")
            
            if stats['avg_communication']:
                self.stdout.write(f"  Average Communication: {stats['avg_communication']:.1f}/5")
            if stats['avg_technical']:
                self.stdout.write(f"  Average Technical: {stats['avg_technical']:.1f}/5")
            
            # Would recommend
            recommend_count = feedback_qs.filter(would_recommend=True).count()
            total_with_recommend = feedback_qs.exclude(would_recommend__isnull=True).count()
            
            if total_with_recommend > 0:
                recommend_rate = (recommend_count / total_with_recommend) * 100
                self.stdout.write(f"  Recommendation Rate: {recommend_rate:.1f}%")
            
            # Technical issues
            issues_count = feedback_qs.filter(had_technical_issues=True).count()
            issues_rate = (issues_count / stats['total']) * 100
            self.stdout.write(f"  Technical Issues: {issues_count} ({issues_rate:.1f}%)")
        else:
            self.stdout.write("  No feedback data available")

    def print_top_doctors(self, start_date, end_date, limit=5):
        """Print top doctors by consultation count."""
        self.stdout.write(f"\n👨‍⚕️ TOP {limit} DOCTORS")
        self.stdout.write("-" * 40)
        
        top_doctors = Consultation.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date,
            status='completed'
        ).values(
            'doctor__id',
            'doctor__first_name',
            'doctor__last_name'
        ).annotate(
            count=Count('id'),
            avg_duration=Avg('actual_duration')
        ).order_by('-count')[:limit]
        
        for i, doc in enumerate(top_doctors, 1):
            name = f"Dr. {doc['doctor__first_name']} {doc['doctor__last_name']}"
            avg = doc['avg_duration'] or 0
            self.stdout.write(f"  {i}. {name}: {doc['count']} consultations (avg: {avg:.0f} min)")

    def print_upcoming(self, doctor_id=None):
        """Print upcoming consultations."""
        self.stdout.write("\n📅 UPCOMING CONSULTATIONS")
        self.stdout.write("-" * 40)
        
        now = timezone.now()
        upcoming = Consultation.objects.filter(
            status='scheduled',
            scheduled_start__gt=now
        ).order_by('scheduled_start')
        
        if doctor_id:
            upcoming = upcoming.filter(doctor_id=doctor_id)
        
        upcoming = upcoming[:5]
        
        if upcoming.exists():
            for c in upcoming:
                time_str = c.scheduled_start.strftime('%d %b %H:%M')
                patient = f"{c.patient.first_name} {c.patient.last_name}"
                doctor = f"Dr. {c.doctor.first_name}"
                self.stdout.write(f"  {time_str} - {patient} with {doctor}")
        else:
            self.stdout.write("  No upcoming consultations")