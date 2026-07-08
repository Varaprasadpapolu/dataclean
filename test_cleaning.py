import os
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
from services.cleaning_service import clean_dataframe
from services.postgres_service import save_df_to_postgres
from database.connection import DatabaseConnectionPool, DBConnectionContext

def run_tests():
    print("=== STARTING DATA CLEANING UNIT TESTS ===")
    
    # 1. Generate dirty mock dataset
    data = {
        ' First Name ': [' John  ', ' Alice ', ' John  ', 'Bob', ' Charlie ', np.nan],
        'email address!': ['john@example.com', 'alice@example.com', 'john@example.com', 'bob@example.com', 'charlie@example.com', 'unknown@email.com'],
        'age': [32, 28, 32, 45, 150, 40], # 150 is an outlier
        'Salary': [50000.0, 60000.0, 50000.0, np.nan, 80000.0, 55000.0],
        'join_date': ['2024-01-15', '2023/05/20', '2024-01-15', '06-12-2022', '2021.11.02', np.nan]
    }
    
    df = pd.DataFrame(data)
    
    # Add an entirely duplicate row (row 2 matches row 0)
    df.loc[len(df)] = [' John  ', 'john@example.com', 32, 50000.0, '2024-01-15']
    
    print("\nOriginal DataFrame:")
    print(df)
    print(f"Original shape: {df.shape}")
    
    # 2. Select options
    options = {
        'remove_duplicates': True,
        'remove_empty_rows': True,
        'remove_null_values': False, # Keep rows with individual nulls
        'remove_duplicate_cols': True,
        'remove_empty_cols': True,
        'lowercase_cols': True,
        'underscore_cols': True,
        'clean_col_names': True,
        'trim_spaces': True,
        'fill_missing': True,
        'detect_types': True,
        'convert_dates': True,
        'handle_outliers': True,
        'standardize_text': True,
        'remove_special_char': False
    }
    
    # 3. Clean
    print("\nCleaning DataFrame...")
    df_cleaned, summary, removed_rows = clean_dataframe(df, options)
    
    print("\nCleaned DataFrame:")
    print(df_cleaned)
    print(f"Cleaned shape: {df_cleaned.shape}")
    
    print("\nCleaning Summary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")
        
    # Assertions
    assert summary['original_rows'] == 7, "Original rows count incorrect"
    assert summary['final_rows'] == 5, "Final rows count incorrect (duplicates not removed)"
    assert summary['duplicates_removed'] == 2, "Duplicates removed count incorrect"
    assert summary['missing_values_filled'] == 3, "Missing values filled count incorrect"
    assert 'first_name' in df_cleaned.columns, "Column renaming (lowercase/underscore/clean) failed"
    assert df_cleaned['age'].max() < 100, "Outlier handling capping failed"
    
    # Assert string trimming works
    assert not df_cleaned['first_name'].str.startswith(' ').any(), "First name still starts with space"
    assert not df_cleaned['first_name'].str.endswith(' ').any(), "First name still ends with space"
    
    # Assert date formatting works
    assert df_cleaned['join_date'].iloc[1] == '2023-05-20', f"Date conversion failed: {df_cleaned['join_date'].iloc[1]}"
    assert df_cleaned['join_date'].iloc[3] == '2021-11-02', f"Date conversion failed: {df_cleaned['join_date'].iloc[3]}"
    
    print("\n[OK] Pandas Cleaning Logic Tests PASSED!")
    
    # 4. Test PostgreSQL integration
    print("\nTesting PostgreSQL Save...")
    try:
        # Initialize pool
        DatabaseConnectionPool.initialize()
        
        # Save mock clean data to DB
        success, tbl_name, inserted = save_df_to_postgres(df_cleaned, "test_cleaned_table")
        
        if success:
            print(f"[OK] Successfully saved data to PostgreSQL table '{tbl_name}'!")
            
            # Query back to verify
            with DBConnectionContext() as (conn, cursor):
                cursor.execute(f'SELECT count(*) FROM "{tbl_name}";')
                count = cursor.fetchone()[0]
                print(f"Read back from PostgreSQL: {count} rows")
                assert count == inserted, "Rows count mismatch after database read back"
                
                # Cleanup table
                cursor.execute(f'DROP TABLE "{tbl_name}";')
                print("Cleanup: dropped test table.")
            print("[OK] PostgreSQL Integration Tests PASSED!")
        else:
            print(f"[FAIL] PostgreSQL save failed: {tbl_name}")
            
    except Exception as e:
        print(f"[FAIL] PostgreSQL Test failed: {e}")
        
    print("\n=== ALL UNIT TESTS COMPLETED ===")

if __name__ == '__main__':
    run_tests()
