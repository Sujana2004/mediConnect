import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediconnect.settings')
sys.path.append(r'c:\Users\korup\OneDrive\Desktop\mediConnect\backend')
django.setup()

from django.contrib.auth import get_user_model
from apps.health_records.serializers import SharedRecordCreateSerializer

User = get_user_model()
patient = User.objects.filter(role='patient').first()
doctor = User.objects.filter(role='doctor').first()

print(f"Patient: {patient}")
print(f"Doctor: {doctor}")

if patient and doctor:
    # mock request
    class MockRequest:
        def __init__(self, user):
            self.user = user

    data = {
        'doctor_id': str(doctor.id),
        'share_type': 'all',
        'is_permanent': True
    }
    
    serializer = SharedRecordCreateSerializer(data=data, context={'request': MockRequest(patient)})
    is_valid = serializer.is_valid()
    print(f"Is valid: {is_valid}")
    if not is_valid:
        print(serializer.errors)
    else:
        try:
            instance = serializer.save()
            print(f"Created: {instance}")
        except Exception as e:
            print(f"Error during save: {e}")
