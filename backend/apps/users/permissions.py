"""
Custom permissions for role-based access control.
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission check for Admin role.
    """
    message = "Only admins can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsDoctor(permissions.BasePermission):
    """
    Permission check for Doctor role.
    """
    message = "Only doctors can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'doctor'
        )


class IsVerifiedDoctor(permissions.BasePermission):
    """
    Permission check for verified Doctor.
    """
    message = "Only verified doctors can perform this action."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'doctor':
            return False
        try:
            return request.user.doctor_profile.is_verified
        except:
            return False


class IsPatient(permissions.BasePermission):
    """
    Permission check for Patient role.
    """
    message = "Only patients can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'patient'
        )


class IsDoctorOrAdmin(permissions.BasePermission):
    """
    Permission check for Doctor or Admin role.
    """
    message = "Only doctors or admins can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in ['doctor', 'admin']
        )


class IsPatientOrHelper(permissions.BasePermission):
    """
    Permission check for Patient or their Family Helper.
    """
    message = "Only patients or their family helpers can perform this action."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check if user is a patient
        if request.user.role == 'patient':
            return True
        
        # Check if user is a helper for any patient
        # This would need the patient_id from request
        return False
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'patient':
            # Check if object belongs to this patient
            if hasattr(obj, 'user'):
                return obj.user == request.user
            if hasattr(obj, 'patient'):
                return obj.patient == request.user
        return False


class IsOwner(permissions.BasePermission):
    """
    Permission check for object owner.
    """
    message = "You do not have permission to access this resource."
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission check for object owner or Admin.
    """
    message = "Only owners or admins can access this resource."
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user


class IsReadOnly(permissions.BasePermission):
    """
    Allow read-only operations for any request.
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS