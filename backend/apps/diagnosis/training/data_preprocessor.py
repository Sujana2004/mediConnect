"""
Data Preprocessor
=================
Clean and preprocess data for ML training.
"""

import re
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from sklearn.preprocessing import LabelEncoder
from ..utils.text_utils import TextUtils


class DataPreprocessor:
    """
    Preprocess medical data for ML training.
    
    Tasks:
    - Clean symptom/disease names
    - Encode labels
    - Create feature matrices
    - Handle missing values
    """
    
    def __init__(self):
        self.label_encoder = LabelEncoder()
        self.symptom_columns = []
        self.disease_labels = []
        self.text_utils = TextUtils()
    
    def clean_symptom_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean symptom column names.
        
        - Remove extra spaces
        - Standardize format
        """
        # Clean column names
        new_columns = []
        for col in df.columns:
            if col == 'prognosis':
                new_columns.append(col)
            else:
                # Clean the column name
                clean_name = TextUtils.symptom_to_code(col)
                new_columns.append(clean_name)
        
        df.columns = new_columns
        return df
    
    def clean_disease_names(self, df: pd.DataFrame, column: str = 'prognosis') -> pd.DataFrame:
        """
        Clean disease names in the target column.
        """
        if column in df.columns:
            df[column] = df[column].apply(TextUtils.clean_disease_name)
        return df
    
    def prepare_training_data(
        self, 
        df: pd.DataFrame,
        target_column: str = 'prognosis'
    ) -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
        """
        Prepare training data from raw DataFrame.
        
        Args:
            df: Raw training DataFrame
            target_column: Name of target/label column
            
        Returns:
            - X: Feature matrix (symptoms)
            - y: Encoded labels (diseases)
            - symptom_names: List of symptom column names
            - disease_names: List of disease names
        """
        # Clean the data
        df = self.clean_symptom_columns(df.copy())
        df = self.clean_disease_names(df, target_column)
        
        # Get feature columns (all except target)
        self.symptom_columns = [col for col in df.columns if col != target_column]
        
        # Get features
        X = df[self.symptom_columns].values.astype(np.float32)
        
        # Encode labels
        y_raw = df[target_column].values
        y = self.label_encoder.fit_transform(y_raw)
        
        # Store disease labels
        self.disease_labels = self.label_encoder.classes_.tolist()
        
        return X, y, self.symptom_columns, self.disease_labels
    
    def create_symptom_list(self, df: pd.DataFrame) -> List[Dict]:
        """
        Create a list of symptom dictionaries from Training.csv columns.
        
        Returns list of:
        {
            'code': 'itching',
            'name_english': 'Itching',
            'severity_weight': 1
        }
        """
        symptoms = []
        
        # Get symptom columns
        symptom_cols = [col for col in df.columns if col != 'prognosis']
        
        for col in symptom_cols:
            code = TextUtils.symptom_to_code(col)
            name = TextUtils.code_to_display_name(code)
            
            symptoms.append({
                'code': code,
                'name_english': name,
                'severity_weight': 1  # Default, will be updated from severity file
            })
        
        return symptoms
    
    def create_disease_list(
        self, 
        training_df: pd.DataFrame,
        description_df: Optional[pd.DataFrame] = None,
        precaution_df: Optional[pd.DataFrame] = None
    ) -> List[Dict]:
        """
        Create a list of disease dictionaries.
        
        Returns list of:
        {
            'code': 'fungal_infection',
            'name_english': 'Fungal Infection',
            'description': '...',
            'precautions': ['...', '...']
        }
        """
        # Get unique diseases
        diseases_raw = training_df['prognosis'].unique() if 'prognosis' in training_df.columns else []
        
        # Create description map
        desc_map = {}
        if description_df is not None and 'Disease' in description_df.columns:
            for _, row in description_df.iterrows():
                disease_name = row['Disease'].strip()
                desc = row.get('Description', '')
                if pd.notna(desc):
                    desc_map[disease_name.lower()] = str(desc).strip()
        
        # Create precaution map
        precaution_map = {}
        if precaution_df is not None and 'Disease' in precaution_df.columns:
            for _, row in precaution_df.iterrows():
                disease_name = row['Disease'].strip()
                precautions = []
                for i in range(1, 5):
                    col = f'Precaution_{i}'
                    if col in row and pd.notna(row[col]):
                        p = str(row[col]).strip()
                        if p:
                            precautions.append(p)
                precaution_map[disease_name.lower()] = precautions
        
        # Create disease list
        diseases = []
        for disease_raw in diseases_raw:
            disease_clean = TextUtils.clean_disease_name(disease_raw)
            code = TextUtils.disease_to_code(disease_raw)
            
            # Look up description and precautions
            lookup_key = disease_raw.lower().strip()
            description = desc_map.get(lookup_key, '')
            precautions = precaution_map.get(lookup_key, [])
            
            diseases.append({
                'code': code,
                'name_english': disease_clean,
                'description': description,
                'precaution_1': precautions[0] if len(precautions) > 0 else '',
                'precaution_2': precautions[1] if len(precautions) > 1 else '',
                'precaution_3': precautions[2] if len(precautions) > 2 else '',
                'precaution_4': precautions[3] if len(precautions) > 3 else '',
            })
        
        return diseases
    
    def create_disease_symptom_mappings(
        self, 
        df: pd.DataFrame
    ) -> List[Dict]:
        """
        Create disease-symptom mappings from training data.
        
        For each disease, calculate the probability of each symptom
        (percentage of disease cases that have that symptom).
        
        Returns list of:
        {
            'disease_code': 'fungal_infection',
            'symptom_code': 'itching',
            'weight': 0.95,  # 95% of fungal infection cases have itching
            'is_primary': True  # If weight > 0.7
        }
        """
        mappings = []
        
        # Get symptom columns
        symptom_cols = [col for col in df.columns if col != 'prognosis']
        
        # Group by disease and calculate mean (probability) for each symptom
        grouped = df.groupby('prognosis')[symptom_cols].mean()
        
        for disease_raw in grouped.index:
            disease_code = TextUtils.disease_to_code(disease_raw)
            
            for symptom_col in symptom_cols:
                prob = grouped.loc[disease_raw, symptom_col]
                
                # Only create mapping if probability > 0
                if prob > 0:
                    symptom_code = TextUtils.symptom_to_code(symptom_col)
                    
                    mappings.append({
                        'disease_code': disease_code,
                        'symptom_code': symptom_code,
                        'weight': round(float(prob), 4),
                        'is_primary': prob >= 0.7  # Primary if 70%+ cases have it
                    })
        
        return mappings
    
    def prepare_nlp_training_data(
        self, 
        symptom2disease_df: pd.DataFrame
    ) -> List[Dict]:
        """
        Prepare NLP training data from Symptom2Disease.csv.
        
        Returns list of:
        {
            'text': 'I have been experiencing skin rash...',
            'disease': 'Psoriasis',
            'disease_code': 'psoriasis'
        }
        """
        samples = []
        
        if symptom2disease_df is None:
            return samples
        
        for _, row in symptom2disease_df.iterrows():
            text = row.get('text', '')
            label = row.get('label', '')
            
            if pd.notna(text) and pd.notna(label):
                text = str(text).strip()
                label = str(label).strip()
                
                if text and label:
                    samples.append({
                        'text': text,
                        'disease': label,
                        'disease_code': TextUtils.disease_to_code(label)
                    })
        
        return samples
    
    def get_symptom_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Get statistics for each symptom.
        
        Returns DataFrame with:
        - symptom: symptom code
        - frequency: how many samples have this symptom
        - percentage: percentage of samples with this symptom
        """
        symptom_cols = [col for col in df.columns if col != 'prognosis']
        
        stats = []
        total_samples = len(df)
        
        for col in symptom_cols:
            freq = df[col].sum()
            pct = (freq / total_samples) * 100
            
            stats.append({
                'symptom': TextUtils.symptom_to_code(col),
                'frequency': int(freq),
                'percentage': round(pct, 2)
            })
        
        return pd.DataFrame(stats).sort_values('frequency', ascending=False)
    
    def get_disease_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Get statistics for each disease.
        
        Returns DataFrame with:
        - disease: disease name
        - count: number of samples
        - percentage: percentage of total
        """
        if 'prognosis' not in df.columns:
            return pd.DataFrame()
        
        counts = df['prognosis'].value_counts()
        total = len(df)
        
        stats = []
        for disease, count in counts.items():
            stats.append({
                'disease': disease,
                'disease_code': TextUtils.disease_to_code(disease),
                'count': count,
                'percentage': round((count / total) * 100, 2)
            })
        
        return pd.DataFrame(stats)