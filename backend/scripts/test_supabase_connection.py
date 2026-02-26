#!/usr/bin/env python
"""
Test Supabase connection - database and storage.
"""

import os
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv(project_root / '.env')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediconnect.settings.development')

import django
django.setup()

from django.conf import settings
from django.db import connection


def test_env_vars():
    """Check environment variables."""
    print("\n⚙️ Checking Configuration...")
    
    checks = [
        ('SUPABASE_URL', settings.SUPABASE_URL),
        ('SUPABASE_SERVICE_ROLE_KEY', settings.SUPABASE_SERVICE_ROLE_KEY[:20] + '...' if settings.SUPABASE_SERVICE_ROLE_KEY else None),
        ('SUPABASE_STORAGE_BUCKET', settings.SUPABASE_STORAGE_BUCKET),
    ]
    
    all_set = True
    for name, value in checks:
        if value:
            print(f"   ✅ {name}: {value[:50]}{'...' if len(str(value)) > 50 else ''}")
        else:
            print(f"   ❌ {name}: NOT SET")
            all_set = False
    
    return all_set


def test_database():
    """Test database connection."""
    print("\n📊 Testing Database Connection...")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"   ✅ Connected to PostgreSQL!")
            print(f"   Version: {version[:50]}...")
            
            # Count tables
            cursor.execute("""
                SELECT count(*) FROM information_schema.tables 
                WHERE table_schema = 'public';
            """)
            table_count = cursor.fetchone()[0]
            print(f"   Tables: {table_count}")
            
            return True
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return False


def test_storage():
    """Test Supabase storage."""
    print("\n📦 Testing Supabase Storage...")
    
    try:
        from mediconnect.supabase_client import SupabaseStorageManager
        
        storage = SupabaseStorageManager()
        print(f"   Bucket: {storage.bucket_name}")
        
        # Test upload
        test_path = "temp/connection_test.txt"
        test_content = b"Connection test successful!"
        
        result = storage.upload_file(test_path, test_content, "text/plain")
        
        if result['success']:
            print(f"   ✅ Upload: OK")
            
            # Test signed URL
            url = storage.get_signed_url(test_path, 60)
            if url:
                print(f"   ✅ Signed URL: OK")
            
            # Test download
            data = storage.download_file(test_path)
            if data == test_content:
                print(f"   ✅ Download: OK")
            
            # Cleanup
            storage.delete_file(test_path)
            print(f"   ✅ Delete: OK")
            
            return True
        else:
            print(f"   ❌ Upload failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"   ❌ Storage test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_django_storage():
    """Test Django default storage backend."""
    print("\n🗄️ Testing Django Storage Backend...")
    
    try:
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        
        print(f"   Backend: {default_storage.__class__.__name__}")
        
        # Save file
        content = ContentFile(b"Django storage test")
        name = default_storage.save("temp/django_test.txt", content)
        print(f"   ✅ Save: {name}")
        
        # Check exists
        if default_storage.exists(name):
            print(f"   ✅ Exists: OK")
        
        # Get URL
        try:
            url = default_storage.url(name)
            print(f"   ✅ URL: {url[:60]}...")
        except Exception as e:
            print(f"   ⚠️ URL: {e}")
        
        # Delete
        default_storage.delete(name)
        print(f"   ✅ Delete: OK")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("🏥 MediConnect - Connection Test")
    print("=" * 60)
    
    results = {
        'Configuration': test_env_vars(),
        'Database': test_database(),
        'Storage': test_storage(),
        'Django Storage': test_django_storage(),
    }
    
    print("\n" + "=" * 60)
    print("📋 Results")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {name}: {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️ Some tests failed. Check your configuration.")
        sys.exit(1)


if __name__ == '__main__':
    main()