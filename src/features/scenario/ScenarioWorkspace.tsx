import { useMemo, useState } from 'react';
import {
  Orbit,
  ChevronDown,
  AlertTriangle,
  Layers,
  Flame,
  TrendingUp,
  Target,
  Crosshair,
  GitCompare,
  FileText,
  CalendarClock,
} from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { SCENARIOS, useSimStore } from '@/state/useSimStore';
import { play } from '@/lib/sound';
import {
  scenarioImpact,
  highRiskRegions,
  mostCongestedShells,
  fastestGrowingDebris,
  cascadeHotspots,
  recommendedTargets,
  topThreatObjects,
  timelineProjection,
  scenarioSummary,
  compareScenarios,
  type ImpactMetric,
  type RegionStat,
  type Direction,
} from '@/sim/scenarioInsights';

const INTERVENTION_LABEL: Record<string, string> = {
  baseline: 'No intervention',
  adr: 'Debris removal',
  launch_cap: 'Launch limits',
  ai_traffic_mgmt: 'Traffic mgmt',
  hybrid: 'Combined policy',
};

const dirColor: Record<Direction, string> = {
  good: 'text-[#00ff88]',
  bad: 'text-red-400',
  neutral: 'text-neutral-300',
};

/**
 * Scenario workspace — the single research surface for evaluating an
 * intervention. Policy selection, deterministic impact analysis (vs baseline),
 * simulation insights, multi-policy comparison, a long-horizon projection, and
 * an auto-written summary all live here. Everything is computed by
 * src/sim/scenarioInsights.ts from the MOCAT projection — no AI, no mocks.
 */
