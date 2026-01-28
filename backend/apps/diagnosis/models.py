"""
Diagnosis App - Database Models
================================
Models for storing symptoms, diseases, diagnosis sessions, and ML model metadata.

These models support:
- Multi-language (English, Telugu, Hindi)
- Symptom severity tracking
- Disease predictions with confidence scores
- User feedback for model improvement
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Symptom(models.Model):
    """
    Master table of all symptoms.
    
    Populated from: Symptom-severity.csv, Training.csv columns
    Supports multiple languages for village users.
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    # Symptom identification
    code = models.CharField(
        max_length=100, 
        unique=True, 
        db_index=True,
        help_text="Unique code like 'itching', 'skin_rash', etc."
    )
    
    # Names in different languages
    name_english = models.CharField(max_length=200)
    name_telugu = models.CharField(max_length=200, blank=True, default='')
    name_hindi = models.CharField(max_length=200, blank=True, default='')
    
    # Description
    description = models.TextField(blank=True, default='')
    description_telugu = models.TextField(blank=True, default='')
    description_hindi = models.TextField(blank=True, default='')
    
    # Categorization
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('respiratory', 'Respiratory'),
        ('digestive', 'Digestive'),
        ('cardiovascular', 'Cardiovascular'),
        ('neurological', 'Neurological'),
        ('musculoskeletal', 'Musculoskeletal'),
        ('skin', 'Skin'),
        ('mental', 'Mental Health'),
        ('urinary', 'Urinary'),
        ('eye', 'Eye'),
        ('ear', 'Ear'),
        ('reproductive', 'Reproductive'),
        ('other', 'Other'),
    ]
    category = models.CharField(
        max_length=20, 
        choices=CATEGORY_CHOICES, 
        default='general'
    )
    
    # Severity weight from Symptom-severity.csv
    severity_weight = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(7)],
        help_text="Severity weight 1-7 (from dataset)"
    )
    
    # Keywords for NLP matching (JSON list)
    keywords_english = models.JSONField(
        default=list, 
        blank=True,
        help_text="Alternative words/phrases for this symptom"
    )
    keywords_telugu = models.JSONField(default=list, blank=True)
    keywords_hindi = models.JSONField(default=list, blank=True)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'diagnosis_symptoms'
        ordering = ['name_english']
        verbose_name = 'Symptom'
        verbose_name_plural = 'Symptoms'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category']),
            models.Index(fields=['severity_weight']),
        ]
    
    def __str__(self):
        return f"{self.name_english} (weight: {self.severity_weight})"
    
    def get_name(self, language='en'):
        """Get symptom name in specified language."""
        if language == 'te' and self.name_telugu:
            return self.name_telugu
        elif language == 'hi' and self.name_hindi:
            return self.name_hindi
        return self.name_english
    
    def get_all_keywords(self):
        """Get all keywords across all languages for matching."""
        keywords = set()
        keywords.add(self.code.lower().replace('_', ' '))
        keywords.add(self.name_english.lower())
        
        if self.name_telugu:
            keywords.add(self.name_telugu)
        if self.name_hindi:
            keywords.add(self.name_hindi)
            
        keywords.update([k.lower() for k in self.keywords_english])
        keywords.update(self.keywords_telugu)
        keywords.update(self.keywords_hindi)
        
        return list(keywords)


