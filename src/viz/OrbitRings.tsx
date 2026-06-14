import { useMemo } from 'react';
import * as THREE from 'three';
import { altitudeToSceneRadius } from './coords';

const INCLINATIONS = [0, 28.5, 51.6, 53, 63.4, 70, 81, 86.4, 98].map((d) => (d * Math.PI) / 180);
const RING_COUNT = 90;
const SEGMENTS = 96;

/**
 * Faint great-circle orbit paths, sampled across common inclinations and LEO/MEO
 * altitudes — gives a visible "orbital cage" so the structure of orbits is legible.
 * Toggleable; purely a visual guide (not tied to a specific object).
 */
export function OrbitRings() {
  const lines = useMemo(() => {
    const positions = new Float32Array(RING_COUNT * SEGMENTS * 2 * 3);
    let ptr = 0;

    // deterministic spread
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let ring = 0; ring < RING_COUNT; ring++) {
      const inc = INCLINATIONS[ring % INCLINATIONS.length];
      const raan = rand() * Math.PI * 2;
      const altKm = 350 + rand() * 1400;
      const r = altitudeToSceneRadius(altKm);

      const ci = Math.cos(inc);
      const si = Math.sin(inc);
      const cO = Math.cos(raan);
      const sO = Math.sin(raan);
      // in-plane orthonormal axes (same convention as the particle field)
      const ux = cO,
        uy = 0,
        uz = -sO;
      const vx = ci * sO,
        vy = -si,
        vz = ci * cO;

      for (let s = 0; s < SEGMENTS; s++) {
        const a0 = (s / SEGMENTS) * Math.PI * 2;
        const a1 = ((s + 1) / SEGMENTS) * Math.PI * 2;
        for (const a of [a0, a1]) {
          const c = Math.cos(a);
          const sn = Math.sin(a);
          positions[ptr++] = r * (c * ux + sn * vx);
          positions[ptr++] = r * (c * uy + sn * vy);
          positions[ptr++] = r * (c * uz + sn * vz);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x2a3a4a, // darker steel-blue so the orbit web reads as a faint backdrop
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
    });
    return new THREE.LineSegments(geo, mat);
  }, []);

  return <primitive object={lines} />;
}
