import re
# pyrefly: ignore [missing-import]
import numpy as np
import pandas as pd
from psycopg2 import extras
from database.connection import DBConnectionContext
from utils.helper import app_logger

def sanitize_table_name(name):
    """Sanitize the table name to prevent SQL injection and comply with PostgreSQL rules."""
    # Remove all characters except alphanumeric and underscore
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '', name)
    # Ensure it starts with a letter or underscore
    if sanitized and sanitized[0].isdigit():
        sanitized = '_' + sanitized
    # Empty string fallback
    if not sanitized:
        sanitized = 'cleaned_dataset'
    # Truncate to PostgreSQL length limit (63 bytes)
    return sanitized.lower()[:63]

def map_dtype_to_postgres(col_name, series):
    """Map a Pandas Series dtype to a PostgreSQL data type."""
    col_type = series.dtype
    
    if pd.api.types.is_bool_dtype(series):
        return "BOOLEAN"
    elif pd.api.types.is_integer_dtype(series):
        # Determine size
        max_val = series.max()
        if pd.isna(max_val):
            return "INTEGER"
        if max_val > 2147483647:
            return "BIGINT"
        return "INTEGER"
    elif pd.api.types.is_numeric_dtype(series):
        return "DOUBLE PRECISION"
    elif pd.api.types.is_datetime64_any_dtype(series):
        return "TIMESTAMP"
    else:
        # Check if column values look like dates
        try:
            # Let's inspect string values
            non_nulls = series.dropna().head(1)
            if not non_nulls.empty:
                val_str = str(non_nulls.iloc[0]).strip()
                # Skip pure numbers to avoid Pandas converting them to epoch dates (e.g. 32.0 -> 1970-01-01)
                if not re.match(r'^-?\d+(\.\d+)?$', val_str):
                    pd.to_datetime(val_str, errors='raise')
                    # If parsed successfully, use TIMESTAMP or DATE
                    if len(val_str) <= 10:
                        return "DATE"
                    return "TIMESTAMP"
        except Exception:
            pass
        return "TEXT"

def create_table_from_df(cursor, table_name, df):
    """Generate SQL and create table based on DataFrame columns."""
    column_defs = []
    
    # Standardize column names for database (alphanumeric and underscores)
    db_columns = []
    for col in df.columns:
        col_str = str(col)
        # Sanitize column name
        col_clean = re.sub(r'[^a-zA-Z0-9_]', '', col_str).lower()
        if not col_clean or col_clean[0].isdigit():
            col_clean = 'col_' + col_clean
        db_columns.append(col_clean)
        
        pg_type = map_dtype_to_postgres(col_clean, df[col])
        column_defs.append(f'"{col_clean}" {pg_type}')
        
    column_defs_str = ", ".join(column_defs)
    
    # Drop table if exists
    cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE;')
    
    # Create new table
    create_sql = f'CREATE TABLE "{table_name}" ({column_defs_str});'
    app_logger.info(f"Executing SQL: {create_sql}")
    cursor.execute(create_sql)
    
    return db_columns

def save_df_to_postgres(df, raw_table_name):
    """
    Save the DataFrame to a PostgreSQL table.
    Drops the table if it already exists and creates a new one.
    """
    table_name = sanitize_table_name(raw_table_name)
    
    try:
        # Replace NumPy NaN/Inf with None for Postgres NULL values
        df_clean = df.copy()
        df_clean = df_clean.replace([np.inf, -np.inf], None)
        df_clean = df_clean.astype(object).where(pd.notnull(df_clean), None)
        
        with DBConnectionContext() as (conn, cursor):
            # 1. Create Table (using original df with correct types)
            db_columns = create_table_from_df(cursor, table_name, df)
            
            # 2. Fast Bulk Insert
            insert_query = f'INSERT INTO "{table_name}" ({", ".join([f"\"{col}\"" for col in db_columns])}) VALUES %s'
            
            # Convert rows to list of tuples
            records = [tuple(row) for row in df_clean.values]
            
            app_logger.info(f"Bulk inserting {len(records)} rows into {table_name}...")
            extras.execute_values(cursor, insert_query, records)
            
            app_logger.info(f"Successfully saved {len(records)} records into PostgreSQL table '{table_name}'.")
            
        return True, table_name, len(df_clean)
        
    except Exception as e:
        app_logger.error(f"Failed to save DataFrame to PostgreSQL: {e}")
        return False, str(e), 0
