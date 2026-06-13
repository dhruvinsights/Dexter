# 04 — Frontend Architecture

> How the application code is organized: folders, state, routing, and the black-and-white design system.

---

## Folder Structure

```
src/
├── main.tsx                     # React entry
├── App.tsx                      # Router + providers
│
├── viz/                         # ── 3D VISUALIZATION ENGINE (R3F) ──
│   ├── Scene.tsx                # <Canvas> root, camera, lights
│   ├── Earth.tsx                # textured globe + atmosphere
│   ├── Skybox.tsx               # grayscale star background
│   ├── ObjectField.tsx          # THREE.Points field (the satellites/debris)
│   ├── ShellBands.tsx           # translucent congestion bands (scenario mode)
│   ├── CollisionEvents.tsx      # collision flash bursts
│   ├── SelectedObject.tsx       # .obj model + orbit line for focused object
│   ├── shaders/                 # GLSL for the point field
│   └── coords.ts                # ECI↔scene, KM_TO_SCENE, GMST rotation
│
├── sim/                         # ── SIMULATION / SCENE STATE ──
│   ├── types.ts                 # SceneState, RenderObject, ShellState, SceneTime
│   ├── SceneProvider.ts         # interface
│   ├── ScenarioProvider.ts      # RawMOCATOutput → representative particle field
│   ├── LiveSkyProvider.ts       # TLE + SGP4 → real positions
│   ├── particleField.ts         # seeded sampling/placement of shell particles
│   └── workers/
│       ├── propagate.worker.ts  # SGP4 off-thread (live)
│       └── resample.worker.ts   # particle resampling off-thread (scenario)
│
├── integration/                 # ── BACKEND BOUNDARY ──
│   ├── apiClient.ts             # axios/fetch instance, base URL, errors
│   ├── contracts/               # TS types mirroring backend (03_DATA_CONTRACTS)
│   ├── schemas/                 # Zod validators for each contract type
│   ├── endpoints/               # one module per resource (data, scenarios, metrics, ai)
│   └── mocks/                   # contract-valid mock data + mock endpoints
│
├── state/                       # ── ZUSTAND STORES ──
│   ├── useSimStore.ts           # mode, activeScenarioId, time, playback, detail(k)
│   ├── useSelectionStore.ts     # hovered/selected object or shell
│   └── useUiStore.ts            # panels open, theme, etc.
│
├── features/                    # ── PRODUCT UI (pages/panels) ──
│   ├── explore/                 # main split view: 3D + controls (default screen)
│   ├── policies/                # policy/scenario picker + params
│   ├── compare/                 # side-by-side scenario comparison
│   ├── metrics/                 # charts/KPIs supporting the 3D story
│   ├── analyst/                 # AI sustainability analyst chat panel
│   └── timeline/                # playback scrubber (shared control)
│
├── components/                  # ── SHARED UI PRIMITIVES (B&W) ──
│   ├── Panel.tsx  Button.tsx  Toggle.tsx  Slider.tsx  Stat.tsx  Legend.tsx ...
│
├── lib/                         # formatters, math helpers, constants
└── styles/
    └── globals.css              # Tailwind + design tokens
```

Principle: **three concentric rings** — `integration` (data in) → `sim` (data shaped) → `viz`+`features`
(data shown). Dependencies point inward-to-outward only; `viz` never imports `integration`.

---

## State Model (Zustand)

Why Zustand: it works **both** inside the R3F render loop (via `getState()` / transient subscriptions,
no re-render storms) and in normal React components. One source of truth for "what time is it, what
mode, what's selected."

```ts
// useSimStore — the spine of the app
interface SimStore {
  mode: 'live' | 'scenario';
  activeScenarioId: string | null;
  provider: SceneProvider | null;       // current data source

  // timeline
  time: SceneTime;                       // current instant
  isPlaying: boolean;
  speed: number;                         // multiplier / years-per-sec
  bounds: { start: SceneTime; end: SceneTime };

  // visualization detail
  particleDetailK: number;               // 1 particle per k objects

  setMode(m): void;
  loadScenario(id: string): Promise<void>;
  setTime(t): void; play(): void; pause(): void; setSpeed(s): void;
}
```

