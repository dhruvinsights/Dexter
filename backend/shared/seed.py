import sys
import os
from datetime import datetime, timezone

# Ensure import path includes workspace root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.shared.database import engine, SessionLocal
from backend.shared.models import Base, SpaceObject, RawTLE
from backend.services.catalog.app.core.celestrak import fetch_celestrak_tles, parse_raw_tles

def seed_database():
    print("Initializing database schema...")
    Base.metadata.create_all(engine)
    
    db = SessionLocal()
    
    # Check if we already have space objects
    existing_count = db.query(SpaceObject).count()
    if existing_count > 0:
        print(f"Database already contains {existing_count} space objects. Skipping seeding.")
        db.close()
        return

    print("Fetching active satellite elements from CelesTrak...")
    try:
        raw_tles = fetch_celestrak_tles("active")
    except Exception as e:
        print(f"Network fetch failed: {e}. Falling back to offline mock TLE data.")
        # Provide a reliable fallback mock TLE set (ISS and Hubble)
        raw_tles = (
            "ISS (ZARYA)\n"
            "1 25544U 98067A   26164.55160867  .00016717  00000-0  30225-3 0  9015\n"
            "2 25544  51.6418 190.2312 0005312  89.2612 270.8912 15.49812401 54125\n"
            "HST\n"
            "1 20580U 90037B   26164.12345678  .00001234  00000-0  10000-4 0  9998\n"
            "2 20580  28.4682 102.1234 0007654  90.4321 270.1234 14.98765432123456\n"
        )

    print("Parsing TLE data...")
    parsed_sats = list(parse_raw_tles(raw_tles))
    print(f"Parsed {len(parsed_sats)} satellite entries successfully.")

    print("Writing records to database...")
    count = 0
    now = datetime.now(timezone.utc)
    
    for sat in parsed_sats:
        # Create SpaceObject entry
        space_obj = SpaceObject(
            norad_id=sat["norad_id"],
            name=sat["name"],
            object_type=sat["object_type"],
            country_code=sat.get("country_code", "US"),
            launch_date=None, # TLE parsing does not yield full launch date easily
            mass_kg=1200.0,   # Default placeholder mass
            cross_section_area=8.0, # Default placeholder area
            operational_status="ACTIVE"
        )
        db.add(space_obj)
        db.flush() # Flushes to get the generated space_obj.id UUID
        
        # Create associated RawTLE entry
        # TLE Epoch fraction parsing fallback to current date if needed
        epoch_dt = now
        try:
            # Simple epoch calculation: CelesTrak parse logic provides inclination and raan
            # Epoch info is parsed as line1/line2
            # Let's derive epoch from line1 if possible or use current timestamp
            epoch_dt = now
        except Exception:
            pass
            
        raw_tle_record = RawTLE(
            space_object_id=space_obj.id,
            norad_id=sat["norad_id"],
            line1=sat["line1"],
            line2=sat["line2"],
            epoch=epoch_dt
        )
        db.add(raw_tle_record)
        count += 1
        
        # Commit periodically
        if count % 100 == 0:
            db.commit()
            print(f"  Saved {count} objects...")

    db.commit()
    db.close()
    print(f"Database seeding completed! Added {count} objects.")

if __name__ == "__main__":
    seed_database()
