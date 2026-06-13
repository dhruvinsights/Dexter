/**
 * Representative Particle Field — the bridge from MOCAT shell-population data to 3D.
 *
 * MOCAT gives counts per altitude shell per year, NOT trajectories. So we render one
 * particle per ~k real objects, place each on a stable seeded orbit within its shell's
 * altitude band, and animate count + colour as the timeline advances.
 * See plans/02_SIMULATOR_AND_VISUALIZATION.md.
 */

import * as THREE from 'three';
import type { RawMOCATOutput } from '@/integration/contracts';
import { parseShellLabel } from '@/integration/contracts';
import { altitudeToSceneRadius } from '@/viz/coords';
import { interpShell } from './metrics';

const BASE_PARTICLE_TARGET = 7000;
const MAX_PARTICLES = 14000;
const SPEED_K = 0.28; // tuned so a LEO orbit completes in ~25s

// Common orbital inclinations (deg) → radians, for visually varied orbital planes.
const INCLINATIONS = [0, 28.5, 51.6, 53, 70, 74, 81, 86.4, 98].map((d) => (d * Math.PI) / 180);

/** Small deterministic PRNG so a given particle keeps its orbit across years. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ParticleSystem {
  points: THREE.Points;
  meta: {
    count: number;
    output: RawMOCATOutput;
    shellIndex: Int16Array;
    threshold: Float32Array; // activation order within shell, 0..1
    isPayload: Uint8Array;
    radius: Float32Array; // scene units
    angSpeed: Float32Array;
    phase0: Float32Array;
    u: Float32Array; // in-plane axis (ν=0), 3 per particle
    v: Float32Array; // in-plane axis (ν=90), 3 per particle
    baseSize: Float32Array;
    shellPeak: number[]; // peak total objects per shell across all years
    maxColl: number; // global max collisions (per shell-year) for risk normalization
    nShells: number;
  };
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float alpha = smoothstep(0.25, 0.10, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function buildParticleSystem(output: RawMOCATOutput, density: number): ParticleSystem {
  const nShells = output.shells.length;
  const years = output.simulation_years;

  // Peak total objects per shell across all years → particle budget per shell.
  const shellPeak: number[] = new Array(nShells).fill(0);
  let maxColl = 1e-6;
  for (let t = 0; t <= years; t++) {
    for (let s = 0; s < nShells; s++) {
      const total =
        output.payloads_per_shell[t][s] +
        output.debris_per_shell[t][s] +
        output.rocket_bodies_per_shell[t][s];
      if (total > shellPeak[s]) shellPeak[s] = total;
      if (output.collisions_per_shell[t][s] > maxColl) maxColl = output.collisions_per_shell[t][s];
    }
  }
  const sumPeak = shellPeak.reduce((a, b) => a + b, 0) || 1;
  const target = Math.min(MAX_PARTICLES, Math.round(BASE_PARTICLE_TARGET * density));

  const shellParticles = shellPeak.map((p) => Math.max(8, Math.round((target * p) / sumPeak)));
  const count = shellParticles.reduce((a, b) => a + b, 0);

  const shellIndex = new Int16Array(count);
  const threshold = new Float32Array(count);
  const isPayload = new Uint8Array(count);
  const radius = new Float32Array(count);
  const angSpeed = new Float32Array(count);
  const phase0 = new Float32Array(count);
  const u = new Float32Array(count * 3);
  const v = new Float32Array(count * 3);
  const baseSize = new Float32Array(count);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const rng = mulberry32(0x5eed ^ output.scenario_id.length);

  let i = 0;
  for (let s = 0; s < nShells; s++) {
    const { minKm, maxKm } = parseShellLabel(output.shells[s]);
    const n = shellParticles[s];

    // type proportions from the shell's initial population
    const p0 = output.payloads_per_shell[0][s];
    const d0 = output.debris_per_shell[0][s];
    const r0 = output.rocket_bodies_per_shell[0][s];
    const tot0 = p0 + d0 + r0 || 1;
    const payloadFrac = p0 / tot0;
    const debrisFrac = d0 / tot0;

    for (let k = 0; k < n; k++, i++) {
      shellIndex[i] = s;
      threshold[i] = (k + 0.5) / n;

      const roll = rng();
      const payload = roll < payloadFrac;
      const debrisType = !payload && roll < payloadFrac + debrisFrac;
      isPayload[i] = payload ? 1 : 0;
      baseSize[i] = payload ? 0.05 : debrisType ? 0.03 : 0.04;

      const altKm = minKm + rng() * (maxKm - minKm);
      const r = altitudeToSceneRadius(altKm);
      radius[i] = r;
      angSpeed[i] = SPEED_K / Math.pow(r, 1.5);
      phase0[i] = rng() * Math.PI * 2;

      const inc = INCLINATIONS[(rng() * INCLINATIONS.length) | 0];
      const raan = rng() * Math.PI * 2;
      const ci = Math.cos(inc);
      const si = Math.sin(inc);
      const cO = Math.cos(raan);
      const sO = Math.sin(raan);

      // Orthonormal in-plane axes after inclination (about X) then RAAN (about Y-up).
      u[i * 3 + 0] = cO;
      u[i * 3 + 1] = 0;
      u[i * 3 + 2] = -sO;
      v[i * 3 + 0] = ci * sO;
      v[i * 3 + 1] = -si;
      v[i * 3 + 2] = ci * cO;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    meta: {
      count,
      output,
      shellIndex,
      threshold,
      isPayload,
      radius,
      angSpeed,
      phase0,
      u,
      v,
      baseSize,
      shellPeak,
      maxColl,
      nShells,
    },
  };
}

// risk 0..1 → grayscale → amber → red (the only chromatic colours; colour = meaning)
function riskColor(x: number, out: [number, number, number]): void {
  const t = Math.min(1, Math.max(0, x));
  if (t < 0.5) {
    const f = t / 0.5;
    out[0] = 0.83 + (0.96 - 0.83) * f;
    out[1] = 0.83 + (0.62 - 0.83) * f;
    out[2] = 0.83 + (0.04 - 0.83) * f;
  } else {
    const f = (t - 0.5) / 0.5;
    out[0] = 0.96 + (0.94 - 0.96) * f;
    out[1] = 0.62 + (0.27 - 0.62) * f;
    out[2] = 0.04 + (0.27 - 0.04) * f;
  }
}

const tmpColor: [number, number, number] = [0, 0, 0];

/**
 * Advance the field to a fractional `year` with `elapsed` seconds of cosmetic orbital motion.
 * Mutates the geometry buffers in place (no allocation per frame).
 */
