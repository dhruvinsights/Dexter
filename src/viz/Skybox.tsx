import { useLoader } from '@react-three/fiber';
import { TextureLoader, BackSide, SRGBColorSpace } from 'three';

/**
 * Real Milky Way starfield, rendered on the inside of a large sphere.
 * Uses the high-res deep-sky panorama for a believable space backdrop.
 */
export function Skybox() {
  const texture = useLoader(TextureLoader, '/textures/skybox4k.jpg');
  texture.colorSpace = SRGBColorSpace;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[120, 64, 64]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} />
    </mesh>
  );
}
