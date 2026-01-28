"""
Medicine App Serializers for MediConnect.

Serializers for:
1. Medicine - Search, view, details
2. MedicineAlternative - Generic alternatives
3. DrugInteraction - Interaction warnings
4. UserPrescription - Prescription management
5. PrescriptionMedicine - Medicines in prescription
6. MedicineReminder - Reminder settings
7. ReminderLog - Reminder tracking
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta

from .models import (
    Medicine,
    MedicineAlternative,
    DrugInteraction,
    UserPrescription,
    PrescriptionMedicine,
    MedicineReminder,
    ReminderLog,
    MedicineSearchHistory,
)


# =============================================================================
# MEDICINE SERIALIZERS
# =============================================================================

class MedicineListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing medicines."""
    
    medicine_type_display = serializers.CharField(
        source='get_medicine_type_display',
        read_only=True
    )
    prescription_type_display = serializers.CharField(
        source='get_prescription_type_display',
        read_only=True
    )
    
    class Meta:
        model = Medicine
        fields = [
            'id',
            'name',
            'name_generic',
            'name_local',
            'brand_name',
            'manufacturer',
            'medicine_type',
            'medicine_type_display',
            'strength',
            'prescription_type',
            'prescription_type_display',
            'mrp',
            'category',
            'is_generic',
        ]


