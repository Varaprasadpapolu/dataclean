import os
# pyrefly: ignore [missing-import]
from flask import request, send_file
# pyrefly: ignore [missing-import]
from flask_restful import Resource
from utils.helper import get_file_metadata, app_logger


class DownloadAPI(Resource):
    """API Resource to download only cleaned CSV files."""

    def get(self, file_id, filename):
        if not file_id:
            return {"error": "Missing file_id parameter"}, 400

        # Get file metadata
        metadata = get_file_metadata(file_id)
        if not metadata:
            return {"error": "File not found or session expired"}, 404

        cleaned_path = metadata.get("cleaned_path")

        if not cleaned_path or not os.path.exists(cleaned_path):
            return {"error": "Cleaned CSV file not found."}, 404

        # Allow ONLY CSV files
        if not cleaned_path.lower().endswith(".csv"):
            return {"error": "Only CSV files are allowed for download."}, 400

        try:
            original_filename = metadata.get("original_filename", "data.csv")
            filename = os.path.splitext(original_filename)[0]

            return send_file(
                cleaned_path,
                mimetype="text/csv",
                as_attachment=True,
                download_name=f"cleaned_{filename}.csv"
            )

        except Exception as e:
            app_logger.error(f"Download Error: {e}")
            return {"error": str(e)}, 500