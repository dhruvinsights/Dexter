from datetime import datetime
import numpy as np
from sgp4.api import Satrec, jday
from sgp4.ext import invjday

def jd_to_datetime(jd: float, fr: float) -> datetime:
    """Converts a Julian date (integer + fraction) to a Python datetime object."""
    year, month, day, hour, minute, second_float = invjday(jd + fr)
    second = int(second_float)
    microsecond = int(round((second_float - second) * 1e6))
    
    if microsecond >= 1000000:
        microsecond -= 1000000
        second += 1
    if second >= 60:
        second = 59  # Cap to prevent datetime value errors on leap seconds
        
    try:
        return datetime(year, month, day, hour, minute, second, microsecond)
    except ValueError:
        return datetime(year, month, day, hour, minute, 59, 999999)

def propagate_tle(line1: str, line2: str, target_time: datetime) -> tuple:
    """
    Propagates a satellite's TLE lines to a target datetime using SGP4.
    Returns (position_km, velocity_kms) as numpy arrays in the TEME frame.
    TEME closely approximates Earth-Centered Inertial (ECI).
    """
    # 1. Parse TLE strings
    satrec = Satrec.twoline2rv(line1, line2)
    
    # 2. Convert python datetime to Julian Date components (jd, fr)
    jd, fr = jday(
        target_time.year,
        target_time.month,
        target_time.day,
        target_time.hour,
        target_time.minute,
        target_time.second + target_time.microsecond / 1e6
    )
    
    # 3. Propagate satellite
    error_code, r, v = satrec.sgp4(jd, fr)
    
    if error_code != 0:
        raise ValueError(
            f"SGP4 propagation failed. Error code: {error_code}. "
            f"Please check TLE elements and propagation date constraints."
        )
        
    return np.array(r), np.array(v)

def parse_tle_metadata(line1: str, line2: str) -> dict:
    """
    Parses key metadata and orbital parameters directly from the raw TLE strings.
    """
    satrec = Satrec.twoline2rv(line1, line2)
    
    # Convert mean motion to revolutions per day
    rev_per_day = (satrec.no_kozai * 1440.0) / (2.0 * np.pi)
    
    # Calculate semi-major axis (a) in km using Kepler's Third Law:
    # a^3 = MU / n^2
    # Standard Earth gravitational parameter (MU) is 398600.4418 km^3/s^2
    n_rad_sec = (satrec.no_kozai) / 60.0 # rad/sec
    a = (398600.4418 / (n_rad_sec ** 2)) ** (1.0 / 3.0)
    
    epoch = None
    if hasattr(satrec, 'jdsatepoch') and hasattr(satrec, 'jdsatepochF'):
        epoch = jd_to_datetime(satrec.jdsatepoch, satrec.jdsatepochF)
        
    return {
        "norad_id": satrec.satnum,
        "classification": line1[7], # 'U' = unclassified
        "epoch": epoch,
        "inclination_deg": np.degrees(satrec.inclo),
        "eccentricity": satrec.ecco,
        "raan_deg": np.degrees(satrec.nodeo),
        "arg_perigee_deg": np.degrees(satrec.argpo),
        "mean_anomaly_deg": np.degrees(satrec.mo),
        "mean_motion_rev_day": rev_per_day,
        "semi_major_axis_km": a,
        "bstar": satrec.bstar
    }
