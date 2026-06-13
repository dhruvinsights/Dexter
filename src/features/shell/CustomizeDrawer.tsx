import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useSimStore } from '@/state/useSimStore';
import { COLOR_SCHEMES, type ColorSchemeId } from '@/viz/colorSchemes';
import { play } from '@/lib/sound';

const SCHEME_LABELS: Record<ColorSchemeId, string> = {
  objectType: 'Object type',
  country: 'Country',
  sunlight: 'Sunlight',
};

/**
 * Collapsible right-edge customization drawer — scene/display options.
 * Hidden by default; toggled from a floating gear button.
 */
export function CustomizeDrawer() {
  const [open, setOpen] = useState(false);
  const mode = useSimStore((s) => s.mode);
  const colorScheme = useSimStore((s) => s.colorScheme);
  const setColorScheme = useSimStore((s) => s.setColorScheme);
  const showOrbits = useSimStore((s) => s.showOrbits);
  const toggleOrbits = useSimStore((s) => s.toggleOrbits);
  const liveSpeed = useSimStore((s) => s.liveSpeed);
  const setLiveSpeed = useSimStore((s) => s.setLiveSpeed);

  if (!open) {
    return (
      <button
        title="Customize display"
        onClick={() => {
          play('button', 0.35);
          setOpen(true);
        }}
        className="pointer-events-auto absolute right-5 top-20 flex h-10 w-10 items-center justify-center rounded-md border border-[#1f1f1f] bg-[#060606]/90 text-neutral-400 backdrop-blur transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88]"
      >
        <SlidersHorizontal size={16} />
      </button>
    );
  }

  return (
    <div className="hud-panel hud-scanline panel-in pointer-events-auto absolute right-5 top-20 w-64 overflow-hidden rounded-lg">
      <header className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-2.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
          Display
        </span>
        <button
          onClick={() => {
            play('click', 0.25);
            setOpen(false);
          }}
          className="rounded p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={13} />
        </button>
      </header>

      <div className="space-y-4 p-3">
        {mode === 'live' && (
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-neutral-600">
              Colour by
            </p>
            <div className="flex flex-col gap-1">
              {(Object.keys(COLOR_SCHEMES) as ColorSchemeId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setColorScheme(id);
                    play('click', 0.2);
                  }}
                  className={`rounded border px-2 py-1.5 text-left font-mono text-[10px] transition-colors ${
                    colorScheme === id
                      ? 'border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88]'
                      : 'border-[#1f1f1f] text-neutral-400 hover:text-white'
                  }`}
                >
                  {SCHEME_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            Orbit paths
          </span>
          <input
            type="checkbox"
            checked={showOrbits}
            onChange={() => {
              toggleOrbits();
              play('click', 0.2);
            }}
          />
        </label>

        {mode === 'live' && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                Time warp
              </span>
              <span className="font-mono text-[11px] text-[#00ff88]">{liveSpeed}×</span>
            </div>
            <input
              type="range"
              min={1}
              max={600}
              step={1}
              value={liveSpeed}
              onChange={(e) => setLiveSpeed(Number(e.target.value))}
              className="os-range h-1 w-full cursor-pointer appearance-none rounded bg-[#1f1f1f]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
