import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { EventBus } from '@app/engine/events/event-bus';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager } from '@app/engine/utils/persistence-manager';
import { SettingsManager } from '@app/settings/settings';
import searchGearPng from '@public/img/icons/search-gear.png';

export class SearchSettingsPlugin extends KeepTrackPlugin {
  readonly id = 'SearchSettingsPlugin';
  dependencies_ = [];

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'search-settings-bottom-icon',
      label: 'Search Settings',
      image: searchGearPng,
      menuMode: [MenuMode.SETTINGS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'search-settings-menu',
      title: 'Search Settings',
      html: this.buildSideMenuHtml_(),
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div class="row">
        <h5 class="center-align">Search Settings</h5>
        <div class="row">
          <div class="input-field col s12">
            <input value="${settingsManager.searchLimit.toString()}" id="search-settings-maxResults" type="text"
              data-position="top" data-delay="50" data-tooltip="Maximum satellites to display in search" />
            <label for="search-settings-maxResults" class="active">Maximum Results in Search</label>
          </div>
        </div>
        <div class="switch row">
          <label data-position="top" data-delay="50" data-tooltip="Show decayed satellites (position 0,0,0) in search results">
            <input id="search-settings-showDecayed" type="checkbox" ${settingsManager.isShowDecayedInSearch ? 'checked' : ''}/>
            <span class="lever"></span>
            Show Decayed Satellites
          </label>
        </div>
      </div>
    `;
  }

  bottomIconCallback = (): void => {
    this.syncUi_();
  };

  addHtml(): void {
    super.addHtml();
  }

  addJs(): void {
    super.addJs();
    this.loadPersistedSettings_();

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.wireListeners_();
    });
  }

  private wireListeners_() {
    getEl('search-settings-maxResults')?.addEventListener('change', () => {
      this.applyMaxResults_();
    });

    getEl('search-settings-showDecayed')?.addEventListener('change', () => {
      this.applyShowDecayed_();
    });
  }

  private applyMaxResults_() {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const maxResultsEl = <HTMLInputElement>getEl('search-settings-maxResults');
    const maxResults = parseInt(maxResultsEl?.value);

    if (isNaN(maxResults) || maxResults < 1) {
      maxResultsEl.value = settingsManager.searchLimit.toString();
      uiManagerInstance.toast('Invalid max search results value!', ToastMsgType.critical);

      return;
    }

    settingsManager.searchLimit = maxResults;
    this.rerunSearch_();
    this.persistSettings_();
  }

  private applyShowDecayed_() {
    const showDecayedEl = <HTMLInputElement>getEl('search-settings-showDecayed');

    settingsManager.isShowDecayedInSearch = showDecayedEl?.checked ?? true;
    this.rerunSearch_();
    this.persistSettings_();
  }

  private rerunSearch_() {
    const searchDom = getEl('search', true) as HTMLInputElement | null;
    const currentSearch = searchDom?.value ?? '';

    if (currentSearch.length > 0) {
      ServiceLocator.getUiManager().searchManager.doSearch(currentSearch);
    }
  }

  private persistSettings_() {
    PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SEARCH_LIMIT, settingsManager.searchLimit.toString());
    PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH, settingsManager.isShowDecayedInSearch.toString());
    SettingsManager.preserveSettings();
  }

  private loadPersistedSettings_() {
    const searchLimitStr = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_SEARCH_LIMIT);

    if (searchLimitStr !== null) {
      settingsManager.searchLimit = parseInt(searchLimitStr);
    }

    const showDecayedStr = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH);

    if (showDecayedStr !== null) {
      settingsManager.isShowDecayedInSearch = showDecayedStr === 'true';
    }
  }

  private syncUi_() {
    const maxResultsEl = <HTMLInputElement>getEl('search-settings-maxResults');

    if (maxResultsEl) {
      maxResultsEl.value = settingsManager.searchLimit.toString();
    }

    const showDecayedEl = <HTMLInputElement>getEl('search-settings-showDecayed');

    if (showDecayedEl) {
      showDecayedEl.checked = settingsManager.isShowDecayedInSearch;
    }
  }
}