export function updateParticleSystem(sys: ParticleSystem, year: number, elapsed: number): void {
  const m = sys.meta;
  const geo = sys.points.geometry;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const col = geo.getAttribute('aColor') as THREE.BufferAttribute;
  const siz = geo.getAttribute('aSize') as THREE.BufferAttribute;
  const posArr = pos.array as Float32Array;
  const colArr = col.array as Float32Array;
  const sizArr = siz.array as Float32Array;

  // Per-shell activation fraction + risk colour at this year.
  const activeFrac = new Float32Array(m.nShells);
  const shellRisk: [number, number, number][] = [];
  for (let s = 0; s < m.nShells; s++) {
    const totalNow =
      interpShell(m.output.payloads_per_shell, year, s) +
      interpShell(m.output.debris_per_shell, year, s) +
      interpShell(m.output.rocket_bodies_per_shell, year, s);
    activeFrac[s] = m.shellPeak[s] > 0 ? totalNow / m.shellPeak[s] : 0;

    const collNow = interpShell(m.output.collisions_per_shell, year, s);
    const risk = Math.sqrt(Math.min(1, collNow / m.maxColl));
    riskColor(risk, tmpColor);
    shellRisk.push([tmpColor[0], tmpColor[1], tmpColor[2]]);
  }

  for (let i = 0; i < m.count; i++) {
    const s = m.shellIndex[i];
    const active = m.threshold[i] <= activeFrac[s];

    if (!active) {
      sizArr[i] = 0;
      continue;
    }

    const theta = m.phase0[i] + m.angSpeed[i] * elapsed;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const r = m.radius[i];
    const o = i * 3;
    posArr[o + 0] = r * (ct * m.u[o + 0] + st * m.v[o + 0]);
    posArr[o + 1] = r * (ct * m.u[o + 1] + st * m.v[o + 1]);
    posArr[o + 2] = r * (ct * m.u[o + 2] + st * m.v[o + 2]);

    sizArr[i] = m.baseSize[i];

    if (m.isPayload[i]) {
      colArr[o + 0] = 1;
      colArr[o + 1] = 1;
      colArr[o + 2] = 1;
    } else {
      const rc = shellRisk[s];
      colArr[o + 0] = rc[0];
      colArr[o + 1] = rc[1];
      colArr[o + 2] = rc[2];
    }
  }

  pos.needsUpdate = true;
  col.needsUpdate = true;
  siz.needsUpdate = true;
}

export function disposeParticleSystem(sys: ParticleSystem): void {
  sys.points.geometry.dispose();
  (sys.points.material as THREE.Material).dispose();
}
