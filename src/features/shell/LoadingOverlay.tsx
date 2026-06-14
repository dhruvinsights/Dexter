import { useEffect, useState } from 'react';
import { useSimStore } from '@/state/useSimStore';

/**
 * Full-screen boot loader shown until the live catalogue is downloaded, parsed
 * and the first SGP4 epoch is propagated — so the user sees a populated sky on
 * first paint instead of an empty globe.
 */
export function LoadingOverlay() {
  const mode = useSimStore((s) => s.mode);
  const ready = useSimStore((s) => s.catalogueReady);
  const msg = useSimStore((s) => s.catalogueLoadMsg);
  const count = useSimStore((s) => s.liveCount);
  const [hidden, setHidden] = useState(false);

  // Fade out shortly after ready, then unmount.
  useEffect(() => {
    if (mode === 'live' && ready) {
      const id = setTimeout(() => setHidden(true), 600);
      return () => clearTimeout(id);
    }
    setHidden(false);
  }, [mode, ready]);

  if (mode !== 'live' || hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        ready ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Brand mark */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#00ff88]/40 bg-[#00ff88]/5">
          <span className="font-mono text-lg font-bold text-[#00ff88]">D</span>
        </div>
        <span className="font-mono text-2xl font-semibold tracking-[0.4em] text-white">DEXTER</span>
      </div>

      {/* Spinner */}
      <div className="relative mb-6 h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#1f1f1f]" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#00ff88]" />
      </div>

      <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">{msg}</p>
      {count > 0 && (
        <p className="mt-2 font-mono text-[10px] text-neutral-600">
          {count.toLocaleString()} space objects · SGP4 propagation
        </p>
      )}
    </div>
  );
}
