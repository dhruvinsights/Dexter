# Orbital Sentinel — Full Execution & Development Plan

## Project Summary

Orbital Sentinel is an AI-powered orbital sustainability decision-support platform. Users evaluate intervention strategies (Active Debris Removal, Launch Caps, AI Traffic Management, Hybrid Policies) through MOCAT simulation outputs, orbital visualizations, sustainability metrics, and agentic AI analysis.

**Stack:** React · TypeScript · TailwindCSS · ShadCN UI · Recharts · Zustand · React Query  
**Target:** Hackathon MVP → scalable production platform

---

## Folder Architecture

```
orbital-sentinel/
├── public/                          # Static assets, favicon, manifest
└── src/
    ├── app/                         # Router, providers, global layout
    ├── assets/
    │   ├── fonts/
    │   ├── icons/
    │   └── images/
    ├── components/                  # Shared, reusable components
    │   ├── ui/                      # ShadCN primitives + custom atoms
    │   ├── layout/                  # Sidebar, Topbar, PageShell
    │   ├── charts/                  # Recharts wrappers (Line, Bar, Radar, etc.)
    │   └── orbital/                 # KeepTrack embed + overlay components
    ├── features/                    # Feature-scoped modules
    │   ├── dashboard/
    │   ├── scenario-builder/
    │   ├── simulation-results/
    │   ├── policy-comparison/
    │   ├── orbital-visualization/
    │   ├── ai-analyst/
    │   └── report-generation/
    ├── hooks/                       # Custom React hooks
    ├── lib/
    │   ├── api/                     # Axios instance, interceptors, endpoints
    │   ├── utils/                   # Formatters, math helpers, constants
    │   └── validators/              # Zod schemas
    ├── services/                    # Domain-level service functions
    ├── store/
    │   └── slices/                  # Zustand slices (scenario, simulation, ui)
    ├── styles/                      # Global CSS, Tailwind base overrides
    └── types/                       # Shared TypeScript interfaces & enums
```

Each `features/<name>/` follows the same internal pattern:
```
features/dashboard/
├── components/          # Feature-local components
├── hooks/               # Feature-local hooks
├── api.ts               # React Query hooks for this feature
├── store.ts             # Zustand slice (if needed)
├── types.ts             # Feature-specific types
└── index.tsx            # Page entry point (exported as route component)
```

---

## Phase 0 — Project Bootstrap (Day 1, ~2 hours)

**Goal:** Working dev environment with routing, theming, and empty page shells.

### Tasks

- [ ] `npm create vite@latest orbital-sentinel -- --template react-ts`
- [ ] Install dependencies:
  ```bash
  npm install tailwindcss @tailwindcss/vite
  npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge
  npm install zustand @tanstack/react-query axios recharts
  npm install react-router-dom
  npm install zod react-hook-form @hookform/resolvers
  npx shadcn@latest init
  ```
- [ ] Configure `tailwind.config.ts` with custom design tokens (dark theme, brand palette)
- [ ] Create global CSS variables for Orbital Sentinel color system:
  - Background: `#0a0e1a` (deep space)
  - Surface: `#111827`
  - Accent: `#00d4ff` (cyan), `#7c3aed` (violet)
  - Danger: `#ef4444`, Warning: `#f59e0b`, Success: `#10b981`
- [ ] Set up React Router with all 7 routes
- [ ] Create `PageShell`, `Sidebar`, `Topbar` layout components
- [ ] Set up Zustand store with `scenarioSlice`, `simulationSlice`, `uiSlice`
- [ ] Set up React Query `QueryClient` provider

**Deliverable:** `localhost:5173` loads with sidebar nav and blank page shells for all 7 routes.

---

## Phase 1 — Core Layout & Design System (Day 1–2, ~4 hours)

**Goal:** Production-quality shell that feels like a mission control dashboard.

### Tasks

#### Layout
- [ ] `Sidebar` — collapsible, icon + label nav, active state highlight, brand logo
- [ ] `Topbar` — page title, scenario badge, notification bell, user avatar
- [ ] `PageShell` — consistent page wrapper with breadcrumb + action slot

