import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Crisp deep-space starfield — thousands of points on a large sphere shell.
 * Gives the "more black, more stars" depth on top of the dimmed Milky Way.
 */
export function Starfield({ count = 4000 }: { count?: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Uniform on a sphere shell (radius 80–110, well outside the action).
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 80 + Math.random() * 30;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Slight blue/white/amber temperature variation.
      const t = Math.random();
      tint.setHSL(0.55 + (t - 0.5) * 0.12, 0.25, 0.7 + Math.random() * 0.3);
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
      sizes[i] = Math.random() < 0.06 ? 0.5 : 0.18; // a few bright stars
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }, [count]);

  return <primitive object={points} />;
}
