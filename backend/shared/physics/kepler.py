import math
import numpy as np

# Standard Physical Constants
EARTH_RADIUS = 6371.0  # km
MU = 3.986004418e14  # Earth's standard gravitational parameter (m^3/s^2)
MU_KM = 398600.4418   # km^3/s^2

def true_anomaly_to_mean_anomaly(nu_deg: float, e: float) -> float:
    """
    Converts true anomaly (nu) in degrees to mean anomaly (M) in degrees.
    """
    nu_rad = math.radians(nu_deg)
    
    # Eccentric anomaly (E)
    E = 2.0 * math.atan2(
        math.sqrt(1.0 - e) * math.sin(nu_rad / 2.0),
        math.sqrt(1.0 + e) * math.cos(nu_rad / 2.0)
    )
    
    # Mean anomaly (M)
    M = E - e * math.sin(E)
    return math.degrees(M)

def mean_anomaly_to_true_anomaly(M_deg: float, e: float, tolerance: float = 1e-6) -> float:
    """
    Solves Kepler's Equation M = E - e*sin(E) for Eccentric Anomaly E using Newton-Raphson,
    then converts to True Anomaly (nu) in degrees.
    """
    M_rad = math.radians(M_deg)
    
    # Initial guess for E
    E = M_rad if e < 0.8 else math.pi
    
    for _ in range(100):
        f = E - e * math.sin(E) - M_rad
        fp = 1.0 - e * math.cos(E)
        E_new = E - f / fp
        
        if abs(E_new - E) < tolerance:
            E = E_new
            break
        E = E_new
        
    nu_rad = 2.0 * math.atan2(
        math.sqrt(1.0 + e) * math.sin(E / 2.0),
        math.sqrt(1.0 - e) * math.cos(E / 2.0)
    )
    return math.degrees(nu_rad) % 360.0

def orbital_elements_to_cartesian(
    a_km: float, e: float, i_deg: float, Omega_deg: float, omega_deg: float, nu_deg: float
) -> tuple:
    """
    Converts classical Keplerian orbital elements to ECI Cartesian Position (km) and Velocity (km/s) vectors.
    """
    a = a_km * 1000.0  # Convert semi-major axis to meters
    i = math.radians(i_deg)
    Omega = math.radians(Omega_deg)
    omega = math.radians(omega_deg)
    nu = math.radians(nu_deg)

    # 1. Calculate radial distance r in orbital plane
    # If e is 1 (parabolic) or greater, use alternative formula, but here we assume elliptic orbits
    denominator = 1.0 + e * math.cos(nu)
    if abs(denominator) < 1e-12:
        denominator = 1e-12
    r = (a * (1.0 - e * e)) / denominator

    # Position vector in the orbital plane (perifocal frame)
    rx = r * math.cos(nu)
    ry = r * math.sin(nu)
    rz = 0.0

    # Velocity vector in the orbital plane (perifocal frame)
    # v = sqrt(MU * (2/r - 1/a))
    v = math.sqrt(MU * (2.0 / r - 1.0 / a))
    vx = -v * math.sin(nu)
    vy = v * (e + math.cos(nu))
    vz = 0.0

    # 2. Rotate from perifocal to Earth-Centered Inertial (ECI) coordinates
    cos_Omega = math.cos(Omega)
    sin_Omega = math.sin(Omega)
    cos_omega = math.cos(omega)
    sin_omega = math.sin(omega)
    cos_i = math.cos(i)
    sin_i = math.sin(i)

    # Transform position ECI
    x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * rx + (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * ry
    y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * rx + (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * ry
    z = sin_omega * sin_i * rx + cos_omega * sin_i * ry

    # Transform velocity ECI
    vx_eci = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * vx + (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * vy
    vy_eci = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * vx + (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * vy
    vz_eci = sin_omega * sin_i * vx + cos_omega * sin_i * vy

    # Return position in km and velocity in km/s
    return (
        np.array([x / 1000.0, y / 1000.0, z / 1000.0]),
        np.array([vx_eci / 1000.0, vy_eci / 1000.0, vz_eci / 1000.0])
    )

def propagate_kepler(
    a_km: float, e: float, i_deg: float, Omega_deg: float, omega_deg: float, nu_deg: float, time_seconds: float
) -> tuple:
    """
    Propagates the True Anomaly of an orbit over time_seconds using mean motion.
    Returns the updated Keplerian elements tuple.
    """
    a_m = a_km * 1000.0
    n = math.sqrt(MU / (a_m * a_m * a_m))  # mean motion in rad/s
    
    # Calculate initial mean anomaly
    M0 = true_anomaly_to_mean_anomaly(nu_deg, e)
    
    # Update mean anomaly over time
    M_rad = math.radians(M0) + n * time_seconds
    M_deg = math.degrees(M_rad)
    
    # Calculate new true anomaly
    nu_new = mean_anomaly_to_true_anomaly(M_deg, e)
    
    return (a_km, e, i_deg, Omega_deg, omega_deg, nu_new)
