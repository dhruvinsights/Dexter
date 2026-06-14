import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OrbitPathProps {
  /** Satellite position data over time */
  positions: THREE.Vector3[];
  /** Color of the orbit line */
  color?: THREE.Color | string | number;
  /** Opacity of the orbit line */
  opacity?: number;
  /** Whether to show the full orbit or just a segment */
  showFull?: boolean;
  /** Fade in/out animation */
  fadeIn?: boolean;
}

/**
 * Enhanced orbit path rendering with fade effects and color customization
 * Renders a sampled orbit path as a line.
 */
export function OrbitPath({
  positions,
  color = 0x00ff88,
  opacity = 0.6,
  showFull = true,
  fadeIn = false,
}: OrbitPathProps) {
  const lineRef = useRef<THREE.Line>(null);
  const fadeProgress = useRef(0);

  const line = useMemo(() => {
    if (positions.length < 2) return null;

    const geometry = new THREE.BufferGeometry();
    const points = showFull ? positions : positions.slice(0, Math.floor(positions.length / 2));
    geometry.setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: fadeIn ? 0 : opacity,
      depthWrite: false,
      linewidth: 2,
    });

    return new THREE.Line(geometry, material);
  }, [positions, color, opacity, showFull, fadeIn]);

  useFrame((_, delta) => {
    if (!lineRef.current || !fadeIn) return;

    // Fade in animation
    if (fadeProgress.current < 1) {
      fadeProgress.current = Math.min(1, fadeProgress.current + delta * 2);
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = fadeProgress.current * opacity;
    }
  });

  useEffect(() => {
    if (fadeIn) {
      fadeProgress.current = 0;
    }
  }, [fadeIn]);

  if (!line) return null;

  return <primitive ref={lineRef} object={line} />;
}

/**
 * Generate orbit positions from orbital elements
 * This is a simplified version - in production, use SGP4 propagation
 */
export function generateOrbitPositions(
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  raan: number,
  argOfPerigee: number,
  numPoints: number = 128
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  
  const ci = Math.cos(inclination);
  const si = Math.sin(inclination);
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const cw = Math.cos(argOfPerigee);
  const sw = Math.sin(argOfPerigee);

  // Rotation matrix from orbital plane to ECI
  const Px = cO * cw - sO * sw * ci;
  const Py = sO * cw + cO * sw * ci;
  const Pz = sw * si;
  const Qx = -cO * sw - sO * cw * ci;
  const Qy = -sO * sw + cO * cw * ci;
  const Qz = cw * si;

  for (let i = 0; i <= numPoints; i++) {
    const trueAnomaly = (i / numPoints) * Math.PI * 2;
    const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / 
              (1 + eccentricity * Math.cos(trueAnomaly));
    
    const x_orb = r * Math.cos(trueAnomaly);
    const y_orb = r * Math.sin(trueAnomaly);
    
    // Transform to ECI coordinates
    const x = x_orb * Px + y_orb * Qx;
    const y = x_orb * Py + y_orb * Qy;
    const z = x_orb * Pz + y_orb * Qz;
    
    positions.push(new THREE.Vector3(x, y, z));
  }

  return positions;
}

// Made with Bob
