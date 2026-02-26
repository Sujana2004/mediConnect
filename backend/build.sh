#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "=================================================="
echo "🏥 MEDICONNECT - BUILD SCRIPT"
echo "=================================================="

echo ""
echo "📦 Step 1: Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "📁 Step 2: Creating directories..."
mkdir -p staticfiles
mkdir -p logs

echo ""
echo "📊 Step 3: Collecting static files..."
python manage.py collectstatic --no-input

echo ""
echo "🗄️ Step 4: Running database migrations..."
python manage.py migrate --no-input

echo ""
echo "🔧 Step 5: Verifying installation..."
python -c "import django; print(f'✅ Django {django.VERSION} loaded')"
python -c "import sklearn; print('✅ scikit-learn loaded')"
python -c "import firebase_admin; print('✅ Firebase Admin loaded')"
python -c "import deep_translator; print('✅ Deep Translator loaded')"
python -c "import groq; print('✅ Groq AI loaded')"

echo ""
echo "=================================================="
echo "✅ BUILD COMPLETED SUCCESSFULLY!"
echo "=================================================="