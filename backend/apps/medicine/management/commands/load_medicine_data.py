"""
Management command to load all medicine sample data.

Usage:
    python manage.py load_medicine_data
    python manage.py load_medicine_data --clear
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction


class Command(BaseCommand):
    help = 'Load all medicine sample data (medicines, interactions)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before loading',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Loading all medicine data...'))
        self.stdout.write('=' * 60)
        
        clear = options.get('clear', False)
        
        try:
            with transaction.atomic():
                # Load medicines
                self.stdout.write('\n💊 Loading Medicines...')
                call_command('load_medicines', clear=clear)
                
                # Load drug interactions
                self.stdout.write('\n⚠️ Loading Drug Interactions...')
                call_command('load_drug_interactions')
            
            self.stdout.write('=' * 60)
            self.stdout.write(
                self.style.SUCCESS('\n✅ All medicine data loaded successfully!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n❌ Error loading data: {str(e)}')
            )
            raise