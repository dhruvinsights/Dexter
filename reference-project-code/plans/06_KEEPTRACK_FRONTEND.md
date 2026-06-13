# Workstream 6 — KeepTrack Frontend Integration & Orbital Sentinel UI

**Owner:** Person F  
**Estimated effort:** 10–12 hours (largest workstream)  
**Parallel with:** WS5 (AI Agent panels)  
**Depends on:** WS4 API contract (Day 1)  
**Outputs consumed by:** WS7 (screenshots for reports)

---

## Goal

Build the complete Orbital Sentinel frontend — a professional analytics dashboard UI — and integrate KeepTrack as a visualization engine for orbital objects. 

The KeepTrack codebase (already cloned to `orbital-sentinel/keeptrack/`) is used **only as a renderer**. We do not use its UI. We build our own shell on top of it.

---

## Architecture Decision: How to Integrate KeepTrack

KeepTrack is a standalone TypeScript/WebGL application. There are two integration options:

**Option A — iframe embed (recommended for hackathon speed)**  
Run KeepTrack as a local dev server on a separate port, embed it in an `<iframe>` inside our React app, and communicate via `postMessage`. Fastest path, no build system conflict.

**Option B — Direct module import**  
Import KeepTrack components directly into our React app. More control, but requires resolving build conflicts between two webpack/vite configs. Only attempt if you have >4 hours to spare.

**Use Option A.** The guide below covers it.

---

## Project Setup (Do This First)

```bash
# 1. Set up the Orbital Sentinel React app
cd orbital-sentinel
npm create vite@latest app -- --template react-ts
cd app

# 2. Install all dependencies
npm install tailwindcss @tailwindcss/vite
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install zustand @tanstack/react-query axios recharts
npm install react-router-dom lucide-react
npm install zod react-hook-form @hookform/resolvers
npm install @react-pdf/renderer
npx shadcn@latest init

# 3. Set up KeepTrack (runs on port 8080 for embedding)
cd ../keeptrack
npm install
# Test it boots: npm run dev
```

---

## Tailwind Design Tokens

**File:** `app/tailwind.config.ts`

```ts
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#04060f",
          900: "#0a0e1a",
          800: "#0f1629",
          700: "#141e35",
          600: "#1a2540",
        },
        accent: {
          cyan:   "#00d4ff",
          violet: "#7c3aed",
          green:  "#10b981",
          amber:  "#f59e0b",
          red:    "#ef4444",
        },
        surface: {
          DEFAULT: "#111827",
          raised:  "#1f2937",
          overlay: "#374151",
        }
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        "glow-cyan":   "0 0 20px rgba(0, 212, 255, 0.3)",
        "glow-violet": "0 0 20px rgba(124, 58, 237, 0.3)",
      }
    }
  }
}
```

---

## Global CSS

**File:** `app/src/styles/globals.css`

```css
@import "tailwindcss";

:root {
  --bg-primary: #0a0e1a;
  --surface:    #111827;
  --accent:     #00d4ff;
  --text:       #f1f5f9;
  --muted:      #94a3b8;
}

body {
  background-color: var(--bg-primary);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0f1629; }
::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
```

---

## Routing Structure

