import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Earth } from './Earth';
import { Skybox } from './Skybox';
import { ObjectField } from './ObjectField';
import { LiveField } from './LiveField';
import { OrbitRings } from './OrbitRings';
import { SatelliteModel } from './SatelliteModel';
import { useSimStore } from '@/state/useSimStore';

/**
 * Root of the 3D orbital environment. Renders the representative particle field
 * (Scenario mode) or the real SGP4 catalogue (Live Sky mode), plus optional orbit paths.
 */
export function Scene() {
  const mode = useSimStore((s) => s.mode);
  const showOrbits = useSimStore((s) => s.showOrbits);
  const timeMachineActive = useSimStore((s) => s.timeMachineActive);
  const selection = useSimStore((s) => s.selection);

  return (
    <Canvas
      camera={{ position: [0, 1.5, 4], fov: 45, near: 0.01, far: 300 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#000000']} />

      <directionalLight position={[5, 3, 5]} intensity={2.2} />
      <ambientLight intensity={0.08} />

      <Suspense fallback={null}>
        <Skybox />
        <Earth />
        {(showOrbits || timeMachineActive) && <OrbitRings />}
        {mode === 'scenario' ? <ObjectField /> : <LiveField />}
        {mode === 'live' && selection && <SatelliteModel />}
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={1.4}
        maxDistance={40}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
