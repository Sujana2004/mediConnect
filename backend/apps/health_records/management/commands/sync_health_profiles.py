"""
Sync Health Profiles
====================
Synchronize health profile data from detailed records.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.health_records.models import HealthProfile
from apps.health_records.services import HealthProfileService

User = get_user_model()


class Command(BaseCommand):
    help = 'Synchronize health profiles with detailed records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Specific user phone to sync (optional)'
        )
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Create profiles for patients without one'
        )

    def handle(self, *args, **options):
        self.stdout.write('Syncing health profiles...\n')
        
        if options['user']:
            # Sync specific user
            try:
                user = User.objects.get(phone=options['user'])
                self.sync_user(user)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User not found: {options['user']}"))
                return
        else:
            # Sync all patients
            patients = User.objects.filter(role='patient')
            
            synced = 0
            created = 0
            
            for patient in patients:
                try:
                    profile = HealthProfile.objects.get(user=patient)
                    self.sync_user(patient)
                    synced += 1
                except HealthProfile.DoesNotExist:
                    if options['create_missing']:
                        HealthProfileService.get_or_create_profile(patient)
                        self.sync_user(patient)
                        created += 1
                        self.stdout.write(f'  Created profile for {patient.phone}')
            
            self.stdout.write(self.style.SUCCESS(f'\nSynced {synced} profiles'))
            if created > 0:
                self.stdout.write(self.style.SUCCESS(f'Created {created} new profiles'))

    def sync_user(self, user):
        """Sync a single user's profile."""
        try:
            HealthProfileService.sync_allergies_from_records(user)
            HealthProfileService.sync_conditions_from_records(user)
            self.stdout.write(f'  Synced: {user.phone}')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  Failed to sync {user.phone}: {e}'))