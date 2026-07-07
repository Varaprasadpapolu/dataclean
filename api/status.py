import os
# pyrefly: ignore [missing-import]
from flask import request
# pyrefly: ignore [missing-import]
from flask_restful import Resource
from config import Config
from database.queries import get_recent_history
from database.connection import DatabaseConnectionPool
from utils.helper import app_logger

class StatusAPI(Resource):
    """API Resource to get dashboard status, statistics, and recent history."""
    
    def get(self):
        try:
            #  Count files in folders for quick statistics
            upload_files = [f for f in os.listdir(Config.UPLOAD_FOLDER) if os.path.isfile(os.path.join(Config.UPLOAD_FOLDER, f)) and f != 'metadata.json']
            cleaned_files = [f for f in os.listdir(Config.CLEANED_FOLDER) if os.path.isfile(os.path.join(Config.CLEANED_FOLDER, f))]
            
            #  Check Database Connection
            db_connected = False
            try:
                DatabaseConnectionPool.initialize()
                db_connected = True
            except Exception:
                db_connected = False
                
            #  Get Recent Cleaning History
            recent_history = get_recent_history(5)
            
            return {
                'db_connected': db_connected,
                'total_uploaded': len(upload_files),
                'total_cleaned': len(cleaned_files),
                'recent_history': recent_history
            }, 200
            
        except Exception as e:
            app_logger.error(f"Error fetching status: {e}")
            return {'error': f"Failed to get status details: {str(e)}"}, 500
