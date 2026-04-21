"""
Custom permissions for role-based access control.
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


def _extract_requested_patient_id(request):
    """Extract target patient id from header/query/body for helper actions."""
    header_value = request.headers.get('X-Patient-ID') if hasattr(request, 'headers') else None
    if header_value:
        return header_value

    query_value = request.query_params.get('patient_id')
    if query_value:
        return query_value

    try:
        body_value = request.data.get('patient_id')
    except Exception:
        body_value = None

    return body_value


def get_helper_link(request, required_permission=None):
    """Resolve active FamilyHelper link for the authenticated helper user."""
    if not getattr(request, 'user', None) or not request.user.is_authenticated:
        return None

    from apps.users.models import FamilyHelper

    queryset = FamilyHelper.objects.select_related('patient').filter(
        helper_user=request.user,
        is_active=True,
    )

    requested_patient_id = _extract_requested_patient_id(request)
    if requested_patient_id:
        queryset = queryset.filter(patient_id=requested_patient_id)
    else:
        # If helper is linked to exactly one patient, allow implicit selection.
        link_count = queryset.count()
        if link_count != 1:
            return None

    helper_link = queryset.first()
    if not helper_link:
        return None

    if required_permission and not getattr(helper_link, required_permission, False):
        return None

    return helper_link


def get_acting_patient(request, required_permission=None):
    """Return patient user that request should operate on, or None if unauthorized."""
    if not getattr(request, 'user', None) or not request.user.is_authenticated:
        return None

    requested_patient_id = _extract_requested_patient_id(request)

    # Default patient behavior: operate on own account unless explicitly acting as helper.
    if request.user.role == 'patient' and (
        not requested_patient_id or str(requested_patient_id) == str(request.user.id)
    ):
        return request.user

    helper_link = get_helper_link(request, required_permission=required_permission)
    if helper_link:
        return helper_link.patient

    return None


def require_acting_patient(request, required_permission=None, message=None):
    """Return acting patient or raise PermissionDenied with a clear message."""
    acting_patient = get_acting_patient(request, required_permission=required_permission)
    if acting_patient:
        return acting_patient

    if message:
        raise PermissionDenied(message)

    if request.user.is_authenticated and request.user.role != 'patient':
        raise PermissionDenied(
            "Helper access denied. Provide patient_id and ensure helper permissions are enabled."
        )

    raise PermissionDenied("Only patients or authorized helpers can perform this action.")


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

        required_permission = getattr(view, 'required_helper_permission', None)
        return get_acting_patient(request, required_permission=required_permission) is not None
    
    def has_object_permission(self, request, view, obj):
        required_permission = getattr(view, 'required_helper_permission', None)
        acting_patient = get_acting_patient(request, required_permission=required_permission)
        if not acting_patient:
            return False

        if hasattr(obj, 'user'):
            return obj.user == acting_patient
        if hasattr(obj, 'patient'):
            return obj.patient == acting_patient
        if hasattr(obj, 'appointment') and hasattr(obj.appointment, 'patient'):
            return obj.appointment.patient == acting_patient
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