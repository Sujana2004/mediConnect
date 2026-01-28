"""
Admin configuration for users app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import (
    User, PatientProfile, DoctorProfile, AdminProfile,
    FamilyHelper, DoctorAvailability, DoctorLeave,
    OTP, UserActivity
)


# ============================================
# INLINE ADMINS
# ============================================

class PatientProfileInline(admin.StackedInline):
    model = PatientProfile
    can_delete = False
    verbose_name_plural = 'Patient Profile'
    fk_name = 'user'


class DoctorProfileInline(admin.StackedInline):
    model = DoctorProfile
    can_delete = False
    verbose_name_plural = 'Doctor Profile'
    fk_name = 'user'


class AdminProfileInline(admin.StackedInline):
    model = AdminProfile
    can_delete = False
    verbose_name_plural = 'Admin Profile'
    fk_name = 'user'


class FamilyHelperInline(admin.TabularInline):
    model = FamilyHelper
    fk_name = 'patient'
    extra = 0


class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 0


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for User model.
    """
    list_display = (
        'phone', 'first_name', 'last_name', 'role',
        'is_phone_verified', 'is_active', 'created_at'
    )
    list_filter = ('role', 'is_phone_verified', 'is_active', 'gender', 'preferred_language')
    search_fields = ('phone', 'first_name', 'last_name', 'email')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        (_('Personal Info'), {
            'fields': (
                'first_name', 'last_name', 'email', 'date_of_birth',
                'gender', 'profile_photo'
            )
        }),
        (_('Role & Language'), {
            'fields': ('role', 'preferred_language')
        }),
        (_('Location'), {
            'fields': (
                'address', 'village', 'mandal', 'district',
                'state', 'pincode', 'latitude', 'longitude'
            ),
            'classes': ('collapse',)
        }),
        (_('Verification'), {
            'fields': (
                'is_phone_verified', 'is_email_verified',
                'is_profile_complete', 'fcm_token'
            )
        }),
        (_('Permissions'), {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            ),
            'classes': ('collapse',)
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
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_active')
    
    def get_inlines(self, request, obj=None):
        """
        Return appropriate inline based on user role.
        """
        if obj:
            if obj.role == User.Role.PATIENT:
                return [PatientProfileInline, FamilyHelperInline]
            elif obj.role == User.Role.DOCTOR:
                return [DoctorProfileInline]
            elif obj.role == User.Role.ADMIN:
                return [AdminProfileInline]
        return []


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'blood_group', 'age', 'is_literate',
        'total_appointments', 'total_consultations'
    )
    list_filter = ('blood_group', 'is_literate', 'needs_voice_assistance')
    search_fields = ('user__phone', 'user__first_name')
    readonly_fields = ('total_appointments', 'total_consultations', 'created_at', 'updated_at')
    # inlines = [FamilyHelperInline]


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'specialization', 'registration_number',
        'verification_status', 'average_rating', 'total_consultations'
    )
    list_filter = ('specialization', 'verification_status', 'is_available_online')
    search_fields = ('user__phone', 'user__first_name', 'registration_number')
    readonly_fields = (
        'average_rating', 'total_reviews', 'total_consultations',
        'created_at', 'updated_at'
    )
    inlines = [DoctorAvailabilityInline]
    
    actions = ['verify_doctors', 'reject_doctors']
    
    @admin.action(description='Verify selected doctors')
    def verify_doctors(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            verification_status='verified',
            verified_at=timezone.now(),
            verified_by=request.user
        )
    
    @admin.action(description='Reject selected doctors')
    def reject_doctors(self, request, queryset):
        queryset.update(verification_status='rejected')


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'admin_level', 'department',
        'can_verify_doctors', 'can_manage_admins'
    )
    list_filter = ('admin_level',)
    search_fields = ('user__phone', 'user__first_name')


@admin.register(FamilyHelper)
class FamilyHelperAdmin(admin.ModelAdmin):
    list_display = (
        'helper_name', 'patient', 'relationship',
        'helper_phone', 'is_primary', 'is_verified'
    )
    list_filter = ('relationship', 'is_primary', 'is_verified')
    search_fields = ('helper_name', 'helper_phone', 'patient__phone')


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        'doctor', 'day_of_week', 'start_time',
        'end_time', 'is_available', 'max_appointments'
    )
    list_filter = ('day_of_week', 'is_available')
    search_fields = ('doctor__user__phone', 'doctor__user__first_name')


@admin.register(DoctorLeave)
class DoctorLeaveAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'date', 'is_full_day', 'reason')
    list_filter = ('is_full_day', 'date')
    search_fields = ('doctor__user__phone', 'doctor__user__first_name')
    date_hierarchy = 'date'


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('phone', 'purpose', 'is_verified', 'attempts', 'created_at', 'expires_at')
    list_filter = ('purpose', 'is_verified')
    search_fields = ('phone',)
    readonly_fields = ('created_at',)


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'activity_type', 'ip_address', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('user__phone', 'description')
    readonly_fields = ('user', 'activity_type', 'description', 'ip_address', 'user_agent', 'created_at')
    date_hierarchy = 'created_at'