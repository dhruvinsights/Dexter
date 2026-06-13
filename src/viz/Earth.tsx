import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, type Mesh, SRGBColorSpace } from 'three';
import { gstime } from 'satellite.js';
import { useSimStore } from '@/state/useSimStore';

/**
 * Textured Earth at the scene origin (radius = 1 scene unit).
 * - Scenario mode: gentle cosmetic rotation.
 * - Live mode: rotation locked to GMST so real satellites sit over the right longitude.
 */
export function Earth() {
  const ref = useRef<Mesh>(null);

  const [dayMap, bumpMap, specMap] = useLoader(TextureLoader, [
    '/textures/earthmap4k.jpg',
    '/textures/earthbump4k.jpg',
    '/textures/earthspec2k.jpg',
  ]);
  dayMap.colorSpace = SRGBColorSpace;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const st = useSimStore.getState();
    if (st.mode === 'live') {
      // align texture longitude with Earth rotation angle at the live time
      ref.current.rotation.y = gstime(new Date(st.liveTimeMs)) - Math.PI / 2;
    } else {
      ref.current.rotation.y += delta * ((2 * Math.PI) / 120);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 96, 96]} />
      <meshStandardMaterial
        map={dayMap}
        bumpMap={bumpMap}
        bumpScale={0.015}
        roughnessMap={specMap}
        metalness={0.05}
        roughness={0.9}
      />
    </mesh>
  );
}
