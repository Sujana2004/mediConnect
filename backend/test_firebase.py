"""
Test script to verify Firebase Admin SDK integration.
Run with: python test_firebase.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediconnect.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.users.firebase_auth import get_firebase_app, verify_firebase_token


def test_firebase_initialization():
    """Test if Firebase initializes correctly."""
    print("=" * 60)
    print("FIREBASE INTEGRATION TEST")
    print("=" * 60)
    
    print("\n1. Testing Firebase App Initialization...")
    app = get_firebase_app()
    
    if app:
        print("   ✅ Firebase Admin SDK initialized successfully!")
        print(f"   📱 Project ID: {app.project_id}")
        print(f"   🔗 App Name: {app.name}")
    else:
        print("   ❌ Firebase initialization failed!")
        print("   Please check:")
        print("   - firebase-credentials.json exists in backend folder")
        print("   - The file contains valid credentials")
        return False
    
    print("\n2. Testing Token Verification (with invalid token)...")
    result = verify_firebase_token("invalid_token_for_testing")
    
    if result is None:
        print("   ✅ Token verification working (correctly rejected invalid token)")
    else:
        print("   ⚠️ Unexpected result:", result)
    
    print("\n" + "=" * 60)
    print("FIREBASE INTEGRATION TEST COMPLETE")
    print("=" * 60)
    
    return True


if __name__ == "__main__":
    try:
        success = test_firebase_initialization()
        if success:
            print("\n🎉 Firebase is ready to use!")
        else:
            print("\n⚠️ Please fix the issues above.")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()