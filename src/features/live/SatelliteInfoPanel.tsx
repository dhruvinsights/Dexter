import { useEffect, useMemo, useRef, useState } from 'react';
import { X, GripVertical, Crosshair } from 'lucide-react';
import * as satellite from 'satellite.js';
import { useSimStore } from '@/state/useSimStore';
import { elementsFromRec, liveStateAt, flagFromName, type LiveState } from '@/lib/orbital';
import { satcatOwner, satcatType } from '@/lib/satcat';
import { ownerInfo } from '@/lib/owners';
import { play } from '@/lib/sound';

/**
 * Rich, draggable satellite readout shown on selection in
 * Live Sky mode. Computes real orbital elements from the TLE and streams live
 * geodetic position, altitude and velocity off the same SGP4 record.
 */
export function SatelliteInfoPanel() {
  const selection = useSimStore((s) => s.selection);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ ox: number; oy: number } | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);

  const rec = useMemo(() => {
    if (!selection?.line1 || !selection?.line2) return null;
    try {
      const r = satellite.twoline2satrec(selection.line1, selection.line2);
      return r.error === 0 ? r : null;
    } catch {
      return null;
    }
  }, [selection?.line1, selection?.line2]);

  const elements = useMemo(() => (rec ? elementsFromRec(rec) : null), [rec]);
  // Real owner from SATCAT when available; fall back to a name heuristic
  // (e.g. for user-created satellites not in the catalogue).
  const flag = useMemo(() => {
    if (!selection) return null;
    const owner = satcatOwner(selection.norad);
    if (owner) {
      const info = ownerInfo(owner);
      return { emoji: info.flag, country: info.name };
    }
    return flagFromName(selection.label);
  }, [selection]);
  const objType = useMemo(() => (selection ? satcatType(selection.norad) : undefined), [selection]);

  // Stream live position once per second from the sim clock.
  useEffect(() => {
    if (!rec) return;
    const update = () => setLive(liveStateAt(rec, useSimStore.getState().liveTimeMs));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [rec]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      setPos({ x: e.clientX - drag.current.ox, y: e.clientY - drag.current.oy });
    };
    const onUp = () => (drag.current = null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!selection) return null;

  return (
    <div
      className="hud-panel hud-scanline pointer-events-auto absolute left-24 top-20 z-50 w-80 select-none overflow-hidden rounded-lg"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* Drag handle / title */}
      <header
        onMouseDown={(e) => (drag.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y })}
        className="flex cursor-grab items-center gap-2 border-b border-[#1f1f1f] bg-white/[0.02] px-3 py-2.5 active:cursor-grabbing"
      >
        <GripVertical size={13} className="text-neutral-600" />
        <span className="text-base leading-none">{flag?.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-mono text-xs font-semibold text-white">{selection.label}</h3>
          <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">
            NORAD {selection.norad} · {flag?.country}
          </p>
        </div>
        <button
          onClick={() => {
            play('click', 0.25);
            useSimStore.getState().select(null);
          }}
          className="rounded p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={13} />
        </button>
      </header>

      <div className="max-h-[60vh] overflow-y-auto">
        {/* Live telemetry */}
        <Section title="Live position">
          <Row label="Latitude" value={live ? `${live.latDeg.toFixed(3)}°` : '—'} live />
          <Row label="Longitude" value={live ? `${live.lonDeg.toFixed(3)}°` : '—'} live />
          <Row label="Altitude" value={live ? `${live.altKm.toFixed(1)} km` : '—'} live />
          <Row label="Velocity" value={live ? `${live.velocityKmS.toFixed(2)} km/s` : '—'} live />
        </Section>

        {/* Orbital elements */}
        {elements && (
          <Section title="Orbital data">
            <Row label="Apogee" value={`${elements.apogeeKm.toFixed(0)} km`} />
            <Row label="Perigee" value={`${elements.perigeeKm.toFixed(0)} km`} />
            <Row label="Inclination" value={`${elements.inclinationDeg.toFixed(2)}°`} />
            <Row label="Eccentricity" value={elements.eccentricity.toFixed(4)} />
            <Row label="RAAN" value={`${elements.raanDeg.toFixed(2)}°`} />
            <Row label="Arg. perigee" value={`${elements.argPerigeeDeg.toFixed(2)}°`} />
            <Row label="Period" value={`${elements.periodMin.toFixed(2)} min`} />
            <Row label="Semi-major" value={`${elements.semiMajorKm.toFixed(0)} km`} />
          </Section>
        )}

        <Section title="Object">
          <Row
            label="Type"
            value={objType === 'DEB' ? 'Debris' : objType === 'R/B' ? 'Rocket body' : objType === 'PAY' ? 'Payload' : 'Object'}
          />
          <Row label="Propagator" value="SGP4" />
          <Row label="Source" value="CelesTrak" />
          {!elements && <Row label="Note" value="No TLE for this object" />}
        </Section>

        <div className="flex items-center gap-1.5 border-t border-[#1f1f1f] px-3 py-2 font-mono text-[9px] text-neutral-600">
          <Crosshair size={10} />
          Drag the header to reposition · click empty space to deselect
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#141414] px-3 py-2.5">
      <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <span className={`font-mono text-[11px] ${live ? 'text-[#00ff88]' : 'text-neutral-200'}`}>{value}</span>
    </div>
  );
}