class Disease(models.Model):
    """
    Master table of all diseases.
    
    Populated from: Training.csv 'prognosis' column, symptom_Description.csv
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    # Disease identification
    code = models.CharField(
        max_length=100, 
        unique=True, 
        db_index=True,
        help_text="Unique code like 'fungal_infection', 'common_cold'"
    )
    
    # Names in different languages
    name_english = models.CharField(max_length=200)
    name_telugu = models.CharField(max_length=200, blank=True, default='')
    name_hindi = models.CharField(max_length=200, blank=True, default='')
    
    # Description from symptom_Description.csv
    description = models.TextField(blank=True, default='')
    description_telugu = models.TextField(blank=True, default='')
    description_hindi = models.TextField(blank=True, default='')
    
    # Severity level
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
        ('critical', 'Critical'),
    ]
    typical_severity = models.CharField(
        max_length=10, 
        choices=SEVERITY_CHOICES, 
        default='moderate'
    )
    
    # Specialist recommendation
    SPECIALIST_CHOICES = [
        ('general', 'General Physician'),
        ('cardiologist', 'Cardiologist'),
        ('pulmonologist', 'Pulmonologist'),
        ('gastroenterologist', 'Gastroenterologist'),
        ('neurologist', 'Neurologist'),
        ('dermatologist', 'Dermatologist'),
        ('orthopedic', 'Orthopedic'),
        ('ent', 'ENT Specialist'),
        ('ophthalmologist', 'Ophthalmologist'),
        ('psychiatrist', 'Psychiatrist'),
        ('gynecologist', 'Gynecologist'),
        ('urologist', 'Urologist'),
        ('pediatrician', 'Pediatrician'),
        ('endocrinologist', 'Endocrinologist'),
        ('infectious', 'Infectious Disease Specialist'),
        ('emergency', 'Emergency Care'),
    ]
    recommended_specialist = models.CharField(
        max_length=20, 
        choices=SPECIALIST_CHOICES, 
        default='general'
    )
    
    # Precautions from symptom_precaution.csv
    precaution_1 = models.CharField(max_length=300, blank=True, default='')
    precaution_2 = models.CharField(max_length=300, blank=True, default='')
    precaution_3 = models.CharField(max_length=300, blank=True, default='')
    precaution_4 = models.CharField(max_length=300, blank=True, default='')
    
    # Telugu precautions
    precaution_1_telugu = models.CharField(max_length=300, blank=True, default='')
    precaution_2_telugu = models.CharField(max_length=300, blank=True, default='')
    precaution_3_telugu = models.CharField(max_length=300, blank=True, default='')
    precaution_4_telugu = models.CharField(max_length=300, blank=True, default='')
    
    # Hindi precautions
    precaution_1_hindi = models.CharField(max_length=300, blank=True, default='')
    precaution_2_hindi = models.CharField(max_length=300, blank=True, default='')
    precaution_3_hindi = models.CharField(max_length=300, blank=True, default='')
    precaution_4_hindi = models.CharField(max_length=300, blank=True, default='')
    
    # Flags
    requires_immediate_care = models.BooleanField(
        default=False,
        help_text="If True, show emergency warning"
    )
    is_contagious = models.BooleanField(default=False)
    
    # Related symptoms (ManyToMany through DiseaseSymptomMapping)
    symptoms = models.ManyToManyField(
        Symptom,
        through='DiseaseSymptomMapping',
        related_name='diseases'
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'diagnosis_diseases'
        ordering = ['name_english']
        verbose_name = 'Disease'
        verbose_name_plural = 'Diseases'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['typical_severity']),
            models.Index(fields=['recommended_specialist']),
        ]
    
    def __str__(self):
        return self.name_english
    
    def get_name(self, language='en'):
        """Get disease name in specified language."""
        if language == 'te' and self.name_telugu:
            return self.name_telugu
        elif language == 'hi' and self.name_hindi:
            return self.name_hindi
        return self.name_english
    
    def get_precautions(self, language='en'):
        """Get list of precautions in specified language."""
        if language == 'te':
            precautions = [
                self.precaution_1_telugu or self.precaution_1,
                self.precaution_2_telugu or self.precaution_2,
                self.precaution_3_telugu or self.precaution_3,
                self.precaution_4_telugu or self.precaution_4,
            ]
        elif language == 'hi':
            precautions = [
                self.precaution_1_hindi or self.precaution_1,
                self.precaution_2_hindi or self.precaution_2,
                self.precaution_3_hindi or self.precaution_3,
                self.precaution_4_hindi or self.precaution_4,
            ]
        else:
            precautions = [
                self.precaution_1,
                self.precaution_2,
                self.precaution_3,
                self.precaution_4,
            ]
        return [p for p in precautions if p]  # Filter empty


class DiseaseSymptomMapping(models.Model):
    """
    Mapping between diseases and symptoms.
    
    Stores which symptoms are associated with which diseases,
    along with the probability/weight of that association.
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    disease = models.ForeignKey(
        Disease, 
        on_delete=models.CASCADE,
        related_name='symptom_mappings'
    )
    symptom = models.ForeignKey(
        Symptom, 
        on_delete=models.CASCADE,
        related_name='disease_mappings'
    )
    
    # How strongly this symptom indicates this disease (0.0 to 1.0)
    weight = models.FloatField(
        default=0.5,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Probability that this symptom indicates this disease"
    )
    
    # Is this a primary/defining symptom?
    is_primary = models.BooleanField(
        default=False,
        help_text="Primary symptoms are key indicators"
    )
    
    class Meta:
        db_table = 'diagnosis_disease_symptom_mapping'
        unique_together = ['disease', 'symptom']
        verbose_name = 'Disease-Symptom Mapping'
        verbose_name_plural = 'Disease-Symptom Mappings'
    
    def __str__(self):
        return f"{self.disease.name_english} → {self.symptom.name_english}"


