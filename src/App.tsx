import { Scene } from '@/viz/Scene';
import { TopBar } from '@/features/TopBar';
import { Timeline } from '@/features/timeline/Timeline';
import { MetricsStrip } from '@/features/metrics/MetricsStrip';
import { SatelliteInfoPanel } from '@/features/live/SatelliteInfoPanel';
import { HoverTooltip } from '@/features/live/HoverTooltip';
import { TimeMachineOverlay } from '@/features/live/TimeMachineOverlay';
import { Sidebar } from '@/features/shell/Sidebar';
import { PanelHost } from '@/features/shell/PanelHost';
import { CustomizeDrawer } from '@/features/shell/CustomizeDrawer';
import { LoadingOverlay } from '@/features/shell/LoadingOverlay';
import { useSimStore } from '@/state/useSimStore';
import { useEffect } from 'react';
import { loadPhysics } from '@/sim/loadPhysics';

/**
 * Explore — Dexter's primary screen. The 3D orbital environment fills the
 * viewport; a persistent left icon rail drives one slide-in
 * feature panel at a time. See plans/04_FRONTEND_ARCHITECTURE.md.
 */
export function App() {
  const mode = useSimStore((s) => s.mode);
  const selection = useSimStore((s) => s.selection);
  const setPhysics = useSimStore((s) => s.setPhysics);

  // Seed the debris model from the real catalogue once on boot.
  useEffect(() => {
    loadPhysics().then(setPhysics).catch(() => {});
  }, [setPhysics]);

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

          {/* Feature panels dock on the right, clear of the 3D globe. */}
          <div className="flex flex-1 items-start justify-end gap-4 py-4">
            <PanelHost />
          </div>

          <CustomizeDrawer />

          <div className="flex flex-col gap-3">
            {mode === 'scenario' && <MetricsStrip />}
            <Timeline />
          </div>
        </div>
      </div>

      {/* Draggable satellite readout (starts left, out of the panels' way) */}
      {mode === 'live' && selection && <SatelliteInfoPanel />}

      {/* Cursor-following hover readout for any object in Live Sky */}
      {mode === 'live' && <HoverTooltip />}

      <LoadingOverlay />
    </div>
  );
}
