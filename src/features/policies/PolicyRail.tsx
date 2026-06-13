import { SCENARIOS, useSimStore } from '@/state/useSimStore';

const INTERVENTION_LABEL: Record<string, string> = {
  baseline: 'No intervention',
  adr: 'Debris removal',
  launch_cap: 'Launch limits',
  ai_traffic_mgmt: 'Traffic mgmt',
  hybrid: 'Combined policy',
};

/** Left rail — policy/scenario picker + field density control. */
export function PolicyRail() {
  const scenarioId = useSimStore((s) => s.scenarioId);
  const loadScenario = useSimStore((s) => s.loadScenario);
  const density = useSimStore((s) => s.density);
  const setDensity = useSimStore((s) => s.setDensity);

  return (
    <div className="pointer-events-auto flex w-64 flex-col gap-4 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 p-4 backdrop-blur">
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
          Policy
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Choose an intervention and watch 30 years unfold.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {SCENARIOS.map((sc) => {
          const active = sc.scenario_id === scenarioId;
          return (
            <button
              key={sc.scenario_id}
              onClick={() => loadScenario(sc.scenario_id)}
              className={`group rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-white/80 bg-white/10'
                  : 'border-[#1f1f1f] hover:border-[#3a3a3a] hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full border ${
                    active ? 'border-white bg-white' : 'border-neutral-600'
                  }`}
                />
                <span className="text-sm text-white">{shortName(sc.name)}</span>
              </div>
              <div className="mt-1 pl-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                {INTERVENTION_LABEL[sc.intervention]}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-1 border-t border-[#1f1f1f] pt-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            Density
          </span>
          <span className="font-mono text-[11px] text-neutral-300">
            {density.toFixed(1)}×
          </span>
        </div>
        <input
          type="range"
          min={0.3}
          max={1.6}
          step={0.1}
          value={density}
          onChange={(e) => setDensity(Number(e.target.value))}
          className="os-range mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-[#2a2a2a]"
        />
      </div>
    </div>
  );
}

function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*/, '').trim();
}
