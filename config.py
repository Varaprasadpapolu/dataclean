import os

class Config:
    """Application configuration settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'clean-data-secret-key-98765')
    
    # Database configuration
    DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'clean_data')
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '1234')
    
    # File storage configuration
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    CLEANED_FOLDER = os.path.join(BASE_DIR, 'cleaned_files')
    LOGS_FOLDER = os.path.join(BASE_DIR, 'logs')
    
    # Create directories if they do not exist
    for folder in [UPLOAD_FOLDER, CLEANED_FOLDER, LOGS_FOLDER]:
        os.makedirs(folder, exist_ok=True)
        
    ALLOWED_EXTENSIONS = {'csv', 'xls', 'xlsx'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
