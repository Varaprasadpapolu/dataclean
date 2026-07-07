import re
import time
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
from utils.helper import app_logger

def clean_dataframe(df, options):
    """
    Clean a Pandas DataFrame based on user selected options.
    
    Parameters:
        df -- The source Pandas DataFrame.
        options -- A dictionary of cleaning options (boolean flags).
        
    Returns:
        df_cleaned -- The cleaned DataFrame.
        summary  -- A dictionary of statistics about the operations performed.
        removed_rows -- A list tracking every row removed during cleaning,
                        each entry contains the 1-based original row number
                        and optionally the value of an 'id' column if present.
    """
    start_time = time.time()
    
    df_cleaned = df.copy()
    
    # Original shape
    orig_rows, orig_cols = df_cleaned.shape
    
    # -----------------------------------------------------------------------
    # Removed-row tracking
    # Assign a stable integer index (0-based) representing the original
    # position of every row so we can track deletions across chained ops.
    # -----------------------------------------------------------------------
    df_cleaned = df_cleaned.reset_index(drop=True)
    
    # Detect whether an id column exists (case-insensitive lookup)
    id_col = None
    for col in df_cleaned.columns:
        if str(col).strip().lower() == 'id':
            id_col = col
            break
    
    # Preserve original id values keyed by 0-based row index for later lookup
    original_id_map = {}
    if id_col is not None:
        original_id_map = df_cleaned[id_col].to_dict()
    
    # Set to collect 0-based indices of every removed row
    removed_indices = set()
    
    # Stats tracking
    duplicates_removed = 0
    duplicate_cols_removed = 0
    empty_rows_removed = 0
    empty_cols_removed = 0
    null_rows_removed = 0
    missing_filled = 0
    cols_modified = set()
    data_types_fixed = 0
    outliers_handled = 0
    text_standardized = 0
    
    # Strip whitespace from column headers by default
    old_cols = list(df_cleaned.columns)
    df_cleaned.columns = [str(col).strip() for col in df_cleaned.columns]
    for c1, c2 in zip(old_cols, df_cleaned.columns):
        if c1 != c2:
            cols_modified.add(c1)

    #  Convert Column Names Casing
    if options.get('lowercase_cols', False):
        old_cols = list(df_cleaned.columns)
        df_cleaned.columns = [str(col).lower() for col in df_cleaned.columns]
        for c1, c2 in zip(old_cols, df_cleaned.columns):
            if c1 != c2:
                cols_modified.add(c1)
        app_logger.info("Converted column names to lowercase.")
        
    #  Replace Spaces with Underscores in Column Names
    if options.get('underscore_cols', False):
        old_cols = list(df_cleaned.columns)
        df_cleaned.columns = [str(col).replace(' ', '_') for col in df_cleaned.columns]
        for c1, c2 in zip(old_cols, df_cleaned.columns):
            if c1 != c2:
                cols_modified.add(c1)
        app_logger.info("Replaced spaces in column names with underscores.")

    #  Remove Special Characters from Column Names
    if options.get('clean_col_names', False):
        old_cols = list(df_cleaned.columns)
        # Keep only alphanumeric and underscores
        df_cleaned.columns = [re.sub(r'[^a-zA-Z0-9_]', '', str(col)) for col in df_cleaned.columns]
        for c1, c2 in zip(old_cols, df_cleaned.columns):
            if c1 != c2:
                cols_modified.add(c1)
        app_logger.info("Removed special characters from column names.")

    #  Remove Duplicate Columns
    if options.get('remove_duplicate_cols', False):
        # Identify duplicate columns (case sensitive name match or duplicate values)
        before_cols = df_cleaned.shape[1]
        
        # Method 1: Remove by column name
        df_cleaned = df_cleaned.loc[:, ~df_cleaned.columns.duplicated(keep='first')]
        
        # Method 2: Remove columns with identical values
        # We can transpose, drop duplicates, and transpose back, but only for hashable types
        # Let's keep it simple and drop by identical name first
        duplicate_cols_removed = before_cols - df_cleaned.shape[1]
        app_logger.info(f"Removed {duplicate_cols_removed} duplicate columns.")

    #  Remove Empty Columns (columns where all values are null/NaN)
    if options.get('remove_empty_cols', False):
        before_cols = df_cleaned.shape[1]
        df_cleaned = df_cleaned.dropna(how='all', axis=1)
        empty_cols_removed = before_cols - df_cleaned.shape[1]
        app_logger.info(f"Removed {empty_cols_removed} empty columns.")

    #  Remove Empty Rows (rows where all values are null/NaN)
    if options.get('remove_empty_rows', False):
        before_idx = set(df_cleaned.index)
        df_cleaned = df_cleaned.dropna(how='all', axis=0)
        dropped = before_idx - set(df_cleaned.index)
        removed_indices.update(dropped)
        empty_rows_removed = len(dropped)
        app_logger.info(f"Removed {empty_rows_removed} empty rows.")

    #    Remove Duplicate Rows
    if options.get('remove_duplicates', False):
        before_idx = set(df_cleaned.index)
        df_cleaned = df_cleaned.drop_duplicates()
        dropped = before_idx - set(df_cleaned.index)
        removed_indices.update(dropped)
        duplicates_removed = len(dropped)
        app_logger.info(f"Removed {duplicates_removed} duplicate rows.")

    #  Remove Null Values (rows with any null values)
    if options.get('remove_null_values', False):
        before_idx = set(df_cleaned.index)
        df_cleaned = df_cleaned.dropna(how='any', axis=0)
        dropped = before_idx - set(df_cleaned.index)
        removed_indices.update(dropped)
        null_rows_removed = len(dropped)
        app_logger.info(f"Removed {null_rows_removed} rows with null values.")

    # Helper function to check if string contains potential date format
    def is_date_col(series):
        if not (pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series)):
            return False
        # Drop nulls for checking
        non_nulls = series.dropna().head(10)
        if len(non_nulls) == 0:
            return False
        
        # Test if at least 70% of non-null values can be converted to dates
        converted_count = 0
        for val in non_nulls:
            try:
                # Basic string length filter to avoid parsing numbers like 100 as date
                if len(str(val)) >= 6:
                    pd.to_datetime(val, errors='raise')
                    converted_count += 1
            except (ValueError, TypeError, OverflowError):
                pass
        return (converted_count / len(non_nulls)) >= 0.7

    #  Convert Date Columns
    if options.get('convert_dates', False):
        for col in df_cleaned.columns:
            if is_date_col(df_cleaned[col]):
                try:
                    before_type = df_cleaned[col].dtype
                    # Standardize format as YYYY-MM-DD
                    parsed_dates = pd.to_datetime(df_cleaned[col], errors='coerce', format='mixed')
                    df_cleaned[col] = parsed_dates.dt.strftime('%Y-%m-%d')
                    data_types_fixed += 1
                    cols_modified.add(col)
                    app_logger.info(f"Converted column {col} to date.")
                except Exception as e:
                    app_logger.warning(f"Failed to convert column {col} to date: {e}")

    # 10. Trim Extra Spaces (strip whitespace) and Standardize Text Values
    trim_spaces = options.get('trim_spaces', False)
    standardize_text = options.get('standardize_text', False)
    remove_special_char = options.get('remove_special_char', False)
    
    if trim_spaces or standardize_text or remove_special_char:
        for col in df_cleaned.columns:
            # Only apply to string/object columns
            if pd.api.types.is_string_dtype(df_cleaned[col]) or pd.api.types.is_object_dtype(df_cleaned[col]):
                # Fill na temporarily with empty string to prevent errors
                temp_series = df_cleaned[col].fillna("").astype(str)
                
                # Check if values actually changed
                changed = False
                
                if trim_spaces:
                    # Strip leading, trailing, and reduce double spaces to single
                    temp_series = temp_series.str.strip().str.replace(r'\s+', ' ', regex=True)
                    changed = True
                    
                if remove_special_char:
                    # Keep alphanumeric, spaces, dashes, underscores, dots
                    temp_series = temp_series.apply(lambda x: re.sub(r'[^a-zA-Z0-9\s\-_.]', '', x))
                    changed = True
                    
                if standardize_text:
                    # Standardize to title case
                    temp_series = temp_series.str.title()
                    changed = True
                
                if changed:
                    # Restore original NaN positions
                    df_cleaned[col] = temp_series.where(df_cleaned[col].notna(), np.nan)
                    cols_modified.add(col)
                    text_standardized += 1
        app_logger.info("Trimmed whitespace / standardized text values.")

    #  Detect Incorrect Data Types & Optimize
    if options.get('detect_types', False):
        for col in df_cleaned.columns:
            # Skip if already optimal numeric/date
            if pd.api.types.is_numeric_dtype(df_cleaned[col]):
                continue
            
            # Try to convert object/string columns to numeric
            non_nulls = df_cleaned[col].dropna()
            if len(non_nulls) > 0:
                # Test numeric conversion
                try:
                    converted = pd.to_numeric(df_cleaned[col], errors='raise')
                    df_cleaned[col] = converted
                    data_types_fixed += 1
                    cols_modified.add(col)
                    app_logger.info(f"Automatically converted column {col} to numeric.")
                except (ValueError, TypeError):
                    pass

    #  Fill Missing Values
    if options.get('fill_missing', False):
        for col in df_cleaned.columns:
            null_count = df_cleaned[col].isna().sum()
            if null_count > 0:
                missing_filled += null_count
                cols_modified.add(col)
                
                if pd.api.types.is_numeric_dtype(df_cleaned[col]):
                    # Fill numeric with median
                    median_val = df_cleaned[col].median()
                    if pd.isna(median_val):  # If all are NaN
                        median_val = 0
                    df_cleaned[col] = df_cleaned[col].fillna(median_val)
                else:
                    # Fill string/categorical with empty string or mode
                    if not df_cleaned[col].mode().empty:
                        mode_val = df_cleaned[col].mode()[0]
                    else:
                        mode_val = ""
                    df_cleaned[col] = df_cleaned[col].fillna(mode_val)
        app_logger.info(f"Filled {missing_filled} missing values.")

    #  Handle Outliers (capping values based on 1.5 * IQR)
    if options.get('handle_outliers', False):
        for col in df_cleaned.columns:
            if pd.api.types.is_numeric_dtype(df_cleaned[col]):
                q1 = df_cleaned[col].quantile(0.25)
                q3 = df_cleaned[col].quantile(0.75)
                iqr = q3 - q1
                
                if iqr > 0:
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    
                    # Count values outside bounds
                    outliers_mask = (df_cleaned[col] < lower_bound) | (df_cleaned[col] > upper_bound)
                    outliers_count = outliers_mask.sum()
                    
                    if outliers_count > 0:
                        outliers_handled += outliers_count
                        # Cap values
                        df_cleaned[col] = np.clip(df_cleaned[col], lower_bound, upper_bound)
                        cols_modified.add(col)
                        app_logger.info(f"Capped {outliers_count} outliers in column {col}.")
                        
    # Reset DataFrame Index & Handle Infinite values
    # Always reset index and clean infinite values for a final sanitization
    df_cleaned = df_cleaned.reset_index(drop=True)
    
    # Replace infinite values with NaN so they are filled or handled safely
    inf_count = np.isinf(df_cleaned.select_dtypes(include=np.number)).values.sum()
    if inf_count > 0:
        df_cleaned = df_cleaned.replace([np.inf, -np.inf], np.nan)
        # Fill these nan
        df_cleaned = df_cleaned.fillna(0)
        app_logger.info(f"Replaced {inf_count} infinite values with 0.")
    
    # -----------------------------------------------------------------------
    # Build removed_rows report
    # Convert 0-based indices to 1-based row numbers for human readability.
    # Include original id values when an id column was detected.
    # -----------------------------------------------------------------------
    removed_rows = []
    for idx in sorted(removed_indices):
        entry = {"row_number": int(idx) + 1}  # 1-based original row number
        if id_col is not None and idx in original_id_map:
            raw_id = original_id_map[idx]
            # Safely serialise id value (convert numpy types to Python native)
            try:
                entry["id"] = raw_id.item() if hasattr(raw_id, 'item') else raw_id
            except Exception:
                entry["id"] = str(raw_id)
        removed_rows.append(entry)
    
    app_logger.info(f"Removed rows report: {len(removed_rows)} rows tracked.")

    # Final shape
    final_rows, final_cols = df_cleaned.shape
    
    processing_time = time.time() - start_time
    
    summary = {
        "original_rows": orig_rows,
        "original_columns": orig_cols,
        "final_rows": final_rows,
        "final_columns": final_cols,
        "duplicates_removed": int(duplicates_removed),
        "duplicate_cols_removed": int(duplicate_cols_removed),
        "empty_rows_removed": int(empty_rows_removed),
        "empty_columns_removed": int(empty_cols_removed),
        "null_rows_removed": int(null_rows_removed),
        "missing_values_filled": int(missing_filled),
        "columns_modified": list(cols_modified),
        "data_types_fixed": int(data_types_fixed),
        "outliers_handled": int(outliers_handled),
        "processing_time": float(f"{processing_time:.4f}")
    }
    
    return df_cleaned, summary, removed_rows
