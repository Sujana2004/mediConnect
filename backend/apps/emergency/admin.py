"""
Emergency App Admin Configuration.

Provides admin interface for managing:
- Emergency Contacts
- Emergency Services (Hospitals, Ambulances, etc.)
- SOS Alerts
- First Aid Guides
- Emergency Helplines
- User Location Cache
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count

from .models import (
    EmergencyContact,
    EmergencyService,
    SOSAlert,
    FirstAidGuide,
    EmergencyHelpline,
    UserLocationCache,
)


# =============================================================================
# EMERGENCY CONTACT ADMIN
# =============================================================================

@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    """Admin for emergency contacts."""
    
    list_display = [
        'name',
        'phone_number',
        'relationship',
        'priority',
        'user_phone',
        'is_active',
        'notify_on_sos',
        'created_at',
    ]
    list_filter = [
        'relationship',
        'is_active',
        'notify_on_sos',
        'share_location',
        'created_at',
    ]
    search_fields = [
        'name',
        'phone_number',
        'user__phone_number',
        'user__first_name',
        'user__last_name',
    ]
    ordering = ['user', 'priority']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'phone_number', 'alternate_phone', 'relationship')
        }),
        ('User', {
            'fields': ('user',)
        }),
        ('Settings', {
            'fields': ('priority', 'is_active', 'notify_on_sos', 'share_location')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        """Display user's phone number."""
        return obj.user.phone_number
    user_phone.short_description = 'User Phone'
    user_phone.admin_order_field = 'user__phone_number'


# =============================================================================
# EMERGENCY SERVICE ADMIN
# =============================================================================

@admin.register(EmergencyService)
class EmergencyServiceAdmin(admin.ModelAdmin):
    """Admin for emergency services (hospitals, ambulances, etc.)."""
    
    list_display = [
        'name',
        'service_type',
        'district',
        'phone_primary',
        'is_24x7',
        'is_government',
        'is_verified',
        'is_active',
    ]
    list_filter = [
        'service_type',
        'facility_level',
        'is_24x7',
        'is_government',
        'is_verified',
        'is_active',
        'has_emergency_ward',
        'has_icu',
        'has_ambulance',
        'state',
        'district',
    ]
    search_fields = [
        'name',
        'name_local',
        'phone_primary',
        'phone_emergency',
        'address',
        'district',
        'pincode',
    ]
    ordering = ['service_type', 'name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name', 'name_local', 'service_type', 'facility_level'
            )
        }),
        ('Contact', {
            'fields': (
                'phone_primary', 'phone_secondary', 'phone_emergency'
            )
        }),
        ('Location', {
            'fields': (
                'address', 'address_local', 'landmark',
                'district', 'state', 'pincode',
                'latitude', 'longitude'
            )
        }),
        ('Operational Details', {
            'fields': (
                'is_24x7', 'opening_time', 'closing_time'
            )
        }),
        ('Facilities (Hospitals)', {
            'fields': (
                'has_emergency_ward', 'has_icu', 'has_ambulance',
                'has_blood_bank', 'bed_count'
            ),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': (
                'is_government', 'is_active', 'is_verified'
            )
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_verified', 'mark_unverified', 'activate', 'deactivate']
    
    def mark_verified(self, request, queryset):
        """Mark selected services as verified."""
        count = queryset.update(is_verified=True)
        self.message_user(request, f'{count} services marked as verified.')
    mark_verified.short_description = 'Mark as verified'
    
    def mark_unverified(self, request, queryset):
        """Mark selected services as unverified."""
        count = queryset.update(is_verified=False)
        self.message_user(request, f'{count} services marked as unverified.')
    mark_unverified.short_description = 'Mark as unverified'
    
    def activate(self, request, queryset):
        """Activate selected services."""
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} services activated.')
    activate.short_description = 'Activate services'
    
    def deactivate(self, request, queryset):
        """Deactivate selected services."""
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} services deactivated.')
    deactivate.short_description = 'Deactivate services'


