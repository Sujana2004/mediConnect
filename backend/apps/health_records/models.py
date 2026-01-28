"""
Health Records Models for MediConnect
=====================================
Stores medical history, documents, lab reports, vaccination records, etc.
Designed for rural users with simple data structures.
"""

import uuid
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Abstract base model with timestamp fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class HealthProfile(TimeStampedModel):
    """
    Extended health profile for a patient.
    Stores chronic conditions, allergies, blood group, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='health_profile'
    )
    
    # Basic Health Info
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A Positive'),
        ('A-', 'A Negative'),
        ('B+', 'B Positive'),
        ('B-', 'B Negative'),
        ('AB+', 'AB Positive'),
        ('AB-', 'AB Negative'),
        ('O+', 'O Positive'),
        ('O-', 'O Negative'),
        ('unknown', 'Unknown'),
    ]
    blood_group = models.CharField(
        max_length=10,
        choices=BLOOD_GROUP_CHOICES,
        default='unknown'
    )
    
    height_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Height in centimeters"
    )
    weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Weight in kilograms"
    )
    
    # Allergies (stored as JSON list)
    allergies = models.JSONField(
        default=list,
        blank=True,
        help_text="List of allergies"
    )
    
    # Chronic Conditions (stored as JSON list)
    chronic_conditions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of chronic conditions like diabetes, hypertension"
    )
    
    # Current Medications (quick reference)
    current_medications = models.JSONField(
        default=list,
        blank=True,
        help_text="List of current medications"
    )
    
    # Family Medical History
    family_history = models.JSONField(
        default=dict,
        blank=True,
        help_text="Family medical history"
    )
    
    # Lifestyle
    SMOKING_CHOICES = [
        ('never', 'Never'),
        ('former', 'Former Smoker'),
        ('current', 'Current Smoker'),
        ('unknown', 'Unknown'),
    ]
    smoking_status = models.CharField(
        max_length=20,
        choices=SMOKING_CHOICES,
        default='unknown'
    )
    
    ALCOHOL_CHOICES = [
        ('never', 'Never'),
        ('occasional', 'Occasional'),
        ('regular', 'Regular'),
        ('former', 'Former'),
        ('unknown', 'Unknown'),
    ]
    alcohol_consumption = models.CharField(
        max_length=20,
        choices=ALCOHOL_CHOICES,
        default='unknown'
    )
    
    # Emergency Info
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True)
    
    # Notes
    notes = models.TextField(blank=True, help_text="Additional health notes")
    
    class Meta:
        db_table = 'health_records_profile'
        verbose_name = 'Health Profile'
        verbose_name_plural = 'Health Profiles'

    def __str__(self):
        return f"Health Profile - {self.user.phone}"

    def get_bmi(self):
        """Calculate BMI if height and weight are available."""
        if self.height_cm and self.weight_kg and self.height_cm > 0:
            height_m = float(self.height_cm) / 100
            bmi = float(self.weight_kg) / (height_m ** 2)
            return round(bmi, 2)
        return None

    def get_bmi_category(self):
        """Get BMI category."""
        bmi = self.get_bmi()
        if bmi is None:
            return 'Unknown'
        if bmi < 18.5:
            return 'Underweight'
        elif bmi < 25:
            return 'Normal'
        elif bmi < 30:
            return 'Overweight'
        else:
            return 'Obese'


class MedicalCondition(TimeStampedModel):
    """
    Track medical conditions/diagnoses over time.
    Links to diagnosis app when applicable.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medical_conditions'
    )
    
    condition_name = models.CharField(max_length=200)
    condition_name_local = models.CharField(
        max_length=200,
        blank=True,
        help_text="Condition name in local language"
    )
    
    # ICD-10 code if available
    icd_code = models.CharField(max_length=20, blank=True)
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('managed', 'Managed/Controlled'),
        ('recurring', 'Recurring'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ]
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='moderate'
    )
    
    diagnosed_date = models.DateField(null=True, blank=True)
    resolved_date = models.DateField(null=True, blank=True)
    
    diagnosed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='diagnosed_conditions'
    )
    
    # Link to diagnosis session if applicable
    diagnosis_session = models.ForeignKey(
        'diagnosis.DiagnosisSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='medical_conditions'
    )
    
    # Link to consultation if applicable
    consultation = models.ForeignKey(
        'consultation.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='medical_conditions'
    )
    
    treatment_notes = models.TextField(blank=True)
    
    is_chronic = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'health_records_condition'
        verbose_name = 'Medical Condition'
        verbose_name_plural = 'Medical Conditions'
        ordering = ['-diagnosed_date', '-created_at']

    def __str__(self):
        return f"{self.condition_name} - {self.user.phone}"


