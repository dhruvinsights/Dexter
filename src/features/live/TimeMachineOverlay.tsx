import { useMemo } from 'react';
import { Rocket, Satellite, Trash2, Activity, Sparkles } from 'lucide-react';
import { useSimStore } from '@/state/useSimStore';
import {
  buildHistoryIndex,
  statsForYear,
  eventForYear,
  latestEvent,
  type EventKind,
} from '@/sim/timeMachineHistory';

const eventAccent: Record<EventKind, string> = {
  milestone: 'border-[#00ff88]/50 text-[#00ff88]',
  constellation: 'border-[#22d3ee]/50 text-[#22d3ee]',
  debris: 'border-red-500/50 text-red-400',
};

/**
 * Time-Machine HUD — a documentary overlay shown while sweeping launch history.
 * Big year readout + a live statistics panel (population by type, objects added,
 * cumulative total, growth rate) + the major space event for the current year.
 * Everything is reconstructed deterministically from the real catalogue's launch
 * years (see sim/timeMachineHistory.ts).
 */
export function TimeMachineOverlay() {
  const active = useSimStore((s) => s.timeMachineActive);
  // Re-render only on integer-year change, not every frame.
  const year = useSimStore((s) => Math.floor(s.timeMachineYear));
  const catalogue = useSimStore((s) => s.catalogue);

  const idx = useMemo(() => buildHistoryIndex(catalogue), [catalogue]);
  const stats = useMemo(() => statsForYear(idx, year), [idx, year]);

  if (!active) return null;

  const event = eventForYear(year);
  const era = latestEvent(year);
  const hasData = catalogue.length > 0;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Giant faded year */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[20vh] font-bold leading-none text-white/[0.07]">{year}</span>
        <span className="-mt-2 font-mono text-xs uppercase tracking-[0.4em] text-neutral-600">
          orbital history · by launch year
        </span>
      </div>

      {/* Statistics panel — top-left, clear of the rail + top bar */}
      <div className="absolute left-24 top-24 w-64 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Orbital Census
          </span>
          <span className="font-mono text-sm font-bold text-white">{year}</span>
        </div>

        {!hasData ? (
          <p className="font-mono text-[10px] text-neutral-600">Loading catalogue…</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat icon={<Satellite size={11} />} label="Payloads" value={stats.payloads} tone="text-[#00ff88]" />
              <Stat icon={<Rocket size={11} />} label="R/Bodies" value={stats.rocketBodies} tone="text-amber-300" />
              <Stat icon={<Trash2 size={11} />} label="Debris" value={stats.debris} tone="text-red-400" />
            </div>
            <div className="mt-2 space-y-1 border-t border-[#1f1f1f] pt-2">
              <Row label="Cumulative in orbit" value={stats.cumulative.toLocaleString()} />
              <Row label="Added this year" value={`+${stats.addedThisYear.toLocaleString()}`} highlight={stats.addedThisYear > 0} />
              <Row
                label="Growth rate"
                value={`${stats.growthRatePct >= 0 ? '+' : ''}${stats.growthRatePct.toFixed(1)}%`}
              />
            </div>
            {era && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-[#1f1f1f] pt-2">
                <Activity size={11} className="shrink-0 text-neutral-500" />
                <span className="truncate font-mono text-[10px] text-neutral-400" title={`${era.title} (${era.year})`}>
                  Era: {era.title}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Major event for this exact year — animated callout, top-center */}
      {event && (
        <div
          key={event.year}
          className={`panel-in absolute left-1/2 top-20 w-[26rem] max-w-[80vw] -translate-x-1/2 rounded-xl border bg-[#0a0a0a]/90 p-3 backdrop-blur ${eventAccent[event.kind]}`}
        >
          <div className="flex items-start gap-2">
            <Sparkles size={15} className="mt-0.5 shrink-0" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-semibold text-white">{event.title}</span>
                <span className="font-mono text-[11px] opacity-80">{event.year}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-300">{event.detail}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-[#1f1f1f] bg-black/40 px-1.5 py-1.5 text-center">
      <div className={`flex items-center justify-center gap-1 ${tone}`}>{icon}</div>
      <div className="mt-1 font-mono text-[13px] font-semibold text-white">{value.toLocaleString()}</div>
      <div className="font-mono text-[8px] uppercase tracking-wider text-neutral-600">{label}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-neutral-500">{label}</span>
      <span className={`font-mono text-[11px] ${highlight ? 'text-[#00ff88]' : 'text-neutral-200'}`}>{value}</span>
    </div>
  );
}
