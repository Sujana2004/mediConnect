"""
Medicine App Models for MediConnect.

Models:
1. Medicine - Medicine database (Indian medicines)
2. MedicineAlternative - Generic/alternative medicines
3. DrugInteraction - Drug interaction warnings
4. UserPrescription - User's prescriptions
5. PrescriptionMedicine - Medicines in a prescription
6. MedicineReminder - Dosage reminders
7. ReminderLog - Track reminder history
"""

import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Medicine(models.Model):
    """
    Medicine database.
    Contains Indian medicines with details.
    """
    
    MEDICINE_TYPES = [
        ('tablet', 'Tablet'),
        ('capsule', 'Capsule'),
        ('syrup', 'Syrup'),
        ('injection', 'Injection'),
        ('drops', 'Drops'),
        ('cream', 'Cream/Ointment'),
        ('gel', 'Gel'),
        ('powder', 'Powder'),
        ('inhaler', 'Inhaler'),
        ('spray', 'Spray'),
        ('patch', 'Patch'),
        ('suppository', 'Suppository'),
        ('suspension', 'Suspension'),
        ('solution', 'Solution'),
        ('other', 'Other'),
    ]
    
    PRESCRIPTION_TYPES = [
        ('otc', 'Over The Counter'),
        ('prescription', 'Prescription Required'),
        ('controlled', 'Controlled Substance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    name = models.CharField(max_length=255, db_index=True)
    name_generic = models.CharField(
        max_length=255, 
        db_index=True,
        help_text='Generic/salt name'
    )
    name_local = models.CharField(
        max_length=255, 
        blank=True,
        help_text='Name in local language (Telugu/Hindi)'
    )
    
    # Brand & Manufacturer
    brand_name = models.CharField(max_length=255, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    
    # Type & Form
    medicine_type = models.CharField(
        max_length=20, 
        choices=MEDICINE_TYPES,
        default='tablet'
    )
    strength = models.CharField(
        max_length=100, 
        blank=True,
        help_text='e.g., 500mg, 10ml'
    )
    pack_size = models.CharField(
        max_length=100, 
        blank=True,
        help_text='e.g., 10 tablets, 100ml bottle'
    )
    
    # Prescription Type
    prescription_type = models.CharField(
        max_length=20,
        choices=PRESCRIPTION_TYPES,
        default='prescription'
    )
    
    # Price (in INR)
    mrp = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum Retail Price in INR'
    )
    
    # Composition
    composition = models.TextField(
        blank=True,
        help_text='Active ingredients and their quantities'
    )
    
    # Usage Information
    uses = models.TextField(
        blank=True,
        help_text='What the medicine is used for'
    )
    uses_local = models.TextField(
        blank=True,
        help_text='Uses in local language'
    )
    
    # Dosage Information
    dosage_info = models.TextField(
        blank=True,
        help_text='General dosage instructions'
    )
    dosage_info_local = models.TextField(
        blank=True,
        help_text='Dosage in local language'
    )
    
    # Side Effects
    side_effects = models.TextField(
        blank=True,
        help_text='Common side effects'
    )
    side_effects_local = models.TextField(
        blank=True,
        help_text='Side effects in local language'
    )
    
    # Warnings
    warnings = models.TextField(
        blank=True,
        help_text='Important warnings and precautions'
    )
    warnings_local = models.TextField(
        blank=True,
        help_text='Warnings in local language'
    )
    
    # Contraindications
    contraindications = models.TextField(
        blank=True,
        help_text='When NOT to use this medicine'
    )
    
    # Storage
    storage_info = models.CharField(
        max_length=255,
        blank=True,
        default='Store in a cool, dry place away from sunlight'
    )
    
    # Categories/Tags for searching
    category = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text='e.g., Antibiotic, Painkiller, Antacid'
    )
    subcategory = models.CharField(max_length=100, blank=True)
    
    # Flags
    is_generic = models.BooleanField(
        default=False,
        help_text='Is this a generic medicine?'
    )
    is_habit_forming = models.BooleanField(default=False)
    requires_refrigeration = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medicines'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'is_active']),
            models.Index(fields=['name_generic', 'is_active']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['manufacturer']),
            models.Index(fields=['is_generic', 'is_active']),
        ]
    
    def __str__(self):
        if self.strength:
            return f"{self.name} ({self.strength})"
        return self.name
    
    def get_name(self, language='en'):
        """Get name in specified language."""
        if language in ['te', 'hi'] and self.name_local:
            return self.name_local
        return self.name
    
    def get_uses(self, language='en'):
        """Get uses in specified language."""
        if language in ['te', 'hi'] and self.uses_local:
            return self.uses_local
        return self.uses


