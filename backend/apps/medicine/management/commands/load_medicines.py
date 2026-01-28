"""
Management command to load sample medicines.

Usage:
    python manage.py load_medicines
    python manage.py load_medicines --clear
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal

from apps.medicine.models import Medicine, MedicineAlternative


# Sample medicines data (common Indian medicines)
MEDICINES_DATA = [
    # ==========================================================================
    # ANTIPYRETICS / PAINKILLERS
    # ==========================================================================
    {
        'name': 'Dolo 650',
        'name_generic': 'Paracetamol',
        'name_local': 'డోలో 650 / डोलो 650',
        'brand_name': 'Dolo',
        'manufacturer': 'Micro Labs Ltd',
        'medicine_type': 'tablet',
        'strength': '650mg',
        'pack_size': '15 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('30.00'),
        'composition': 'Paracetamol 650mg',
        'uses': 'Fever, headache, body pain, cold, toothache',
        'uses_local': 'జ్వరం, తలనొప్పి, శరీరం నొప్పి / बुखार, सिरदर्द, बदन दर्द',
        'dosage_info': '1 tablet every 4-6 hours. Maximum 4 tablets in 24 hours.',
        'dosage_info_local': '4-6 గంటలకు 1 టాబ్లెట్. 24 గంటల్లో గరిష్టంగా 4 / 4-6 घंटे में 1 गोली। 24 घंटे में अधिकतम 4',
        'side_effects': 'Nausea, allergic reactions (rare), liver problems with overdose',
        'warnings': 'Do not exceed recommended dose. Avoid alcohol. Consult doctor if symptoms persist for more than 3 days.',
        'contraindications': 'Liver disease, alcohol dependence, allergy to paracetamol',
        'storage_info': 'Store below 30°C in a dry place',
        'category': 'Antipyretic',
        'subcategory': 'Painkiller',
        'is_generic': False,
        'is_habit_forming': False,
        'is_verified': True,
    },
    {
        'name': 'Crocin 650',
        'name_generic': 'Paracetamol',
        'name_local': 'క్రోసిన్ 650 / क्रोसिन 650',
        'brand_name': 'Crocin',
        'manufacturer': 'GlaxoSmithKline',
        'medicine_type': 'tablet',
        'strength': '650mg',
        'pack_size': '15 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('32.50'),
        'composition': 'Paracetamol 650mg',
        'uses': 'Fever, headache, body pain, cold',
        'uses_local': 'జ్వరం, తలనొప్పి, శరీరం నొప్పి / बुखार, सिरदर्द, बदन दर्द',
        'dosage_info': '1 tablet every 4-6 hours. Maximum 4 tablets in 24 hours.',
        'side_effects': 'Nausea, allergic reactions (rare)',
        'warnings': 'Do not exceed recommended dose. Avoid alcohol.',
        'category': 'Antipyretic',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Paracetamol 500mg',
        'name_generic': 'Paracetamol',
        'name_local': 'పారాసెటమాల్ / पैरासिटामोल',
        'brand_name': 'Generic',
        'manufacturer': 'Various',
        'medicine_type': 'tablet',
        'strength': '500mg',
        'pack_size': '10 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('10.00'),
        'composition': 'Paracetamol 500mg',
        'uses': 'Fever, headache, body pain',
        'dosage_info': '1-2 tablets every 4-6 hours',
        'category': 'Antipyretic',
        'is_generic': True,
        'is_verified': True,
    },
    {
        'name': 'Combiflam',
        'name_generic': 'Ibuprofen + Paracetamol',
        'name_local': 'కాంబిఫ్లామ్ / कॉम्बिफ्लेम',
        'brand_name': 'Combiflam',
        'manufacturer': 'Sanofi India',
        'medicine_type': 'tablet',
        'strength': '400mg + 325mg',
        'pack_size': '20 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('42.00'),
        'composition': 'Ibuprofen 400mg + Paracetamol 325mg',
        'uses': 'Pain relief, fever, headache, toothache, muscle pain, joint pain',
        'uses_local': 'నొప్పి, జ్వరం, తలనొప్పి / दर्द, बुखार, सिरदर्द',
        'dosage_info': '1 tablet 2-3 times daily after food',
        'side_effects': 'Stomach upset, nausea, dizziness',
        'warnings': 'Take with food. Avoid if you have stomach ulcers.',
        'category': 'Painkiller',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # ANTIBIOTICS
    # ==========================================================================
    {
        'name': 'Azithromycin 500mg',
        'name_generic': 'Azithromycin',
        'name_local': 'అజిత్రోమైసిన్ / एजिथ्रोमाइसिन',
        'brand_name': 'Azithral',
        'manufacturer': 'Alembic Pharma',
        'medicine_type': 'tablet',
        'strength': '500mg',
        'pack_size': '3 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('95.00'),
        'composition': 'Azithromycin 500mg',
        'uses': 'Bacterial infections, respiratory infections, skin infections, ear infections',
        'uses_local': 'బ్యాక్టీరియల్ ఇన్ఫెక్షన్లు / बैक्टीरियल संक्रमण',
        'dosage_info': '1 tablet once daily for 3 days, or as prescribed',
        'dosage_info_local': 'రోజుకు 1 టాబ్లెట్, 3 రోజులు / दिन में 1 गोली, 3 दिन',
        'side_effects': 'Diarrhea, nausea, stomach pain, headache',
        'warnings': 'Complete the full course. Do not skip doses.',
        'contraindications': 'Allergy to azithromycin or macrolide antibiotics',
        'category': 'Antibiotic',
        'subcategory': 'Macrolide',
        'is_generic': False,
        'is_habit_forming': False,
        'is_verified': True,
    },
    {
        'name': 'Amoxicillin 500mg',
        'name_generic': 'Amoxicillin',
        'name_local': 'అమాక్సిసిలిన్ / एमोक्सिसिलिन',
        'brand_name': 'Mox',
        'manufacturer': 'Ranbaxy',
        'medicine_type': 'capsule',
        'strength': '500mg',
        'pack_size': '10 capsules',
        'prescription_type': 'prescription',
        'mrp': Decimal('65.00'),
        'composition': 'Amoxicillin 500mg',
        'uses': 'Bacterial infections, ear infections, throat infections, urinary infections',
        'dosage_info': '1 capsule 3 times daily for 5-7 days',
        'side_effects': 'Diarrhea, nausea, skin rash',
        'warnings': 'Complete the full course. Take with or after food.',
        'contraindications': 'Penicillin allergy',
        'category': 'Antibiotic',
        'subcategory': 'Penicillin',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Ciprofloxacin 500mg',
        'name_generic': 'Ciprofloxacin',
        'name_local': 'సిప్రోఫ్లోక్సాసిన్ / सिप्रोफ्लोक्सासिन',
        'brand_name': 'Ciplox',
        'manufacturer': 'Cipla',
        'medicine_type': 'tablet',
        'strength': '500mg',
        'pack_size': '10 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('48.00'),
        'composition': 'Ciprofloxacin 500mg',
        'uses': 'Urinary tract infections, respiratory infections, skin infections',
        'dosage_info': '1 tablet twice daily for 5-7 days',
        'side_effects': 'Nausea, diarrhea, dizziness, tendon problems',
        'warnings': 'Avoid sunlight. Complete the full course.',
        'category': 'Antibiotic',
        'subcategory': 'Fluoroquinolone',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # ANTACIDS / DIGESTIVE
    # ==========================================================================
    {
        'name': 'Pantoprazole 40mg',
        'name_generic': 'Pantoprazole',
        'name_local': 'పాంటోప్రాజోల్ / पैंटोप्राजोल',
        'brand_name': 'Pan 40',
        'manufacturer': 'Alkem Labs',
        'medicine_type': 'tablet',
        'strength': '40mg',
        'pack_size': '15 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('120.00'),
        'composition': 'Pantoprazole Sodium 40mg',
        'uses': 'Acidity, gastric ulcers, GERD, heartburn',
        'uses_local': 'ఆసిడిటీ, కడుపు పూత / एसिडिटी, पेट का अल्सर',
        'dosage_info': '1 tablet before breakfast daily',
        'dosage_info_local': 'రోజూ అల్పాహారానికి ముందు 1 టాబ్లెట్ / रोज नाश्ते से पहले 1 गोली',
        'side_effects': 'Headache, diarrhea, nausea',
        'warnings': 'Take on empty stomach, 30-60 minutes before food',
        'category': 'Antacid',
        'subcategory': 'PPI',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Omeprazole 20mg',
        'name_generic': 'Omeprazole',
        'name_local': 'ఓమెప్రజోల్ / ओमेप्राजोल',
        'brand_name': 'Omez',
        'manufacturer': 'Dr. Reddys',
        'medicine_type': 'capsule',
        'strength': '20mg',
        'pack_size': '15 capsules',
        'prescription_type': 'otc',
        'mrp': Decimal('85.00'),
        'composition': 'Omeprazole 20mg',
        'uses': 'Acidity, ulcers, heartburn, GERD',
        'dosage_info': '1 capsule before breakfast',
        'side_effects': 'Headache, stomach pain, nausea',
        'category': 'Antacid',
        'subcategory': 'PPI',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Digene',
        'name_generic': 'Magaldrate + Simethicone',
        'name_local': 'డైజీన్ / डाइजीन',
        'brand_name': 'Digene',
        'manufacturer': 'Abbott India',
        'medicine_type': 'tablet',
        'strength': '400mg + 20mg',
        'pack_size': '15 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('42.00'),
        'composition': 'Magaldrate 400mg + Simethicone 20mg',
        'uses': 'Acidity, gas, bloating, indigestion',
        'uses_local': 'ఆసిడిటీ, గ్యాస్, ఉబ్బరం / एसिडिटी, गैस, पेट फूलना',
        'dosage_info': 'Chew 1-2 tablets after meals or when needed',
        'side_effects': 'Constipation, diarrhea (rare)',
        'category': 'Antacid',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # ANTIHISTAMINES / ALLERGY
    # ==========================================================================
    {
        'name': 'Cetirizine 10mg',
        'name_generic': 'Cetirizine',
        'name_local': 'సెటిరిజైన్ / सेटिरिज़िन',
        'brand_name': 'Cetzine',
        'manufacturer': 'Unichem Labs',
        'medicine_type': 'tablet',
        'strength': '10mg',
        'pack_size': '10 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('25.00'),
        'composition': 'Cetirizine Hydrochloride 10mg',
        'uses': 'Allergies, cold, runny nose, sneezing, itching, hives',
        'uses_local': 'అలెర్జీలు, జలుబు, ముక్కు కారడం / एलर्जी, जुकाम, नाक बहना',
        'dosage_info': '1 tablet once daily, preferably at bedtime',
        'dosage_info_local': 'రోజుకు 1 టాబ్లెట్, రాత్రి నిద్ర ముందు / दिन में 1 गोली, रात को',
        'side_effects': 'Drowsiness, dry mouth, fatigue',
        'warnings': 'May cause drowsiness. Avoid driving.',
        'category': 'Antihistamine',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Levocetirizine 5mg',
        'name_generic': 'Levocetirizine',
        'name_local': 'లెవోసెటిరిజైన్ / लिवोसेटिरिज़िन',
        'brand_name': 'Levocet',
        'manufacturer': 'Glenmark',
        'medicine_type': 'tablet',
        'strength': '5mg',
        'pack_size': '10 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('45.00'),
        'composition': 'Levocetirizine 5mg',
        'uses': 'Allergies, hay fever, hives, itching',
        'dosage_info': '1 tablet once daily in the evening',
        'side_effects': 'Drowsiness, headache, dry mouth',
        'category': 'Antihistamine',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # COUGH & COLD
    # ==========================================================================
    {
        'name': 'Benadryl Cough Syrup',
        'name_generic': 'Diphenhydramine + Ammonium Chloride',
        'name_local': 'బెనాడ్రిల్ / बेनाड्रिल',
        'brand_name': 'Benadryl',
        'manufacturer': 'Johnson & Johnson',
        'medicine_type': 'syrup',
        'strength': '100ml',
        'pack_size': '100ml bottle',
        'prescription_type': 'otc',
        'mrp': Decimal('85.00'),
        'composition': 'Diphenhydramine HCl + Ammonium Chloride + Sodium Citrate',
        'uses': 'Cough, cold, throat irritation',
        'uses_local': 'దగ్గు, జలుబు / खांसी, जुकाम',
        'dosage_info': 'Adults: 10ml 3-4 times daily. Children: 5ml 3 times daily.',
        'side_effects': 'Drowsiness, dizziness',
        'warnings': 'May cause drowsiness. Avoid alcohol.',
        'category': 'Cough',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Sinarest',
        'name_generic': 'Paracetamol + Phenylephrine + Chlorpheniramine',
        'name_local': 'సైనారెస్ట్ / साइनारेस्ट',
        'brand_name': 'Sinarest',
        'manufacturer': 'Centaur Pharma',
        'medicine_type': 'tablet',
        'strength': '500mg + 10mg + 2mg',
        'pack_size': '10 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('32.00'),
        'composition': 'Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg',
        'uses': 'Cold, flu, headache, nasal congestion, body ache',
        'dosage_info': '1 tablet 3 times daily',
        'side_effects': 'Drowsiness, dry mouth, restlessness',
        'category': 'Cold',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # DIABETES
    # ==========================================================================
    {
        'name': 'Metformin 500mg',
        'name_generic': 'Metformin',
        'name_local': 'మెట్ఫార్మిన్ / मेटफॉर्मिन',
        'brand_name': 'Glycomet',
        'manufacturer': 'USV',
        'medicine_type': 'tablet',
        'strength': '500mg',
        'pack_size': '20 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('28.00'),
        'composition': 'Metformin Hydrochloride 500mg',
        'uses': 'Type 2 diabetes, blood sugar control',
        'uses_local': 'మధుమేహం, రక్తంలో చక్కెర / डायबिटीज, ब्लड शुगर',
        'dosage_info': '1 tablet twice daily with meals',
        'dosage_info_local': 'భోజనంతో రోజుకు 2 సార్లు 1 టాబ్లెట్ / भोजन के साथ दिन में 2 बार 1 गोली',
        'side_effects': 'Nausea, diarrhea, stomach upset, metallic taste',
        'warnings': 'Take with food to reduce stomach upset. Monitor blood sugar regularly.',
        'contraindications': 'Kidney disease, liver disease',
        'category': 'Antidiabetic',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Glimepiride 2mg',
        'name_generic': 'Glimepiride',
        'name_local': 'గ్లిమెపిరైడ్ / ग्लिमेपिराइड',
        'brand_name': 'Amaryl',
        'manufacturer': 'Sanofi',
        'medicine_type': 'tablet',
        'strength': '2mg',
        'pack_size': '15 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('105.00'),
        'composition': 'Glimepiride 2mg',
        'uses': 'Type 2 diabetes',
        'dosage_info': '1 tablet once daily with breakfast',
        'side_effects': 'Hypoglycemia, weight gain, nausea',
        'warnings': 'Take with food. Monitor for low blood sugar.',
        'category': 'Antidiabetic',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # BLOOD PRESSURE
    # ==========================================================================
    {
        'name': 'Amlodipine 5mg',
        'name_generic': 'Amlodipine',
        'name_local': 'అమ్లోడిపైన్ / एम्लोडिपिन',
        'brand_name': 'Amlip',
        'manufacturer': 'Cipla',
        'medicine_type': 'tablet',
        'strength': '5mg',
        'pack_size': '15 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('45.00'),
        'composition': 'Amlodipine Besylate 5mg',
        'uses': 'High blood pressure, chest pain (angina)',
        'uses_local': 'అధిక రక్తపోటు / उच्च रक्तचाप',
        'dosage_info': '1 tablet once daily',
        'dosage_info_local': 'రోజుకు 1 టాబ్లెట్ / दिन में 1 गोली',
        'side_effects': 'Swelling in ankles, dizziness, headache, flushing',
        'warnings': 'Do not stop suddenly. Take regularly even if you feel well.',
        'category': 'Antihypertensive',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Telmisartan 40mg',
        'name_generic': 'Telmisartan',
        'name_local': 'టెల్మిసార్టన్ / टेल्मिसार्टन',
        'brand_name': 'Telma',
        'manufacturer': 'Glenmark',
        'medicine_type': 'tablet',
        'strength': '40mg',
        'pack_size': '15 tablets',
        'prescription_type': 'prescription',
        'mrp': Decimal('135.00'),
        'composition': 'Telmisartan 40mg',
        'uses': 'High blood pressure, heart failure prevention',
        'dosage_info': '1 tablet once daily',
        'side_effects': 'Dizziness, back pain, diarrhea',
        'category': 'Antihypertensive',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # VITAMINS & SUPPLEMENTS
    # ==========================================================================
    {
        'name': 'Becosules Capsule',
        'name_generic': 'Vitamin B Complex + Vitamin C',
        'name_local': 'బెకోస్యూల్స్ / बीकोस्यूल्स',
        'brand_name': 'Becosules',
        'manufacturer': 'Pfizer',
        'medicine_type': 'capsule',
        'strength': 'Multi',
        'pack_size': '20 capsules',
        'prescription_type': 'otc',
        'mrp': Decimal('32.00'),
        'composition': 'Vitamin B1, B2, B3, B5, B6, B12, Folic Acid, Vitamin C',
        'uses': 'Vitamin deficiency, weakness, fatigue, mouth ulcers',
        'uses_local': 'విటమిన్ లోపం, బలహీనత / विटामिन की कमी, कमजोरी',
        'dosage_info': '1 capsule once daily',
        'side_effects': 'Usually well tolerated. May cause stomach upset.',
        'category': 'Vitamin',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Shelcal 500',
        'name_generic': 'Calcium + Vitamin D3',
        'name_local': 'షెల్కాల్ / शेल्कल',
        'brand_name': 'Shelcal',
        'manufacturer': 'Torrent Pharma',
        'medicine_type': 'tablet',
        'strength': '500mg + 250IU',
        'pack_size': '15 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('115.00'),
        'composition': 'Calcium Carbonate 1250mg (eq. to 500mg elemental Calcium) + Vitamin D3 250IU',
        'uses': 'Calcium deficiency, osteoporosis, bone health',
        'uses_local': 'కాల్షియం లోపం, ఎముకల ఆరోగ్యం / कैल्शियम की कमी, हड्डियों का स्वास्थ्य',
        'dosage_info': '1 tablet twice daily after meals',
        'side_effects': 'Constipation, stomach upset',
        'category': 'Vitamin',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Zincovit',
        'name_generic': 'Multivitamin + Multimineral',
        'name_local': 'జింకోవిట్ / ज़िंकोविट',
        'brand_name': 'Zincovit',
        'manufacturer': 'Apex Labs',
        'medicine_type': 'tablet',
        'strength': 'Multi',
        'pack_size': '15 tablets',
        'prescription_type': 'otc',
        'mrp': Decimal('75.00'),
        'composition': 'Vitamins A, B, C, D, E + Zinc, Iron, Calcium, Magnesium',
        'uses': 'General weakness, vitamin deficiency, immunity boosting',
        'dosage_info': '1 tablet once daily after food',
        'category': 'Vitamin',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # SKIN / TOPICAL
    # ==========================================================================
    {
        'name': 'Betadine Ointment',
        'name_generic': 'Povidone Iodine',
        'name_local': 'బెటాడిన్ / बेटाडीन',
        'brand_name': 'Betadine',
        'manufacturer': 'Win Medicare',
        'medicine_type': 'cream',
        'strength': '5%',
        'pack_size': '20g tube',
        'prescription_type': 'otc',
        'mrp': Decimal('52.00'),
        'composition': 'Povidone Iodine 5% w/w',
        'uses': 'Minor cuts, wounds, burns, skin infections',
        'uses_local': 'చిన్న గాయాలు, కాలిన గాయాలు / छोटे घाव, जले',
        'dosage_info': 'Apply on affected area 2-3 times daily',
        'side_effects': 'Skin irritation (rare)',
        'category': 'Antiseptic',
        'is_generic': False,
        'is_verified': True,
    },
    {
        'name': 'Soframycin Cream',
        'name_generic': 'Framycetin',
        'name_local': 'సోఫ్రామైసిన్ / सोफ्रामाइसिन',
        'brand_name': 'Soframycin',
        'manufacturer': 'Sanofi',
        'medicine_type': 'cream',
        'strength': '1%',
        'pack_size': '30g tube',
        'prescription_type': 'otc',
        'mrp': Decimal('78.00'),
        'composition': 'Framycetin Sulphate 1% w/w',
        'uses': 'Skin infections, wounds, burns, boils',
        'dosage_info': 'Apply on affected area 2-3 times daily',
        'category': 'Antibiotic',
        'subcategory': 'Topical',
        'is_generic': False,
        'is_verified': True,
    },
    # ==========================================================================
    # EYE DROPS
    # ==========================================================================
    {
        'name': 'Genteal Eye Drops',
        'name_generic': 'Hydroxypropyl Methylcellulose',
        'name_local': 'జెంటీల్ / जेंटील',
        'brand_name': 'Genteal',
        'manufacturer': 'Alcon',
        'medicine_type': 'drops',
        'strength': '0.3%',
        'pack_size': '10ml',
        'prescription_type': 'otc',
        'mrp': Decimal('145.00'),
        'composition': 'Hydroxypropyl Methylcellulose 0.3%',
        'uses': 'Dry eyes, eye lubrication',
        'uses_local': 'కంటి పొడిబారడం / आंखों का सूखापन',
        'dosage_info': '1-2 drops in affected eye as needed',
        'side_effects': 'Temporary blurred vision',
        'category': 'Eye',
        'is_generic': False,
        'is_verified': True,
    },
]


class Command(BaseCommand):
    help = 'Load sample medicines data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing medicines before loading',
        )

    def handle(self, *args, **options):
        if options.get('clear'):
            self.stdout.write('Clearing existing medicines...')
            Medicine.objects.all().delete()
        
        created_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for data in MEDICINES_DATA:
                medicine, created = Medicine.objects.update_or_create(
                    name=data['name'],
                    strength=data.get('strength', ''),
                    defaults=data
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        
        # Create alternatives for paracetamol medicines
        self._create_paracetamol_alternatives()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Medicines: {created_count} created, {updated_count} updated'
            )
        )
    
    def _create_paracetamol_alternatives(self):
        """Create alternatives for paracetamol medicines."""
        try:
            dolo = Medicine.objects.filter(name='Dolo 650').first()
            crocin = Medicine.objects.filter(name='Crocin 650').first()
            generic_para = Medicine.objects.filter(name='Paracetamol 500mg').first()
            
            if dolo and crocin:
                MedicineAlternative.objects.get_or_create(
                    medicine=dolo,
                    alternative=crocin,
                    defaults={
                        'similarity_score': 100,
                        'price_difference_percent': Decimal('8.33'),
                        'is_verified': True,
                    }
                )
                MedicineAlternative.objects.get_or_create(
                    medicine=crocin,
                    alternative=dolo,
                    defaults={
                        'similarity_score': 100,
                        'price_difference_percent': Decimal('-7.69'),
                        'is_verified': True,
                    }
                )
            
            if dolo and generic_para:
                MedicineAlternative.objects.get_or_create(
                    medicine=dolo,
                    alternative=generic_para,
                    defaults={
                        'similarity_score': 90,
                        'price_difference_percent': Decimal('-66.67'),
                        'notes': 'Generic alternative, lower strength',
                        'is_verified': True,
                    }
                )
            
            if crocin and generic_para:
                MedicineAlternative.objects.get_or_create(
                    medicine=crocin,
                    alternative=generic_para,
                    defaults={
                        'similarity_score': 90,
                        'price_difference_percent': Decimal('-69.23'),
                        'notes': 'Generic alternative, lower strength',
                        'is_verified': True,
                    }
                )
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Could not create alternatives: {e}')
            )