**File:** `app/src/app/Router.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage }         from "@/features/dashboard";
import { ScenarioBuilderPage }   from "@/features/scenario-builder";
import { SimulationResultsPage } from "@/features/simulation-results";
import { PolicyComparisonPage }  from "@/features/policy-comparison";
import { OrbitalVisualizationPage } from "@/features/orbital-visualization";
import { AIAnalystPage }         from "@/features/ai-analyst";
import { ReportGenerationPage }  from "@/features/report-generation";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/scenarios"       element={<ScenarioBuilderPage />} />
          <Route path="/results/:id"     element={<SimulationResultsPage />} />
          <Route path="/compare"         element={<PolicyComparisonPage />} />
          <Route path="/visualization"   element={<OrbitalVisualizationPage />} />
          <Route path="/analyst"         element={<AIAnalystPage />} />
          <Route path="/reports"         element={<ReportGenerationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Layout Components

### AppShell

**File:** `app/src/components/layout/AppShell.tsx`

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar }  from "./Topbar";

export function AppShell() {
  return (
    <div className="flex h-screen bg-space-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### Sidebar

```tsx
// app/src/components/layout/Sidebar.tsx

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Rocket, BarChart3,
  GitCompare, Globe2, Bot, FileText
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { to: "/scenarios",     label: "Scenarios",     icon: Rocket },
  { to: "/results/baseline_2024", label: "Results", icon: BarChart3 },
  { to: "/compare",       label: "Compare",       icon: GitCompare },
  { to: "/visualization", label: "Orbital View",  icon: Globe2 },
  { to: "/analyst",       label: "AI Analyst",    icon: Bot },
  { to: "/reports",       label: "Reports",       icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-space-800 border-r border-surface-raised flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-surface-raised">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-cyan/20 border border-accent-cyan/50 
                          flex items-center justify-center">
            <Globe2 size={16} className="text-accent-cyan" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Orbital</div>
            <div className="text-xs text-accent-cyan font-mono tracking-wider">SENTINEL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
               ${isActive
                 ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                 : "text-slate-400 hover:text-white hover:bg-surface-raised"
               }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-raised">
        <div className="text-xs text-slate-500 font-mono">v1.0.0 · Hackathon MVP</div>
      </div>
    </aside>
  );
}
```

---

## Shared Components

### KPI Card

**File:** `app/src/components/ui/KPICard.tsx`

```tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "cyan" | "green" | "amber" | "red" | "violet";
  description?: string;
}

export function KPICard({
  label, value, unit, trend, trendValue, color = "cyan", description
}: KPICardProps) {
  const colorMap = {
    cyan:   "border-accent-cyan/20 bg-accent-cyan/5 text-accent-cyan",
    green:  "border-accent-green/20 bg-accent-green/5 text-accent-green",
    amber:  "border-accent-amber/20 bg-accent-amber/5 text-accent-amber",
    red:    "border-accent-red/20 bg-accent-red/5 text-accent-red",
    violet: "border-accent-violet/20 bg-accent-violet/5 text-accent-violet",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-accent-green" : trend === "down" ? "text-accent-red" : "text-slate-400";

  return (
    <div className={cn(
      "rounded-xl border p-4 bg-surface transition-all hover:shadow-glow-cyan",
      colorMap[color]
    )}>
      <div className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-end gap-1 mt-2">
        <span className="text-2xl font-bold text-white font-mono">{value}</span>
        {unit && <span className="text-sm text-slate-400 mb-0.5">{unit}</span>}
      </div>
      {(trend || trendValue) && (
        <div className={cn("flex items-center gap-1 text-xs mt-2", trendColor)}>
          <TrendIcon size={12} />
          <span>{trendValue}</span>
        </div>
      )}
      {description && (
        <div className="text-xs text-slate-500 mt-1">{description}</div>
      )}
    </div>
  );
}
```

---

## Key Feature Pages

### Dashboard Page (primary entry)

```tsx
// app/src/features/dashboard/index.tsx

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { KPICard } from "@/components/ui/KPICard";
import { CollisionChart } from "./components/CollisionChart";
import { AISummaryPanel } from "./components/AISummaryPanel";
import { ShellBreakdownChart } from "./components/ShellBreakdownChart";

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["catalogue-stats"],
    queryFn: () => api.get("/api/data/catalogue/stats").then(r => r.data),
  });

  const { data: score } = useQuery({
    queryKey: ["score", "hybrid_2024"],
    queryFn: () => api.get("/api/metrics/hybrid_2024/score").then(r => r.data),
  });

  const { data: metrics } = useQuery({
    queryKey: ["metrics", "hybrid_2024"],
    queryFn: () => api.get("/api/metrics/hybrid_2024").then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Orbital Status Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Active Scenario: <span className="text-accent-cyan">Hybrid Strategy 2024</span>
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Tracked Objects"
          value={stats?.total_objects?.toLocaleString() ?? "—"}
          color="cyan"
          trend="up"
          trendValue="+3.2% this month"
        />
        <KPICard
          label="Debris Objects"
          value={stats?.breakdown?.DEBRIS?.toLocaleString() ?? "—"}
          color="red"
          trend="up"
          trendValue="Growing"
        />
        <KPICard
          label="Sustainability Score"
          value={score?.total_score ?? "—"}
          unit="/100"
          color={score?.grade === "A" ? "green" : score?.grade === "B" ? "cyan" : "amber"}
          description={`Grade ${score?.grade ?? "—"}`}
        />
        <KPICard
          label="Survivability Index"
          value={metrics?.survivability_pct?.toFixed(1) ?? "—"}
          unit="%"
          color="green"
          trend="up"
          trendValue="vs baseline"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-raised p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Collision Frequency (30yr projection)</h3>
          <CollisionChart metrics={metrics} />
        </div>
        <div className="bg-surface rounded-xl border border-surface-raised p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Object Density by Shell</h3>
          <ShellBreakdownChart metrics={metrics} />
        </div>
      </div>

      {/* AI Summary */}
      <AISummaryPanel scenarioId="hybrid_2024" />
    </div>
  );
}
```

---

## KeepTrack Integration (Orbital Visualization Page)

**File:** `app/src/features/orbital-visualization/index.tsx`

```tsx
import { useRef, useEffect } from "react";
import { VisualizationControlBar } from "./components/VisualizationControlBar";
import { LayerPanel } from "./components/LayerPanel";

