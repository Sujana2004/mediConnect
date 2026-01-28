"""
Health Records Serializers for MediConnect
==========================================
Serializers for all health record models with validation.
"""

from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import (
    HealthProfile,
    MedicalCondition,
    MedicalDocument,
    LabReport,
    VaccinationRecord,
    Allergy,
    FamilyMedicalHistory,
    Hospitalization,
    VitalSign,
    SharedRecord,
)

User = get_user_model()


# =============================================================================
# USER SERIALIZERS (Minimal for references)
# =============================================================================

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for references."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'phone', 'first_name', 'last_name', 'full_name', 'role']
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.phone


class DoctorMinimalSerializer(serializers.ModelSerializer):
    """Minimal doctor info for references."""
    full_name = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'phone', 'first_name', 'last_name', 'full_name', 'specialization']
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"Dr. {obj.first_name} {obj.last_name}".strip()

    def get_specialization(self, obj):
        if hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.specialization
        return None


# =============================================================================
# HEALTH PROFILE SERIALIZERS
# =============================================================================

class HealthProfileSerializer(serializers.ModelSerializer):
    """Full health profile serializer."""
    user = UserMinimalSerializer(read_only=True)
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()

    class Meta:
        model = HealthProfile
        fields = [
            'id', 'user',
            'blood_group', 'height_cm', 'weight_kg',
            'bmi', 'bmi_category',
            'allergies', 'chronic_conditions', 'current_medications',
            'family_history',
            'smoking_status', 'alcohol_consumption',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation',
            'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'bmi', 'bmi_category', 'created_at', 'updated_at']

    def get_bmi(self, obj):
        return obj.get_bmi()

    def get_bmi_category(self, obj):
        return obj.get_bmi_category()


class HealthProfileCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating health profile."""

    class Meta:
        model = HealthProfile
        fields = [
            'blood_group', 'height_cm', 'weight_kg',
            'allergies', 'chronic_conditions', 'current_medications',
            'family_history',
            'smoking_status', 'alcohol_consumption',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation',
            'notes',
        ]

    def validate_height_cm(self, value):
        if value and (value < 30 or value > 300):
            raise serializers.ValidationError("Height must be between 30 and 300 cm")
        return value

    def validate_weight_kg(self, value):
        if value and (value < 1 or value > 500):
            raise serializers.ValidationError("Weight must be between 1 and 500 kg")
        return value

    def validate_allergies(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Allergies must be a list")
        return value

    def validate_chronic_conditions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Chronic conditions must be a list")
        return value

    def validate_current_medications(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Current medications must be a list")
        return value


class HealthProfileSummarySerializer(serializers.ModelSerializer):
    """Summary view of health profile."""
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()
    allergy_count = serializers.SerializerMethodField()
    condition_count = serializers.SerializerMethodField()

    class Meta:
        model = HealthProfile
        fields = [
            'id', 'blood_group', 'height_cm', 'weight_kg',
            'bmi', 'bmi_category',
            'allergy_count', 'condition_count',
            'smoking_status', 'alcohol_consumption',
        ]
        read_only_fields = fields

    def get_bmi(self, obj):
        return obj.get_bmi()

    def get_bmi_category(self, obj):
        return obj.get_bmi_category()

    def get_allergy_count(self, obj):
        return len(obj.allergies) if obj.allergies else 0

    def get_condition_count(self, obj):
        return len(obj.chronic_conditions) if obj.chronic_conditions else 0


# =============================================================================
# MEDICAL CONDITION SERIALIZERS
# =============================================================================

class MedicalConditionSerializer(serializers.ModelSerializer):
    """Full medical condition serializer."""
    user = UserMinimalSerializer(read_only=True)
    diagnosed_by_info = DoctorMinimalSerializer(source='diagnosed_by', read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = MedicalCondition
        fields = [
            'id', 'user',
            'condition_name', 'condition_name_local', 'icd_code',
            'status', 'severity',
            'diagnosed_date', 'resolved_date',
            'diagnosed_by', 'diagnosed_by_info',
            'diagnosis_session', 'consultation',
            'treatment_notes', 'is_chronic',
            'duration',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'diagnosed_by_info', 'duration', 'created_at', 'updated_at']

    def get_duration(self, obj):
        """Calculate how long the condition has been active."""
        if obj.diagnosed_date:
            end_date = obj.resolved_date or timezone.now().date()
            days = (end_date - obj.diagnosed_date).days
            if days < 30:
                return f"{days} days"
            elif days < 365:
                months = days // 30
                return f"{months} month{'s' if months > 1 else ''}"
            else:
                years = days // 365
                return f"{years} year{'s' if years > 1 else ''}"
        return None


class MedicalConditionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating medical conditions."""

    class Meta:
        model = MedicalCondition
        fields = [
            'condition_name', 'condition_name_local', 'icd_code',
            'status', 'severity',
            'diagnosed_date', 'resolved_date',
            'diagnosed_by', 'diagnosis_session', 'consultation',
            'treatment_notes', 'is_chronic',
        ]

    def validate(self, data):
        if data.get('resolved_date') and data.get('diagnosed_date'):
            if data['resolved_date'] < data['diagnosed_date']:
                raise serializers.ValidationError({
                    'resolved_date': 'Resolved date cannot be before diagnosed date'
                })
        return data


class MedicalConditionListSerializer(serializers.ModelSerializer):
    """List view of medical conditions."""

    class Meta:
        model = MedicalCondition
        fields = [
            'id', 'condition_name', 'condition_name_local',
            'status', 'severity', 'is_chronic',
            'diagnosed_date',
        ]
        read_only_fields = fields


# =============================================================================
# MEDICAL DOCUMENT SERIALIZERS (Updated for Supabase)
# =============================================================================

class MedicalDocumentSerializer(serializers.ModelSerializer):
    """Full medical document serializer with file URL."""
    user = UserMinimalSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    has_file = serializers.ReadOnlyField()

    class Meta:
        model = MedicalDocument
        fields = [
            'id', 'user',
            'document_type', 'title', 'description',
            'file_path', 'file_url', 'has_file',
            'file_size', 'file_size_display', 'file_type',
            'original_filename', 'storage_type',
            'document_date',
            'hospital_name', 'doctor_name',
            'consultation', 'medical_condition',
            'is_shared_with_doctors', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'file_url', 'has_file',
            'file_size', 'file_size_display', 'file_type',
            'original_filename', 'storage_type',
            'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        """Get signed URL for file (valid for 1 hour)."""
        return obj.get_file_url(expiry_seconds=3600)

    def get_file_size_display(self, obj):
        """Get human-readable file size."""
        return obj.file_size_display


class MedicalDocumentUploadSerializer(serializers.Serializer):
    """Serializer for uploading documents with files."""
    file = serializers.FileField(required=True)
    document_type = serializers.ChoiceField(choices=MedicalDocument.DOCUMENT_TYPE_CHOICES)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    document_date = serializers.DateField(required=False, allow_null=True)
    hospital_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    doctor_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    consultation = serializers.UUIDField(required=False, allow_null=True)
    medical_condition = serializers.UUIDField(required=False, allow_null=True)
    is_shared_with_doctors = serializers.BooleanField(default=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list
    )

    def validate_file(self, value):
        """Validate uploaded file."""
        from .services.supabase_storage import get_storage_service
        
        storage = get_storage_service()
        is_valid, error = storage.validate_file(value)
        
        if not is_valid:
            raise serializers.ValidationError(error)
        
        return value


class MedicalDocumentListSerializer(serializers.ModelSerializer):
    """List view of documents."""
    file_size_display = serializers.ReadOnlyField()
    has_file = serializers.ReadOnlyField()

    class Meta:
        model = MedicalDocument
        fields = [
            'id', 'document_type', 'title',
            'file_type', 'file_size_display', 'has_file',
            'document_date', 'hospital_name',
            'storage_type',
            'created_at',
        ]
        read_only_fields = fields


# =============================================================================
# LAB REPORT SERIALIZERS
# =============================================================================

class LabReportResultSerializer(serializers.Serializer):
    """Serializer for individual lab test results."""
    name = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=50)
    unit = serializers.CharField(max_length=30, required=False, allow_blank=True)
    normal_range = serializers.CharField(max_length=50, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=['normal', 'low', 'high', 'abnormal', 'critical'],
        default='normal'
    )


class LabReportSerializer(serializers.ModelSerializer):
    """Full lab report serializer."""
    user = UserMinimalSerializer(read_only=True)
    document_info = MedicalDocumentListSerializer(source='document', read_only=True)
    abnormal_count = serializers.SerializerMethodField()

    class Meta:
        model = LabReport
        fields = [
            'id', 'user',
            'report_name', 'lab_type', 'test_date',
            'lab_name', 'doctor_name',
            'results', 'overall_status',
            'abnormal_count',
            'interpretation', 'recommendations',
            'document', 'document_info',
            'consultation',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'document_info', 'abnormal_count', 'created_at', 'updated_at']

    def get_abnormal_count(self, obj):
        return len(obj.get_abnormal_results())


class LabReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating lab reports."""
    results = LabReportResultSerializer(many=True, required=False)

    class Meta:
        model = LabReport
        fields = [
            'report_name', 'lab_type', 'test_date',
            'lab_name', 'doctor_name',
            'results', 'overall_status',
            'interpretation', 'recommendations',
            'document', 'consultation',
        ]

    def validate_test_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Test date cannot be in the future")
        return value

    def validate_results(self, value):
        if value:
            # Validate each result
            for result in value:
                if not result.get('name'):
                    raise serializers.ValidationError("Each result must have a name")
                if not result.get('value'):
                    raise serializers.ValidationError("Each result must have a value")
        return value


class LabReportListSerializer(serializers.ModelSerializer):
    """List view of lab reports."""
    abnormal_count = serializers.SerializerMethodField()

    class Meta:
        model = LabReport
        fields = [
            'id', 'report_name', 'lab_type', 'test_date',
            'lab_name', 'overall_status', 'abnormal_count',
        ]
        read_only_fields = fields

    def get_abnormal_count(self, obj):
        return len(obj.get_abnormal_results())


# =============================================================================
# VACCINATION RECORD SERIALIZERS
# =============================================================================

class VaccinationRecordSerializer(serializers.ModelSerializer):
    """Full vaccination record serializer."""
    user = UserMinimalSerializer(read_only=True)
    is_complete = serializers.ReadOnlyField()
    is_due = serializers.ReadOnlyField()
    certificate_info = MedicalDocumentListSerializer(source='certificate', read_only=True)
    verified_by_info = DoctorMinimalSerializer(source='verified_by', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'id', 'user',
            'vaccine_name', 'vaccine_name_local', 'vaccine_type',
            'dose_number', 'total_doses',
            'is_complete', 'is_due',
            'vaccination_date', 'next_due_date',
            'administered_by', 'administered_at',
            'batch_number', 'manufacturer',
            'side_effects',
            'certificate', 'certificate_info',
            'is_verified', 'verified_by', 'verified_by_info',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'is_complete', 'is_due',
            'certificate_info', 'verified_by_info',
            'created_at', 'updated_at'
        ]


class VaccinationRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating vaccination records."""

    class Meta:
        model = VaccinationRecord
        fields = [
            'vaccine_name', 'vaccine_name_local', 'vaccine_type',
            'dose_number', 'total_doses',
            'vaccination_date', 'next_due_date',
            'administered_by', 'administered_at',
            'batch_number', 'manufacturer',
            'side_effects', 'certificate',
        ]

    def validate_vaccination_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Vaccination date cannot be in the future")
        return value

    def validate(self, data):
        if data.get('dose_number', 1) > data.get('total_doses', 1):
            raise serializers.ValidationError({
                'dose_number': 'Dose number cannot exceed total doses'
            })
        return data


class VaccinationRecordListSerializer(serializers.ModelSerializer):
    """List view of vaccination records."""
    is_complete = serializers.ReadOnlyField()
    is_due = serializers.ReadOnlyField()

    class Meta:
        model = VaccinationRecord
        fields = [
            'id', 'vaccine_name', 'vaccine_type',
            'dose_number', 'total_doses',
            'is_complete', 'is_due',
            'vaccination_date', 'next_due_date',
            'is_verified',
        ]
        read_only_fields = fields


# =============================================================================
# ALLERGY SERIALIZERS
# =============================================================================

class AllergySerializer(serializers.ModelSerializer):
    """Full allergy serializer."""
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Allergy
        fields = [
            'id', 'user',
            'allergen', 'allergen_local', 'allergy_type',
            'severity', 'reaction',
            'first_observed', 'status',
            'diagnosed_by', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class AllergyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating allergies."""

    class Meta:
        model = Allergy
        fields = [
            'allergen', 'allergen_local', 'allergy_type',
            'severity', 'reaction',
            'first_observed', 'status',
            'diagnosed_by', 'notes',
        ]


class AllergyListSerializer(serializers.ModelSerializer):
    """List view of allergies."""

    class Meta:
        model = Allergy
        fields = [
            'id', 'allergen', 'allergy_type',
            'severity', 'status',
        ]
        read_only_fields = fields


class AllergySummarySerializer(serializers.ModelSerializer):
    """Critical allergy info for quick reference."""

    class Meta:
        model = Allergy
        fields = ['allergen', 'severity', 'allergy_type']
        read_only_fields = fields


# =============================================================================
# FAMILY MEDICAL HISTORY SERIALIZERS
# =============================================================================

class FamilyMedicalHistorySerializer(serializers.ModelSerializer):
    """Full family medical history serializer."""
    user = UserMinimalSerializer(read_only=True)
    relation_display = serializers.CharField(source='get_relation_display', read_only=True)

    class Meta:
        model = FamilyMedicalHistory
        fields = [
            'id', 'user',
            'relation', 'relation_display', 'relation_name',
            'condition', 'condition_local',
            'age_at_diagnosis',
            'is_deceased', 'age_at_death', 'cause_of_death',
            'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'relation_display', 'created_at', 'updated_at']


class FamilyMedicalHistoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating family history."""

    class Meta:
        model = FamilyMedicalHistory
        fields = [
            'relation', 'relation_name',
            'condition', 'condition_local',
            'age_at_diagnosis',
            'is_deceased', 'age_at_death', 'cause_of_death',
            'notes',
        ]


class FamilyMedicalHistoryListSerializer(serializers.ModelSerializer):
    """List view of family history."""
    relation_display = serializers.CharField(source='get_relation_display', read_only=True)

    class Meta:
        model = FamilyMedicalHistory
        fields = [
            'id', 'relation', 'relation_display',
            'condition', 'is_deceased',
        ]
        read_only_fields = fields


# =============================================================================
# HOSPITALIZATION SERIALIZERS
# =============================================================================

class HospitalizationSerializer(serializers.ModelSerializer):
    """Full hospitalization serializer."""
    user = UserMinimalSerializer(read_only=True)
    duration_days = serializers.ReadOnlyField()
    discharge_document_info = MedicalDocumentListSerializer(
        source='discharge_document', read_only=True
    )

    class Meta:
        model = Hospitalization
        fields = [
            'id', 'user',
            'hospital_name', 'hospital_address',
            'admission_date', 'discharge_date', 'duration_days',
            'admission_type', 'reason', 'diagnosis',
            'treating_doctor', 'department',
            'procedures',
            'discharge_summary',
            'discharge_document', 'discharge_document_info',
            'consultation',
            'follow_up_date', 'follow_up_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'duration_days',
            'discharge_document_info',
            'created_at', 'updated_at'
        ]


class HospitalizationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating hospitalization records."""

    class Meta:
        model = Hospitalization
        fields = [
            'hospital_name', 'hospital_address',
            'admission_date', 'discharge_date',
            'admission_type', 'reason', 'diagnosis',
            'treating_doctor', 'department',
            'procedures',
            'discharge_summary',
            'discharge_document', 'consultation',
            'follow_up_date', 'follow_up_notes',
        ]

    def validate(self, data):
        if data.get('discharge_date') and data.get('admission_date'):
            if data['discharge_date'] < data['admission_date']:
                raise serializers.ValidationError({
                    'discharge_date': 'Discharge date cannot be before admission date'
                })
        return data

    def validate_procedures(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Procedures must be a list")
        return value


class HospitalizationListSerializer(serializers.ModelSerializer):
    """List view of hospitalizations."""
    duration_days = serializers.ReadOnlyField()

    class Meta:
        model = Hospitalization
        fields = [
            'id', 'hospital_name',
            'admission_date', 'discharge_date', 'duration_days',
            'admission_type', 'reason',
        ]
        read_only_fields = fields


# =============================================================================
# VITAL SIGN SERIALIZERS
# =============================================================================

class VitalSignSerializer(serializers.ModelSerializer):
    """Full vital sign serializer."""
    user = UserMinimalSerializer(read_only=True)
    recorded_by_info = UserMinimalSerializer(source='recorded_by', read_only=True)
    bp_status = serializers.SerializerMethodField()
    bp_display = serializers.SerializerMethodField()

    class Meta:
        model = VitalSign
        fields = [
            'id', 'user',
            'recorded_at',
            'systolic_bp', 'diastolic_bp', 'bp_display', 'bp_status',
            'heart_rate',
            'temperature',
            'respiratory_rate',
            'oxygen_saturation',
            'blood_sugar', 'blood_sugar_type',
            'weight_kg',
            'source', 'recorded_by', 'recorded_by_info',
            'notes', 'consultation',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'bp_display', 'bp_status',
            'recorded_by_info', 'created_at', 'updated_at'
        ]

    def get_bp_status(self, obj):
        return obj.get_bp_status()

    def get_bp_display(self, obj):
        if obj.systolic_bp and obj.diastolic_bp:
            return f"{obj.systolic_bp}/{obj.diastolic_bp} mmHg"
        return None


class VitalSignCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating vital signs."""

    class Meta:
        model = VitalSign
        fields = [
            'recorded_at',
            'systolic_bp', 'diastolic_bp',
            'heart_rate',
            'temperature',
            'respiratory_rate',
            'oxygen_saturation',
            'blood_sugar', 'blood_sugar_type',
            'weight_kg',
            'source', 'notes', 'consultation',
        ]

    def validate_systolic_bp(self, value):
        if value and (value < 50 or value > 300):
            raise serializers.ValidationError("Systolic BP must be between 50 and 300")
        return value

    def validate_diastolic_bp(self, value):
        if value and (value < 30 or value > 200):
            raise serializers.ValidationError("Diastolic BP must be between 30 and 200")
        return value

    def validate_heart_rate(self, value):
        if value and (value < 20 or value > 300):
            raise serializers.ValidationError("Heart rate must be between 20 and 300")
        return value

    def validate_temperature(self, value):
        if value and (value < 90 or value > 115):
            raise serializers.ValidationError("Temperature must be between 90 and 115 °F")
        return value

    def validate_oxygen_saturation(self, value):
        if value and (value < 50 or value > 100):
            raise serializers.ValidationError("Oxygen saturation must be between 50 and 100")
        return value

    def validate_blood_sugar(self, value):
        if value and (value < 20 or value > 800):
            raise serializers.ValidationError("Blood sugar must be between 20 and 800")
        return value

    def validate(self, data):
        # At least one vital must be provided
        vital_fields = [
            'systolic_bp', 'heart_rate', 'temperature',
            'respiratory_rate', 'oxygen_saturation', 'blood_sugar', 'weight_kg'
        ]
        if not any(data.get(field) for field in vital_fields):
            raise serializers.ValidationError(
                "At least one vital sign measurement is required"
            )
        return data


class VitalSignListSerializer(serializers.ModelSerializer):
    """List view of vital signs."""
    bp_display = serializers.SerializerMethodField()
    bp_status = serializers.SerializerMethodField()

    class Meta:
        model = VitalSign
        fields = [
            'id', 'recorded_at',
            'bp_display', 'bp_status',
            'heart_rate', 'temperature',
            'oxygen_saturation', 'blood_sugar',
            'source',
        ]
        read_only_fields = fields

    def get_bp_display(self, obj):
        if obj.systolic_bp and obj.diastolic_bp:
            return f"{obj.systolic_bp}/{obj.diastolic_bp}"
        return None

    def get_bp_status(self, obj):
        return obj.get_bp_status()


class VitalSignTrendSerializer(serializers.Serializer):
    """Serializer for vital sign trends."""
    date = serializers.DateField()
    systolic_bp = serializers.IntegerField(allow_null=True)
    diastolic_bp = serializers.IntegerField(allow_null=True)
    heart_rate = serializers.IntegerField(allow_null=True)
    temperature = serializers.DecimalField(max_digits=4, decimal_places=1, allow_null=True)
    oxygen_saturation = serializers.IntegerField(allow_null=True)
    blood_sugar = serializers.IntegerField(allow_null=True)
    weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)


# =============================================================================
# SHARED RECORD SERIALIZERS
# =============================================================================

class SharedRecordSerializer(serializers.ModelSerializer):
    """Full shared record serializer."""
    patient = UserMinimalSerializer(read_only=True)
    doctor = DoctorMinimalSerializer(read_only=True)
    documents_info = MedicalDocumentListSerializer(source='documents', many=True, read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = SharedRecord
        fields = [
            'id',
            'patient', 'doctor',
            'share_type',
            'documents', 'documents_info',
            'is_permanent', 'expires_at',
            'last_accessed_at', 'access_count',
            'is_active', 'revoked_at',
            'is_expired',
            'consultation',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'patient', 'documents_info',
            'last_accessed_at', 'access_count',
            'revoked_at', 'is_expired',
            'created_at', 'updated_at'
        ]

    def get_is_expired(self, obj):
        return obj.is_expired()


class SharedRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating shared records."""
    doctor_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = SharedRecord
        fields = [
            'doctor_id',
            'share_type',
            'documents',
            'is_permanent', 'expires_at',
            'consultation',
        ]

    def validate_doctor_id(self, value):
        try:
            doctor = User.objects.get(id=value, role='doctor')
        except User.DoesNotExist:
            raise serializers.ValidationError("Doctor not found")
        return value

    def validate(self, data):
        if not data.get('is_permanent') and not data.get('expires_at'):
            raise serializers.ValidationError({
                'expires_at': 'Expiry date is required for temporary sharing'
            })
        if data.get('expires_at') and data['expires_at'] < timezone.now():
            raise serializers.ValidationError({
                'expires_at': 'Expiry date must be in the future'
            })
        return data

    def create(self, validated_data):
        doctor_id = validated_data.pop('doctor_id')
        doctor = User.objects.get(id=doctor_id)
        validated_data['doctor'] = doctor
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class SharedRecordListSerializer(serializers.ModelSerializer):
    """List view of shared records."""
    doctor = DoctorMinimalSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = SharedRecord
        fields = [
            'id', 'doctor', 'share_type',
            'is_permanent', 'expires_at',
            'is_active', 'is_expired',
            'access_count', 'created_at',
        ]
        read_only_fields = fields

    def get_is_expired(self, obj):
        return obj.is_expired()


# =============================================================================
# COMPREHENSIVE HEALTH SUMMARY SERIALIZERS
# =============================================================================

class HealthSummarySerializer(serializers.Serializer):
    """Complete health summary for a patient."""
    profile = HealthProfileSummarySerializer()
    active_conditions = MedicalConditionListSerializer(many=True)
    recent_documents = MedicalDocumentListSerializer(many=True)
    recent_lab_reports = LabReportListSerializer(many=True)
    vaccinations_due = VaccinationRecordListSerializer(many=True)
    critical_allergies = AllergySummarySerializer(many=True)
    latest_vitals = VitalSignSerializer()
    recent_hospitalizations = HospitalizationListSerializer(many=True)


class HealthTimelineSerializer(serializers.Serializer):
    """Timeline entry for health events."""
    id = serializers.UUIDField()
    event_type = serializers.CharField()  # condition, document, lab_report, vaccination, hospitalization, vital
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    date = serializers.DateField()
    severity = serializers.CharField(allow_null=True)
    status = serializers.CharField(allow_null=True)


class DoctorAccessibleRecordsSerializer(serializers.Serializer):
    """Records accessible to a doctor for a patient."""
    patient = UserMinimalSerializer()
    health_profile = HealthProfileSerializer()
    medical_conditions = MedicalConditionListSerializer(many=True)
    allergies = AllergyListSerializer(many=True)
    documents = MedicalDocumentListSerializer(many=True)
    lab_reports = LabReportListSerializer(many=True)
    vaccinations = VaccinationRecordListSerializer(many=True)
    vital_signs = VitalSignListSerializer(many=True)
    family_history = FamilyMedicalHistoryListSerializer(many=True)
    hospitalizations = HospitalizationListSerializer(many=True)


# =============================================================================
# QUICK DATA SERIALIZER
# =============================================================================

class HealthRecordsQuickDataSerializer(serializers.Serializer):
    """Quick data for dashboard."""
    has_profile = serializers.BooleanField()
    blood_group = serializers.CharField(allow_null=True)
    bmi = serializers.FloatField(allow_null=True)
    bmi_category = serializers.CharField(allow_null=True)
    active_conditions_count = serializers.IntegerField()
    active_allergies_count = serializers.IntegerField()
    documents_count = serializers.IntegerField()
    pending_vaccinations_count = serializers.IntegerField()
    latest_vitals = VitalSignListSerializer(allow_null=True)
    critical_allergies = serializers.ListField(child=serializers.CharField())