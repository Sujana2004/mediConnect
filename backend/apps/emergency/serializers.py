"""
Emergency App Serializers for MediConnect.

Serializers for:
1. EmergencyContact - CRUD operations
2. EmergencyService - Read operations with distance
3. SOSAlert - Create and track SOS alerts
4. FirstAidGuide - Multi-language first aid
5. EmergencyHelpline - Helpline numbers
6. UserLocationCache - Location updates
"""

from rest_framework import serializers
from django.utils import timezone
from math import radians, sin, cos, sqrt, atan2

from .models import (
    EmergencyContact,
    EmergencyService,
    SOSAlert,
    FirstAidGuide,
    EmergencyHelpline,
    UserLocationCache
)


# =============================================================================
# EMERGENCY CONTACT SERIALIZERS
# =============================================================================

class EmergencyContactSerializer(serializers.ModelSerializer):
    """Serializer for emergency contact CRUD operations."""
    
    relationship_display = serializers.CharField(
        source='get_relationship_display',
        read_only=True
    )
    
    class Meta:
        model = EmergencyContact
        fields = [
            'id',
            'name',
            'phone_number',
            'alternate_phone',
            'relationship',
            'relationship_display',
            'priority',
            'is_active',
            'notify_on_sos',
            'share_location',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_phone_number(self, value):
        """Validate phone number format."""
        # Remove any spaces or dashes
        value = value.replace(' ', '').replace('-', '')
        
        # Check if it's a valid Indian mobile number
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError(
                'Enter a valid 10-digit mobile number'
            )
        
        if value[0] not in '6789':
            raise serializers.ValidationError(
                'Mobile number must start with 6, 7, 8, or 9'
            )
        
        return value
    
    def validate_alternate_phone(self, value):
        """Validate alternate phone if provided."""
        if value:
            return self.validate_phone_number(value)
        return value
    
    def validate_priority(self, value):
        """Ensure priority is between 1 and 10."""
        if value < 1 or value > 10:
            raise serializers.ValidationError(
                'Priority must be between 1 (highest) and 10 (lowest)'
            )
        return value
    
    def validate(self, attrs):
        """Check for duplicate contact for same user."""
        user = self.context['request'].user
        phone = attrs.get('phone_number')
        
        # Check if this is an update
        instance = getattr(self, 'instance', None)
        
        # Query for existing contact with same phone
        existing = EmergencyContact.objects.filter(
            user=user,
            phone_number=phone
        )
        
        if instance:
            existing = existing.exclude(pk=instance.pk)
        
        if existing.exists():
            raise serializers.ValidationError({
                'phone_number': 'You already have a contact with this phone number'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create contact with current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class EmergencyContactListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing contacts."""
    
    relationship_display = serializers.CharField(
        source='get_relationship_display',
        read_only=True
    )
    
    class Meta:
        model = EmergencyContact
        fields = [
            'id',
            'name',
            'phone_number',
            'relationship',
            'relationship_display',
            'priority',
            'is_active',
            'notify_on_sos',
        ]


class EmergencyContactReorderSerializer(serializers.Serializer):
    """Serializer for reordering contact priorities."""
    
    contacts = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        help_text='List of {id, priority} objects'
    )
    
    def validate_contacts(self, value):
        """Validate contact list."""
        if not value:
            raise serializers.ValidationError('Contact list cannot be empty')
        
        for item in value:
            if 'id' not in item or 'priority' not in item:
                raise serializers.ValidationError(
                    'Each item must have id and priority'
                )
            
            try:
                priority = int(item['priority'])
                if priority < 1 or priority > 10:
                    raise serializers.ValidationError(
                        f'Priority must be between 1 and 10'
                    )
            except (ValueError, TypeError):
                raise serializers.ValidationError('Priority must be a number')
        
        return value


# =============================================================================
# EMERGENCY SERVICE SERIALIZERS
# =============================================================================

class EmergencyServiceSerializer(serializers.ModelSerializer):
    """Serializer for emergency services (hospitals, ambulances, etc.)."""
    
    service_type_display = serializers.CharField(
        source='get_service_type_display',
        read_only=True
    )
    facility_level_display = serializers.CharField(
        source='get_facility_level_display',
        read_only=True
    )
    distance_km = serializers.SerializerMethodField()
    
    class Meta:
        model = EmergencyService
        fields = [
            'id',
            'name',
            'name_local',
            'service_type',
            'service_type_display',
            'facility_level',
            'facility_level_display',
            'phone_primary',
            'phone_secondary',
            'phone_emergency',
            'address',
            'address_local',
            'landmark',
            'district',
            'state',
            'pincode',
            'latitude',
            'longitude',
            'distance_km',
            'is_24x7',
            'opening_time',
            'closing_time',
            'has_emergency_ward',
            'has_icu',
            'has_ambulance',
            'has_blood_bank',
            'bed_count',
            'is_government',
            'is_active',
            'is_verified',
        ]
    
    def get_distance_km(self, obj):
        """Calculate distance from user's location."""
        request = self.context.get('request')
        user_lat = self.context.get('user_lat')
        user_lng = self.context.get('user_lng')
        
        # Try to get from request params if not in context
        if not user_lat and request:
            user_lat = request.query_params.get('lat')
            user_lng = request.query_params.get('lng')
        
        if not user_lat or not user_lng or not obj.latitude or not obj.longitude:
            return None
        
        try:
            user_lat = float(user_lat)
            user_lng = float(user_lng)
            
            distance = self._haversine_distance(
                user_lat, user_lng,
                float(obj.latitude), float(obj.longitude)
            )
            return round(distance, 2)
        except (ValueError, TypeError):
            return None
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula."""
        R = 6371  # Earth's radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c


class EmergencyServiceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing services."""
    
    service_type_display = serializers.CharField(
        source='get_service_type_display',
        read_only=True
    )
    distance_km = serializers.SerializerMethodField()
    
    class Meta:
        model = EmergencyService
        fields = [
            'id',
            'name',
            'name_local',
            'service_type',
            'service_type_display',
            'phone_primary',
            'phone_emergency',
            'address',
            'landmark',
            'district',
            'latitude',
            'longitude',
            'distance_km',
            'is_24x7',
            'has_emergency_ward',
            'is_government',
        ]
    
    def get_distance_km(self, obj):
        """Calculate distance from user's location."""
        user_lat = self.context.get('user_lat')
        user_lng = self.context.get('user_lng')
        
        if not user_lat or not user_lng or not obj.latitude or not obj.longitude:
            return None
        
        try:
            distance = self._haversine_distance(
                float(user_lat), float(user_lng),
                float(obj.latitude), float(obj.longitude)
            )
            return round(distance, 2)
        except (ValueError, TypeError):
            return None
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula."""
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c


class NearbyServicesRequestSerializer(serializers.Serializer):
    """Serializer for nearby services search request."""
    
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=8,
        required=True
    )
    longitude = serializers.DecimalField(
        max_digits=11,
        decimal_places=8,
        required=True
    )
    radius_km = serializers.FloatField(
        default=10.0,
        min_value=1.0,
        max_value=100.0,
        help_text='Search radius in kilometers (default: 10km)'
    )
    service_type = serializers.ChoiceField(
        choices=EmergencyService.SERVICE_TYPES,
        required=False,
        allow_null=True,
        help_text='Filter by service type'
    )
    only_24x7 = serializers.BooleanField(
        default=False,
        help_text='Only show 24/7 services'
    )
    only_government = serializers.BooleanField(
        default=False,
        help_text='Only show government services'
    )


# =============================================================================
# SOS ALERT SERIALIZERS
# =============================================================================

class SOSAlertCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SOS alerts."""
    
    class Meta:
        model = SOSAlert
        fields = [
            'emergency_type',
            'latitude',
            'longitude',
            'location_accuracy',
            'description',
        ]
    
    def validate(self, attrs):
        """Validate SOS alert data."""
        # At least one of location or description should be present
        if not attrs.get('latitude') and not attrs.get('description'):
            # Allow SOS even without location (might be indoors)
            pass
        
        return attrs
    
    def create(self, validated_data):
        """Create SOS alert with current user and status."""
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = 'triggered'
        return super().create(validated_data)


class SOSAlertSerializer(serializers.ModelSerializer):
    """Full serializer for SOS alerts."""
    
    emergency_type_display = serializers.CharField(
        source='get_emergency_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    user_name = serializers.CharField(
        source='user.get_full_name',
        read_only=True
    )
    user_phone = serializers.CharField(
        source='user.phone_number',
        read_only=True
    )
    time_elapsed = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSAlert
        fields = [
            'id',
            'user_name',
            'user_phone',
            'emergency_type',
            'emergency_type_display',
            'status',
            'status_display',
            'latitude',
            'longitude',
            'location_address',
            'location_accuracy',
            'description',
            'voice_note_url',
            'contacts_notified',
            'services_notified',
            'notification_sent_at',
            'acknowledged_by',
            'acknowledged_at',
            'responder_eta',
            'resolved_at',
            'resolution_notes',
            'time_elapsed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'user_name', 'user_phone', 'contacts_notified',
            'services_notified', 'notification_sent_at',
            'created_at', 'updated_at'
        ]
    
    def get_time_elapsed(self, obj):
        """Get time elapsed since SOS was triggered."""
        if obj.resolved_at:
            delta = obj.resolved_at - obj.created_at
        else:
            delta = timezone.now() - obj.created_at
        
        total_seconds = int(delta.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"


class SOSAlertListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing SOS alerts."""
    
    emergency_type_display = serializers.CharField(
        source='get_emergency_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = SOSAlert
        fields = [
            'id',
            'emergency_type',
            'emergency_type_display',
            'status',
            'status_display',
            'location_address',
            'created_at',
        ]


class SOSAlertUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating SOS alert status."""
    
    class Meta:
        model = SOSAlert
        fields = [
            'status',
            'acknowledged_by',
            'responder_eta',
            'resolution_notes',
        ]
    
    def validate_status(self, value):
        """Validate status transitions."""
        instance = self.instance
        
        valid_transitions = {
            'triggered': ['notifying', 'acknowledged', 'cancelled'],
            'notifying': ['acknowledged', 'cancelled'],
            'acknowledged': ['responding', 'resolved', 'false_alarm'],
            'responding': ['resolved', 'false_alarm'],
            'resolved': [],  # Terminal state
            'cancelled': [],  # Terminal state
            'false_alarm': [],  # Terminal state
        }
        
        if instance and value not in valid_transitions.get(instance.status, []):
            raise serializers.ValidationError(
                f"Cannot transition from '{instance.status}' to '{value}'"
            )
        
        return value
    
    def update(self, instance, validated_data):
        """Update with timestamps."""
        new_status = validated_data.get('status')
        
        if new_status == 'acknowledged' and not instance.acknowledged_at:
            validated_data['acknowledged_at'] = timezone.now()
        
        if new_status in ['resolved', 'cancelled', 'false_alarm']:
            validated_data['resolved_at'] = timezone.now()
        
        return super().update(instance, validated_data)


class SOSCancelSerializer(serializers.Serializer):
    """Serializer for cancelling SOS alert."""
    
    reason = serializers.ChoiceField(
        choices=[
            ('mistake', 'Triggered by mistake'),
            ('resolved', 'Issue resolved on its own'),
            ('help_arrived', 'Help arrived from elsewhere'),
            ('other', 'Other reason'),
        ],
        required=True
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True
    )


# =============================================================================
# FIRST AID GUIDE SERIALIZERS
# =============================================================================

class FirstAidGuideSerializer(serializers.ModelSerializer):
    """Full serializer for first aid guides with language support."""
    
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    title = serializers.SerializerMethodField()
    symptoms = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()
    donts = serializers.SerializerMethodField()
    call_help = serializers.SerializerMethodField()
    
    class Meta:
        model = FirstAidGuide
        fields = [
            'id',
            'title',
            'title_en',
            'title_te',
            'title_hi',
            'category',
            'category_display',
            'symptoms',
            'symptoms_en',
            'symptoms_te',
            'symptoms_hi',
            'steps',
            'steps_en',
            'steps_te',
            'steps_hi',
            'donts',
            'donts_en',
            'donts_te',
            'donts_hi',
            'call_help',
            'call_help_en',
            'call_help_te',
            'call_help_hi',
            'image_url',
            'video_url',
            'is_critical',
            'display_order',
        ]
    
    def _get_language(self):
        """Get language from request or context."""
        request = self.context.get('request')
        if request:
            # Check query param first
            lang = request.query_params.get('lang')
            if lang in ['en', 'te', 'hi']:
                return lang
            
            # Check Accept-Language header
            accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            if 'te' in accept_lang:
                return 'te'
            elif 'hi' in accept_lang:
                return 'hi'
        
        return self.context.get('language', 'en')
    
    def get_title(self, obj):
        """Get title in user's language."""
        return obj.get_title(self._get_language())
    
    def get_symptoms(self, obj):
        """Get symptoms in user's language."""
        lang = self._get_language()
        if lang == 'te' and obj.symptoms_te:
            return obj.symptoms_te
        elif lang == 'hi' and obj.symptoms_hi:
            return obj.symptoms_hi
        return obj.symptoms_en
    
    def get_steps(self, obj):
        """Get steps in user's language."""
        return obj.get_steps(self._get_language())
    
    def get_donts(self, obj):
        """Get donts in user's language."""
        lang = self._get_language()
        if lang == 'te' and obj.donts_te:
            return obj.donts_te
        elif lang == 'hi' and obj.donts_hi:
            return obj.donts_hi
        return obj.donts_en
    
    def get_call_help(self, obj):
        """Get call_help in user's language."""
        lang = self._get_language()
        if lang == 'te' and obj.call_help_te:
            return obj.call_help_te
        elif lang == 'hi' and obj.call_help_hi:
            return obj.call_help_hi
        return obj.call_help_en


class FirstAidGuideListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing first aid guides."""
    
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    title = serializers.SerializerMethodField()
    
    class Meta:
        model = FirstAidGuide
        fields = [
            'id',
            'title',
            'category',
            'category_display',
            'is_critical',
            'image_url',
        ]
    
    def get_title(self, obj):
        """Get title in user's language."""
        lang = self.context.get('language', 'en')
        return obj.get_title(lang)


# =============================================================================
# EMERGENCY HELPLINE SERIALIZERS
# =============================================================================

class EmergencyHelplineSerializer(serializers.ModelSerializer):
    """Serializer for emergency helplines."""
    
    helpline_type_display = serializers.CharField(
        source='get_helpline_type_display',
        read_only=True
    )
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = EmergencyHelpline
        fields = [
            'id',
            'name',
            'name_en',
            'name_te',
            'name_hi',
            'helpline_type',
            'helpline_type_display',
            'number',
            'alternate_number',
            'is_national',
            'state',
            'description',
            'description_en',
            'description_te',
            'description_hi',
            'is_24x7',
            'is_toll_free',
            'display_order',
        ]
    
    def _get_language(self):
        """Get language from request or context."""
        request = self.context.get('request')
        if request:
            lang = request.query_params.get('lang')
            if lang in ['en', 'te', 'hi']:
                return lang
        return self.context.get('language', 'en')
    
    def get_name(self, obj):
        """Get name in user's language."""
        return obj.get_name(self._get_language())
    
    def get_description(self, obj):
        """Get description in user's language."""
        lang = self._get_language()
        if lang == 'te' and obj.description_te:
            return obj.description_te
        elif lang == 'hi' and obj.description_hi:
            return obj.description_hi
        return obj.description_en


class EmergencyHelplineListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing helplines."""
    
    helpline_type_display = serializers.CharField(
        source='get_helpline_type_display',
        read_only=True
    )
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmergencyHelpline
        fields = [
            'id',
            'name',
            'helpline_type',
            'helpline_type_display',
            'number',
            'is_24x7',
            'is_toll_free',
        ]
    
    def get_name(self, obj):
        """Get name in user's language."""
        lang = self.context.get('language', 'en')
        return obj.get_name(lang)


# =============================================================================
# USER LOCATION CACHE SERIALIZERS
# =============================================================================

class UserLocationCacheSerializer(serializers.ModelSerializer):
    """Serializer for user location cache."""
    
    class Meta:
        model = UserLocationCache
        fields = [
            'latitude',
            'longitude',
            'accuracy',
            'address',
            'district',
            'state',
            'pincode',
            'nearby_hospitals',
            'nearby_ambulances',
            'location_updated_at',
            'nearby_updated_at',
        ]
        read_only_fields = [
            'nearby_hospitals',
            'nearby_ambulances',
            'location_updated_at',
            'nearby_updated_at',
        ]


class LocationUpdateSerializer(serializers.Serializer):
    """Serializer for updating user location."""
    
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=8,
        required=True
    )
    longitude = serializers.DecimalField(
        max_digits=11,
        decimal_places=8,
        required=True
    )
    accuracy = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text='GPS accuracy in meters'
    )
    address = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text='Reverse geocoded address (optional)'
    )
    
    def validate_latitude(self, value):
        """Validate latitude range."""
        if value < -90 or value > 90:
            raise serializers.ValidationError(
                'Latitude must be between -90 and 90'
            )
        return value
    
    def validate_longitude(self, value):
        """Validate longitude range."""
        if value < -180 or value > 180:
            raise serializers.ValidationError(
                'Longitude must be between -180 and 180'
            )
        return value


# =============================================================================
# QUICK ACCESS SERIALIZERS
# =============================================================================

class QuickSOSDataSerializer(serializers.Serializer):
    """
    Serializer for quick SOS screen data.
    Returns all data needed for the SOS screen in one call.
    """
    
    emergency_contacts = EmergencyContactListSerializer(many=True)
    nearby_hospitals = EmergencyServiceListSerializer(many=True)
    nearby_ambulances = EmergencyServiceListSerializer(many=True)
    helplines = EmergencyHelplineListSerializer(many=True)
    last_location = UserLocationCacheSerializer(allow_null=True)
    active_sos = SOSAlertSerializer(allow_null=True)


class EmergencyTypesSerializer(serializers.Serializer):
    """Serializer for emergency types list."""
    
    code = serializers.CharField()
    name_en = serializers.CharField()
    name_te = serializers.CharField()
    name_hi = serializers.CharField()
    icon = serializers.CharField()


class SOSQuickTriggerSerializer(serializers.Serializer):
    """
    Serializer for quick SOS trigger (one-tap).
    Minimal data required for fastest SOS.
    """
    
    emergency_type = serializers.ChoiceField(
        choices=SOSAlert.EMERGENCY_TYPES,
        default='medical'
    )
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=8,
        required=False,
        allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=11,
        decimal_places=8,
        required=False,
        allow_null=True
    )
    use_cached_location = serializers.BooleanField(
        default=True,
        help_text='Use cached location if current not available'
    )