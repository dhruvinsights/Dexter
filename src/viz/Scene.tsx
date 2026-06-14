import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Earth } from './Earth';
import { Skybox } from './Skybox';
import { Starfield } from './Starfield';
import { ObjectField } from './ObjectField';
import { LiveField } from './LiveField';
import { CustomSatField } from './CustomSatField';
import { OrbitRings } from './OrbitRings';
import { EnhancedSatelliteModel } from './EnhancedSatelliteModel';
import { EnhancedCameraControls } from './EnhancedCameraControls';
import { SunLight } from './SunLight';
import { SelectedOrbit } from './SelectedOrbit';
import { useSimStore } from '@/state/useSimStore';

/**
 * Root of the 3D orbital environment. Renders the representative particle field
 * (Scenario mode) or the real SGP4 catalogue (Live Sky mode), plus optional orbit paths.
 *
 * Phase 1 Enhancements:
 * - Enhanced camera controls with zoom-to-satellite
 * - 3D satellite models with mesh loading
 * - Color scheme system support
 * - Improved orbit rendering
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

      <SunLight />

      <Suspense fallback={null}>
        <Skybox />
        <Starfield />
        <Earth />
        {(showOrbits || timeMachineActive) && <OrbitRings />}
        {mode === 'scenario' ? <ObjectField /> : <LiveField />}
        {mode === 'live' && <CustomSatField />}
        {mode === 'live' && selection && (
          <>
            {showOrbits && <SelectedOrbit />}
            <EnhancedSatelliteModel />
          </>
        )}
      </Suspense>

      <EnhancedCameraControls />
    </Canvas>
  );
}
