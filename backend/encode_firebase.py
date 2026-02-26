# Run this in Python shell or create a file encode_firebase.py
import base64
import json

# Path to your Firebase credentials file
firebase_path = 'firebase-credentials.json'  # Update this path

with open(firebase_path, 'r') as f:
    credentials = f.read()

# Encode to base64
encoded = base64.b64encode(credentials.encode()).decode()

print("=" * 60)
print("FIREBASE_CREDENTIALS_BASE64:")
print("=" * 60)
print(encoded)
print("=" * 60)
print(f"\nLength: {len(encoded)} characters")
print("\nCopy this entire string for the Render environment variable!")