export function ScenarioWorkspace() {
  const scenarioId = useSimStore((s) => s.scenarioId);
  const loadScenario = useSimStore((s) => s.loadScenario);
  const density = useSimStore((s) => s.density);
  const setDensity = useSimStore((s) => s.setDensity);
  const results = useSimStore((s) => s.results);
  const stability = useSimStore((s) => s.stability);
  const physicsReal = useSimStore((s) => s.physicsReal);

  const [view, setView] = useState<'analyze' | 'compare'>('analyze');

  const output = results[scenarioId];

  const data = useMemo(() => {
    if (!output) return null;
    return {
      impact: scenarioImpact(results, scenarioId),
      highRisk: highRiskRegions(output),
      congested: mostCongestedShells(output),
      growing: fastestGrowingDebris(output),
      hotspots: cascadeHotspots(stability),
      targets: recommendedTargets(output, stability, scenarioId),
      threats: topThreatObjects(output, stability),
      timeline: timelineProjection(output),
      summary: scenarioSummary(results, stability, scenarioId),
    };
  }, [results, stability, scenarioId, output]);

  const compare = useMemo(() => compareScenarios(results), [results]);

  const sub = physicsReal ? 'Seeded from live catalogue · MOCAT' : 'MOCAT projection';

  return (
    <PanelShell
      title="Scenario Workspace"
      subtitle={sub}
      icon={<Orbit size={14} />}
      width="w-[30rem]"
    >
      <div className="space-y-5 p-4">
        {/* ── Policy Selection ── */}
        <Section title="Policy Selection" icon={<Target size={12} />}>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((sc) => {
              const active = sc.scenario_id === scenarioId;
              return (
                <button
                  key={sc.scenario_id}
                  onClick={() => {
                    play('beep', 0.25);
                    loadScenario(sc.scenario_id);
                  }}
                  className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? 'border-[#00ff88]/70 bg-[#00ff88]/10'
                      : 'border-[#1f1f1f] hover:border-[#3a3a3a] hover:bg-white/5'
                  }`}
                >
                  <div className="truncate text-[12px] text-white">{shortName(sc.name)}</div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                    {INTERVENTION_LABEL[sc.intervention]}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Density</span>
            <input
              type="range"
              min={0.3}
              max={1.6}
              step={0.1}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="os-range h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[#2a2a2a]"
            />
            <span className="font-mono text-[10px] text-neutral-300">{density.toFixed(1)}×</span>
          </div>

          <div className="mt-3 flex gap-1.5">
            <ViewTab label="Analyze" active={view === 'analyze'} onClick={() => setView('analyze')} icon={<TrendingUp size={11} />} />
            <ViewTab label="Compare policies" active={view === 'compare'} onClick={() => setView('compare')} icon={<GitCompare size={11} />} />
          </div>
        </Section>

        {!data ? (
          <p className="font-mono text-[11px] text-neutral-600">Loading simulation…</p>
        ) : view === 'compare' ? (
          <CompareTable rows={compare} current={scenarioId} onPick={loadScenario} />
        ) : (
          <>
            {/* ── Scenario Impact Analysis ── */}
            <Section title="Scenario Impact Analysis" icon={<TrendingUp size={12} />} note="vs baseline (no action)">
              <div className="space-y-2">
                {data.impact.map((m) => (
                  <MetricCard key={m.key} m={m} />
                ))}
                <RegionBlock
                  title="Predicted High-Risk Regions"
                  icon={<AlertTriangle size={11} className="text-red-400" />}
                  items={data.highRisk}
                  tone="bad"
                />
              </div>
            </Section>

            {/* ── Simulation Insights ── */}
            <Section title="Simulation Insights" icon={<Layers size={12} />} note="deterministic engine output">
              <ThreatList threats={data.threats} />
              <RegionBlock title="Most Congested Orbital Shells" icon={<Layers size={11} className="text-amber-300" />} items={data.congested} tone="warn" />
              <RegionBlock title="Predicted Cascade Hotspots" icon={<Flame size={11} className="text-red-400" />} items={data.hotspots} tone="bad" />
              <RegionBlock title="Fastest-Growing Debris Regions" icon={<TrendingUp size={11} className="text-amber-300" />} items={data.growing} tone="warn" />
              <RegionBlock title="Recommended Intervention Targets" icon={<Crosshair size={11} className="text-[#00ff88]" />} items={data.targets} tone="good" />
            </Section>

            {/* ── Future Timeline Projection ── */}
            <Section title="Future Timeline Projection" icon={<CalendarClock size={12} />} note="10 · 20 · 30 · 50 · 100 yr">
              <TimelineTable rows={data.timeline} />
            </Section>

            {/* ── Scenario Summary Card ── */}
            <Section title="Scenario Summary" icon={<FileText size={12} />}>
              <SummaryCard s={data.summary} />
            </Section>
          </>
        )}
      </div>
    </PanelShell>
  );
}

// ── building blocks ───────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  note,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[#00ff88]">{icon}</span>
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-300">{title}</h3>
        {note && <span className="ml-auto font-mono text-[9px] text-neutral-600">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function ViewTab({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
        active ? 'border-[#00ff88]/60 bg-[#00ff88]/10 text-[#00ff88]' : 'border-[#1f1f1f] text-neutral-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MetricCard({ m }: { m: ImpactMetric }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-black/40">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="font-mono text-[11px] text-neutral-300">{m.label}</span>
        <span className="flex items-center gap-2">
          <span className={`font-mono text-[13px] font-semibold ${dirColor[m.direction]}`}>{m.display}</span>
          <span className="flex items-center gap-0.5 font-mono text-[9px] uppercase text-neutral-500">
            Why <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </span>
      </button>
      {open && (
        <ul className="space-y-1 border-t border-[#1f1f1f] px-3 py-2">
          {m.why.map((w, i) => (
            <li key={i} className="flex gap-1.5 font-mono text-[10px] leading-relaxed text-neutral-400">
              <span className="text-[#00ff88]">›</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const toneBar: Record<string, string> = {
  good: 'bg-[#00ff88]',
  warn: 'bg-amber-300',
  bad: 'bg-red-400',
};

function RegionBlock({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: RegionStat[];
  tone: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="font-mono text-[10px] text-neutral-600">None — no shell meets this threshold.</p>
      ) : (
        <div className="space-y-1">
          {items.map((r) => (
            <div key={r.shell} className="flex items-center gap-2 rounded border border-[#1f1f1f] bg-black/30 px-2.5 py-1.5">
              <span className={`h-6 w-[3px] rounded-full ${toneBar[tone]}`} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-white">{r.label}</div>
                <div className="truncate font-mono text-[9px] text-neutral-500">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreatList({ threats }: { threats: ReturnType<typeof topThreatObjects> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mb-1">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Crosshair size={11} className="text-red-400" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Top Threat Objects</span>
      </div>
      <div className="space-y-1">
        {threats.map((t) => (
          <div key={t.name} className="rounded border border-[#1f1f1f] bg-black/30">
            <button onClick={() => setOpen(open === t.name ? null : t.name)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
              <span className="text-[13px] leading-none">{t.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px] text-white">{t.name}</div>
                <div className="font-mono text-[9px] text-neutral-500">
                  {t.kind} · {t.altKm} km · {t.shellStatus}
                </div>
              </div>
              <ChevronDown size={11} className={`text-neutral-500 transition-transform ${open === t.name ? 'rotate-180' : ''}`} />
            </button>
            {open === t.name && (
              <p className="border-t border-[#1f1f1f] px-2.5 py-2 font-mono text-[10px] leading-relaxed text-neutral-400">{t.why}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTable({ rows }: { rows: ReturnType<typeof timelineProjection> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#1f1f1f]">
      <table className="w-full font-mono text-[10px]">
        <thead className="bg-white/[0.03] text-neutral-500">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold">Horizon</th>
            <th className="px-2 py-1.5 text-right font-semibold">Objects</th>
            <th className="px-2 py-1.5 text-right font-semibold">Debris</th>
            <th className="px-2 py-1.5 text-right font-semibold">Coll/yr</th>
            <th className="px-2 py-1.5 text-center font-semibold">Grade</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.years} className="border-t border-[#1f1f1f] text-neutral-300">
              <td className="px-2 py-1.5">
                {r.years}y <span className="text-neutral-600">·{r.calendarYear}</span>
                {r.extrapolated && <span className="ml-1 text-amber-400/70" title="extrapolated beyond 30-yr sim">*</span>}
              </td>
              <td className="px-2 py-1.5 text-right">{Math.round(r.totalObjects).toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right">{Math.round(r.totalDebris).toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right">{r.collisionsPerYear.toFixed(1)}</td>
              <td className={`px-2 py-1.5 text-center font-semibold ${gradeColor(r.grade)}`}>{r.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-2 py-1.5 font-mono text-[9px] text-neutral-600">* 50/100-yr rows extrapolate the sim's late-stage growth rate.</p>
    </div>
  );
}

function SummaryCard({ s }: { s: ReturnType<typeof scenarioSummary> }) {
  const rows: [string, string][] = [
    ['What changed', s.whatChanged],
    ['Why it changed', s.whyChanged],
    ['Long-term consequence', s.longTermConsequence],
    ['Regions that benefited', s.regionsBenefited],
    ['Regions still at risk', s.regionsAtRisk],
  ];
  return (
    <div className="space-y-2 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/[0.03] p-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <div className="font-mono text-[9px] uppercase tracking-wider text-[#00ff88]/80">{k}</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-300">{v}</p>
        </div>
      ))}
    </div>
  );
}

function CompareTable({
  rows,
  current,
  onPick,
}: {
  rows: ReturnType<typeof compareScenarios>;
  current: string;
  onPick: (id: string) => void;
}) {
  // best per column → highlight
  const bestColl = Math.max(...rows.map((r) => r.collisionReductionPct));
  const bestGrowth = Math.min(...rows.map((r) => r.debrisGrowthPct));
  const bestObj = Math.min(...rows.map((r) => r.finalObjects));
  return (
    <Section title="Policy Comparison" icon={<GitCompare size={12} />} note="best per row highlighted">
      <div className="overflow-x-auto rounded-lg border border-[#1f1f1f]">
        <table className="w-full font-mono text-[10px]">
          <thead className="bg-white/[0.03] text-neutral-500">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Policy</th>
              <th className="px-2 py-1.5 text-right font-semibold">Coll↓</th>
              <th className="px-2 py-1.5 text-right font-semibold">Debris</th>
              <th className="px-2 py-1.5 text-right font-semibold">Objects</th>
              <th className="px-2 py-1.5 text-center font-semibold">Grade</th>
              <th className="px-2 py-1.5 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.scenarioId}
                onClick={() => onPick(r.scenarioId)}
                className={`cursor-pointer border-t border-[#1f1f1f] text-neutral-300 hover:bg-white/5 ${
                  r.scenarioId === current ? 'bg-[#00ff88]/10' : ''
                }`}
              >
                <td className="px-2 py-1.5 text-white">{shortName(r.name)}</td>
                <td className={`px-2 py-1.5 text-right ${r.collisionReductionPct === bestColl ? 'text-[#00ff88]' : ''}`}>
                  {r.collisionReductionPct >= 0 ? '−' : '+'}
                  {Math.abs(r.collisionReductionPct).toFixed(0)}%
                </td>
                <td className={`px-2 py-1.5 text-right ${r.debrisGrowthPct === bestGrowth ? 'text-[#00ff88]' : ''}`}>
                  {r.debrisGrowthPct > 0 ? '+' : ''}
                  {r.debrisGrowthPct.toFixed(0)}%
                </td>
                <td className={`px-2 py-1.5 text-right ${r.finalObjects === bestObj ? 'text-[#00ff88]' : ''}`}>
                  {Math.round(r.finalObjects).toLocaleString()}
                </td>
                <td className={`px-2 py-1.5 text-center font-semibold ${gradeColor(r.sustGrade)}`}>{r.sustGrade}</td>
                <td className="px-2 py-1.5 text-right text-neutral-400">{r.costIndex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[9px] text-neutral-600">
        Coll↓ = cumulative collision reduction vs baseline · Debris = 30-yr growth · Objects = year-30 population · Cost = relative effort index. Click a row to load it.
      </p>
    </Section>
  );
}

function gradeColor(g: string): string {
  return g === 'A' || g === 'B' ? 'text-[#00ff88]' : g === 'C' ? 'text-amber-300' : 'text-red-400';
}

function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*/, '').trim();
}
