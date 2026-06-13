import { useSimStore } from '@/state/useSimStore';

/** Big centered year readout shown while the Time Machine sweeps through launch history. */
export function TimeMachineOverlay() {
  const active = useSimStore((s) => s.timeMachineActive);
  const year = useSimStore((s) => s.timeMachineYear);
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <span className="font-mono text-[18vh] font-bold leading-none text-white/10">
          {Math.floor(year)}
        </span>
        <span className="-mt-2 font-mono text-xs uppercase tracking-[0.4em] text-neutral-500">
          objects in orbit by launch year
        </span>
      </div>
    </div>
  );
}
