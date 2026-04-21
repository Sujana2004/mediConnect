"""
Serializers for users app.
Handles data validation and transformation for API endpoints.
"""

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from .models import (
    PatientProfile, DoctorProfile, AdminProfile,
    FamilyHelper, OTP
)
from apps.appointments.models import DoctorSchedule, ScheduleException
from .firebase_auth import verify_firebase_token, get_phone_from_token

User = get_user_model()


# ============================================
# TOKEN SERIALIZERS
# ============================================

class TokenSerializer(serializers.Serializer):
    """
    Serializer for JWT tokens response.
    """
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


def get_tokens_for_user(user):
    """
    Generate JWT tokens for a user.
    """
    refresh = RefreshToken.for_user(user)
    
    # Add custom claims
    refresh['role'] = user.role
    refresh['phone'] = user.phone
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ============================================
# USER SERIALIZERS
# ============================================

class UserBasicSerializer(serializers.ModelSerializer):
    """
    Basic user serializer with minimal fields.
    Used for nested representations.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'phone', 'first_name', 'last_name', 'full_name',
            'profile_photo', 'role', 'preferred_language'
        ]
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    """
    Full user serializer.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'phone', 'email', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'age', 'gender', 'profile_photo',
            'preferred_language', 'role',
            'address', 'village', 'mandal', 'district', 'state', 'pincode',
            'latitude', 'longitude',
            'is_phone_verified', 'is_profile_complete',
            'created_at', 'last_active'
        ]
        read_only_fields = [
            'id', 'phone', 'role', 'is_phone_verified',
            'created_at', 'last_active'
        ]
    
    def get_age(self, obj):
        if obj.date_of_birth:
            today = timezone.now().date()
            dob = obj.date_of_birth
            return today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day)
            )
        return None


# ============================================
# PATIENT SERIALIZERS
# ============================================

class PatientProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Patient Profile.
    Includes health data from HealthProfile for complete patient view.
    """
    user = UserSerializer(read_only=True)
    age = serializers.SerializerMethodField()
    
    blood_group = serializers.SerializerMethodField()
    height_cm = serializers.SerializerMethodField()
    weight_kg = serializers.SerializerMethodField()
    bmi = serializers.SerializerMethodField()
    chronic_conditions = serializers.SerializerMethodField()
    allergies = serializers.SerializerMethodField()
    current_medications = serializers.SerializerMethodField()
    family_history = serializers.SerializerMethodField()
    emergency_contact_name = serializers.SerializerMethodField()
    emergency_contact_phone = serializers.SerializerMethodField()
    emergency_contact_relation = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientProfile
        fields = [
            'id', 'user', 'age',
            'blood_group', 'height_cm', 'weight_kg', 'bmi',
            'chronic_conditions', 'allergies', 'current_medications',
            'past_surgeries', 'family_history',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation',
            'has_insurance', 'insurance_provider', 'insurance_id',
            'is_literate', 'needs_voice_assistance', 'needs_large_text',
            'total_appointments', 'total_consultations',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'age', 'blood_group', 'height_cm', 'weight_kg', 'bmi',
            'total_appointments', 'total_consultations',
            'created_at', 'updated_at'
        ]
    
    def get_age(self, obj):
        return obj.age
    
    def get_blood_group(self, obj):
        try:
            return getattr(obj.user.health_profile, 'blood_group', 'unknown')
        except:
            return 'unknown'
    
    def get_height_cm(self, obj):
        try:
            value = getattr(obj.user.health_profile, 'height_cm', None)
            return float(value) if value else None
        except:
            return None
    
    def get_weight_kg(self, obj):
        try:
            value = getattr(obj.user.health_profile, 'weight_kg', None)
            return float(value) if value else None
        except:
            return None
    
    def get_bmi(self, obj):
        try:
            hp = obj.user.health_profile
            return hp.get_bmi()
        except:
            return None

    def get_chronic_conditions(self, obj):
        try:
            return obj.user.health_profile.chronic_conditions or []
        except:
            return []

    def get_allergies(self, obj):
        try:
            return obj.user.health_profile.allergies or []
        except:
            return []

    def get_current_medications(self, obj):
        try:
            return obj.user.health_profile.current_medications or []
        except:
            return []

    def get_family_history(self, obj):
        try:
            return obj.user.health_profile.family_history or {}
        except:
            return {}

    def get_emergency_contact_name(self, obj):
        try:
            return obj.user.health_profile.emergency_contact_name
        except:
            return ''

    def get_emergency_contact_phone(self, obj):
        try:
            return obj.user.health_profile.emergency_contact_phone
        except:
            return ''

    def get_emergency_contact_relation(self, obj):
        try:
            return obj.user.health_profile.emergency_contact_relation
        except:
            return ''


class PatientRegistrationSerializer(serializers.Serializer):
    """
    Serializer for Patient Registration.
    """
    firebase_token = serializers.CharField(
        write_only=True,
        help_text="Firebase ID token from phone authentication"
    )
    first_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    last_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=User.Gender.choices,
        required=False,
        allow_blank=True
    )
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices,
        default='te'
    )
    
    # Location
    village = serializers.CharField(max_length=100, required=False, allow_blank=True)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Emergency contact
    emergency_contact_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    emergency_contact_phone = serializers.CharField(
        max_length=15,
        required=False,
        allow_blank=True
    )
    
    # Accessibility
    is_literate = serializers.BooleanField(default=True)
    needs_voice_assistance = serializers.BooleanField(default=False)
    
    # FCM Token
    fcm_token = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True
    )
    
    def validate_firebase_token(self, value):
        phone = get_phone_from_token(value)
        
        if not phone:
            raise serializers.ValidationError(
                "Invalid or expired Firebase token"
            )
        
        self._phone = phone
        self._firebase_token = value
        
        return value
    
    def validate(self, attrs):
        phone = getattr(self, '_phone', None)
        
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({
                'phone': 'User with this phone number already exists. Please login instead.'
            })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        phone = self._phone
        
        # Remove non-user fields
        emergency_contact_name = validated_data.pop('emergency_contact_name', '')
        emergency_contact_phone = validated_data.pop('emergency_contact_phone', '')
        is_literate = validated_data.pop('is_literate', True)
        needs_voice_assistance = validated_data.pop('needs_voice_assistance', False)
        validated_data.pop('firebase_token', None)
        
        # Create user
        user = User.objects.create(
            phone=phone,
            role=User.Role.PATIENT,
            is_phone_verified=True,
            **validated_data
        )
        
        user.set_unusable_password()
        user.save()
        
        # Update patient profile and health profile (created by signals)
        patient_profile = user.patient_profile
        patient_profile.is_literate = is_literate
        patient_profile.needs_voice_assistance = needs_voice_assistance
        patient_profile.save(update_fields=['is_literate', 'needs_voice_assistance', 'updated_at'])

        try:
            from apps.health_records.models import HealthProfile
            health_profile, _ = HealthProfile.objects.get_or_create(user=user)
            health_profile.emergency_contact_name = emergency_contact_name
            health_profile.emergency_contact_phone = emergency_contact_phone
            health_profile.save(update_fields=['emergency_contact_name', 'emergency_contact_phone', 'updated_at'])
        except Exception:
            pass
        
        return user


class PatientUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating patient profile.
    Handles sync with HealthProfile for health-related data.
    """
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=User.Gender.choices,
        required=False,
        allow_blank=True
    )
    profile_photo = serializers.ImageField(required=False, allow_null=True)
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices,
        required=False,
        allow_blank=True
    )
    address = serializers.CharField(required=False, allow_blank=True)
    village = serializers.CharField(max_length=100, required=False, allow_blank=True)
    mandal = serializers.CharField(max_length=100, required=False, allow_blank=True)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        required=False, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        required=False, allow_null=True
    )
    fcm_token = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    blood_group = serializers.CharField(required=False, allow_blank=True)
    height_cm = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        required=False, allow_null=True
    )
    weight_kg = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        required=False, allow_null=True
    )
    
    chronic_conditions = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    allergies = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    current_medications = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    past_surgeries = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    family_history = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_relation = serializers.CharField(required=False, allow_blank=True)
    
    has_insurance = serializers.BooleanField(required=False)
    insurance_provider = serializers.CharField(required=False, allow_blank=True)
    insurance_id = serializers.CharField(required=False, allow_blank=True)
    is_literate = serializers.BooleanField(required=False)
    needs_voice_assistance = serializers.BooleanField(required=False)
    needs_large_text = serializers.BooleanField(required=False)

    def validate_blood_group(self, value):
        if value in [None, '']:
            return value

        valid_groups = {
            'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'
        }
        if value not in valid_groups:
            raise serializers.ValidationError("Invalid blood group value")

        return value

    def validate_height_cm(self, value):
        if value is None:
            return value
        if value < 30 or value > 300:
            raise serializers.ValidationError("Height must be between 30 and 300 cm")
        return value

    def validate_weight_kg(self, value):
        if value is None:
            return value
        if value < 1 or value > 500:
            raise serializers.ValidationError("Weight must be between 1 and 500 kg")
        return value
    
    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user
        
        user_fields = [
            'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
            'profile_photo', 'preferred_language',
            'address', 'village', 'mandal', 'district', 'pincode',
            'latitude', 'longitude', 'fcm_token'
        ]
        
        health_fields = [
            'blood_group', 'height_cm', 'weight_kg',
            'chronic_conditions', 'allergies', 'current_medications',
            'family_history', 'emergency_contact_name',
            'emergency_contact_phone', 'emergency_contact_relation'
        ]
        
        patient_profile_fields = [
            'past_surgeries',
            'has_insurance', 'insurance_provider', 'insurance_id',
            'is_literate', 'needs_voice_assistance', 'needs_large_text'
        ]
        
        health_data = {}
        patient_data = {}
        
        for field in user_fields:
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
        
        for field in health_fields:
            if field in validated_data:
                value = validated_data.pop(field)
                if field == 'blood_group' and value in [None, '']:
                    continue

                if value not in [None, '']:
                    health_data[field] = value
        
        for field in patient_profile_fields:
            if field in validated_data:
                value = validated_data.pop(field)
                if field in ['has_insurance', 'is_literate', 'needs_voice_assistance', 'needs_large_text']:
                    if value is not None:
                        patient_data[field] = value
                elif value not in [None, '']:
                    patient_data[field] = value
        
        user.is_profile_complete = all([
            user.first_name,
            user.date_of_birth,
            user.gender,
            user.village or user.district
        ])
        
        user.save()
        
        for attr, value in patient_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        self._sync_to_health_profile(user, health_data)
        
        return instance
    
    def _sync_to_health_profile(self, user, health_data):
        """Sync health data to HealthProfile."""
        if not health_data:
            return
        
        try:
            from apps.health_records.models import HealthProfile
            health_profile, _ = HealthProfile.objects.get_or_create(user=user)
            
            for field, value in health_data.items():
                setattr(health_profile, field, value)
            
            health_profile.save(update_fields=list(health_data.keys()) + ['updated_at'])
        except Exception as e:
            raise serializers.ValidationError({
                'health_profile': f'Failed to sync health profile data: {str(e)}'
            })


