"""
Emergency App Admin Configuration (Enhanced)
=============================================
Provides admin interface for managing emergency features with:
- Visual status indicators
- Priority highlighting for active SOS
- Google Maps integration
- Performance optimization
- Bulk actions and export

CRITICAL FIX: Changed phone_number → phone throughout
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Q
from django.urls import reverse
from django.http import HttpResponse
import csv
from datetime import timedelta

from .models import (
    EmergencyContact,
    EmergencyService,
    SOSAlert,
    FirstAidGuide,
    EmergencyHelpline,
    UserLocationCache,
)


# ============================================
# HELPER FUNCTIONS
# ============================================

def sos_status_badge(status):
    """Generate prominent badge for SOS status."""
    config = {
        'triggered': ('#dc3545', '🚨', 'TRIGGERED'),
        'notifying': ('#fd7e14', '📢', 'NOTIFYING'),
        'acknowledged': ('#ffc107', '👁️', 'ACKNOWLEDGED'),
        'responding': ('#17a2b8', '🚑', 'RESPONDING'),
        'resolved': ('#28a745', '✓', 'RESOLVED'),
        'cancelled': ('#6c757d', '✗', 'CANCELLED'),
        'false_alarm': ('#6c757d', '⚠️', 'FALSE ALARM'),
    }
    color, icon, text = config.get(status, ('#6c757d', '?', status))
    
    # Make triggered/notifying more prominent
    if status in ['triggered', 'notifying']:
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 12px; '
            'border-radius: 15px; font-size: 12px; font-weight: bold; '
            'animation: pulse 1s infinite;">{} {}</span>',
            color, icon, text
        )
    
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, text
    )


def service_type_badge(service_type):
    """Generate badge for service type."""
    config = {
        'hospital': ('#e74c3c', '🏥'),
        'ambulance': ('#3498db', '🚑'),
        'phc': ('#27ae60', '🏨'),
        'clinic': ('#9b59b6', '⚕️'),
        'pharmacy': ('#1abc9c', '💊'),
        'blood_bank': ('#c0392b', '🩸'),
        'police': ('#2c3e50', '🚔'),
        'fire': ('#e67e22', '🚒'),
    }
    color, icon = config.get(service_type, ('#7f8c8d', '📍'))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 2px 8px; '
        'border-radius: 8px; font-size: 11px;">{} {}</span>',
        color, icon, service_type.upper().replace('_', ' ')
    )


def google_maps_link(lat, lng, label="View on Map"):
    """Generate Google Maps link."""
    if lat and lng:
        url = f"https://www.google.com/maps?q={lat},{lng}"
        return format_html(
            '<a href="{}" target="_blank" style="color: #3498db;">📍 {}</a>',
            url, label
        )
    return '-'


def time_elapsed_display(start_time, end_time=None):
    """Display time elapsed with color coding."""
    if not start_time:
        return '-'
    
    end = end_time or timezone.now()
    delta = end - start_time
    total_seconds = int(delta.total_seconds())
    
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    # Color code based on duration
    if hours > 0:
        if hours > 2:
            color = '#e74c3c'  # Red - too long
        else:
            color = '#f39c12'  # Orange
        text = f"{hours}h {minutes}m"
    elif minutes > 0:
        if minutes > 30:
            color = '#f39c12'  # Orange
        else:
            color = '#27ae60'  # Green
        text = f"{minutes}m {seconds}s"
    else:
        color = '#27ae60'  # Green
        text = f"{seconds}s"
    
    return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, text)


# ============================================
# CUSTOM FILTERS
# ============================================

class SOSStatusFilter(admin.SimpleListFilter):
    """Filter SOS alerts by urgency."""
    title = 'Alert Status'
    parameter_name = 'sos_status'
    
    def lookups(self, request, model_admin):
        return (
            ('active', '🚨 ACTIVE (Needs Attention)'),
            ('triggered', '🔴 Triggered'),
            ('notifying', '🟠 Notifying'),
            ('acknowledged', '🟡 Acknowledged'),
            ('responding', '🔵 Responding'),
            ('resolved', '🟢 Resolved'),
            ('cancelled', '⚫ Cancelled/False Alarm'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'active':
            return queryset.filter(status__in=['triggered', 'notifying', 'acknowledged', 'responding'])
        if self.value() == 'cancelled':
            return queryset.filter(status__in=['cancelled', 'false_alarm'])
        if self.value():
            return queryset.filter(status=self.value())


class SOSAgeFilter(admin.SimpleListFilter):
    """Filter SOS by age."""
    title = 'Time Since Alert'
    parameter_name = 'age'
    
    def lookups(self, request, model_admin):
        return (
            ('5min', '⚡ Last 5 minutes'),
            ('30min', '🕐 Last 30 minutes'),
            ('1hour', '🕑 Last 1 hour'),
            ('today', '📅 Today'),
            ('week', '📆 This Week'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == '5min':
            return queryset.filter(created_at__gte=now - timedelta(minutes=5))
        if self.value() == '30min':
            return queryset.filter(created_at__gte=now - timedelta(minutes=30))
        if self.value() == '1hour':
            return queryset.filter(created_at__gte=now - timedelta(hours=1))
        if self.value() == 'today':
            return queryset.filter(created_at__date=now.date())
        if self.value() == 'week':
            return queryset.filter(created_at__gte=now - timedelta(days=7))


class ServiceVerificationFilter(admin.SimpleListFilter):
    """Filter services by verification status."""
    title = 'Verification'
    parameter_name = 'verification'
    
    def lookups(self, request, model_admin):
        return (
            ('verified', '✅ Verified'),
            ('unverified', '⚠️ Unverified'),
            ('inactive', '❌ Inactive'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'verified':
            return queryset.filter(is_verified=True, is_active=True)
        if self.value() == 'unverified':
            return queryset.filter(is_verified=False, is_active=True)
        if self.value() == 'inactive':
            return queryset.filter(is_active=False)


# ============================================
# INLINE ADMINS
# ============================================

class EmergencyContactInline(admin.TabularInline):
    """Inline view of user's emergency contacts."""
    model = EmergencyContact
    extra = 0
    fields = ['name', 'phone_number', 'relationship', 'priority', 'notify_on_sos', 'is_active']
    readonly_fields = ['name', 'phone_number', 'relationship']
    can_delete = False
    max_num = 10
    
    def has_add_permission(self, request, obj=None):
        return False


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    """Admin for emergency contacts."""
    
    list_display = [
        'name',
        'phone_number',
        'relationship_badge',
        'priority_display',
        'user_link',
        'active_badge',
        'notify_badge',
        'created_at',
    ]
    list_filter = [
        'relationship',
        'is_active',
        'notify_on_sos',
        'share_location',
        'priority',
        'created_at',
    ]
    search_fields = [
        'name',
        'phone_number',
        'user__phone',  # ✅ FIXED: was phone_number
        'user__first_name',
        'user__last_name',
    ]
    ordering = ['user', 'priority']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_select_related = ['user']  # ✅ Performance
    list_per_page = 30
    actions = ['activate_contacts', 'deactivate_contacts', 'enable_sos_notify', 'export_contacts_csv']
    
    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'phone_number', 'alternate_phone', 'relationship')
        }),
        ('User', {
            'fields': ('user',)
        }),
        ('Settings', {
            'fields': ('priority', 'is_active', 'notify_on_sos', 'share_location'),
            'description': 'Priority 1 = First to be notified'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Relationship')
    def relationship_badge(self, obj):
        rel_icons = {
            'spouse': '💑',
            'parent': '👨‍👩‍👧',
            'child': '👶',
            'sibling': '👫',
            'relative': '👨‍👩‍👧‍👦',
            'friend': '🤝',
            'neighbor': '🏘️',
            'doctor': '👨‍⚕️',
            'other': '👤',
        }
        icon = rel_icons.get(obj.relationship, '👤')
        return format_html('{} {}', icon, obj.relationship.title() if obj.relationship else 'Other')
    
    @admin.display(description='Priority')
    def priority_display(self, obj):
        if obj.priority == 1:
            return format_html('<span style="color: #e74c3c; font-weight: bold;">① Primary</span>')
        elif obj.priority == 2:
            return format_html('<span style="color: #f39c12;">② Secondary</span>')
        return format_html('<span style="color: #7f8c8d;">③ #{}</span>', obj.priority)
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.display(description='SOS Notify')
    def notify_badge(self, obj):
        if obj.notify_on_sos:
            return format_html('<span style="color: #27ae60;">🔔 Yes</span>')
        return format_html('<span style="color: #bdc3c7;">🔕 No</span>')
    
    @admin.action(description='✅ Activate selected contacts')
    def activate_contacts(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} contacts activated.')
    
    @admin.action(description='❌ Deactivate selected contacts')
    def deactivate_contacts(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} contacts deactivated.')
    
    @admin.action(description='🔔 Enable SOS notifications')
    def enable_sos_notify(self, request, queryset):
        count = queryset.update(notify_on_sos=True)
        self.message_user(request, f'{count} contacts will now receive SOS alerts.')
    
    @admin.action(description='📥 Export to CSV')
    def export_contacts_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="emergency_contacts.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['User Phone', 'Contact Name', 'Contact Phone', 'Relationship', 'Priority', 'Active', 'SOS Notify'])
        
        for contact in queryset.select_related('user'):
            writer.writerow([
                contact.user.phone,
                contact.name,
                contact.phone_number,
                contact.relationship,
                contact.priority,
                contact.is_active,
                contact.notify_on_sos
            ])
        
        return response


@admin.register(EmergencyService)
class EmergencyServiceAdmin(admin.ModelAdmin):
    """Admin for emergency services (hospitals, ambulances, etc.)."""
    
    list_display = [
        'name',
        'type_badge',
        'facility_badge',
        'district',
        'phone_primary',
        'availability_badge',
        'facilities_summary',
        'verification_badge',
        'map_link',
    ]
    list_filter = [
        ServiceVerificationFilter,
        'service_type',
        'facility_level',
        'is_24x7',
        'is_government',
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
    readonly_fields = ['id', 'created_at', 'updated_at', 'map_preview']
    list_per_page = 30
    actions = ['mark_verified', 'mark_unverified', 'activate', 'deactivate', 'export_services_csv']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name', 'name_local', 'service_type', 'facility_level'
            )
        }),
        ('Contact', {
            'fields': (
                'phone_primary', 'phone_secondary', 'phone_emergency'
            ),
            'description': 'Phone emergency is for direct emergency ward access'
        }),
        ('Location', {
            'fields': (
                'address', 'address_local', 'landmark',
                'district', 'state', 'pincode',
                'latitude', 'longitude', 'map_preview'
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
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        return service_type_badge(obj.service_type)
    
    @admin.display(description='Level')
    def facility_badge(self, obj):
        if obj.facility_level:
            colors = {
                'primary': '#3498db',
                'secondary': '#27ae60',
                'tertiary': '#9b59b6',
                'super_specialty': '#e74c3c',
            }
            color = colors.get(obj.facility_level, '#7f8c8d')
            return format_html(
                '<span style="color: {};">{}</span>',
                color, obj.facility_level.replace('_', ' ').title()
            )
        return '-'
    
    @admin.display(description='Hours')
    def availability_badge(self, obj):
        if obj.is_24x7:
            return format_html('<span style="color: #27ae60; font-weight: bold;">24×7</span>')
        if obj.opening_time and obj.closing_time:
            return format_html(
                '<span style="color: #f39c12;">{} - {}</span>',
                obj.opening_time.strftime('%H:%M'),
                obj.closing_time.strftime('%H:%M')
            )
        return '-'
    
    @admin.display(description='Facilities')
    def facilities_summary(self, obj):
        facilities = []
        if obj.has_emergency_ward:
            facilities.append('🚨ER')
        if obj.has_icu:
            facilities.append('🏥ICU')
        if obj.has_ambulance:
            facilities.append('🚑Amb')
        if obj.has_blood_bank:
            facilities.append('🩸BB')
        
        if facilities:
            return format_html(' '.join(facilities))
        return '-'
    
    @admin.display(description='Status')
    def verification_badge(self, obj):
        if not obj.is_active:
            return format_html('<span style="color: #e74c3c;">❌ Inactive</span>')
        if obj.is_verified:
            govt = '🏛️' if obj.is_government else ''
            return format_html('<span style="color: #27ae60;">✅ Verified {}</span>', govt)
        return format_html('<span style="color: #f39c12;">⚠️ Unverified</span>')
    
    @admin.display(description='Map')
    def map_link(self, obj):
        return google_maps_link(obj.latitude, obj.longitude, "View")
    
    def map_preview(self, obj):
        """Show map preview in detail view."""
        if obj.latitude and obj.longitude:
            return format_html(
                '<a href="https://www.google.com/maps?q={},{}" target="_blank">'
                '<img src="https://maps.googleapis.com/maps/api/staticmap?center={},{}&zoom=15&size=400x200&markers=color:red%7C{},{}" '
                'style="max-width: 400px; border-radius: 8px;" alt="Map preview"/><br>'
                '📍 Click to open in Google Maps</a>',
                obj.latitude, obj.longitude,
                obj.latitude, obj.longitude,
                obj.latitude, obj.longitude
            )
        return 'No coordinates available'
    map_preview.short_description = 'Map Preview'
    
    @admin.action(description='✅ Mark as verified')
    def mark_verified(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f'{count} services marked as verified.')
    
    @admin.action(description='⚠️ Mark as unverified')
    def mark_unverified(self, request, queryset):
        count = queryset.update(is_verified=False)
        self.message_user(request, f'{count} services marked as unverified.')
    
    @admin.action(description='🟢 Activate services')
    def activate(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} services activated.')
    
    @admin.action(description='🔴 Deactivate services')
    def deactivate(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} services deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_services_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="emergency_services.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Type', 'District', 'Phone', 'Emergency Phone', '24x7', 'Govt', 'Verified', 'Lat', 'Lng'])
        
        for service in queryset:
            writer.writerow([
                service.name,
                service.service_type,
                service.district,
                service.phone_primary,
                service.phone_emergency or '',
                service.is_24x7,
                service.is_government,
                service.is_verified,
                service.latitude or '',
                service.longitude or ''
            ])
        
        return response


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    """Admin for SOS alerts - CRITICAL: Monitor this closely!"""
    
    list_display = [
        'alert_indicator',
        'short_id',
        'user_link',
        'emergency_type_badge',
        'status_display',
        'location_link',
        'contacts_notified_display',
        'time_elapsed_display',
        'created_at',
    ]
    list_filter = [
        SOSStatusFilter,
        SOSAgeFilter,
        'emergency_type',
        'created_at',
    ]
    search_fields = [
        'id',
        'user__phone',  # ✅ FIXED: was phone_number
        'user__first_name',
        'user__last_name',
        'location_address',
        'description',
    ]
    ordering = ['-created_at']
    # readonly_fields = [
    #     'id','user', 'created_at', 'updated_at',
    #     'notification_sent_at', 'acknowledged_at', 'resolved_at',
    #     'contacts_notified', 'services_notified', 'map_preview',
    # ]
    date_hierarchy = 'created_at'
    list_select_related = ['user']  # ✅ Performance (acknowledged_by is CharField, not FK)
    list_per_page = 25
    autocomplete_fields = ['user']
    actions = ['acknowledge_alerts', 'mark_responding', 'resolve_alerts', 'mark_false_alarm', 'export_sos_csv']

    def get_readonly_fields(self, request, obj=None):
        """Make certain fields readonly only when editing, not when adding."""
        readonly = [
            'id', 'created_at', 'updated_at',
            'notification_sent_at', 'acknowledged_at', 'resolved_at',
            'contacts_notified', 'services_notified', 'map_preview',
        ]
        if obj:  # Editing existing object - make user readonly
            readonly.append('user')
        return readonly
    
    fieldsets = (
        ('🚨 ALERT INFORMATION', {
            'fields': (
                'id', 'user', 'emergency_type', 'status', 'description'
            ),
            'description': '⚠️ Active SOS alerts require immediate attention! User is required.'
        }),
        ('📍 Location', {
            'fields': (
                'latitude', 'longitude', 'location_accuracy', 
                'location_address', 'map_preview'
            )
        }),
        ('📢 Notification', {
            'fields': (
                'contacts_notified', 'services_notified', 'notification_sent_at'
            )
        }),
        ('👁️ Response', {
            'fields': (
                'acknowledged_by', 'acknowledged_at', 'responder_eta'
            )
        }),
        ('✅ Resolution', {
            'fields': (
                'resolved_at', 'resolution_notes'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Order by status priority - active alerts first."""
        qs = super().get_queryset(request)
        # Custom ordering: active statuses first
        from django.db.models import Case, When, IntegerField
        return qs.annotate(
            status_priority=Case(
                When(status='triggered', then=0),
                When(status='notifying', then=1),
                When(status='acknowledged', then=2),
                When(status='responding', then=3),
                default=10,
                output_field=IntegerField(),
            )
        ).order_by('status_priority', '-created_at')
    
    @admin.display(description='!')
    def alert_indicator(self, obj):
        """Visual indicator for active alerts."""
        if obj.status in ['triggered', 'notifying']:
            return format_html(
                '<span style="display: inline-block; width: 12px; height: 12px; '
                'background-color: #e74c3c; border-radius: 50%; animation: blink 1s infinite;"></span>'
            )
        elif obj.status in ['acknowledged', 'responding']:
            return format_html(
                '<span style="display: inline-block; width: 12px; height: 12px; '
                'background-color: #f39c12; border-radius: 50%;"></span>'
            )
        return format_html(
            '<span style="display: inline-block; width: 12px; height: 12px; '
            'background-color: #27ae60; border-radius: 50%;"></span>'
        )
    
    @admin.display(description='ID')
    def short_id(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        name = obj.user.get_full_name() or obj.user.phone
        return format_html('<a href="{}">{}</a>', url, name)  # ✅ FIXED
    
    @admin.display(description='Type')
    def emergency_type_badge(self, obj):
        type_config = {
            'medical': ('#e74c3c', '🏥'),
            'accident': ('#c0392b', '🚗'),
            'fire': ('#e67e22', '🔥'),
            'crime': ('#8e44ad', '🚔'),
            'natural_disaster': ('#2c3e50', '🌊'),
            'other': ('#7f8c8d', '⚠️'),
        }
        color, icon = type_config.get(obj.emergency_type, ('#7f8c8d', '⚠️'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 11px;">{} {}</span>',
            color, icon, (obj.emergency_type or 'Unknown').replace('_', ' ').title()
        )
    
    @admin.display(description='Status')
    def status_display(self, obj):
        return sos_status_badge(obj.status)
    
    @admin.display(description='Location')
    def location_link(self, obj):
        if obj.latitude and obj.longitude:
            addr = obj.location_address[:25] + '...' if obj.location_address and len(obj.location_address) > 25 else (obj.location_address or '')
            url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
            return format_html(
                '<a href="{}" target="_blank" title="{}">📍 {}</a>',
                url, obj.location_address or 'View on map', addr or 'View Map'
            )
        return format_html('<span style="color: #e74c3c;">📍 No location</span>')
    
    @admin.display(description='Notified')
    def contacts_notified_display(self, obj):
        contacts = len(obj.contacts_notified) if obj.contacts_notified else 0
        services = len(obj.services_notified) if obj.services_notified else 0
        return format_html(
            '<span title="{} contacts, {} services">👥 {} | 🏥 {}</span>',
            contacts, services, contacts, services
        )
    
    @admin.display(description='Elapsed')
    def time_elapsed_display(self, obj):
        return time_elapsed_display(obj.created_at, obj.resolved_at)
    
    def map_preview(self, obj):
        """Show map in detail view."""
        return google_maps_link(obj.latitude, obj.longitude, f"View Location ({obj.latitude}, {obj.longitude})")
    map_preview.short_description = 'Map Link'
    
    @admin.action(description='👁️ Acknowledge selected alerts')
    def acknowledge_alerts(self, request, queryset):
        count = queryset.filter(status__in=['triggered', 'notifying']).update(
            status='acknowledged',
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        self.message_user(request, f'{count} alerts acknowledged.')
    
    @admin.action(description='🚑 Mark as responding')
    def mark_responding(self, request, queryset):
        count = queryset.filter(status='acknowledged').update(status='responding')
        self.message_user(request, f'{count} alerts marked as responding.')
    
    @admin.action(description='✅ Resolve selected alerts')
    def resolve_alerts(self, request, queryset):
        count = queryset.exclude(status__in=['resolved', 'cancelled', 'false_alarm']).update(
            status='resolved',
            resolved_at=timezone.now()
        )
        self.message_user(request, f'{count} alerts resolved.')
    
    @admin.action(description='⚠️ Mark as false alarm')
    def mark_false_alarm(self, request, queryset):
        count = queryset.exclude(status__in=['resolved', 'cancelled', 'false_alarm']).update(
            status='false_alarm',
            resolved_at=timezone.now()
        )
        self.message_user(request, f'{count} alerts marked as false alarm.')
    
    @admin.action(description='📥 Export to CSV')
    def export_sos_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sos_alerts.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'User', 'Type', 'Status', 'Location', 'Lat', 'Lng', 'Contacts Notified', 'Created', 'Resolved'])
        
        for sos in queryset.select_related('user'):
            writer.writerow([
                str(sos.id)[:8],
                sos.user.phone,
                sos.emergency_type,
                sos.status,
                sos.location_address or '',
                sos.latitude or '',
                sos.longitude or '',
                len(sos.contacts_notified) if sos.contacts_notified else 0,
                sos.created_at.strftime('%Y-%m-%d %H:%M'),
                sos.resolved_at.strftime('%Y-%m-%d %H:%M') if sos.resolved_at else ''
            ])
        
        return response


@admin.register(FirstAidGuide)
class FirstAidGuideAdmin(admin.ModelAdmin):
    """Admin for first aid guides."""
    
    list_display = [
        'title_en',
        'category_badge',
        'critical_badge',
        'translation_status',
        'media_status',
        'display_order',
        'active_badge',
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
    list_per_page = 25
    actions = ['activate_guides', 'deactivate_guides', 'mark_critical', 'export_guides_csv']
    
    fieldsets = (
        ('Title', {
            'fields': ('title_en', 'title_te', 'title_hi')
        }),
        ('Category & Priority', {
            'fields': ('category', 'is_critical', 'display_order'),
            'description': 'Critical guides are shown first and highlighted in the app'
        }),
        ('Symptoms (How to identify)', {
            'fields': ('symptoms_en', 'symptoms_te', 'symptoms_hi')
        }),
        ('Steps (What to do)', {
            'fields': ('steps_en', 'steps_te', 'steps_hi'),
            'description': 'Enter as JSON list: ["Step 1", "Step 2", ...]'
        }),
        ("⚠️ Do NOT do", {
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
    
    @admin.display(description='Category')
    def category_badge(self, obj):
        cat_config = {
            'cardiac': ('#e74c3c', '❤️'),
            'respiratory': ('#3498db', '🫁'),
            'bleeding': ('#c0392b', '🩸'),
            'burns': ('#e67e22', '🔥'),
            'fracture': ('#95a5a6', '🦴'),
            'poisoning': ('#8e44ad', '☠️'),
            'choking': ('#1abc9c', '😮'),
            'drowning': ('#2980b9', '🌊'),
            'snake_bite': ('#27ae60', '🐍'),
            'other': ('#7f8c8d', '➕'),
        }
        color, icon = cat_config.get(obj.category, ('#7f8c8d', '➕'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 11px;">{} {}</span>',
            color, icon, (obj.category or 'Other').replace('_', ' ').title()
        )
    
    @admin.display(description='Critical')
    def critical_badge(self, obj):
        if obj.is_critical:
            return format_html('<span style="color: #e74c3c; font-weight: bold;">🚨 CRITICAL</span>')
        return format_html('<span style="color: #bdc3c7;">Normal</span>')
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        has_te = bool(obj.title_te and obj.steps_te)
        has_hi = bool(obj.title_hi and obj.steps_hi)
        
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ TE ✓ HI</span>')
        elif has_te:
            return format_html('<span style="color: #f39c12;">✓ TE ✗ HI</span>')
        elif has_hi:
            return format_html('<span style="color: #f39c12;">✗ TE ✓ HI</span>')
        return format_html('<span style="color: #e74c3c;">EN only</span>')
    
    @admin.display(description='Media')
    def media_status(self, obj):
        has_img = bool(obj.image_url)
        has_vid = bool(obj.video_url)
        
        if has_img and has_vid:
            return format_html('<span style="color: #27ae60;">🖼️ 🎬</span>')
        elif has_img:
            return format_html('<span style="color: #3498db;">🖼️</span>')
        elif has_vid:
            return format_html('<span style="color: #3498db;">🎬</span>')
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.action(description='✅ Activate selected guides')
    def activate_guides(self, request, queryset):
        queryset.update(is_active=True)
    
    @admin.action(description='❌ Deactivate selected guides')
    def deactivate_guides(self, request, queryset):
        queryset.update(is_active=False)
    
    @admin.action(description='🚨 Mark as critical')
    def mark_critical(self, request, queryset):
        queryset.update(is_critical=True)
        self.message_user(request, f'{queryset.count()} guides marked as critical.')
    
    @admin.action(description='📥 Export to CSV')
    def export_guides_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="first_aid_guides.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Title (EN)', 'Category', 'Critical', 'Has Telugu', 'Has Hindi', 'Active'])
        
        for guide in queryset:
            writer.writerow([
                guide.title_en,
                guide.category,
                guide.is_critical,
                bool(guide.title_te),
                bool(guide.title_hi),
                guide.is_active
            ])
        
        return response


@admin.register(EmergencyHelpline)
class EmergencyHelplineAdmin(admin.ModelAdmin):
    """Admin for emergency helplines."""
    
    list_display = [
        'name_en',
        'number_display',
        'type_badge',
        'scope_badge',
        'availability_badge',
        'toll_free_badge',
        'translation_status',
        'display_order',
        'active_badge',
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
    list_per_page = 30
    actions = ['activate', 'deactivate', 'export_helplines_csv']
    
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
    
    @admin.display(description='Number')
    def number_display(self, obj):
        return format_html(
            '<a href="tel:{}" style="font-weight: bold; font-size: 14px;">{}</a>',
            obj.number, obj.number
        )
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        type_config = {
            'police': ('#2c3e50', '🚔'),
            'ambulance': ('#e74c3c', '🚑'),
            'fire': ('#e67e22', '🚒'),
            'women': ('#9b59b6', '👩'),
            'child': ('#3498db', '👶'),
            'disaster': ('#c0392b', '🌊'),
            'mental_health': ('#1abc9c', '🧠'),
            'covid': ('#27ae60', '😷'),
            'other': ('#7f8c8d', '📞'),
        }
        color, icon = type_config.get(obj.helpline_type, ('#7f8c8d', '📞'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 11px;">{} {}</span>',
            color, icon, (obj.helpline_type or 'Other').replace('_', ' ').title()
        )
    
    @admin.display(description='Scope')
    def scope_badge(self, obj):
        if obj.is_national:
            return format_html('<span style="color: #27ae60;">🇮🇳 National</span>')
        return format_html('<span style="color: #3498db;">📍 {}</span>', obj.state or 'State')
    
    @admin.display(description='Hours')
    def availability_badge(self, obj):
        if obj.is_24x7:
            return format_html('<span style="color: #27ae60; font-weight: bold;">24×7</span>')
        return format_html('<span style="color: #f39c12;">Limited</span>')
    
    @admin.display(description='Toll Free')
    def toll_free_badge(self, obj):
        if obj.is_toll_free:
            return format_html('<span style="color: #27ae60;">✓ Free</span>')
        return format_html('<span style="color: #bdc3c7;">Paid</span>')
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        has_te = bool(obj.name_te)
        has_hi = bool(obj.name_hi)
        
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ Both</span>')
        elif has_te or has_hi:
            return format_html('<span style="color: #f39c12;">Partial</span>')
        return format_html('<span style="color: #e74c3c;">EN only</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">●</span>')
        return format_html('<span style="color: #e74c3c;">○</span>')
    
    @admin.action(description='✅ Activate helplines')
    def activate(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} helplines activated.')
    
    @admin.action(description='❌ Deactivate helplines')
    def deactivate(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} helplines deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_helplines_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="emergency_helplines.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Number', 'Type', 'National', 'State', '24x7', 'Toll Free'])
        
        for helpline in queryset:
            writer.writerow([
                helpline.name_en,
                helpline.number,
                helpline.helpline_type,
                helpline.is_national,
                helpline.state or '',
                helpline.is_24x7,
                helpline.is_toll_free
            ])
        
        return response


@admin.register(UserLocationCache)
class UserLocationCacheAdmin(admin.ModelAdmin):
    """Admin for user location cache."""
    
    list_display = [
        'user_link',
        'coordinates_display',
        'district',
        'state',
        'nearby_summary',
        'freshness_display',
    ]
    list_filter = [
        'state',
        'district',
    ]
    search_fields = [
        'user__phone',  # ✅ FIXED: was phone_number
        'user__first_name',
        'user__last_name',
        'address',
        'district',
        'pincode',
    ]
    ordering = ['-location_updated_at']
    readonly_fields = [
        'id', 'user', 'nearby_hospitals', 'nearby_ambulances',
        'location_updated_at', 'nearby_updated_at', 'map_link_display'
    ]
    list_select_related = ['user']  # ✅ Performance
    list_per_page = 30
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Location', {
            'fields': (
                'latitude', 'longitude', 'accuracy',
                'address', 'district', 'state', 'pincode',
                'map_link_display'
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
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Coordinates')
    def coordinates_display(self, obj):
        if obj.latitude and obj.longitude:
            return google_maps_link(obj.latitude, obj.longitude, f"{obj.latitude:.4f}, {obj.longitude:.4f}")
        return '-'
    
    @admin.display(description='Nearby')
    def nearby_summary(self, obj):
        hospitals = len(obj.nearby_hospitals) if obj.nearby_hospitals else 0
        ambulances = len(obj.nearby_ambulances) if obj.nearby_ambulances else 0
        return format_html('🏥 {} | 🚑 {}', hospitals, ambulances)
    
    @admin.display(description='Updated')
    def freshness_display(self, obj):
        if obj.location_updated_at:
            age = timezone.now() - obj.location_updated_at
            if age.days > 0:
                color = '#e74c3c'  # Stale
                text = f'{age.days}d ago'
            elif age.seconds > 3600:
                color = '#f39c12'  # Old
                text = f'{age.seconds // 3600}h ago'
            else:
                color = '#27ae60'  # Fresh
                text = f'{age.seconds // 60}m ago'
            return format_html('<span style="color: {};">{}</span>', color, text)
        return '-'
    
    def map_link_display(self, obj):
        return google_maps_link(obj.latitude, obj.longitude)
    map_link_display.short_description = 'View on Map'