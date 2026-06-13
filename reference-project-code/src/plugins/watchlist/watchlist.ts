import { DexterPlugin } from '@app/engine/plugins/base-plugin';

/**
 * Stub for the OSS build — the full Watchlist plugin is a Pro feature.
 * Kept so type references in webgl-renderer.ts resolve; PluginRegistry never
 * registers this class in the OSS plugin manifest, so getPlugin() returns null.
 */
export class WatchlistPlugin extends DexterPlugin {
  id = 'WatchlistPlugin';
  watchlistList: { id: number }[] = [];

  hasAnyInView(): boolean {
    return false;
  }
}
