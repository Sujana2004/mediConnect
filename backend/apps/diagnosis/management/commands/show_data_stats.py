"""
Django Management Command: Show Data Statistics
===============================================
Display statistics about loaded medical data.

Usage:
    python manage.py show_data_stats
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Avg
from apps.diagnosis.models import Symptom, Disease, DiseaseSymptomMapping, DiagnosisSession


class Command(BaseCommand):
    help = 'Display statistics about loaded medical data'
    
    def handle(self, *args, **options):
        self.stdout.write('\n' + '='*60)
        self.stdout.write('📊 MEDICAL DATA STATISTICS')
        self.stdout.write('='*60)
        
        # Symptom Statistics
        self.stdout.write(self.style.HTTP_INFO('\n🩺 SYMPTOMS:'))
        symptom_count = Symptom.objects.count()
        self.stdout.write(f'   Total: {symptom_count}')
        
        if symptom_count > 0:
            # By category
            categories = Symptom.objects.values('category').annotate(
                count=Count('id')
            ).order_by('-count')
            
            self.stdout.write('   By Category:')
            for cat in categories:
                self.stdout.write(f'      - {cat["category"]}: {cat["count"]}')
            
            # Severity distribution
            severities = Symptom.objects.values('severity_weight').annotate(
                count=Count('id')
            ).order_by('severity_weight')
            
            self.stdout.write('   By Severity Weight:')
            for sev in severities:
                self.stdout.write(f'      - Weight {sev["severity_weight"]}: {sev["count"]} symptoms')
        
        # Disease Statistics
        self.stdout.write(self.style.HTTP_INFO('\n🏥 DISEASES:'))
        disease_count = Disease.objects.count()
        self.stdout.write(f'   Total: {disease_count}')
        
        if disease_count > 0:
            # By severity
            severities = Disease.objects.values('typical_severity').annotate(
                count=Count('id')
            ).order_by('typical_severity')
            
            self.stdout.write('   By Severity:')
            for sev in severities:
                self.stdout.write(f'      - {sev["typical_severity"]}: {sev["count"]}')
            
            # By specialist
            specialists = Disease.objects.values('recommended_specialist').annotate(
                count=Count('id')
            ).order_by('-count')[:5]
            
            self.stdout.write('   Top Specialists:')
            for spec in specialists:
                self.stdout.write(f'      - {spec["recommended_specialist"]}: {spec["count"]}')
            
            # Emergency care
            emergency_count = Disease.objects.filter(requires_immediate_care=True).count()
            self.stdout.write(f'   Requires Emergency Care: {emergency_count}')
        
        # Mapping Statistics
        self.stdout.write(self.style.HTTP_INFO('\n🔗 DISEASE-SYMPTOM MAPPINGS:'))
        mapping_count = DiseaseSymptomMapping.objects.count()
        self.stdout.write(f'   Total: {mapping_count}')
        
        if mapping_count > 0:
            primary_count = DiseaseSymptomMapping.objects.filter(is_primary=True).count()
            self.stdout.write(f'   Primary Symptoms: {primary_count}')
            
            if disease_count > 0:
                avg_per_disease = mapping_count / disease_count
                self.stdout.write(f'   Avg Symptoms per Disease: {avg_per_disease:.1f}')
            
            # Diseases with most symptoms
            top_diseases = Disease.objects.annotate(
                symptom_count=Count('symptom_mappings')
            ).order_by('-symptom_count')[:5]
            
            self.stdout.write('   Diseases with Most Symptoms:')
            for d in top_diseases:
                self.stdout.write(f'      - {d.name_english}: {d.symptom_count}')
        
        # Session Statistics
        self.stdout.write(self.style.HTTP_INFO('\n📋 DIAGNOSIS SESSIONS:'))
        session_count = DiagnosisSession.objects.count()
        self.stdout.write(f'   Total: {session_count}')
        
        if session_count > 0:
            # By severity
            severities = DiagnosisSession.objects.values('severity_level').annotate(
                count=Count('id')
            ).order_by('severity_level')
            
            self.stdout.write('   By Severity:')
            for sev in severities:
                self.stdout.write(f'      - {sev["severity_level"]}: {sev["count"]}')
            
            # Feedback
            feedbacks = DiagnosisSession.objects.values('user_feedback').annotate(
                count=Count('id')
            ).order_by('-count')
            
            self.stdout.write('   By Feedback:')
            for fb in feedbacks:
                self.stdout.write(f'      - {fb["user_feedback"]}: {fb["count"]}')
        
        self.stdout.write('\n' + '='*60 + '\n')