# ============================================
# DOCTOR SERIALIZERS
# ============================================

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    """
    Serializer for Doctor Availability.
    """
    day_name = serializers.CharField(source='get_day_name', read_only=True)
    is_available = serializers.BooleanField(source='is_active', required=False)
    slot_duration = serializers.IntegerField(source='slot_duration_minutes', required=False)
    max_appointments = serializers.IntegerField(source='max_patients_per_slot', required=False)
    
    class Meta:
        model = DoctorSchedule
        fields = [
            'id', 'day_of_week', 'day_name',
            'start_time', 'end_time',
            'is_available', 'slot_duration', 'max_appointments'
        ]


class DoctorProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Doctor Profile.
    """
    user = UserSerializer(read_only=True)
    specialization_display = serializers.CharField(
        source='get_specialization_display',
        read_only=True
    )
    verification_status_display = serializers.CharField(
        source='get_verification_status_display',
        read_only=True
    )
    availabilities = DoctorAvailabilitySerializer(
        many=True, 
        read_only=True,
        source='user.schedules'
    )
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user',
            'registration_number', 'registration_council',
            'specialization', 'specialization_display',
            'qualification', 'experience_years',
            'hospital_name', 'hospital_address',
            'consultation_fee', 'consultation_duration',
            'languages_spoken',
            'is_available_online',
            'verification_status', 'verification_status_display',
            'average_rating', 'total_reviews', 'total_consultations',
            'bio', 'availabilities',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'verification_status',
            'average_rating', 'total_reviews', 'total_consultations',
            'created_at', 'updated_at'
        ]


class DoctorPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for Doctor (for patients to view).
    FIXED: Returns user.id as primary ID for frontend
    """
    # ✅ FIXED - Use IntegerField (not UUIDField)
    id = serializers.IntegerField(source='user.id', read_only=True)
    
    name = serializers.SerializerMethodField()
    profile_id = serializers.IntegerField(source='pk', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    profile_photo = serializers.ImageField(source='user.profile_photo', read_only=True)
    specialization_display = serializers.CharField(
        source='get_specialization_display',
        read_only=True
    )
    languages = serializers.JSONField(source='languages_spoken', read_only=True)
    availabilities = DoctorAvailabilitySerializer(
        many=True, 
        read_only=True,
        source='user.schedules'
    )
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id',           # ✅ Returns User.id (Integer)
            'profile_id',   # DoctorProfile.id
            'user_id',      # Also available explicitly
            'name', 
            'profile_photo',
            'specialization', 
            'specialization_display',
            'qualification', 
            'experience_years',
            'hospital_name',
            'consultation_fee', 
            'consultation_duration',
            'languages', 
            'is_available_online',
            'average_rating', 
            'total_reviews', 
            'total_consultations',
            'bio', 
            'availabilities'
        ]
    
    def get_name(self, obj):
        return f"Dr. {obj.user.get_full_name()}"


