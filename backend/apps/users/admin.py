"""
Admin configuration for users app.
Enhanced with visual indicators, performance optimization, and better UX.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Q
from django.urls import reverse
from django.http import HttpResponse
import csv

from .models import (
    User, PatientProfile, DoctorProfile, AdminProfile,
    FamilyHelper, DoctorAvailability, DoctorLeave,
    OTP, UserActivity
)


# ============================================
# HELPER FUNCTIONS FOR BADGES
# ============================================

def status_badge(value, true_text="Yes", false_text="No", true_color="green", false_color="red"):
    """Generate HTML badge for boolean status."""
    if value:
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            true_color, true_text
        )
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
        false_color, false_text
    )


def role_badge(role):
    """Generate colored badge for user role."""
    colors = {
        'patient': '#3498db',    # Blue
        'doctor': '#27ae60',     # Green
        'admin': '#9b59b6',      # Purple
    }
    color = colors.get(role, '#7f8c8d')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{}</span>',
        color, role
    )


def verification_badge(status):
    """Generate badge for doctor verification status."""
    colors = {
        'pending': '#f39c12',    # Orange
        'verified': '#27ae60',   # Green
        'rejected': '#e74c3c',   # Red
    }
    color = colors.get(status, '#7f8c8d')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{}</span>',
        color, status
    )


# ============================================
# INLINE ADMINS
# ============================================

class PatientProfileInline(admin.StackedInline):
    model = PatientProfile
    can_delete = False
    verbose_name_plural = 'Patient Profile'
    fk_name = 'user'
    
    fieldsets = (
        ('Medical Info', {
            'fields': ('blood_group', 'height_cm', 'weight_kg', 'allergies', 'chronic_conditions')
        }),
        ('Accessibility', {
            'fields': ('is_literate', 'needs_voice_assistance', 'needs_large_text')
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'),
            'classes': ('collapse',)
        }),
    )


class DoctorProfileInline(admin.StackedInline):
    model = DoctorProfile
    can_delete = False
    verbose_name_plural = 'Doctor Profile'
    fk_name = 'user'
    readonly_fields = ('average_rating', 'total_reviews', 'total_consultations', 'verified_at', 'verified_by')
    
    fieldsets = (
        ('Professional Info', {
            'fields': ('specialization', 'registration_number', 'registration_council', 'qualification')
        }),
        ('Experience & Fees', {
            'fields': ('experience_years', 'consultation_fee', 'consultation_duration')
        }),
        ('Verification', {
            'fields': ('verification_status', 'verified_at', 'verified_by', 'rejection_reason'),
            'classes': ('collapse',)
        }),
        ('Online Consultation', {
            'fields': ('is_available_online',)
        }),
        ('Statistics (Read Only)', {
            'fields': ('average_rating', 'total_reviews', 'total_consultations'),
            'classes': ('collapse',)
        }),
    )


class AdminProfileInline(admin.StackedInline):
    model = AdminProfile
    can_delete = False
    verbose_name_plural = 'Admin Profile'
    fk_name = 'user'
    
    fieldsets = (
        ('Role Info', {
            'fields': ('department', 'designation')
        }),
        ('Permissions', {
            'fields': (
                'can_manage_doctors', 'can_manage_patients',
                'can_verify_doctors', 'can_view_reports', 'can_manage_content'
            )
        }),
    )


class FamilyHelperInline(admin.TabularInline):
    model = FamilyHelper
    fk_name = 'patient'
    extra = 0
    fields = ('helper_name', 'helper_phone', 'relationship', 'is_primary', 'is_verified')
    readonly_fields = ('is_verified',)


class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 0
    fields = ('day_of_week', 'start_time', 'end_time', 'is_available', 'max_appointments')


# ============================================
# CUSTOM FILTERS
# ============================================

class UserTypeFilter(admin.SimpleListFilter):
    """Filter to distinguish PWA users from Admin staff."""
    title = _('User Type')
    parameter_name = 'user_type'
    
    def lookups(self, request, model_admin):
        return (
            ('pwa_patient', _('📱 PWA Patient')),
            ('pwa_doctor', _('📱 PWA Doctor')),
            ('admin_staff', _('🔧 Admin Staff')),
            ('superuser', _('👑 Superuser')),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'pwa_patient':
            return queryset.filter(role='patient', is_staff=False)
        if self.value() == 'pwa_doctor':
            return queryset.filter(role='doctor', is_staff=False)
        if self.value() == 'admin_staff':
            return queryset.filter(is_staff=True, is_superuser=False)
        if self.value() == 'superuser':
            return queryset.filter(is_superuser=True)


class DoctorVerificationFilter(admin.SimpleListFilter):
    """Filter for doctor verification status."""
    title = _('Verification Status')
    parameter_name = 'verification'
    
    def lookups(self, request, model_admin):
        return (
            ('pending', _('⏳ Pending Review')),
            ('verified', _('✅ Verified')),
            ('rejected', _('❌ Rejected')),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'pending':
            return queryset.filter(verification_status='pending')
        if self.value() == 'verified':
            return queryset.filter(verification_status='verified')
        if self.value() == 'rejected':
            return queryset.filter(verification_status='rejected')


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Enhanced admin configuration for User model.
    Clearly distinguishes PWA users from Admin staff.
    """
    list_display = (
        'phone', 'full_name_display', 'role_badge_display', 'user_type_display',
        'verified_badge', 'active_badge', 'language_display', 'created_at'
    )
    list_filter = (UserTypeFilter, 'role', 'is_phone_verified', 'is_active', 'preferred_language', 'gender')
    search_fields = ('phone', 'first_name', 'last_name', 'email')
    ordering = ('-created_at',)
    list_per_page = 25
    list_select_related = True  # Performance optimization
    
    fieldsets = (
        (None, {
            'fields': ('phone', 'password'),
            'description': '⚠️ PWA users authenticate via Firebase OTP, not this password.'
        }),
        (_('Personal Info'), {
            'fields': (
                'first_name', 'last_name', 'email', 'date_of_birth',
                'gender', 'profile_photo'
            )
        }),
        (_('Role & Language'), {
            'fields': ('role', 'preferred_language'),
            'description': 'Role determines user permissions in the PWA.'
        }),
        (_('Location'), {
            'fields': (
                'address', 'village', 'mandal', 'district',
                'state', 'pincode', 'latitude', 'longitude'
            ),
            'classes': ('collapse',)
        }),
        (_('Verification Status'), {
            'fields': (
                'is_phone_verified', 'is_email_verified',
                'is_profile_complete', 'fcm_token'
            ),
            'description': '📱 Phone verification is for Patients/Doctors only (Firebase OTP). Admins use username/password.'
        }),
        (_('⚠️ Admin Permissions'), {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            ),
            'classes': ('collapse',),
            'description': '🔴 WARNING: is_staff=True allows access to this admin panel!'
        }),
        (_('Timestamps'), {
            'fields': ('last_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'role', 'password1', 'password2'),
            'description': 'For PWA users, use the API registration. This form is for admin/staff accounts only.'
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_active')
    actions = ['activate_users', 'deactivate_users', 'export_to_csv']
    
    # ========== Display Methods ==========
    
    @admin.display(description='Name')
    def full_name_display(self, obj):
        name = obj.get_full_name() or 'No Name'
        return name
    
    @admin.display(description='Role')
    def role_badge_display(self, obj):
        return role_badge(obj.role)
    
    @admin.display(description='Type')
    def user_type_display(self, obj):
        if obj.is_superuser:
            return format_html(
                '<span style="background-color: #9b59b6; color: white; padding: 3px 8px; '
                'border-radius: 12px; font-size: 10px;">👑 SUPERUSER</span>'
            )
        if obj.is_staff:
            return format_html(
                '<span style="background-color: #e74c3c; color: white; padding: 3px 8px; '
                'border-radius: 12px; font-size: 10px;">🔧 ADMIN STAFF</span>'
            )
        return format_html(
            '<span style="background-color: #3498db; color: white; padding: 3px 8px; '
            'border-radius: 12px; font-size: 10px;">📱 PWA USER</span>'
        )
    
    @admin.display(description='Verified')
    def verified_badge(self, obj):
        return status_badge(obj.is_phone_verified, '✓ Verified', '✗ Unverified')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        return status_badge(obj.is_active, 'Active', 'Inactive')
    
    @admin.display(description='Lang')
    def language_display(self, obj):
        lang_map = {'en': '🇺🇸 EN', 'hi': '🇮🇳 HI', 'te': '🇮🇳 TE'}
        return lang_map.get(obj.preferred_language, obj.preferred_language)
    
    # ========== Inlines ==========
    
    def get_inlines(self, request, obj=None):
        if obj:
            if obj.role == User.Role.PATIENT:
                return [PatientProfileInline, FamilyHelperInline]
            elif obj.role == User.Role.DOCTOR:
                return [DoctorProfileInline, DoctorAvailabilityInline]
            elif obj.role == User.Role.ADMIN:
                return [AdminProfileInline]
        return []
    
    # ========== Bulk Actions ==========
    
    @admin.action(description='✅ Activate selected users')
    def activate_users(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} users activated successfully.')
    
    @admin.action(description='❌ Deactivate selected users')
    def deactivate_users(self, request, queryset):
        # Prevent deactivating yourself
        queryset = queryset.exclude(pk=request.user.pk)
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} users deactivated successfully.')
    
    @admin.action(description='📥 Export selected to CSV')
    def export_to_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Phone', 'Name', 'Role', 'Verified', 'Active', 'Language', 'Created'])
        
        for user in queryset:
            writer.writerow([
                user.phone,
                user.get_full_name(),
                user.role,
                user.is_phone_verified,
                user.is_active,
                user.preferred_language,
                user.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = (
        'patient_link', 'phone_display', 'blood_group', 'literacy_badge',
        'total_appointments', 'total_consultations', 'created_at'
    )
    list_filter = ('blood_group', 'is_literate', 'needs_voice_assistance')
    search_fields = ('user__phone', 'user__first_name', 'user__last_name')
    readonly_fields = ('total_appointments', 'total_consultations', 'created_at', 'updated_at')
    list_select_related = ('user',)  # Performance
    list_per_page = 25
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.phone)
    
    @admin.display(description='Phone')
    def phone_display(self, obj):
        return obj.user.phone
    
    @admin.display(description='Literate')
    def literacy_badge(self, obj):
        return status_badge(obj.is_literate, 'Literate', 'Needs Help', '#27ae60', '#e67e22')


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = (
        'doctor_link', 'phone_display', 'specialization',
        'verification_badge_display', 'rating_display', 'total_consultations',
        'online_badge', 'created_at'
    )
    list_filter = (DoctorVerificationFilter, 'specialization', 'is_available_online')
    search_fields = ('user__phone', 'user__first_name', 'user__last_name', 'registration_number')
    readonly_fields = (
        'average_rating', 'total_reviews', 'total_consultations',
        'verified_at', 'verified_by', 'created_at', 'updated_at'
    )
    list_select_related = ('user', 'verified_by')  # Performance
    list_per_page = 25
    inlines = [DoctorAvailabilityInline]
    actions = ['verify_doctors', 'reject_doctors', 'export_doctors_csv']
    
    fieldsets = (
        ('Doctor Info', {
            'fields': ('user', 'specialization', 'qualification', 'experience_years')
        }),
        ('Registration', {
            'fields': ('registration_number', 'registration_council', 'verification_document')
        }),
        ('Verification', {
            'fields': ('verification_status', 'verified_at', 'verified_by', 'rejection_reason'),
            'description': 'Review documents and verify the doctor.'
        }),
        ('Consultation Settings', {
            'fields': ('consultation_fee', 'consultation_duration', 'is_available_online')
        }),
        ('Statistics', {
            'fields': ('average_rating', 'total_reviews', 'total_consultations'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.phone)
    
    @admin.display(description='Phone')
    def phone_display(self, obj):
        return obj.user.phone
    
    @admin.display(description='Status')
    def verification_badge_display(self, obj):
        return verification_badge(obj.verification_status)
    
    @admin.display(description='Rating')
    def rating_display(self, obj):
        if obj.average_rating:
            stars = '⭐' * int(obj.average_rating)
            return format_html('{} ({:.1f})', stars, obj.average_rating)
        return '-'
    
    @admin.display(description='Online')
    def online_badge(self, obj):
        return status_badge(obj.is_available_online, '🟢 Yes', '⚫ No', '#27ae60', '#95a5a6')
    
    @admin.action(description='✅ Verify selected doctors')
    def verify_doctors(self, request, queryset):
        count = queryset.filter(verification_status='pending').update(
            verification_status='verified',
            verified_at=timezone.now(),
            verified_by=request.user
        )
        self.message_user(request, f'{count} doctors verified successfully.')
    
    @admin.action(description='❌ Reject selected doctors')
    def reject_doctors(self, request, queryset):
        count = queryset.filter(verification_status='pending').update(
            verification_status='rejected'
        )
        self.message_user(request, f'{count} doctors rejected.')
    
    @admin.action(description='📥 Export to CSV')
    def export_doctors_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="doctors_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Phone', 'Specialization', 'Registration No', 'Status', 'Rating', 'Consultations'])
        
        for doc in queryset.select_related('user'):
            writer.writerow([
                doc.user.get_full_name(),
                doc.user.phone,
                doc.specialization,
                doc.registration_number,
                doc.verification_status,
                doc.average_rating or 'N/A',
                doc.total_consultations
            ])
        
        return response


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = (
        'admin_link', 'department', 'designation',
        'verify_doctors_badge', 'manage_content_badge', 'created_at'
    )
    list_filter = ('can_verify_doctors', 'can_manage_content', 'can_manage_doctors')
    search_fields = ('user__phone', 'user__first_name', 'department', 'designation')
    list_select_related = ('user',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Admin User', {
            'fields': ('user',),
            'description': 'Admins use username/password login. No phone verification required.'
        }),
        ('Role Info', {
            'fields': ('department', 'designation')
        }),
        ('Permissions', {
            'fields': (
                'can_manage_doctors', 'can_manage_patients',
                'can_verify_doctors', 'can_view_reports', 'can_manage_content'
            )
        }),
    )
    
    @admin.display(description='Admin')
    def admin_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        name = obj.user.get_full_name() or obj.user.phone
        return format_html('<a href="{}">{}</a>', url, name)
    
    @admin.display(description='Can Verify Doctors')
    def verify_doctors_badge(self, obj):
        return status_badge(obj.can_verify_doctors)
    
    @admin.display(description='Can Manage Content')
    def manage_content_badge(self, obj):
        return status_badge(obj.can_manage_content)


@admin.register(FamilyHelper)
class FamilyHelperAdmin(admin.ModelAdmin):
    list_display = (
        'helper_name', 'patient_link', 'relationship',
        'helper_phone', 'primary_badge', 'verified_badge'
    )
    list_filter = ('relationship', 'is_primary', 'is_verified')
    search_fields = ('helper_name', 'helper_phone', 'patient__phone')
    list_select_related = ('patient', 'helper_user')
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.patient.pk])
        return format_html('<a href="{}">{}</a>', url, obj.patient.phone)
    
    @admin.display(description='Primary')
    def primary_badge(self, obj):
        return status_badge(obj.is_primary, '★ Primary', 'Secondary', '#f39c12', '#bdc3c7')
    
    @admin.display(description='Verified')
    def verified_badge(self, obj):
        return status_badge(obj.is_verified, '✓ Verified', 'Pending', '#27ae60', '#e67e22')


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        'doctor_link', 'day_display', 'time_display',
        'available_badge', 'max_appointments'
    )
    list_filter = ('day_of_week', 'is_available')
    search_fields = ('doctor__user__phone', 'doctor__user__first_name')
    list_select_related = ('doctor', 'doctor__user')
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        return obj.doctor.user.get_full_name() or obj.doctor.user.phone
    
    @admin.display(description='Day')
    def day_display(self, obj):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return days[obj.day_of_week] if obj.day_of_week < 7 else str(obj.day_of_week)
    
    @admin.display(description='Time')
    def time_display(self, obj):
        return f'{obj.start_time.strftime("%H:%M")} - {obj.end_time.strftime("%H:%M")}'
    
    @admin.display(description='Available')
    def available_badge(self, obj):
        return status_badge(obj.is_available, '🟢 Available', '🔴 Unavailable')


@admin.register(DoctorLeave)
class DoctorLeaveAdmin(admin.ModelAdmin):
    list_display = ('doctor_link', 'date', 'full_day_badge', 'time_display', 'reason')
    list_filter = ('is_full_day', 'date')
    search_fields = ('doctor__user__phone', 'doctor__user__first_name')
    date_hierarchy = 'date'
    list_select_related = ('doctor', 'doctor__user')
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        return obj.doctor.user.get_full_name() or obj.doctor.user.phone
    
    @admin.display(description='Full Day')
    def full_day_badge(self, obj):
        return status_badge(obj.is_full_day, 'Full Day', 'Partial')
    
    @admin.display(description='Time')
    def time_display(self, obj):
        if obj.is_full_day:
            return 'All Day'
        return f'{obj.start_time} - {obj.end_time}' if hasattr(obj, 'start_time') else '-'


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    """
    OTP Admin - Note: OTP codes are hidden for security.
    """
    list_display = ('phone', 'purpose_badge', 'verified_badge', 'attempts_display', 'expiry_status', 'created_at')
    list_filter = ('purpose', 'is_verified')
    search_fields = ('phone',)
    readonly_fields = ('phone', 'purpose', 'is_verified', 'attempts', 'created_at', 'expires_at')
    
    # SECURITY: Don't show OTP code in admin
    exclude = ('otp',)
    
    @admin.display(description='Purpose')
    def purpose_badge(self, obj):
        colors = {
            'registration': '#3498db',
            'login': '#27ae60',
            'reset_password': '#e74c3c',
        }
        color = colors.get(obj.purpose, '#7f8c8d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 11px;">{}</span>',
            color, obj.purpose.replace('_', ' ').title()
        )
    
    @admin.display(description='Verified')
    def verified_badge(self, obj):
        return status_badge(obj.is_verified, '✓ Used', '○ Pending')
    
    @admin.display(description='Attempts')
    def attempts_display(self, obj):
        color = '#27ae60' if obj.attempts < 3 else '#e74c3c'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}/3</span>',
            color, obj.attempts
        )
    
    @admin.display(description='Status')
    def expiry_status(self, obj):
        if obj.is_verified:
            return format_html('<span style="color: #27ae60;">✓ Used</span>')
        if obj.expires_at < timezone.now():
            return format_html('<span style="color: #e74c3c;">✗ Expired</span>')
        return format_html('<span style="color: #f39c12;">⏳ Active</span>')
    
    def has_add_permission(self, request):
        # OTPs should only be created via API
        return False


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'activity_badge', 'description_short', 'ip_address', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('user__phone', 'description', 'ip_address')
    readonly_fields = ('user', 'activity_type', 'description', 'ip_address', 'user_agent', 'created_at')
    date_hierarchy = 'created_at'
    list_select_related = ('user',)
    list_per_page = 50
    
    @admin.display(description='User')
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.phone)
        return '-'
    
    @admin.display(description='Activity')
    def activity_badge(self, obj):
        colors = {
            'login': '#27ae60',
            'logout': '#95a5a6',
            'registration': '#3498db',
            'password_change': '#e67e22',
            'profile_update': '#9b59b6',
            'failed_login': '#e74c3c',
        }
        color = colors.get(obj.activity_type, '#7f8c8d')
        icon_map = {
            'login': '🔓',
            'logout': '🔒',
            'registration': '📝',
            'failed_login': '⚠️',
        }
        icon = icon_map.get(obj.activity_type, '•')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 11px;">{} {}</span>',
            color, icon, obj.activity_type.replace('_', ' ').title()
        )
    
    @admin.display(description='Description')
    def description_short(self, obj):
        if obj.description:
            return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
        return '-'
    
    def has_add_permission(self, request):
        # Activities should only be logged programmatically
        return False
    
    def has_change_permission(self, request, obj=None):
        # Activities are read-only audit logs
        return False