#### Design System Components (`src/components/ui/`)
- [ ] `KPICard` — metric value, label, trend arrow, sparkline
- [ ] `StatusBadge` — color-coded severity indicator
- [ ] `SectionHeader` — title + subtitle + optional CTA
- [ ] `DataTable` — sortable, filterable table built on TanStack Table
- [ ] `ScoreRing` — radial progress indicator for sustainability scores
- [ ] `AlertBanner` — dismissible warning/info bar
- [ ] `LoadingState` / `EmptyState` — consistent feedback components

#### Chart Wrappers (`src/components/charts/`)
- [ ] `LineChart` — collision frequency / debris growth over time
- [ ] `BarChart` — comparative scenario metrics
- [ ] `RadarChart` — multi-axis sustainability scoring
- [ ] `AreaChart` — congestion index trends
- [ ] `HeatmapGrid` — orbital shell density visualization

**Deliverable:** Design system documented; all components render with mock data.

---

## Phase 2 — Dashboard Page (Day 2, ~3 hours)

**Goal:** At-a-glance orbital health overview with live KPIs and AI summary.

### Components

| Component | Description |
|---|---|
| `OrbitalStatusBanner` | Current scenario name + overall health grade |
| `KPIGrid` | 6-card grid: Total Objects, Debris Count, Collision Risk, Sustainability Score, Active Satellites, ADR Capacity |
| `CollisionRiskChart` | 30-day trend line with threshold bands |
| `DebrisGrowthChart` | Projected debris growth under current scenario |
| `OrbitalShellBreakdown` | Bar chart: LEO / MEO / GEO object counts |
| `AISummaryPanel` | Streaming AI-generated orbital health narrative |
| `RecentAlertsWidget` | Latest conjunction warnings and anomalies |
| `QuickActionsBar` | "Run Simulation", "Compare Policies", "Generate Report" shortcuts |

### State
```ts
// store/slices/dashboardSlice.ts
interface DashboardState {
  activeScenario: Scenario | null
  kpis: OrbitalKPIs
  alerts: OrbitalAlert[]
  lastUpdated: string
}
```

### API Hooks
```ts
// features/dashboard/api.ts
useDashboardKPIs()       // GET /api/v1/dashboard/kpis
useOrbitalAlerts()       // GET /api/v1/alerts
useAISummary(scenarioId) // GET /api/v1/ai/summary/:id
```

---

## Phase 3 — Scenario Builder (Day 2–3, ~4 hours)

**Goal:** Multi-step form to configure and launch a simulation scenario.

### Flow

```
Step 1: Select Baseline   →   Step 2: Choose Strategy   →   Step 3: Configure Params   →   Step 4: Review & Launch
```

### Strategies

| Strategy | Key Parameters |
|---|---|
| Active Debris Removal (ADR) | Removal rate (obj/yr), Target orbits, Cost per removal |
| Launch Cap | Max launches/yr, Cap start year, Enforcement strictness |
| AI Traffic Management | Avoidance algorithm, Coordination coverage %, Response latency |
| Hybrid Policy | ADR rate + Launch cap + Traffic mgmt weights |

### Components
- [ ] `StepIndicator` — progress stepper
- [ ] `BaselineSelector` — card grid of baseline scenarios with descriptions
- [ ] `StrategyCard` — selectable strategy with icon, description, complexity badge
- [ ] `ParameterForm` — dynamic Zod-validated form per strategy
- [ ] `ScenarioReviewPanel` — full summary before launch
- [ ] `LaunchButton` — triggers simulation API call with loading state

### Validation (Zod)
```ts
const adrSchema = z.object({
  removalRate: z.number().min(0).max(1000),
  targetOrbits: z.array(z.enum(['LEO', 'MEO', 'GEO'])).min(1),
  costPerRemoval: z.number().positive(),
  startYear: z.number().min(2024).max(2050),
})
```

