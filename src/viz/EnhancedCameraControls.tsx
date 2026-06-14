import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useSimStore } from '@/state/useSimStore';

interface CameraTransition {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  progress: number;
  duration: number;
}

/**
 * Enhanced camera controls with smooth transitions and zoom-to-satellite
 * Smooth fly-to and zoom-to-object camera transitions.
 */
export function EnhancedCameraControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const transitionRef = useRef<CameraTransition | null>(null);

  useEffect(() => {
    const controls = new OrbitControlsImpl(camera, gl.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.4;
    controls.maxDistance = 40;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl]);

  // Fly to the satellite's REAL position once LiveField reports it.
  const flownTo = useRef<string | null>(null);
  useFrame(() => {
    const st = useSimStore.getState();
    if (!controlsRef.current) return;
    if (!st.selection) {
      flownTo.current = null;
      return;
    }
    if (flownTo.current === st.selection.norad || !st.selectedPos) return;
    flownTo.current = st.selection.norad;

    const targetPosition = new THREE.Vector3(...st.selectedPos);
    // Camera sits a short distance back along the Earth→sat direction.
    const dir = targetPosition.clone().normalize();
    const cameraPosition = targetPosition.clone().add(dir.multiplyScalar(0.35)).add(new THREE.Vector3(0.1, 0.1, 0.1));

    transitionRef.current = {
      startPosition: camera.position.clone(),
      endPosition: cameraPosition,
      startTarget: controlsRef.current.target.clone(),
      endTarget: targetPosition,
      progress: 0,
      duration: 1.2,
    };
  });

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Handle camera transition
    if (transitionRef.current) {
      const transition = transitionRef.current;
      transition.progress += delta / transition.duration;

      if (transition.progress >= 1) {
        // Transition complete
        camera.position.copy(transition.endPosition);
        controlsRef.current.target.copy(transition.endTarget);
        transitionRef.current = null;
      } else {
        // Smooth easing (ease-in-out)
        const t = transition.progress;
        const eased = t < 0.5 
          ? 2 * t * t 
          : -1 + (4 - 2 * t) * t;

        // Interpolate position and target
        camera.position.lerpVectors(
          transition.startPosition,
          transition.endPosition,
          eased
        );
        controlsRef.current.target.lerpVectors(
          transition.startTarget,
          transition.endTarget,
          eased
        );
      }
    }

    controlsRef.current.update();
  });

  return null;
}

/**
 * Camera view presets
 */
export const CameraViews = {
  TOP: { position: [0, 5, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  SIDE: { position: [5, 0, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  FRONT: { position: [0, 0, 5] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  ISOMETRIC: { position: [3, 3, 3] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  DEFAULT: { position: [0, 1.5, 4] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
} as const;

/**
 * Apply a camera view preset
 */
export function applyCameraView(
  camera: THREE.Camera,
  controls: OrbitControlsImpl | null,
  view: keyof typeof CameraViews
) {
  const preset = CameraViews[view];
  camera.position.set(preset.position[0], preset.position[1], preset.position[2]);
  if (controls) {
    controls.target.set(preset.target[0], preset.target[1], preset.target[2]);
    controls.update();
  }
}

// Made with Bob
