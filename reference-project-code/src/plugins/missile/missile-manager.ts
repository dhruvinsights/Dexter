import type { TearrData } from '@app/app/sensors/sensor-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';

/**
 * Stub for the OSS build — full missile tracking is a Pro feature.
 */
class MissileManager {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  getMissileTEARR(_missile: MissileObject): TearrData {
    return {
      rng: null,
      az: null,
      el: null,
      time: '',
      inView: false,
    };
  }
}

export const missileManager = new MissileManager();
