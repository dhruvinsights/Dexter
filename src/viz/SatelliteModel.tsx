import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '@/state/useSimStore';

/**
 * 3D satellite model shown at the selected satellite's position.
 * Uses a simple cube as placeholder (can be replaced with actual satellite models).
 */
export function SatelliteModel() {
  const selection = useSimStore((s) => s.selection);
  const meshRef = useRef<THREE.Mesh>(null);
  const positionRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useFrame(() => {
    if (!meshRef.current || !selection) return;

    // Get the selected satellite's position from LiveField
    // For now, we'll just show the model at a fixed position
    // In a full implementation, we'd track the actual satellite position
    meshRef.current.rotation.y += 0.01;
  });

  if (!selection) return null;

  return (
    <group>
      {/* Simple satellite representation - a metallic cube with solar panels */}
      <mesh ref={meshRef} position={positionRef.current}>
        {/* Main body */}
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Solar panels */}
      <mesh position={[positionRef.current.x - 0.1, positionRef.current.y, positionRef.current.z]}>
        <boxGeometry args={[0.05, 0.15, 0.01]} />
        <meshStandardMaterial color="#1a4d8f" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[positionRef.current.x + 0.1, positionRef.current.y, positionRef.current.z]}>
        <boxGeometry args={[0.05, 0.15, 0.01]} />
        <meshStandardMaterial color="#1a4d8f" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Selection indicator - glowing ring */}
      <mesh position={positionRef.current} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.14, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Made with Bob
