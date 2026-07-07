import psycopg2
from psycopg2 import pool
from config import Config
from utils.helper import app_logger

class DatabaseConnectionPool:
    """Manages PostgreSQL connection pool using psycopg2."""
    _pool = None

    @classmethod
    def initialize(cls):
        """Initialize the connection pool."""
        if cls._pool is None:
            try:
                cls._pool = pool.SimpleConnectionPool(
                    1, 10,
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    database=Config.DB_NAME,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD
                )
                app_logger.info("PostgreSQL Connection Pool initialized successfully.")
            except psycopg2.DatabaseError as e:
                app_logger.error(f"Error initializing PostgreSQL Connection Pool: {e}")
                cls._pool = None
                raise

    @classmethod
    def get_connection(cls):
        """Get a connection from the pool."""
        if cls._pool is None:
            cls.initialize()
        return cls._pool.getconn()

    @classmethod
    def put_connection(cls, conn):
        """Return a connection back to the pool."""
        if cls._pool is not None and conn is not None:
            cls._pool.putconn(conn)

    @classmethod
    def close_all(cls):
        """Close all connections in the pool."""
        if cls._pool is not None:
            cls._pool.closeall()
            app_logger.info("PostgreSQL Connection Pool closed.")
            cls._pool = None

class DBConnectionContext:
    """Context manager for database connections to ensure release back to pool."""
    def __init__(self):
        self.conn = None
        self.cursor = None

    def __enter__(self):
        try:
            self.conn = DatabaseConnectionPool.get_connection()
            self.cursor = self.conn.cursor()
            return self.conn, self.cursor
        except Exception as e:
            app_logger.error(f"Failed to acquire database connection: {e}")
            if self.conn:
                DatabaseConnectionPool.put_connection(self.conn)
            raise

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            if exc_type is not None:
                self.conn.rollback()
                app_logger.warning("Database transaction rolled back due to error.")
            else:
                self.conn.commit()
            DatabaseConnectionPool.put_connection(self.conn)
