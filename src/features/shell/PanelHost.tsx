import { useUIStore } from '@/state/useUIStore';
import { LivePanel } from '@/features/live/LivePanel';
import { PolicyRail } from '@/features/policies/PolicyRail';
import { ForecastingPanel } from '@/features/forecast/ForecastingPanel';
import { AIAgentPanel } from '@/features/ai/AIAgentPanel';
import { KnowledgePanel } from '@/features/knowledge/KnowledgePanel';
import { CustomTlePanel } from '@/features/live/CustomTlePanel';
import { DateTimePicker } from '@/features/live/DateTimePicker';
import { RegionPanel } from '@/features/live/RegionPanel';
import { SettingsPanel } from '@/features/settings/SettingsPanel';

/**
 * Renders the single active sidebar panel as a slide-in column. Legacy
 * floating panels (live / scenario) bring their own chrome; new feature
 * panels use PanelShell.
 */
export function PanelHost() {
  const active = useUIStore((s) => s.activePanel);
  if (!active) return null;

  switch (active) {
    case 'live':
      return (
        <div className="panel-in">
          <LivePanel />
        </div>
      );
    case 'scenario':
      return (
        <div className="panel-in">
          <PolicyRail />
        </div>
      );
    case 'timeMachine':
      // The Time Machine renders as a full-width overlay (TimeMachineOverlay);
      // its controls live there, so the side column stays empty.
      return null;
    case 'datetime':
      return <DateTimePicker />;
    case 'forecast':
      return <ForecastingPanel />;
    case 'ai':
      return <AIAgentPanel />;
    case 'knowledge':
      return <KnowledgePanel />;
    case 'customTle':
      return <CustomTlePanel />;
    case 'region':
      return <RegionPanel />;
    case 'settings':
      return <SettingsPanel />;
    default:
      return null;
  }
}
