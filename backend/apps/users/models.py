"""
User models for MediConnect.
Implements 3 roles: Patient, Doctor, Admin
Plus Family Helper feature for Patients.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


# ============================================
# CUSTOM USER MANAGER
# ============================================

class UserManager(BaseUserManager):
    """
    Custom user manager where phone is the unique identifier
    instead of username.
    """
    
    def create_user(self, phone, password=None, **extra_fields):
        """
        Create and save a regular User with the given phone and password.
        """
        if not phone:
            raise ValueError(_('Phone number is required'))
        
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone, password=None, **extra_fields):
        """
        Create and save a SuperUser with the given phone and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(phone, password, **extra_fields)


# ============================================
# VALIDATORS
# ============================================

phone_validator = RegexValidator(
    regex=r'^[6-9]\d{9}$',
    message=_("Enter a valid Indian phone number (10 digits starting with 6-9)")
)


# ============================================
# USER MODEL
# ============================================

class User(AbstractUser):
    """
    Custom User model with phone as primary identifier.
    Supports 3 roles: Patient, Doctor, Admin
    """
    
    class Role(models.TextChoices):
        ADMIN = 'admin', _('Admin')
        DOCTOR = 'doctor', _('Doctor')
        PATIENT = 'patient', _('Patient')
    
    class Gender(models.TextChoices):
        MALE = 'male', _('Male')
        FEMALE = 'female', _('Female')
        OTHER = 'other', _('Other')
    
    class Language(models.TextChoices):
        TELUGU = 'te', _('Telugu')
        HINDI = 'hi', _('Hindi')
        ENGLISH = 'en', _('English')
    
    # Remove username field, use phone instead
    username = None
    
    # Primary identifier
    phone = models.CharField(
        _('Phone Number'),
        max_length=15,
        unique=True,
        validators=[phone_validator],
        help_text=_('Enter 10 digit Indian phone number')
    )
    
    # Role
    role = models.CharField(
        _('Role'),
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT
    )
    
    # Basic Info
    email = models.EmailField(_('Email'), blank=True, null=True)
    first_name = models.CharField(_('First Name'), max_length=100, blank=True)
    last_name = models.CharField(_('Last Name'), max_length=100, blank=True)
    date_of_birth = models.DateField(_('Date of Birth'), null=True, blank=True)
    gender = models.CharField(
        _('Gender'),
        max_length=10,
        choices=Gender.choices,
        blank=True
    )
    
    # Profile Photo
    profile_photo = models.ImageField(
        _('Profile Photo'),
        upload_to='profiles/%Y/%m/',
        null=True,
        blank=True
    )
    
    # Language Preference
    preferred_language = models.CharField(
        _('Preferred Language'),
        max_length=5,
        choices=Language.choices,
        default=Language.TELUGU
    )
    
    # Location
    address = models.TextField(_('Address'), blank=True)
    village = models.CharField(_('Village/Town'), max_length=100, blank=True)
    mandal = models.CharField(_('Mandal/Taluk'), max_length=100, blank=True)
    district = models.CharField(_('District'), max_length=100, blank=True)
    state = models.CharField(_('State'), max_length=100, default='Andhra Pradesh')
    pincode = models.CharField(_('Pincode'), max_length=10, blank=True)
    
    # Coordinates for emergency services
    latitude = models.DecimalField(
        _('Latitude'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        _('Longitude'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    
    # Verification
    is_phone_verified = models.BooleanField(_('Phone Verified'), default=False)
    is_email_verified = models.BooleanField(_('Email Verified'), default=False)
    is_profile_complete = models.BooleanField(_('Profile Complete'), default=False)
    
    # Timestamps
    created_at = models.DateTimeField(_('Created At'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Updated At'), auto_now=True)
    last_active = models.DateTimeField(_('Last Active'), null=True, blank=True)
    
    # FCM Token for push notifications
    fcm_token = models.CharField(
        _('FCM Token'),
        max_length=500,
        blank=True,
        help_text=_('Firebase Cloud Messaging token for push notifications')
    )
    
    # Settings
    is_active = models.BooleanField(_('Active'), default=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.phone} ({self.get_role_display()})"
    
    def get_full_name(self):
        """Return the full name of the user."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.phone
    
    def get_short_name(self):
        """Return the short name of the user."""
        return self.first_name if self.first_name else self.phone
    
    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT
    
    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR
    
    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN
    
    def update_last_active(self):
        """Update the last active timestamp."""
        self.last_active = timezone.now()
        self.save(update_fields=['last_active'])


# ============================================
# PATIENT PROFILE
# ============================================

class PatientProfile(models.Model):
    """
    Extended profile for Patient role.
    Includes health information and family helper feature.
    """
    
    class BloodGroup(models.TextChoices):
        A_POSITIVE = 'A+', 'A+'
        A_NEGATIVE = 'A-', 'A-'
        B_POSITIVE = 'B+', 'B+'
        B_NEGATIVE = 'B-', 'B-'
        O_POSITIVE = 'O+', 'O+'
        O_NEGATIVE = 'O-', 'O-'
        AB_POSITIVE = 'AB+', 'AB+'
        AB_NEGATIVE = 'AB-', 'AB-'
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='patient_profile'
    )
    
    # Health Information
    blood_group = models.CharField(
        _('Blood Group'),
        max_length=5,
        choices=BloodGroup.choices,
        blank=True
    )
    height_cm = models.PositiveIntegerField(
        _('Height (cm)'),
        null=True,
        blank=True
    )
    weight_kg = models.DecimalField(
        _('Weight (kg)'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Medical History (stored as JSON for flexibility)
    chronic_conditions = models.JSONField(
        _('Chronic Conditions'),
        default=list,
        blank=True,
        help_text=_('List of chronic conditions: ["diabetes", "hypertension"]')
    )
    allergies = models.JSONField(
        _('Allergies'),
        default=list,
        blank=True,
        help_text=_('List of allergies: ["penicillin", "peanuts"]')
    )
    current_medications = models.JSONField(
        _('Current Medications'),
        default=list,
        blank=True,
        help_text=_('List of current medications')
    )
    past_surgeries = models.JSONField(
        _('Past Surgeries'),
        default=list,
        blank=True,
        help_text=_('List of past surgeries with dates')
    )
    family_history = models.JSONField(
        _('Family Medical History'),
        default=list,
        blank=True,
        help_text=_('Family medical history')
    )
    
    # Emergency Contact
    emergency_contact_name = models.CharField(
        _('Emergency Contact Name'),
        max_length=100,
        blank=True
    )
    emergency_contact_phone = models.CharField(
        _('Emergency Contact Phone'),
        max_length=15,
        blank=True,
        validators=[phone_validator]
    )
    emergency_contact_relation = models.CharField(
        _('Relation'),
        max_length=50,
        blank=True
    )
    
    # Insurance (optional)
    has_insurance = models.BooleanField(_('Has Insurance'), default=False)
    insurance_provider = models.CharField(
        _('Insurance Provider'),
        max_length=100,
        blank=True
    )
    insurance_id = models.CharField(
        _('Insurance ID'),
        max_length=50,
        blank=True
    )
    
    # Accessibility Settings
    is_literate = models.BooleanField(
        _('Is Literate'),
        default=True,
        help_text=_('Can the patient read and write?')
    )
    needs_voice_assistance = models.BooleanField(
        _('Needs Voice Assistance'),
        default=False,
        help_text=_('Enable voice-based interaction')
    )
    needs_large_text = models.BooleanField(
        _('Needs Large Text'),
        default=False,
        help_text=_('Enable larger text for better visibility')
    )
    
    # Statistics
    total_appointments = models.PositiveIntegerField(default=0)
    total_consultations = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Patient Profile')
        verbose_name_plural = _('Patient Profiles')
    
    def __str__(self):
        return f"Patient: {self.user.phone}"
    
    @property
    def bmi(self):
        """Calculate BMI if height and weight are available."""
        if self.height_cm and self.weight_kg:
            height_m = self.height_cm / 100
            return round(float(self.weight_kg) / (height_m ** 2), 1)
        return None
    
    @property
    def age(self):
        """Calculate age from date of birth."""
        if self.user.date_of_birth:
            today = timezone.now().date()
            dob = self.user.date_of_birth
            return today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day)
            )
        return None


# ============================================
# FAMILY HELPER
# ============================================

class FamilyHelper(models.Model):
    """
    Family Helper feature for illiterate patients.
    A family member who can manage the patient's account.
    """
    
    class Relationship(models.TextChoices):
        SPOUSE = 'spouse', _('Spouse')
        SON = 'son', _('Son')
        DAUGHTER = 'daughter', _('Daughter')
        FATHER = 'father', _('Father')
        MOTHER = 'mother', _('Mother')
        BROTHER = 'brother', _('Brother')
        SISTER = 'sister', _('Sister')
        GRANDSON = 'grandson', _('Grandson')
        GRANDDAUGHTER = 'granddaughter', _('Granddaughter')
        OTHER = 'other', _('Other')
    
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='helpers',
        limit_choices_to={'role': User.Role.PATIENT}
    )
    
    # Helper can be a registered user or just phone number
    helper_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='helping_patients'
    )
    
    # Basic info (if not a registered user)
    helper_name = models.CharField(_('Helper Name'), max_length=100)
    helper_phone = models.CharField(
        _('Helper Phone'),
        max_length=15,
        validators=[phone_validator]
    )
    relationship = models.CharField(
        _('Relationship'),
        max_length=20,
        choices=Relationship.choices
    )
    
    # Permissions
    can_book_appointments = models.BooleanField(default=True)
    can_view_records = models.BooleanField(default=True)
    can_chat_with_doctor = models.BooleanField(default=True)
    can_manage_medications = models.BooleanField(default=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(
        default=False,
        help_text=_('Primary helper receives all notifications')
    )
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Family Helper')
        verbose_name_plural = _('Family Helpers')
        unique_together = ['patient', 'helper_phone']
    
    def __str__(self):
        return f"{self.helper_name} -> {self.patient.phone}"


# ============================================
# DOCTOR PROFILE
# ============================================

class DoctorProfile(models.Model):
    """
    Extended profile for Doctor role.
    Includes professional information and availability.
    """
    
    class Specialization(models.TextChoices):
        GENERAL = 'general', _('General Physician')
        PEDIATRICS = 'pediatrics', _('Pediatrics')
        GYNECOLOGY = 'gynecology', _('Gynecology')
        ORTHOPEDICS = 'orthopedics', _('Orthopedics')
        DERMATOLOGY = 'dermatology', _('Dermatology')
        ENT = 'ent', _('ENT')
        OPHTHALMOLOGY = 'ophthalmology', _('Ophthalmology')
        CARDIOLOGY = 'cardiology', _('Cardiology')
        NEUROLOGY = 'neurology', _('Neurology')
        PSYCHIATRY = 'psychiatry', _('Psychiatry')
        DENTISTRY = 'dentistry', _('Dentistry')
        AYURVEDA = 'ayurveda', _('Ayurveda')
        HOMEOPATHY = 'homeopathy', _('Homeopathy')
        OTHER = 'other', _('Other')
    
    class VerificationStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        VERIFIED = 'verified', _('Verified')
        REJECTED = 'rejected', _('Rejected')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='doctor_profile'
    )
    
    # Professional Information
    registration_number = models.CharField(
        _('Medical Registration Number'),
        max_length=50,
        unique=True,
        help_text=_('Medical Council Registration Number')
    )
    registration_council = models.CharField(
        _('Registration Council'),
        max_length=100,
        help_text=_('e.g., Andhra Pradesh Medical Council')
    )
    specialization = models.CharField(
        _('Specialization'),
        max_length=50,
        choices=Specialization.choices,
        default=Specialization.GENERAL
    )
    qualification = models.CharField(
        _('Qualification'),
        max_length=200,
        help_text=_('e.g., MBBS, MD, MS')
    )
    experience_years = models.PositiveIntegerField(
        _('Years of Experience'),
        default=0
    )
    
    # Work Details
    hospital_name = models.CharField(
        _('Hospital/Clinic Name'),
        max_length=200,
        blank=True
    )
    hospital_address = models.TextField(
        _('Hospital Address'),
        blank=True
    )
    
    # Consultation Details
    consultation_fee = models.DecimalField(
        _('Consultation Fee (₹)'),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_('Fee for video consultation')
    )
    consultation_duration = models.PositiveIntegerField(
        _('Consultation Duration (minutes)'),
        default=15
    )
    
    # Languages spoken
    languages_spoken = models.JSONField(
        _('Languages Spoken'),
        default=list,
        help_text=_('["telugu", "hindi", "english"]')
    )
    
    # Availability
    is_available_online = models.BooleanField(
        _('Available for Online Consultation'),
        default=True
    )
    
    # Verification
    verification_status = models.CharField(
        _('Verification Status'),
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    verification_document = models.FileField(
        _('Verification Document'),
        upload_to='doctor_docs/%Y/%m/',
        null=True,
        blank=True,
        help_text=_('Upload medical registration certificate')
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_doctors'
    )
    rejection_reason = models.TextField(blank=True)
    
    # Ratings
    average_rating = models.DecimalField(
        _('Average Rating'),
        max_digits=3,
        decimal_places=2,
        default=0.00
    )
    total_reviews = models.PositiveIntegerField(default=0)
    total_consultations = models.PositiveIntegerField(default=0)
    
    # Bio
    bio = models.TextField(
        _('About'),
        blank=True,
        help_text=_('Brief description about the doctor')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Doctor Profile')
        verbose_name_plural = _('Doctor Profiles')
    
    def __str__(self):
        return f"Dr. {self.user.get_full_name()} - {self.get_specialization_display()}"
    
    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.VERIFIED


# ============================================
# DOCTOR AVAILABILITY
# ============================================

class DoctorAvailability(models.Model):
    """
    Doctor's weekly availability schedule.
    """
    
    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, _('Monday')
        TUESDAY = 1, _('Tuesday')
        WEDNESDAY = 2, _('Wednesday')
        THURSDAY = 3, _('Thursday')
        FRIDAY = 4, _('Friday')
        SATURDAY = 5, _('Saturday')
        SUNDAY = 6, _('Sunday')
    
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name='availabilities'
    )
    day_of_week = models.IntegerField(
        _('Day of Week'),
        choices=DayOfWeek.choices
    )
    start_time = models.TimeField(_('Start Time'))
    end_time = models.TimeField(_('End Time'))
    is_available = models.BooleanField(default=True)
    
    # Slot settings
    slot_duration = models.PositiveIntegerField(
        _('Slot Duration (minutes)'),
        default=15
    )
    max_appointments = models.PositiveIntegerField(
        _('Max Appointments'),
        default=20,
        help_text=_('Maximum appointments for this slot')
    )
    
    class Meta:
        verbose_name = _('Doctor Availability')
        verbose_name_plural = _('Doctor Availabilities')
        unique_together = ['doctor', 'day_of_week', 'start_time']
        ordering = ['day_of_week', 'start_time']
    
    def __str__(self):
        return f"{self.doctor.user.get_full_name()} - {self.get_day_of_week_display()}"


# ============================================
# DOCTOR LEAVE
# ============================================

class DoctorLeave(models.Model):
    """
    Doctor's leave/unavailable dates.
    """
    
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name='leaves'
    )
    date = models.DateField(_('Leave Date'))
    reason = models.CharField(_('Reason'), max_length=200, blank=True)
    is_full_day = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('Doctor Leave')
        verbose_name_plural = _('Doctor Leaves')
        unique_together = ['doctor', 'date']
        ordering = ['date']
    
    def __str__(self):
        return f"{self.doctor.user.get_full_name()} - {self.date}"


# ============================================
# ADMIN PROFILE
# ============================================

class AdminProfile(models.Model):
    """
    Extended profile for Admin role.
    """
    
    class AdminLevel(models.TextChoices):
        SUPER = 'super', _('Super Admin')
        DISTRICT = 'district', _('District Admin')
        SUPPORT = 'support', _('Support Admin')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='admin_profile'
    )
    
    admin_level = models.CharField(
        _('Admin Level'),
        max_length=20,
        choices=AdminLevel.choices,
        default=AdminLevel.SUPPORT
    )
    
    department = models.CharField(
        _('Department'),
        max_length=100,
        blank=True
    )
    designation = models.CharField(
        _('Designation'),
        max_length=100,
        blank=True
    )
    
    # Permissions
    can_manage_doctors = models.BooleanField(default=True)
    can_manage_patients = models.BooleanField(default=True)
    can_verify_doctors = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=True)
    can_manage_content = models.BooleanField(default=False)
    can_manage_admins = models.BooleanField(default=False)
    can_access_system_settings = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Admin Profile')
        verbose_name_plural = _('Admin Profiles')
    
    def __str__(self):
        return f"Admin: {self.user.phone} ({self.get_admin_level_display()})"


# ============================================
# OTP MODEL
# ============================================

class OTP(models.Model):
    """
    OTP for phone verification.
    Used as fallback when Firebase is unavailable.
    """
    
    class Purpose(models.TextChoices):
        REGISTRATION = 'registration', _('Registration')
        LOGIN = 'login', _('Login')
        PASSWORD_RESET = 'password_reset', _('Password Reset')
        PHONE_CHANGE = 'phone_change', _('Phone Change')
    
    phone = models.CharField(_('Phone'), max_length=15)
    otp = models.CharField(_('OTP'), max_length=6)
    purpose = models.CharField(
        _('Purpose'),
        max_length=20,
        choices=Purpose.choices,
        default=Purpose.LOGIN
    )
    
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        verbose_name = _('OTP')
        verbose_name_plural = _('OTPs')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"OTP for {self.phone}"
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        return not self.is_expired and not self.is_verified and self.attempts < self.max_attempts


# ============================================
# USER ACTIVITY LOG
# ============================================

class UserActivity(models.Model):
    """
    Log of user activities for security and analytics.
    """
    
    class ActivityType(models.TextChoices):
        LOGIN = 'login', _('Login')
        LOGOUT = 'logout', _('Logout')
        REGISTER = 'register', _('Registration')
        PROFILE_UPDATE = 'profile_update', _('Profile Update')
        PASSWORD_CHANGE = 'password_change', _('Password Change')
        APPOINTMENT_BOOK = 'appointment_book', _('Appointment Booked')
        CONSULTATION = 'consultation', _('Consultation')
        OTHER = 'other', _('Other')
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    activity_type = models.CharField(
        _('Activity Type'),
        max_length=30,
        choices=ActivityType.choices
    )
    description = models.TextField(blank=True)
    
    # Request details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('User Activity')
        verbose_name_plural = _('User Activities')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.phone} - {self.get_activity_type_display()}"