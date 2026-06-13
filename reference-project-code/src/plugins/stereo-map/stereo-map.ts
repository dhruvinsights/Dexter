import { DexterPlugin } from '@app/engine/plugins/base-plugin';

/**
 * Stub for the OSS build — the full Stereo Map plugin is a Pro feature.
 */
export class StereoMap extends DexterPlugin {
  id = 'StereoMap';

  updateMap(): void {
    // Stereo map disabled in OSS build
  }
}
