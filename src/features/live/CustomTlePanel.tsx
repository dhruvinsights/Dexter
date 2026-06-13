import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import * as satellite from 'satellite.js';
import { PanelShell } from '@/features/shell/PanelShell';
import { useCustomSats, type CustomSat } from '@/state/useCustomSats';
import { play } from '@/lib/sound';

/**
 * Add Satellite — paste a custom TLE to track it alongside the CelesTrak
 * catalog. The TLE is validated with satellite.js (twoline2satrec) and the
 * orbital summary is derived from the parsed record.
 */
export function CustomTlePanel() {
  const sats = useCustomSats((s) => s.sats);
  const add = useCustomSats((s) => s.add);
  const remove = useCustomSats((s) => s.remove);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    // Accept either 2-line (just TLE) or 3-line (name + TLE) input.
    let l1: string, l2: string, nm = name.trim();
    if (lines.length >= 3 && lines[0].startsWith('1 ') === false) {
      nm = nm || lines[0];
      [l1, l2] = [lines[1], lines[2]];
    } else if (lines.length >= 2) {
      [l1, l2] = [lines[0], lines[1]];
    } else {
      setError('Paste a two-line element set (2 or 3 lines).');
      return;
    }
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) {
      setError('TLE lines must start with "1 " and "2 ".');
      return;
    }
    try {
      const rec = satellite.twoline2satrec(l1, l2);
      if ((rec as { error?: number }).error) {
        setError('satellite.js could not parse this TLE.');
        return;
      }
      const inclinationDeg = (rec.inclo * 180) / Math.PI;
      const periodMin = (2 * Math.PI) / rec.no; // no is radians/min
      const sat: CustomSat = {
        id: l2.slice(2, 7).trim() || String(Date.now()),
        name: nm || `SAT ${l2.slice(2, 7).trim()}`,
        line1: l1,
        line2: l2,
        inclinationDeg,
        periodMin,
      };
      add(sat);
      play('liftoff', 0.4);
      setName('');
      setText('');
    } catch {
      setError('Invalid TLE.');
    }
  };

  return (
    <PanelShell title="Add Satellite" subtitle={`${sats.length} custom tracked`} width="w-96">
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full rounded border border-[#1f1f1f] bg-black/50 px-2.5 py-1.5 font-mono text-[11px] text-white placeholder-neutral-600 outline-none focus:border-[#00ff88]/50"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={'Paste TLE here, e.g.\n1 25544U 98067A   ...\n2 25544  51.6416 ...'}
            className="w-full resize-none rounded border border-[#1f1f1f] bg-black/50 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-white placeholder-neutral-700 outline-none focus:border-[#00ff88]/50"
          />
          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
          <button
            onClick={submit}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#00ff88]/10 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00ff88] transition-colors hover:bg-[#00ff88]/20"
          >
            <Plus size={13} /> Track satellite
          </button>
        </div>

        <div className="space-y-1.5">
          {sats.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[#1f1f1f] bg-black/40 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-white">{s.name}</p>
                <p className="font-mono text-[9px] text-neutral-600">
                  incl {s.inclinationDeg.toFixed(1)}° · period {s.periodMin.toFixed(0)} min
                </p>
              </div>
              <button
                onClick={() => {
                  play('click', 0.25);
                  remove(s.id);
                }}
                className="text-neutral-600 transition-colors hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {sats.length === 0 && (
            <p className="py-4 text-center font-mono text-[10px] text-neutral-600">No custom satellites yet.</p>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