class MedicineAlternative(models.Model):
    """
    Generic/alternative medicines for a brand medicine.
    Helps users find cheaper alternatives.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name='alternatives'
    )
    alternative = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name='alternative_for'
    )
    
    # Similarity score (how similar/equivalent)
    similarity_score = models.PositiveSmallIntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text='100 = exact same composition'
    )
    
    # Price comparison
    price_difference_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Negative = cheaper alternative'
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        help_text='Any notes about the alternative'
    )
    
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medicine_alternatives'
        unique_together = ['medicine', 'alternative']
        ordering = ['-similarity_score', 'price_difference_percent']
    
    def __str__(self):
        return f"{self.medicine.name} → {self.alternative.name}"


class DrugInteraction(models.Model):
    """
    Drug-drug interaction warnings.
    Critical for patient safety.
    """
    
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
        ('contraindicated', 'Contraindicated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    medicine_1 = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name='interactions_as_first'
    )
    medicine_2 = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name='interactions_as_second'
    )
    
    # Severity
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='moderate'
    )
    
    # Description
    description = models.TextField(
        help_text='Description of the interaction'
    )
    description_local = models.TextField(
        blank=True,
        help_text='Description in local language'
    )
    
    # Effects
    effect = models.TextField(
        blank=True,
        help_text='What happens when taken together'
    )
    
    # Recommendation
    recommendation = models.TextField(
        blank=True,
        help_text='What to do if interaction occurs'
    )
    recommendation_local = models.TextField(blank=True)
    
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'drug_interactions'
        unique_together = ['medicine_1', 'medicine_2']
        ordering = ['-severity']
        indexes = [
            models.Index(fields=['medicine_1', 'severity']),
            models.Index(fields=['medicine_2', 'severity']),
        ]
    
    def __str__(self):
        return f"{self.medicine_1.name} + {self.medicine_2.name} ({self.severity})"
    
    def get_description(self, language='en'):
        """Get description in specified language."""
        if language in ['te', 'hi'] and self.description_local:
            return self.description_local
        return self.description


class UserPrescription(models.Model):
    """
    User's prescriptions from doctors.
    Can be manually added or from consultation.
    """
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('discontinued', 'Discontinued'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prescriptions'
    )
    
    # Prescription details
    title = models.CharField(
        max_length=255,
        help_text='e.g., "For Fever", "Diabetes Medication"'
    )
    doctor_name = models.CharField(max_length=255, blank=True)
    hospital_name = models.CharField(max_length=255, blank=True)
    
    # Dates
    prescribed_date = models.DateField()
    valid_until = models.DateField(
        null=True,
        blank=True,
        help_text='Prescription validity'
    )
    
    # Diagnosis/Condition
    diagnosis = models.TextField(
        blank=True,
        help_text='What condition is being treated'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Prescription image (optional)
    image_url = models.URLField(
        blank=True,
        null=True,
        help_text='Uploaded prescription image'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_prescriptions'
        ordering = ['-prescribed_date']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', '-prescribed_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.phone_number}"
    
    @property
    def is_expired(self):
        """Check if prescription is expired."""
        if self.valid_until:
            return self.valid_until < timezone.now().date()
        return False


class PrescriptionMedicine(models.Model):
    """
    Individual medicines in a prescription.
    Links prescription to medicines with dosage details.
    """
    
    FREQUENCY_CHOICES = [
        ('once_daily', 'Once Daily'),
        ('twice_daily', 'Twice Daily'),
        ('thrice_daily', 'Three Times Daily'),
        ('four_times', 'Four Times Daily'),
        ('every_4_hours', 'Every 4 Hours'),
        ('every_6_hours', 'Every 6 Hours'),
        ('every_8_hours', 'Every 8 Hours'),
        ('every_12_hours', 'Every 12 Hours'),
        ('weekly', 'Once a Week'),
        ('as_needed', 'As Needed (SOS)'),
        ('custom', 'Custom Schedule'),
    ]
    
    TIMING_CHOICES = [
        ('before_food', 'Before Food'),
        ('after_food', 'After Food'),
        ('with_food', 'With Food'),
        ('empty_stomach', 'Empty Stomach'),
        ('bedtime', 'At Bedtime'),
        ('morning', 'Morning'),
        ('any_time', 'Any Time'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    prescription = models.ForeignKey(
        UserPrescription,
        on_delete=models.CASCADE,
        related_name='medicines'
    )
    
    # Medicine (can be from database or custom)
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='in_prescriptions'
    )
    medicine_name = models.CharField(
        max_length=255,
        help_text='Medicine name (if not in database)'
    )
    
    # Dosage
    dosage = models.CharField(
        max_length=100,
        help_text='e.g., "1 tablet", "5ml", "2 drops"'
    )
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='once_daily'
    )
    timing = models.CharField(
        max_length=20,
        choices=TIMING_CHOICES,
        default='after_food'
    )
    
    # Custom schedule (if frequency is 'custom')
    custom_times = models.JSONField(
        default=list,
        blank=True,
        help_text='List of times like ["08:00", "14:00", "20:00"]'
    )
    
    # Duration
    duration_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of days to take'
    )
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    
    # Special instructions
    special_instructions = models.TextField(
        blank=True,
        help_text='Any special instructions'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Quantity
    quantity_prescribed = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Total quantity prescribed'
    )
    quantity_remaining = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Remaining quantity'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescription_medicines'
        ordering = ['medicine_name']
    
    def __str__(self):
        return f"{self.medicine_name} - {self.dosage} ({self.frequency})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate end_date if duration_days is set
        if self.duration_days and self.start_date and not self.end_date:
            from datetime import timedelta
            self.end_date = self.start_date + timedelta(days=self.duration_days)
        
        # Set medicine_name from medicine if available
        if self.medicine and not self.medicine_name:
            self.medicine_name = self.medicine.name
        
        super().save(*args, **kwargs)


class MedicineReminder(models.Model):
    """
    Medicine reminder settings.
    Used to send notifications for taking medicines.
    """
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medicine_reminders'
    )
    
    # Link to prescription medicine (optional)
    prescription_medicine = models.ForeignKey(
        PrescriptionMedicine,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reminders'
    )
    
    # Medicine details (for standalone reminders)
    medicine_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    
    # Schedule
    reminder_times = models.JSONField(
        default=list,
        help_text='List of times ["08:00", "14:00", "20:00"]'
    )
    
    # Days of week (for weekly medicines)
    days_of_week = models.JSONField(
        default=list,
        blank=True,
        help_text='[0,1,2,3,4,5,6] where 0=Monday'
    )
    
    # Duration
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    # Instructions
    instructions = models.TextField(
        blank=True,
        help_text='e.g., "Take after food", "With warm water"'
    )
    instructions_local = models.TextField(blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    # Notification settings
    notify_before_minutes = models.PositiveSmallIntegerField(
        default=0,
        help_text='Send reminder X minutes before scheduled time'
    )
    notify_family_helper = models.BooleanField(
        default=False,
        help_text='Also notify family helper'
    )
    
    # Snooze settings
    allow_snooze = models.BooleanField(default=True)
    snooze_minutes = models.PositiveSmallIntegerField(default=10)
    max_snoozes = models.PositiveSmallIntegerField(default=3)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medicine_reminders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'start_date', 'end_date']),
        ]
    
    def __str__(self):
        times = ', '.join(self.reminder_times) if self.reminder_times else 'No times set'
        return f"{self.medicine_name} at {times}"
    
    @property
    def is_active_today(self):
        """Check if reminder is active today."""
        today = timezone.now().date()
        
        if self.status != 'active':
            return False
        
        if self.start_date > today:
            return False
        
        if self.end_date and self.end_date < today:
            return False
        
        # Check day of week if specified
        if self.days_of_week:
            today_weekday = today.weekday()
            if today_weekday not in self.days_of_week:
                return False
        
        return True


class ReminderLog(models.Model):
    """
    Log of reminder notifications sent and responses.
    Tracks if user took the medicine.
    """
    
    RESPONSE_CHOICES = [
        ('pending', 'Pending'),
        ('taken', 'Taken'),
        ('skipped', 'Skipped'),
        ('snoozed', 'Snoozed'),
        ('missed', 'Missed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    reminder = models.ForeignKey(
        MedicineReminder,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    
    # Scheduled time
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    
    # Actual notification
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Response
    response = models.CharField(
        max_length=20,
        choices=RESPONSE_CHOICES,
        default='pending'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Snooze tracking
    snooze_count = models.PositiveSmallIntegerField(default=0)
    last_snoozed_at = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(
        blank=True,
        help_text='User notes like "Felt side effects"'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reminder_logs'
        ordering = ['-scheduled_date', '-scheduled_time']
        unique_together = ['reminder', 'scheduled_date', 'scheduled_time']
        indexes = [
            models.Index(fields=['reminder', 'scheduled_date']),
            models.Index(fields=['response', 'scheduled_date']),
        ]
    
    def __str__(self):
        return f"{self.reminder.medicine_name} - {self.scheduled_date} {self.scheduled_time} ({self.response})"
    
    def mark_taken(self):
        """Mark medicine as taken."""
        self.response = 'taken'
        self.responded_at = timezone.now()
        self.save()
    
    def mark_skipped(self, notes=''):
        """Mark medicine as skipped."""
        self.response = 'skipped'
        self.responded_at = timezone.now()
        self.notes = notes
        self.save()
    
    def snooze(self):
        """Snooze the reminder."""
        if self.snooze_count < self.reminder.max_snoozes:
            self.response = 'snoozed'
            self.snooze_count += 1
            self.last_snoozed_at = timezone.now()
            self.save()
            return True
        return False


class MedicineSearchHistory(models.Model):
    """
    Track user's medicine search history.
    Helps with suggestions and analytics.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medicine_searches'
    )
    
    search_query = models.CharField(max_length=255)
    medicine_found = models.ForeignKey(
        Medicine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='If user clicked on a specific medicine'
    )
    
    results_count = models.PositiveIntegerField(default=0)
    searched_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medicine_search_history'
        ordering = ['-searched_at']
        indexes = [
            models.Index(fields=['user', '-searched_at']),
        ]
    
    def __str__(self):
        return f"{self.user.phone_number}: {self.search_query}"