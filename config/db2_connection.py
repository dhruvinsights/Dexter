"""
Db2 Database Connection Module
Handles connection pooling, retry logic, and health checks
"""
import os
import time
import logging
from typing import Optional, Any
from contextlib import contextmanager
import ibm_db
import ibm_db_dbi
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Db2Connection:
    """Db2 database connection manager with pooling and retry logic"""
    
    def __init__(self):
        """Initialize connection parameters from environment"""
        self.host = os.getenv('DB2_HOST')
        self.port = int(os.getenv('DB2_PORT', '50000'))
        self.database = os.getenv('DB2_DATABASE')
        self.username = os.getenv('DB2_USERNAME')
        self.password = os.getenv('DB2_PASSWORD')
        
        if not all([self.host, self.database, self.username, self.password]):
            raise ValueError("Missing required Db2 configuration in environment variables")
        
        self.connection_string = (
            f"DATABASE={self.database};"
            f"HOSTNAME={self.host};"
            f"PORT={self.port};"
            f"PROTOCOL=TCPIP;"
            f"UID={self.username};"
            f"PWD={self.password};"
        )
        
        self._connection = None
        self._dbi_connection = None
        
        logger.info(f"Db2 connection configured for {self.database}@{self.host}:{self.port}")
    
    def connect(self, max_retries: int = 3, retry_delay: float = 2.0) -> bool:
        """
        Establish connection to Db2 with retry logic
        
        Args:
            max_retries: Maximum number of connection attempts
            retry_delay: Delay between retries in seconds
            
        Returns:
            True if connection successful, False otherwise
        """
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Attempting Db2 connection (attempt {attempt}/{max_retries})...")
                
                # Create IBM DB connection
                self._connection = ibm_db.connect(self.connection_string, "", "")
                
                # Create DBI connection for easier Python DB-API usage
                self._dbi_connection = ibm_db_dbi.Connection(self._connection)
                
                logger.info("✓ Successfully connected to Db2")
                return True
                
            except Exception as e:
                logger.error(f"✗ Connection attempt {attempt} failed: {e}")
                
                if attempt < max_retries:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error("✗ All connection attempts failed")
                    return False
        
        return False
    
    def disconnect(self) -> None:
        """Close database connection"""
        try:
            if self._dbi_connection:
                self._dbi_connection.close()
                self._dbi_connection = None
            
            if self._connection:
                ibm_db.close(self._connection)
                self._connection = None
            
            logger.info("✓ Db2 connection closed")
            
        except Exception as e:
            logger.error(f"Error closing connection: {e}")
    
    def health_check(self) -> bool:
        """
        Check if database connection is healthy
        
        Returns:
            True if connection is active and responsive
        """
        try:
            if not self._connection:
                return False
            
            # Try a simple query
            cursor = self._dbi_connection.cursor()
            cursor.execute("SELECT 1 FROM SYSIBM.SYSDUMMY1")
            result = cursor.fetchone()
            cursor.close()
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    @contextmanager
    def get_cursor(self):
        """
        Context manager for database cursor
        
        Usage:
            with db.get_cursor() as cursor:
                cursor.execute("SELECT * FROM table")
                results = cursor.fetchall()
        """
        if not self._dbi_connection:
            raise RuntimeError("Not connected to database. Call connect() first.")
        
        cursor = self._dbi_connection.cursor()
        try:
            yield cursor
            self._dbi_connection.commit()
        except Exception as e:
            self._dbi_connection.rollback()
            logger.error(f"Transaction rolled back due to error: {e}")
            raise
        finally:
            cursor.close()
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> list:
        """
        Execute a SELECT query and return results
        
        Args:
            query: SQL query string
            params: Optional query parameters
            
        Returns:
            List of result rows
        """
        with self.get_cursor() as cursor:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()
    
    def execute_update(self, query: str, params: Optional[tuple] = None) -> int:
        """
        Execute an INSERT/UPDATE/DELETE query
        
        Args:
            query: SQL query string
            params: Optional query parameters
            
        Returns:
            Number of affected rows
        """
        with self.get_cursor() as cursor:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.rowcount
    
    def execute_many(self, query: str, params_list: list) -> int:
        """
        Execute batch INSERT/UPDATE operations
        
        Args:
            query: SQL query string with placeholders
            params_list: List of parameter tuples
            
        Returns:
            Number of affected rows
        """
        with self.get_cursor() as cursor:
            cursor.executemany(query, params_list)
            return cursor.rowcount
    
    def table_exists(self, table_name: str) -> bool:
        """
        Check if a table exists in the database
        
        Args:
            table_name: Name of the table to check
            
        Returns:
            True if table exists
        """
        try:
            query = """
                SELECT COUNT(*) 
                FROM SYSCAT.TABLES 
                WHERE TABNAME = ? AND TABSCHEMA = CURRENT SCHEMA
            """
            result = self.execute_query(query, (table_name.upper(),))
            return result[0][0] > 0
        except Exception as e:
            logger.error(f"Error checking table existence: {e}")
            return False


# Singleton instance
_db_instance: Optional[Db2Connection] = None


def get_db_connection() -> Db2Connection:
    """
    Get singleton database connection instance
    
    Returns:
        Db2Connection instance
    """
    global _db_instance
    
    if _db_instance is None:
        _db_instance = Db2Connection()
        if not _db_instance.connect():
            raise RuntimeError("Failed to establish database connection")
    
    return _db_instance


def close_db_connection() -> None:
    """Close singleton database connection"""
    global _db_instance
    
    if _db_instance:
        _db_instance.disconnect()
        _db_instance = None


if __name__ == "__main__":
    """Test database connection"""
    print("=" * 80)
    print("DB2 CONNECTION TEST")
    print("=" * 80)
    
    try:
        db = Db2Connection()
        
        if db.connect():
            print("\n✓ Connection successful!")
            
            # Health check
            if db.health_check():
                print("✓ Health check passed")
            else:
                print("✗ Health check failed")
            
            # Test query
            try:
                result = db.execute_query("SELECT CURRENT TIMESTAMP FROM SYSIBM.SYSDUMMY1")
                print(f"✓ Current timestamp: {result[0][0]}")
            except Exception as e:
                print(f"✗ Test query failed: {e}")
            
            db.disconnect()
        else:
            print("\n✗ Connection failed")
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
    
    print("=" * 80)

# Made with Bob
