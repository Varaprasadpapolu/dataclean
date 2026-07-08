import os
# pyrefly: ignore [missing-import]
from flask import request
# pyrefly: ignore [missing-import]
from flask_restful import Resource
from utils.helper import get_file_metadata, app_logger
from services.dataframe_service import load_file
from services.postgres_service import save_df_to_postgres

class SaveDBAPI(Resource):
    """API Resource to save cleaned dataset into PostgreSQL."""
    
    def post(self):
        data = request.get_json() or {}
        file_id = data.get('file_id')
        table_name = data.get('table_name', '').strip()
        
        if not file_id:
            return {'error': 'Missing file_id parameter'}, 400
        if not table_name:
            return {'error': 'Missing table_name parameter'}, 400
            
        #  Fetch file metadata
        metadata = get_file_metadata(file_id)
        if not metadata:
            return {'error': 'File not found or session expired'}, 404
            
        # Prefer cleaned data for database saving
        file_path = metadata.get('cleaned_path') or metadata.get('saved_path')
        if not file_path or not os.path.exists(file_path):
            return {'error': 'Cleaned file not found on disk. Clean the file first.'}, 404
            
        try:
            #  Load DataFrame
            df = load_file(file_path)
            
            #  Save to PostgreSQL
            success, result_message, rows_inserted = save_df_to_postgres(df, table_name)
            
            if success:
                app_logger.info(f"Saved {rows_inserted} rows of file {file_id} to table '{result_message}' in PostgreSQL.")
                return {
                    'message': f"Data saved successfully to table '{result_message}'",
                    'table_name': result_message,
                    'rows_saved': rows_inserted
                }, 200
            else:
                return {'error': f"Failed to save to PostgreSQL: {result_message}"}, 500
                
        except Exception as e:
            app_logger.error(f"Error during save to PostgreSQL: {e}")
            return {'error': f"Failed to save data: {str(e)}"}, 500
