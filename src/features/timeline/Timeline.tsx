import { useSimStore, TIME_MACHINE_START_YEAR, TIME_MACHINE_END_YEAR } from '@/state/useSimStore';

const SCENARIO_SPEEDS = [1, 2, 5, 10];
const LIVE_SPEEDS = [
  { v: 1, label: '1×' },
  { v: 60, label: '1m/s' },
  { v: 600, label: '10m/s' },
  { v: 3600, label: '1h/s' },
];
const TIME_MACHINE_SPEEDS = [
  { v: 2, label: '2y/s' },
  { v: 6, label: '6y/s' },
  { v: 15, label: '15y/s' },
];

/** Playback control — scenario years, a live real-time clock, or the Time Machine, depending on mode/state. */
export function Timeline() {
  const mode = useSimStore((s) => s.mode);
  const timeMachineActive = useSimStore((s) => s.timeMachineActive);
  if (mode === 'scenario') return <ScenarioTimeline />;
  return timeMachineActive ? <TimeMachineTimeline /> : <LiveTimeline />;
}

function PlayButton() {
  const isPlaying = useSimStore((s) => s.isPlaying);
  const togglePlay = useSimStore((s) => s.togglePlay);
  return (
    <button
      onClick={togglePlay}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] text-white transition-colors hover:bg-white hover:text-black"
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {isPlaying ? <span className="text-sm">❙❙</span> : <span className="ml-0.5 text-sm">▶</span>}
    </button>
  );
}

function ScenarioTimeline() {
  const year = useSimStore((s) => s.year);
  const yearMax = useSimStore((s) => s.yearMax);
  const speed = useSimStore((s) => s.speed);
  const setYear = useSimStore((s) => s.setYear);
  const setSpeed = useSimStore((s) => s.setSpeed);

  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 px-4 py-3 backdrop-blur">
      <PlayButton />
      <div className="flex min-w-[88px] flex-col leading-none">
        <span className="font-mono text-lg text-white">{2024 + Math.round(year)}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          year {Math.round(year)} / {yearMax}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={yearMax}
        step={0.01}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="os-range h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[#2a2a2a]"
      />
      <div className="flex shrink-0 items-center gap-1">
        {SCENARIO_SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`rounded-md px-2 py-1 font-mono text-xs transition-colors ${
              speed === s ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveTimeline() {
  const liveTimeMs = useSimStore((s) => s.liveTimeMs);
  const liveSpeed = useSimStore((s) => s.liveSpeed);
  const setLiveSpeed = useSimStore((s) => s.setLiveSpeed);
  const resetLiveToNow = useSimStore((s) => s.resetLiveToNow);

  const d = new Date(liveTimeMs);
  const date = d.toUTCString().replace('GMT', 'UTC');

  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 px-4 py-3 backdrop-blur">
      <PlayButton />
      <div className="flex min-w-[260px] flex-col leading-none">
        <span className="font-mono text-base text-white">{date}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          real-time propagation
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex shrink-0 items-center gap-1">
        {LIVE_SPEEDS.map((s) => (
          <button
            key={s.v}
            onClick={() => setLiveSpeed(s.v)}
            className={`rounded-md px-2 py-1 font-mono text-xs transition-colors ${
              liveSpeed === s.v ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={resetLiveToNow}
          className="ml-1 rounded-md border border-[#2a2a2a] px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-white hover:text-black"
        >
          Now
        </button>
      </div>
    </div>
  );
}

function TimeMachineTimeline() {
  const year = useSimStore((s) => s.timeMachineYear);
  const speed = useSimStore((s) => s.timeMachineSpeed);
  const playing = useSimStore((s) => s.timeMachinePlaying);
  const setYear = useSimStore((s) => s.setTimeMachineYear);
  const setSpeed = useSimStore((s) => s.setTimeMachineSpeed);
  const toggle = useSimStore((s) => s.toggleTimeMachinePlay);
  const toggleTimeMachine = useSimStore((s) => s.toggleTimeMachine);

  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/85 px-4 py-3 backdrop-blur">
      <button
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] text-white transition-colors hover:bg-white hover:text-black"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <span className="text-sm">❙❙</span> : <span className="ml-0.5 text-sm">▶</span>}
      </button>
      <div className="flex min-w-[110px] flex-col leading-none">
        <span className="font-mono text-lg text-white">{Math.floor(year)}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          time machine
        </span>
      </div>
      <input
        type="range"
        min={TIME_MACHINE_START_YEAR}
        max={TIME_MACHINE_END_YEAR}
        step={0.05}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="os-range h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[#2a2a2a]"
      />
      <div className="flex shrink-0 items-center gap-1">
        {TIME_MACHINE_SPEEDS.map((s) => (
          <button
            key={s.v}
            onClick={() => setSpeed(s.v)}
            className={`rounded-md px-2 py-1 font-mono text-xs transition-colors ${
              speed === s.v ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={toggleTimeMachine}
          className="ml-1 rounded-md border border-[#2a2a2a] px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-white hover:text-black"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
