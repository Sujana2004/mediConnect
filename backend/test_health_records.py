#!/usr/bin/env python
"""
Health Records API Testing Script
==================================
Test all health records endpoints.

Usage:
    python test_health_records.py

Prerequisites:
    - Server running at http://localhost:8000
    - Sample data loaded
    - Test user exists
"""

import requests
import json
from datetime import date, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
HEALTH_RECORDS_URL = f"{BASE_URL}/health-records"

# Test user credentials (update with actual test user)
TEST_PHONE = "+919876543101"
TEST_USER_TOKEN = None  # Will be set after login


def print_header(title):
    """Print formatted header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_result(endpoint, response, show_data=True):
    """Print API result."""
    status = "✅" if response.status_code < 400 else "❌"
    print(f"\n{status} {endpoint}")
    print(f"   Status: {response.status_code}")
    
    try:
        data = response.json()
        if show_data:
            if 'data' in data:
                if isinstance(data['data'], list):
                    print(f"   Count: {len(data['data'])}")
                    if data['data']:
                        print(f"   First item: {json.dumps(data['data'][0], indent=6, default=str)[:500]}...")
                else:
                    print(f"   Data: {json.dumps(data['data'], indent=6, default=str)[:500]}...")
            elif 'message' in data:
                print(f"   Message: {data['message']}")
    except:
        print(f"   Response: {response.text[:200]}")


def get_auth_headers():
    """Get authorization headers."""
    if TEST_USER_TOKEN:
        return {"Authorization": f"Bearer {TEST_USER_TOKEN}"}
    return {}


def test_health_check():
    """Test health check endpoint."""
    print_header("HEALTH CHECK")
    
    response = requests.get(f"{HEALTH_RECORDS_URL}/health/")
    print_result("GET /health-records/health/", response)
    
    return response.status_code == 200


def test_health_profile():
    """Test health profile endpoints."""
    print_header("HEALTH PROFILE")
    
    headers = get_auth_headers()
    
    # Get profile
    response = requests.get(f"{HEALTH_RECORDS_URL}/profile/", headers=headers)
    print_result("GET /health-records/profile/", response)
    
    # Get summary
    response = requests.get(f"{HEALTH_RECORDS_URL}/profile/summary/", headers=headers)
    print_result("GET /health-records/profile/summary/", response)
    
    # Get critical info
    response = requests.get(f"{HEALTH_RECORDS_URL}/profile/critical-info/", headers=headers)
    print_result("GET /health-records/profile/critical-info/", response)
    
    # Update profile
    update_data = {
        "blood_group": "B+",
        "height_cm": 175,
        "weight_kg": 70,
        "smoking_status": "never",
        "alcohol_consumption": "occasional"
    }
    response = requests.post(f"{HEALTH_RECORDS_URL}/profile/", json=update_data, headers=headers)
    print_result("POST /health-records/profile/", response)


def test_medical_conditions():
    """Test medical conditions endpoints."""
    print_header("MEDICAL CONDITIONS")
    
    headers = get_auth_headers()
    
    # List conditions
    response = requests.get(f"{HEALTH_RECORDS_URL}/conditions/", headers=headers)
    print_result("GET /health-records/conditions/", response)
    
    # Get active conditions
    response = requests.get(f"{HEALTH_RECORDS_URL}/conditions/active/", headers=headers)
    print_result("GET /health-records/conditions/active/", response)
    
    # Get chronic conditions
    response = requests.get(f"{HEALTH_RECORDS_URL}/conditions/chronic/", headers=headers)
    print_result("GET /health-records/conditions/chronic/", response)
    
    # Create condition
    condition_data = {
        "condition_name": "Test Condition",
        "condition_name_local": "పరీక్ష పరిస్థితి",
        "status": "active",
        "severity": "mild",
        "is_chronic": False,
        "diagnosed_date": str(date.today()),
        "treatment_notes": "Test treatment notes"
    }
    response = requests.post(f"{HEALTH_RECORDS_URL}/conditions/", json=condition_data, headers=headers)
    print_result("POST /health-records/conditions/", response)
    
    if response.status_code == 201:
        condition_id = response.json().get('data', {}).get('id')
        if condition_id:
            # Resolve condition
            response = requests.post(
                f"{HEALTH_RECORDS_URL}/conditions/{condition_id}/resolve/",
                json={"resolved_date": str(date.today())},
                headers=headers
            )
            print_result(f"POST /health-records/conditions/{condition_id}/resolve/", response)


def test_allergies():
    """Test allergies endpoints."""
    print_header("ALLERGIES")
    
    headers = get_auth_headers()
    
    # List allergies
    response = requests.get(f"{HEALTH_RECORDS_URL}/allergies/", headers=headers)
    print_result("GET /health-records/allergies/", response)
    
    # Get active allergies
    response = requests.get(f"{HEALTH_RECORDS_URL}/allergies/active/", headers=headers)
    print_result("GET /health-records/allergies/active/", response)
    
    # Get critical allergies
    response = requests.get(f"{HEALTH_RECORDS_URL}/allergies/critical/", headers=headers)
    print_result("GET /health-records/allergies/critical/", response)
    
    # Get drug allergies
    response = requests.get(f"{HEALTH_RECORDS_URL}/allergies/drug/", headers=headers)
    print_result("GET /health-records/allergies/drug/", response)


def test_vaccinations():
    """Test vaccination endpoints."""
    print_header("VACCINATIONS")
    
    headers = get_auth_headers()
    
    # List vaccinations
    response = requests.get(f"{HEALTH_RECORDS_URL}/vaccinations/", headers=headers)
    print_result("GET /health-records/vaccinations/", response)
    
    # Get pending vaccinations
    response = requests.get(f"{HEALTH_RECORDS_URL}/vaccinations/pending/", headers=headers)
    print_result("GET /health-records/vaccinations/pending/", response)
    
    # Get vaccination schedule
    response = requests.get(f"{HEALTH_RECORDS_URL}/vaccinations/schedule/", headers=headers)
    print_result("GET /health-records/vaccinations/schedule/", response)


def test_vital_signs():
    """Test vital signs endpoints."""
    print_header("VITAL SIGNS")
    
    headers = get_auth_headers()
    
    # List vitals
    response = requests.get(f"{HEALTH_RECORDS_URL}/vitals/", headers=headers)
    print_result("GET /health-records/vitals/", response)
    
    # Get latest vitals
    response = requests.get(f"{HEALTH_RECORDS_URL}/vitals/latest/", headers=headers)
    print_result("GET /health-records/vitals/latest/", response)
    
    # Get trends
    response = requests.get(f"{HEALTH_RECORDS_URL}/vitals/trends/?days=30", headers=headers)
    print_result("GET /health-records/vitals/trends/", response)
    
    # Get statistics
    response = requests.get(f"{HEALTH_RECORDS_URL}/vitals/statistics/?days=90", headers=headers)
    print_result("GET /health-records/vitals/statistics/", response)
    
    # Record vitals
    vital_data = {
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "heart_rate": 72,
        "temperature": 98.6,
        "oxygen_saturation": 98,
        "source": "self"
    }
    response = requests.post(f"{HEALTH_RECORDS_URL}/vitals/", json=vital_data, headers=headers)
    print_result("POST /health-records/vitals/", response)


def test_lab_reports():
    """Test lab reports endpoints."""
    print_header("LAB REPORTS")
    
    headers = get_auth_headers()
    
    # List lab reports
    response = requests.get(f"{HEALTH_RECORDS_URL}/lab-reports/", headers=headers)
    print_result("GET /health-records/lab-reports/", response)
    
    # Get recent reports
    response = requests.get(f"{HEALTH_RECORDS_URL}/lab-reports/recent/?days=90", headers=headers)
    print_result("GET /health-records/lab-reports/recent/", response)
    
    # Get abnormal reports
    response = requests.get(f"{HEALTH_RECORDS_URL}/lab-reports/abnormal/", headers=headers)
    print_result("GET /health-records/lab-reports/abnormal/", response)


def test_family_history():
    """Test family history endpoints."""
    print_header("FAMILY HISTORY")
    
    headers = get_auth_headers()
    
    # List family history
    response = requests.get(f"{HEALTH_RECORDS_URL}/family-history/", headers=headers)
    print_result("GET /health-records/family-history/", response)
    
    # Get summary
    response = requests.get(f"{HEALTH_RECORDS_URL}/family-history/summary/", headers=headers)
    print_result("GET /health-records/family-history/summary/", response)
    
    # Get risk conditions
    response = requests.get(f"{HEALTH_RECORDS_URL}/family-history/risk-conditions/", headers=headers)
    print_result("GET /health-records/family-history/risk-conditions/", response)


def test_hospitalizations():
    """Test hospitalizations endpoints."""
    print_header("HOSPITALIZATIONS")
    
    headers = get_auth_headers()
    
    # List hospitalizations
    response = requests.get(f"{HEALTH_RECORDS_URL}/hospitalizations/", headers=headers)
    print_result("GET /health-records/hospitalizations/", response)
    
    # Get pending follow-ups
    response = requests.get(f"{HEALTH_RECORDS_URL}/hospitalizations/pending-followups/", headers=headers)
    print_result("GET /health-records/hospitalizations/pending-followups/", response)


def test_documents():
    """Test documents endpoints."""
    print_header("DOCUMENTS")
    
    headers = get_auth_headers()
    
    # List documents
    response = requests.get(f"{HEALTH_RECORDS_URL}/documents/", headers=headers)
    print_result("GET /health-records/documents/", response)
    
    # Get recent documents
    response = requests.get(f"{HEALTH_RECORDS_URL}/documents/recent/?days=30", headers=headers)
    print_result("GET /health-records/documents/recent/", response)
    
    # Get storage usage
    response = requests.get(f"{HEALTH_RECORDS_URL}/documents/storage-usage/", headers=headers)
    print_result("GET /health-records/documents/storage-usage/", response)
    
    # Search documents
    response = requests.post(
        f"{HEALTH_RECORDS_URL}/documents/search/",
        json={"query": "report"},
        headers=headers
    )
    print_result("POST /health-records/documents/search/", response)


def test_sharing():
    """Test sharing endpoints."""
    print_header("SHARING")
    
    headers = get_auth_headers()
    
    # List shares
    response = requests.get(f"{HEALTH_RECORDS_URL}/sharing/", headers=headers)
    print_result("GET /health-records/sharing/", response)
    
    # Get my shares
    response = requests.get(f"{HEALTH_RECORDS_URL}/sharing/my-shares/", headers=headers)
    print_result("GET /health-records/sharing/my-shares/", response)


def test_analytics():
    """Test analytics endpoints."""
    print_header("ANALYTICS")
    
    headers = get_auth_headers()
    
    # Get timeline
    response = requests.get(f"{HEALTH_RECORDS_URL}/analytics/timeline/?months=12", headers=headers)
    print_result("GET /health-records/analytics/timeline/", response)
    
    # Get health score
    response = requests.get(f"{HEALTH_RECORDS_URL}/analytics/score/", headers=headers)
    print_result("GET /health-records/analytics/score/", response)
    
    # Get summary
    response = requests.get(f"{HEALTH_RECORDS_URL}/analytics/summary/", headers=headers)
    print_result("GET /health-records/analytics/summary/", response)
    
    # Get quick data
    response = requests.get(f"{HEALTH_RECORDS_URL}/analytics/quick-data/", headers=headers)
    print_result("GET /health-records/analytics/quick-data/", response)


def login_test_user():
    """Login and get token for test user."""
    global TEST_USER_TOKEN
    
    print_header("AUTHENTICATION")
    
    # Note: In real scenario, you'd use Firebase auth
    # For testing, we'll check if there's a way to get a test token
    
    print("⚠️  For full testing, you need to:")
    print("   1. Get a valid JWT token for a test patient")
    print("   2. Set TEST_USER_TOKEN variable")
    print("   3. Run the tests again")
    print("\n   Or test endpoints that don't require auth (health check)")
    
    return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  HEALTH RECORDS API TESTS")
    print("=" * 60)
    
    # Test health check (no auth required)
    if not test_health_check():
        print("\n❌ Health check failed! Is the server running?")
        return
    
    # Try to login
    if not login_test_user():
        print("\n⚠️  Running tests without authentication...")
        print("   Some tests will fail due to missing auth token.\n")
    
    # Run all tests
    test_health_profile()
    test_medical_conditions()
    test_allergies()
    test_vaccinations()
    test_vital_signs()
    test_lab_reports()
    test_family_history()
    test_hospitalizations()
    test_documents()
    test_sharing()
    test_analytics()
    
    print_header("TESTS COMPLETE")
    print("Review the results above for any failures.")


if __name__ == "__main__":
    main()