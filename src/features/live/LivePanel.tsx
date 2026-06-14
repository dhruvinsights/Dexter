import { useSimStore } from '@/state/useSimStore';
import { useEffect, useMemo, useState } from 'react';

/** Left panel in Live Sky mode — context about the real catalogue being propagated. */
export function LivePanel() {
  const liveCount = useSimStore((s) => s.liveCount);
  const catalogue = useSimStore((s) => s.catalogue);
  const [tleEpoch, setTleEpoch] = useState<string>('');
  const [tleAge, setTleAge] = useState<string>('');

  // Real object-type breakdown, counted from the actual catalogue (SATCAT).
  const breakdown = useMemo(() => {
    let pay = 0;
    let deb = 0;
    let rb = 0;
    for (const e of catalogue) {
      if (e.type === 'DEB') deb++;
      else if (e.type === 'R/B') rb++;
      else if (e.type === 'PAY') pay++;
    }
    return { pay, deb, rb };
  }, [catalogue]);

  useEffect(() => {
    // Parse TLE.txt to extract epoch from first TLE line
    fetch('/tle/TLE.txt')
      .then((r) => r.text())
      .then((text) => {
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('1 ')) {
            // TLE epoch is in columns 19-32 (format: YYDDD.DDDDDDDD)
            const epochStr = line.slice(18, 32).trim();
            const yy = parseInt(epochStr.slice(0, 2), 10);
            const year = yy >= 57 ? 1900 + yy : 2000 + yy;
            const dayOfYear = parseFloat(epochStr.slice(2));
            const epochDate = new Date(year, 0, 1);
            epochDate.setDate(dayOfYear);
            
            setTleEpoch(epochDate.toISOString().split('T')[0]);
            
            // Calculate age
            const ageMs = Date.now() - epochDate.getTime();
            const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
            if (ageHours < 24) {
              setTleAge(`${ageHours}h ago`);
            } else {
              const ageDays = Math.floor(ageHours / 24);
              setTleAge(`${ageDays}d ago`);
            }
            break;
          }
        }
      })
      .catch(() => {
        setTleEpoch('Unknown');
        setTleAge('');
      });
  }, [liveCount]);

  return (
    <div className="pointer-events-auto flex w-64 flex-col gap-4 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 p-4 backdrop-blur">
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
          Live Sky
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Real NORAD catalogue, propagated with SGP4 in real time.
        </p>
      </div>

      <div className="rounded-lg border border-[#1f1f1f] px-3 py-3">
        <div className="font-mono text-2xl text-white">
          {liveCount > 0 ? liveCount.toLocaleString() : '…'}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          tracked objects
        </div>
      </div>

      {breakdown.pay + breakdown.deb + breakdown.rb > 0 && (
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            object types (real)
          </div>
          <TypeRow color="#4dff80" label="Payloads" value={breakdown.pay} />
          <TypeRow color="#ffb433" label="Rocket bodies" value={breakdown.rb} />
          <TypeRow color="#ff5950" label="Debris" value={breakdown.deb} />
        </div>
      )}

      <div className="space-y-2 text-xs text-neutral-400">
        <Row label="Source" value="CelesTrak GP" valueClass="text-white" />
        <Row label="Epoch" value={tleEpoch || '…'} />
        {tleAge && <Row label="Age" value={tleAge} />}
        <Row label="Propagator" value="SGP4" />
        <Row label="Frame" value="ECI / TEME" />
        <Row label="Update" value="Every 2h" />
      </div>

      <p className="border-t border-[#1f1f1f] pt-3 text-[11px] leading-relaxed text-neutral-600">
        Live data from CelesTrak (USSF 18 SDS catalogue). These are genuine cataloged objects
        at physically propagated positions — distinct from Scenario mode's physics-model projection.
      </p>
    </div>
  );
}

function TypeRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-mono text-[11px] text-white">{value.toLocaleString()}</span>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className={`font-mono text-[11px] ${valueClass ?? 'text-neutral-300'}`}>{value}</span>
    </div>
  );
}
