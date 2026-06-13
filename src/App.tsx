import { Scene } from '@/viz/Scene';
import { TopBar } from '@/features/TopBar';
import { Timeline } from '@/features/timeline/Timeline';
import { MetricsStrip } from '@/features/metrics/MetricsStrip';
import { SatelliteInfoPanel } from '@/features/live/SatelliteInfoPanel';
import { TimeMachineOverlay } from '@/features/live/TimeMachineOverlay';
import { Sidebar } from '@/features/shell/Sidebar';
import { PanelHost } from '@/features/shell/PanelHost';
import { useSimStore } from '@/state/useSimStore';

/**
 * Explore — Dexter's primary screen. The 3D orbital environment fills the
 * viewport; a persistent left icon rail (KeepTrack-style) drives one slide-in
 * feature panel at a time. See plans/04_FRONTEND_ARCHITECTURE.md.
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

      {/* HUD layer */}
      <div className="pointer-events-none absolute inset-0 flex">
        <Sidebar />

        <div className="flex flex-1 flex-col p-5">
          <TopBar />

          <div className="flex flex-1 items-start justify-between gap-4 py-4">
            <PanelHost />

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
      </div>
    </div>
  );
}
