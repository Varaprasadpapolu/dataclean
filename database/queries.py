import psycopg2
from database.connection import DBConnectionContext, DatabaseConnectionPool
from utils.helper import app_logger

def setup_history_table():
    """Create the cleaning history table if it doesn't exist."""
    create_table_query = """
    CREATE TABLE IF NOT EXISTS cleaning_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_rows INTEGER,
        original_cols INTEGER,
        cleaned_rows INTEGER,
        cleaned_cols INTEGER,
        processing_time DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    try:
        with DBConnectionContext() as (conn, cursor):
            cursor.execute(create_table_query)
            app_logger.info("cleaning_history table is ready.")
    except Exception as e:
        app_logger.error(f"Failed to set up cleaning_history table: {e}")

def log_cleaning_history(filename, orig_rows, orig_cols, clean_rows, clean_cols, proc_time):
    """Log an entry into the cleaning history table."""
    insert_query = """
    INSERT INTO cleaning_history (filename, original_rows, original_cols, cleaned_rows, cleaned_cols, processing_time)
    VALUES (%s, %s, %s, %s, %s, %s);
    """
    try:
        with DBConnectionContext() as (conn, cursor):
            cursor.execute(insert_query, (filename, orig_rows, orig_cols, clean_rows, clean_cols, proc_time))
            app_logger.info(f"Logged cleaning history for: {filename}")
    except Exception as e:
        app_logger.error(f"Failed to log cleaning history: {e}")

def get_recent_history(limit=5):
    """Retrieve the recently cleaned files list from DB."""
    select_query = """
    SELECT id, filename, original_rows, cleaned_rows, processing_time, created_at
    FROM cleaning_history
    ORDER BY created_at DESC
    LIMIT %s;
    """
    try:
        # Check pool first
        try:
            DatabaseConnectionPool.initialize()
        except Exception:
            # If DB is not available, we return empty list without crash
            return []
            
        with DBConnectionContext() as (conn, cursor):
            cursor.execute(select_query, (limit,))
            rows = cursor.fetchall()
            history = []
            for r in rows:
                history.append({
                    'id': r[0],
                    'filename': r[1],
                    'original_rows': r[2],
                    'cleaned_rows': r[3],
                    'processing_time': r[4],
                    'created_at': r[5].strftime("%Y-%m-%d %H:%M:%S") if r[5] else ""
                })
            return history
    except Exception as e:
        app_logger.error(f"Failed to fetch cleaning history: {e}")
        return []

def table_exists(table_name):
    """Check if a table exists in the public schema."""
    check_query = """
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = %s
    );
    """
    try:
        with DBConnectionContext() as (conn, cursor):
            cursor.execute(check_query, (table_name.lower(),))
            return cursor.fetchone()[0]
    except Exception as e:
        app_logger.error(f"Failed to check if table {table_name} exists: {e}")
        return False
