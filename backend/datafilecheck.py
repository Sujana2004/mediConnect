import pandas as pd

files_to_check = [
    'data/cleaned_dataset.csv',
    'data/Company_Name(Sheet1).csv',
    'data/drugsComTest_raw.csv',
    'data/healthcare_data.csv',
    'data/indian_medicine_head_quarters_hospitals_and_bed_strength_2020.csv',
    'data/mtsamples.csv',
    'data/State_or_System-wise_No_of_Hospitals_and_Dispensaries_under_Modern_System_and_ISMH(Hospitals & Dispensaries - Mode).csv',
    'data/Training.csv',
    'data/Testing.csv',
    'data/Disease and symptoms dataset.csv',
    'data/Symptom2Disease.csv',
    'data/symptom_Description.csv',
    'data/symptom_precaution.csv',
    'data/Symptom-severity.csv',
    'data/indian_medicine_data.csv',
]

for file in files_to_check:
    try:
        df = pd.read_csv(file, nrows=2)
        print(f"\n{'='*60}")
        print(f"📊 {file.split('/')[-1]}")
        print(f"{'='*60}")
        print(f"Columns: {list(df.columns)}")
        print(f"\nSample Row 1:")
        for col in df.columns[:8]:
            print(f"   {col}: {df.iloc[0][col]}")
    except Exception as e:
        print(f"\n❌ {file}: {e}")