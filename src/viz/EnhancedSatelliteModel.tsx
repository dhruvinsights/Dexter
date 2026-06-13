import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three-stdlib';
import { MTLLoader } from 'three-stdlib';
import { useSimStore } from '@/state/useSimStore';

interface SatelliteModelProps {
  position?: THREE.Vector3;
  scale?: number;
}

/**
 * Map satellite types/names to 3D model files
 */
const MODEL_MAP: Record<string, { obj: string; mtl: string }> = {
  ISS: { obj: '/meshes/iss.obj', mtl: '/meshes/iss.mtl' },
  HUBBLE: { obj: '/meshes/hubble.obj', mtl: '/meshes/hubble.mtl' },
  GPS: { obj: '/meshes/gps.obj', mtl: '/meshes/gps.mtl' },
  GALILEO: { obj: '/meshes/galileo.obj', mtl: '/meshes/galileo.mtl' },
  GLONASS: { obj: '/meshes/glonass.obj', mtl: '/meshes/glonass.mtl' },
  IRIDIUM: { obj: '/meshes/iridium.obj', mtl: '/meshes/iridium.mtl' },
  GLOBALSTAR: { obj: '/meshes/globalstar.obj', mtl: '/meshes/globalstar.mtl' },
  STARLINK: { obj: '/meshes/starlink.obj', mtl: '/meshes/starlink.mtl' },
  ONEWEB: { obj: '/meshes/oneweb.obj', mtl: '/meshes/oneweb.mtl' },
  FLOCK: { obj: '/meshes/flock.obj', mtl: '/meshes/flock.mtl' },
  SOYUZ: { obj: '/meshes/soyuz.obj', mtl: '/meshes/soyuz.mtl' },
  TIANGONG: { obj: '/meshes/tiangong.obj', mtl: '/meshes/tiangong.mtl' },
  ROCKETBODY: { obj: '/meshes/rocketbody.obj', mtl: '/meshes/rocketbody.mtl' },
  DEBRIS: { obj: '/meshes/debris0.obj', mtl: '/meshes/debris0.mtl' },
  // Default models by size
  S1U: { obj: '/meshes/s1u.obj', mtl: '/meshes/s1u.mtl' },
  S2U: { obj: '/meshes/s2u.obj', mtl: '/meshes/s2u.mtl' },
  S3U: { obj: '/meshes/s3u.obj', mtl: '/meshes/s3u.mtl' },
};

/**
 * Determine which model to use based on satellite name
 */
function getModelForSatellite(name: string): { obj: string; mtl: string } {
  const upperName = name.toUpperCase();
  
  // Check for specific satellites
  for (const [key, model] of Object.entries(MODEL_MAP)) {
    if (upperName.includes(key)) {
      return model;
    }
  }
  
  // Default to small cubesat model
  return MODEL_MAP.S1U;
}

/**
 * Enhanced 3D satellite model with actual mesh loading
 * Loads appropriate model based on satellite type
 */
export function EnhancedSatelliteModel({ position, scale = 0.001 }: SatelliteModelProps) {
  const selection = useSimStore((s) => s.selection);
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selection) {
      setModel(null);
      return;
    }

    setLoading(true);
    const modelInfo = getModelForSatellite(selection.label);
    
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
      modelInfo.mtl,
      (materials: any) => {
        materials.preload();
        
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
          modelInfo.obj,
          (object: THREE.Group) => {
            // Scale and center the model
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center);
            
            setModel(object);
            setLoading(false);
          },
          undefined,
          (error: unknown) => {
            console.error('Error loading OBJ:', error);
            setLoading(false);
            // Fall back to simple geometry
            createFallbackModel();
          }
        );
      },
      undefined,
      (error: unknown) => {
        console.error('Error loading MTL:', error);
        setLoading(false);
        createFallbackModel();
      }
    );

    function createFallbackModel() {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        metalness: 0.8, 
        roughness: 0.2 
      });
      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);
      setModel(group);
    }
  }, [selection]);

  useFrame(() => {
    if (!groupRef.current) return;
    // Slow rotation for visual interest
    groupRef.current.rotation.y += 0.005;
  });

  if (!selection || !model) return null;

  const pos = position || new THREE.Vector3();

  return (
    <group ref={groupRef} position={pos} scale={scale}>
      <primitive object={model} />
      
      {/* Selection indicator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[120, 140, 32]} />
        <meshBasicMaterial 
          color="#00ff88" 
          transparent 
          opacity={0.6} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Satellite label */}
      {!loading && (
        <mesh position={[0, 200, 0]}>
          <sphereGeometry args={[20, 16, 16]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// Made with Bob