class DoctorRegistrationSerializer(serializers.Serializer):
    """
    Serializer for Doctor Registration.
    """
    firebase_token = serializers.CharField(
        write_only=True,
        help_text="Firebase ID token from phone authentication"
    )
    
    # Personal info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=User.Gender.choices, required=False)
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices,
        default='te'
    )
    
    # Professional info
    registration_number = serializers.CharField(max_length=50)
    registration_council = serializers.CharField(max_length=100)
    specialization = serializers.ChoiceField(
        choices=DoctorProfile.Specialization.choices,
        default='general'
    )
    qualification = serializers.CharField(max_length=200)
    experience_years = serializers.IntegerField(min_value=0, default=0)
    
    # Work details
    hospital_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    hospital_address = serializers.CharField(required=False, allow_blank=True)
    consultation_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2,
        required=False, default=0
    )
    
    # Languages
    languages_spoken = serializers.ListField(
        child=serializers.CharField(),
        default=['telugu']
    )
    
    # Bio
    bio = serializers.CharField(required=False, allow_blank=True)
    
    # Document
    verification_document = serializers.FileField(required=False, allow_null=True)
    
    # FCM Token
    fcm_token = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_firebase_token(self, value):
        phone = get_phone_from_token(value)
        
        if not phone:
            raise serializers.ValidationError(
                "Invalid or expired Firebase token"
            )
        
        self._phone = phone
        return value
    
    def validate_registration_number(self, value):
        if DoctorProfile.objects.filter(registration_number=value).exists():
            raise serializers.ValidationError(
                "A doctor with this registration number already exists."
            )
        return value
    
    def validate(self, attrs):
        phone = getattr(self, '_phone', None)
        
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({
                'phone': 'User with this phone number already exists.'
            })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        phone = self._phone
        
        # Extract doctor profile fields
        registration_number = validated_data.pop('registration_number')
        registration_council = validated_data.pop('registration_council')
        specialization = validated_data.pop('specialization')
        qualification = validated_data.pop('qualification')
        experience_years = validated_data.pop('experience_years', 0)
        hospital_name = validated_data.pop('hospital_name', '')
        hospital_address = validated_data.pop('hospital_address', '')
        consultation_fee = validated_data.pop('consultation_fee', 0)
        languages_spoken = validated_data.pop('languages_spoken', ['telugu'])
        bio = validated_data.pop('bio', '')
        verification_document = validated_data.pop('verification_document', None)
        
        validated_data.pop('firebase_token', None)
        
        # Create user
        user = User.objects.create(
            phone=phone,
            role=User.Role.DOCTOR,
            is_phone_verified=True,
            **validated_data
        )
        
        user.set_unusable_password()
        user.save()
        
        # Create doctor profile
        DoctorProfile.objects.create(
            user=user,
            registration_number=registration_number,
            registration_council=registration_council,
            specialization=specialization,
            qualification=qualification,
            experience_years=experience_years,
            hospital_name=hospital_name,
            hospital_address=hospital_address,
            consultation_fee=consultation_fee,
            languages_spoken=languages_spoken,
            bio=bio,
            verification_document=verification_document,
            verification_status=DoctorProfile.VerificationStatus.PENDING
        )
        
        return user


class DoctorUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating doctor profile.
    """
    # User fields
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    email = serializers.EmailField(required=False, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=User.Gender.choices, required=False)
    profile_photo = serializers.ImageField(required=False, allow_null=True)
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices,
        required=False
    )
    address = serializers.CharField(required=False, allow_blank=True)
    fcm_token = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    class Meta:
        model = DoctorProfile
        fields = [
            # User fields
            'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
            'profile_photo', 'preferred_language', 'address', 'fcm_token',
            # Doctor profile fields
            'specialization', 'qualification', 'experience_years',
            'hospital_name', 'hospital_address',
            'consultation_fee', 'consultation_duration',
            'languages_spoken', 'is_available_online', 'bio'
        ]
    
    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user
        
        user_fields = [
            'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
            'profile_photo', 'preferred_language', 'address', 'fcm_token'
        ]
        
        for field in user_fields:
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
        
        user.save()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        return instance


# ============================================
# DOCTOR LEAVE SERIALIZER
# ============================================

class DoctorLeaveSerializer(serializers.ModelSerializer):
    """
    Serializer for Doctor Leave.
    """
    date = serializers.DateField(source='exception_date')
    is_full_day = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleException
        fields = [
            'id', 'date', 'reason', 'is_full_day',
            'start_time', 'end_time', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_is_full_day(self, obj):
        return obj.exception_type == 'leave'

    def _is_full_day(self):
        value = self.initial_data.get('is_full_day', True)
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ['1', 'true', 'yes', 'on']
        return bool(value)
    
    def validate_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError(
                "Cannot add leave for past dates."
            )
        return value
    
    def validate(self, attrs):
        is_full_day = self._is_full_day()
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        
        if not is_full_day:
            if not start_time or not end_time:
                raise serializers.ValidationError({
                    'start_time': 'Start time and end time are required for partial day leave.'
                })
            if start_time >= end_time:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time.'
                })
        
        return attrs

    def create(self, validated_data):
        is_full_day = self._is_full_day()
        validated_data['exception_type'] = 'leave' if is_full_day else 'modified'
        return super().create(validated_data)


# ============================================
# LOGIN SERIALIZER
# ============================================

class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login with Firebase token.
    """
    firebase_token = serializers.CharField(
        write_only=True,
        help_text="Firebase ID token from phone authentication"
    )
    fcm_token = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Firebase Cloud Messaging token for push notifications"
    )
    
    def validate_firebase_token(self, value):
        phone = get_phone_from_token(value)
        
        if not phone:
            raise serializers.ValidationError(
                "Invalid or expired Firebase token"
            )
        
        self._phone = phone
        return value
    
    def validate(self, attrs):
        phone = getattr(self, '_phone', None)
        
        try:
            user = User.objects.get(phone=phone)
            
            if not user.is_active:
                raise serializers.ValidationError({
                    'phone': 'This account has been deactivated.'
                })
            
            self._user = user
            
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'phone': 'No account found with this phone number. Please register first.'
            })
        
        return attrs
    
    def get_user(self):
        return getattr(self, '_user', None)


