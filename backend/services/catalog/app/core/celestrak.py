from datetime import datetime
import requests
from typing import Generator, Dict, Any

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"

def fetch_celestrak_tles(group: str = "active") -> str:
    """
    Fetches raw TLE text data from CelesTrak elements database for a specific group.
    Common groups: 'active', 'stations', 'starlink', 'debris', 'weather'
    """
    params = {
        "GROUP": group,
        "FORMAT": "tle"
    }
    
    response = requests.get(CELESTRAK_URL, params=params, timeout=30)
    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to fetch data from CelesTrak. Status code: {response.status_code}. "
            f"Response: {response.text[:200]}"
        )
    return response.text

def parse_raw_tles(raw_text: str) -> Generator[Dict[str, Any], None, None]:
    """
    Parses a standard 3-line CelesTrak TLE text block.
    Yields dictionaries mapped to SpaceObject and RawTLE schemas.
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
    # Standard TLE sets consist of groups of 3 lines:
    # 0: Object Name
    # 1: TLE Line 1
    # 2: TLE Line 2
    for i in range(0, len(lines) - 2, 3):
        name = lines[i]
        line1 = lines[i+1]
        line2 = lines[i+2]
        
        # Simple string validations: Line 1 starts with '1 ', Line 2 with '2 '
        if not (line1.startswith("1 ") and line2.startswith("2 ")):
            # Skip invalid lines
            continue
            
        try:
            # Extract basic data directly from TLE columns
            norad_id = int(line1[2:7])
            classification = line1[7] # 'U' = unclassified, 'C' = classified
            
            # Epoch extraction
            # Columns 19-32: Epoch Year and Julian Day Fraction (YYDDD.DDDDDDDD)
            epoch_str = line1[18:32]
            epoch_year = int(epoch_str[0:2])
            epoch_year += 2000 if epoch_year < 57 else 1900
            day_fraction = float(epoch_str[2:])
            
            # Simple metadata extraction
            # Launch details (launch year, launch number, piece)
            launch_info = line1[9:17].strip()
            
            # B-star drag term (columns 54-61)
            bstar_base = float(line1[53:59]) / 100000.0
            bstar_exp = int(line1[59:61])
            bstar = bstar_base * (10 ** bstar_exp)
            
            # Line 2 columns:
            # Inclination (degrees, columns 9-16)
            inclination = float(line2[8:16])
            # RAAN (degrees, columns 18-25)
            raan = float(line2[17:25])
            # Eccentricity (decimal point assumed, columns 27-33)
            eccentricity = float("0." + line2[26:33])
            # Argument of Perigee (degrees, columns 35-42)
            arg_perigee = float(line2[34:42])
            # Mean Anomaly (degrees, columns 44-51)
            mean_anomaly = float(line2[43:51])
            # Mean Motion (revolutions/day, columns 53-63)
            mean_motion = float(line2[52:63])

            yield {
                "name": name,
                "norad_id": norad_id,
                "object_type": "DEBRIS" if "DEBRIS" in name.upper() else "SATELLITE",
                "classification": classification,
                "bstar": bstar,
                "line1": line1,
                "line2": line2,
                "inclination_deg": inclination,
                "eccentricity": eccentricity,
                "raan_deg": raan,
                "arg_perigee_deg": arg_perigee,
                "mean_anomaly_deg": mean_anomaly,
                "mean_motion_rev_day": mean_motion,
                "launch_info": launch_info
            }
        except Exception as e:
            # Skip records that cause parsing errors
            continue
