import os
from config import Config

def allowed_file(filename):
    """Check if the file extension is allowed."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in Config.ALLOWED_EXTENSIONS

def validate_file_size(file_size):
    """Check if file size does not exceed max limit."""
    return file_size <= Config.MAX_CONTENT_LENGTH