class DiagnosisSession(models.Model):
    """
    Records each diagnosis session/request.
    
    Stores:
    - User input (text/voice)
    - Extracted symptoms
    - Predicted diseases with confidence
    - Severity assessment
    - User feedback (for model improvement)
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    # Link to user (optional for anonymous)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='diagnosis_sessions'
    )
    
    # Session identifier
    session_id = models.CharField(
        max_length=100, 
        unique=True, 
        db_index=True
    )
    
    # Input information
    INPUT_TYPE_CHOICES = [
        ('text', 'Text'),
        ('voice', 'Voice'),
        ('selection', 'Symptom Selection'),
    ]
    input_type = models.CharField(
        max_length=10, 
        choices=INPUT_TYPE_CHOICES, 
        default='text'
    )
    
    # Original user input
    raw_input = models.TextField(
        help_text="Original text/transcription from user"
    )
    
    # Input language
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('te', 'Telugu'),
        ('hi', 'Hindi'),
    ]
    input_language = models.CharField(
        max_length=5, 
        choices=LANGUAGE_CHOICES, 
        default='en'
    )
    
    # Translated input (if not English)
    translated_input = models.TextField(
        blank=True, 
        default='',
        help_text="Input translated to English for processing"
    )
    
    # Patient information (optional)
    patient_age = models.PositiveIntegerField(null=True, blank=True)
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    patient_gender = models.CharField(
        max_length=10, 
        choices=GENDER_CHOICES, 
        blank=True, 
        default=''
    )
    symptom_duration_days = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="How many days symptoms have been present"
    )
    
    # Extracted symptoms (JSON list of symptom codes)
    extracted_symptoms = models.JSONField(
        default=list,
        help_text="List of symptom codes extracted from input"
    )
    extraction_confidence = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    
    # Disease predictions (JSON list)
    # Format: [{"disease_code": "...", "disease_name": "...", "confidence": 0.85}, ...]
    predictions = models.JSONField(
        default=list,
        help_text="List of predicted diseases with confidence scores"
    )
    
    # Top prediction reference
    top_prediction = models.ForeignKey(
        Disease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='top_predictions'
    )
    top_prediction_confidence = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    
    # Severity assessment
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    severity_level = models.CharField(
        max_length=10, 
        choices=SEVERITY_CHOICES, 
        default='low'
    )
    severity_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="Severity score 0-100"
    )
    
    # Recommendations
    recommended_specialist = models.CharField(max_length=50, blank=True, default='')
    recommendations = models.JSONField(
        default=list,
        help_text="List of recommendations/precautions"
    )
    requires_emergency_care = models.BooleanField(default=False)
    
    # Response (what was shown to user)
    response_text = models.TextField(blank=True, default='')
    response_language = models.CharField(
        max_length=5, 
        choices=LANGUAGE_CHOICES, 
        default='en'
    )
    
    # User feedback
    FEEDBACK_CHOICES = [
        ('none', 'No Feedback'),
        ('helpful', 'Helpful'),
        ('not_helpful', 'Not Helpful'),
        ('incorrect', 'Incorrect'),
    ]
    user_feedback = models.CharField(
        max_length=15, 
        choices=FEEDBACK_CHOICES, 
        default='none'
    )
    feedback_comment = models.TextField(blank=True, default='')
    
    # Actual diagnosis (if confirmed by doctor later)
    actual_disease = models.ForeignKey(
        Disease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_diagnoses',
        help_text="Actual diagnosis confirmed by doctor"
    )
    
    # Performance metrics
    processing_time_ms = models.PositiveIntegerField(
        default=0,
        help_text="Time taken to process in milliseconds"
    )
    
    # Device/context information
    device_type = models.CharField(max_length=20, blank=True, default='')
    app_version = models.CharField(max_length=20, blank=True, default='')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'diagnosis_sessions'
        ordering = ['-created_at']
        verbose_name = 'Diagnosis Session'
        verbose_name_plural = 'Diagnosis Sessions'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['session_id']),
            models.Index(fields=['created_at']),
            models.Index(fields=['severity_level']),
            models.Index(fields=['user_feedback']),
            models.Index(fields=['input_language']),
        ]
    
    def __str__(self):
        return f"Session {self.session_id[:8]} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        # Generate session_id if not provided
        if not self.session_id:
            self.session_id = f"DIAG-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)
    
    def mark_completed(self):
        """Mark session as completed."""
        self.completed_at = timezone.now()
        self.save(update_fields=['completed_at'])


class MLModelMetadata(models.Model):
    """
    Track ML model versions and performance.
    
    Allows:
    - Model versioning
    - A/B testing different models
    - Performance tracking
    - Rollback to previous versions
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    MODEL_TYPE_CHOICES = [
        ('symptom_extractor', 'Symptom Extractor (NER)'),
        ('disease_predictor', 'Disease Predictor'),
        ('severity_assessor', 'Severity Assessor'),
    ]
    model_type = models.CharField(
        max_length=20, 
        choices=MODEL_TYPE_CHOICES
    )
    
    # Version info
    version = models.CharField(max_length=20)  # e.g., "1.0.0"
    model_name = models.CharField(max_length=100)  # e.g., "RandomForest_v1"
    
    # File path
    model_file_path = models.CharField(
        max_length=500,
        help_text="Path to saved model file (.pkl, .joblib, etc.)"
    )
    
    # Performance metrics
    accuracy = models.FloatField(default=0.0)
    precision = models.FloatField(default=0.0)
    recall = models.FloatField(default=0.0)
    f1_score = models.FloatField(default=0.0)
    
    # Training info
    training_samples = models.PositiveIntegerField(default=0)
    training_duration_seconds = models.PositiveIntegerField(default=0)
    trained_at = models.DateTimeField()
    
    # Configuration used
    hyperparameters = models.JSONField(
        default=dict,
        help_text="Model hyperparameters used during training"
    )
    
    # Status
    is_active = models.BooleanField(
        default=False,
        help_text="Only one model per type should be active"
    )
    
    # Notes
    notes = models.TextField(blank=True, default='')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'diagnosis_ml_models'
        unique_together = ['model_type', 'version']
        ordering = ['-created_at']
        verbose_name = 'ML Model'
        verbose_name_plural = 'ML Models'
    
    def __str__(self):
        status = "✓ ACTIVE" if self.is_active else "inactive"
        return f"{self.model_type} v{self.version} ({status})"
    
    def activate(self):
        """Activate this model and deactivate others of same type."""
        # Deactivate all other models of same type
        MLModelMetadata.objects.filter(
            model_type=self.model_type
        ).update(is_active=False)
        
        # Activate this one
        self.is_active = True
        self.save(update_fields=['is_active'])


class SymptomSynonym(models.Model):
    """
    Store synonyms and alternative phrases for symptoms.
    
    Helps in NLP matching when users describe symptoms differently.
    Example: "headache" can be "head pain", "my head hurts", "తలనొప్పి"
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    symptom = models.ForeignKey(
        Symptom,
        on_delete=models.CASCADE,
        related_name='synonyms'
    )
    
    # The synonym/alternative phrase
    phrase = models.CharField(max_length=200)
    
    # Language of this synonym
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('te', 'Telugu'),
        ('hi', 'Hindi'),
    ]
    language = models.CharField(
        max_length=5, 
        choices=LANGUAGE_CHOICES, 
        default='en'
    )
    
    # Is this a common phrase?
    is_common = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'diagnosis_symptom_synonyms'
        unique_together = ['symptom', 'phrase', 'language']
        verbose_name = 'Symptom Synonym'
        verbose_name_plural = 'Symptom Synonyms'
        indexes = [
            models.Index(fields=['phrase']),
            models.Index(fields=['language']),
        ]
    
    def __str__(self):
        return f"{self.symptom.name_english} → {self.phrase} ({self.language})"