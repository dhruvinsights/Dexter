import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore, TIME_MACHINE_END_YEAR } from '@/state/useSimStore';
import { loadSatcat, satcatOwner, satcatType } from '@/lib/satcat';
import { ownerInfo } from '@/lib/owners';

// Removed MAX_OBJECTS limit to load all available satellites from CelesTrak
const MAX_OBJECTS = 20000; // Increased to accommodate all CelesTrak satellites (~15,699)
const UPDATE_INTERVAL_MS = 300; // re-propagate ~3×/s (screen motion is slow at this scale)
const POINT_SIZE = 0.035;
const SELECTED_POINT_SIZE = 0.08;

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
    float a = smoothstep(0.25, 0.10, d);
    gl_FragColor = vec4(vColor, a);
  }
`;

/**
 * Live Sky — real NORAD catalogue propagated with SGP4 in a worker. REAL positions.
 * Renders up to MAX_OBJECTS as a point field, advancing a (speed-scaled) clock.
 */
export function LiveField() {
  const noradsRef = useRef<string[]>([]);
  const namesRef = useRef<string[]>([]);
  const line1Ref = useRef<string[]>([]);
  const line2Ref = useRef<string[]>([]);
  const launchYearsRef = useRef<Int16Array>(new Int16Array(0));
  const paintColorsRef = useRef<() => void>(() => {});
  const lastTMYear = useRef(-1);
  const lastUpdate = useRef(0);
  const pendingTime = useRef(0);
  const busy = useRef(false);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  const worker = useMemo(
    () => new Worker(new URL('@/sim/liveSky.worker.ts', import.meta.url), { type: 'module' }),
    [],
  );

  const points = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_OBJECTS * 3); // origin until first propagation
    const colors = new Float32Array(MAX_OBJECTS * 3);
    const sizes = new Float32Array(MAX_OBJECTS);
    for (let i = 0; i < MAX_OBJECTS; i++) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = POINT_SIZE;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }, []);

  useEffect(() => {
    points.frustumCulled = false;

    // Paint the FULL catalogue's colours from the active scheme (was capped at
    // 100 dots before). country → owner colour, objectType → PAY/R&B/DEB.
    const paintColors = () => {
      const norads = noradsRef.current;
      if (norads.length === 0) return;
      const scheme = useSimStore.getState().colorScheme;
      const colorAttr = points.geometry.getAttribute('aColor') as THREE.BufferAttribute;
      const colors = colorAttr.array as Float32Array;
      for (let i = 0; i < norads.length; i++) {
        let c: [number, number, number];
        if (scheme === 'country') {
          c = ownerInfo(satcatOwner(norads[i])).color;
        } else if (scheme === 'objectType') {
          const t = satcatType(norads[i]);
          c = t === 'DEB' ? [1, 0.35, 0.3] : t === 'R/B' ? [1, 0.7, 0.2] : [0.3, 1, 0.5];
        } else {
          c = [1, 1, 1];
        }
        colors[i * 3] = c[0];
        colors[i * 3 + 1] = c[1];
        colors[i * 3 + 2] = c[2];
      }
      colorAttr.needsUpdate = true;
      console.info(`[livefield] painted ${norads.length} dots · scheme=${scheme}`);
    };
    paintColorsRef.current = paintColors;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        noradsRef.current = msg.norads;
        namesRef.current = msg.names;
        line1Ref.current = msg.line1 ?? [];
        line2Ref.current = msg.line2 ?? [];
        launchYearsRef.current = Int16Array.from(msg.launchYears as number[]);
        points.geometry.setDrawRange(0, msg.count);
        useSimStore.getState().setLiveCount(msg.count);
        console.info(`[livefield] catalogue ready: ${msg.count} objects (SGP4)`);
        // Colour once now (white), then re-paint when SATCAT arrives.
        paintColors();
        loadSatcat().then(paintColors);
      } else if (msg.type === 'positions') {
        const arr = new Float32Array(msg.buffer);
        const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        (attr.array as Float32Array).set(arr.subarray(0, MAX_OBJECTS * 3));
        attr.needsUpdate = true;
        busy.current = false;

        // Feed the selected object's real scene position to the store so the
        // 3D model + camera fly-to can track it.
        const sel = useSimStore.getState().selection;
        if (sel && sel.index >= 0) {
          const i = sel.index * 3;
          useSimStore.getState().setSelectedPos([arr[i], arr[i + 1], arr[i + 2]]);
        }
      }
    };

    // Click handler for satellite selection
    const handleClick = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      raycaster.params.Points!.threshold = 0.05;

      const intersects = raycaster.intersectObject(points);
      if (intersects.length > 0 && intersects[0].index !== undefined) {
        const idx = intersects[0].index;
        const norad = noradsRef.current[idx];
        const name = namesRef.current[idx];
        if (norad && name) {
          const owner = ownerInfo(satcatOwner(norad));
          console.info(
            `[livefield] selected #${norad} "${name}" idx=${idx} owner=${satcatOwner(norad) ?? '?'} ${owner.flag} ${owner.name}`,
          );
          useSimStore.getState().select({
            index: idx,
            norad,
            label: name,
            line1: line1Ref.current[idx],
            line2: line2Ref.current[idx],
          });

          // Restore the scheme colours, then highlight the selected dot.
          paintColorsRef.current();
          const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
          const colorAttr = points.geometry.getAttribute('aColor') as THREE.BufferAttribute;
          const sizes = sizeAttr.array as Float32Array;
          const colors = colorAttr.array as Float32Array;
          sizes[idx] = SELECTED_POINT_SIZE;
          colors[idx * 3] = 0.2;
          colors[idx * 3 + 1] = 1.0;
          colors[idx * 3 + 2] = 0.3;
          sizeAttr.needsUpdate = true;
          colorAttr.needsUpdate = true;
        }
      } else {
        // Deselect — restore scheme colours + default sizes.
        useSimStore.getState().select(null);
        const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
        (sizeAttr.array as Float32Array).fill(POINT_SIZE);
        sizeAttr.needsUpdate = true;
        paintColorsRef.current();
      }
    };

    gl.domElement.addEventListener('click', handleClick);

    // load the real catalogue
    fetch('/tle/TLE.txt')
      .then((r) => r.text())
      .then((text) => worker.postMessage({ type: 'init', text, max: MAX_OBJECTS }));

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      worker.terminate();
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    };
  }, [worker, points, gl, camera, raycaster, mouse]);

  // Repaint all dots when the user changes the colour scheme.
  useEffect(() => {
    const unsub = useSimStore.subscribe((s, prev) => {
      if (s.colorScheme !== prev.colorScheme) paintColorsRef.current();
    });
    return unsub;
  }, []);

  useFrame((_, delta) => {
    const st = useSimStore.getState();

    // advance the live clock
    let t = st.liveTimeMs;
    if (st.isPlaying) {
      t += delta * 1000 * st.liveSpeed;
      st.setLiveTime(t);
    }

    const now = performance.now();
    if (!busy.current && now - lastUpdate.current >= UPDATE_INTERVAL_MS) {
      lastUpdate.current = now;
      pendingTime.current = t;
      busy.current = true;
      worker.postMessage({ type: 'tick', time: t });
    }

    // Colours are painted once on catalogue/SATCAT load and on scheme change
    // (see paintColors / the colorScheme subscription) — not per frame.

    // Time Machine — sweep through real launch history, hiding objects
    // that haven't reached orbit yet (by real TLE launch year).
    if (st.timeMachineActive) {
      let y = st.timeMachineYear;
      if (st.timeMachinePlaying) {
        y += delta * st.timeMachineSpeed;
        if (y > TIME_MACHINE_END_YEAR) y = 1957;
        st.setTimeMachineYear(y);
      }
      const yearFloor = Math.floor(y);
      if (yearFloor !== lastTMYear.current && launchYearsRef.current.length > 0) {
        lastTMYear.current = yearFloor;
        const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
        const sizes = sizeAttr.array as Float32Array;
        const launchYears = launchYearsRef.current;
        for (let i = 0; i < launchYears.length; i++) {
          sizes[i] = launchYears[i] <= yearFloor ? POINT_SIZE : 0;
        }
        sizeAttr.needsUpdate = true;
      }
    } else if (lastTMYear.current !== -1) {
      lastTMYear.current = -1;
      const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
      (sizeAttr.array as Float32Array).fill(POINT_SIZE);
      sizeAttr.needsUpdate = true;
    }
  });

  return <primitive object={points} />;
}
