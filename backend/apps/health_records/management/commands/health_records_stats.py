"""
Health Records Statistics
=========================
Display statistics about health records.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta

from apps.health_records.models import (
    HealthProfile,
    MedicalCondition,
    MedicalDocument,
    LabReport,
    VaccinationRecord,
    Allergy,
    FamilyMedicalHistory,
    Hospitalization,
    VitalSign,
    SharedRecord,
)


class Command(BaseCommand):
    help = 'Display health records statistics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed statistics'
        )

    def handle(self, *args, **options):
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('HEALTH RECORDS STATISTICS')
        self.stdout.write('=' * 60 + '\n')
        
        self.print_overview()
        
        if options['detailed']:
            self.print_conditions_stats()
            self.print_allergies_stats()
            self.print_vaccinations_stats()
            self.print_vitals_stats()
            self.print_lab_reports_stats()
            self.print_sharing_stats()

    def print_overview(self):
        """Print overview statistics."""
        self.stdout.write('📊 OVERVIEW')
        self.stdout.write('-' * 40)
        self.stdout.write(f'  Health Profiles:      {HealthProfile.objects.count():,}')
        self.stdout.write(f'  Medical Conditions:   {MedicalCondition.objects.count():,}')
        self.stdout.write(f'  Medical Documents:    {MedicalDocument.objects.count():,}')
        self.stdout.write(f'  Lab Reports:          {LabReport.objects.count():,}')
        self.stdout.write(f'  Vaccinations:         {VaccinationRecord.objects.count():,}')
        self.stdout.write(f'  Allergies:            {Allergy.objects.count():,}')
        self.stdout.write(f'  Family History:       {FamilyMedicalHistory.objects.count():,}')
        self.stdout.write(f'  Hospitalizations:     {Hospitalization.objects.count():,}')
        self.stdout.write(f'  Vital Signs:          {VitalSign.objects.count():,}')
        self.stdout.write(f'  Shared Records:       {SharedRecord.objects.count():,}')
        self.stdout.write('')

    def print_conditions_stats(self):
        """Print medical conditions statistics."""
        self.stdout.write('🏥 MEDICAL CONDITIONS')
        self.stdout.write('-' * 40)
        
        by_status = MedicalCondition.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in by_status:
            self.stdout.write(f"  {item['status'].capitalize():15} {item['count']:,}")
        
        chronic = MedicalCondition.objects.filter(is_chronic=True).count()
        self.stdout.write(f"  {'Chronic':15} {chronic:,}")
        self.stdout.write('')

    def print_allergies_stats(self):
        """Print allergies statistics."""
        self.stdout.write('⚠️  ALLERGIES')
        self.stdout.write('-' * 40)
        
        by_type = Allergy.objects.values('allergy_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in by_type:
            self.stdout.write(f"  {item['allergy_type'].capitalize():15} {item['count']:,}")
        
        by_severity = Allergy.objects.values('severity').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.stdout.write('\n  By Severity:')
        for item in by_severity:
            self.stdout.write(f"    {item['severity'].capitalize():15} {item['count']:,}")
        self.stdout.write('')

    def print_vaccinations_stats(self):
        """Print vaccination statistics."""
        self.stdout.write('💉 VACCINATIONS')
        self.stdout.write('-' * 40)
        
        by_type = VaccinationRecord.objects.values('vaccine_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in by_type[:10]:
            self.stdout.write(f"  {item['vaccine_type'].upper():15} {item['count']:,}")
        
        verified = VaccinationRecord.objects.filter(is_verified=True).count()
        total = VaccinationRecord.objects.count()
        pct = (verified / total * 100) if total > 0 else 0
        self.stdout.write(f"\n  Verified: {verified:,} / {total:,} ({pct:.1f}%)")
        self.stdout.write('')

    def print_vitals_stats(self):
        """Print vital signs statistics."""
        self.stdout.write('❤️  VITAL SIGNS')
        self.stdout.write('-' * 40)
        
        last_7_days = timezone.now() - timedelta(days=7)
        last_30_days = timezone.now() - timedelta(days=30)
        
        recent_7 = VitalSign.objects.filter(recorded_at__gte=last_7_days).count()
        recent_30 = VitalSign.objects.filter(recorded_at__gte=last_30_days).count()
        
        self.stdout.write(f"  Last 7 days:    {recent_7:,}")
        self.stdout.write(f"  Last 30 days:   {recent_30:,}")
        
        by_source = VitalSign.objects.values('source').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.stdout.write('\n  By Source:')
        for item in by_source:
            self.stdout.write(f"    {item['source'].capitalize():15} {item['count']:,}")
        self.stdout.write('')

    def print_lab_reports_stats(self):
        """Print lab reports statistics."""
        self.stdout.write('🔬 LAB REPORTS')
        self.stdout.write('-' * 40)
        
        by_type = LabReport.objects.values('lab_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in by_type:
            self.stdout.write(f"  {item['lab_type'].capitalize():15} {item['count']:,}")
        
        by_status = LabReport.objects.values('overall_status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.stdout.write('\n  By Status:')
        for item in by_status:
            self.stdout.write(f"    {item['overall_status'].capitalize():15} {item['count']:,}")
        self.stdout.write('')

    def print_sharing_stats(self):
        """Print sharing statistics."""
        self.stdout.write('🔗 RECORD SHARING')
        self.stdout.write('-' * 40)
        
        active = SharedRecord.objects.filter(is_active=True).count()
        permanent = SharedRecord.objects.filter(is_permanent=True).count()
        total = SharedRecord.objects.count()
        
        self.stdout.write(f"  Total Shares:      {total:,}")
        self.stdout.write(f"  Active Shares:     {active:,}")
        self.stdout.write(f"  Permanent Shares:  {permanent:,}")
        
        by_type = SharedRecord.objects.values('share_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.stdout.write('\n  By Type:')
        for item in by_type:
            self.stdout.write(f"    {item['share_type'].capitalize():15} {item['count']:,}")
        self.stdout.write('')