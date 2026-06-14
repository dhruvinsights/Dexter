import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore, TIME_MACHINE_END_YEAR } from '@/state/useSimStore';
import { loadSatcat, satcatOwner, satcatType } from '@/lib/satcat';
import { ownerInfo } from '@/lib/owners';

// Holds the full Space-Track 18 SDS catalogue (~28k objects) as well as the
// smaller CelesTrak feed (~18k). Buffers scale linearly with this; 40k leaves
// headroom as the catalogue grows.
const MAX_OBJECTS = 40000;
const UPDATE_INTERVAL_MS = 300; // re-propagate ~3×/s (screen motion is slow at this scale)
const POINT_SIZE = 0.05;
const SELECTED_POINT_SIZE = 0.1;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(aSize * (300.0 / -mv.z), 2.0);
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
  const hoverIndex = useRef(-1); // point-cloud index under the cursor (-1 = none)
  const newIndices = useRef<number[]>([]); // objects launched in the current TM year
  const boostPhase = useRef(0); // 1 → 0 fade for the "launch into existence" pulse
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  // Halo ring that snaps to the hovered dot so it's obvious which object the
  // cursor is on. A separate object (not a buffer edit) so it never collides
  // with selection/scheme/time-machine colouring of the point cloud.
  const hoverMarker = useMemo(() => {
    const geo = new THREE.RingGeometry(0.6, 0.85, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.renderOrder = 999;
    mesh.frustumCulled = false;
    return mesh;
  }, []);

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
        useSimStore.getState().setCatalogueReady(true, 'Ready');
        console.info(`[boot] catalogue parsed: ${msg.count} objects — propagating first epoch (SGP4)`);
        // Colour once now, then re-paint when the catalogue metadata arrives.
        paintColors();
        const buildTable = () => {
          const norads = noradsRef.current;
          const names = namesRef.current;
          const years = launchYearsRef.current;
          const rows = norads.map((norad, i) => {
            const owner = ownerInfo(satcatOwner(norad));
            return {
              index: i,
              norad,
              name: names[i] ?? `NORAD ${norad}`,
              owner: satcatOwner(norad) ?? '?',
              ownerFlag: owner.flag,
              ownerName: owner.name,
              type: satcatType(norad) ?? '?',
              launchYear: years[i] ?? 0,
              line1: line1Ref.current[i],
              line2: line2Ref.current[i],
            };
          });
          useSimStore.getState().setCatalogue(rows);
        };
        buildTable();
        loadSatcat().then(() => {
          paintColors();
          buildTable();
          console.info('[boot] object metadata applied (owners, types)');
        });
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
      // Scale the pick radius with camera distance so dots stay clickable when
      // zoomed out (a fixed threshold misses tiny far-away points).
      const camDist = camera.position.length();
      raycaster.params.Points!.threshold = Math.max(0.04, camDist * 0.012);

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

          // select() clears selectedPos; seed it immediately from the dot's
          // current scene position so the 3D model appears on click without
          // waiting for the next SGP4 worker tick (the worker keeps it tracking
          // afterwards). Mirrors how custom satellites set their position.
          const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
          const pa = posAttr.array as Float32Array;
          useSimStore.getState().setSelectedPos([pa[idx * 3], pa[idx * 3 + 1], pa[idx * 3 + 2]]);

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

    // Hover → floating tooltip. Throttled raycast against the point cloud; sets
    // the hovered object + cursor screen position in the store (a DOM overlay
    // renders the tooltip). Mirrors the click raycast's distance-scaled radius.
    let lastHover = 0;
    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastHover < 40) return;
      lastHover = now;

      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const camDist = camera.position.length();
      raycaster.params.Points!.threshold = Math.max(0.04, camDist * 0.012);

      const intersects = raycaster.intersectObject(points);
      if (intersects.length > 0 && intersects[0].index !== undefined) {
        const idx = intersects[0].index;
        const norad = noradsRef.current[idx];
        const name = namesRef.current[idx];
        if (norad && name) {
          hoverIndex.current = idx;
          gl.domElement.style.cursor = 'pointer';
          useSimStore.getState().setHovered({
            norad,
            label: name,
            launchYear: launchYearsRef.current[idx] ?? 0,
            x: event.clientX,
            y: event.clientY,
          });
          return;
        }
      }
      hoverIndex.current = -1;
      gl.domElement.style.cursor = '';
      if (useSimStore.getState().hovered) useSimStore.getState().setHovered(null);
    };

    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('pointermove', handlePointerMove);

    // load the real catalogue (GP/TLE data)
    useSimStore.getState().setCatalogueReady(false, 'Downloading orbital catalogue…');
    console.info('[boot] downloading GP catalogue (/tle/TLE.txt)…');
    fetch('/tle/TLE.txt')
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then((text) => {
        useSimStore.getState().setCatalogueReady(false, 'Parsing element sets…');
        console.info(`[boot] catalogue downloaded (${(text.length / 1e6).toFixed(1)} MB) — parsing`);
        worker.postMessage({ type: 'init', text, max: MAX_OBJECTS });
      })
      .catch((err) => {
        console.error('[boot] failed to load /tle/TLE.txt — run `npm run fetch-tle`', err);
        useSimStore.getState().setCatalogueReady(true, 'Catalogue unavailable');
      });

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.style.cursor = '';
      useSimStore.getState().setHovered(null);
      worker.terminate();
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
      hoverMarker.geometry.dispose();
      (hoverMarker.material as THREE.Material).dispose();
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

    // Snap the hover halo to the dot under the cursor, sized to stay a constant
    // ~screen size and oriented to face the camera (reads the live position
    // straight from the point cloud so it tracks the object's motion).
    const hi = hoverIndex.current;
    if (hi >= 0) {
      const pa = (points.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      hoverMarker.position.set(pa[hi * 3], pa[hi * 3 + 1], pa[hi * 3 + 2]);
      hoverMarker.quaternion.copy(camera.quaternion);
      const d = camera.position.distanceTo(hoverMarker.position);
      hoverMarker.scale.setScalar(d * 0.008);
      hoverMarker.visible = true;
    } else if (hoverMarker.visible) {
      hoverMarker.visible = false;
    }

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
      const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
      const sizes = sizeAttr.array as Float32Array;

      if (yearFloor !== lastTMYear.current && launchYearsRef.current.length > 0) {
        lastTMYear.current = yearFloor;
        const launchYears = launchYearsRef.current;
        // Reconstruct the population: show only objects launched up to this year;
        // collect this year's launches so they can animate "into existence".
        const fresh: number[] = [];
        for (let i = 0; i < launchYears.length; i++) {
          if (launchYears[i] > yearFloor) {
            sizes[i] = 0;
          } else if (launchYears[i] === yearFloor) {
            fresh.push(i);
            sizes[i] = POINT_SIZE; // size set by the boost below
          } else {
            sizes[i] = POINT_SIZE;
          }
        }
        newIndices.current = fresh;
        boostPhase.current = fresh.length > 0 ? 1 : 0;
        sizeAttr.needsUpdate = true;
      }

      // Per-frame "launch flash": this year's new objects bloom large then settle
      // to normal, so the user sees them appear rather than blink on.
      if (boostPhase.current > 0.02 && newIndices.current.length > 0) {
        boostPhase.current *= Math.pow(0.04, delta); // ~half-life 0.18s
        const s = POINT_SIZE * (1 + boostPhase.current * 5);
        for (const i of newIndices.current) sizes[i] = s;
        sizeAttr.needsUpdate = true;
      } else if (boostPhase.current !== 0 && newIndices.current.length > 0) {
        boostPhase.current = 0;
        for (const i of newIndices.current) sizes[i] = POINT_SIZE;
        sizeAttr.needsUpdate = true;
      }
    } else if (lastTMYear.current !== -1) {
      lastTMYear.current = -1;
      newIndices.current = [];
      boostPhase.current = 0;
      const sizeAttr = points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
      (sizeAttr.array as Float32Array).fill(POINT_SIZE);
      sizeAttr.needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={points} />
      <primitive object={hoverMarker} />
    </>
  );
}