class MedicineDetailSerializer(serializers.ModelSerializer):
    """Full serializer for medicine details."""
    
    medicine_type_display = serializers.CharField(
        source='get_medicine_type_display',
        read_only=True
    )
    prescription_type_display = serializers.CharField(
        source='get_prescription_type_display',
        read_only=True
    )
    alternatives_count = serializers.SerializerMethodField()
    interactions_count = serializers.SerializerMethodField()
    
    # Localized fields based on language
    localized_name = serializers.SerializerMethodField()
    localized_uses = serializers.SerializerMethodField()
    localized_dosage = serializers.SerializerMethodField()
    localized_side_effects = serializers.SerializerMethodField()
    localized_warnings = serializers.SerializerMethodField()
    
    class Meta:
        model = Medicine
        fields = [
            'id',
            'name',
            'name_generic',
            'name_local',
            'localized_name',
            'brand_name',
            'manufacturer',
            'medicine_type',
            'medicine_type_display',
            'strength',
            'pack_size',
            'prescription_type',
            'prescription_type_display',
            'mrp',
            'composition',
            'uses',
            'uses_local',
            'localized_uses',
            'dosage_info',
            'dosage_info_local',
            'localized_dosage',
            'side_effects',
            'side_effects_local',
            'localized_side_effects',
            'warnings',
            'warnings_local',
            'localized_warnings',
            'contraindications',
            'storage_info',
            'category',
            'subcategory',
            'is_generic',
            'is_habit_forming',
            'requires_refrigeration',
            'alternatives_count',
            'interactions_count',
            'is_verified',
        ]
    
    def _get_language(self):
        """Get language from request context."""
        request = self.context.get('request')
        if request:
            lang = request.query_params.get('lang')
            if lang in ['en', 'te', 'hi']:
                return lang
        return self.context.get('language', 'en')
    
    def get_localized_name(self, obj):
        """Get name in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.name_local:
            return obj.name_local
        return obj.name
    
    def get_localized_uses(self, obj):
        """Get uses in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.uses_local:
            return obj.uses_local
        return obj.uses
    
    def get_localized_dosage(self, obj):
        """Get dosage info in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.dosage_info_local:
            return obj.dosage_info_local
        return obj.dosage_info
    
    def get_localized_side_effects(self, obj):
        """Get side effects in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.side_effects_local:
            return obj.side_effects_local
        return obj.side_effects
    
    def get_localized_warnings(self, obj):
        """Get warnings in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.warnings_local:
            return obj.warnings_local
        return obj.warnings
    
    def get_alternatives_count(self, obj):
        """Get count of alternatives."""
        return obj.alternatives.count()
    
    def get_interactions_count(self, obj):
        """Get count of known interactions."""
        return (
            obj.interactions_as_first.count() + 
            obj.interactions_as_second.count()
        )


class MedicineSearchSerializer(serializers.Serializer):
    """Serializer for medicine search request."""
    
    query = serializers.CharField(
        max_length=255,
        required=True,
        help_text='Search term (medicine name, generic name, or brand)'
    )
    category = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text='Filter by category'
    )
    medicine_type = serializers.ChoiceField(
        choices=Medicine.MEDICINE_TYPES,
        required=False,
        allow_null=True,
        help_text='Filter by type (tablet, syrup, etc.)'
    )
    generic_only = serializers.BooleanField(
        default=False,
        help_text='Only show generic medicines'
    )
    otc_only = serializers.BooleanField(
        default=False,
        help_text='Only show OTC (non-prescription) medicines'
    )
    limit = serializers.IntegerField(
        default=20,
        min_value=1,
        max_value=100,
        help_text='Maximum results to return'
    )


# =============================================================================
# MEDICINE ALTERNATIVE SERIALIZERS
# =============================================================================

class MedicineAlternativeSerializer(serializers.ModelSerializer):
    """Serializer for medicine alternatives."""
    
    alternative_details = MedicineListSerializer(
        source='alternative',
        read_only=True
    )
    savings_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicineAlternative
        fields = [
            'id',
            'alternative',
            'alternative_details',
            'similarity_score',
            'price_difference_percent',
            'savings_percent',
            'notes',
            'is_verified',
        ]
    
    def get_savings_percent(self, obj):
        """Calculate savings percentage."""
        if obj.price_difference_percent and obj.price_difference_percent < 0:
            return abs(float(obj.price_difference_percent))
        return 0


class AlternativeListSerializer(serializers.ModelSerializer):
    """Simplified alternative serializer for listing."""
    
    name = serializers.CharField(source='alternative.name')
    name_generic = serializers.CharField(source='alternative.name_generic')
    manufacturer = serializers.CharField(source='alternative.manufacturer')
    mrp = serializers.DecimalField(
        source='alternative.mrp',
        max_digits=10,
        decimal_places=2
    )
    strength = serializers.CharField(source='alternative.strength')
    
    class Meta:
        model = MedicineAlternative
        fields = [
            'id',
            'name',
            'name_generic',
            'manufacturer',
            'mrp',
            'strength',
            'similarity_score',
            'price_difference_percent',
            'is_verified',
        ]


# =============================================================================
# DRUG INTERACTION SERIALIZERS
# =============================================================================

class DrugInteractionSerializer(serializers.ModelSerializer):
    """Serializer for drug interactions."""
    
    medicine_1_name = serializers.CharField(source='medicine_1.name', read_only=True)
    medicine_2_name = serializers.CharField(source='medicine_2.name', read_only=True)
    severity_display = serializers.CharField(
        source='get_severity_display',
        read_only=True
    )
    localized_description = serializers.SerializerMethodField()
    localized_recommendation = serializers.SerializerMethodField()
    
    class Meta:
        model = DrugInteraction
        fields = [
            'id',
            'medicine_1',
            'medicine_1_name',
            'medicine_2',
            'medicine_2_name',
            'severity',
            'severity_display',
            'description',
            'description_local',
            'localized_description',
            'effect',
            'recommendation',
            'recommendation_local',
            'localized_recommendation',
            'is_verified',
        ]
    
    def _get_language(self):
        """Get language from request context."""
        request = self.context.get('request')
        if request:
            lang = request.query_params.get('lang')
            if lang in ['en', 'te', 'hi']:
                return lang
        return 'en'
    
    def get_localized_description(self, obj):
        """Get description in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.description_local:
            return obj.description_local
        return obj.description
    
    def get_localized_recommendation(self, obj):
        """Get recommendation in user's language."""
        lang = self._get_language()
        if lang in ['te', 'hi'] and obj.recommendation_local:
            return obj.recommendation_local
        return obj.recommendation


class InteractionCheckSerializer(serializers.Serializer):
    """Serializer for checking drug interactions."""
    
    medicine_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=2,
        max_length=10,
        help_text='List of medicine IDs to check for interactions'
    )


class InteractionCheckResultSerializer(serializers.Serializer):
    """Serializer for interaction check results."""
    
    has_interactions = serializers.BooleanField()
    total_interactions = serializers.IntegerField()
    severe_count = serializers.IntegerField()
    moderate_count = serializers.IntegerField()
    mild_count = serializers.IntegerField()
    interactions = DrugInteractionSerializer(many=True)


# =============================================================================
# USER PRESCRIPTION SERIALIZERS
# =============================================================================

