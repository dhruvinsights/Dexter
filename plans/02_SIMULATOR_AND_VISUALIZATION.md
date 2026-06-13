# 02 — Simulator & Visualization (the core of this repo)

> The heart of the product: how we turn data into a living orbital environment.
> Read [01_SYSTEM_ARCHITECTURE.md](01_SYSTEM_ARCHITECTURE.md) first.

---

## The Single Most Important Fact

**MOCAT does not output satellite trajectories. It outputs population *counts per altitude shell per
year*.**

From [reference-project-code/plans/02_MOCAT_SIMULATION.md](../reference-project-code/plans/02_MOCAT_SIMULATION.md),
the simulation result is:

```
RawMOCATOutput {
  shells:    ["200-400km", "400-500km", ... ]      // ~11 altitude bands
  timesteps: [0, 1, 2, ... 30]                      // years
  debris_per_shell:     number[year][shell]         // counts
  payloads_per_shell:   number[year][shell]
  collisions_per_shell: number[year][shell]
  ...
}
```

There are **no per-object positions, no orbits, no inclinations** in this output. It is a statistical
source-sink model. This is *correct* for projecting decades ahead — you cannot meaningfully predict
where individual fragment #840,213 will be in 2056 — but it means:

> ❌ We must **not** fake individual real trajectories for scenario futures.
> ✅ We **must** visualize *density, congestion, and risk per shell, evolving over time.*

Misunderstanding this is exactly what makes a tracking tool feel like the wrong foundation. Once you
accept it, the visualization design becomes clear and honest.

---

## Two Modes, Two Data Models, One Renderer

| | **Live Sky** | **Scenario Evolution** |
|---|---|---|
| Question answered | "What's up there *right now*?" | "What happens under *policy X* over 30 years?" |
| Data source | CelesTrak TLEs (`/api/data/orbital-state` + raw TLEs) | MOCAT (`/api/scenarios/{id}/result`) |
| Physics | SGP4 propagation (client-side) | Source-sink population dynamics (backend) |
| What moves | Individual objects on true orbits | Representative particles; density per shell |
| Time | Real / near-real time, seconds–minutes | Simulated years, scrubbable timeline |
| Truth claim | "These are real tracked objects" | "This is a statistical projection" |
| Provider | `LiveSkyProvider` | `ScenarioProvider` |

Both providers emit the **same Scene State**, so the R3F renderer draws either one without knowing
which mode is active.

```
LiveSkyProvider  ─┐
                  ├─► SceneState ─► Visualization Engine (R3F)
ScenarioProvider ─┘
```

---

## Scene State — the common model

The one structure the renderer consumes. Kept deliberately flat and GPU-friendly.

```ts
interface SceneState {
  time: SceneTime;                 // current sim instant (real date OR scenario year)
  objects: RenderObject[];         // everything to draw this frame
  shells?: ShellState[];           // optional per-shell aggregate (Scenario mode)
  events?: SceneEvent[];           // collisions/launches to flash this frame
}

interface RenderObject {
  id: string;
  type: 'PAYLOAD' | 'ROCKET_BODY' | 'DEBRIS' | 'UNKNOWN';
  position: [number, number, number];   // ECI kilometres (Earth-centered)
  velocity?: [number, number, number];  // km/s (Live mode; optional)
  status?: 'active' | 'inactive' | 'decayed';
  risk?: number;                          // 0..1, drives colour in Scenario mode
  representative?: boolean;               // true = a sampled particle, not a real object
}

interface ShellState {
  label: string;                  // "500-600km"
  altMinKm: number; altMaxKm: number;
  payloads: number; debris: number; rocketBodies: number;
  collisionsThisYear: number;
  congestion: number;             // 0..1 normalized density
  risk: number;                   // 0..1
}
```

For performance the renderer actually reads **flat typed arrays** (`Float32Array` of positions, a
`Uint8Array` of types) derived from `objects`; the struct above is the logical view. See "Rendering".

---

## Mode A — Live Sky (real objects, true motion)

**Goal:** the contextual "this is the real sky" view. Looks and feels like a satellite tracker,
because for this mode that's exactly right.

Pipeline:

1. Fetch real elements (TLEs / GP JSON) — from our backend's data layer or CelesTrak directly.
2. For each object, propagate with **SGP4** (`satellite.js`) to the current clock time → ECI position.
3. Emit `RenderObject[]` with real positions + velocities.
4. Advance time continuously (with a speed control: 1×, 60×, 3600×…); re-propagate each tick.
5. Optionally draw the full orbit path of a *selected* object (sample SGP4 over one period).

Notes:
- Propagating ~30k objects every frame is heavy. Propagate on a **Web Worker** at a fixed cadence
  (e.g. 5–10 Hz), post position buffers back, and let the GPU interpolate between updates.
- This mode needs no scenario/policy data. It's available standalone.

## Mode B — Scenario Evolution (MOCAT, the product's centerpiece)

**Goal:** make a 30-year statistical projection *feel alive* while staying faithful to shell-level data.

The bridge from shell counts → 3D is the **Representative Particle Field**:

