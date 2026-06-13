import {
  Globe,
  Orbit,
  Clock,
  TrendingUp,
  Bot,
  Database,
  Radio,
  MapPin,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { useUIStore, type PanelId } from '@/state/useUIStore';
import { useSimStore } from '@/state/useSimStore';
import { play, isMuted, setMuted } from '@/lib/sound';

interface NavItem {
  id: PanelId;
  label: string;
  icon: typeof Globe;
  /** Switches the sim view mode when opened. */
  mode?: 'live' | 'scenario';
}

const TOP: NavItem[] = [
  { id: 'live', label: 'Live Sky', icon: Globe, mode: 'live' },
  { id: 'scenario', label: 'Scenario', icon: Orbit, mode: 'scenario' },
  { id: 'timeMachine', label: 'Time Machine', icon: Clock, mode: 'live' },
  { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
  { id: 'region', label: 'Region Filter', icon: MapPin, mode: 'live' },
  { id: 'customTle', label: 'Add Satellite', icon: Radio, mode: 'live' },
  { id: 'ai', label: 'AI Agent', icon: Bot },
  { id: 'knowledge', label: 'Knowledge Base', icon: Database },
];

/**
 * Persistent left icon rail — KeepTrack-style. Click an icon to slide its
 * feature panel in; only one panel is mounted at a time.
 */
export function Sidebar() {
  const activePanel = useUIStore((s) => s.activePanel);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const setMode = useSimStore((s) => s.setMode);
  const toggleTimeMachine = useSimStore((s) => s.toggleTimeMachine);
  const [muted, setMutedState] = useState(isMuted());

  const handleNav = (item: NavItem) => {
    play('click', 0.3);
    if (item.mode) setMode(item.mode);
    if (item.id === 'timeMachine') {
      // Time Machine is a live-mode overlay; ensure it's engaged when opened.
      const tmActive = useSimStore.getState().timeMachineActive;
      const willOpen = activePanel !== 'timeMachine';
      if (willOpen !== tmActive) toggleTimeMachine();
    }
    togglePanel(item.id);
  };

  return (
    <nav className="pointer-events-auto flex h-full w-16 flex-col items-center gap-1 border-r border-[#1f1f1f] bg-[#060606]/90 py-3 backdrop-blur">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-[#00ff88]/40 bg-[#00ff88]/5">
        <span className="font-mono text-sm font-bold text-[#00ff88]">D</span>
      </div>

      {TOP.map((item) => (
        <IconButton
          key={item.id}
          item={item}
          active={activePanel === item.id}
          onClick={() => handleNav(item)}
        />
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          title={muted ? 'Unmute' : 'Mute'}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
            if (!next) play('button', 0.4);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <IconButton
          item={{ id: 'settings', label: 'Settings', icon: Settings }}
          active={activePanel === 'settings'}
          onClick={() => handleNav({ id: 'settings', label: 'Settings', icon: Settings })}
        />
      </div>
    </nav>
  );
}

function IconButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      title={item.label}
      onClick={onClick}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-md transition-all ${
        active
          ? 'bg-[#00ff88]/10 text-[#00ff88]'
          : 'text-neutral-500 hover:bg-white/5 hover:text-white'
      }`}
    >
      {active && <span className="absolute left-0 h-6 w-[2px] rounded-r bg-[#00ff88]" />}
      <Icon size={18} />
      <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded border border-[#1f1f1f] bg-black/95 px-2 py-1 font-mono text-[10px] text-white group-hover:block">
        {item.label}
      </span>
    </button>
  );
}
