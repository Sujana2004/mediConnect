"""
Management command to load drug interactions.

Usage:
    python manage.py load_drug_interactions
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.medicine.models import Medicine, DrugInteraction


# Sample drug interactions
INTERACTIONS_DATA = [
    {
        'medicine_1_generic': 'Ciprofloxacin',
        'medicine_2_generic': 'Metformin',
        'severity': 'moderate',
        'description': 'Ciprofloxacin may increase or decrease blood sugar levels when taken with Metformin.',
        'description_local': 'సిప్రోఫ్లోక్సాసిన్ మెట్ఫార్మిన్‌తో తీసుకున్నప్పుడు రక్తంలో చక్కెర స్థాయిలను పెంచవచ్చు లేదా తగ్గించవచ్చు.',
        'effect': 'Blood sugar fluctuations - may cause hypoglycemia or hyperglycemia',
        'recommendation': 'Monitor blood sugar levels closely. Consult doctor if symptoms occur.',
        'recommendation_local': 'రక్తంలో చక్కెర స్థాయిలను జాగ్రత్తగా పర్యవేక్షించండి.',
    },
    {
        'medicine_1_generic': 'Amlodipine',
        'medicine_2_generic': 'Metformin',
        'severity': 'mild',
        'description': 'Generally safe to use together. May slightly reduce Metformin effectiveness.',
        'effect': 'Minor reduction in blood sugar control',
        'recommendation': 'No major concerns. Continue as prescribed.',
    },
    {
        'medicine_1_generic': 'Omeprazole',
        'medicine_2_generic': 'Metformin',
        'severity': 'mild',
        'description': 'Omeprazole may slightly increase Metformin absorption.',
        'effect': 'Slightly increased Metformin levels',
        'recommendation': 'Generally safe. Monitor for side effects.',
    },
    {
        'medicine_1_generic': 'Ibuprofen + Paracetamol',
        'medicine_2_generic': 'Metformin',
        'severity': 'moderate',
        'description': 'NSAIDs like Ibuprofen may affect kidney function and blood sugar levels.',
        'effect': 'Increased risk of lactic acidosis, kidney effects',
        'recommendation': 'Avoid prolonged use. Consult doctor.',
    },
    {
        'medicine_1_generic': 'Azithromycin',
        'medicine_2_generic': 'Amlodipine',
        'severity': 'moderate',
        'description': 'Azithromycin may increase the effects of Amlodipine.',
        'effect': 'Increased blood pressure lowering effect, risk of low BP',
        'recommendation': 'Monitor blood pressure. Report dizziness or fainting.',
    },
    {
        'medicine_1_generic': 'Ciprofloxacin',
        'medicine_2_generic': 'Telmisartan',
        'severity': 'moderate',
        'description': 'Both medicines can affect potassium levels.',
        'effect': 'Risk of increased potassium levels',
        'recommendation': 'Monitor potassium levels if used together for extended period.',
    },
    {
        'medicine_1_generic': 'Paracetamol',
        'medicine_2_generic': 'Metformin',
        'severity': 'mild',
        'description': 'Generally safe to use together.',
        'effect': 'No significant interaction',
        'recommendation': 'Can be used together safely.',
    },
    {
        'medicine_1_generic': 'Glimepiride',
        'medicine_2_generic': 'Metformin',
        'severity': 'moderate',
        'description': 'Both lower blood sugar. Combined effect may cause hypoglycemia.',
        'description_local': 'రెండూ రక్తంలో చక్కెరను తగ్గిస్తాయి. కలిపి వాడితే హైపోగ్లైసీమియా రావచ్చు.',
        'effect': 'Increased risk of low blood sugar (hypoglycemia)',
        'recommendation': 'Monitor blood sugar regularly. Carry sugar/glucose tablets.',
        'recommendation_local': 'క్రమం తప్పకుండా రక్తంలో చక్కెరను పరీక్షించండి. చక్కెర గోళీలు వెంట ఉంచుకోండి.',
    },
    {
        'medicine_1_generic': 'Cetirizine',
        'medicine_2_generic': 'Diphenhydramine + Ammonium Chloride',
        'severity': 'moderate',
        'description': 'Both cause drowsiness. Combined use increases sedation.',
        'description_local': 'రెండూ మగతను కలిగిస్తాయి. కలిపి వాడితే మరింత నిద్ర వస్తుంది.',
        'effect': 'Excessive drowsiness, dizziness',
        'recommendation': 'Avoid taking together. Do not drive or operate machinery.',
        'recommendation_local': 'కలిపి తీసుకోకండి. వాహనం నడపకండి.',
    },
    {
        'medicine_1_generic': 'Amlodipine',
        'medicine_2_generic': 'Telmisartan',
        'severity': 'mild',
        'description': 'Often prescribed together for better blood pressure control.',
        'effect': 'Enhanced blood pressure lowering - therapeutic effect',
        'recommendation': 'Safe combination. Monitor blood pressure regularly.',
    },
]


class Command(BaseCommand):
    help = 'Load drug interactions data'

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            for data in INTERACTIONS_DATA:
                # Find medicines by generic name
                med1 = Medicine.objects.filter(
                    name_generic__icontains=data['medicine_1_generic']
                ).first()
                
                med2 = Medicine.objects.filter(
                    name_generic__icontains=data['medicine_2_generic']
                ).first()
                
                if not med1 or not med2:
                    skipped_count += 1
                    continue
                
                # Check if interaction already exists (either direction)
                existing = DrugInteraction.objects.filter(
                    medicine_1=med1, medicine_2=med2
                ).exists() or DrugInteraction.objects.filter(
                    medicine_1=med2, medicine_2=med1
                ).exists()
                
                if existing:
                    skipped_count += 1
                    continue
                
                DrugInteraction.objects.create(
                    medicine_1=med1,
                    medicine_2=med2,
                    severity=data['severity'],
                    description=data['description'],
                    description_local=data.get('description_local', ''),
                    effect=data.get('effect', ''),
                    recommendation=data.get('recommendation', ''),
                    recommendation_local=data.get('recommendation_local', ''),
                    is_verified=True,
                )
                created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Drug Interactions: {created_count} created, {skipped_count} skipped'
            )
        )