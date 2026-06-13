"""
Configurable CelesTrak Data Fetching Script
Fetches orbital data from CelesTrak with environment-based configuration
"""
import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ingestion.ingest_celestrak import CelesTrakIngester

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ConfigurableCelesTrakFetcher:
    """Fetch CelesTrak data with environment-based configuration"""
    
    def __init__(self):
        """Initialize with environment configuration"""
        # Parse groups from environment
        groups_str = os.getenv('CELESTRAK_GROUPS', 'active,starlink,iridium-33-debris,cosmos-2251-debris,fengyun-1c-debris')
        self.groups = [g.strip() for g in groups_str.split(',')]
        
        # Configuration
        self.debris_sample_limit = int(os.getenv('DEBRIS_SAMPLE_LIMIT', '100'))
        self.rate_limit_delay = float(os.getenv('RATE_LIMIT_DELAY', '0.5'))
        self.output_file = os.getenv('OUTPUT_FILE', 'celestrak_data.json')
        
        # Initialize ingester
        self.ingester = CelesTrakIngester(rate_limit_delay=self.rate_limit_delay)
        
        logger.info("=" * 80)
        logger.info("CONFIGURABLE CELESTRAK DATA FETCHER")
        logger.info("=" * 80)
        logger.info(f"Groups to fetch: {', '.join(self.groups)}")
        logger.info(f"Debris sample limit: {self.debris_sample_limit}")
        logger.info(f"Rate limit delay: {self.rate_limit_delay}s")
        logger.info(f"Output file: {self.output_file}")
        logger.info("=" * 80)
    
    def fetch_all_data(self) -> Dict[str, List[Dict]]:
        """
        Fetch all configured groups
        
        Returns:
            Dictionary with categorized data: active, starlink, debris
        """
        all_data = {
            "active": [],
            "starlink": [],
            "debris": []
        }
        
        # Separate debris groups from main groups
        debris_groups = [g for g in self.groups if 'debris' in g.lower()]
        main_groups = [g for g in self.groups if 'debris' not in g.lower()]
        
        # Fetch main groups
        for group in main_groups:
            logger.info(f"\nFetching {group}...")
            data = self.ingester.fetch_tle_data(group)
            
            # Enrich data
            enriched_data = []
            for obj in data:
                enriched_obj = self.ingester.enrich_tle_data(obj)
                enriched_data.append(enriched_obj)
            
            # Categorize
            if group.lower() == 'active':
                all_data['active'] = enriched_data
            elif group.lower() == 'starlink':
                all_data['starlink'] = enriched_data
            else:
                # Other groups go to active
                all_data['active'].extend(enriched_data)
            
            logger.info(f"✓ Fetched and enriched {len(enriched_data)} objects from {group}")
            time.sleep(self.rate_limit_delay)
        
        # Fetch debris groups
        if debris_groups:
            logger.info(f"\nFetching debris from {len(debris_groups)} sources...")
            all_debris = []
            
            for debris_group in debris_groups:
                logger.info(f"  Fetching {debris_group}...")
                debris_data = self.ingester.fetch_tle_data(debris_group)
                
                for obj in debris_data:
                    enriched_obj = self.ingester.enrich_tle_data(obj)
                    all_debris.append(enriched_obj)
                
                logger.info(f"    ✓ {len(debris_data)} objects")
                time.sleep(self.rate_limit_delay)
            
            # Apply sample limit if configured
            if self.debris_sample_limit > 0 and len(all_debris) > self.debris_sample_limit:
                logger.info(f"  Limiting debris to {self.debris_sample_limit} objects (from {len(all_debris)})")
                all_debris = all_debris[:self.debris_sample_limit]
            
            all_data['debris'] = all_debris
            logger.info(f"✓ Total debris objects: {len(all_debris)}")
        
        return all_data
    
    def save_data(self, data: Dict[str, List[Dict]]) -> None:
        """
        Save fetched data to JSON file
        
        Args:
            data: Dictionary of categorized TLE data
        """
        # Add metadata
        output = {
            "metadata": {
                "fetch_timestamp": datetime.utcnow().isoformat(),
                "groups_fetched": self.groups,
                "total_objects": sum(len(v) for v in data.values()),
                "active_count": len(data['active']),
                "starlink_count": len(data['starlink']),
                "debris_count": len(data['debris'])
            },
            "data": data
        }
        
        with open(self.output_file, 'w') as f:
            json.dump(output, f, indent=2)
        
        logger.info(f"\n✓ Saved data to {self.output_file}")
    
    def print_summary(self, data: Dict[str, List[Dict]]) -> None:
        """Print summary statistics"""
        logger.info("\n" + "=" * 80)
        logger.info("DATA SUMMARY")
        logger.info("=" * 80)
        
        total_objects = sum(len(v) for v in data.values())
        logger.info(f"\nTotal objects fetched: {total_objects}")
        
        for category, objects in data.items():
            if not objects:
                continue
            
            logger.info(f"\n{category.upper()}:")
            logger.info(f"  Total: {len(objects)}")
            
            # Count by object type
            type_counts = {}
            shell_counts = {}
            for obj in objects:
                obj_type = obj.get('object_type', 'UNKNOWN')
                shell = obj.get('orbital_shell', 'UNKNOWN')
                type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
                shell_counts[shell] = shell_counts.get(shell, 0) + 1
            
            logger.info(f"  By type: {dict(sorted(type_counts.items(), key=lambda x: x[1], reverse=True))}")
            logger.info(f"  By shell: {dict(sorted(shell_counts.items(), key=lambda x: x[1], reverse=True))}")
        
        logger.info("\n" + "=" * 80)


def main():
    """Main execution function"""
    try:
        fetcher = ConfigurableCelesTrakFetcher()
        
        # Fetch all data
        data = fetcher.fetch_all_data()
        
        # Save to file
        fetcher.save_data(data)
        
        # Print summary
        fetcher.print_summary(data)
        
        logger.info("\n✓ Data fetch complete!")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"\n✗ Error during data fetch: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

# Made with Bob
