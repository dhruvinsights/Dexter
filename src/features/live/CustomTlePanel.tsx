import { useState } from 'react';
import { Trash2, Crosshair } from 'lucide-react';
import * as satellite from 'satellite.js';
import { PanelShell } from '@/features/shell/PanelShell';
import { useCustomSats, type CustomSat } from '@/state/useCustomSats';
import { useSimStore } from '@/state/useSimStore';
import {
  buildTle,
  meanMotionFromAltitudes,
  eccentricityFromAltitudes,
  nowEpoch,
} from '@/lib/orbital';
import { play } from '@/lib/sound';

type Tab = 'basic' | 'advanced' | 'tle';

const MU = 398600.4418;
const RE = 6378.137;

/**
 * Create Satellite. BASIC builds a TLE from altitude +
 * inclination; ADVANCED exposes the full element set with live-calculated
 * apogee/perigee/SMA/velocity; TLE IMPORT pastes a raw two-line set. Every
 * created object is rendered in the 3D scene (CustomSatField) at its real
 * orbit and is immediately clickable + zoomable.
 */
export function CustomTlePanel() {
  const sats = useCustomSats((s) => s.sats);
  const add = useCustomSats((s) => s.add);
  const remove = useCustomSats((s) => s.remove);
  const [tab, setTab] = useState<Tab>('basic');
  const [error, setError] = useState<string | null>(null);

  const commit = (sat: CustomSat) => {
    add(sat);
    play('liftoff', 0.45);
    // Switch to live mode and select the new object so it zooms into view.
    useSimStore.getState().setMode('live');
    useSimStore.getState().select({
      index: -1,
      norad: sat.id,
      label: sat.name,
      line1: sat.line1,
      line2: sat.line2,
    });
  };

  const fromTle = (name: string, l1: string, l2: string): CustomSat | null => {
    try {
      const rec = satellite.twoline2satrec(l1, l2);
      if (rec.error !== 0) return null;
      return {
        id: l2.slice(2, 7).trim() || String(Date.now()),
        name: name || `SAT ${l2.slice(2, 7).trim()}`,
        line1: l1,
        line2: l2,
        inclinationDeg: (rec.inclo * 180) / Math.PI,
        periodMin: (2 * Math.PI) / rec.no,
      };
    } catch {
      return null;
    }
  };

  return (
    <PanelShell title="Create Satellite" subtitle={`${sats.length} custom in orbit`} width="w-96">
      <div className="flex border-b border-[#1f1f1f]">
        {(['basic', 'advanced', 'tle'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError(null);
              play('click', 0.2);
            }}
            className={`flex-1 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              tab === t
                ? 'border-b-2 border-[#00ff88] text-[#00ff88]'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {t === 'tle' ? 'TLE Import' : t}
          </button>
        ))}
      </div>

      <div className="p-4">
        {error && <p className="mb-3 font-mono text-[10px] text-red-400">{error}</p>}
        {tab === 'basic' && <BasicForm onCreate={commit} onError={setError} />}
        {tab === 'advanced' && <AdvancedForm onCreate={commit} onError={setError} />}
        {tab === 'tle' && <TleForm fromTle={fromTle} onCreate={commit} onError={setError} />}

        {/* Created list */}
        {sats.length > 0 && (
          <div className="mt-5 space-y-1.5 border-t border-[#1f1f1f] pt-4">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-neutral-600">In orbit</p>
            {sats.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-black/40 p-2">
                <button
                  onClick={() => {
                    play('beep', 0.3);
                    useSimStore.getState().setMode('live');
                    useSimStore.getState().select({
                      index: -1,
                      norad: s.id,
                      label: s.name,
                      line1: s.line1,
                      line2: s.line2,
                    });
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <Crosshair size={13} className="text-[#22d3ee]" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-white">{s.name}</p>
                    <p className="font-mono text-[9px] text-neutral-600">
                      #{s.id} · incl {s.inclinationDeg.toFixed(1)}° · {s.periodMin.toFixed(0)} min
                    </p>
                  </div>
                </button>
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
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// ── BASIC ──────────────────────────────────────────────────────────────────
function BasicForm({
  onCreate,
  onError,
}: {
  onCreate: (s: CustomSat) => void;
  onError: (e: string | null) => void;
}) {
  const [norad, setNorad] = useState('90000');
  const [name, setName] = useState('New Satellite');
  const [incl, setIncl] = useState('51.6');
  const [apogee, setApogee] = useState('400');
  const [perigee, setPerigee] = useState('400');

  const create = () => {
    onError(null);
    const apo = Number(apogee);
    const per = Number(perigee);
    const inc = Number(incl);
    const id = Number(norad);
    if (id < 90000 || id > 99999) return onError('NORAD ID must be 90000–99999.');
    if (apo < per) return onError('Apogee must be ≥ perigee.');
    const ep = nowEpoch();
    const { line1, line2 } = buildTle({
      noradId: id,
      epochYear: ep.year,
      epochDay: ep.day,
      inclinationDeg: inc,
      raanDeg: 0,
      eccentricity: eccentricityFromAltitudes(apo, per),
      argPerigeeDeg: 0,
      meanAnomalyDeg: 0,
      meanMotionRevPerDay: meanMotionFromAltitudes(apo, per),
    });
    const rec = satellite.twoline2satrec(line1, line2);
    if (rec.error !== 0) return onError('Generated TLE was invalid — adjust parameters.');
    onCreate({
      id: String(id),
      name,
      line1,
      line2,
      inclinationDeg: inc,
      periodMin: (2 * Math.PI) / rec.no,
    });
  };

  return (
    <div className="space-y-3">
      <Field label="Satellite NORAD ID (90000–99999)" value={norad} onChange={setNorad} />
      <Field label="Satellite Name" value={name} onChange={setName} />
      <Field label="Inclination (degrees)" value={incl} onChange={setIncl} type="number" />
      <Field label="Apogee Altitude (km)" value={apogee} onChange={setApogee} type="number" />
      <Field label="Perigee Altitude (km)" value={perigee} onChange={setPerigee} type="number" />
      <CreateButton onClick={create} />
    </div>
  );
}

// ── ADVANCED ───────────────────────────────────────────────────────────────
function AdvancedForm({
  onCreate,
  onError,
}: {
  onCreate: (s: CustomSat) => void;
  onError: (e: string | null) => void;
}) {
  const ep = nowEpoch();
  const [f, setF] = useState({
    norad: '90000',
    name: 'New Satellite',
    epochYear: String(ep.year),
    epochDay: ep.day.toFixed(8),
    incl: '0.0000',
    raan: '0.0000',
    ecc: '0.0000000',
    argp: '0.0000',
    meanAnom: '0.0000',
    meanMotion: '16.00000',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // Calculated parameters.
  const n = Number(f.meanMotion); // rev/day
  const periodMin = n > 0 ? 1440 / n : 0;
  const a = n > 0 ? Math.cbrt(MU / Math.pow((n * 2 * Math.PI) / 86400, 2)) : 0;
  const e = Number(f.ecc);
  const apogee = a * (1 + e) - RE;
  const perigee = a * (1 - e) - RE;
  const velocity = a > 0 ? Math.sqrt(MU / a) : 0;

  const create = () => {
    onError(null);
    const id = Number(f.norad);
    if (id < 90000 || id > 99999) return onError('NORAD ID must be 90000–99999.');
    const { line1, line2 } = buildTle({
      noradId: id,
      epochYear: Number(f.epochYear),
      epochDay: Number(f.epochDay),
      inclinationDeg: Number(f.incl),
      raanDeg: Number(f.raan),
      eccentricity: Number(f.ecc),
      argPerigeeDeg: Number(f.argp),
      meanAnomalyDeg: Number(f.meanAnom),
      meanMotionRevPerDay: n,
    });
    const rec = satellite.twoline2satrec(line1, line2);
    if (rec.error !== 0) return onError('Generated TLE was invalid — adjust parameters.');
    onCreate({ id: String(id), name: f.name, line1, line2, inclinationDeg: Number(f.incl), periodMin });
  };

  return (
    <div className="space-y-3">
      <Field label="Satellite NORAD ID (90000–99999)" value={f.norad} onChange={set('norad')} />
      <Field label="Satellite Name" value={f.name} onChange={set('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Epoch Year" value={f.epochYear} onChange={set('epochYear')} type="number" />
        <Field label="Epoch Day" value={f.epochDay} onChange={set('epochDay')} type="number" />
      </div>
      <Field label="Inclination" value={f.incl} onChange={set('incl')} type="number" />
      <Field label="Right Ascension (RAAN)" value={f.raan} onChange={set('raan')} type="number" />
      <Field label="Eccentricity" value={f.ecc} onChange={set('ecc')} type="number" />
      <Field label="Argument of Perigee" value={f.argp} onChange={set('argp')} type="number" />
      <Field label="Mean Anomaly" value={f.meanAnom} onChange={set('meanAnom')} type="number" />
      <Field label="Mean Motion (rev/day)" value={f.meanMotion} onChange={set('meanMotion')} type="number" />

      <div className="rounded-lg border border-[#1f1f1f] bg-black/40 p-3">
        <p className="mb-2 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Calculated Parameters
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <Calc label="Apogee (km)" value={apogee.toFixed(1)} />
          <Calc label="Perigee (km)" value={perigee.toFixed(1)} />
          <Calc label="Semi-Major Axis (km)" value={a.toFixed(1)} />
          <Calc label="Period (min)" value={periodMin.toFixed(2)} />
          <Calc label="Orbital Velocity (km/s)" value={velocity.toFixed(3)} />
        </div>
      </div>
      <CreateButton onClick={create} />
    </div>
  );
}

// ── TLE IMPORT ─────────────────────────────────────────────────────────────
function TleForm({
  fromTle,
  onCreate,
  onError,
}: {
  fromTle: (name: string, l1: string, l2: string) => CustomSat | null;
  onCreate: (s: CustomSat) => void;
  onError: (e: string | null) => void;
}) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');

  const create = () => {
    onError(null);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let nm = name.trim();
    let l1: string, l2: string;
    if (lines.length >= 3 && !lines[0].startsWith('1 ')) {
      nm = nm || lines[0];
      [l1, l2] = [lines[1], lines[2]];
    } else if (lines.length >= 2) {
      [l1, l2] = [lines[0], lines[1]];
    } else {
      return onError('Paste both TLE lines.');
    }
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) return onError('Lines must start with "1 " and "2 ".');
    const sat = fromTle(nm, l1, l2);
    if (!sat) return onError('satellite.js could not parse this TLE.');
    onCreate(sat);
    setText('');
    setName('');
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">
          Two-Line Element Set
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={'Paste both TLE lines here...'}
          className="w-full resize-none rounded border border-[#1f1f1f] bg-black/50 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-white placeholder-neutral-700 outline-none focus:border-[#00ff88]/50"
        />
      </label>
      <Field label="Satellite Name (optional)" value={name} onChange={setName} />
      <CreateButton onClick={create} />
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-[#1f1f1f] bg-black/50 px-2.5 py-1.5 font-mono text-[12px] text-white outline-none focus:border-[#00ff88]/50"
      />
    </label>
  );
}

function Calc({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-600">{label}</p>
      <p className="font-mono text-[12px] text-[#22d3ee]">{value}</p>
    </div>
  );
}

function CreateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg bg-[#00ff88]/15 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00ff88] transition-colors hover:bg-[#00ff88]/25"
    >
      Create Satellite ▶
    </button>
  );
}
