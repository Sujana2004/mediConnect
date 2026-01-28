"""
Emergency App Models for MediConnect.

Models:
1. EmergencyContact - User's emergency contacts (family, doctors)
2. EmergencyService - Hospitals, ambulances, helplines database
3. SOSAlert - SOS emergency alerts triggered by users
4. FirstAidGuide - First aid instructions for common emergencies
5. EmergencyLocation - Cached location data for offline use
"""

import uuid
from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator


# Phone number validator for Indian numbers
phone_validator = RegexValidator(
    regex=r'^[6-9]\d{9}$',
    message='Enter a valid 10-digit Indian mobile number starting with 6-9'
)


class EmergencyContact(models.Model):
    """
    User's personal emergency contacts.
    These people will be notified during SOS alerts.
    """
    
    RELATIONSHIP_CHOICES = [
        ('spouse', 'Spouse'),
        ('parent', 'Parent'),
        ('child', 'Child'),
        ('sibling', 'Sibling'),
        ('relative', 'Relative'),
        ('friend', 'Friend'),
        ('neighbor', 'Neighbor'),
        ('doctor', 'Doctor'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='emergency_contacts'
    )
    
    # Contact details
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=10, validators=[phone_validator])
    alternate_phone = models.CharField(
        max_length=10, 
        validators=[phone_validator],
        blank=True,
        null=True
    )
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    
    # Priority for notification order
    priority = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='1 = Highest priority, 10 = Lowest'
    )
    
    # Settings
    is_active = models.BooleanField(default=True)
    notify_on_sos = models.BooleanField(
        default=True,
        help_text='Send SMS/notification during SOS'
    )
    share_location = models.BooleanField(
        default=True,
        help_text='Share GPS location during SOS'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'emergency_contacts'
        ordering = ['priority', 'name']
        unique_together = ['user', 'phone_number']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'priority']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.phone_number}"


