import { useSimStore } from '@/state/useSimStore';

/**
 * Satellite info panel shown when a satellite is selected in Live Sky mode.
 * Displays NORAD ID, name, and orbital information.
 */
export function SatelliteInfoPanel() {
  const selection = useSimStore((s) => s.selection);

  if (!selection) return null;

  return (
    <div className="pointer-events-auto flex w-80 flex-col gap-3 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/90 p-4 backdrop-blur">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-mono text-sm font-medium text-white">{selection.label}</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            NORAD {selection.norad}
          </p>
        </div>
        <button
          onClick={() => useSimStore.getState().select(null)}
          className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 border-t border-[#1f1f1f] pt-3 text-xs">
        <InfoRow label="Type" value="Satellite" />
        <InfoRow label="Status" value="Active" />
        <InfoRow label="Propagator" value="SGP4" />
      </div>

      <div className="border-t border-[#1f1f1f] pt-3">
        <p className="text-[11px] leading-relaxed text-neutral-600">
          Click elsewhere to deselect. Real-time position calculated from TLE data using SGP4
          propagation.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className="font-mono text-[11px] text-neutral-300">{value}</span>
    </div>
  );
}

// Made with Bob