export function OrbitalVisualizationPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sendCommand = (cmd: string, data?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage({ cmd, data }, "*");
  };

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Orbital Visualization</h1>
        <VisualizationControlBar onCommand={sendCommand} />
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* KeepTrack iframe — fills main area */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-surface-raised">
          <iframe
            ref={iframeRef}
            src="http://localhost:8080"
            className="w-full h-full border-0"
            title="Orbital Visualization"
            // Suppress KeepTrack's own UI via CSS injected via postMessage
          />

          {/* Orbital Sentinel overlay — sits on top of KeepTrack canvas */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="bg-space-800/80 backdrop-blur rounded-lg px-3 py-2 border border-accent-cyan/20">
              <div className="text-xs font-mono text-accent-cyan">LIVE · CelesTrak</div>
              <div className="text-xs text-slate-400 mt-0.5">~28,000 tracked objects</div>
            </div>
          </div>
        </div>

        {/* Layer control panel */}
        <LayerPanel onLayerToggle={(layer, visible) =>
          sendCommand("toggleLayer", { layer, visible })
        } />
      </div>
    </div>
  );
}
```

---

## Zustand Store Structure

**File:** `app/src/store/index.ts`

```ts
import { create } from "zustand";

interface ScenarioSlice {
  activeScenarioId: string;
  setActiveScenario: (id: string) => void;
}

interface UISlice {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeAnalysisPanel: string | null;
  setActiveAnalysisPanel: (panel: string | null) => void;
}

export const useAppStore = create<ScenarioSlice & UISlice>((set) => ({
  // Scenario
  activeScenarioId: "hybrid_2024",
  setActiveScenario: (id) => set({ activeScenarioId: id }),

  // UI
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  activeAnalysisPanel: null,
  setActiveAnalysisPanel: (panel) => set({ activeAnalysisPanel: panel }),
}));
```

---

## API Client

**File:** `app/src/lib/api/client.ts`

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  r => r,
  err => {
    console.error(`API Error: ${err.config?.url}`, err.response?.data);
    return Promise.reject(err);
  }
);
```

---

## Build for Electron (Desktop Packaging)

**File:** `app/electron/main.js`

```js
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    titleBarStyle: "hiddenInset",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  // In production: load built index.html
  if (process.env.NODE_ENV === "production") {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    win.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(createWindow);
```

```bash
# Install Electron
npm install --save-dev electron electron-builder
# Run
npx electron electron/main.js
```

---

## Definition of Done

- [ ] `npm run dev` boots the Orbital Sentinel UI at localhost:5173
- [ ] All 7 routes navigate correctly with sidebar highlighting
- [ ] Dashboard KPI cards show real data from the API
- [ ] Collision Frequency and Shell Breakdown charts render
- [ ] AI Summary panel calls `/api/ai/quick-summary` and displays text
- [ ] KeepTrack iframe loads in Orbital Visualization page
- [ ] Policy Comparison page shows side-by-side scores for 4 scenarios
- [ ] Design: dark theme, consistent Tailwind tokens, no KeepTrack branding visible
- [ ] Electron wrapper launches the app as a desktop window