# ============================================
# FAMILY HELPER SERIALIZERS
# ============================================

class FamilyHelperSerializer(serializers.ModelSerializer):
    """
    Serializer for Family Helper.
    """
    patient_name = serializers.CharField(
        source='patient.get_full_name',
        read_only=True
    )
    relationship_display = serializers.CharField(
        source='get_relationship_display',
        read_only=True
    )
    
    class Meta:
        model = FamilyHelper
        fields = [
            'id', 'patient', 'patient_name',
            'helper_user', 'helper_name', 'helper_phone',
            'relationship', 'relationship_display',
            'can_book_appointments', 'can_view_records',
            'can_chat_with_doctor', 'can_manage_medications',
            'is_active', 'is_primary', 'is_verified',
            'created_at'
        ]
        read_only_fields = [
            'id', 'patient', 'helper_user',
            'is_verified', 'created_at'
        ]


class AddFamilyHelperSerializer(serializers.ModelSerializer):
    """
    Serializer for adding a family helper.
    """
    
    class Meta:
        model = FamilyHelper
        fields = [
            'helper_name', 'helper_phone', 'relationship',
            'can_book_appointments', 'can_view_records',
            'can_chat_with_doctor', 'can_manage_medications',
            'is_primary'
        ]
    
    def validate_helper_phone(self, value):
        value = ''.join(filter(str.isdigit, value))
        
        if len(value) != 10:
            raise serializers.ValidationError(
                "Please enter a valid 10-digit phone number."
            )
        
        if value[0] not in '6789':
            raise serializers.ValidationError(
                "Please enter a valid Indian mobile number."
            )
        
        return value
    
    def validate(self, attrs):
        patient = self.context['request'].user
        helper_phone = attrs.get('helper_phone')
        
        if FamilyHelper.objects.filter(
            patient=patient,
            helper_phone=helper_phone
        ).exists():
            raise serializers.ValidationError({
                'helper_phone': 'This helper is already linked to your account.'
            })
        
        if attrs.get('is_primary', False):
            FamilyHelper.objects.filter(
                patient=patient,
                is_primary=True
            ).update(is_primary=False)
        
        return attrs
    
    def create(self, validated_data):
        patient = self.context['request'].user
        
        helper_user = None
        try:
            helper_user = User.objects.get(phone=validated_data['helper_phone'])
        except User.DoesNotExist:
            pass
        
        helper = FamilyHelper.objects.create(
            patient=patient,
            helper_user=helper_user,
            **validated_data
        )
        
        return helper


# ============================================
# ADMIN SERIALIZERS
# ============================================

class AdminProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin Profile.
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = AdminProfile
        fields = [
            'id', 'user',
            'department', 'designation',
            'can_manage_doctors', 'can_manage_patients',
            'can_verify_doctors', 'can_view_reports',
            'can_manage_content',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class DoctorVerificationSerializer(serializers.Serializer):
    """
    Serializer for admin to verify/reject doctors.
    """
    action = serializers.ChoiceField(
        choices=['verify', 'reject'],
        help_text="Action to perform: verify or reject"
    )
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for rejection (required if action is 'reject')"
    )
    
    def validate(self, attrs):
        if attrs['action'] == 'reject' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Please provide a reason for rejection.'
            })
        return attrs


# ============================================
# LOGOUT SERIALIZER
# ============================================

class LogoutSerializer(serializers.Serializer):
    """
    Serializer for logout.
    """
    refresh = serializers.CharField(
        help_text="Refresh token to blacklist"
    )


# ============================================
# CHANGE LANGUAGE SERIALIZER
# ============================================

class ChangeLanguageSerializer(serializers.Serializer):
    """
    Serializer for changing user's preferred language.
    """
    language = serializers.ChoiceField(
        choices=User.Language.choices,
        help_text="Preferred language code: te, hi, or en"
    )


# ============================================
# FCM TOKEN SERIALIZER
# ============================================

class UpdateFCMTokenSerializer(serializers.Serializer):
    """
    Serializer for updating FCM token.
    """
    fcm_token = serializers.CharField(
        max_length=500,
        help_text="Firebase Cloud Messaging token"
    )