class PrescriptionMedicineSerializer(serializers.ModelSerializer):
    """Serializer for medicines in a prescription."""
    
    frequency_display = serializers.CharField(
        source='get_frequency_display',
        read_only=True
    )
    timing_display = serializers.CharField(
        source='get_timing_display',
        read_only=True
    )
    medicine_details = MedicineListSerializer(
        source='medicine',
        read_only=True
    )
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = PrescriptionMedicine
        fields = [
            'id',
            'medicine',
            'medicine_details',
            'medicine_name',
            'dosage',
            'frequency',
            'frequency_display',
            'timing',
            'timing_display',
            'custom_times',
            'duration_days',
            'start_date',
            'end_date',
            'days_remaining',
            'special_instructions',
            'is_active',
            'quantity_prescribed',
            'quantity_remaining',
        ]
        read_only_fields = ['id']
    
    def get_days_remaining(self, obj):
        """Calculate days remaining for this medicine."""
        if obj.end_date:
            today = timezone.now().date()
            if obj.end_date >= today:
                return (obj.end_date - today).days
            return 0
        return None
    
    def validate(self, attrs):
        """Validate prescription medicine data."""
        # Ensure either medicine or medicine_name is provided
        medicine = attrs.get('medicine')
        medicine_name = attrs.get('medicine_name')
        
        if not medicine and not medicine_name:
            raise serializers.ValidationError(
                'Either medicine or medicine_name must be provided'
            )
        
        # Set medicine_name from medicine if not provided
        if medicine and not medicine_name:
            attrs['medicine_name'] = medicine.name
        
        return attrs


class PrescriptionMedicineCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating prescription medicines."""
    
    class Meta:
        model = PrescriptionMedicine
        fields = [
            'medicine',
            'medicine_name',
            'dosage',
            'frequency',
            'timing',
            'custom_times',
            'duration_days',
            'start_date',
            'end_date',
            'special_instructions',
            'quantity_prescribed',
        ]
    
    def validate_custom_times(self, value):
        """Validate custom times format."""
        if value:
            for time_str in value:
                try:
                    datetime.strptime(time_str, '%H:%M')
                except ValueError:
                    raise serializers.ValidationError(
                        f'Invalid time format: {time_str}. Use HH:MM format.'
                    )
        return value


class UserPrescriptionSerializer(serializers.ModelSerializer):
    """Serializer for user prescriptions."""
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    medicines = PrescriptionMedicineSerializer(many=True, read_only=True)
    medicines_count = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPrescription
        fields = [
            'id',
            'title',
            'doctor_name',
            'hospital_name',
            'prescribed_date',
            'valid_until',
            'diagnosis',
            'status',
            'status_display',
            'notes',
            'image_url',
            'medicines',
            'medicines_count',
            'is_expired',
            'days_until_expiry',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_medicines_count(self, obj):
        """Get count of medicines in prescription."""
        return obj.medicines.count()
    
    def get_days_until_expiry(self, obj):
        """Calculate days until prescription expires."""
        if obj.valid_until:
            today = timezone.now().date()
            if obj.valid_until >= today:
                return (obj.valid_until - today).days
            return 0
        return None


class UserPrescriptionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing prescriptions."""
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    medicines_count = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserPrescription
        fields = [
            'id',
            'title',
            'doctor_name',
            'prescribed_date',
            'valid_until',
            'status',
            'status_display',
            'medicines_count',
            'is_expired',
        ]
    
    def get_medicines_count(self, obj):
        """Get count of medicines in prescription."""
        return obj.medicines.count()


class UserPrescriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating prescriptions."""
    
    medicines = PrescriptionMedicineCreateSerializer(many=True, required=False)
    
    class Meta:
        model = UserPrescription
        fields = [
            'title',
            'doctor_name',
            'hospital_name',
            'prescribed_date',
            'valid_until',
            'diagnosis',
            'notes',
            'image_url',
            'medicines',
        ]
    
    def validate_prescribed_date(self, value):
        """Validate prescribed date is not in future."""
        if value > timezone.now().date():
            raise serializers.ValidationError(
                'Prescribed date cannot be in the future'
            )
        return value
    
    def validate_valid_until(self, value):
        """Validate expiry date."""
        if value and value < timezone.now().date():
            raise serializers.ValidationError(
                'Validity date cannot be in the past'
            )
        return value
    
    def create(self, validated_data):
        """Create prescription with medicines."""
        medicines_data = validated_data.pop('medicines', [])
        validated_data['user'] = self.context['request'].user
        
        prescription = UserPrescription.objects.create(**validated_data)
        
        for medicine_data in medicines_data:
            PrescriptionMedicine.objects.create(
                prescription=prescription,
                **medicine_data
            )
        
        return prescription


class UserPrescriptionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating prescriptions."""
    
    class Meta:
        model = UserPrescription
        fields = [
            'title',
            'doctor_name',
            'hospital_name',
            'valid_until',
            'diagnosis',
            'status',
            'notes',
            'image_url',
        ]