class EmergencyService(models.Model):
    """
    Database of emergency services: hospitals, ambulances, helplines.
    Pre-loaded for offline access.
    """
    
    SERVICE_TYPES = [
        ('hospital', 'Hospital'),
        ('clinic', 'Clinic'),
        ('phc', 'Primary Health Center'),
        ('ambulance', 'Ambulance Service'),
        ('helpline', 'Emergency Helpline'),
        ('blood_bank', 'Blood Bank'),
        ('pharmacy', 'Pharmacy (24/7)'),
        ('police', 'Police Station'),
        ('fire', 'Fire Station'),
    ]
    
    FACILITY_LEVELS = [
        ('primary', 'Primary'),
        ('secondary', 'Secondary'),
        ('tertiary', 'Tertiary'),
        ('specialized', 'Specialized'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic info
    name = models.CharField(max_length=200)
    name_local = models.CharField(
        max_length=200, 
        blank=True,
        help_text='Name in local language (Telugu/Hindi)'
    )
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES)
    facility_level = models.CharField(
        max_length=20, 
        choices=FACILITY_LEVELS,
        blank=True,
        null=True
    )
    
    # Contact info
    phone_primary = models.CharField(max_length=15)
    phone_secondary = models.CharField(max_length=15, blank=True, null=True)
    phone_emergency = models.CharField(
        max_length=15, 
        blank=True, 
        null=True,
        help_text='Dedicated emergency line if different'
    )
    
    # Location
    address = models.TextField()
    address_local = models.TextField(
        blank=True,
        help_text='Address in local language'
    )
    landmark = models.CharField(max_length=200, blank=True)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default='Andhra Pradesh')
    pincode = models.CharField(max_length=6)
    
    # GPS coordinates (crucial for distance calculation)
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=8,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, 
        decimal_places=8,
        null=True,
        blank=True
    )
    
    # Operational details
    is_24x7 = models.BooleanField(default=False)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    
    # Facilities (for hospitals)
    has_emergency_ward = models.BooleanField(default=False)
    has_icu = models.BooleanField(default=False)
    has_ambulance = models.BooleanField(default=False)
    has_blood_bank = models.BooleanField(default=False)
    bed_count = models.PositiveIntegerField(default=0)
    
    # Government/Private
    is_government = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'emergency_services'
        ordering = ['service_type', 'name']
        indexes = [
            models.Index(fields=['service_type', 'is_active']),
            models.Index(fields=['district', 'service_type']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['pincode']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"


class SOSAlert(models.Model):
    """
    SOS emergency alerts triggered by users.
    Records all emergency situations for tracking and analysis.
    """
    
    STATUS_CHOICES = [
        ('triggered', 'Triggered'),
        ('notifying', 'Notifying Contacts'),
        ('acknowledged', 'Acknowledged'),
        ('responding', 'Help Responding'),
        ('resolved', 'Resolved'),
        ('cancelled', 'Cancelled by User'),
        ('false_alarm', 'False Alarm'),
    ]
    
    EMERGENCY_TYPES = [
        ('medical', 'Medical Emergency'),
        ('accident', 'Accident'),
        ('heart', 'Heart Attack/Chest Pain'),
        ('breathing', 'Breathing Difficulty'),
        ('unconscious', 'Person Unconscious'),
        ('bleeding', 'Severe Bleeding'),
        ('burn', 'Burn Injury'),
        ('poison', 'Poisoning'),
        ('snake_bite', 'Snake Bite'),
        ('pregnancy', 'Pregnancy Emergency'),
        ('child', 'Child Emergency'),
        ('other', 'Other Emergency'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sos_alerts'
    )
    
    # Alert details
    emergency_type = models.CharField(
        max_length=20, 
        choices=EMERGENCY_TYPES,
        default='medical'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES,
        default='triggered'
    )
    
    # Location at time of SOS
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=8,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, 
        decimal_places=8,
        null=True,
        blank=True
    )
    location_address = models.TextField(
        blank=True,
        help_text='Reverse geocoded address'
    )
    location_accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text='GPS accuracy in meters'
    )
    
    # Additional info
    description = models.TextField(
        blank=True,
        help_text='User provided details about emergency'
    )
    voice_note_url = models.URLField(
        blank=True,
        null=True,
        help_text='Voice message if user recorded one'
    )
    
    # Notification tracking
    contacts_notified = models.JSONField(
        default=list,
        help_text='List of contact IDs that were notified'
    )
    services_notified = models.JSONField(
        default=list,
        help_text='List of emergency service IDs contacted'
    )
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Response tracking
    acknowledged_by = models.CharField(
        max_length=100,
        blank=True,
        help_text='Name of person who acknowledged'
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    responder_eta = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Estimated time of arrival in minutes'
    )
    
    # Resolution
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sos_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['emergency_type']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"SOS-{str(self.id)[:8]} - {self.get_emergency_type_display()} ({self.status})"


class FirstAidGuide(models.Model):
    """
    First aid instructions for common emergencies.
    Multi-language support for rural users.
    Designed for offline access.
    """
    
    CATEGORY_CHOICES = [
        ('bleeding', 'Bleeding'),
        ('burns', 'Burns'),
        ('choking', 'Choking'),
        ('cpr', 'CPR'),
        ('fracture', 'Fractures'),
        ('heart_attack', 'Heart Attack'),
        ('stroke', 'Stroke'),
        ('poisoning', 'Poisoning'),
        ('snake_bite', 'Snake Bite'),
        ('dog_bite', 'Dog/Animal Bite'),
        ('drowning', 'Drowning'),
        ('electric_shock', 'Electric Shock'),
        ('fainting', 'Fainting'),
        ('seizure', 'Seizure'),
        ('heat_stroke', 'Heat Stroke'),
        ('pregnancy', 'Pregnancy Emergency'),
        ('child', 'Child Emergency'),
        ('allergy', 'Allergic Reaction'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic info
    title_en = models.CharField(max_length=200)
    title_te = models.CharField(max_length=200, blank=True)
    title_hi = models.CharField(max_length=200, blank=True)
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    # Symptoms to identify
    symptoms_en = models.TextField(help_text='How to identify this emergency')
    symptoms_te = models.TextField(blank=True)
    symptoms_hi = models.TextField(blank=True)
    
    # Step-by-step instructions (stored as JSON list)
    steps_en = models.JSONField(
        default=list,
        help_text='List of steps in English'
    )
    steps_te = models.JSONField(default=list, blank=True)
    steps_hi = models.JSONField(default=list, blank=True)
    
    # What NOT to do
    donts_en = models.JSONField(
        default=list,
        help_text='What NOT to do'
    )
    donts_te = models.JSONField(default=list, blank=True)
    donts_hi = models.JSONField(default=list, blank=True)
    
    # When to call for help
    call_help_en = models.TextField(
        blank=True,
        help_text='When to call ambulance/doctor'
    )
    call_help_te = models.TextField(blank=True)
    call_help_hi = models.TextField(blank=True)
    
    # Media (for visual guides)
    image_url = models.URLField(blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    
    # Priority/Ordering
    display_order = models.PositiveIntegerField(default=0)
    is_critical = models.BooleanField(
        default=False,
        help_text='Show prominently for life-threatening emergencies'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'first_aid_guides'
        ordering = ['display_order', 'title_en']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_critical', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.title_en} ({self.category})"
    
    def get_title(self, language='en'):
        """Get title in specified language with fallback."""
        if language == 'te' and self.title_te:
            return self.title_te
        elif language == 'hi' and self.title_hi:
            return self.title_hi
        return self.title_en
    
    def get_steps(self, language='en'):
        """Get steps in specified language with fallback."""
        if language == 'te' and self.steps_te:
            return self.steps_te
        elif language == 'hi' and self.steps_hi:
            return self.steps_hi
        return self.steps_en


class EmergencyHelpline(models.Model):
    """
    Emergency helpline numbers - National and State level.
    Simple model for quick access to important numbers.
    """
    
    HELPLINE_TYPES = [
        ('ambulance', 'Ambulance'),
        ('police', 'Police'),
        ('fire', 'Fire'),
        ('women', 'Women Helpline'),
        ('child', 'Child Helpline'),
        ('disaster', 'Disaster Management'),
        ('poison', 'Poison Control'),
        ('mental_health', 'Mental Health'),
        ('covid', 'COVID Helpline'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic info
    name_en = models.CharField(max_length=100)
    name_te = models.CharField(max_length=100, blank=True)
    name_hi = models.CharField(max_length=100, blank=True)
    
    helpline_type = models.CharField(max_length=20, choices=HELPLINE_TYPES)
    
    # Numbers
    number = models.CharField(max_length=15)
    alternate_number = models.CharField(max_length=15, blank=True)
    
    # Scope
    is_national = models.BooleanField(default=True)
    state = models.CharField(
        max_length=100, 
        blank=True,
        help_text='Applicable state if not national'
    )
    
    # Description
    description_en = models.TextField(blank=True)
    description_te = models.TextField(blank=True)
    description_hi = models.TextField(blank=True)
    
    # Availability
    is_24x7 = models.BooleanField(default=True)
    is_toll_free = models.BooleanField(default=True)
    
    # Display
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'emergency_helplines'
        ordering = ['display_order', 'helpline_type']
        indexes = [
            models.Index(fields=['helpline_type', 'is_active']),
            models.Index(fields=['is_national', 'state']),
        ]
    
    def __str__(self):
        return f"{self.name_en} - {self.number}"
    
    def get_name(self, language='en'):
        """Get name in specified language with fallback."""
        if language == 'te' and self.name_te:
            return self.name_te
        elif language == 'hi' and self.name_hi:
            return self.name_hi
        return self.name_en


class UserLocationCache(models.Model):
    """
    Cached user location for quick SOS.
    Updated periodically when app is open.
    Enables faster response in emergencies.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location_cache'
    )
    
    # Current location
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=8,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, 
        decimal_places=8,
        null=True,
        blank=True
    )
    accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text='Accuracy in meters'
    )
    
    # Address
    address = models.TextField(blank=True)
    district = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    
    # Nearby services (cached for offline)
    nearby_hospitals = models.JSONField(
        default=list,
        help_text='Cached list of nearby hospital IDs'
    )
    nearby_ambulances = models.JSONField(
        default=list,
        help_text='Cached list of nearby ambulance service IDs'
    )
    
    # Timestamps
    location_updated_at = models.DateTimeField(auto_now=True)
    nearby_updated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_location_cache'
    
    def __str__(self):
        return f"Location cache for {self.user}"