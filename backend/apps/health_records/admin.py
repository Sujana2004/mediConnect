"""
Health Records Admin Configuration
==================================
Admin interface for managing health records.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

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


@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    """Admin for Health Profile."""
    
    list_display = [
        'user_phone', 'blood_group', 'bmi_display',
        'allergy_count', 'condition_count',
        'smoking_status', 'has_emergency_contact',
        'updated_at'
    ]
    list_filter = [
        'blood_group', 'smoking_status', 'alcohol_consumption',
        'created_at', 'updated_at'
    ]
    search_fields = ['user__phone', 'user__first_name', 'user__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'bmi_display', 'bmi_category_display']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Basic Health Info', {
            'fields': ('blood_group', 'height_cm', 'weight_kg', 'bmi_display', 'bmi_category_display')
        }),
        ('Medical Info', {
            'fields': ('allergies', 'chronic_conditions', 'current_medications')
        }),
        ('Lifestyle', {
            'fields': ('smoking_status', 'alcohol_consumption')
        }),
        ('Family History', {
            'fields': ('family_history',),
            'classes': ('collapse',)
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Phone'
    user_phone.admin_order_field = 'user__phone'
    
    def bmi_display(self, obj):
        bmi = obj.get_bmi()
        return f"{bmi:.1f}" if bmi else "-"
    bmi_display.short_description = 'BMI'
    
    def bmi_category_display(self, obj):
        return obj.get_bmi_category()
    bmi_category_display.short_description = 'BMI Category'
    
    def allergy_count(self, obj):
        count = len(obj.allergies) if obj.allergies else 0
        return count
    allergy_count.short_description = 'Allergies'
    
    def condition_count(self, obj):
        count = len(obj.chronic_conditions) if obj.chronic_conditions else 0
        return count
    condition_count.short_description = 'Chronic Conditions'
    
    def has_emergency_contact(self, obj):
        return bool(obj.emergency_contact_phone)
    has_emergency_contact.boolean = True
    has_emergency_contact.short_description = 'Emergency Contact'


@admin.register(MedicalCondition)
class MedicalConditionAdmin(admin.ModelAdmin):
    """Admin for Medical Conditions."""
    
    list_display = [
        'condition_name', 'user_phone', 'status', 'severity',
        'is_chronic', 'diagnosed_date', 'diagnosed_by_name'
    ]
    list_filter = ['status', 'severity', 'is_chronic', 'diagnosed_date']
    search_fields = [
        'condition_name', 'condition_name_local',
        'user__phone', 'user__first_name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'diagnosed_date'
    
    fieldsets = (
        ('Condition Info', {
            'fields': ('user', 'condition_name', 'condition_name_local', 'icd_code')
        }),
        ('Status', {
            'fields': ('status', 'severity', 'is_chronic')
        }),
        ('Dates', {
            'fields': ('diagnosed_date', 'resolved_date')
        }),
        ('Doctor', {
            'fields': ('diagnosed_by',)
        }),
        ('Links', {
            'fields': ('diagnosis_session', 'consultation'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('treatment_notes',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    user_phone.admin_order_field = 'user__phone'
    
    def diagnosed_by_name(self, obj):
        if obj.diagnosed_by:
            return f"Dr. {obj.diagnosed_by.first_name} {obj.diagnosed_by.last_name}"
        return "-"
    diagnosed_by_name.short_description = 'Diagnosed By'


@admin.register(MedicalDocument)
class MedicalDocumentAdmin(admin.ModelAdmin):
    """Admin for Medical Documents."""
    
    list_display = [
        'title', 'user_phone', 'document_type', 'file_type_display',
        'file_size_display', 'document_date', 'is_shared_with_doctors'
    ]
    list_filter = ['document_type', 'is_shared_with_doctors', 'created_at']
    search_fields = ['title', 'description', 'user__phone', 'hospital_name']
    readonly_fields = ['id', 'file_size', 'file_type', 'created_at', 'updated_at']
    date_hierarchy = 'document_date'
    
    fieldsets = (
        ('Document Info', {
            'fields': ('user', 'document_type', 'title', 'description')
        }),
        ('File', {
            'fields': ('file', 'file_size', 'file_type')
        }),
        ('Metadata', {
            'fields': ('document_date', 'hospital_name', 'doctor_name', 'tags')
        }),
        ('Links', {
            'fields': ('consultation', 'medical_condition'),
            'classes': ('collapse',)
        }),
        ('Sharing', {
            'fields': ('is_shared_with_doctors',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    
    def file_type_display(self, obj):
        return obj.file_type.upper() if obj.file_type else "-"
    file_type_display.short_description = 'Type'
    
    def file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"
    file_size_display.short_description = 'Size'


@admin.register(LabReport)
class LabReportAdmin(admin.ModelAdmin):
    """Admin for Lab Reports."""
    
    list_display = [
        'report_name', 'user_phone', 'lab_type', 'test_date',
        'overall_status', 'abnormal_count', 'lab_name'
    ]
    list_filter = ['lab_type', 'overall_status', 'test_date']
    search_fields = ['report_name', 'user__phone', 'lab_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'test_date'
    
    fieldsets = (
        ('Report Info', {
            'fields': ('user', 'report_name', 'lab_type', 'test_date')
        }),
        ('Source', {
            'fields': ('lab_name', 'doctor_name')
        }),
        ('Results', {
            'fields': ('results', 'overall_status')
        }),
        ('Interpretation', {
            'fields': ('interpretation', 'recommendations')
        }),
        ('Links', {
            'fields': ('document', 'consultation'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    
    def abnormal_count(self, obj):
        count = len(obj.get_abnormal_results())
        if count > 0:
            return format_html('<span style="color: red;">{}</span>', count)
        return 0
    abnormal_count.short_description = 'Abnormal'


@admin.register(VaccinationRecord)
class VaccinationRecordAdmin(admin.ModelAdmin):
    """Admin for Vaccination Records."""
    
    list_display = [
        'vaccine_name', 'user_phone', 'vaccine_type',
        'dose_display', 'vaccination_date', 'next_due_date',
        'is_verified', 'is_complete_display'
    ]
    list_filter = ['vaccine_type', 'is_verified', 'vaccination_date']
    search_fields = ['vaccine_name', 'user__phone', 'administered_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'vaccination_date'
    
    fieldsets = (
        ('Vaccine Info', {
            'fields': ('user', 'vaccine_name', 'vaccine_name_local', 'vaccine_type')
        }),
        ('Dose', {
            'fields': ('dose_number', 'total_doses', 'vaccination_date', 'next_due_date')
        }),
        ('Administration', {
            'fields': ('administered_by', 'administered_at', 'batch_number', 'manufacturer')
        }),
        ('Side Effects', {
            'fields': ('side_effects',),
            'classes': ('collapse',)
        }),
        ('Verification', {
            'fields': ('is_verified', 'verified_by', 'certificate')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    
    def dose_display(self, obj):
        return f"{obj.dose_number}/{obj.total_doses}"
    dose_display.short_description = 'Dose'
    
    def is_complete_display(self, obj):
        return obj.is_complete
    is_complete_display.boolean = True
    is_complete_display.short_description = 'Complete'


@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    """Admin for Allergies."""
    
    list_display = [
        'allergen', 'user_phone', 'allergy_type',
        'severity_display', 'status', 'first_observed'
    ]
    list_filter = ['allergy_type', 'severity', 'status']
    search_fields = ['allergen', 'allergen_local', 'user__phone']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Allergy Info', {
            'fields': ('user', 'allergen', 'allergen_local', 'allergy_type')
        }),
        ('Severity', {
            'fields': ('severity', 'reaction', 'status')
        }),
        ('History', {
            'fields': ('first_observed', 'diagnosed_by')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    
    def severity_display(self, obj):
        colors = {
            'mild': 'green',
            'moderate': 'orange',
            'severe': 'red',
            'life_threatening': 'darkred',
        }
        color = colors.get(obj.severity, 'black')
        return format_html('<span style="color: {};">{}</span>', color, obj.get_severity_display())
    severity_display.short_description = 'Severity'


@admin.register(FamilyMedicalHistory)
class FamilyMedicalHistoryAdmin(admin.ModelAdmin):
    """Admin for Family Medical History."""
    
    list_display = [
        'condition', 'user_phone', 'relation',
        'age_at_diagnosis', 'is_deceased'
    ]
    list_filter = ['relation', 'is_deceased']
    search_fields = ['condition', 'user__phone', 'relation_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Patient', {
            'fields': ('user',)
        }),
        ('Relative', {
            'fields': ('relation', 'relation_name')
        }),
        ('Condition', {
            'fields': ('condition', 'condition_local', 'age_at_diagnosis')
        }),
        ('Deceased', {
            'fields': ('is_deceased', 'age_at_death', 'cause_of_death'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'


@admin.register(Hospitalization)
class HospitalizationAdmin(admin.ModelAdmin):
    """Admin for Hospitalizations."""
    
    list_display = [
        'hospital_name', 'user_phone', 'admission_type',
        'admission_date', 'discharge_date', 'duration_display',
        'has_followup'
    ]
    list_filter = ['admission_type', 'admission_date']
    search_fields = ['hospital_name', 'user__phone', 'reason', 'treating_doctor']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'admission_date'
    
    fieldsets = (
        ('Patient', {
            'fields': ('user',)
        }),
        ('Hospital', {
            'fields': ('hospital_name', 'hospital_address', 'department')
        }),
        ('Admission', {
            'fields': ('admission_type', 'admission_date', 'discharge_date', 'reason')
        }),
        ('Medical', {
            'fields': ('diagnosis', 'treating_doctor', 'procedures')
        }),
        ('Discharge', {
            'fields': ('discharge_summary', 'discharge_document'),
            'classes': ('collapse',)
        }),
        ('Follow-up', {
            'fields': ('follow_up_date', 'follow_up_notes')
        }),
        ('Links', {
            'fields': ('consultation',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    
    def duration_display(self, obj):
        days = obj.duration_days
        if days is not None:
            return f"{days} days"
        return "Ongoing"
    duration_display.short_description = 'Duration'
    
    def has_followup(self, obj):
        return bool(obj.follow_up_date)
    has_followup.boolean = True
    has_followup.short_description = 'Follow-up'


@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    """Admin for Vital Signs."""
    
    list_display = [
        'user_phone', 'recorded_at', 'bp_display',
        'heart_rate', 'temperature', 'oxygen_saturation',
        'blood_sugar', 'source'
    ]
    list_filter = ['source', 'recorded_at']
    search_fields = ['user__phone']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'recorded_at'
    
    fieldsets = (
        ('Patient', {
            'fields': ('user', 'recorded_at', 'source', 'recorded_by')
        }),
        ('Blood Pressure', {
            'fields': ('systolic_bp', 'diastolic_bp')
        }),
        ('Vitals', {
            'fields': ('heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation')
        }),
        ('Blood Sugar', {
            'fields': ('blood_sugar', 'blood_sugar_type')
        }),
        ('Weight', {
            'fields': ('weight_kg',)
        }),
        ('Notes', {
            'fields': ('notes', 'consultation'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = 'Patient'
    
    def bp_display(self, obj):
        if obj.systolic_bp and obj.diastolic_bp:
            status = obj.get_bp_status()
            colors = {
                'low': 'blue',
                'normal': 'green',
                'elevated': 'orange',
                'high': 'red',
            }
            color = colors.get(status, 'black')
            return format_html(
                '<span style="color: {};">{}/{}</span>',
                color, obj.systolic_bp, obj.diastolic_bp
            )
        return "-"
    bp_display.short_description = 'BP (mmHg)'


@admin.register(SharedRecord)
class SharedRecordAdmin(admin.ModelAdmin):
    """Admin for Shared Records."""
    
    list_display = [
        'patient_phone', 'doctor_name', 'share_type',
        'is_permanent', 'is_active', 'is_expired_display',
        'access_count', 'created_at'
    ]
    list_filter = ['share_type', 'is_permanent', 'is_active', 'created_at']
    search_fields = ['patient__phone', 'doctor__phone', 'doctor__first_name']
    readonly_fields = [
        'id', 'last_accessed_at', 'access_count',
        'revoked_at', 'created_at', 'updated_at'
    ]
    filter_horizontal = ['documents']
    
    fieldsets = (
        ('Sharing', {
            'fields': ('patient', 'doctor', 'share_type')
        }),
        ('Documents', {
            'fields': ('documents',),
            'classes': ('collapse',)
        }),
        ('Validity', {
            'fields': ('is_permanent', 'expires_at', 'is_active', 'revoked_at')
        }),
        ('Access', {
            'fields': ('last_accessed_at', 'access_count')
        }),
        ('Links', {
            'fields': ('consultation',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_phone(self, obj):
        return obj.patient.phone
    patient_phone.short_description = 'Patient'
    patient_phone.admin_order_field = 'patient__phone'
    
    def doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    doctor_name.short_description = 'Doctor'
    
    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.boolean = True
    is_expired_display.short_description = 'Expired'