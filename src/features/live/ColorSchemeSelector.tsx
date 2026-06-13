import { Palette } from 'lucide-react';
import { useSimStore } from '@/state/useSimStore';
import { COLOR_SCHEMES, type ColorSchemeId } from '@/viz/colorSchemes';

/**
 * Color scheme selector for Live Sky mode
 * Allows switching between different visualization color schemes
 */
export function ColorSchemeSelector() {
  const colorScheme = useSimStore((s) => s.colorScheme);
  const setColorScheme = useSimStore((s) => s.setColorScheme);

  const schemes: { id: ColorSchemeId; label: string }[] = [
    { id: 'objectType', label: 'Object Type' },
    { id: 'country', label: 'Country' },
    { id: 'sunlight', label: 'Sunlight' },
  ];

  return (
    <div className="pointer-events-auto flex w-64 flex-col gap-3 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-neutral-500" />
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
          Color Scheme
        </h3>
      </div>

      <div className="space-y-1">
        {schemes.map((scheme) => (
          <button
            key={scheme.id}
            onClick={() => {
              setColorScheme(scheme.id);
              COLOR_SCHEMES[scheme.id].onActivate();
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              colorScheme === scheme.id
                ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                : 'text-neutral-400 hover:bg-[#1f1f1f] hover:text-white'
            }`}
          >
            {scheme.label}
          </button>
        ))}
      </div>

      <div className="border-t border-[#1f1f1f] pt-3">
        <p className="text-[10px] leading-relaxed text-neutral-600">
          {colorScheme === 'objectType' && 'Satellites colored by type: Payload (green), Rocket Body (red), Debris (gray)'}
          {colorScheme === 'country' && 'Satellites colored by country of origin: US (blue), Russia (red), China (yellow), Other (green)'}
          {colorScheme === 'sunlight' && 'Satellites colored by sunlight status: Sunlit (yellow), Penumbra (orange), Umbra (dark blue)'}
        </p>
      </div>
    </div>
  );
}

// Made with Bob
