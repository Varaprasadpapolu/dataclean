import os
# pyrefly: ignore [missing-import]
from flask import Flask, render_template
# pyrefly: ignore [missing-import]
from flask_restful import Api
from flask_cors import CORS
from config import Config
from utils.helper import app_logger

# Import API endpoints
from api_routes.upload import UploadAPI
from api_routes.clean import CleanAPI
from api_routes.preview import PreviewAPI
from api_routes.download import DownloadAPI
from api_routes.save_db import SaveDBAPI
from api_routes.status import StatusAPI

# Import Database setup
from database.queries import setup_history_table

def create_app():
    app = Flask(__name__, 
                template_folder='frontend/dist',
                static_folder='frontend/dist',
                static_url_path='')
    
    app.config.from_object(Config)
    
    # Enable Cross-Origin Resource Sharing
    CORS(app)
    
    # Initialize RESTful API wrapper
    api = Api(app)
    
    # Register endpoints
    api.add_resource(UploadAPI, '/api/upload')
    api.add_resource(CleanAPI, '/api/clean')
    api.add_resource(PreviewAPI, '/api/preview')
    api.add_resource(DownloadAPI, '/download/<string:file_id>/<string:filename>')
    api.add_resource(SaveDBAPI, '/api/save')
    api.add_resource(StatusAPI, '/api/status')
    
    # Route for serving the frontend single-page dashboard
    @app.route('/')
    def index():
        return render_template('index.html')
        
    # Setup database schema automatically on startup
    with app.app_context():
        setup_history_table()
        
    # Disable caching for development
    @app.after_request
    def add_header(response):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
        
    app_logger.info("Clean Data Flask application started.")
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
