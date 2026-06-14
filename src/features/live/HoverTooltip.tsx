import { useMemo } from 'react';
import { useSimStore } from '@/state/useSimStore';
import { satcatOwner } from '@/lib/satcat';
import { ownerInfo } from '@/lib/owners';
import { flagFromName } from '@/lib/orbital';

/**
 * Floating readout that follows the cursor while hovering an object in Live Sky
 * mode — flag, name, NORAD id and launch year. The hovered object + cursor
 * position are published by LiveField's pointer-move raycast. Click to select
 * (zoom + full info panel) is handled separately.
 */
export function HoverTooltip() {
  const hovered = useSimStore((s) => s.hovered);
  const selection = useSimStore((s) => s.selection);

  const flag = useMemo(() => {
    if (!hovered) return '';
    const owner = satcatOwner(hovered.norad);
    if (owner) return ownerInfo(owner).flag;
    return flagFromName(hovered.label)?.emoji ?? '';
  }, [hovered]);

  // Don't shadow the selection panel for the object that's already selected.
  if (!hovered || hovered.norad === selection?.norad) return null;

  // Keep the card on-screen: flip to the left/up near the right/bottom edges.
  const flipX = hovered.x > window.innerWidth - 240;
  const flipY = hovered.y > window.innerHeight - 120;

  return (
    <div
      className="pointer-events-none fixed z-[60] select-none"
      style={{
        left: hovered.x,
        top: hovered.y,
        transform: `translate(${flipX ? 'calc(-100% - 16px)' : '16px'}, ${
          flipY ? 'calc(-100% - 16px)' : '16px'
        })`,
      }}
    >
      <div className="rounded-md border border-[#1f1f1f] bg-black/90 px-3 py-2 font-mono shadow-lg backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{flag}</span>
          <span className="text-[12px] font-semibold text-white">{hovered.label}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-400">NORAD: {hovered.norad}</div>
        {hovered.launchYear > 0 && (
          <div className="text-[10px] text-neutral-400">Launched: {hovered.launchYear}</div>
        )}
      </div>
    </div>
  );
}
