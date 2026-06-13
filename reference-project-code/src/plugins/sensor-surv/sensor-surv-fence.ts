import { DexterPlugin } from '@app/engine/plugins/base-plugin';

export class SensorSurvFence extends DexterPlugin {
  readonly id = 'SensorSurvFence';
  dependencies_: string[] = [];

  disableSurvView(): void {
    this.setBottomIconToUnselected();
  }
}