# =============================================================================
# MEDICINE REMINDER SERIALIZERS
# =============================================================================

class MedicineReminderSerializer(serializers.ModelSerializer):
    """Serializer for medicine reminders."""
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    is_active_today = serializers.BooleanField(read_only=True)
    next_reminder_time = serializers.SerializerMethodField()
    prescription_medicine_details = PrescriptionMedicineSerializer(
        source='prescription_medicine',
        read_only=True
    )
    
    class Meta:
        model = MedicineReminder
        fields = [
            'id',
            'prescription_medicine',
            'prescription_medicine_details',
            'medicine_name',
            'dosage',
            'reminder_times',
            'days_of_week',
            'start_date',
            'end_date',
            'instructions',
            'instructions_local',
            'status',
            'status_display',
            'notify_before_minutes',
            'notify_family_helper',
            'allow_snooze',
            'snooze_minutes',
            'max_snoozes',
            'is_active_today',
            'next_reminder_time',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_next_reminder_time(self, obj):
        """Get next scheduled reminder time."""
        if not obj.is_active_today or not obj.reminder_times:
            return None
        
        now = timezone.now()
        current_time = now.time()
        
        for time_str in sorted(obj.reminder_times):
            try:
                reminder_time = datetime.strptime(time_str, '%H:%M').time()
                if reminder_time > current_time:
                    return time_str
            except ValueError:
                continue
        
        # If all times have passed today, return first time for tomorrow
        if obj.reminder_times:
            return f"Tomorrow {sorted(obj.reminder_times)[0]}"
        
        return None


class MedicineReminderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing reminders."""
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    is_active_today = serializers.BooleanField(read_only=True)
    times_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicineReminder
        fields = [
            'id',
            'medicine_name',
            'dosage',
            'reminder_times',
            'times_display',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'is_active_today',
        ]
    
    def get_times_display(self, obj):
        """Get formatted times display."""
        if obj.reminder_times:
            return ', '.join(obj.reminder_times)
        return 'No times set'


class MedicineReminderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reminders."""
    
    class Meta:
        model = MedicineReminder
        fields = [
            'prescription_medicine',
            'medicine_name',
            'dosage',
            'reminder_times',
            'days_of_week',
            'start_date',
            'end_date',
            'instructions',
            'notify_before_minutes',
            'notify_family_helper',
            'allow_snooze',
            'snooze_minutes',
            'max_snoozes',
        ]
    
    def validate_reminder_times(self, value):
        """Validate reminder times format."""
        if not value:
            raise serializers.ValidationError(
                'At least one reminder time is required'
            )
        
        validated_times = []
        for time_str in value:
            try:
                datetime.strptime(time_str, '%H:%M')
                validated_times.append(time_str)
            except ValueError:
                raise serializers.ValidationError(
                    f'Invalid time format: {time_str}. Use HH:MM format.'
                )
        
        return sorted(set(validated_times))
    
    def validate_days_of_week(self, value):
        """Validate days of week."""
        if value:
            for day in value:
                if day not in range(7):
                    raise serializers.ValidationError(
                        f'Invalid day: {day}. Use 0-6 (Monday-Sunday).'
                    )
        return value
    
    def validate(self, attrs):
        """Validate reminder data."""
        # If prescription_medicine is provided, get medicine details from it
        prescription_medicine = attrs.get('prescription_medicine')
        
        if prescription_medicine:
            if not attrs.get('medicine_name'):
                attrs['medicine_name'] = prescription_medicine.medicine_name
            if not attrs.get('dosage'):
                attrs['dosage'] = prescription_medicine.dosage
        elif not attrs.get('medicine_name') or not attrs.get('dosage'):
            raise serializers.ValidationError(
                'medicine_name and dosage are required if prescription_medicine is not provided'
            )
        
        # Validate dates
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                'End date cannot be before start date'
            )
        
        return attrs
    
    def create(self, validated_data):
        """Create reminder with user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class MedicineReminderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating reminders."""
    
    class Meta:
        model = MedicineReminder
        fields = [
            'reminder_times',
            'days_of_week',
            'end_date',
            'instructions',
            'status',
            'notify_before_minutes',
            'notify_family_helper',
            'allow_snooze',
            'snooze_minutes',
            'max_snoozes',
        ]
    
    def validate_reminder_times(self, value):
        """Validate reminder times format."""
        if value:
            validated_times = []
            for time_str in value:
                try:
                    datetime.strptime(time_str, '%H:%M')
                    validated_times.append(time_str)
                except ValueError:
                    raise serializers.ValidationError(
                        f'Invalid time format: {time_str}. Use HH:MM format.'
                    )
            return sorted(set(validated_times))
        return value


