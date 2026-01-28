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
    FamilyHelper, DoctorAvailability, DoctorLeave, OTP
)
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
    """
    user = UserSerializer(read_only=True)
    bmi = serializers.FloatField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PatientProfile
        fields = [
            'id', 'user', 'blood_group', 'height_cm', 'weight_kg', 'bmi', 'age',
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
            'id', 'user', 'bmi', 'age',
            'total_appointments', 'total_consultations',
            'created_at', 'updated_at'
        ]


class PatientRegistrationSerializer(serializers.Serializer):
    """
    Serializer for Patient Registration.
    Validates Firebase token and creates user with patient profile.
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
    
    # Patient specific
    blood_group = serializers.ChoiceField(
        choices=PatientProfile.BloodGroup.choices,
        required=False,
        allow_blank=True
    )
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
    
    # FCM Token for push notifications
    fcm_token = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True
    )
    
    def validate_firebase_token(self, value):
        """
        Validate Firebase token and extract phone number.
        """
        phone = get_phone_from_token(value)
        
        if not phone:
            raise serializers.ValidationError(
                "Invalid or expired Firebase token"
            )
        
        # Store phone for later use
        self._phone = phone
        self._firebase_token = value
        
        return value
    
    def validate(self, attrs):
        """
        Check if user already exists.
        """
        phone = getattr(self, '_phone', None)
        
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({
                'phone': 'User with this phone number already exists. Please login instead.'
            })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create user and patient profile.
        """
        phone = self._phone
        
        # Remove non-user fields
        blood_group = validated_data.pop('blood_group', '')
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
        
        # Set unusable password (phone auth only)
        user.set_unusable_password()
        user.save()
        
        # Update patient profile (created by signal)
        patient_profile = user.patient_profile
        patient_profile.blood_group = blood_group
        patient_profile.emergency_contact_name = emergency_contact_name
        patient_profile.emergency_contact_phone = emergency_contact_phone
        patient_profile.is_literate = is_literate
        patient_profile.needs_voice_assistance = needs_voice_assistance
        patient_profile.save()
        
        return user


class PatientUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating patient profile.
    """
    # User fields
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    email = serializers.EmailField(required=False, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=User.Gender.choices,
        required=False
    )
    profile_photo = serializers.ImageField(required=False, allow_null=True)
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices,
        required=False
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
    
    class Meta:
        model = PatientProfile
        fields = [
            # User fields
            'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
            'profile_photo', 'preferred_language',
            'address', 'village', 'mandal', 'district', 'pincode',
            'latitude', 'longitude', 'fcm_token',
            # Patient profile fields
            'blood_group', 'height_cm', 'weight_kg',
            'chronic_conditions', 'allergies', 'current_medications',
            'past_surgeries', 'family_history',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation',
            'has_insurance', 'insurance_provider', 'insurance_id',
            'is_literate', 'needs_voice_assistance', 'needs_large_text'
        ]
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Update both user and patient profile.
        """
        user = instance.user
        
        # User fields to update
        user_fields = [
            'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
            'profile_photo', 'preferred_language',
            'address', 'village', 'mandal', 'district', 'pincode',
            'latitude', 'longitude', 'fcm_token'
        ]
        
        # Update user fields
        for field in user_fields:
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
        
        # Check if profile is complete
        user.is_profile_complete = all([
            user.first_name,
            user.date_of_birth,
            user.gender,
            user.village or user.district
        ])
        
        user.save()
        
        # Update patient profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        return instance


# ============================================
# DOCTOR SERIALIZERS
# ============================================

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    """
    Serializer for Doctor Availability.
    """
    day_name = serializers.CharField(
        source='get_day_of_week_display',
        read_only=True
    )
    
    class Meta:
        model = DoctorAvailability
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
    availabilities = DoctorAvailabilitySerializer(many=True, read_only=True)
    
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
    Only shows verified doctors with limited info.
    """
    name = serializers.SerializerMethodField()
    profile_photo = serializers.ImageField(source='user.profile_photo', read_only=True)
    specialization_display = serializers.CharField(
        source='get_specialization_display',
        read_only=True
    )
    languages = serializers.JSONField(source='languages_spoken', read_only=True)
    availabilities = DoctorAvailabilitySerializer(many=True, read_only=True)
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'name', 'profile_photo',
            'specialization', 'specialization_display',
            'qualification', 'experience_years',
            'hospital_name',
            'consultation_fee', 'consultation_duration',
            'languages', 'is_available_online',
            'average_rating', 'total_reviews', 'total_consultations',
            'bio', 'availabilities'
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
        """
        Validate Firebase token and extract phone number.
        """
        phone = get_phone_from_token(value)
        
        if not phone:
            raise serializers.ValidationError(
                "Invalid or expired Firebase token"
            )
        
        self._phone = phone
        return value
    
    def validate_registration_number(self, value):
        """
        Check if registration number is unique.
        """
        if DoctorProfile.objects.filter(registration_number=value).exists():
            raise serializers.ValidationError(
                "A doctor with this registration number already exists."
            )
        return value
    
    def validate(self, attrs):
        """
        Check if user already exists.
        """
        phone = getattr(self, '_phone', None)
        
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({
                'phone': 'User with this phone number already exists.'
            })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create user and doctor profile.
        """
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
        
        # Remove firebase_token
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
        doctor_profile = DoctorProfile.objects.create(
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
        """
        Update both user and doctor profile.
        """
        user = instance.user
        
        # User fields to update
        user_fields = [
            'first_name', 'last_name', 'email', 'date_of_birth', 'gender',
            'profile_photo', 'preferred_language', 'address', 'fcm_token'
        ]
        
        # Update user fields
        for field in user_fields:
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
        
        user.save()
        
        # Update doctor profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        return instance


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
        """
        Validate Firebase token and get phone number.
        """
        phone = get_phone_from_token(value)
        
        if not phone:
            raise serializers.ValidationError(
                "Invalid or expired Firebase token"
            )
        
        self._phone = phone
        return value
    
    def validate(self, attrs):
        """
        Check if user exists.
        """
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
        """
        Return the authenticated user.
        """
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
        """
        Validate phone number format.
        """
        # Remove any spaces or special characters
        value = ''.join(filter(str.isdigit, value))
        
        if len(value) != 10:
            raise serializers.ValidationError(
                "Please enter a valid 10-digit phone number."
            )
        
        if not value[0] in '6789':
            raise serializers.ValidationError(
                "Please enter a valid Indian mobile number."
            )
        
        return value
    
    def validate(self, attrs):
        """
        Check if helper already exists for this patient.
        """
        patient = self.context['request'].user
        helper_phone = attrs.get('helper_phone')
        
        if FamilyHelper.objects.filter(
            patient=patient,
            helper_phone=helper_phone
        ).exists():
            raise serializers.ValidationError({
                'helper_phone': 'This helper is already linked to your account.'
            })
        
        # If setting as primary, unset other primary helpers
        if attrs.get('is_primary', False):
            FamilyHelper.objects.filter(
                patient=patient,
                is_primary=True
            ).update(is_primary=False)
        
        return attrs
    
    def create(self, validated_data):
        """
        Create family helper.
        """
        patient = self.context['request'].user
        
        # Check if helper phone belongs to a registered user
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
    admin_level_display = serializers.CharField(
        source='get_admin_level_display',
        read_only=True
    )
    
    class Meta:
        model = AdminProfile
        fields = [
            'id', 'user', 'admin_level', 'admin_level_display',
            'department', 'designation',
            'can_manage_doctors', 'can_manage_patients',
            'can_verify_doctors', 'can_view_reports',
            'can_manage_content', 'can_manage_admins',
            'can_access_system_settings',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


# ============================================
# DOCTOR VERIFICATION SERIALIZER (Admin)
# ============================================

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