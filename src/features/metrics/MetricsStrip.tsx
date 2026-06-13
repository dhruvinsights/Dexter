import { useMemo } from 'react';
import { useSimStore } from '@/state/useSimStore';
import { metricsAtYear } from '@/sim/metrics';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-[#d4d4d4]',
  B: 'text-[#d4d4d4]',
  C: 'text-[#f59e0b]',
  D: 'text-[#f59e0b]',
  F: 'text-[#ef4444]',
};

/** Bottom metrics strip — derived from the same MOCAT arrays the 3D field uses. */
export function MetricsStrip() {
  const output = useSimStore((s) => s.output);
  // re-derive only when the integer year changes (cheap, avoids 60fps recompute)
  const intYear = useSimStore((s) => Math.floor(s.year));

  const m = useMemo(() => metricsAtYear(output, intYear), [output, intYear]);

  return (
    <div className="pointer-events-auto flex items-stretch gap-px overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#1f1f1f]/60 backdrop-blur">
      <Stat label="Tracked objects" value={fmt(m.totalObjects)} />
      <Stat label="Debris" value={fmt(m.totalDebris)} accent="risk" />
      <Stat label="Collisions / yr" value={m.collisionsPerYear.toFixed(1)} accent="risk" />
      <Stat
        label="Sustainability"
        value={`${m.sustainabilityScore} · ${m.grade}`}
        valueClass={GRADE_COLOR[m.grade]}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
  accent,
}: {
  label: string;
  value: string;
  valueClass?: string;
  accent?: 'risk';
}) {
  return (
    <div className="min-w-[140px] bg-[#0a0a0a]/85 px-4 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-lg ${valueClass ?? 'text-white'}`}>
        {value}
        {accent === 'risk' && <span className="ml-1 text-xs text-neutral-600">↑</span>}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}