# =============================================================================
# REMINDER LOG SERIALIZERS
# =============================================================================

class ReminderLogSerializer(serializers.ModelSerializer):
    """Serializer for reminder logs."""
    
    response_display = serializers.CharField(
        source='get_response_display',
        read_only=True
    )
    medicine_name = serializers.CharField(
        source='reminder.medicine_name',
        read_only=True
    )
    dosage = serializers.CharField(
        source='reminder.dosage',
        read_only=True
    )
    
    class Meta:
        model = ReminderLog
        fields = [
            'id',
            'reminder',
            'medicine_name',
            'dosage',
            'scheduled_date',
            'scheduled_time',
            'notification_sent_at',
            'response',
            'response_display',
            'responded_at',
            'snooze_count',
            'last_snoozed_at',
            'notes',
            'created_at',
        ]
        read_only_fields = [
            'id', 'reminder', 'scheduled_date', 'scheduled_time',
            'notification_sent_at', 'created_at'
        ]


class ReminderLogListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing reminder logs."""
    
    response_display = serializers.CharField(
        source='get_response_display',
        read_only=True
    )
    medicine_name = serializers.CharField(
        source='reminder.medicine_name',
        read_only=True
    )
    
    class Meta:
        model = ReminderLog
        fields = [
            'id',
            'medicine_name',
            'scheduled_date',
            'scheduled_time',
            'response',
            'response_display',
            'responded_at',
        ]


class ReminderResponseSerializer(serializers.Serializer):
    """Serializer for responding to a reminder."""
    
    response = serializers.ChoiceField(
        choices=['taken', 'skipped', 'snoozed'],
        required=True
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True
    )


class TodayRemindersSerializer(serializers.Serializer):
    """Serializer for today's reminders summary."""
    
    total_reminders = serializers.IntegerField()
    completed = serializers.IntegerField()
    pending = serializers.IntegerField()
    missed = serializers.IntegerField()
    reminders = ReminderLogSerializer(many=True)


# =============================================================================
# MEDICINE SEARCH HISTORY SERIALIZERS
# =============================================================================

class MedicineSearchHistorySerializer(serializers.ModelSerializer):
    """Serializer for medicine search history."""
    
    medicine_name = serializers.CharField(
        source='medicine_found.name',
        read_only=True,
        default=None
    )
    
    class Meta:
        model = MedicineSearchHistory
        fields = [
            'id',
            'search_query',
            'medicine_found',
            'medicine_name',
            'results_count',
            'searched_at',
        ]
        read_only_fields = ['id', 'searched_at']


# =============================================================================
# QUICK ACCESS SERIALIZERS
# =============================================================================

class QuickMedicineDataSerializer(serializers.Serializer):
    """
    Serializer for quick medicine screen data.
    Returns all data needed for medicine home screen.
    """
    
    active_prescriptions = UserPrescriptionListSerializer(many=True)
    today_reminders = ReminderLogListSerializer(many=True)
    reminders_summary = serializers.DictField()
    recent_searches = MedicineSearchHistorySerializer(many=True)


class MedicineCategorySerializer(serializers.Serializer):
    """Serializer for medicine categories."""
    
    category = serializers.CharField()
    count = serializers.IntegerField()
    icon = serializers.CharField(required=False)


class AdherenceStatsSerializer(serializers.Serializer):
    """Serializer for medication adherence statistics."""
    
    period = serializers.CharField()  # 'week', 'month'
    total_scheduled = serializers.IntegerField()
    taken = serializers.IntegerField()
    skipped = serializers.IntegerField()
    missed = serializers.IntegerField()
    adherence_percentage = serializers.FloatField()
    by_medicine = serializers.ListField(
        child=serializers.DictField()
    )