# test_api.py
"""
API Test Script for MediConnect.
Tests registration, login, and profile endpoints.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1/auth"


def print_response(name, response):
    """Print formatted response."""
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
    except:
        print(f"Response: {response.text}")
    print()


def test_health_check():
    """Test health check endpoint."""
    response = requests.get(f"{BASE_URL}/health/")
    print_response("Health Check", response)
    return response.status_code == 200


def test_firebase_status():
    """Test Firebase status."""
    response = requests.get(f"{BASE_URL}/test/firebase/")
    print_response("Firebase Status", response)
    return response.status_code == 200


def test_patient_registration():
    """Test patient registration."""
    data = {
        "firebase_token": "test_patient_token",
        "first_name": "Ramesh",
        "last_name": "Kumar",
        "preferred_language": "te",
        "village": "Vijayawada",
        "district": "Krishna",
        "blood_group": "O+",
        "is_literate": False,
        "needs_voice_assistance": True
    }
    
    response = requests.post(
        f"{BASE_URL}/register/patient/",
        json=data
    )
    print_response("Patient Registration", response)
    
    if response.status_code == 201:
        return response.json()['data']['tokens']
    return None


def test_doctor_registration():
    """Test doctor registration."""
    data = {
        "firebase_token": "test_doctor_token",
        "first_name": "Suresh",
        "last_name": "Reddy",
        "preferred_language": "te",
        "registration_number": "APMC12345",
        "registration_council": "Andhra Pradesh Medical Council",
        "specialization": "general",
        "qualification": "MBBS, MD",
        "experience_years": 10,
        "hospital_name": "Government General Hospital",
        "consultation_fee": 200,
        "languages_spoken": ["telugu", "hindi", "english"],
        "bio": "Experienced general physician with 10 years of practice."
    }
    
    response = requests.post(
        f"{BASE_URL}/register/doctor/",
        json=data
    )
    print_response("Doctor Registration", response)
    
    if response.status_code == 201:
        return response.json()['data']['tokens']
    return None


def test_login(token_name="test_patient_token"):
    """Test login."""
    data = {
        "firebase_token": token_name
    }
    
    response = requests.post(
        f"{BASE_URL}/login/",
        json=data
    )
    print_response(f"Login ({token_name})", response)
    
    if response.status_code == 200:
        return response.json()['data']['tokens']
    return None


def test_profile(access_token):
    """Test profile endpoint."""
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/profile/",
        headers=headers
    )
    print_response("Get Profile", response)
    return response.status_code == 200


def test_update_profile(access_token):
    """Test profile update."""
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    data = {
        "height_cm": 170,
        "weight_kg": 70,
        "emergency_contact_name": "Wife",
        "emergency_contact_phone": "9876543210"
    }
    
    response = requests.patch(
        f"{BASE_URL}/profile/",
        headers=headers,
        json=data
    )
    print_response("Update Profile", response)
    return response.status_code == 200


def test_doctor_list():
    """Test doctor list (public)."""
    response = requests.get(f"{BASE_URL}/doctors/")
    print_response("Doctor List", response)
    return response.status_code == 200


def test_specializations():
    """Test specializations list."""
    response = requests.get(f"{BASE_URL}/doctors/specializations/")
    print_response("Specializations", response)
    return response.status_code == 200


def test_add_family_helper(access_token):
    """Test adding family helper."""
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    data = {
        "helper_name": "Lakshmi",
        "helper_phone": "9876543211",
        "relationship": "daughter",
        "is_primary": True
    }
    
    response = requests.post(
        f"{BASE_URL}/helpers/",
        headers=headers,
        json=data
    )
    print_response("Add Family Helper", response)
    return response.status_code == 201


def test_list_helpers(access_token):
    """Test listing family helpers."""
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/helpers/",
        headers=headers
    )
    print_response("List Family Helpers", response)
    return response.status_code == 200


def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("MEDICONNECT API TEST SUITE")
    print("="*60)
    
    results = []
    
    # Basic tests
    results.append(("Health Check", test_health_check()))
    results.append(("Firebase Status", test_firebase_status()))
    results.append(("Specializations", test_specializations()))
    
    # Registration tests
    patient_tokens = test_patient_registration()
    results.append(("Patient Registration", patient_tokens is not None))
    
    doctor_tokens = test_doctor_registration()
    results.append(("Doctor Registration", doctor_tokens is not None))
    
    # Login test
    login_tokens = test_login("test_patient_token")
    results.append(("Patient Login", login_tokens is not None))
    
    if login_tokens:
        access_token = login_tokens['access']
        
        # Profile tests
        results.append(("Get Profile", test_profile(access_token)))
        results.append(("Update Profile", test_update_profile(access_token)))
        
        # Helper tests
        results.append(("Add Family Helper", test_add_family_helper(access_token)))
        results.append(("List Helpers", test_list_helpers(access_token)))
    
    # Doctor list
    results.append(("Doctor List", test_doctor_list()))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed out of {len(results)} tests")
    print("="*60)


if __name__ == "__main__":
    run_all_tests()