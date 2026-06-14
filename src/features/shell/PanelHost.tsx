import { useUIStore } from '@/state/useUIStore';
import { LivePanel } from '@/features/live/LivePanel';
import { ScenarioWorkspace } from '@/features/scenario/ScenarioWorkspace';
import { ForecastingPanel } from '@/features/forecast/ForecastingPanel';
import { AIAgentPanel } from '@/features/ai/AIAgentPanel';
import { KnowledgePanel } from '@/features/knowledge/KnowledgePanel';
import { CustomTlePanel } from '@/features/live/CustomTlePanel';
import { DateTimePicker } from '@/features/live/DateTimePicker';
import { RegionPanel } from '@/features/live/RegionPanel';
import { SatelliteDataPanel } from '@/features/live/SatelliteDataPanel';
import { ShellAnalysisPanel } from '@/features/forecast/ShellAnalysisPanel';
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
      return <ScenarioWorkspace />;
    case 'timeMachine':
      // The Time Machine renders as a full-width overlay (TimeMachineOverlay);
      // its controls live there, so the side column stays empty.
      return null;
    case 'datetime':
      return <DateTimePicker />;
    case 'forecast':
      return <ForecastingPanel />;
    case 'shells':
      return <ShellAnalysisPanel />;
    case 'ai':
      return <AIAgentPanel />;
    case 'knowledge':
      return <KnowledgePanel />;
    case 'customTle':
      return <CustomTlePanel />;
    case 'region':
      return <RegionPanel />;
    case 'satdata':
      return <SatelliteDataPanel />;
    case 'settings':
      return <SettingsPanel />;
    default:
      return null;
  }
}
