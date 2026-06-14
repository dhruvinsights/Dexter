import { useMemo, useState } from 'react';
import { PanelShell } from '@/features/shell/PanelShell';
import { useSimStore } from '@/state/useSimStore';
import { play } from '@/lib/sound';

/**
 * Forecasting / policy sandbox — projects object count, collision risk, cost
 * and a sustainability grade across the simulation horizon. Intervention sliders
 * re-scale the baseline MOCAT series client-side so the user sees an instant
 * "what-if" without a backend round-trip (the agent can refine later).
 */
export function ForecastingPanel() {
  const output = useSimStore((s) => s.output);
  const physicsReal = useSimStore((s) => s.physicsReal);
  const [adr, setAdr] = useState(0); // 0..1 active debris removal aggressiveness
  const [launchCap, setLaunchCap] = useState(1); // 0.3..1.5 launch-rate multiplier

  const proj = useMemo(() => {
    const base = output.total_objects_per_year;
    const baseCol = output.total_collisions_per_year;
    // Each year's growth is damped by ADR and scaled by the launch multiplier.
    const objects: number[] = [];
    const collisions: number[] = [];
    const start = base[0] ?? 0;
    let acc = start;
    for (let i = 0; i < base.length; i++) {
      const delta = (base[i] - (base[i - 1] ?? start)) * launchCap * (1 - adr * 0.7);
      acc = i === 0 ? start : acc + delta;
      objects.push(Math.max(0, acc));
      collisions.push(Math.max(0, baseCol[i] * launchCap * (1 - adr * 0.85)));
    }
    const finalObj = objects.at(-1) ?? 0;
    const totalCol = collisions.reduce((a, b) => a + b, 0);
    // Rough cost model: ADR missions + launch volume, in $M.
    const cost = adr * output.shells.length * 120 + launchCap * 40 * output.simulation_years;
    const risk = Math.min(100, (finalObj / Math.max(1, start) - 1) * 60 + totalCol * 4);
    const grade = risk < 20 ? 'A' : risk < 40 ? 'B' : risk < 60 ? 'C' : risk < 80 ? 'D' : 'F';
    return { objects, collisions, finalObj, totalCol, cost, risk, grade };
  }, [output, adr, launchCap]);

  return (
    <PanelShell title="Forecasting" subtitle="Policy sandbox · projected outcome" width="w-96">
      <div className="space-y-5 p-4">
        <Sparkline values={proj.objects} label="Objects in orbit" />

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Final objects" value={Math.round(proj.finalObj).toLocaleString()} />
          <Stat label="Collisions" value={proj.totalCol.toFixed(1)} />
          <Stat label="Cost" value={`$${Math.round(proj.cost)}M`} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#1f1f1f] bg-black/40 p-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              Sustainability grade
            </p>
            <p className="font-mono text-[11px] text-neutral-400">{proj.risk.toFixed(0)} risk index</p>
          </div>
          <span
            className={`font-mono text-4xl font-bold ${
              proj.grade === 'A' || proj.grade === 'B'
                ? 'text-[#00ff88]'
                : proj.grade === 'C'
                  ? 'text-amber-400'
                  : 'text-red-500'
            }`}
          >
            {proj.grade}
          </span>
        </div>

        <Slider
          label="Active debris removal"
          value={adr}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => {
            setAdr(v);
            play('click', 0.15);
          }}
        />
        <Slider
          label="Launch rate"
          value={launchCap}
          min={0.3}
          max={1.5}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={(v) => {
            setLaunchCap(v);
            play('click', 0.15);
          }}
        />

        <p className="font-mono text-[10px] leading-relaxed text-neutral-600">
          {physicsReal ? 'Seeded from the real catalogue, then ' : 'Model '}re-scales the{' '}
          {output.simulation_years}-year source–sink projection. This is a physics model (not measured
          telemetry). Open the AI Agent for a narrative risk assessment.
        </p>
      </div>
    </PanelShell>
  );
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 320;
  const h = 80;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1, max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        <polyline points={pts} fill="none" stroke="#00ff88" strokeWidth="1.5" />
        <polyline points={`0,${h} ${pts} ${w},${h}`} fill="#00ff8810" stroke="none" />
      </svg>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-black/40 p-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">{label}</p>
      <p className="font-mono text-sm text-white">{value}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
        <span className="font-mono text-[11px] text-[#00ff88]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="os-range h-1 w-full cursor-pointer appearance-none rounded bg-[#1f1f1f]"
      />
    </div>
  );
}
