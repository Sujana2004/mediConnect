# backend/utils/viewset_helpers.py

def get_safe_queryset(view, model_class, queryset=None):
    """
    Safely get queryset handling swagger generation and anonymous users.
    
    Usage in ViewSet:
        def get_queryset(self):
            return get_safe_queryset(self, MyModel, self.queryset)
    """
    # Handle swagger schema generation
    if getattr(view, 'swagger_fake_view', False):
        if queryset is not None:
            return queryset.none()
        return model_class.objects.none()
    
    user = view.request.user
    
    # Check authentication
    if not user.is_authenticated:
        if queryset is not None:
            return queryset.none()
        return model_class.objects.none()
    
    # Check role attribute exists
    if not hasattr(user, 'role'):
        if queryset is not None:
            return queryset.none()
        return model_class.objects.none()
    
    return None  # Signal to continue with normal logic


def is_safe_request(view):
    """
    Check if request is safe to process (not swagger, authenticated, has role).
    Returns True if safe, False otherwise.
    """
    if getattr(view, 'swagger_fake_view', False):
        return False
    
    user = view.request.user
    
    if not user.is_authenticated:
        return False
    
    if not hasattr(user, 'role'):
        return False
    
    return True