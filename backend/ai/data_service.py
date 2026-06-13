"""
Data Service for AI Agents
Provides access to Db2 data for AI analysis enrichment
"""
import sys
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from config.db2_connection import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIDataService:
    """
    Service for retrieving data from Db2 to enrich AI analysis
    
    Provides:
    - Orbital statistics by shell
    - Historical collision data
    - Cached AI analyses
    - Policy document retrieval for RAG
    """
    
    def __init__(self):
        """Initialize data service with Db2 connection"""
        self.db = get_db_connection()
        logger.info("AI Data Service initialized")
    
    def get_orbital_shell_stats(self, shell_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get orbital shell statistics from Db2
        
        Args:
            shell_name: Optional specific shell to query
            
        Returns:
            List of shell statistics dictionaries
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            if shell_name:
                query = """
                    SELECT shell_name, altitude_min_km, altitude_max_km,
                           total_objects, active_satellites, debris_count,
                           collision_probability, last_updated
                    FROM orbital_shell_stats
                    WHERE shell_name = ?
                    ORDER BY last_updated DESC
                    LIMIT 1
                """
                cursor.execute(query, (shell_name,))
            else:
                query = """
                    SELECT shell_name, altitude_min_km, altitude_max_km,
                           total_objects, active_satellites, debris_count,
                           collision_probability, last_updated
                    FROM orbital_shell_stats
                    ORDER BY altitude_min_km
                """
                cursor.execute(query)
            
            columns = [desc[0] for desc in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            cursor.close()
            return results
            
        except Exception as e:
            logger.error(f"Error fetching shell stats: {e}")
            return []
    
    def get_recent_debris_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent debris-generating events
        
        Args:
            limit: Maximum number of events to return
            
        Returns:
            List of debris event dictionaries
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT event_id, event_type, event_date, parent_object_id,
                       altitude_km, debris_count, event_description
                FROM debris_events
                ORDER BY event_date DESC
                LIMIT ?
            """
            cursor.execute(query, (limit,))
            
            columns = [desc[0] for desc in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            cursor.close()
            return results
            
        except Exception as e:
            logger.error(f"Error fetching debris events: {e}")
            return []
    
    def get_cached_analysis(
        self,
        scenario_id: str,
        analysis_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached AI analysis from Db2
        
        Args:
            scenario_id: Scenario identifier
            analysis_type: Type of analysis
            
        Returns:
            Cached analysis dictionary or None
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT analysis_id, scenario_id, analysis_type,
                       analysis_content, model_used, generated_at,
                       confidence_score
                FROM ai_analysis_cache
                WHERE scenario_id = ? AND analysis_type = ?
                ORDER BY generated_at DESC
                LIMIT 1
            """
            cursor.execute(query, (scenario_id, analysis_type))
            
            row = cursor.fetchone()
            cursor.close()
            
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching cached analysis: {e}")
            return None
    
    def cache_analysis(
        self,
        scenario_id: str,
        analysis_type: str,
        content: str,
        model_used: str,
        confidence_score: Optional[float] = None
    ) -> bool:
        """
        Cache AI analysis in Db2
        
        Args:
            scenario_id: Scenario identifier
            analysis_type: Type of analysis
            content: Analysis content
            model_used: Model identifier
            confidence_score: Optional confidence score
            
        Returns:
            True if successful
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO ai_analysis_cache
                (scenario_id, analysis_type, analysis_content, model_used,
                 generated_at, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            
            cursor.execute(query, (
                scenario_id,
                analysis_type,
                content,
                model_used,
                datetime.utcnow(),
                confidence_score
            ))
            
            conn.commit()
            cursor.close()
            
            logger.info(f"Cached analysis: {scenario_id}/{analysis_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching analysis: {e}")
            return False
    
    def get_policy_documents(
        self,
        search_term: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve policy documents for RAG
        
        Args:
            search_term: Optional search term to filter documents
            
        Returns:
            List of policy document dictionaries
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            if search_term:
                query = """
                    SELECT doc_id, title, source, content, created_at
                    FROM policy_documents
                    WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
                    ORDER BY created_at DESC
                """
                search_pattern = f"%{search_term.lower()}%"
                cursor.execute(query, (search_pattern, search_pattern))
            else:
                query = """
                    SELECT doc_id, title, source, content, created_at
                    FROM policy_documents
                    ORDER BY created_at DESC
                """
                cursor.execute(query)
            
            columns = [desc[0] for desc in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            cursor.close()
            return results
            
        except Exception as e:
            logger.error(f"Error fetching policy documents: {e}")
            return []
    
    def get_satellite_count_by_shell(self) -> Dict[str, int]:
        """
        Get satellite counts grouped by orbital shell
        
        Returns:
            Dictionary mapping shell names to satellite counts
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT shell_name, active_satellites
                FROM orbital_shell_stats
                ORDER BY altitude_min_km
            """
            cursor.execute(query)
            
            result = {}
            for row in cursor.fetchall():
                result[row[0]] = row[1]
            
            cursor.close()
            return result
            
        except Exception as e:
            logger.error(f"Error fetching satellite counts: {e}")
            return {}


# Singleton instance
_data_service: Optional[AIDataService] = None


def get_data_service() -> AIDataService:
    """
    Get singleton data service instance
    
    Returns:
        AIDataService instance
    """
    global _data_service
    
    if _data_service is None:
        _data_service = AIDataService()
    
    return _data_service


if __name__ == "__main__":
    """Test data service"""
    print("=" * 80)
    print("AI DATA SERVICE TEST")
    print("=" * 80)
    
    try:
        service = AIDataService()
        
        # Test shell stats
        print("\n1. Orbital Shell Statistics:")
        print("-" * 80)
        stats = service.get_orbital_shell_stats()
        if stats:
            for shell in stats[:3]:
                print(f"  {shell.get('shell_name')}: {shell.get('total_objects')} objects")
        else:
            print("  No data available (database may be empty)")
        
        # Test debris events
        print("\n2. Recent Debris Events:")
        print("-" * 80)
        events = service.get_recent_debris_events(limit=5)
        if events:
            for event in events:
                print(f"  {event.get('event_type')}: {event.get('debris_count')} debris")
        else:
            print("  No events found (database may be empty)")
        
        # Test satellite counts
        print("\n3. Satellite Counts by Shell:")
        print("-" * 80)
        counts = service.get_satellite_count_by_shell()
        if counts:
            for shell, count in list(counts.items())[:3]:
                print(f"  {shell}: {count} satellites")
        else:
            print("  No data available")
        
        print("\n✓ Data service test complete")
        print("=" * 80)
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print("=" * 80)

# Made with Bob