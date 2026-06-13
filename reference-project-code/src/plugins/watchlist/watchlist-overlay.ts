import { DexterPlugin } from '@app/engine/plugins/base-plugin';

/**
 * Stub for the OSS build — the full Watchlist Overlay plugin is a Pro feature.
 */
export class WatchlistOverlay extends DexterPlugin {
  id = 'WatchlistOverlay';
  lastOverlayUpdateTime = 0;
}
