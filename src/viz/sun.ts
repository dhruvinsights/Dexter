/**
 * Low-precision solar position — good enough to drive a realistic day/night
 * terminator and lighting direction. Returns a unit vector in the same
 * scene/world frame used for satellites: scene = (eci.x, eci.z, -eci.y).
 *
 * Algorithm: NOAA / Astronomical Almanac low-precision sun (≈0.01° accuracy).
 */
const DEG2RAD = Math.PI / 180;

export function sunSceneDirection(timeMs: number): [number, number, number] {
  const jd = timeMs / 86400000 + 2440587.5; // Unix ms → Julian Date
  const n = jd - 2451545.0; // days since J2000

  const L = (280.46 + 0.9856474 * n) % 360; // mean longitude (deg)
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG2RAD; // mean anomaly (rad)

  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG2RAD;
  const epsilon = 23.439 * DEG2RAD; // obliquity of the ecliptic

  // Equatorial (ECI, TEME-ish) unit vector
  const x = Math.cos(lambda);
  const y = Math.cos(epsilon) * Math.sin(lambda);
  const z = Math.sin(epsilon) * Math.sin(lambda);

  // Map ECI → scene frame (north Z → scene Y up), same as the worker.
  return [x, z, -y];
}
