import { useSimStore } from '@/state/useSimStore';

/** Top bar — Dexter brand, mode toggle (Scenario ↔ Live Sky), orbit toggle, legend. */
export function TopBar() {
  const mode = useSimStore((s) => s.mode);
  const setMode = useSimStore((s) => s.setMode);
  const showOrbits = useSimStore((s) => s.showOrbits);
  const toggleOrbits = useSimStore((s) => s.toggleOrbits);
  const liveCount = useSimStore((s) => s.liveCount);
  const timeMachineActive = useSimStore((s) => s.timeMachineActive);
  const toggleTimeMachine = useSimStore((s) => s.toggleTimeMachine);

  return (
    <div className="pointer-events-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full border border-white/70" />
          <span className="font-mono text-base font-semibold tracking-[0.3em] text-white">
            DEXTER
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
          {mode === 'live'
            ? `${liveCount.toLocaleString()} real objects · SGP4`
            : 'orbital sustainability simulator'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleOrbits}
          className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
            showOrbits
              ? 'border-white/70 bg-white/10 text-white'
              : 'border-[#1f1f1f] text-neutral-400 hover:text-white'
          }`}
        >
          Orbits
        </button>

        {mode === 'live' && (
          <button
            onClick={toggleTimeMachine}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
              timeMachineActive
                ? 'border-white/70 bg-white/10 text-white'
                : 'border-[#1f1f1f] text-neutral-400 hover:text-white'
            }`}
          >
            Time Machine
          </button>
        )}

        <div className="flex overflow-hidden rounded-lg border border-[#1f1f1f]">
          <button
            onClick={() => setMode('scenario')}
            className={`px-3 py-1.5 font-mono text-xs transition-colors ${
              mode === 'scenario' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Scenario
          </button>
          <button
            onClick={() => setMode('live')}
            className={`px-3 py-1.5 font-mono text-xs transition-colors ${
              mode === 'live' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Live Sky
          </button>
        </div>

        <Legend mode={mode} />
      </div>
    </div>
  );
}

function Legend({ mode }: { mode: 'scenario' | 'live' }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a]/85 px-3 py-1.5 backdrop-blur">
      {mode === 'live' ? (
        <LegendDot color="#ffffff" label="Tracked object (real)" />
      ) : (
        <>
          <LegendDot color="#ffffff" label="Active sat" />
          <LegendDot color="#d4d4d4" label="Low" />
          <LegendDot color="#f59e0b" label="Elevated" />
          <LegendDot color="#ef4444" label="Critical" />
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="font-mono text-[10px] text-neutral-400">{label}</span>
    </div>
  );
}
