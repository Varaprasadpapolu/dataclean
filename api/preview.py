import os
import pandas as pd
# pyrefly: ignore [missing-import]
from flask import request
# pyrefly: ignore [missing-import]
from flask_restful import Resource
from utils.helper import get_file_metadata, app_logger
from services.dataframe_service import load_file, get_preview

class PreviewAPI(Resource):
    """API Resource to retrieve preview of original or cleaned datasets with pagination, search, and sorting."""
    
    def get(self):
        file_id = request.args.get('file_id')
        search = request.args.get('search', '').strip()
        sort_col = request.args.get('sort_col')
        sort_dir = request.args.get('sort_dir', 'asc').lower()
        
        try:
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 15))
        except ValueError:
            page = 1
            limit = 15
            
        if not file_id:
            return {'error': 'Missing file_id parameter'}, 400
            
        #  Fetch metadata
        metadata = get_file_metadata(file_id)
        if not metadata:
            return {'error': 'File not found or session expired'}, 404
            
        # Prefer cleaned file if it exists, otherwise fall back to original uploaded file
        file_path = metadata.get('cleaned_path') or metadata.get('saved_path')
        if not file_path or not os.path.exists(file_path):
            return {'error': 'Data file not found on disk'}, 404
            
        try:
            #  Load DataFrame
            df = load_file(file_path)
            
            #  Apply Search Filter
            if search:
                # Build boolean mask for rows containing search string
                # We cast to string and search case-insensitively
                mask = pd.Series(False, index=df.index)
                for col in df.columns:
                    mask = mask | df[col].astype(str).str.contains(search, case=False, na=False)
                df = df[mask]
                
            total_records = len(df)
            
            # Apply Sorting
            if sort_col and sort_col in df.columns:
                ascending = (sort_dir == 'asc')
                df = df.sort_values(by=sort_col, ascending=ascending)
                
            #  Apply Pagination
            start_row = (page - 1) * limit
            end_row = start_row + limit
            df_page = df.iloc[start_row:end_row]
            
            #  Generate Preview JSON
            preview = get_preview(df_page, max_rows=limit)
            preview['total_records'] = total_records
            preview['page'] = page
            preview['limit'] = limit
            preview['total_pages'] = max(1, (total_records + limit - 1) // limit)
            
            return preview, 200
            
        except Exception as e:
            app_logger.error(f"Error generating preview for file {file_id}: {e}")
            return {'error': f"Failed to generate preview: {str(e)}"}, 500
