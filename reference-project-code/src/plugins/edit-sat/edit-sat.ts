import { DexterPlugin } from '@app/engine/plugins/base-plugin';

/**
 * Stub for the OSS build — the full Edit Satellite plugin is a Pro feature.
 * Kept so element-id references in ui-validation.ts resolve.
 */
export class EditSat extends DexterPlugin {
  id = 'EditSat';
  static elementPrefix = 'es';
}