The R3F render loop reads `useSimStore.getState().time` each frame and asks `provider.getSceneStateAt(time)`
— it does **not** subscribe to React re-renders for per-frame data.

---

## Routing

Keep it minimal — the product is mostly one immersive screen, not a many-page dashboard.

```
/                    → Explore (3D environment + controls)  [default, primary]
/compare             → Side-by-side scenario comparison
/analyst             → AI analyst (also available as a docked panel on /)
/reports             → Report export (later phase)
```

`Explore` is the centerpiece: the 3D scene fills the viewport; policy picker, timeline, and a
collapsible metrics/analyst rail dock around it. This matches the vision — the simulation *is* the UI,
not a tab within it.

---

## Black-and-White Design System

The deliberate aesthetic: **monochrome, high-contrast, restrained** — so the orbital environment (and
the one or two risk-accent colours) carry all the visual weight. This is also what makes it feel
"clean and modern" vs KeepTrack's busy expert UI.

### Tokens (`tailwind.config` + CSS vars)

```
Background:   #000000  (true black — space)
Surface:      #0a0a0a / #111111  (panels)
Border:       #1f1f1f / #2a2a2a
Text:         #ffffff (primary) · #a3a3a3 (muted) · #525252 (faint)
Accent:       a single restrained accent for interactive elements (#ffffff on hover-glow)
Risk scale:   the ONLY chromatic colours, reserved for data meaning:
              low #d4d4d4 → elevated #f59e0b(amber) → critical #ef4444(red)
```

Rules:
- Chrome is grayscale. **Colour = meaning** (risk, collisions) and nothing else. A red dot always
  means danger, never decoration.
- Typography: one clean sans (Inter) + a mono (JetBrains Mono) for numbers/telemetry.
- Generous spacing, thin 1px borders, subtle glass/blur on floating panels over the 3D scene.
- Motion is purposeful (camera eases, particles drift); no gratuitous animation.

### Layout sketch (Explore)

```
┌───────────────────────────────────────────────────────────────┐
│  ◐ ORBITAL SENTINEL          [ Live Sky | Scenario ]   status ●│  top bar
├───────────────┬───────────────────────────────────────────────┤
│  POLICIES      │                                               │
│  ○ Baseline    │                                               │
│  ● ADR         │              3D ORBITAL ENVIRONMENT           │
│  ○ Launch Cap  │              (Earth + object field)           │
│  ○ Hybrid      │                                               │
│  ──────────    │                                               │
│  detail  ▦▦▦   │                                               │
├───────────────┴───────────────────────────────────────────────┤
│  ◀◀  ▶  ▶▶   Year 2031 ───────●──────────── 2054   1×  ⟳ now   │  timeline
├───────────────────────────────────────────────────────────────┤
│  Debris 12,480  ▲   Collisions/yr 3.2  ▲   Sustainability  C   │  metrics strip
└───────────────────────────────────────────────────────────────┘
   (AI analyst slides in from the right as a docked panel)
```

---

## Performance & Quality Bars

- 60 fps with ~30k points on a mid laptop; graceful detail-K fallback below that.
- No per-frame React renders for scene data (transient store reads only).
- Heavy compute (SGP4, resampling) off the main thread.
- Backend payloads validated at the boundary; UI degrades gracefully if a service is down (mock/offline).
- Type-safe end to end; no `any` across the contract boundary.

---

## Dependencies (target)

```
react react-dom typescript vite
three @react-three/fiber @react-three/drei
zustand @tanstack/react-query
tailwindcss
zod
satellite.js            # SGP4 for Live Sky
recharts                # metrics charts
lucide-react            # icons
```
