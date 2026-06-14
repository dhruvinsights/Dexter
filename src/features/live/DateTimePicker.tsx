import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { useSimStore } from '@/state/useSimStore';
import { play } from '@/lib/sound';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000);
}

/**
 * Date/time picker. Sets the live simulation clock to any
 * instant; SGP4 propagates the real CelesTrak catalogue to that time (forward
 * or backward from each TLE epoch), so you can scrub the whole sky through time.
 */
export function DateTimePicker() {
  const liveTimeMs = useSimStore((s) => s.liveTimeMs);
  const liveSpeed = useSimStore((s) => s.liveSpeed);
  const setLiveTime = useSimStore((s) => s.setLiveTime);
  const setLiveSpeed = useSimStore((s) => s.setLiveSpeed);
  const isPlaying = useSimStore((s) => s.isPlaying);
  const togglePlay = useSimStore((s) => s.togglePlay);

  const current = new Date(liveTimeMs);
  const [view, setView] = useState({ y: current.getUTCFullYear(), m: current.getUTCMonth() });

  const monthName = new Date(Date.UTC(view.y, view.m, 1)).toLocaleString('en', {
    month: 'long',
    timeZone: 'UTC',
  });

  // Build the calendar grid (Mon-first).
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const startWeekday = (first.getUTCDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const setDay = (day: number) => {
    play('click', 0.2);
    const d = new Date(liveTimeMs);
    const next = Date.UTC(view.y, view.m, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
    setLiveTime(next);
  };

  const setTimePart = (part: 'h' | 'm' | 's', value: number) => {
    const d = new Date(liveTimeMs);
    const next = new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        part === 'h' ? value : d.getUTCHours(),
        part === 'm' ? value : d.getUTCMinutes(),
        part === 's' ? value : d.getUTCSeconds(),
      ),
    );
    setLiveTime(next.getTime());
  };

  const shiftMonth = (dir: number) => {
    play('click', 0.2);
    setView((v) => {
      let m = v.m + dir;
      let y = v.y;
      if (m < 0) {
        m = 11;
        y--;
      } else if (m > 11) {
        m = 0;
        y++;
      }
      return { y, m };
    });
  };

  const selectedDay =
    current.getUTCFullYear() === view.y && current.getUTCMonth() === view.m ? current.getUTCDate() : -1;

  return (
    <PanelShell title="Date / Time" subtitle="propagate the catalogue to any instant" width="w-80">
      <div className="p-4">
        {/* Month header */}
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="rounded p-1 text-neutral-400 hover:text-[#00ff88]">
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-xs font-semibold text-white">
            {monthName} {view.y}
          </span>
          <button onClick={() => shiftMonth(1)} className="rounded p-1 text-neutral-400 hover:text-[#00ff88]">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="font-mono text-[9px] uppercase text-neutral-600">
              {w}
            </span>
          ))}
        </div>

        {/* Days with day-of-year */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) =>
            day === null ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                onClick={() => setDay(day)}
                className={`flex flex-col items-center rounded py-1 transition-colors ${
                  day === selectedDay
                    ? 'bg-[#00ff88]/15 text-[#00ff88] ring-1 ring-[#00ff88]/40'
                    : 'text-neutral-300 hover:bg-white/5'
                }`}
              >
                <span className="font-mono text-[11px] leading-none">{String(day).padStart(2, '0')}</span>
                <span className="font-mono text-[8px] leading-none text-neutral-600">
                  {dayOfYear(new Date(Date.UTC(view.y, view.m, day)))}
                </span>
              </button>
            ),
          )}
        </div>

        {/* Time */}
        <div className="mt-4 flex items-center justify-between border-t border-[#1f1f1f] pt-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Time (UTC)</span>
          <span className="font-mono text-lg text-white">
            {String(current.getUTCHours()).padStart(2, '0')}:
            {String(current.getUTCMinutes()).padStart(2, '0')}:
            {String(current.getUTCSeconds()).padStart(2, '0')}
          </span>
        </div>

        <TimeSlider label="Hour" value={current.getUTCHours()} max={23} onChange={(v) => setTimePart('h', v)} />
        <TimeSlider label="Minute" value={current.getUTCMinutes()} max={59} onChange={(v) => setTimePart('m', v)} />
        <TimeSlider label="Second" value={current.getUTCSeconds()} max={59} onChange={(v) => setTimePart('s', v)} />

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Propagation</span>
            <span className="font-mono text-[11px] text-[#00ff88]">{liveSpeed}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={600}
            step={1}
            value={liveSpeed}
            onChange={(e) => setLiveSpeed(Number(e.target.value))}
            className="os-range h-1 w-full cursor-pointer appearance-none rounded bg-[#1f1f1f]"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              play('button', 0.35);
              setLiveTime(Date.now());
              setView({ y: new Date().getUTCFullYear(), m: new Date().getUTCMonth() });
            }}
            className="flex-1 rounded border border-[#1f1f1f] py-1.5 font-mono text-[11px] text-neutral-300 hover:border-[#00ff88]/40 hover:text-[#00ff88]"
          >
            Now
          </button>
          <button
            onClick={() => {
              play('click', 0.25);
              togglePlay();
            }}
            className="flex-1 rounded border border-[#1f1f1f] py-1.5 font-mono text-[11px] text-neutral-300 hover:border-[#00ff88]/40 hover:text-[#00ff88]"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
    </PanelShell>
  );
}

function TimeSlider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <span className="w-14 font-mono text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="os-range h-1 flex-1 cursor-pointer appearance-none rounded bg-[#1f1f1f]"
      />
      <div className="flex gap-1">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-5 w-5 rounded bg-[#1f1f1f] font-mono text-xs text-neutral-300 hover:text-white"
        >
          −
        </button>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-5 w-5 rounded bg-[#1f1f1f] font-mono text-xs text-neutral-300 hover:text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}
