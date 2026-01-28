from django.apps import AppConfig

class DiagnosisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.diagnosis'
    verbose_name = 'Diagnosis & Symptom Checker'

    def ready(self):
        """
        Initialize ML models when Django starts.
        This ensures models are loaded once and cached.
        """
        # Import signals if needed
        pass