# =============================================================================
# SOS ALERT ADMIN
# =============================================================================

@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    """Admin for SOS alerts."""
    
    list_display = [
        'short_id',
        'user_phone',
        'emergency_type',
        'status_badge',
        'location_address_short',
        'contacts_count',
        'created_at',
        'time_elapsed',
    ]
    list_filter = [
        'status',
        'emergency_type',
        'created_at',
    ]
    search_fields = [
        'id',
        'user__phone_number',
        'user__first_name',
        'user__last_name',
        'location_address',
        'description',
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'id', 'user', 'created_at', 'updated_at',
        'notification_sent_at', 'acknowledged_at', 'resolved_at',
        'contacts_notified', 'services_notified',
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Alert Information', {
            'fields': (
                'id', 'user', 'emergency_type', 'status', 'description'
            )
        }),
        ('Location', {
            'fields': (
                'latitude', 'longitude', 'location_accuracy', 'location_address'
            )
        }),
        ('Notification', {
            'fields': (
                'contacts_notified', 'services_notified', 'notification_sent_at'
            )
        }),
        ('Response', {
            'fields': (
                'acknowledged_by', 'acknowledged_at', 'responder_eta'
            )
        }),
        ('Resolution', {
            'fields': (
                'resolved_at', 'resolution_notes'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def short_id(self, obj):
        """Display short version of UUID."""
        return str(obj.id)[:8]
    short_id.short_description = 'ID'
    
    def user_phone(self, obj):
        """Display user's phone number."""
        return obj.user.phone_number
    user_phone.short_description = 'User'
    user_phone.admin_order_field = 'user__phone_number'
    
    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'triggered': '#dc3545',      # Red
            'notifying': '#fd7e14',      # Orange
            'acknowledged': '#ffc107',   # Yellow
            'responding': '#17a2b8',     # Blue
            'resolved': '#28a745',       # Green
            'cancelled': '#6c757d',      # Gray
            'false_alarm': '#6c757d',    # Gray
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def location_address_short(self, obj):
        """Display truncated address."""
        if obj.location_address:
            return obj.location_address[:50] + '...' if len(obj.location_address) > 50 else obj.location_address
        return '-'
    location_address_short.short_description = 'Location'
    
    def contacts_count(self, obj):
        """Display number of contacts notified."""
        count = len(obj.contacts_notified) if obj.contacts_notified else 0
        return count
    contacts_count.short_description = 'Notified'
    
    def time_elapsed(self, obj):
        """Display time elapsed since SOS."""
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
    time_elapsed.short_description = 'Elapsed'


# =============================================================================
# FIRST AID GUIDE ADMIN
# =============================================================================

@admin.register(FirstAidGuide)
class FirstAidGuideAdmin(admin.ModelAdmin):
    """Admin for first aid guides."""
    
    list_display = [
        'title_en',
        'category',
        'is_critical',
        'has_translations',
        'display_order',
        'is_active',
    ]
    list_filter = [
        'category',
        'is_critical',
        'is_active',
    ]
    search_fields = [
        'title_en',
        'title_te',
        'title_hi',
        'symptoms_en',
    ]
    ordering = ['display_order', 'title_en']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Title', {
            'fields': ('title_en', 'title_te', 'title_hi')
        }),
        ('Category & Priority', {
            'fields': ('category', 'is_critical', 'display_order')
        }),
        ('Symptoms (How to identify)', {
            'fields': ('symptoms_en', 'symptoms_te', 'symptoms_hi')
        }),
        ('Steps (What to do)', {
            'fields': ('steps_en', 'steps_te', 'steps_hi'),
            'description': 'Enter as JSON list: ["Step 1", "Step 2", ...]'
        }),
        ('Do NOT do', {
            'fields': ('donts_en', 'donts_te', 'donts_hi'),
            'description': 'Enter as JSON list: ["Don\'t do X", ...]'
        }),
        ('When to call for help', {
            'fields': ('call_help_en', 'call_help_te', 'call_help_hi')
        }),
        ('Media', {
            'fields': ('image_url', 'video_url'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_translations(self, obj):
        """Check if guide has Telugu and Hindi translations."""
        has_te = bool(obj.title_te and obj.steps_te)
        has_hi = bool(obj.title_hi and obj.steps_hi)
        
        if has_te and has_hi:
            return format_html('<span style="color: green;">✓ TE, HI</span>')
        elif has_te:
            return format_html('<span style="color: orange;">✓ TE</span>')
        elif has_hi:
            return format_html('<span style="color: orange;">✓ HI</span>')
        else:
            return format_html('<span style="color: red;">EN only</span>')
    has_translations.short_description = 'Translations'


# =============================================================================
# EMERGENCY HELPLINE ADMIN
# =============================================================================

@admin.register(EmergencyHelpline)
class EmergencyHelplineAdmin(admin.ModelAdmin):
    """Admin for emergency helplines."""
    
    list_display = [
        'name_en',
        'number',
        'helpline_type',
        'is_national',
        'state',
        'is_24x7',
        'is_toll_free',
        'display_order',
        'is_active',
    ]
    list_filter = [
        'helpline_type',
        'is_national',
        'is_24x7',
        'is_toll_free',
        'is_active',
        'state',
    ]
    search_fields = [
        'name_en',
        'name_te',
        'name_hi',
        'number',
        'alternate_number',
        'state',
    ]
    ordering = ['display_order', 'name_en']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Name', {
            'fields': ('name_en', 'name_te', 'name_hi')
        }),
        ('Contact', {
            'fields': ('number', 'alternate_number', 'helpline_type')
        }),
        ('Scope', {
            'fields': ('is_national', 'state')
        }),
        ('Description', {
            'fields': ('description_en', 'description_te', 'description_hi'),
            'classes': ('collapse',)
        }),
        ('Availability', {
            'fields': ('is_24x7', 'is_toll_free')
        }),
        ('Display', {
            'fields': ('display_order', 'is_active')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate', 'deactivate']
    
    def activate(self, request, queryset):
        """Activate selected helplines."""
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} helplines activated.')
    activate.short_description = 'Activate helplines'
    
    def deactivate(self, request, queryset):
        """Deactivate selected helplines."""
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} helplines deactivated.')
    deactivate.short_description = 'Deactivate helplines'


# =============================================================================
# USER LOCATION CACHE ADMIN
# =============================================================================

@admin.register(UserLocationCache)
class UserLocationCacheAdmin(admin.ModelAdmin):
    """Admin for user location cache."""
    
    list_display = [
        'user_phone',
        'latitude',
        'longitude',
        'district',
        'nearby_count',
        'location_updated_at',
    ]
    list_filter = [
        'state',
        'district',
    ]
    search_fields = [
        'user__phone_number',
        'user__first_name',
        'user__last_name',
        'address',
        'district',
        'pincode',
    ]
    ordering = ['-location_updated_at']
    readonly_fields = [
        'id', 'user', 'nearby_hospitals', 'nearby_ambulances',
        'location_updated_at', 'nearby_updated_at'
    ]
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Location', {
            'fields': (
                'latitude', 'longitude', 'accuracy',
                'address', 'district', 'state', 'pincode'
            )
        }),
        ('Cached Nearby Services', {
            'fields': ('nearby_hospitals', 'nearby_ambulances', 'nearby_updated_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'location_updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_phone(self, obj):
        """Display user's phone number."""
        return obj.user.phone_number
    user_phone.short_description = 'User'
    user_phone.admin_order_field = 'user__phone_number'
    
    def nearby_count(self, obj):
        """Display count of cached nearby services."""
        hospitals = len(obj.nearby_hospitals) if obj.nearby_hospitals else 0
        ambulances = len(obj.nearby_ambulances) if obj.nearby_ambulances else 0
        return f"{hospitals} H, {ambulances} A"
    nearby_count.short_description = 'Nearby'