import os
# pyrefly: ignore [missing-import]
from flask import request
# pyrefly: ignore [missing-import]
from flask_restful import Resource
# pyrefly: ignore [missing-import]
from werkzeug.utils import secure_filename
from config import Config
from utils.validators import allowed_file, validate_file_size
from utils.helper import get_unique_id, format_file_size, save_file_metadata, app_logger
from services.dataframe_service import load_file

class UploadAPI(Resource):
    """API Resource to handle uploading files."""
    
    def post(self):
        # Check if the post request has the file part
        if 'file' not in request.files:
            return {'error': 'No file part in the request'}, 400
            
        file = request.files['file']
        
        # Check if user did not select file
        if file.filename == '':
            return {'error': 'No selected file'}, 400
            
        # Validate filename
        if not allowed_file(file.filename):
            return {'error': f'Unsupported file type. Allowed types: {", ".join(Config.ALLOWED_EXTENSIONS)}'}, 400
            
        try:
            # Check size by seeking to the end
            file.seek(0, os.SEEK_END)
            size_bytes = file.tell()
            file.seek(0)  # Reset pointer to beginning
            
            if not validate_file_size(size_bytes):
                return {'error': f'File exceeds maximum size of {format_file_size(Config.MAX_CONTENT_LENGTH)}.'}, 400
                
            # Generate unique ID and secure filename
            file_id = get_unique_id()
            orig_filename = secure_filename(file.filename)
            ext = orig_filename.rsplit('.', 1)[1].lower()
            
            # Save path inside uploads/
            filename_saved = f"{file_id}.{ext}"
            file_path = os.path.join(Config.UPLOAD_FOLDER, filename_saved)
            
            # Save the file temporarily
            file.save(file_path)
            app_logger.info(f"File uploaded: {orig_filename} saved as {filename_saved} (Size: {size_bytes} bytes)")
            
            # Read file with Pandas to extract statistics & validate structure
            df = load_file(file_path)
            rows, cols = df.shape
            columns_list = list(df.columns)
            
            # Store metadata
            metadata = {
                'file_id': file_id,
                'original_filename': orig_filename,
                'saved_filename': filename_saved,
                'saved_path': file_path,
                'extension': ext,
                'size_bytes': size_bytes,
                'size_formatted': format_file_size(size_bytes),
                'original_rows': rows,
                'original_cols': cols,
                'columns_list': columns_list,
                'status': 'uploaded'
            }
            save_file_metadata(file_id, metadata)
            
            return {
                'message': 'File uploaded successfully',
                'file_id': file_id,
                'filename': orig_filename,
                'rows': rows,
                'columns': cols,
                'columns_list': columns_list,
                'size': format_file_size(size_bytes)
            }, 201
            
        except Exception as e:
            app_logger.error(f"Error during file upload processing: {e}")
            return {'error': f"Failed to process file: {str(e)}"}, 500
