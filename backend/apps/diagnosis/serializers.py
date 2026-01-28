"""
Diagnosis API Serializers
=========================
Request and response serializers for diagnosis endpoints.
"""

from rest_framework import serializers
from .models import Symptom, Disease, DiagnosisSession, DiseaseSymptomMapping


class SymptomSerializer(serializers.ModelSerializer):
    """Serializer for Symptom model."""
    
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Symptom
        fields = [
            'id', 'code', 'name', 'name_english', 'name_telugu', 'name_hindi',
            'category', 'severity_weight', 'description'
        ]
    
    def get_name(self, obj):
        """Get name in requested language."""
        request = self.context.get('request')
        language = 'en'
        if request:
            language = request.query_params.get('language', 'en')
        return obj.get_name(language)


class SymptomListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for symptom lists."""
    
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Symptom
        fields = ['code', 'name', 'category', 'severity_weight']
    
    def get_name(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_name(language)


class DiseaseSerializer(serializers.ModelSerializer):
    """Serializer for Disease model."""
    
    name = serializers.SerializerMethodField()
    precautions = serializers.SerializerMethodField()
    
    class Meta:
        model = Disease
        fields = [
            'id', 'code', 'name', 'name_english', 'name_telugu', 'name_hindi',
            'description', 'typical_severity', 'recommended_specialist',
            'requires_immediate_care', 'is_contagious', 'precautions'
        ]
    
    def get_name(self, obj):
        request = self.context.get('request')
        language = 'en'
        if request:
            language = request.query_params.get('language', 'en')
        return obj.get_name(language)
    
    def get_precautions(self, obj):
        request = self.context.get('request')
        language = 'en'
        if request:
            language = request.query_params.get('language', 'en')
        return obj.get_precautions(language)


class DiseaseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for disease lists."""
    
    class Meta:
        model = Disease
        fields = ['code', 'name_english', 'typical_severity', 'recommended_specialist']


# ==================== Request Serializers ====================

class DiagnoseTextRequestSerializer(serializers.Serializer):
    """Request serializer for text-based diagnosis."""
    
    text = serializers.CharField(
        required=True,
        min_length=3,
        max_length=2000,
        help_text="Description of symptoms in natural language"
    )
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        required=False,
        default=None,
        help_text="Input language (auto-detect if not provided)"
    )
    patient_age = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=150,
        help_text="Patient's age"
    )
    patient_gender = serializers.ChoiceField(
        choices=['male', 'female', 'other'],
        required=False,
        help_text="Patient's gender"
    )
    symptom_duration_days = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=365,
        help_text="Duration of symptoms in days"
    )
    device_type = serializers.CharField(
        required=False,
        max_length=20,
        help_text="Device type (android, ios, web)"
    )
    app_version = serializers.CharField(
        required=False,
        max_length=20,
        help_text="App version"
    )


class DiagnoseSymptomsRequestSerializer(serializers.Serializer):
    """Request serializer for symptom-list based diagnosis."""
    
    symptoms = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=True,
        min_length=1,
        max_length=20,
        help_text="List of symptom codes"
    )
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        required=False,
        default='en',
        help_text="Response language"
    )
    patient_age = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=150
    )
    patient_gender = serializers.ChoiceField(
        choices=['male', 'female', 'other'],
        required=False
    )


class FeedbackRequestSerializer(serializers.Serializer):
    """Request serializer for session feedback."""
    
    session_id = serializers.CharField(required=True)
    feedback = serializers.ChoiceField(
        choices=['helpful', 'not_helpful', 'incorrect'],
        required=True
    )
    comment = serializers.CharField(
        required=False,
        max_length=1000,
        allow_blank=True
    )


# ==================== Response Serializers ====================

class SymptomExtractionDetailSerializer(serializers.Serializer):
    """Serializer for symptom extraction details."""
    
    code = serializers.CharField()
    name = serializers.CharField()
    name_local = serializers.CharField(required=False)
    confidence = serializers.FloatField(required=False)


class PredictionSerializer(serializers.Serializer):
    """Serializer for disease prediction."""
    
    disease_code = serializers.CharField()
    disease_name = serializers.CharField()
    confidence = serializers.FloatField()
    rank = serializers.IntegerField()


class SeveritySerializer(serializers.Serializer):
    """Serializer for severity assessment."""
    
    level = serializers.CharField()
    level_local = serializers.CharField(required=False)
    score = serializers.FloatField()
    requires_emergency = serializers.BooleanField()
    factors = serializers.ListField(child=serializers.DictField(), required=False)


class DiagnosisResponseSerializer(serializers.Serializer):
    """Complete diagnosis response serializer."""
    
    success = serializers.BooleanField()
    session_id = serializers.CharField()
    message = serializers.CharField()
    message_local = serializers.CharField(required=False)
    
    # Nested data
    input = serializers.DictField(required=False)
    symptoms = serializers.DictField(required=False)
    predictions = serializers.DictField(required=False)
    diagnosis = serializers.DictField(required=False)
    severity = serializers.DictField(required=False)
    recommendations = serializers.DictField(required=False)
    meta = serializers.DictField(required=False)
    
    # Error fields
    error_code = serializers.CharField(required=False)
    suggestions = serializers.ListField(required=False)
    common_symptoms = serializers.ListField(required=False)


class DiagnosisSessionSerializer(serializers.ModelSerializer):
    """Serializer for DiagnosisSession model."""
    
    top_prediction_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DiagnosisSession
        fields = [
            'id', 'session_id', 'input_type', 'raw_input', 'input_language',
            'extracted_symptoms', 'extraction_confidence',
            'predictions', 'top_prediction', 'top_prediction_name',
            'top_prediction_confidence', 'severity_level', 'severity_score',
            'requires_emergency_care', 'recommended_specialist',
            'recommendations', 'response_text', 'user_feedback',
            'patient_age', 'patient_gender', 'processing_time_ms',
            'created_at', 'completed_at'
        ]
        read_only_fields = fields
    
    def get_top_prediction_name(self, obj):
        if obj.top_prediction:
            return obj.top_prediction.name_english
        return None


class DiagnosisSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for session lists."""
    
    top_prediction_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DiagnosisSession
        fields = [
            'session_id', 'input_type', 'raw_input',
            'top_prediction_name', 'top_prediction_confidence',
            'severity_level', 'user_feedback', 'created_at'
        ]
    
    def get_top_prediction_name(self, obj):
        if obj.top_prediction:
            return obj.top_prediction.name_english
        return None


class ModelStatusSerializer(serializers.Serializer):
    """Serializer for ML model status."""
    
    models_loaded = serializers.BooleanField()
    models_dir = serializers.CharField()
    files_exist = serializers.DictField()
    disease_predictor = serializers.DictField(required=False)
    symptom_extractor = serializers.DictField(required=False)