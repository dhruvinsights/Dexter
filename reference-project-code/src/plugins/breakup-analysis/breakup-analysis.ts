import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { Satellite, SpaceObjectType } from '@ootk/src/main';
import scatterPlotPng from '@public/img/icons/scatter-plot.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './breakup-analysis.css';

export interface BreakupEvent {
  id: string;
  name: string;
  parentName: string;
  parentNoradId: number;
  intlDesPrefix: string;
  breakupDate: string;
  launchDate: string;
  country: string;
  orbitType: string;
  altitudeKm: number;
  cause: string;
  estimatedDebrisCount: number;
  description: string;
}

const BREAKUP_EVENTS: BreakupEvent[] = [
  {
    id: 'fengyun1c',
    name: 'Fengyun-1C ASAT Test',
    parentName: 'Fengyun-1C',
    parentNoradId: 25730,
    intlDesPrefix: '1999-025',
    breakupDate: '2007-01-11',
    launchDate: '1999-05-10',
    country: 'China',
    orbitType: 'LEO Sun-Synchronous',
    altitudeKm: 865,
    cause: 'Intentional ASAT Test',
    estimatedDebrisCount: 3433,
    description: 'Chinese anti-satellite missile test that destroyed the Fengyun-1C weather satellite, creating the largest tracked debris cloud in history.',
  },
  {
    id: 'cosmos2251',
    name: 'Cosmos 2251 / Iridium 33 Collision',
    parentName: 'Cosmos 2251',
    parentNoradId: 22675,
    intlDesPrefix: '1993-036',
    breakupDate: '2009-02-10',
    launchDate: '1993-06-16',
    country: 'Russia',
    orbitType: 'LEO',
    altitudeKm: 790,
    cause: 'Accidental Collision',
    estimatedDebrisCount: 1668,
    description: 'First accidental hypervelocity collision between two intact satellites. Cosmos 2251 collided with the operational Iridium 33 communications satellite.',
  },
  {
    id: 'iridium33',
    name: 'Iridium 33 (from Collision)',
    parentName: 'Iridium 33',
    parentNoradId: 24946,
    intlDesPrefix: '1997-051',
    breakupDate: '2009-02-10',
    launchDate: '1997-09-14',
    country: 'USA',
    orbitType: 'LEO',
    altitudeKm: 790,
    cause: 'Accidental Collision',
    estimatedDebrisCount: 628,
    description: 'Debris field from the operational Iridium 33 satellite after collision with defunct Cosmos 2251.',
  },
  {
    id: 'cosmos1408',
    name: 'Cosmos 1408 ASAT Test',
    parentName: 'Cosmos 1408',
    parentNoradId: 13552,
    intlDesPrefix: '1982-092',
    breakupDate: '2021-11-15',
    launchDate: '1982-09-16',
    country: 'Russia',
    orbitType: 'LEO',
    altitudeKm: 480,
    cause: 'Intentional ASAT Test',
    estimatedDebrisCount: 1500,
    description: 'Russian direct-ascent ASAT test that destroyed the defunct Cosmos 1408 ELINT satellite, generating debris that threatened the ISS crew.',
  },
  {
    id: 'breezem',
    name: 'Briz-M Upper Stage Explosion',
    parentName: 'Briz-M (14S44 #3)',
    parentNoradId: 28945,
    intlDesPrefix: '2006-006',
    breakupDate: '2007-02-19',
    launchDate: '2006-02-28',
    country: 'Russia',
    orbitType: 'GTO',
    altitudeKm: 500,
    cause: 'Accidental Explosion',
    estimatedDebrisCount: 1078,
    description: 'Briz-M upper stage exploded after failed Arabsat-4A mission, likely due to residual propellant. Created debris across a wide range of altitudes.',
  },
  {
    id: 'usa193',
    name: 'USA-193 Shootdown',
    parentName: 'USA-193',
    parentNoradId: 29651,
    intlDesPrefix: '2006-057',
    breakupDate: '2008-02-21',
    launchDate: '2006-12-14',
    country: 'USA',
    orbitType: 'LEO',
    altitudeKm: 247,
    cause: 'Intentional Shootdown',
    estimatedDebrisCount: 174,
    description: 'US Navy SM-3 missile destroyed the malfunctioning NRO satellite USA-193 (NROL-21). Low-altitude breakup meant most debris reentered within weeks.',
  },
];

export class BreakupAnalysis extends KeepTrackPlugin {
  readonly id = 'BreakupAnalysis';
  dependencies_ = [];

