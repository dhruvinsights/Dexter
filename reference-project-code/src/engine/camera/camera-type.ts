/**
 * Represents the different types of cameras available.
 *
 * TODO: This should be replaced with different camera classes
 */

export enum CameraType {
  CURRENT = 0,
  FIXED_TO_EARTH = 1,
  FLAT_MAP = 2,
  FIXED_TO_SAT_ECI = 3,
  FIXED_TO_SAT_LVLH = 4,
  POLAR_VIEW = 5,
  SATELLITE_FIRST_PERSON = 6,
  PLANETARIUM = 7,
  ASTRONOMY = 8,
  FPS = 9,
  MAX_CAMERA_TYPES = 10,
}
