
import { AtmosphereSettings, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { NightToggle } from '../night-toggle/night-toggle';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class EarthPresetsPlugin extends KeepTrackPlugin {
  readonly id = 'EarthPresetsPlugin';
  dependencies_ = [];

  private t_(key: string): string {
    return t7e(`plugins.EarthPresetsPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  rmbL1ElementName = 'earth-rmb';
  rmbL1Html = this.buildRmbL1Html_();
  rmbL2ElementName = 'earth-rmb-menu';
  rmbL2Html = this.buildRmbL2Html_();

  private buildRmbL1Html_(): string {
    return html`<li class="rmb-menu-item" id="${this.rmbL1ElementName}"><a href="#">${this.t_('rmbMenu.title')} &#x27A4;</a></li>`;
  }

  private buildRmbL2Html_(): string {
    const m = (key: string) => this.t_(`rmbMenu.${key}`);

    return html`
    <ul class='dropdown-contents'>
      <li id="earth-satellite-rmb"><a href="#">${m('satelliteImages')}</a></li>
      <li id="earth-nadir-rmb"><a href="#">${m('alternateSatelliteImages')}</a></li>
      <li id="earth-engineer-rmb"><a href="#">${m('engineeringTool')}</a></li>
      <li id="earth-opscenter-rmb"><a href="#">${m('operationsCenter')}</a></li>
      <li id="earth-90sGraphics-rmb"><a href="#">${m('nineties')}</a></li>
    </ul>
    `;
  }
  rmbMenuOrder = 15;
  isRmbOnEarth = true;
  isRmbOffEarth = false;
  isRmbOnSat = false;

  rmbCallback = (targetId: string): void => {
    switch (targetId) {
      case 'earth-satellite-rmb':
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.BLUE_MARBLE);
        settingsManager.isDrawCloudsMap = true;
        settingsManager.isDrawBumpMap = true;
        settingsManager.isDrawSpecMap = true;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = true;
        PluginRegistry.getPlugin(NightToggle)?.setBottomIconToUnselected();
        PluginRegistry.getPlugin(NightToggle)?.off();
        break;
      case 'earth-nadir-rmb':
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.NADIR);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = true;
        PluginRegistry.getPlugin(NightToggle)?.setBottomIconToUnselected();
        PluginRegistry.getPlugin(NightToggle)?.off();
        break;
      case 'earth-engineer-rmb':
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.BLUE_MARBLE);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        PluginRegistry.getPlugin(NightToggle)?.on();
        break;
      case 'earth-opscenter-rmb':
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.FLAT);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = true;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        PluginRegistry.getPlugin(NightToggle)?.on();
        break;
      case 'earth-90sGraphics-rmb':
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.FLAT);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        PluginRegistry.getPlugin(NightToggle)?.on();
        break;
      default:
        break;
    }
  };
}
