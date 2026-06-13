import { PanelShell } from '@/features/shell/PanelShell';
import { useRegionFilter } from '@/state/useRegionFilter';
import { play } from '@/lib/sound';

const PRESETS: { name: string; lat: number; lon: number }[] = [
  { name: 'CONUS', lat: 39, lon: -98 },
  { name: 'Europe', lat: 50, lon: 10 },
  { name: 'East Asia', lat: 35, lon: 120 },
  { name: 'Equator', lat: 0, lon: 0 },
];

/**
 * Region Filter — pick a ground point and radius; the live field highlights
 * objects currently passing over that region (ground-track based).
 */
export function RegionPanel() {
  const { active, latDeg, lonDeg, radiusKm, set, setActive } = useRegionFilter();

  return (
    <PanelShell title="Region Filter" subtitle="objects over a ground region" width="w-80">
      <div className="space-y-4 p-4">
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#1f1f1f] bg-black/40 px-3 py-2.5">
          <span className="font-mono text-[11px] text-white">Filter active</span>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              play('click', 0.25);
            }}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <NumField label="Latitude °" value={latDeg} min={-90} max={90} onChange={(v) => set({ latDeg: v })} />
          <NumField label="Longitude °" value={lonDeg} min={-180} max={180} onChange={(v) => set({ lonDeg: v })} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Radius</span>
            <span className="font-mono text-[11px] text-[#00ff88]">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min={100}
            max={4000}
            step={100}
            value={radiusKm}
            onChange={(e) => set({ radiusKm: Number(e.target.value) })}
            className="os-range h-1 w-full cursor-pointer appearance-none rounded bg-[#1f1f1f]"
          />
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-neutral-600">Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  set({ latDeg: p.lat, lonDeg: p.lon });
                  setActive(true);
                  play('click', 0.25);
                }}
                className="rounded border border-[#1f1f1f] px-2 py-1 font-mono text-[10px] text-neutral-400 transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88]"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <p className="font-mono text-[9px] leading-relaxed text-neutral-600">
          Sub-point computed per object via satellite.js eciToGeodetic; matches within the radius are highlighted in
          the live field.
        </p>
      </div>
    </PanelShell>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-full rounded border border-[#1f1f1f] bg-black/50 px-2.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-[#00ff88]/50"
      />
    </label>
  );
}
