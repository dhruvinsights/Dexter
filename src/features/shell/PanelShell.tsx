import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '@/state/useUIStore';
import { play } from '@/lib/sound';

/**
 * Shared chrome for every slide-in feature panel — featuristic HUD frame with
 * a title bar, optional status line, and a close affordance.
 */
export function PanelShell({
  title,
  subtitle,
  status,
  children,
  width = 'w-80',
}: {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  const closePanel = useUIStore((s) => s.closePanel);
  return (
    <div
      className={`panel-in hud-panel hud-scanline pointer-events-auto flex max-h-full ${width} flex-col overflow-hidden rounded-lg`}
    >
      <header className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate font-mono text-[10px] text-neutral-500">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status}
          <button
            onClick={() => {
              play('click', 0.25);
              closePanel();
            }}
            className="rounded p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
