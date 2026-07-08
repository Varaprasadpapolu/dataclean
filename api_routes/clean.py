import os
# pyrefly: ignore [missing-import]
from flask import request
# pyrefly: ignore [missing-import]
from flask_restful import Resource
from config import Config
from utils.helper import get_file_metadata, update_file_metadata, app_logger
from services.dataframe_service import load_file, save_dataframe_to_csv, get_preview
from services.cleaning_service import clean_dataframe
from database.queries import log_cleaning_history

class CleanAPI(Resource):
    """API Resource to clean the uploaded dataset."""
    
    def post(self):
        data = request.get_json() or {}
        file_id = data.get('file_id')
        options = data.get('options', {})
        
        if not file_id:
            return {'error': 'Missing file_id in request'}, 400
            
      
        metadata = get_file_metadata(file_id)
        if not metadata:
            return {'error': 'File not found or session expired'}, 404
            
        saved_path = metadata.get('saved_path')
        if not saved_path or not os.path.exists(saved_path):
            return {'error': 'Source file not found on disk'}, 404
            
        try:
            #  Load DataFrame
            df = load_file(saved_path)
            
            #  Perform Cleaning Operations
            df_cleaned, summary, removed_rows = clean_dataframe(df, options)
            
            # 4. Save cleaned file as CSV
            cleaned_filename = f"{file_id}.csv"
            cleaned_path = os.path.join(Config.CLEANED_FOLDER, cleaned_filename)
            save_dataframe_to_csv(df_cleaned, cleaned_path)
            
            # Create friendly copy for workspace display
            orig_name = metadata.get('original_filename', 'data.csv')
            base_name = orig_name.rsplit('.', 1)[0]
            friendly_filename = f"{base_name}.csv"
            friendly_path = os.path.join(Config.CLEANED_FOLDER, friendly_filename)
            save_dataframe_to_csv(df_cleaned, friendly_path)
            
            # Get cleaned file size
            cleaned_size = os.path.getsize(cleaned_path)
            
            #  Log history to PostgreSQL
            log_cleaning_history(
                filename=metadata.get('original_filename'),
                orig_rows=summary['original_rows'],
                orig_cols=summary['original_columns'],
                clean_rows=summary['final_rows'],
                clean_cols=summary['final_columns'],
                proc_time=summary['processing_time']
            )
            
            #  Update Metadata
            updates = {
                'cleaned_filename': cleaned_filename,
                'cleaned_path': cleaned_path,
                'cleaned_size_bytes': cleaned_size,
                'cleaned_rows': summary['final_rows'],
                'cleaned_cols': summary['final_columns'],
                'summary': summary,
                'status': 'cleaned'
            }
            update_file_metadata(file_id, updates)
            
            #  Generate Data Preview
            preview_data = get_preview(df_cleaned, max_rows=15)
            preview_data['page'] = 1
            preview_data['limit'] = 15
            preview_data['total_pages'] = max(1, (summary['final_rows'] + 14) // 15)
            
            return {
                'message': 'Data cleaned successfully',
                'summary': summary,
                'removed_rows': removed_rows,
                'preview': preview_data
            }, 200
            
        except Exception as e:
            app_logger.error(f"Error during data cleaning for file {file_id}: {e}", exc_info=True)
            return {'error': f"Failed to clean data: {str(e)}"}, 500
