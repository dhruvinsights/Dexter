import pytest
from datetime import datetime, timezone
import numpy as np
from backend.shared.physics.kepler import (
    true_anomaly_to_mean_anomaly,
    mean_anomaly_to_true_anomaly,
    orbital_elements_to_cartesian,
    propagate_kepler,
    EARTH_RADIUS
)
from backend.shared.physics.sgp4_propagator import propagate_tle, parse_tle_metadata

# Real TLE set for ISS (ZARYA)
ISS_LINE1 = "1 25544U 98067A   26164.55160867  .00016717  00000-0  30225-3 0  9015"
ISS_LINE2 = "2 25544  51.6418 190.2312 0005312  89.2612 270.8912 15.49812401 54125"

def test_anomaly_conversions():
    """Test that anomaly conversions are inverses of each other."""
    # Test circular/near-circular orbits
    e = 0.001
    nu_orig = 45.0
    M = true_anomaly_to_mean_anomaly(nu_orig, e)
    nu_back = mean_anomaly_to_true_anomaly(M, e)
    assert pytest.approx(nu_orig, abs=1e-5) == nu_back
    
    # Test highly eccentric orbits
    e_high = 0.75
    nu_orig_high = 120.0
    M_high = true_anomaly_to_mean_anomaly(nu_orig_high, e_high)
    nu_back_high = mean_anomaly_to_true_anomaly(M_high, e_high)
    assert pytest.approx(nu_orig_high, abs=1e-5) == nu_back_high

def test_orbital_elements_to_cartesian():
    """Test Keplerian to Cartesian state vector conversion."""
    a_km = EARTH_RADIUS + 400.0  # 400 km altitude LEO
    e = 0.0
    i = 51.64
    Omega = 120.0
    omega = 45.0
    nu = 0.0
    
    pos, vel = orbital_elements_to_cartesian(a_km, e, i, Omega, omega, nu)
    
    # Position vector length should match orbital radius r
    r_expected = a_km * (1.0 - e*e) / (1.0 + e) # perigee
    r_calculated = np.linalg.norm(pos)
    assert pytest.approx(r_expected, abs=1e-3) == r_calculated
    
    # Circular orbit speed v = sqrt(MU / r)
    v_expected = np.linalg.norm(vel)
    v_theoretical = np.sqrt(398600.4418 / r_expected)
    assert pytest.approx(v_theoretical, abs=1e-2) == v_expected

def test_propagate_kepler():
    """Test time propagation of Keplerian orbits."""
    a_km = EARTH_RADIUS + 400.0
    e = 0.0
    i = 0.0
    Omega = 0.0
    omega = 0.0
    nu = 0.0
    
    # Propagate for half an orbit (period ~ 92.5 minutes, so 46.25 minutes = 2775 seconds)
    # The true anomaly should change by approximately 180 degrees.
    time_seconds = 2775.0
    result = propagate_kepler(a_km, e, i, Omega, omega, nu, time_seconds)
    
    assert pytest.approx(180.0, abs=5.0) == result[5]

def test_parse_tle_metadata():
    """Test parsing of parameters from raw TLE strings."""
    meta = parse_tle_metadata(ISS_LINE1, ISS_LINE2)
    
    assert meta["norad_id"] == 25544
    assert meta["classification"] == "U"
    assert pytest.approx(51.6418, abs=1e-4) == meta["inclination_deg"]
    assert pytest.approx(0.0005312, abs=1e-7) == meta["eccentricity"]
    assert pytest.approx(190.2312, abs=1e-4) == meta["raan_deg"]
    assert pytest.approx(89.2612, abs=1e-4) == meta["arg_perigee_deg"]
    assert pytest.approx(270.8912, abs=1e-4) == meta["mean_anomaly_deg"]
    assert pytest.approx(15.49812401, abs=1e-4) == meta["mean_motion_rev_day"]

def test_propagate_tle():
    """Test SGP4 propagation from TLE to target datetime."""
    # Target date: June 15, 2026 at 12:00:00 UTC
    dt = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    
    pos, vel = propagate_tle(ISS_LINE1, ISS_LINE2, dt)
    
    # ISS orbital height is typically ~400 km, radius is ~6771 km
    r_mag = np.linalg.norm(pos)
    assert r_mag > (EARTH_RADIUS + 300.0)
    assert r_mag < (EARTH_RADIUS + 500.0)
    
    # ISS velocity is typically ~7.66 km/s
    v_mag = np.linalg.norm(vel)
    assert v_mag > 7.0
    assert v_mag < 8.0
