import { useMemo } from 'react';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { useSimStore } from '@/state/useSimStore';
import { KM_TO_SCENE } from './coords';

/**
 * Draws the full orbit of the currently selected satellite by sampling one
 * period of its SGP4 trajectory — the real path, not a circle.
 */
export function SelectedOrbit() {
  const selection = useSimStore((s) => s.selection);
  const liveTimeMs = useSimStore((s) => s.liveTimeMs);
  const minuteBucket = Math.floor(liveTimeMs / 60000);

  const line = useMemo(() => {
    if (!selection?.line1 || !selection?.line2) return null;
    let rec: satellite.SatRec;
    try {
      rec = satellite.twoline2satrec(selection.line1, selection.line2);
      if (rec.error !== 0) return null;
    } catch {
      return null;
    }
    const periodMin = (2 * Math.PI) / rec.no;
    const steps = 256;
    const pts: THREE.Vector3[] = [];
    const base = minuteBucket * 60000;
    for (let i = 0; i <= steps; i++) {
      const date = new Date(base + (i / steps) * periodMin * 60000);
      const pv = satellite.propagate(rec, date);
      const p = pv?.position;
      if (p && typeof p !== 'boolean') {
        pts.push(new THREE.Vector3(p.x * KM_TO_SCENE, p.z * KM_TO_SCENE, -p.y * KM_TO_SCENE));
      }
    }
    if (pts.length < 2) return null;
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.7 });
    return new THREE.Line(geo, mat);
  }, [selection?.line1, selection?.line2, minuteBucket]);

  if (!line) return null;
  return <primitive object={line} />;
}
