import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type DirectionalLight, type Mesh } from 'three';
import { useSimStore } from '@/state/useSimStore';
import { sunSceneDirection } from './sun';

const SUN_DISTANCE = 80;

/**
 * Directional sunlight + a distant glowing sun disc, both placed at the real
 * solar direction for the current sim time so the lit hemisphere matches the
 * Earth's day/night terminator.
 */
export function SunLight() {
  const lightRef = useRef<DirectionalLight>(null);
  const sunRef = useRef<Mesh>(null);

  useFrame(() => {
    const st = useSimStore.getState();
    const t = st.mode === 'live' ? st.liveTimeMs : Date.now();
    const [x, y, z] = sunSceneDirection(t);
    lightRef.current?.position.set(x * 10, y * 10, z * 10);
    sunRef.current?.position.set(x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE);
  });

  return (
    <group>
      <directionalLight ref={lightRef} intensity={2.6} color="#fff6e8" />
      <ambientLight intensity={0.06} />
      <mesh ref={sunRef}>
        <sphereGeometry args={[3, 24, 24]} />
        <meshBasicMaterial color="#fff3d6" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={0} />
    </group>
  );
}
