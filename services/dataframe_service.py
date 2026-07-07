import os
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
from utils.helper import app_logger

def load_file(file_path):
    """Load a CSV or Excel file into a Pandas DataFrame."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at: {file_path}")
        
    ext = file_path.rsplit('.', 1)[1].lower()
    
    try:
        if ext == 'csv':
            # Attempt UTF-8 first, fallback to latin1 or cp1252 if there are encoding errors
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin1')
        elif ext in ['xls', 'xlsx']:
            df = pd.read_excel(file_path, engine='openpyxl')
        else:
            raise ValueError(f"Unsupported file format: .{ext}")
            
        app_logger.info(f"Successfully loaded file {file_path} into DataFrame. Shape: {df.shape}")
        return df
    except Exception as e:
        app_logger.error(f"Error loading file {file_path}: {e}")
        raise

def get_preview(df, max_rows=15):
    """Prepare a JSON-serializable preview structure from DataFrame."""
    # Replace NaN/NaT/Inf with None so it serializes to null in JSON
    df_clean = df.copy()
    
    # Standardize column names to strings
    df_clean.columns = [str(col) for col in df_clean.columns]
    
    # Handle NaNs and Infinite values before serialization
    df_clean = df_clean.replace([np.inf, -np.inf], None)
    
    # Use where-based replace or fillna to make sure NaN is None
    # In newer Pandas version, fillna(np.nan).astype(object).where(pd.notnull(df), None) works well
    df_clean = df_clean.astype(object).where(pd.notnull(df_clean), None)
    
    preview_rows = df_clean.head(max_rows).values.tolist()
    columns = list(df_clean.columns)
    
    return {
        "columns": columns,
        "rows": preview_rows,
        "total_records": len(df)
    }

def optimize_types(df):
    """Optimize memory footprint of DataFrame by downcasting numeric types."""
    df_opt = df.copy()
    
    # Reset index if there are duplicate or complex index structures
    if df_opt.index.name or len(df_opt.index) > 0:
        df_opt = df_opt.reset_index(drop=True)
        
    for col in df_opt.columns:
        col_type = df_opt[col].dtype
        
        # Numeric downcasting
        if np.issubdtype(col_type, np.integer):
            df_opt[col] = pd.to_numeric(df_opt[col], downcast='integer')
        elif np.issubdtype(col_type, np.floating):
            df_opt[col] = pd.to_numeric(df_opt[col], downcast='float')
            
        # Object conversion to category if low cardinality
        elif col_type == object or isinstance(col_type, pd.CategoricalDtype):
            try:
                num_unique = df_opt[col].nunique()
                num_total = len(df_opt)
                if num_total > 0 and (num_unique / num_total) < 0.3:
                    # Convert to category only if categories < 30% of total rows
                    df_opt[col] = df_opt[col].astype('category')
            except Exception:
                pass
                
    return df_opt

def save_dataframe_to_csv(df, file_path):
    """Save a DataFrame as CSV."""
    try:
        df.to_csv(file_path, index=False, encoding='utf-8')
        app_logger.info(f"Successfully saved DataFrame to {file_path}")
    except Exception as e:
        app_logger.error(f"Error saving DataFrame to {file_path}: {e}")
        raise
