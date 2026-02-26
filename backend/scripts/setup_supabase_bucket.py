#!/usr/bin/env python
"""
Script to set up Supabase storage bucket for MediConnect.
Uses REST API - no supabase-py package required.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(project_root / '.env')

# Now setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediconnect.settings.development')

import django
django.setup()

from mediconnect.supabase_client import SupabaseStorageManager, SupabaseBucketManager
from django.conf import settings


def setup_bucket():
    """Create and configure the storage bucket."""
    
    print("🚀 Setting up Supabase storage bucket...")
    print(f"   URL: {settings.SUPABASE_URL}")
    
    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    print(f"   Bucket: {bucket_name}")
    
    # Check/create bucket
    bucket_manager = SupabaseBucketManager()
    
    print(f"\n📋 Checking existing buckets...")
    buckets = bucket_manager.list_buckets()
    bucket_names = [b.get('name') for b in buckets]
    print(f"   Found: {bucket_names}")
    
    if bucket_name in bucket_names:
        print(f"\n✅ Bucket '{bucket_name}' already exists")
    else:
        print(f"\n📦 Creating bucket '{bucket_name}'...")
        success = bucket_manager.create_bucket(
            bucket_name=bucket_name,
            public=False,
            file_size_limit=10 * 1024 * 1024,  # 10MB
            allowed_mime_types=[
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/jpg',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
        )
        
        if success:
            print(f"✅ Bucket '{bucket_name}' created successfully!")
        else:
            print(f"⚠️ Could not create bucket (may already exist)")
    
    # Create folder structure
    print(f"\n📁 Creating folder structure...")
    
    storage = SupabaseStorageManager(bucket_name)
    folders = ['health-records', 'profile-images', 'media', 'temp', 'documents']
    
    for folder in folders:
        file_path = f"{folder}/.gitkeep"
        
        if storage.file_exists(file_path):
            print(f"   📁 Folder exists: {folder}/")
        else:
            result = storage.upload_file(
                file_path=file_path,
                file_data=b'',
                content_type='text/plain'
            )
            
            if result['success']:
                print(f"   ✅ Created folder: {folder}/")
            else:
                print(f"   ⚠️ Could not create {folder}/: {result.get('error', 'Unknown error')}")
    
    print("\n" + "=" * 60)
    print("✅ Setup Complete!")
    print("=" * 60)


def test_storage():
    """Test storage operations."""
    
    print("\n🧪 Testing Storage Operations...")
    
    storage = SupabaseStorageManager()
    
    # Test upload
    test_path = "temp/setup_test.txt"
    test_content = b"MediConnect storage test - Setup successful!"
    
    print(f"   📤 Uploading test file...")
    result = storage.upload_file(test_path, test_content, "text/plain")
    
    if not result['success']:
        print(f"   ❌ Upload failed: {result.get('error')}")
        return False
    
    print(f"   ✅ Upload successful!")
    
    # Test exists
    print(f"   🔍 Checking file exists...")
    if storage.file_exists(test_path):
        print(f"   ✅ File exists!")
    else:
        print(f"   ❌ File not found!")
        return False
    
    # Test signed URL
    print(f"   🔗 Generating signed URL...")
    signed_url = storage.get_signed_url(test_path, expires_in=60)
    if signed_url:
        print(f"   ✅ Signed URL: {signed_url[:70]}...")
    else:
        print(f"   ⚠️ Could not generate signed URL")
    
    # Test download
    print(f"   📥 Downloading file...")
    downloaded = storage.download_file(test_path)
    if downloaded == test_content:
        print(f"   ✅ Download successful! Content verified.")
    else:
        print(f"   ⚠️ Download content mismatch")
    
    # Test delete
    print(f"   🗑️ Deleting test file...")
    if storage.delete_file(test_path):
        print(f"   ✅ Delete successful!")
    else:
        print(f"   ⚠️ Delete may have failed")
    
    return True


def main():
    print("=" * 60)
    print("🏥 MediConnect - Supabase Storage Setup")
    print("=" * 60)
    
    try:
        setup_bucket()
        test_storage()
        print("\n🎉 All done! Your Supabase storage is ready.")
    except ValueError as e:
        print(f"\n❌ Configuration Error: {e}")
        print("\nMake sure your .env file has:")
        print("  SUPABASE_URL=https://your-project.supabase.co")
        print("  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key")
        print("  SUPABASE_STORAGE_BUCKET=health-records")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()