class MedicalDocument(TimeStampedModel):
    """
    Store medical documents (prescriptions, lab reports, X-rays, etc.)
    Files are stored in Supabase Storage (production) or local storage (development).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medical_documents'
    )
    
    DOCUMENT_TYPE_CHOICES = [
        ('prescription', 'Prescription'),
        ('lab_report', 'Lab Report'),
        ('xray', 'X-Ray'),
        ('mri', 'MRI Scan'),
        ('ct_scan', 'CT Scan'),
        ('ultrasound', 'Ultrasound'),
        ('ecg', 'ECG/EKG'),
        ('blood_report', 'Blood Test Report'),
        ('urine_report', 'Urine Test Report'),
        ('discharge_summary', 'Discharge Summary'),
        ('medical_certificate', 'Medical Certificate'),
        ('insurance', 'Insurance Document'),
        ('vaccination', 'Vaccination Certificate'),
        ('other', 'Other'),
    ]
    document_type = models.CharField(
        max_length=30,
        choices=DOCUMENT_TYPE_CHOICES,
        default='other'
    )
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # File storage path (in Supabase or local storage)
    file_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Path to file in Supabase Storage"
    )
    
    # File metadata
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    file_type = models.CharField(max_length=20, blank=True, help_text="File extension")
    original_filename = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    
    # Storage type
    STORAGE_CHOICES = [
        ('local', 'Local Storage'),
        ('supabase', 'Supabase Storage'),
    ]
    storage_type = models.CharField(
        max_length=20,
        choices=STORAGE_CHOICES,
        default='supabase'
    )
    
    # Document date
    document_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date on the document"
    )
    
    # Source
    hospital_name = models.CharField(max_length=200, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    
    # Links to other records
    consultation = models.ForeignKey(
        'consultation.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_documents'
    )
    
    medical_condition = models.ForeignKey(
        'MedicalCondition',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents'
    )
    
    # Sharing
    is_shared_with_doctors = models.BooleanField(
        default=True,
        help_text="Allow doctors to view this document"
    )
    
    # Tags
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'health_records_document'
        verbose_name = 'Medical Document'
        verbose_name_plural = 'Medical Documents'
        ordering = ['-document_date', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.phone}"

    def get_file_url(self, expiry_seconds: int = 3600) -> str:
        """Get signed URL for file access."""
        if not self.file_path:
            return None
        
        from .services.supabase_storage import get_storage_service
        storage = get_storage_service()
        return storage.get_file_url(self.file_path, expiry_seconds)

    def delete_file(self) -> bool:
        """Delete file from storage."""
        if not self.file_path:
            return False
        
        from .services.supabase_storage import get_storage_service
        storage = get_storage_service()
        return storage.delete_file(self.file_path)

    @property
    def file_size_display(self) -> str:
        """Get human-readable file size."""
        size = self.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"

    @property
    def has_file(self) -> bool:
        """Check if document has an uploaded file."""
        return bool(self.file_path)


class LabReport(TimeStampedModel):
    """
    Structured lab report data with test results.
    Allows tracking of values over time.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lab_reports'
    )
    
    report_name = models.CharField(max_length=200)
    
    LAB_TYPE_CHOICES = [
        ('blood', 'Blood Test'),
        ('urine', 'Urine Test'),
        ('stool', 'Stool Test'),
        ('thyroid', 'Thyroid Panel'),
        ('lipid', 'Lipid Profile'),
        ('liver', 'Liver Function'),
        ('kidney', 'Kidney Function'),
        ('diabetes', 'Diabetes Panel'),
        ('vitamin', 'Vitamin Panel'),
        ('hormone', 'Hormone Panel'),
        ('allergy', 'Allergy Test'),
        ('infection', 'Infection Panel'),
        ('other', 'Other'),
    ]
    lab_type = models.CharField(
        max_length=20,
        choices=LAB_TYPE_CHOICES,
        default='blood'
    )
    
    test_date = models.DateField()
    
    lab_name = models.CharField(max_length=200, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    
    # Test results stored as JSON
    # Format: [{"name": "Hemoglobin", "value": "14.5", "unit": "g/dL", "normal_range": "13.5-17.5", "status": "normal"}]
    results = models.JSONField(
        default=list,
        help_text="List of test results"
    )
    
    # Overall status
    STATUS_CHOICES = [
        ('normal', 'All Normal'),
        ('abnormal', 'Some Abnormal'),
        ('critical', 'Critical Values'),
        ('pending', 'Pending Review'),
    ]
    overall_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Doctor's interpretation
    interpretation = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    
    # Link to document
    document = models.OneToOneField(
        MedicalDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_report_data'
    )
    
    # Link to consultation
    consultation = models.ForeignKey(
        'consultation.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_reports'
    )
    
    class Meta:
        db_table = 'health_records_lab_report'
        verbose_name = 'Lab Report'
        verbose_name_plural = 'Lab Reports'
        ordering = ['-test_date', '-created_at']

    def __str__(self):
        return f"{self.report_name} - {self.test_date}"

    def get_abnormal_results(self):
        """Get list of abnormal results."""
        return [r for r in self.results if r.get('status') in ['low', 'high', 'abnormal', 'critical']]


class VaccinationRecord(TimeStampedModel):
    """
    Track vaccination history.
    Important for rural healthcare.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vaccination_records'
    )
    
    vaccine_name = models.CharField(max_length=200)
    vaccine_name_local = models.CharField(max_length=200, blank=True)
    
    VACCINE_TYPE_CHOICES = [
        ('covid', 'COVID-19'),
        ('flu', 'Influenza'),
        ('hepatitis_a', 'Hepatitis A'),
        ('hepatitis_b', 'Hepatitis B'),
        ('typhoid', 'Typhoid'),
        ('tetanus', 'Tetanus'),
        ('rabies', 'Rabies'),
        ('polio', 'Polio'),
        ('mmr', 'MMR'),
        ('bcg', 'BCG'),
        ('dpt', 'DPT'),
        ('chickenpox', 'Chickenpox'),
        ('hpv', 'HPV'),
        ('pneumonia', 'Pneumonia'),
        ('meningitis', 'Meningitis'),
        ('yellow_fever', 'Yellow Fever'),
        ('other', 'Other'),
    ]
    vaccine_type = models.CharField(
        max_length=20,
        choices=VACCINE_TYPE_CHOICES,
        default='other'
    )
    
    dose_number = models.PositiveSmallIntegerField(
        default=1,
        help_text="Dose number (1, 2, 3, etc.)"
    )
    total_doses = models.PositiveSmallIntegerField(
        default=1,
        help_text="Total doses required"
    )
    
    vaccination_date = models.DateField()
    next_due_date = models.DateField(null=True, blank=True)
    
    administered_by = models.CharField(max_length=200, blank=True)
    administered_at = models.CharField(
        max_length=200,
        blank=True,
        help_text="Hospital/Clinic name"
    )
    
    batch_number = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    
    # Side effects
    side_effects = models.TextField(blank=True)
    
    # Certificate
    certificate = models.ForeignKey(
        MedicalDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccination_record'
    )
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_vaccinations'
    )
    
    class Meta:
        db_table = 'health_records_vaccination'
        verbose_name = 'Vaccination Record'
        verbose_name_plural = 'Vaccination Records'
        ordering = ['-vaccination_date']

    def __str__(self):
        return f"{self.vaccine_name} (Dose {self.dose_number}) - {self.user.phone}"

    @property
    def is_complete(self):
        """Check if all doses are complete."""
        return self.dose_number >= self.total_doses

    @property
    def is_due(self):
        """Check if next dose is due."""
        if self.next_due_date and self.next_due_date <= timezone.now().date():
            return True
        return False


class Allergy(TimeStampedModel):
    """
    Detailed allergy information.
    Critical for patient safety.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='allergy_records'
    )
    
    allergen = models.CharField(max_length=200)
    allergen_local = models.CharField(max_length=200, blank=True)
    
    ALLERGY_TYPE_CHOICES = [
        ('drug', 'Drug/Medication'),
        ('food', 'Food'),
        ('environmental', 'Environmental'),
        ('insect', 'Insect'),
        ('latex', 'Latex'),
        ('animal', 'Animal'),
        ('other', 'Other'),
    ]
    allergy_type = models.CharField(
        max_length=20,
        choices=ALLERGY_TYPE_CHOICES,
        default='other'
    )
    
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
        ('life_threatening', 'Life Threatening'),
    ]
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='moderate'
    )
    
    reaction = models.TextField(
        help_text="Description of allergic reaction"
    )
    
    first_observed = models.DateField(null=True, blank=True)
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive/Outgrown'),
        ('suspected', 'Suspected'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    diagnosed_by = models.CharField(max_length=200, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'health_records_allergy'
        verbose_name = 'Allergy'
        verbose_name_plural = 'Allergies'
        ordering = ['-severity', 'allergen']

    def __str__(self):
        return f"{self.allergen} ({self.severity}) - {self.user.phone}"


class FamilyMedicalHistory(TimeStampedModel):
    """
    Track family medical history.
    Important for genetic/hereditary conditions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='family_medical_history'
    )
    
    RELATION_CHOICES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('brother', 'Brother'),
        ('sister', 'Sister'),
        ('grandfather_paternal', 'Grandfather (Paternal)'),
        ('grandmother_paternal', 'Grandmother (Paternal)'),
        ('grandfather_maternal', 'Grandfather (Maternal)'),
        ('grandmother_maternal', 'Grandmother (Maternal)'),
        ('uncle', 'Uncle'),
        ('aunt', 'Aunt'),
        ('child', 'Child'),
        ('spouse', 'Spouse'),
        ('other', 'Other'),
    ]
    relation = models.CharField(
        max_length=30,
        choices=RELATION_CHOICES
    )
    
    relation_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of the relative (optional)"
    )
    
    condition = models.CharField(max_length=200)
    condition_local = models.CharField(max_length=200, blank=True)
    
    age_at_diagnosis = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Age when condition was diagnosed"
    )
    
    is_deceased = models.BooleanField(default=False)
    age_at_death = models.PositiveSmallIntegerField(null=True, blank=True)
    cause_of_death = models.CharField(max_length=200, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'health_records_family_history'
        verbose_name = 'Family Medical History'
        verbose_name_plural = 'Family Medical Histories'
        ordering = ['relation', 'condition']

    def __str__(self):
        return f"{self.relation} - {self.condition}"


class Hospitalization(TimeStampedModel):
    """
    Track hospitalization/admission history.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hospitalizations'
    )
    
    hospital_name = models.CharField(max_length=200)
    hospital_address = models.TextField(blank=True)
    
    admission_date = models.DateField()
    discharge_date = models.DateField(null=True, blank=True)
    
    ADMISSION_TYPE_CHOICES = [
        ('emergency', 'Emergency'),
        ('planned', 'Planned/Scheduled'),
        ('transfer', 'Transfer'),
    ]
    admission_type = models.CharField(
        max_length=20,
        choices=ADMISSION_TYPE_CHOICES,
        default='emergency'
    )
    
    reason = models.TextField(help_text="Reason for admission")
    diagnosis = models.TextField(blank=True)
    
    treating_doctor = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Procedures/Surgeries
    procedures = models.JSONField(
        default=list,
        blank=True,
        help_text="List of procedures performed"
    )
    
    discharge_summary = models.TextField(blank=True)
    
    # Link to document
    discharge_document = models.ForeignKey(
        MedicalDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hospitalization'
    )
    
    # Link to consultation
    consultation = models.ForeignKey(
        'consultation.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hospitalizations'
    )
    
    # Follow-up
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'health_records_hospitalization'
        verbose_name = 'Hospitalization'
        verbose_name_plural = 'Hospitalizations'
        ordering = ['-admission_date']

    def __str__(self):
        return f"{self.hospital_name} - {self.admission_date}"

    @property
    def duration_days(self):
        """Calculate hospital stay duration."""
        if self.discharge_date:
            return (self.discharge_date - self.admission_date).days
        return None


class VitalSign(TimeStampedModel):
    """
    Track vital signs over time.
    Useful for monitoring health trends.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vital_signs'
    )
    
    recorded_at = models.DateTimeField(default=timezone.now)
    
    # Blood Pressure
    systolic_bp = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Systolic blood pressure (mmHg)"
    )
    diastolic_bp = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Diastolic blood pressure (mmHg)"
    )
    
    # Heart Rate
    heart_rate = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Heart rate (bpm)"
    )
    
    # Temperature
    temperature = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Body temperature (°F)"
    )
    
    # Respiratory Rate
    respiratory_rate = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Breaths per minute"
    )
    
    # Oxygen Saturation
    oxygen_saturation = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="SpO2 (%)"
    )
    
    # Blood Sugar
    blood_sugar = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Blood glucose (mg/dL)"
    )
    SUGAR_TYPE_CHOICES = [
        ('fasting', 'Fasting'),
        ('pp', 'Post Prandial'),
        ('random', 'Random'),
    ]
    blood_sugar_type = models.CharField(
        max_length=10,
        choices=SUGAR_TYPE_CHOICES,
        blank=True
    )
    
    # Weight (for tracking)
    weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Source
    SOURCE_CHOICES = [
        ('self', 'Self Recorded'),
        ('clinic', 'Clinic/Hospital'),
        ('home_device', 'Home Device'),
        ('consultation', 'During Consultation'),
    ]
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='self'
    )
    
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_vitals'
    )
    
    notes = models.TextField(blank=True)
    
    # Link to consultation
    consultation = models.ForeignKey(
        'consultation.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vital_signs'
    )
    
    class Meta:
        db_table = 'health_records_vital_sign'
        verbose_name = 'Vital Sign'
        verbose_name_plural = 'Vital Signs'
        ordering = ['-recorded_at']

    def __str__(self):
        return f"Vitals - {self.user.phone} - {self.recorded_at}"

    def get_bp_status(self):
        """Get blood pressure status."""
        if not self.systolic_bp or not self.diastolic_bp:
            return 'unknown'
        if self.systolic_bp < 90 or self.diastolic_bp < 60:
            return 'low'
        elif self.systolic_bp < 120 and self.diastolic_bp < 80:
            return 'normal'
        elif self.systolic_bp < 140 or self.diastolic_bp < 90:
            return 'elevated'
        else:
            return 'high'


class SharedRecord(TimeStampedModel):
    """
    Track which records are shared with which doctors.
    Supports temporary and permanent sharing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shared_records'
    )
    
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_shared_records'
    )
    
    SHARE_TYPE_CHOICES = [
        ('all', 'All Records'),
        ('profile', 'Health Profile Only'),
        ('documents', 'Specific Documents'),
        ('conditions', 'Medical Conditions'),
        ('lab_reports', 'Lab Reports'),
        ('vaccinations', 'Vaccination Records'),
    ]
    share_type = models.CharField(
        max_length=20,
        choices=SHARE_TYPE_CHOICES,
        default='all'
    )
    
    # For specific document sharing
    documents = models.ManyToManyField(
        MedicalDocument,
        blank=True,
        related_name='shared_with'
    )
    
    # Validity
    is_permanent = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Access tracking
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    access_count = models.PositiveIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    # Link to consultation (auto-share during consultation)
    consultation = models.ForeignKey(
        'consultation.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shared_records'
    )
    
    class Meta:
        db_table = 'health_records_shared'
        verbose_name = 'Shared Record'
        verbose_name_plural = 'Shared Records'
        unique_together = ['patient', 'doctor', 'share_type', 'consultation']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient.phone} shared with {self.doctor.phone}"

    def is_expired(self):
        """Check if sharing has expired."""
        if self.is_permanent:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return True
        return False

    def record_access(self):
        """Record when doctor accesses the shared records."""
        self.last_accessed_at = timezone.now()
        self.access_count += 1
        self.save(update_fields=['last_accessed_at', 'access_count'])