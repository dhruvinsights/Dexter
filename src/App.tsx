import { Scene } from '@/viz/Scene';
import { TopBar } from '@/features/TopBar';
import { PolicyRail } from '@/features/policies/PolicyRail';
import { Timeline } from '@/features/timeline/Timeline';
import { MetricsStrip } from '@/features/metrics/MetricsStrip';
import { LivePanel } from '@/features/live/LivePanel';
import { SatelliteInfoPanel } from '@/features/live/SatelliteInfoPanel';
import { ColorSchemeSelector } from '@/features/live/ColorSchemeSelector';
import { TimeMachineOverlay } from '@/features/live/TimeMachineOverlay';
import { AIAgentPanel } from '@/features/ai/AIAgentPanel';
import { useSimStore } from '@/state/useSimStore';

/**
 * Explore — Dexter's primary screen. The 3D orbital environment fills the viewport;
 * controls dock around it as floating glass panels. See plans/04_FRONTEND_ARCHITECTURE.md.
 */
export function App() {
  const mode = useSimStore((s) => s.mode);
  const selection = useSimStore((s) => s.selection);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Scene />
      </div>

      <TimeMachineOverlay />

      <div className="pointer-events-none absolute inset-0 flex flex-col p-5">
        <TopBar />

        <div className="flex flex-1 items-start justify-between gap-4 py-4">
          <div className="flex flex-col gap-4">
            {mode === 'scenario' ? <PolicyRail /> : <LivePanel />}
            {mode === 'live' && <ColorSchemeSelector />}
          </div>
          {mode === 'live' && selection && (
            <div className="flex items-start">
              <SatelliteInfoPanel />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {mode === 'scenario' && <MetricsStrip />}
          <Timeline />
        </div>
      </div>

      {/* AI Agent - available in both modes */}
      <AIAgentPanel />
    </div>
  );
}