  private selectedEventId_: string | null = null;
  private debrisResults_: Satellite[] = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'breakup-analysis-bottom-icon',
      label: t7e('plugins.BreakupAnalysis.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: scatterPlotPng,
      menuMode: [MenuMode.ANALYSIS, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    if (!this.selectedEventId_) {
      this.showEventList_();
    }
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'breakup-analysis-menu',
      title: t7e('plugins.BreakupAnalysis.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 400,
      maxWidth: 800,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.BreakupAnalysis.title' as Parameters<typeof t7e>[0]),
      body: t7e('plugins.BreakupAnalysis.helpBody' as Parameters<typeof t7e>[0]),
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  private uiManagerFinal_(): void {
    getEl('breakup-analysis-event-list', true)?.addEventListener('click', (evt: MouseEvent) => {
      const row = (evt.target as HTMLElement).closest('[data-event-id]') as HTMLElement | null;

      if (!row) {
        return;
      }

      const eventId = row.dataset.eventId;

      if (eventId) {
        showLoading(() => this.selectEvent_(eventId));
      }
    });

    getEl('breakup-analysis-back-btn', true)?.addEventListener('click', () => {
      this.showEventList_();
    });
  }

  // =========================================================================
  // Side Menu HTML
  // =========================================================================

  private buildSideMenuHtml_(): string {
    return html`
      <div id="breakup-analysis-menu" class="side-menu-parent start-hidden">
        <div id="breakup-analysis-content" class="side-menu">
          <div id="breakup-analysis-event-list">
            ${this.buildEventListHtml_()}
          </div>
          <div id="breakup-analysis-detail" style="display:none;">
            <button id="breakup-analysis-back-btn" class="btn btn-ui waves-effect waves-light" style="margin-bottom:10px;">
              &larr; Back to Events
            </button>
            <div id="breakup-analysis-event-info"></div>
            <div id="breakup-analysis-stats"></div>
            <div id="breakup-analysis-dispersion"></div>
          </div>
        </div>
      </div>
    `;
  }

  private buildEventListHtml_(): string {
    let rows = '';

    for (const evt of BREAKUP_EVENTS) {
      rows += html`
        <tr class="breakup-analysis-event-row link" data-event-id="${evt.id}">
          <td>${evt.name}</td>
          <td>${evt.breakupDate}</td>
          <td>${evt.cause}</td>
          <td>${evt.altitudeKm.toString()}</td>
          <td>${evt.estimatedDebrisCount.toLocaleString()}</td>
        </tr>
      `;
    }

    return html`
      <table id="breakup-analysis-event-table" class="center-align">
        <thead>
          <tr>
            <th>Event</th>
            <th>Date</th>
            <th>Cause</th>
            <th>Alt (km)</th>
            <th>Est. Debris</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // =========================================================================
  // Event selection and analysis
  // =========================================================================

  private selectEvent_(eventId: string): void {
    const event = BREAKUP_EVENTS.find((e) => e.id === eventId);

    if (!event) {
      return;
    }

    this.selectedEventId_ = eventId;
    this.debrisResults_ = this.findDebrisForEvent_(event);

    this.renderEventDetail_(event);
    this.filterDebrisOnGlobe_();

    const listEl = getEl('breakup-analysis-event-list', true);
    const detailEl = getEl('breakup-analysis-detail', true);

    if (listEl) {
      listEl.style.display = 'none';
    }
    if (detailEl) {
      detailEl.style.display = 'block';
    }
  }

  private showEventList_(): void {
    this.selectedEventId_ = null;
    this.debrisResults_ = [];

    const listEl = getEl('breakup-analysis-event-list', true);
    const detailEl = getEl('breakup-analysis-detail', true);

    if (listEl) {
      listEl.style.display = 'block';
    }
    if (detailEl) {
      detailEl.style.display = 'none';
    }

    ServiceLocator.getUiManager().doSearch('');
  }

  private findDebrisForEvent_(event: BreakupEvent): Satellite[] {
    const catalogManager = ServiceLocator.getCatalogManager();
    const results: Satellite[] = [];
    const numSats = catalogManager.numSatellites;

    for (let i = 0; i < numSats; i++) {
      const obj = catalogManager.objectCache[i];

      if (!obj || !obj.isSatellite()) {
        continue;
      }

      const sat = obj as Satellite;

      if (!sat.intlDes || !sat.active) {
        continue;
      }

      if (sat.intlDes.startsWith(event.intlDesPrefix)) {
        results.push(sat);
      }
    }

    return results;
  }

  private filterDebrisOnGlobe_(): void {
    if (this.debrisResults_.length === 0) {
      return;
    }

    if (this.debrisResults_.length > settingsManager.searchLimit) {
      settingsManager.searchLimit = this.debrisResults_.length;
    }

    const sccNums = this.debrisResults_.map((s) => s.sccNum).join(',');

    ServiceLocator.getUiManager().doSearch(sccNums);
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  private renderEventDetail_(event: BreakupEvent): void {
    this.renderEventInfo_(event);
    this.renderStats_(event);
    this.renderDispersion_();
  }

  private renderEventInfo_(event: BreakupEvent): void {
    const infoEl = getEl('breakup-analysis-event-info', true);

    if (!infoEl) {
      return;
    }

    const yearsToBreakup = BreakupAnalysis.calcYearsBetween_(event.launchDate, event.breakupDate);

    infoEl.innerHTML = html`
      <div class="breakup-info-card">
        <h5 class="center-align">${event.name}</h5>
        <p class="breakup-description">${event.description}</p>
        <div class="breakup-info-grid">
          <div class="breakup-info-item">
            <span class="breakup-info-label">Parent Object</span>
            <span class="breakup-info-value">${event.parentName} (${event.parentNoradId.toString()})</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Country</span>
            <span class="breakup-info-value">${event.country}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Orbit Type</span>
            <span class="breakup-info-value">${event.orbitType}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Breakup Altitude</span>
            <span class="breakup-info-value">${event.altitudeKm.toString()} km</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Cause</span>
            <span class="breakup-info-value">${event.cause}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Launch Date</span>
            <span class="breakup-info-value">${event.launchDate}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Breakup Date</span>
            <span class="breakup-info-value">${event.breakupDate}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Time to Breakup</span>
            <span class="breakup-info-value">${yearsToBreakup} years</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderStats_(event: BreakupEvent): void {
    const statsEl = getEl('breakup-analysis-stats', true);

    if (!statsEl) {
      return;
    }

    const tracked = this.debrisResults_.length;
    const estimated = event.estimatedDebrisCount;
    const trackingRatio = estimated > 0 ? ((tracked / estimated) * 100).toFixed(1) : '0';

    const debrisCount = this.countByType_();
    const altStats = this.calcAltitudeStats_();
    const eccStats = this.calcEccentricityStats_();
    const incStats = this.calcInclinationStats_();

    statsEl.innerHTML = html`
      <div class="breakup-stats-card">
        <h6 class="center-align">Debris Statistics</h6>
        <div class="breakup-info-grid">
          <div class="breakup-info-item">
            <span class="breakup-info-label">Tracked Debris</span>
            <span class="breakup-info-value">${tracked.toLocaleString()}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Estimated Total</span>
            <span class="breakup-info-value">${estimated.toLocaleString()}</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Tracking Ratio</span>
            <span class="breakup-info-value">${trackingRatio}%</span>
          </div>
          <div class="breakup-info-item">
            <span class="breakup-info-label">Payloads / R. Bodies / Debris</span>
            <span class="breakup-info-value">${debrisCount.payloads.toString()} / ${debrisCount.rocketBodies.toString()} / ${debrisCount.debris.toString()}</span>
          </div>
        </div>
        ${tracked > 0 ? html`
        <h6 class="center-align" style="margin-top:12px;">Fragment Dispersion Analysis</h6>
        <table class="breakup-dispersion-table center-align">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Min</th>
              <th>Max</th>
              <th>Mean</th>
              <th>Spread</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Perigee (km)</td>
              <td>${altStats.minPerigee.toFixed(0)}</td>
              <td>${altStats.maxPerigee.toFixed(0)}</td>
              <td>${altStats.meanPerigee.toFixed(0)}</td>
              <td>${(altStats.maxPerigee - altStats.minPerigee).toFixed(0)}</td>
            </tr>
            <tr>
              <td>Apogee (km)</td>
              <td>${altStats.minApogee.toFixed(0)}</td>
              <td>${altStats.maxApogee.toFixed(0)}</td>
              <td>${altStats.meanApogee.toFixed(0)}</td>
              <td>${(altStats.maxApogee - altStats.minApogee).toFixed(0)}</td>
            </tr>
            <tr>
              <td>Eccentricity</td>
              <td>${eccStats.min.toFixed(4)}</td>
              <td>${eccStats.max.toFixed(4)}</td>
              <td>${eccStats.mean.toFixed(4)}</td>
              <td>${(eccStats.max - eccStats.min).toFixed(4)}</td>
            </tr>
            <tr>
              <td>Inclination (&deg;)</td>
              <td>${incStats.min.toFixed(2)}</td>
              <td>${incStats.max.toFixed(2)}</td>
              <td>${incStats.mean.toFixed(2)}</td>
              <td>${(incStats.max - incStats.min).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        ` : html`
        <p class="center-align" style="margin-top:12px;color:var(--color-dark-text-accent);">
          No tracked debris found in current catalog for this event.
        </p>
        `}
      </div>
    `;
  }

  private renderDispersion_(): void {
    const dispEl = getEl('breakup-analysis-dispersion', true);

    if (!dispEl) {
      return;
    }

    if (this.debrisResults_.length === 0) {
      dispEl.innerHTML = '';

      return;
    }

    let rows = '';
    const maxRows = 100;
    const displayResults = this.debrisResults_.slice(0, maxRows);

    for (const sat of displayResults) {
      rows += html`
        <tr class="breakup-analysis-debris-row link" data-scc="${sat.sccNum}">
          <td>${sat.sccNum}</td>
          <td>${sat.name}</td>
          <td>${sat.getTypeString()}</td>
          <td>${sat.perigee.toFixed(0)}</td>
          <td>${sat.apogee.toFixed(0)}</td>
          <td>${sat.inclination.toFixed(2)}</td>
          <td>${sat.eccentricity.toFixed(4)}</td>
        </tr>
      `;
    }

    dispEl.innerHTML = html`
      <div class="breakup-debris-card">
        <h6 class="center-align">
          Tracked Fragments${this.debrisResults_.length > maxRows ? ` (showing ${maxRows} of ${this.debrisResults_.length})` : ''}
        </h6>
        <div class="breakup-debris-table-wrapper">
          <table class="breakup-debris-table center-align">
            <thead>
              <tr>
                <th>NORAD</th>
                <th>Name</th>
                <th>Type</th>
                <th>Perigee</th>
                <th>Apogee</th>
                <th>Inc (&deg;)</th>
                <th>Ecc</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    dispEl.addEventListener('click', (evt: MouseEvent) => {
      const row = (evt.target as HTMLElement).closest('[data-scc]') as HTMLElement | null;

      if (!row) {
        return;
      }

      const scc = row.dataset.scc;

      if (scc) {
        const catalogManager = ServiceLocator.getCatalogManager();
        const satId = catalogManager.sccNum2Id(scc);

        if (satId !== null) {
          PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
        }
      }
    });
  }

  // =========================================================================
  // Statistical helpers
  // =========================================================================

  private countByType_(): { payloads: number; rocketBodies: number; debris: number } {
    let payloads = 0;
    let rocketBodies = 0;
    let debris = 0;

    for (const sat of this.debrisResults_) {
      if (sat.type === SpaceObjectType.PAYLOAD) {
        payloads++;
      } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
        rocketBodies++;
      } else {
        debris++;
      }
    }

    return { payloads, rocketBodies, debris };
  }

  private calcAltitudeStats_(): {
    minPerigee: number; maxPerigee: number; meanPerigee: number;
    minApogee: number; maxApogee: number; meanApogee: number;
  } {
    if (this.debrisResults_.length === 0) {
      return { minPerigee: 0, maxPerigee: 0, meanPerigee: 0, minApogee: 0, maxApogee: 0, meanApogee: 0 };
    }

    let minPerigee = Infinity;
    let maxPerigee = -Infinity;
    let sumPerigee = 0;
    let minApogee = Infinity;
    let maxApogee = -Infinity;
    let sumApogee = 0;

    for (const sat of this.debrisResults_) {
      const perigee = sat.perigee;
      const apogee = sat.apogee;

      if (perigee < minPerigee) {
        minPerigee = perigee;
      }
      if (perigee > maxPerigee) {
        maxPerigee = perigee;
      }
      sumPerigee += perigee;

      if (apogee < minApogee) {
        minApogee = apogee;
      }
      if (apogee > maxApogee) {
        maxApogee = apogee;
      }
      sumApogee += apogee;
    }

    const count = this.debrisResults_.length;

    return {
      minPerigee, maxPerigee, meanPerigee: sumPerigee / count,
      minApogee, maxApogee, meanApogee: sumApogee / count,
    };
  }

  private calcEccentricityStats_(): { min: number; max: number; mean: number } {
    return BreakupAnalysis.calcFieldStats_(this.debrisResults_, (s) => s.eccentricity);
  }

  private calcInclinationStats_(): { min: number; max: number; mean: number } {
    return BreakupAnalysis.calcFieldStats_(this.debrisResults_, (s) => s.inclination);
  }

  private static calcFieldStats_(sats: Satellite[], getter: (s: Satellite) => number): { min: number; max: number; mean: number } {
    if (sats.length === 0) {
      return { min: 0, max: 0, mean: 0 };
    }

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (const sat of sats) {
      const val = getter(sat);

      if (val < min) {
        min = val;
      }
      if (val > max) {
        max = val;
      }
      sum += val;
    }

    return { min, max, mean: sum / sats.length };
  }

  private static calcYearsBetween_(date1: string, date2: string): string {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    return years.toFixed(1);
  }
}
