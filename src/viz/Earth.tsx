import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  TextureLoader,
  type Mesh,
  type ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  BackSide,
  AdditiveBlending,
} from 'three';
import { gstime } from 'satellite.js';
import { useSimStore } from '@/state/useSimStore';
import { sunSceneDirection } from './sun';

/**
 * Realistic Earth — day texture on the sunlit side, night city-lights on the
 * dark side with a soft terminator driven by the real Sun position, plus a
 * drifting cloud layer and an atmospheric rim glow. In Live mode the globe is
 * locked to GMST so satellites sit over the correct longitude.
 */
export function Earth() {
  const ref = useRef<Mesh>(null);
  const cloudRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const [dayMap, nightMap, bumpMap, specMap, cloudMap] = useLoader(TextureLoader, [
    '/textures/earthmap4k.jpg',
    '/textures/earthmap-night4k.jpg',
    '/textures/earthbump4k.jpg',
    '/textures/earthspec2k.jpg',
    '/textures/clouds2k.jpg',
  ]);
  dayMap.colorSpace = SRGBColorSpace;
  nightMap.colorSpace = SRGBColorSpace;

  const uniforms = useMemo(
    () => ({
      uDay: { value: dayMap },
      uNight: { value: nightMap },
      uBump: { value: bumpMap },
      uSpec: { value: specMap },
      uSunDir: { value: new Vector3(1, 0, 0) },
    }),
    [dayMap, nightMap, bumpMap, specMap],
  );

  useFrame((_, delta) => {
    const st = useSimStore.getState();
    const t = st.mode === 'live' ? st.liveTimeMs : Date.now();

    // Sun direction in world space (independent of Earth's spin).
    const [sx, sy, sz] = sunSceneDirection(t);
    uniforms.uSunDir.value.set(sx, sy, sz);

    if (ref.current) {
      if (st.mode === 'live') {
        ref.current.rotation.y = gstime(new Date(st.liveTimeMs)) - Math.PI / 2;
      } else {
        ref.current.rotation.y += delta * ((2 * Math.PI) / 120);
      }
    }
    if (cloudRef.current && ref.current) {
      // Clouds drift slightly faster than the surface.
      cloudRef.current.rotation.y = ref.current.rotation.y + (t / 1000) * 0.00012;
    }
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 128, 128]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
        />
      </mesh>

      {/* Cloud shell */}
      <mesh ref={cloudRef} scale={1.005}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial map={cloudMap} transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* Atmospheric rim glow */}
      <mesh scale={1.04}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          transparent
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
          uniforms={{ uColor: { value: new Vector3(0.3, 0.6, 1.0) } }}
          vertexShader={ATMO_VERT}
          fragmentShader={ATMO_FRAG}
        />
      </mesh>
    </group>
  );
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    // World-space normal (model has only rotation+uniform scale → mat3(modelMatrix) ok)
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uSpec;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float spec = texture2D(uSpec, vUv).r;

    float sun = dot(normalize(vWorldNormal), normalize(uSunDir));
    // Soft terminator band around sun=0
    float dayMix = smoothstep(-0.12, 0.18, sun);

    // City lights only where it's actually dark.
    vec3 cityLights = night * 1.6 * (1.0 - dayMix);
    vec3 lit = day * (0.05 + 1.05 * clamp(dayMix, 0.0, 1.0));

    // Subtle ocean specular highlight toward the sun.
    float specular = pow(clamp(sun, 0.0, 1.0), 8.0) * spec * 0.25;

    vec3 color = lit + cityLights + vec3(specular);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Backside fresnel → bright thin rim, fading inward.
    float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
    gl_FragColor = vec4(uColor, rim * 0.9);
  }
`;