---

## Phase 4 — Simulation Results (Day 3, ~3 hours)

**Goal:** Rich result visualization after a scenario runs.

### Components
- [ ] `ResultsHeader` — scenario name, run timestamp, duration badge
- [ ] `MetricSummaryGrid` — final values for all 5 key metrics
- [ ] `CollisionFrequencyChart` — time series, current vs baseline
- [ ] `DebrisGrowthComparison` — stacked area chart, scenario vs no-action
- [ ] `SurvivabilityIndex` — gauge + trend over simulation period
- [ ] `CongestionHeatmap` — orbital shell congestion by altitude band
- [ ] `CostEfficiencyPanel` — cost vs debris removed scatter
- [ ] `KeyFindingsPanel` — AI-generated bullet-point summary of results

---

## Phase 5 — Policy Comparison (Day 3–4, ~3 hours)

**Goal:** Side-by-side comparison of up to 4 saved scenarios.

### Components
- [ ] `ScenarioSelector` — multi-select up to 4 scenarios
- [ ] `ComparisonTable` — sticky header, color-coded delta columns
- [ ] `RadarComparisonChart` — overlapping radar chart per scenario
- [ ] `WinnerBadge` — highlights best-performing scenario per metric
- [ ] `TradeoffMatrix` — 2×2 cost vs impact positioning chart
- [ ] `RecommendationCard` — AI-ranked recommendation with rationale

### Comparison Metrics
- Sustainability Score (0–100)
- Cost Efficiency ($/debris removed)
- Risk Reduction (% collision probability decrease)
- Long-term Impact (debris count at Year 50)
- Implementation Feasibility (1–5 scale)

---

## Phase 6 — Orbital Visualization (Day 4, ~3 hours)

**Goal:** Embedded KeepTrack renderer with custom Orbital Sentinel overlays.

### Integration Strategy
- Embed KeepTrack in an `<iframe>` or as a module, hidden behind a wrapper
- Suppress all KeepTrack native UI (CSS overrides + postMessage API)
- Expose only the rendering canvas

### Custom Overlays
- [ ] `SustainabilityHeatmapLayer` — color orbital shells by congestion score
- [ ] `CollisionHotspotMarkers` — animated pulse on high-risk conjunction zones
- [ ] `ScenarioObjectLayer` — toggle added/removed objects per scenario
- [ ] `OrbitalShellLabels` — LEO/MEO/GEO altitude band labels
- [ ] `VisualizationControlBar` — shell filter, time scrubber, layer toggles

### Components
- [ ] `OrbitalViewer` — main container with iframe + overlay canvas
- [ ] `LayerPanel` — checkboxes to toggle visual layers
- [ ] `ShellFilter` — altitude range slider
- [ ] `TimeScrubber` — playback control for animated scenarios
- [ ] `ObjectInfoTooltip` — hover tooltip on selected orbital object

---

## Phase 7 — AI Sustainability Analyst (Day 4–5, ~3 hours)

**Goal:** Copilot-style AI panel for on-demand analysis and recommendations.

### Capabilities
1. **Risk Assessment** — evaluate current orbital environment risk level
2. **Policy Recommendations** — suggest optimal intervention strategy
3. **Sustainability Analysis** — deep dive on long-term trajectory
4. **Executive Summary** — generate boardroom-ready summary

### Components
- [ ] `AnalystShell` — two-panel layout: prompt history (left) + response (right)
- [ ] `AnalysisTypeSelector` — 4 capability cards
- [ ] `PromptInput` — multi-line input with context selector (which scenario to analyze)
- [ ] `StreamingResponse` — typewriter-effect streamed AI output
- [ ] `ResponseActions` — copy, save to report, export PDF
- [ ] `ContextPanel` — shows which scenario/data the AI is analyzing
- [ ] `InsightHistory` — saved past analyses for reference

### API Integration
```ts
// services/ai.service.ts
streamAnalysis(type: AnalysisType, scenarioId: string, prompt?: string): AsyncIterable<string>
generateExecutiveSummary(scenarioId: string): Promise<ExecutiveSummary>
```

