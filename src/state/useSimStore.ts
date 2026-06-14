import { create } from 'zustand';
import type { RawMOCATOutput } from '@/integration/contracts';
import { MOCK_RESULTS, SCENARIOS } from '@/integration/mocks';
import type { ColorSchemeId } from '@/viz/colorSchemes';
import type { PhysicsBundle } from '@/sim/loadPhysics';
import type { shellStability } from '@/sim/debrisEngine';

type StabilityRow = ReturnType<typeof shellStability>[number];

const DEFAULT_SCENARIO = 'baseline_2024';

export type ViewMode = 'scenario' | 'live';

export interface Selection {
  index: number;
  norad: string;
  label: string;
  line1?: string;
  line2?: string;
}

export interface CatalogueEntry {
  norad: string;
  name: string;
  owner: string;
  ownerFlag: string;
  ownerName: string;
  type: string;
  launchYear: number;
}

interface SimStore {
  mode: ViewMode;

  // ── scenario mode ──
  scenarioId: string;
  output: RawMOCATOutput;
  year: number; // fractional, 0..yearMax
  yearMax: number;
  density: number;
  /** Engine results keyed by scenario_id (real seed + MOCAT projection). */
  results: Record<string, RawMOCATOutput>;
  /** Per-shell Kessler-stability indicator from the real seed. */
  stability: StabilityRow[];
  /** True once the physics engine has been seeded from the real catalogue. */
  physicsReal: boolean;

  // ── live mode ──
  liveTimeMs: number;
  liveSpeed: number; // seconds of sim time per real second
  liveCount: number;

  // ── boot / data loading ──
  catalogueReady: boolean; // SGP4 catalogue parsed + first positions propagated
  catalogueLoadMsg: string; // human-readable boot status
  /** Flat catalogue table for the Satellite Data panel (norad, name, owner, type, launch year). */
  catalogue: CatalogueEntry[];

  // ── shared ──
  isPlaying: boolean;
  speed: number; // scenario: years per second
  showOrbits: boolean;
  selection: Selection | null;
  /** Live scene-space position of the selected object, fed by LiveField. */
  selectedPos: [number, number, number] | null;
  colorScheme: ColorSchemeId;

  // ── time machine (live mode) ──
  timeMachineActive: boolean;
  timeMachineYear: number; // fractional, START_YEAR..CURRENT_YEAR+1
  timeMachineSpeed: number; // years per second
  timeMachinePlaying: boolean;

  setMode: (m: ViewMode) => void;
  loadScenario: (id: string) => void;
  setPhysics: (bundle: PhysicsBundle) => void;
  setYear: (y: number) => void;
  setDensity: (d: number) => void;

  setLiveTime: (ms: number) => void;
  setLiveSpeed: (s: number) => void;
  resetLiveToNow: () => void;
  setLiveCount: (n: number) => void;
  setCatalogueReady: (ready: boolean, msg?: string) => void;
  setCatalogue: (rows: CatalogueEntry[]) => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  toggleOrbits: () => void;
  select: (s: Selection | null) => void;
  setSelectedPos: (p: [number, number, number] | null) => void;
  setColorScheme: (scheme: ColorSchemeId) => void;

  toggleTimeMachine: () => void;
  setTimeMachineYear: (y: number) => void;
  setTimeMachineSpeed: (s: number) => void;
  toggleTimeMachinePlay: () => void;
}

export const TIME_MACHINE_START_YEAR = 1957;
export const TIME_MACHINE_END_YEAR = new Date().getUTCFullYear() + 1;

export const useSimStore = create<SimStore>((set) => ({
  mode: 'live',

  scenarioId: DEFAULT_SCENARIO,
  output: MOCK_RESULTS[DEFAULT_SCENARIO],
  year: 0,
  yearMax: MOCK_RESULTS[DEFAULT_SCENARIO].simulation_years,
  density: 1,
  results: MOCK_RESULTS,
  stability: [],
  physicsReal: false,

  liveTimeMs: Date.now(),
  liveSpeed: 60,
  liveCount: 0,

  catalogueReady: false,
  catalogueLoadMsg: 'Initialising…',
  catalogue: [],

  isPlaying: true,
  speed: 2,
  showOrbits: true,
  selection: null,
  selectedPos: null,
  colorScheme: 'objectType',

  timeMachineActive: false,
  timeMachineYear: TIME_MACHINE_START_YEAR,
  timeMachineSpeed: 6,
  timeMachinePlaying: true,

  setMode: (m) =>
    set(() => ({
      mode: m,
      selection: null,
      isPlaying: true,
      timeMachineActive: false,
      ...(m === 'live' ? { liveTimeMs: Date.now() } : {}),
    })),

  loadScenario: (id) =>
    set((st) => {
      const output = st.results[id];
      if (!output) return {};
      return { scenarioId: id, output, yearMax: output.simulation_years, selection: null };
    }),

  setPhysics: (bundle) =>
    set((st) => ({
      results: bundle.results,
      stability: bundle.stability,
      physicsReal: bundle.seededFromReal,
      output: bundle.results[st.scenarioId] ?? st.output,
      yearMax: (bundle.results[st.scenarioId] ?? st.output).simulation_years,
    })),
  setYear: (y) => set((st) => ({ year: Math.min(st.yearMax, Math.max(0, y)) })),
  setDensity: (d) => set({ density: d }),

  setLiveTime: (ms) => set({ liveTimeMs: ms }),
  setLiveSpeed: (s) => set({ liveSpeed: s }),
  resetLiveToNow: () => set({ liveTimeMs: Date.now() }),
  setLiveCount: (n) => set({ liveCount: n }),
  setCatalogueReady: (ready, msg) =>
    set((st) => ({ catalogueReady: ready, catalogueLoadMsg: msg ?? st.catalogueLoadMsg })),
  setCatalogue: (rows) => set({ catalogue: rows }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((st) => ({ isPlaying: !st.isPlaying })),
  setSpeed: (s) => set({ speed: s }),
  toggleOrbits: () => set((st) => ({ showOrbits: !st.showOrbits })),
  select: (s) => set({ selection: s, selectedPos: null }),
  setSelectedPos: (p) => set({ selectedPos: p }),
  setColorScheme: (scheme) => set({ colorScheme: scheme }),

  toggleTimeMachine: () =>
    set((st) => ({
      timeMachineActive: !st.timeMachineActive,
      timeMachineYear: TIME_MACHINE_START_YEAR,
      timeMachinePlaying: true,
    })),
  setTimeMachineYear: (y) =>
    set({ timeMachineYear: Math.min(TIME_MACHINE_END_YEAR, Math.max(TIME_MACHINE_START_YEAR, y)) }),
  setTimeMachineSpeed: (s) => set({ timeMachineSpeed: s }),
  toggleTimeMachinePlay: () => set((st) => ({ timeMachinePlaying: !st.timeMachinePlaying })),
}));

export { SCENARIOS };
