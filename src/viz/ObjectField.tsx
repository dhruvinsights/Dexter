import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimStore } from '@/state/useSimStore';
import {
  buildParticleSystem,
  updateParticleSystem,
  disposeParticleSystem,
} from '@/sim/particleField';

/**
 * The orbital object field — representative satellites/debris on varied orbital planes.
 * Rebuilds when the scenario or density changes; animates orbital motion + timeline
 * activation/colour every frame. Drives timeline playback (advances the store's year).
 */
export function ObjectField() {
  const output = useSimStore((s) => s.output);
  const density = useSimStore((s) => s.density);

  const system = useMemo(() => buildParticleSystem(output, density), [output, density]);

  useEffect(() => () => disposeParticleSystem(system), [system]);

  useFrame((_, delta) => {
    const st = useSimStore.getState();

    // advance playback
    let year = st.year;
    if (st.isPlaying) {
      year += delta * st.speed;
      if (year >= st.yearMax) year = 0; // loop the projection
      st.setYear(year);
    }

    updateParticleSystem(system, year, performance.now() / 1000);
  });

  return <primitive object={system.points} />;
}
