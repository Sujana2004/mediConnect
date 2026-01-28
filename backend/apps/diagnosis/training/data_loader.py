"""
Data Loader
===========
Load and parse CSV datasets for training and database population.
"""

import os
import pandas as pd
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from django.conf import settings


class DataLoader:
    """
    Load medical datasets from CSV files.
    
    Expected files in backend/data/:
    - Training.csv: Symptom binary columns + prognosis (disease)
    - Testing.csv: Same format as Training.csv
    - Symptom-severity.csv: Symptom weights
    - symptom_Description.csv: Disease descriptions
    - symptom_precaution.csv: Disease precautions
    - Symptom2Disease.csv: Text descriptions mapped to diseases
    - cleaned_dataset.csv: Alternative format with symptom columns
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize DataLoader.
        
        Args:
            data_dir: Path to data directory. Defaults to backend/data/
        """
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            # Default to backend/data/
            self.data_dir = Path(settings.BASE_DIR) / 'data'
        
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {self.data_dir}")
    
    def _load_csv(self, filename: str, **kwargs) -> Optional[pd.DataFrame]:
        """
        Load a CSV file with error handling.
        
        Args:
            filename: Name of CSV file
            **kwargs: Additional arguments for pd.read_csv
            
        Returns:
            DataFrame or None if file doesn't exist
        """
        filepath = self.data_dir / filename
        
        if not filepath.exists():
            print(f"⚠️ Warning: File not found: {filepath}")
            return None
        
        try:
            # Try different encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(filepath, encoding=encoding, **kwargs)
                    print(f"✅ Loaded {filename}: {len(df)} rows")
                    return df
                except UnicodeDecodeError:
                    continue
            
            print(f"❌ Failed to load {filename}: encoding error")
            return None
            
        except Exception as e:
            print(f"❌ Error loading {filename}: {e}")
            return None
    
    def load_training_data(self) -> Optional[pd.DataFrame]:
        """
        Load Training.csv
        
        Returns DataFrame with:
        - 132 symptom columns (binary 0/1)
        - 'prognosis' column (disease name)
        """
        df = self._load_csv('Training.csv')
        
        if df is not None:
            # Clean column names
            df.columns = df.columns.str.strip()
            
            # Remove unnamed columns
            df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
            
        return df
    
    def load_testing_data(self) -> Optional[pd.DataFrame]:
        """Load Testing.csv (same format as Training.csv)"""
        df = self._load_csv('Testing.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
            
        return df
    
    def load_symptom_severity(self) -> Optional[pd.DataFrame]:
        """
        Load Symptom-severity.csv
        
        Returns DataFrame with:
        - 'Symptom': symptom name
        - 'weight': severity weight (1-7)
        """
        df = self._load_csv('Symptom-severity.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            # Ensure weight is integer
            if 'weight' in df.columns:
                df['weight'] = df['weight'].astype(int)
                
        return df
    
    def load_disease_descriptions(self) -> Optional[pd.DataFrame]:
        """
        Load symptom_Description.csv
        
        Returns DataFrame with:
        - 'Disease': disease name
        - 'Description': disease description
        """
        df = self._load_csv('symptom_Description.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            
        return df
    
    def load_disease_precautions(self) -> Optional[pd.DataFrame]:
        """
        Load symptom_precaution.csv
        
        Returns DataFrame with:
        - 'Disease': disease name
        - 'Precaution_1' to 'Precaution_4': precaution texts
        """
        df = self._load_csv('symptom_precaution.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            
        return df
    
    def load_symptom2disease(self) -> Optional[pd.DataFrame]:
        """
        Load Symptom2Disease.csv
        
        Returns DataFrame with:
        - 'label': disease name
        - 'text': natural language symptom description
        
        This is useful for training NLP models.
        """
        df = self._load_csv('Symptom2Disease.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            # Remove index column if present
            if 'Unnamed: 0' in df.columns:
                df = df.drop('Unnamed: 0', axis=1)
                
        return df
    
    def load_cleaned_dataset(self) -> Optional[pd.DataFrame]:
        """
        Load cleaned_dataset.csv
        
        Returns DataFrame with:
        - 'Disease': disease name
        - 'Symptom_1' to 'Symptom_17': symptom names
        - 'weight' columns: symptom weights
        - 'Total_Severity': total severity score
        """
        df = self._load_csv('cleaned_dataset.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            
        return df
    
    def load_disease_symptoms_large(self) -> Optional[pd.DataFrame]:
        """
        Load 'Disease and symptoms dataset.csv' (large dataset)
        
        Returns DataFrame with:
        - 'diseases': disease name
        - 300+ symptom columns (binary 0/1)
        """
        df = self._load_csv('Disease and symptoms dataset.csv')
        
        if df is not None:
            df.columns = df.columns.str.strip()
            
        return df
    
    def get_all_symptoms_from_training(self) -> List[str]:
        """
        Extract all unique symptom names from Training.csv columns.
        
        Returns list of symptom codes (column names except 'prognosis')
        """
        df = self.load_training_data()
        
        if df is None:
            return []
        
        # Get all columns except prognosis
        symptom_columns = [col for col in df.columns if col != 'prognosis']
        
        return symptom_columns
    
    def get_all_diseases_from_training(self) -> List[str]:
        """
        Extract all unique disease names from Training.csv.
        
        Returns list of unique disease names.
        """
        df = self.load_training_data()
        
        if df is None:
            return []
        
        if 'prognosis' not in df.columns:
            print("⚠️ 'prognosis' column not found in Training.csv")
            return []
        
        diseases = df['prognosis'].unique().tolist()
        return diseases
    
    def get_symptom_severity_map(self) -> Dict[str, int]:
        """
        Get mapping of symptom code -> severity weight.
        
        Returns dict like {'itching': 1, 'skin_rash': 3, ...}
        """
        df = self.load_symptom_severity()
        
        if df is None:
            return {}
        
        severity_map = {}
        for _, row in df.iterrows():
            symptom = row['Symptom'].strip().lower().replace(' ', '_')
            weight = int(row['weight'])
            severity_map[symptom] = weight
        
        return severity_map
    
    def get_disease_description_map(self) -> Dict[str, str]:
        """
        Get mapping of disease name -> description.
        
        Returns dict like {'Drug Reaction': 'An adverse drug reaction...', ...}
        """
        df = self.load_disease_descriptions()
        
        if df is None:
            return {}
        
        desc_map = {}
        for _, row in df.iterrows():
            disease = row['Disease'].strip()
            description = row['Description'].strip() if pd.notna(row['Description']) else ''
            desc_map[disease] = description
        
        return desc_map
    
    def get_disease_precautions_map(self) -> Dict[str, List[str]]:
        """
        Get mapping of disease name -> list of precautions.
        
        Returns dict like {'Drug Reaction': ['stop irritation', 'consult hospital', ...], ...}
        """
        df = self.load_disease_precautions()
        
        if df is None:
            return {}
        
        precautions_map = {}
        for _, row in df.iterrows():
            disease = row['Disease'].strip()
            precautions = []
            
            for i in range(1, 5):
                col = f'Precaution_{i}'
                if col in row and pd.notna(row[col]):
                    precaution = str(row[col]).strip()
                    if precaution:
                        precautions.append(precaution)
            
            precautions_map[disease] = precautions
        
        return precautions_map
    
    def get_disease_symptom_matrix(self) -> Tuple[pd.DataFrame, List[str], List[str]]:
        """
        Get disease-symptom matrix from Training.csv.
        
        Returns:
        - DataFrame: symptoms as columns, diseases as aggregated rows
        - List[str]: symptom names
        - List[str]: disease names
        """
        df = self.load_training_data()
        
        if df is None:
            return pd.DataFrame(), [], []
        
        # Get symptom columns
        symptom_columns = [col for col in df.columns if col != 'prognosis']
        
        # Group by disease and get mean (probability) of each symptom
        disease_symptom_df = df.groupby('prognosis')[symptom_columns].mean()
        
        diseases = disease_symptom_df.index.tolist()
        symptoms = symptom_columns
        
        return disease_symptom_df, symptoms, diseases
    
    def get_training_data_prepared(self) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Get training data in X, y format ready for ML.
        
        Returns:
        - X: DataFrame with symptom features
        - y: Series with disease labels
        """
        df = self.load_training_data()
        
        if df is None:
            return pd.DataFrame(), pd.Series()
        
        # Features (all columns except prognosis)
        symptom_columns = [col for col in df.columns if col != 'prognosis']
        X = df[symptom_columns]
        
        # Target
        y = df['prognosis']
        
        return X, y
    
    def load_indian_medicine_data(self) -> Optional[pd.DataFrame]:
        """
        Load indian_medicine_data.csv for medicine app.
        
        Returns DataFrame with medicine information.
        """
        return self._load_csv('indian_medicine_data.csv')
    
    def print_data_summary(self):
        """Print summary of all available datasets."""
        print("\n" + "="*60)
        print("📊 DATASET SUMMARY")
        print("="*60)
        
        # Training data
        df = self.load_training_data()
        if df is not None:
            symptoms = [c for c in df.columns if c != 'prognosis']
            diseases = df['prognosis'].nunique() if 'prognosis' in df.columns else 0
            print(f"\n✅ Training.csv:")
            print(f"   - {len(df)} samples")
            print(f"   - {len(symptoms)} symptoms")
            print(f"   - {diseases} diseases")
        
        # Symptom severity
        df = self.load_symptom_severity()
        if df is not None:
            print(f"\n✅ Symptom-severity.csv:")
            print(f"   - {len(df)} symptoms with severity weights")
            print(f"   - Weight range: {df['weight'].min()} to {df['weight'].max()}")
        
        # Disease descriptions
        df = self.load_disease_descriptions()
        if df is not None:
            print(f"\n✅ symptom_Description.csv:")
            print(f"   - {len(df)} disease descriptions")
        
        # Disease precautions
        df = self.load_disease_precautions()
        if df is not None:
            print(f"\n✅ symptom_precaution.csv:")
            print(f"   - {len(df)} diseases with precautions")
        
        # Symptom2Disease
        df = self.load_symptom2disease()
        if df is not None:
            print(f"\n✅ Symptom2Disease.csv:")
            print(f"   - {len(df)} text samples for NLP training")
            print(f"   - {df['label'].nunique()} unique diseases")
        
        print("\n" + "="*60)


# Convenience function
def get_data_loader() -> DataLoader:
    """Get a DataLoader instance with default settings."""
    return DataLoader()