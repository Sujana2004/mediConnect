"""
Management command to load all emergency sample data.

Usage:
    python manage.py load_emergency_data
    python manage.py load_emergency_data --clear  # Clear existing data first
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction


class Command(BaseCommand):
    help = 'Load all emergency sample data (helplines, first aid, services)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before loading',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('='*60))
        self.stdout.write(self.style.NOTICE('Loading Emergency App Sample Data'))
        self.stdout.write(self.style.NOTICE('='*60))
        
        clear = options.get('clear', False)
        
        try:
            with transaction.atomic():
                # Load helplines
                self.stdout.write('\n📞 Loading Emergency Helplines...')
                call_command('load_helplines', clear=clear, verbosity=0)
                self.stdout.write(self.style.SUCCESS('   ✓ Helplines loaded'))
                
                # Load first aid guides
                self.stdout.write('\n🩹 Loading First Aid Guides...')
                call_command('load_first_aid', clear=clear, verbosity=0)
                self.stdout.write(self.style.SUCCESS('   ✓ First Aid guides loaded'))
                
                # Load emergency services
                self.stdout.write('\n🏥 Loading Emergency Services...')
                call_command('load_emergency_services', clear=clear, verbosity=0)
                self.stdout.write(self.style.SUCCESS('   ✓ Emergency services loaded'))
                
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('✅ All emergency data loaded successfully!'))
            self.stdout.write('='*60)
            
            # Print summary
            self._print_summary()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error loading data: {str(e)}'))
            raise

    def _print_summary(self):
        """Print summary of loaded data."""
        from apps.emergency.models import (
            EmergencyHelpline,
            FirstAidGuide,
            EmergencyService,
        )
        
        self.stdout.write('\n📊 Summary:')
        self.stdout.write(f'   • Helplines: {EmergencyHelpline.objects.count()}')
        self.stdout.write(f'   • First Aid Guides: {FirstAidGuide.objects.count()}')
        self.stdout.write(f'   • Emergency Services: {EmergencyService.objects.count()}')