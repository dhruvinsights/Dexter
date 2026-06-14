import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { useCustomSats } from '@/state/useCustomSats';
import { useSimStore } from '@/state/useSimStore';
import { KM_TO_SCENE } from './coords';
import { play } from '@/lib/sound';

/**
 * Renders user-created satellites (from the Create Satellite panel) as bright,
 * selectable markers at their real SGP4 positions — so a newly created object
 * appears in the exact orbit and can be clicked + zoomed like any catalogue
 * object. Custom selections use index -1 to distinguish from the catalogue.
 */
export function CustomSatField() {
  const sats = useCustomSats((s) => s.sats);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const groupRef = useRef<THREE.Group>(null);

  // Parse each TLE once.
  const recs = useMemo(() => {
    return sats
      .map((s) => {
        try {
          const rec = satellite.twoline2satrec(s.line1, s.line2);
          return rec.error === 0 ? { sat: s, rec } : null;
        } catch {
          return null;
        }
      })
      .filter((x): x is { sat: (typeof sats)[number]; rec: satellite.SatRec } => x !== null);
  }, [sats]);

  // Reusable marker meshes (one per custom sat).
  const markers = useMemo(
    () =>
      recs.map(() => {
        const geo = new THREE.SphereGeometry(0.012, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, toneMapped: false });
        return new THREE.Mesh(geo, mat);
      }),
    [recs],
  );

  useFrame(() => {
    const st = useSimStore.getState();
    const date = new Date(st.liveTimeMs);
    recs.forEach((entry, i) => {
      const pv = satellite.propagate(entry.rec, date);
      const p = pv?.position;
      const marker = markers[i];
      if (p && typeof p !== 'boolean') {
        marker.position.set(p.x * KM_TO_SCENE, p.z * KM_TO_SCENE, -p.y * KM_TO_SCENE);
        const isSelected = st.selection?.index === -1 && st.selection?.norad === entry.sat.id;
        // Hide the dot when selected — the real 3D model (EnhancedSatelliteModel)
        // renders in its place.
        marker.visible = !isSelected;
        if (isSelected) {
          st.setSelectedPos([marker.position.x, marker.position.y, marker.position.z]);
        }
      } else {
        marker.visible = false;
      }
    });
  });

  // Click selection for custom markers.
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!groupRef.current || markers.length === 0) return;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markers, false);
      if (hits.length > 0) {
        const idx = markers.indexOf(hits[0].object as (typeof markers)[number]);
        const entry = recs[idx];
        if (entry) {
          play('beep', 0.3);
          useSimStore.getState().select({
            index: -1,
            norad: entry.sat.id,
            label: entry.sat.name,
            line1: entry.sat.line1,
            line2: entry.sat.line2,
          });
        }
      }
    };
    gl.domElement.addEventListener('click', handler);
    return () => gl.domElement.removeEventListener('click', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, recs, gl, camera]);

  return (
    <group ref={groupRef}>
      {markers.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}
