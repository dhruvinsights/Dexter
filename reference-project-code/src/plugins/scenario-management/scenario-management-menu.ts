/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { compressToGzip, decompressFromGzip } from '@app/engine/utils/compression';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import landscape3Png from '@public/img/icons/landscape3.png';
import { saveAs } from 'file-saver';
import { syncFormFields, validateDateInput } from './scenario-form-utils';
import { ScenarioData, ScenarioManagementPlugin } from './scenario-management';

export class ScenarioManagementMenu extends KeepTrackPlugin {
  readonly id = 'ScenarioManagementMenu';
  dependencies_ = [ScenarioManagementPlugin.name];

  menuMode: MenuMode[] = [MenuMode.TOOLS, MenuMode.ALL];

  bottomIconElementName: string = 'scenario-management-icon';
  bottomIconImg = landscape3Png;
  protected formPrefix_ = 'scenario-management-form';
  sideMenuElementName: string = 'scenario-management-menu';

  private corePlugin_!: ScenarioManagementPlugin;

  sideMenuElementHtml: string = html`
  <div id="scenario-management-menu" class="side-menu-parent start-hidden">
    <div id="scenario-management-content" class="side-menu">
      <div class="row">
        <form id="${this.formPrefix_}-form">
          <div id="${this.formPrefix_}-general">
            <div class="row center"></div>
            </br>
            <div class="row center">
              <button id="${this.formPrefix_}-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Scenario &#9658;</button>
            </div>
            <h5 class="center-align">Scenario Settings</h5>
            <!-- Scenario Name -->
            <div class="input-field col s12">
              <input required id="${this.formPrefix_}-name" type="text" kt-tooltip="The name of the scenario.">
              <label class="active" for="${this.formPrefix_}-name">Scenario Name</label>
            </div>
            <!-- Scenario Description -->
            <div class="input-field col s12">
              <input id="${this.formPrefix_}-description" type="text"
              kt-tooltip="The description of the scenario." placeholder="Enter scenario description here...">
              <label class="active" for="${this.formPrefix_}-description">Description</label>
            </div>
            <!-- Scenario Start DateTime -->
            <div class="input-field col s12">
              <input id="${this.formPrefix_}-start-date" type="text"
                kt-tooltip="The start DTG of the scenario in UTC (YYYY-MM-DD HH:MM:SS.sss)." placeholder="YYYY-MM-DD HH:MM:SS.sss"
              >
              <label class="active" for="${this.formPrefix_}-start-date">Scenario Start</label>
            </div>
            <!-- Scenario End DateTime -->
            <div class="input-field col s12">
              <input id="${this.formPrefix_}-end-date" type="text"
                kt-tooltip="The end DTG of the scenario in UTC (YYYY-MM-DD HH:MM:SS.sss)." placeholder="YYYY-MM-DD HH:MM:SS.sss"
              >
              <label class="active" for="${this.formPrefix_}-end-date">Scenario End</label>
            </div>
          </div>
        </form>
        <div class="row center">
          <button id="${this.formPrefix_}-save" class="btn btn-ui waves-effect waves-light">Save Scenario &#9658;</button>
        </div>
        <div class="row center">
          <button id="${this.formPrefix_}-load" class="btn btn-ui waves-effect waves-light">Load Scenario &#9658;</button>
        </div>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();

    this.corePlugin_ = PluginRegistry.getPlugin(ScenarioManagementPlugin)!;

    const nameInput = getEl(`${this.formPrefix_}-name`) as HTMLInputElement;
    const descriptionInput = getEl(`${this.formPrefix_}-description`) as HTMLInputElement;

    if (nameInput) {
      nameInput.value = this.corePlugin_.defaultScenarioName;
    }
    if (descriptionInput) {
      descriptionInput.value = this.corePlugin_.defaultScenarioDescription;
    }

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl(`${this.formPrefix_}-start-date`)?.addEventListener('change', this.onDateChange_.bind(this));
        getEl(`${this.formPrefix_}-end-date`)?.addEventListener('change', this.onDateChange_.bind(this));
        getEl(`${this.formPrefix_}-form`)?.addEventListener('submit', this.onSubmit_.bind(this));
        getEl(`${this.formPrefix_}-save`)?.addEventListener('click', this.onSave_.bind(this));
        getEl(`${this.formPrefix_}-load`)?.addEventListener('click', this.onLoad_.bind(this));
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.scenarioUpdated, () => {
      syncFormFields(this.formPrefix_, this.corePlugin_.scenario);
    });
  }

  protected onSubmit_(e?: Event): void {
    e?.preventDefault();

    const nameInput = getEl(`${this.formPrefix_}-name`) as HTMLInputElement;
    const descriptionInput = getEl(`${this.formPrefix_}-description`) as HTMLInputElement;
    const startDateInput = getEl(`${this.formPrefix_}-start-date`) as HTMLInputElement;
    const endDateInput = getEl(`${this.formPrefix_}-end-date`) as HTMLInputElement;

    const name = nameInput.value;
    const description = descriptionInput.value;
    const startDateStr = startDateInput.value;
    const endDateStr = endDateInput.value;

    if (!name) {
      errorManagerInstance.warn('Scenario Name is required.');

      return;
    }

    if (startDateStr && !validateDateInput(startDateInput)) {
      errorManagerInstance.warn('Start Date is invalid.');

      return;
    }

    if (endDateStr && !validateDateInput(endDateInput)) {
      errorManagerInstance.warn('End Date is invalid.');

      return;
    }

    const newStartTime = startDateStr ? new Date(`${startDateStr}Z`) : null;
    const newEndTime = endDateStr ? new Date(`${endDateStr}Z`) : null;

    const isUpdateSuccess = this.corePlugin_.updateScenario({
      name,
      description,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    // Only show toast if button was clicked
    if (e && isUpdateSuccess) {
      ServiceLocator.getUiManager().toast('Scenario settings updated successfully!', ToastMsgType.normal);
    }
  }

  protected onDateChange_(e: Event): void {
    const input = e.target as HTMLInputElement;

    validateDateInput(input);
  }

  protected async onSave_(evt: Event): Promise<void> {
    evt.preventDefault();
    this.onSubmit_();
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const scenario = this.corePlugin_.scenario;
    const file = {
      version: '3.0' as const,
      scenario: {
        name: scenario.name,
        description: scenario.description,
        ...(scenario.startTime ? { startTime: scenario.startTime.toISOString() } : {}),
        ...(scenario.endTime ? { endTime: scenario.endTime.toISOString() } : {}),
      },
    };

    try {
      const compressed = await compressToGzip(JSON.stringify(file));
      const blob = new Blob([compressed.buffer as ArrayBuffer], { type: 'application/gzip' });

      saveAs(blob, `keeptrack-scenario-${scenario.name}.kts`);
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'scenario-management-menu.ts', 'Error saving scenario!');
      }
    }
  }

  protected onLoad_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.kts,application/gzip';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;

      if (target.files && target.files.length > 0) {
        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
          if (event.target?.result instanceof ArrayBuffer) {
            decompressFromGzip(new Uint8Array(event.target.result)).then((json) => {
              try {
                const parsed = JSON.parse(json);
                const scenario = parsed.scenario;
                const scenarioData: Partial<ScenarioData> = {
                  name: scenario.name,
                  description: scenario.description || '',
                  startTime: scenario.startTime ? new Date(scenario.startTime) : null,
                  endTime: scenario.endTime ? new Date(scenario.endTime) : null,
                };

                if (this.corePlugin_.updateScenario(scenarioData)) {
                  ServiceLocator.getUiManager().toast('Scenario loaded successfully!', ToastMsgType.normal);
                }
              } catch (error) {
                errorManagerInstance.error(error, 'scenario-management-menu.ts', 'Error loading scenario file!');
              }
            }).catch((error: Error) => {
              errorManagerInstance.error(error, 'scenario-management-menu.ts', 'Error decompressing scenario file!');
            });
          }
        };
        reader.readAsArrayBuffer(target.files[0]);
      }
    };

    input.click();
  }
}
