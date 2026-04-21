"""
Consultation App Models
=======================
Models for video/audio consultations between doctors and patients.

Models:
1. ConsultationRoom - Jitsi room configuration
2. Consultation - Main consultation record (linked to Appointment)
3. ConsultationNote - Doctor's notes during consultation
4. ConsultationPrescription - Prescriptions written during consultation
5. ConsultationAttachment - Files shared during consultation
6. ConsultationFeedback - Patient feedback after consultation

FIXES:
- Appointment relationship now properly bidirectional with back-sync
- All User references standardized with role validation
- Removed circular dependencies
- Added proper cascade behaviors
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class ConsultationRoom(models.Model):
    """
    Jitsi Meet room configuration for consultations.
    Each consultation gets a unique room.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Room identification
    room_name = models.CharField(max_length=100, unique=True, db_index=True)
    room_password = models.CharField(max_length=50, blank=True, null=True)
    
    # Jitsi configuration
    jitsi_domain = models.CharField(
        max_length=255,
        default='meet.jit.si',
        help_text="Jitsi server domain (default: meet.jit.si - FREE)"
    )
    
    # Room settings
    is_audio_only = models.BooleanField(default=False)
    is_lobby_enabled = models.BooleanField(
        default=True,
        help_text="Patients wait in lobby until doctor admits"
    )
    max_participants = models.PositiveSmallIntegerField(default=2)
    
    # Room status
    ROOM_STATUS_CHOICES = [
        ('created', 'Created'),
        ('waiting', 'Waiting for Participants'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('expired', 'Expired'),
    ]
    status = models.CharField(
        max_length=20,
        choices=ROOM_STATUS_CHOICES,
        default='created'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        help_text="Room expires if not used by this time"
    )
    
    # Tracking
    doctor_joined_at = models.DateTimeField(null=True, blank=True)
    patient_joined_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'consultation_rooms'
        ordering = ['-created_at']
        verbose_name = 'Consultation Room'
        verbose_name_plural = 'Consultation Rooms'

    def __str__(self):
        return f"Room: {self.room_name} ({self.status})"

    def save(self, *args, **kwargs):
        # Set default expiry (2 hours from creation)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=2)
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        return self.status == 'active'

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def full_room_url(self):
        """Generate full Jitsi room URL."""
        base_url = f"https://{self.jitsi_domain}/{self.room_name}"
        return base_url

    def get_join_url(self, display_name, is_moderator=False):
        """Generate join URL with display name."""
        import urllib.parse
        params = {
            'userInfo.displayName': display_name,
        }
        if is_moderator:
            params['config.startWithAudioMuted'] = 'false'
            params['config.startWithVideoMuted'] = 'false'
        else:
            params['config.startWithAudioMuted'] = 'true'
            params['config.startWithVideoMuted'] = 'true'
        
        query_string = urllib.parse.urlencode(params)
        return f"{self.full_room_url}#{query_string}"


class Consultation(models.Model):
    """
    Main consultation record linking doctor, patient, and appointment.
    FIXED: Proper relationship with Appointment model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Participants - FIXED: Direct User references with role validation
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_consultations',
        limit_choices_to={'role': 'doctor'}
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_consultations',
        limit_choices_to={'role': 'patient'}
    )
    
    # FIXED: OneToOneField with proper reverse relationship
    # When appointment is deleted, consultation should be SET_NULL (keep history)
    appointment = models.OneToOneField(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultation'
    )
    
    # Room
    room = models.OneToOneField(
        ConsultationRoom,
        on_delete=models.CASCADE,
        related_name='consultation'
    )
    
    # Consultation type
    CONSULTATION_TYPE_CHOICES = [
        ('video', 'Video Call'),
        ('audio', 'Audio Call'),
        ('chat', 'Chat Only'),
    ]
    consultation_type = models.CharField(
        max_length=20,
        choices=CONSULTATION_TYPE_CHOICES,
        default='video'
    )
    
    # Status
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('waiting_room', 'Patient in Waiting Room'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
        ('technical_issue', 'Technical Issue'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        db_index=True
    )
    
    # Scheduling
    scheduled_start = models.DateTimeField(db_index=True)
    scheduled_end = models.DateTimeField()
    
    # Actual times
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Duration in minutes
    estimated_duration = models.PositiveSmallIntegerField(
        default=15,
        help_text="Estimated duration in minutes"
    )
    actual_duration = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Actual duration in minutes"
    )
    
    # Reason and symptoms
    reason = models.TextField(
        blank=True,
        help_text="Reason for consultation"
    )
    symptoms = models.TextField(
        blank=True,
        help_text="Patient's symptoms (from diagnosis app or manual)"
    )
    
    # Diagnosis (after consultation)
    diagnosis = models.TextField(
        blank=True,
        help_text="Doctor's diagnosis"
    )
    
    # Follow-up
    follow_up_required = models.BooleanField(default=False)
    follow_up_notes = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    
    # Cancellation
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_consultations'
    )
    cancellation_reason = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Language preference for this consultation
    language = models.CharField(
        max_length=5,
        default='en',
        choices=[('en', 'English'), ('te', 'Telugu'), ('hi', 'Hindi')]
    )

    class Meta:
        db_table = 'consultations'
        ordering = ['-scheduled_start']
        verbose_name = 'Consultation'
        verbose_name_plural = 'Consultations'
        indexes = [
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['scheduled_start', 'status']),
            models.Index(fields=['doctor', 'scheduled_start']),
            models.Index(fields=['patient', 'scheduled_start']),
        ]

    def __str__(self):
        return f"Consultation: {self.patient.first_name} with Dr. {self.doctor.first_name} ({self.status})"

    def clean(self):
        """Validate consultation data."""
        # Verify doctor role
        if self.doctor and self.doctor.role != 'doctor':
            raise ValidationError({'doctor': 'Only users with doctor role can conduct consultations.'})
        
        # Verify patient role
        if self.patient and self.patient.role != 'patient':
            raise ValidationError({'patient': 'Only users with patient role can have consultations.'})
        
        # Patient and doctor cannot be the same
        if self.patient_id and self.doctor_id and self.patient_id == self.doctor_id:
            raise ValidationError('Patient and doctor cannot be the same person.')
        
        # Validate appointment matches
        if self.appointment:
            if self.appointment.patient_id != self.patient_id:
                raise ValidationError({'appointment': 'Appointment patient does not match consultation patient.'})
            if self.appointment.doctor_id != self.doctor_id:
                raise ValidationError({'appointment': 'Appointment doctor does not match consultation doctor.'})

    def save(self, *args, **kwargs):
        # Set scheduled_end based on duration if not set
        if not self.scheduled_end:
            self.scheduled_end = self.scheduled_start + timezone.timedelta(
                minutes=self.estimated_duration
            )
        
        # Calculate actual duration if ended
        if self.actual_start and self.actual_end and not self.actual_duration:
            delta = self.actual_end - self.actual_start
            self.actual_duration = int(delta.total_seconds() / 60)
        
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # FIXED: Sync consultation_id back to appointment
        if self.appointment and not self.appointment.consultation_id:
            from apps.appointments.models import Appointment
            Appointment.objects.filter(pk=self.appointment.pk).update(consultation_id=self.pk)

    @property
    def can_join(self):
        """Check if consultation can be joined (15 min before to scheduled end)."""
        now = timezone.now()
        join_window_start = self.scheduled_start - timezone.timedelta(minutes=15)
        return (
            self.status in ['scheduled', 'waiting_room', 'in_progress'] and
            join_window_start <= now <= self.scheduled_end
        )

    @property
    def is_upcoming(self):
        return self.status == 'scheduled' and self.scheduled_start > timezone.now()

    @property
    def time_until_start(self):
        """Returns timedelta until consultation starts."""
        if self.scheduled_start > timezone.now():
            return self.scheduled_start - timezone.now()
        return timezone.timedelta(0)
    
    def start(self):
        """Start the consultation."""
        if self.status not in ['scheduled', 'waiting_room']:
            raise ValidationError('Only scheduled/waiting consultations can be started.')
        self.status = 'in_progress'
        self.actual_start = timezone.now()
        self.save()
        
        # Update linked appointment status
        if self.appointment:
            self.appointment.start_consultation()
    
    def complete(self):
        """Complete the consultation."""
        if self.status != 'in_progress':
            raise ValidationError('Only in-progress consultations can be completed.')
        self.status = 'completed'
        self.actual_end = timezone.now()
        if self.actual_start:
            delta = self.actual_end - self.actual_start
            self.actual_duration = int(delta.total_seconds() / 60)
        self.save()
        
        # Update linked appointment
        if self.appointment:
            self.appointment.complete(consultation_id=self.pk)


class ConsultationNote(models.Model):
    """
    Doctor's notes taken during or after consultation.
    Supports multiple notes per consultation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    
    # Note content
    NOTE_TYPE_CHOICES = [
        ('subjective', 'Subjective (Patient Complaints)'),
        ('objective', 'Objective (Observations)'),
        ('assessment', 'Assessment (Diagnosis)'),
        ('plan', 'Plan (Treatment Plan)'),
        ('general', 'General Notes'),
    ]
    note_type = models.CharField(
        max_length=20,
        choices=NOTE_TYPE_CHOICES,
        default='general'
    )
    
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    
    # Visibility
    is_private = models.BooleanField(
        default=False,
        help_text="Private notes are only visible to the doctor"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'consultation_notes'
        ordering = ['note_type', 'created_at']
        verbose_name = 'Consultation Note'
        verbose_name_plural = 'Consultation Notes'
        indexes = [
            models.Index(fields=['consultation', 'note_type']),
            models.Index(fields=['consultation', 'created_at']),
        ]

    def __str__(self):
        return f"Note ({self.note_type}): {self.title or 'Untitled'}"


class ConsultationPrescription(models.Model):
    """
    Prescriptions written during consultation.
    Links to Medicine app for medication details.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name='prescriptions'
    )
    
    # Medicine details (can link to Medicine app or use text)
    # FIXED: Use UUIDField to avoid circular import
    medicine_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Reference to medicine.Medicine"
    )
    medicine_name = models.CharField(
        max_length=200,
        help_text="Medicine name (required)"
    )
    
    # Dosage
    dosage = models.CharField(
        max_length=100,
        help_text="e.g., '500mg', '10ml'"
    )
    frequency = models.CharField(
        max_length=100,
        help_text="e.g., 'Twice daily', 'Every 8 hours'"
    )
    duration = models.CharField(
        max_length=100,
        help_text="e.g., '7 days', '2 weeks'"
    )
    
    # Timing
    TIMING_CHOICES = [
        ('before_food', 'Before Food'),
        ('after_food', 'After Food'),
        ('with_food', 'With Food'),
        ('empty_stomach', 'Empty Stomach'),
        ('bedtime', 'At Bedtime'),
        ('any_time', 'Any Time'),
    ]
    timing = models.CharField(
        max_length=20,
        choices=TIMING_CHOICES,
        default='after_food'
    )
    
    # Additional instructions
    instructions = models.TextField(
        blank=True,
        help_text="Special instructions for the patient"
    )
    
    # Quantity
    quantity = models.PositiveSmallIntegerField(
        default=1,
        help_text="Number of units to dispense"
    )
    
    # Refills
    refills_allowed = models.PositiveSmallIntegerField(default=0)
    refills_used = models.PositiveSmallIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'consultation_prescriptions'
        ordering = ['created_at']
        verbose_name = 'Consultation Prescription'
        verbose_name_plural = 'Consultation Prescriptions'
        indexes = [
            models.Index(fields=['consultation', 'is_active']),
            models.Index(fields=['consultation', 'created_at']),
        ]

    def __str__(self):
        return f"{self.medicine_name} - {self.dosage} ({self.frequency})"


class ConsultationAttachment(models.Model):
    """
    Files shared during consultation (reports, images, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    # Uploader
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultation_uploads'
    )
    
    # File details
    ATTACHMENT_TYPE_CHOICES = [
        ('report', 'Medical Report'),
        ('prescription', 'Prescription'),
        ('lab_result', 'Lab Result'),
        ('scan', 'Scan/X-Ray'),
        ('photo', 'Photo'),
        ('document', 'Other Document'),
    ]
    attachment_type = models.CharField(
        max_length=20,
        choices=ATTACHMENT_TYPE_CHOICES,
        default='document'
    )
    
    file_name = models.CharField(max_length=255)
    file_url = models.URLField(
        help_text="URL to file (stored in Supabase Storage)"
    )
    file_size = models.PositiveIntegerField(
        help_text="File size in bytes"
    )
    mime_type = models.CharField(max_length=100)
    
    # Description
    description = models.TextField(blank=True)
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'consultation_attachments'
        ordering = ['-uploaded_at']
        verbose_name = 'Consultation Attachment'
        verbose_name_plural = 'Consultation Attachments'
        indexes = [
            models.Index(fields=['consultation', 'attachment_type']),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.attachment_type})"


class ConsultationFeedback(models.Model):
    """
    Patient feedback after consultation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    consultation = models.OneToOneField(
        Consultation,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    
    # Ratings (1-5)
    overall_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    communication_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True
    )
    technical_quality_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Audio/Video quality"
    )
    
    # Feedback text
    comments = models.TextField(blank=True)
    
    # Would recommend
    would_recommend = models.BooleanField(null=True, blank=True)
    
    # Issues faced
    had_technical_issues = models.BooleanField(default=False)
    technical_issue_description = models.TextField(blank=True)
    
    # Anonymous
    is_anonymous = models.BooleanField(
        default=False,
        help_text="If true, patient name hidden from doctor"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'consultation_feedbacks'
        verbose_name = 'Consultation Feedback'
        verbose_name_plural = 'Consultation Feedbacks'

    def __str__(self):
        return f"Feedback for {self.consultation}: {self.overall_rating}/5"
    
    def save(self, *args, **kwargs):
        """Update doctor's average rating on save."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Update doctor's profile ratings
            doctor = self.consultation.doctor
            if hasattr(doctor, 'doctor_profile'):
                from django.db.models import Avg, Count
                profile = doctor.doctor_profile
                
                # Calculate new average
                feedbacks = ConsultationFeedback.objects.filter(
                    consultation__doctor=doctor
                ).aggregate(
                    avg_rating=Avg('overall_rating'),
                    total=Count('id')
                )
                
                profile.average_rating = feedbacks['avg_rating'] or 0
                profile.total_reviews = feedbacks['total'] or 0
                profile.save(update_fields=['average_rating', 'total_reviews'])