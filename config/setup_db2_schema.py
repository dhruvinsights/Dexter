"""
Db2 Schema Setup Script
Executes the enhanced schema SQL file to create all tables, views, and procedures
"""
import os
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from config.db2_connection import get_db_connection, close_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def read_sql_file(filepath: str) -> list:
    """
    Read SQL file and split into individual statements
    
    Args:
        filepath: Path to SQL file
        
    Returns:
        List of SQL statements
    """
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Split by semicolon, but be careful with stored procedures
    statements = []
    current_statement = []
    in_procedure = False
    
    for line in content.split('\n'):
        line = line.strip()
        
        # Skip comments and empty lines
        if not line or line.startswith('--'):
            continue
        
        # Track if we're inside a stored procedure
        if 'CREATE OR REPLACE PROCEDURE' in line.upper() or 'CREATE PROCEDURE' in line.upper():
            in_procedure = True
        
        current_statement.append(line)
        
        # End of statement
        if line.endswith(';'):
            if in_procedure and 'END;' in line.upper():
                in_procedure = False
                statements.append('\n'.join(current_statement))
                current_statement = []
            elif not in_procedure:
                statements.append('\n'.join(current_statement))
                current_statement = []
    
    return [s for s in statements if s.strip()]


def execute_schema(db, statements: list, continue_on_error: bool = True) -> tuple:
    """
    Execute schema statements
    
    Args:
        db: Database connection
        statements: List of SQL statements
        continue_on_error: Whether to continue if a statement fails
        
    Returns:
        Tuple of (success_count, error_count)
    """
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        try:
            # Skip COMMENT statements for now (may not be supported in all Db2 versions)
            if statement.strip().upper().startswith('COMMENT ON'):
                logger.info(f"[{i}/{len(statements)}] Skipping COMMENT statement")
                continue
            
            # Skip GRANT statements (will be handled separately)
            if statement.strip().upper().startswith('GRANT'):
                logger.info(f"[{i}/{len(statements)}] Skipping GRANT statement")
                continue
            
            logger.info(f"[{i}/{len(statements)}] Executing: {statement[:100]}...")
            
            with db.get_cursor() as cursor:
                cursor.execute(statement)
            
            success_count += 1
            logger.info(f"  ✓ Success")
            
        except Exception as e:
            error_count += 1
            error_msg = str(e)
            
            # Check if it's a "table already exists" error
            if 'SQLCODE=-601' in error_msg or 'already exists' in error_msg.lower():
                logger.warning(f"  ⚠ Object already exists (skipping)")
            else:
                logger.error(f"  ✗ Error: {error_msg}")
                
                if not continue_on_error:
                    raise
    
    return success_count, error_count


def setup_schema(drop_existing: bool = False):
    """
    Set up the Db2 schema
    
    Args:
        drop_existing: Whether to drop existing tables first
    """
    logger.info("=" * 80)
    logger.info("DB2 SCHEMA SETUP")
    logger.info("=" * 80)
    
    try:
        # Get database connection
        db = get_db_connection()
        logger.info("✓ Connected to database")
        
        # Read schema file
        schema_file = Path(__file__).parent / 'db2_schema_enhanced.sql'
        logger.info(f"\nReading schema from: {schema_file}")
        
        statements = read_sql_file(str(schema_file))
        logger.info(f"✓ Parsed {len(statements)} SQL statements")
        
        # Drop existing tables if requested
        if drop_existing:
            logger.info("\n⚠ Dropping existing tables...")
            drop_tables = [
                'document_embeddings',
                'policy_documents',
                'scenario_metrics',
                'simulation_scenarios',
                'ai_analysis_cache',
                'orbital_shell_stats',
                'debris_events',
                'orbital_elements',
                'satellite_catalog'
            ]
            
            for table in drop_tables:
                try:
                    db.execute_update(f"DROP TABLE {table}")
                    logger.info(f"  ✓ Dropped {table}")
                except Exception as e:
                    if 'SQLCODE=-204' in str(e):  # Table doesn't exist
                        logger.info(f"  - {table} doesn't exist")
                    else:
                        logger.warning(f"  ⚠ Error dropping {table}: {e}")
        
        # Execute schema statements
        logger.info("\nExecuting schema statements...")
        success_count, error_count = execute_schema(db, statements)
        
        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("SCHEMA SETUP SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total statements: {len(statements)}")
        logger.info(f"Successful: {success_count}")
        logger.info(f"Errors: {error_count}")
        
        if error_count == 0:
            logger.info("\n✓ Schema setup completed successfully!")
        else:
            logger.warning(f"\n⚠ Schema setup completed with {error_count} errors")
        
        # Verify tables
        logger.info("\nVerifying tables...")
        tables_to_check = [
            'satellite_catalog',
            'orbital_elements',
            'debris_events',
            'orbital_shell_stats',
            'ai_analysis_cache',
            'policy_documents',
            'document_embeddings',
            'simulation_scenarios',
            'scenario_metrics'
        ]
        
        for table in tables_to_check:
            if db.table_exists(table):
                logger.info(f"  ✓ {table}")
            else:
                logger.error(f"  ✗ {table} NOT FOUND")
        
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"\n✗ Schema setup failed: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        close_db_connection()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Set up Db2 schema for Orbital Sentinel')
    parser.add_argument('--drop', action='store_true', help='Drop existing tables before creating')
    args = parser.parse_args()
    
    setup_schema(drop_existing=args.drop)

# Made with Bob