1. **Sample.** For year `t`, each shell has `N` objects of each type. Render one particle per `k`
   real objects (e.g. `k = 50`), so a shell with 5,000 debris shows 100 particles. `k` is a global
   "detail" control.
2. **Place.** Distribute each shell's particles randomly but *stably* within its altitude band:
   random inclination/RAAN/phase, radius within `[altMin, altMax] + EarthRadius`. Use a **seeded RNG
   keyed by particle index** so a given particle keeps its orbit across years — only the *count* and
   *colour* change, which reads as the population growing/thinning rather than teleporting.
3. **Animate within the year.** Give each particle a gentle circular orbital motion (cosmetic, not
   SGP4) so the field is alive, not frozen. Speed ∝ orbital velocity at its altitude for plausibility.
4. **Evolve across years.** As the timeline scrubs `t → t+1`, interpolate counts; spawn/despawn
   particles smoothly (fade in/out) to match the new population. Colour each particle by its shell's
   `risk` (collision density) — calm at low risk, hot at high risk.
5. **Events.** `collisions_per_shell[t]` drives **flash events** at that shell's altitude — a brief
   pulse + an expanding debris puff — so the user *sees* collisions happen, not just a rising chart.
6. **Congestion shells.** Optionally render each shell as a faint translucent band whose opacity ∝
   congestion, so density is readable even at a glance / when zoomed out.

This gives the "alive and dynamic" feel the product demands, while every visible quantity (particle
count per shell, colour, collision flashes) maps directly to a number MOCAT actually produced.

### Honesty rules for Mode B
- Label it clearly as a **statistical projection**, never "real objects."
- Particle *positions* are representative, so never expose "click this fragment for its real ID."
- The authoritative numbers live in the metrics panels/charts; the 3D field is the intuitive layer
  over them. They must always agree (same source array).

---

## Rendering Strategy (R3F)

| Layer | Technique |
|---|---|
| Earth | Sphere + day/night/bump/spec textures from `reference-project-code/public/textures/` (`earthmap8k`, `earthmap-night16k`, `earthbump8k`, `earthspec2k`). Slowly rotating. |
| Atmosphere | Fresnel rim shader (subtle) |
| Skybox | `skybox1k-gray.jpg` (already grayscale — fits B&W) on an inverted sphere / cubemap |
| Object field | **`THREE.Points`** with a custom `ShaderMaterial`: position from a `Float32Array` attribute, colour/size from per-point attributes. One draw call for tens of thousands of points. |
| Selected object model | Load matching `.obj` from `reference-project-code/public/meshes/` only for the focused object |
| Orbits | `THREE.Line` for the selected object's path (Live mode) |
| Shell bands | Translucent ring/torus geometry per shell, opacity ∝ congestion |
| Collision events | Short-lived sprite/point bursts driven by `events` |
| Camera | `OrbitControls` (drei) — orbit, smooth zoom from full-globe to shell-level, focus-on-object |

Performance principles:
- Positions live in **flat `Float32Array`s** updated in place; never rebuild geometry per frame.
- Heavy propagation (Live mode) and particle resampling (Scenario mode) run **off the main thread**
  (Web Worker) and post buffers back.
- Target 60fps with ~30k points; degrade `k` (detail) on weaker GPUs.

## Coordinate System & Scale

- World origin = Earth center. Units = **kilometres**, scaled by a constant `KM_TO_SCENE` so the scene
  fits comfortably in floating-point precision (e.g. Earth radius 6371 km → a few scene units).
- Data arrives in **ECI** (Earth-Centered Inertial). Earth's texture rotates under it via GMST so the
  ground lines up; objects stay in ECI. (For Scenario mode, exact Earth phase is cosmetic.)
- One conversion module owns all of this so providers and renderer never disagree.

## Timeline & Playback (shared control)

A single timeline component drives both modes via shared Zustand state:

- **Live Sky:** maps to wall-clock with a speed multiplier; "now" button snaps to real time.
- **Scenario:** maps to simulated years `0…simulation_years`; play / pause / scrub / speed; the
  current year indexes into the MOCAT arrays. Scrubbing is instant (data is preloaded).

## Interaction (kept legible for non-experts)

- Hover an object/particle → minimal readout (type, altitude, shell, risk).
- Click a real object (Live mode) → focus camera + show details + draw its orbit.
- Click a shell band → highlight it, show that shell's metrics over time.
- Plain-language legends; risk shown as words + colour ("Low / Elevated / Critical"), not raw numbers.

---

## What to Build First (Phase 1 core scene)

Faithful to "Core Scene MVP," in order:

1. Earth + grayscale skybox + camera (orbit/zoom). *(Reuse reference textures.)*
2. `THREE.Points` object field fed from a static **mock `SceneState`**.
3. Timeline scrub that swaps between preloaded frames.
4. `ScenarioProvider` reading a **mock `RawMOCATOutput` JSON** → representative particle field that
   grows/thins and changes colour as you scrub the years.
5. Collision flash events from `collisions_per_shell`.

This proves the entire "render-from-simulation-data" loop before the backend exists, against contracts
from [03_DATA_CONTRACTS.md](03_DATA_CONTRACTS.md). Live Sky (SGP4) comes in a later phase — see
[05_ROADMAP.md](05_ROADMAP.md).
