
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ReferenceFrame } from '@app/engine/math/reference-frames';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { hideEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { Kilometers, Satellite } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class DrawLinesPlugin extends KeepTrackPlugin {
  readonly id = 'DrawLinesPlugin';
  dependencies_ = [];

  private t_(key: string): string {
    return t7e(`plugins.DrawLinesPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  rmbL1ElementName = 'draw-rmb';
  rmbL1Html = this.buildRmbL1Html_();
  rmbL2ElementName = 'draw-rmb-menu';
  rmbL2Html = this.buildRmbL2Html_();

  private buildRmbL1Html_(): string {
    return html`<li class="rmb-menu-item" id="draw-rmb"><a href="#">${this.t_('rmbMenu.title')} &#x27A4;</a></li>`;
  }

  private buildRmbL2Html_(): string {
    const m = (key: string) => this.t_(`rmbMenu.${key}`);

    return html`
    <ul class='dropdown-contents'>
      <li id="line-eci-axis-rmb"><a href="#">${m('eciAxes')}</a></li>
      <li id="line-eci-xgrid-rmb"><a href="#">${m('xAxesGrid')}</a></li>
      <li id="line-eci-ygrid-rmb"><a href="#">${m('yAxesGrid')}</a></li>
      <li id="line-eci-zgrid-rmb"><a href="#">${m('zAxesGrid')}</a></li>
      <li id="line-eci-radial-xgrid-rmb"><a href="#">${m('xAxesRadialGrid')}</a></li>
      <li id="line-eci-radial-ygrid-rmb"><a href="#">${m('yAxesRadialGrid')}</a></li>
      <li id="line-eci-radial-zgrid-rmb"><a href="#">${m('zAxesRadialGrid')}</a></li>
      <li id="line-earth-sat-rmb"><a href="#">${m('earthToSatellite')}</a></li>
      <li id="line-sensor-sat-rmb"><a href="#">${m('sensorToSatellite')}</a></li>
      <li id="line-sat-sat-rmb"><a href="#">${m('satelliteToSatellite')}</a></li>
      <li id="line-sat-sun-rmb"><a href="#">${m('satelliteToSun')}</a></li>
      <li id="line-sat-moon-rmb"><a href="#">${m('satelliteToMoon')}</a></li>
      <li id="line-moon-orbit-rmb"><a href="#">${m('moonOrbit')}</a></li>
    </ul>
    `;
  }
  rmbMenuOrder = 5;
  isRmbOnEarth = true;
  isRmbOffEarth = true;
  isRmbOnSat = true;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    let clickSatObj: Satellite | MissileObject | OemSatellite | null = null;
    const obj = ServiceLocator.getCatalogManager().getObject(clickedSat);

    if ((obj instanceof Satellite) || (obj instanceof OemSatellite) || (obj instanceof MissileObject)) {
      clickSatObj = obj;
    }

    switch (targetId) {
      case 'line-eci-axis-rmb':
        lineManagerInstance.createRef2Ref([0, 0, 0], [25000, 0, 0], LineColors.RED);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 25000, 0], LineColors.GREEN);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 0, 25000], LineColors.BLUE);
        break;
      case 'line-eci-xgrid-rmb':
        lineManagerInstance.createGrid('x', [0.6, 0.2, 0.2, 0.3]);
        break;
      case 'line-eci-ygrid-rmb':
        lineManagerInstance.createGrid('y', [0.2, 0.6, 0.2, 0.3]);
        break;
      case 'line-eci-zgrid-rmb':
        lineManagerInstance.createGrid('z', [0.2, 0.2, 0.6, 0.3]);
        break;
      case 'line-eci-radial-xgrid-rmb':
        lineManagerInstance.createGridRadial({
          axis: 'x',
          color: LineColors.RED,
          opacity: 0.3,
          circleInterval: 50000 as Kilometers,
          referenceFrame: ReferenceFrame.J2000,
        });
        break;
      case 'line-eci-radial-ygrid-rmb':
        lineManagerInstance.createGridRadial({
          axis: 'y',
          color: LineColors.GREEN,
          opacity: 0.3,
          circleInterval: 50000 as Kilometers,
          referenceFrame: ReferenceFrame.J2000,
        });
        break;
      case 'line-eci-radial-zgrid-rmb':
        lineManagerInstance.createGridRadial({
          axis: 'z',
          color: LineColors.BLUE,
          opacity: 0.3,
          circleInterval: 50000 as Kilometers,
          referenceFrame: ReferenceFrame.J2000,
        });
        break;
      case 'line-earth-sat-rmb':
        lineManagerInstance.createSatToRef(clickSatObj, [0, 0, 0], LineColors.PURPLE);
        break;
      case 'line-sensor-sat-rmb':
        lineManagerInstance.createSensorToSat(ServiceLocator.getSensorManager().getSensor(), clickSatObj, LineColors.GREEN);
        break;
      case 'line-sat-sat-rmb':
        {
          const primarySatObj = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

          if (!primarySatObj) {
            errorManagerInstance.warn(this.t_('errorMsgs.noPrimarySat'));

            return;
          }
          lineManagerInstance.createObjToObj(clickSatObj, primarySatObj, LineColors.BLUE);
        }
        break;
      case 'line-sat-sun-rmb':
        lineManagerInstance.createSat2Sun(clickSatObj);
        break;
      case 'line-sat-moon-rmb':
        lineManagerInstance.createSat2CelestialBody(clickSatObj, SolarBody.Moon);
        break;
      case 'line-moon-orbit-rmb':
        ServiceLocator.getScene().moons?.Moon?.drawFullOrbitPathRelativeToEarth();
        break;
      default:
        break;
    }
  };

  addJs() {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.rightBtnMenuOpen, (isEarth, clickedSatId) => {
      if (!isEarth) {
        hideEl('line-eci-axis-rmb');
      }

      if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? '-1') === '-1') {
        hideEl('line-sat-sat-rmb');
      }

      const sensorManager = ServiceLocator.getSensorManager();

      if (!sensorManager.isSensorSelected() || sensorManager.whichRadar === 'CUSTOM') {
        hideEl('line-sensor-sat-rmb');
      }

      if (clickedSatId === -1 || settingsManager.isMobileModeEnabled) {
        hideEl('line-earth-sat-rmb');
        hideEl('line-sensor-sat-rmb');
        hideEl('line-sat-sat-rmb');
        hideEl('line-sat-sun-rmb');
      }
    });
  }
}
