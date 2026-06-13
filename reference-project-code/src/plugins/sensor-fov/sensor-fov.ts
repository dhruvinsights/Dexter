import { DexterPlugin } from '@app/engine/plugins/base-plugin';

export class SensorFov extends DexterPlugin {
  readonly id = 'SensorFov';
  dependencies_: string[] = [];

  disableFovView(): void {
    this.setBottomIconToUnselected();
  }
}