---

## Phase 8 — Report Generation (Day 5, ~2 hours)

**Goal:** Export polished PDF reports, executive summaries, and policy briefs.

### Report Types
| Type | Contents | Audience |
|---|---|---|
| Full Technical Report | All metrics, charts, methodology | Engineers / scientists |
| Executive Summary | Key findings, recommendations, costs | Leadership / stakeholders |
| Policy Brief | Risk context, strategy options, impact assessment | Policymakers |

### Components
- [ ] `ReportBuilder` — checklist of sections to include
- [ ] `ReportPreview` — live HTML preview panel
- [ ] `ExportPanel` — format selector (PDF/DOCX) + download button
- [ ] `TemplateSelector` — branding/formatting presets

### Implementation
- Use `@react-pdf/renderer` for PDF generation
- Generate charts as SVG → embed in PDF
- Pull AI-generated narratives into report sections

---

## Phase 9 — Integration & Data Layer (Day 5–6, ~3 hours)

### API Client (`src/lib/api/`)
```ts
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30_000,
})

// Interceptors: auth token injection, error normalization
```

### React Query Setup
```ts
// Per-feature query hooks pattern:
export const useScenarios = () =>
  useQuery({ queryKey: ['scenarios'], queryFn: scenarioService.getAll })

export const useRunSimulation = () =>
  useMutation({ mutationFn: simulationService.run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulations'] }) })
```

### Mock Data Layer
For hackathon MVP, use `msw` (Mock Service Worker) to intercept API calls and return realistic MOCAT-style simulation data. All mock data lives in `src/lib/api/mocks/`.

---

## Phase 10 — Polish & QA (Day 6, ~2 hours)

- [ ] Responsive layout audit (1280px, 1440px, 1920px)
- [ ] Dark mode consistency pass
- [ ] Loading skeleton states for all async components
- [ ] Error boundary on each feature page
- [ ] Accessibility: aria-labels, keyboard nav, focus rings
- [ ] Performance: lazy-load routes, memo-ize heavy chart components
- [ ] Favicon, page titles, meta tags

---

## Execution Timeline (Hackathon Schedule)

| Day | Phase | Deliverable |
|---|---|---|
| Day 1 AM | Phase 0 | Vite project bootstrapped, routing up |
| Day 1 PM | Phase 1 | Design system complete, layout shell done |
| Day 2 | Phase 2–3 | Dashboard + Scenario Builder functional |
| Day 3 | Phase 4–5 | Simulation Results + Policy Comparison done |
| Day 4 | Phase 6–7 | Orbital Viz embedded + AI Analyst panel |
| Day 5 | Phase 8–9 | Report generation + full API integration |
| Day 6 | Phase 10 | QA, polish, demo prep |

---

## Key Architectural Decisions

**Feature-based structure** — each page owns its components, hooks, and API calls. No cross-feature imports except through `src/components/` shared layer.

**Zustand for global state** — scenario selection, active simulation, and UI preferences. React Query handles all server state (caching, background refresh, mutations).

**TypeScript strict mode** — all API responses typed, Zod validation at form + API boundary.

**KeepTrack isolation** — the visualization engine is treated as a black-box renderer. All Orbital Sentinel logic lives in overlay components that sit on top of the canvas.

**Mock-first development** — build UI against MSW mocks, swap to real API by changing the base URL environment variable.

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AI_API_URL=http://localhost:8001
VITE_KEEPTRACK_EMBED_URL=https://keeptrack.space
VITE_ENABLE_MOCKS=true
```

---

## Next Immediate Steps

1. Run `npm create vite@latest` inside `orbital-sentinel/`
2. Install all dependencies from Phase 0
3. Copy the folder structure above into `src/`
4. Build `Sidebar` + `Topbar` + `PageShell` first — everything else mounts inside them
5. Start on `Dashboard` KPI cards with mock data to validate the design system
