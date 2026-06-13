/**
 * Coordinate system + scale for the orbital scene.
 *
 * World origin = Earth center. Real-world units are KILOMETRES.
 * We scale km → scene units by EARTH_RADIUS_KM so that Earth's radius = 1 scene unit,
 * keeping coordinates in a comfortable floating-point range.
 *
 * Data from providers arrives in ECI kilometres; multiply by KM_TO_SCENE to render.
 * See plans/02_SIMULATOR_AND_VISUALIZATION.md.
 */

export const EARTH_RADIUS_KM = 6371;

/** Multiply an ECI position in km by this to get scene units (Earth radius = 1). */
export const KM_TO_SCENE = 1 / EARTH_RADIUS_KM;

/** Convert an altitude (km above surface) to a scene-space orbital radius. */
export function altitudeToSceneRadius(altitudeKm: number): number {
  return (EARTH_RADIUS_KM + altitudeKm) * KM_TO_SCENE;
}

/** Convert an ECI km vector to a scene-space [x, y, z]. */
export function eciKmToScene(x: number, y: number, z: number): [number, number, number] {
  return [x * KM_TO_SCENE, y * KM_TO_SCENE, z * KM_TO_SCENE];
}
