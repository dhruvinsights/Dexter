import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { useSimStore } from '@/state/useSimStore';
import type { ShellStatus } from '@/sim/debrisEngine';

/**
 * Shell Analysis — the real current state of the LEO environment, binned by
 * altitude from the live catalogue, with a per-shell Kessler-stability readout.
 *
 * "Critical" shells generate trackable collision fragments faster than
 * atmospheric drag can clear them, so debris there accumulates indefinitely —
 * the physical signature of an incipient Kessler cascade.
 */
const STATUS_META: Record<ShellStatus, { color: string; label: string }> = {
  stable: { color: '#4dff80', label: 'Self-clearing' },
  marginal: { color: '#d9ff4d', label: 'Marginal' },
  growing: { color: '#ffb433', label: 'Growing' },
  critical: { color: '#ff5950', label: 'Critical' },
};

function fmtLifetime(yrs: number): string {
  if (yrs < 1) return `${Math.round(yrs * 12)} mo`;
  if (yrs < 1000) return `${Math.round(yrs)} yr`;
  if (yrs < 1e6) return `${(yrs / 1000).toFixed(0)}k yr`;
  return '∞';
}

export function ShellAnalysisPanel() {
  const stability = useSimStore((s) => s.stability);
  const physicsReal = useSimStore((s) => s.physicsReal);

  const summary = useMemo(() => {
    const critical = stability.filter((s) => s.status === 'critical').length;
    const totalDebris = stability.reduce((a, s) => a + s.debris, 0);
    const totalObjects = stability.reduce((a, s) => a + s.objects, 0);
    const maxObjects = Math.max(1, ...stability.map((s) => s.objects));
    return { critical, totalDebris, totalObjects, maxObjects };
  }, [stability]);

  return (
    <PanelShell
      title="Shell Analysis"
      subtitle={physicsReal ? 'Real catalogue · per-altitude' : 'Seed · per-altitude'}
      icon={<Layers size={14} />}
      width="w-[30rem]"
    >
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="On-orbit" value={summary.totalObjects.toLocaleString()} />
          <Stat label="Debris" value={summary.totalDebris.toLocaleString()} />
          <Stat label="Critical shells" value={`${summary.critical}/${stability.length}`} danger={summary.critical > 0} />
        </div>

        <div className="space-y-1.5">
          {stability.map((s) => {
            const meta = STATUS_META[s.status];
            return (
              <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-black/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-white">{s.label}</span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                    style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
                  >
                    {meta.label}
                  </span>
                </div>
                {/* object-count bar */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.objects / summary.maxObjects) * 100}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[9px] text-neutral-500">
                  <span>{s.objects.toLocaleString()} objects · {s.debris.toLocaleString()} debris</span>
                  <span>drag clears in {fmtLifetime(s.lifetimeYears)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="border-t border-[#1f1f1f] pt-3 font-mono text-[9px] leading-relaxed text-neutral-600">
          {physicsReal
            ? 'Seeded from the real CelesTrak catalogue (decayed objects excluded). '
            : 'Using baked-in real distribution. '}
          A "critical" shell produces collision fragments faster than atmospheric drag removes them — debris there accumulates indefinitely (Kessler regime).
        </p>
      </div>
    </PanelShell>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-black/40 px-2.5 py-2">
      <div className={`font-mono text-base ${danger ? 'text-[#ff5950]' : 'text-white'}`}>{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}
