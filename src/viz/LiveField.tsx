import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore, TIME_MACHINE_END_YEAR } from '@/state/useSimStore';
import { COLOR_SCHEMES } from '@/viz/colorSchemes';
import type { SatelliteData } from '@/viz/colorSchemes';

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
      } else if (msg.type === 'positions') {
        const arr = new Float32Array(msg.buffer);
        const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        (attr.array as Float32Array).set(arr.subarray(0, MAX_OBJECTS * 3));
        attr.needsUpdate = true;
        busy.current = false;
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
          useSimStore.getState().select({
            index: idx,
            norad,
            label: name,
            line1: line1Ref.current[idx],
            line2: line2Ref.current[idx],
          });
          
          // Highlight selected satellite
          const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
          const colorAttr = points.geometry.getAttribute('aColor') as THREE.BufferAttribute;
          const sizes = sizeAttr.array as Float32Array;
          const colors = colorAttr.array as Float32Array;
          
          // Reset all sizes and colors
          for (let i = 0; i < sizes.length; i++) {
            sizes[i] = POINT_SIZE;
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
          }
          
          // Highlight selected
          sizes[idx] = SELECTED_POINT_SIZE;
          colors[idx * 3] = 0.2;
          colors[idx * 3 + 1] = 1.0;
          colors[idx * 3 + 2] = 0.3;
          
          sizeAttr.needsUpdate = true;
          colorAttr.needsUpdate = true;
        }
      } else {
        // Deselect
        useSimStore.getState().select(null);
        const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
        const colorAttr = points.geometry.getAttribute('aColor') as THREE.BufferAttribute;
        (sizeAttr.array as Float32Array).fill(POINT_SIZE);
        const colors = colorAttr.array as Float32Array;
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = 1;
          colors[i + 1] = 1;
          colors[i + 2] = 1;
        }
        sizeAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
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

    // Update colors based on active color scheme
    const colorScheme = COLOR_SCHEMES[st.colorScheme];
    if (colorScheme && noradsRef.current.length > 0) {
      const colorAttr = points.geometry.getAttribute('aColor') as THREE.BufferAttribute;
      const colors = colorAttr.array as Float32Array;
      
      // Apply color scheme (simplified - in production, get full satellite data)
      for (let i = 0; i < Math.min(noradsRef.current.length, 100); i++) {
        const satData: SatelliteData = {
          id: i,
          norad: noradsRef.current[i],
          name: namesRef.current[i],
          type: 'PAYLOAD', // Simplified - would need actual type data
        };
        
        const colorInfo = colorScheme.getColor(satData, {
          satellites: [],
          selectedId: st.selection?.index
        });
        
        colors[i * 3] = colorInfo.color[0];
        colors[i * 3 + 1] = colorInfo.color[1];
        colors[i * 3 + 2] = colorInfo.color[2];
      }
      
      colorAttr.needsUpdate = true;
    }

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
