import os
import uuid
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

def get_unique_id():
    """Generate a unique string identifier."""
    return str(uuid.uuid4())

def format_file_size(size_bytes):
    """Format file size in bytes to a human-readable string."""
    if size_bytes == 0:
        return "0 B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.2f} {size_name[i]}"

def setup_logger(name, log_file, level=logging.INFO):
    """Set up a rotating file logger."""
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    handler = RotatingFileHandler(
        log_file, maxBytes=10*1024*1024, backupCount=5
    )
    handler.setFormatter(formatter)
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid duplicate handlers if logger is re-initialized
    if not logger.handlers:
        logger.addHandler(handler)
        
    return logger

# Initialize application-wide logger
from config import Config
app_logger = setup_logger(
    'clean_data_app', 
    os.path.join(Config.LOGS_FOLDER, 'app.log')
)

import json

METADATA_FILE = os.path.join(Config.UPLOAD_FOLDER, 'metadata.json')

def _load_all_metadata():
    """Load the metadata registry from disk."""
    if not os.path.exists(METADATA_FILE):
        return {}
    try:
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        app_logger.error(f"Error loading metadata registry: {e}")
        return {}

def _save_all_metadata(registry):
    """Save the metadata registry to disk."""
    try:
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=4)
    except Exception as e:
        app_logger.error(f"Error saving metadata registry: {e}")

def get_file_metadata(file_id):
    """Retrieve metadata for a given file_id."""
    registry = _load_all_metadata()
    return registry.get(file_id)

def save_file_metadata(file_id, data):
    """Save metadata for a given file_id."""
    registry = _load_all_metadata()
    registry[file_id] = data
    _save_all_metadata(registry)

def update_file_metadata(file_id, updates):
    """Update existing metadata for a given file_id."""
    registry = _load_all_metadata()
    if file_id in registry:
        registry[file_id].update(updates)
        _save_all_metadata(registry)

