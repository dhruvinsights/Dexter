/* eslint-disable no-undefined */
/**
 * Plugin Manifest — Single source of truth for all plugin registrations.
 *
 * Array order determines initialization order.
 *
 * Adding a new plugin:
 * 1. Add a PluginDescriptor entry here (import path, class name, default config)
 * 2. Optionally add the config key to KeepTrackPluginsConfiguration for type-safe access
 *
 * Pro imports are guarded by __IS_PRO__ (compile-time constant from DefinePlugin).
 * In OSS builds, __IS_PRO__ is false → the ternary evaluates to undefined →
 * rspack never resolves the plugins-pro path → no stub files needed.
 */
import type { PluginDescriptor } from './plugin-descriptor';
import { satInfoBoxOrbitalConfigurationDefaults } from './sat-info-box-orbital/sat-info-box-orbital-settings';

/**
 * Dynamic import wrapper for Pro-only plugin modules.
 * Using a variable (rather than a string literal) inside import() prevents Vite's
 * dev-server import-analysis from eagerly resolving these paths in OSS builds,
 * where __IS_PRO__ is false and these modules do not exist.
 */
const loadProPlugin = (path: string): Promise<Record<string, unknown>> => import(/* @vite-ignore */ path);

export const pluginManifest: PluginDescriptor[] = [
  // ── Always-enabled infrastructure ──────────────────────────────────────────
  {
    configKey: 'Telemetry',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/telemetry/telemetry') : undefined,
    proClassName: 'Telemetry',
    defaultConfig: { enabled: true },
    alwaysEnabled: true,
  },
  {
    configKey: 'SelectSatManager',
    ossImport: () => import('./select-sat-manager/select-sat-manager'),
    ossClassName: 'SelectSatManager',
    defaultConfig: { enabled: true },
    alwaysEnabled: true,
  },

  // ── Data plugins (must load before catalog) ──────────────────────────────
  {
    configKey: 'StarsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/stars/stars-plugin') : undefined,
    proClassName: 'StarsPlugin',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'VmagDatabasePlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/vmag-database/vmag-database-plugin') : undefined,
    proClassName: 'VmagDatabasePlugin',
    defaultConfig: { enabled: true },
  },

  // ── Core UI ────────────────────────────────────────────────────────────────
  {
    configKey: 'ScenarioManagementMenu',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/scenario-management-pro/scenario-management-pro') : undefined,
    proClassName: 'ScenarioManagementMenuPro',
    defaultConfig: { enabled: true, order: 2 },
  },
  {
    configKey: 'TopMenu',
    ossImport: () => import('./top-menu/top-menu'),
    ossClassName: 'TopMenu',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'UserAccountPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/user-account/user-account') : undefined,
    proClassName: 'UserAccountPlugin',
    defaultConfig: { enabled: true, order: 2 },
  },
  {
    configKey: 'DebugMenuPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/debug/debug') : undefined,
    proClassName: 'DebugMenuPlugin',
    defaultConfig: { enabled: true, order: 0 },
  },

  // ── Satellite Info Box ─────────────────────────────────────────────────────
  {
    configKey: 'SatInfoBoxCore',
    ossImport: () => import('./sat-info-box/sat-info-box'),
    ossClassName: 'SatInfoBox',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxActions',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/sat-info-box-actions/sat-info-box-actions') : undefined,
    proClassName: 'SatInfoBoxActions',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxLinks',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/sat-info-box-links/sat-info-box-links') : undefined,
    proClassName: 'SatInfoBoxLinks',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxOrbital',
    ossImport: () => import('./sat-info-box-orbital/sat-info-box-orbital'),
    ossClassName: 'SatInfoBoxOrbital',
    defaultConfig: satInfoBoxOrbitalConfigurationDefaults,
  },
  {
    configKey: 'SatInfoBoxManeuver',
    ossImport: () => import('./sat-info-box-orbit-guard/sat-info-box-orbit-guard'),
    ossClassName: 'SatInfoBoxOrbitGuard',
    defaultConfig: { enabled: false },
  },
  {
    configKey: 'SatInfoBoxObject',
    ossImport: () => import('./sat-info-box-object/sat-info-box-object'),
    ossClassName: 'SatInfoBoxObject',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxMission',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/sat-info-box-mission/sat-info-box-mission') : undefined,
    proClassName: 'SatInfoBoxMission',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxSponsor',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/sat-info-box-sponsor/sat-info-box-sponsor') : undefined,
    proClassName: 'SatInfoBoxSponsor',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxSensor',
    ossImport: () => import('./sat-info-box-sensor/sat-info-box-sensor'),
    ossClassName: 'SatInfoBoxSensor',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'SatInfoBoxDoppler',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/sat-info-box-doppler/sat-info-box-doppler') : undefined,
    proClassName: 'SatInfoBoxDoppler',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'DateTimeManager',
    ossImport: () => import('./date-time-manager/date-time-manager'),
    ossClassName: 'DateTimeManager',
    defaultConfig: { enabled: true },
  },

  // ── Top Menu Plugins (loaded right to left) ────────────────────────────────

  // ── Scene Plugins ──────────────────────────────────────────────────────────
  {
    configKey: 'EarthAtmosphere',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/earth-atmosphere/earth-atmosphere') : undefined,
    proClassName: 'EarthAtmosphere',
    defaultConfig: { enabled: true },
  },

  // ── Bottom Menu Plugins ────────────────────────────────────────────────────
  {
    configKey: 'SensorInfoPlugin',
    ossImport: () => import('./sensor/sensor-info-plugin'),
    ossClassName: 'SensorInfoPlugin',
    defaultConfig: { enabled: true, order: 11 },
  },
  {
    configKey: 'CustomSensorPlugin',
    ossImport: () => import('./sensor/custom-sensor-plugin'),
    ossClassName: 'CustomSensorPlugin',
    defaultConfig: { enabled: true, order: 12 },
  },
  {
    configKey: 'SensorFov',
    ossImport: () => import('./sensor-fov/sensor-fov'),
    ossClassName: 'SensorFov',
    defaultConfig: { enabled: true, order: 13 },
  },
  {
    configKey: 'SensorSurvFence',
    ossImport: () => import('./sensor-surv/sensor-surv-fence'),
    ossClassName: 'SensorSurvFence',
    defaultConfig: { enabled: true, order: 14 },
  },
  {
    configKey: 'LookAnglesPlugin',
    ossImport: () => import('./sensor/look-angles-plugin'),
    ossClassName: 'LookAnglesPlugin',
    defaultConfig: { enabled: true, order: 20 },
  },
  {
    configKey: 'LinkBudgetPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/link-budget/link-budget') : undefined,
    proClassName: 'LinkBudgetPlugin',
    defaultConfig: { enabled: false, order: 94 },
    isLoginRequired: true,
  },
  {
    configKey: 'MultiSiteLookAnglesPlugin',
    ossImport: () => import('./sensor/multi-site-look-angles-plugin'),
    ossClassName: 'MultiSiteLookAnglesPlugin',
    defaultConfig: { enabled: true, order: 21 },
  },
  {
    configKey: 'WatchlistPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/watchlist/watchlist') : undefined,
    proClassName: 'WatchlistProPlugin',
    defaultConfig: { enabled: true, order: 40 },
    isLoginRequired: true,
  },
  {
    configKey: 'SeismicActivityPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/seismic-activity/seismic-activity') : undefined,
    proClassName: 'SeismicActivityPlugin',
    defaultConfig: { enabled: true, order: 355 },
  },
  {
    configKey: 'AuroraPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/aurora/aurora') : undefined,
    proClassName: 'AuroraPlugin',
    defaultConfig: { enabled: true, order: 356 },
  },
  {
    configKey: 'NaturalEventsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/natural-events/natural-events') : undefined,
    proClassName: 'NaturalEventsPlugin',
    defaultConfig: { enabled: true, order: 357 },
  },
  {
    configKey: 'FindSatPlugin',
    ossImport: () => import('./find-sat/find-sat'),
    ossClassName: 'FindSatPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/find-sat/find-sat') : undefined,
    proClassName: 'FindSatPro',
    defaultConfig: { enabled: true, order: 80 },
    isLoginRequired: true,
  },
  {
    configKey: 'Collisions',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/collisions-pro/collisions-pro') : undefined,
    proClassName: 'CollisionsPro',
    defaultConfig: { enabled: true, order: 90 },
  },
  {
    configKey: 'TocaPocaPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/toca-poca-plugin/toca-poca-plugin') : undefined,
    proClassName: 'TocaPocaPlugin',
    defaultConfig: { enabled: true, order: 82 },
    isLoginRequired: true,
  },
  {
    configKey: 'NeighborhoodWatch',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/neighborhood-watch/neighborhood-watch') : undefined,
    proClassName: 'NeighborhoodWatch',
    defaultConfig: { enabled: true, order: 83 },
    isLoginRequired: true,
  },
  {
    configKey: 'Reentries',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/reentries/reentries-pro') : undefined,
    proClassName: 'ReentriesPro',
    defaultConfig: { enabled: true, order: 92 },
  },
  {
    configKey: 'DebrisScreening',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/debris-screening-pro/debris-screening-pro') : undefined,
    proClassName: 'DebrisScreeningPro',
    defaultConfig: { enabled: true, order: 280 },
  },
  {
    configKey: 'StkFileHandler',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/stk-file-handler/stk-file-handler') : undefined,
    proClassName: 'StkFileHandler',
    defaultConfig: { enabled: true },
    isLoginRequired: true,
  },
  {
    configKey: 'CreateSat',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/create-sat/create-sat') : undefined,
    proClassName: 'CreateSatPro',
    defaultConfig: { enabled: true, order: 70 },
    isLoginRequired: true,
  },
  {
    configKey: 'OemReaderPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/oem-reader/oem-reader') : undefined,
    proClassName: 'OemReaderPlugin',
    defaultConfig: { enabled: true, order: 71.5 },
    isLoginRequired: true,
  },
  {
    configKey: 'ObservationReaderPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/observation-reader/observation-reader') : undefined,
    proClassName: 'ObservationReaderPlugin',
    defaultConfig: { enabled: true, order: 71.7 },
    isLoginRequired: true,
  },
  {
    configKey: 'NeighborhoodHistoryPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/neighborhood-history/neighborhood-history') : undefined,
    proClassName: 'NeighborhoodHistoryPlugin',
    defaultConfig: { enabled: true, order: 71.6 },
  },
  {
    configKey: 'NewLaunch',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/new-launch/new-launch') : undefined,
    proClassName: 'NewLaunchPro',
    defaultConfig: { enabled: true, order: 72 },
    isLoginRequired: true,
  },
  {
    configKey: 'EarthCenteredView',
    ossImport: () => import('./earth-centered-view/earth-centered-view'),
    ossClassName: 'EarthCenteredView',
    defaultConfig: { enabled: true, order: 149 },
  },
  {
    configKey: 'FlatMapView',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/flat-map-view/flat-map-view') : undefined,
    proClassName: 'FlatMapView',
    defaultConfig: { enabled: true, order: 150 },
    isLoginRequired: true,
  },
  {
    configKey: 'Planetarium',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/planetarium/planetarium') : undefined,
    proClassName: 'Planetarium',
    defaultConfig: { enabled: true, order: 153 },
  },
  {
    configKey: 'Astronomy',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/astronomy/astronomy') : undefined,
    proClassName: 'Astronomy',
    defaultConfig: { enabled: true, order: 154 },
  },
  {
    configKey: 'PolarView',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/polar-view/polar-view') : undefined,
    proClassName: 'PolarView',
    defaultConfig: { enabled: true, order: 156 },
    isLoginRequired: true,
  },
  {
    configKey: 'SatelliteFov',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/satellite-fov/satellite-fov') : undefined,
    proClassName: 'SatelliteFovPro',
    defaultConfig: { enabled: true, order: 75 },
    isLoginRequired: true,
  },
  {
    configKey: 'StereoMap',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/stereo-map/stereo-map') : undefined,
    proClassName: 'StereoMapPro',
    defaultConfig: { enabled: true, order: 150 },
  },
  {
    configKey: 'FovFadePlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/fov-fade/fov-fade') : undefined,
    proClassName: 'FovFadePlugin',
    defaultConfig: { enabled: true, order: 316 },
  },
  {
    configKey: 'KeyboardShortcutsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/keyboard-shortcuts/keyboard-shortcuts') : undefined,
    proClassName: 'KeyboardShortcutsPlugin',
    defaultConfig: { enabled: true, order: 314 },
  },
  {
    configKey: 'CovariancePlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/covariance/covariance') : undefined,
    proClassName: 'CovariancePlugin',
    defaultConfig: { enabled: true, order: 316 },
  },
  {
    configKey: 'CovarianceStatsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/covariance/covariance-stats') : undefined,
    proClassName: 'CovarianceStatsPlugin',
    defaultConfig: { enabled: true, order: 317 },
  },
  {
    configKey: 'DopsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/dops/dops') : undefined,
    proClassName: 'DopsPluginPro',
    defaultConfig: { enabled: true, order: 500 },
    isLoginRequired: true,
  },
  {
    configKey: 'CountriesMenu',
    ossImport: () => import('./countries/countries'),
    ossClassName: 'CountriesMenu',
    defaultConfig: { enabled: true, order: 231 },
  },
  {
    configKey: 'ColorMenu',
    ossImport: () => import('./colors-menu/colors-menu'),
    ossClassName: 'ColorMenu',
    defaultConfig: { enabled: true, order: 232 },
  },
  {
    configKey: 'PlanetsMenuPlugin',
    ossImport: () => import('./planets-menu/planets-menu'),
    ossClassName: 'PlanetsMenuPlugin',
    defaultConfig: { enabled: true, order: 233 },
  },
  {
    configKey: 'DeepSpaceMissionsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/deep-space-missions-menu/deep-space-missions-menu') : undefined,
    proClassName: 'DeepSpaceMissionsPlugin',
    defaultConfig: { enabled: true, order: 234 },
  },
  {
    configKey: 'TimeMachine',
    ossImport: () => import('./time-machine/time-machine'),
    ossClassName: 'TimeMachine',
    defaultConfig: { enabled: true, order: 250 },
  },
  {
    configKey: 'CatalogManagementPlugin',
    ossImport: () => import('./catalog-management/catalog-management'),
    ossClassName: 'CatalogManagementPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/catalog-management/catalog-management') : undefined,
    proClassName: 'CatalogManagementPro',
    defaultConfig: { enabled: true, order: 420 },
    isLoginRequired: true,
  },
  {
    configKey: 'HistoricCatalogPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/historic-catalog/historic-catalog') : undefined,
    proClassName: 'HistoricCatalogPlugin',
    defaultConfig: { enabled: true, order: 11 },
  },
  {
    configKey: 'CloseObjectsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/close-objects/close-objects') : undefined,
    proClassName: 'CloseObjectsPro',
    defaultConfig: { enabled: true, order: 421 },
    isLoginRequired: true,
  },
  {
    configKey: 'BestPassPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/best-pass/best-pass') : undefined,
    proClassName: 'BestPassPro',
    defaultConfig: { enabled: true, order: 422 },
    isLoginRequired: true,
  },
  {
    configKey: 'OverflightPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/overflight/overflight') : undefined,
    proClassName: 'OverflightPlugin',
    defaultConfig: { enabled: true, order: 423 },
    isLoginRequired: true,
  },
  {
    configKey: 'OpticalSimulation',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/optical-simulation/optical-simulation') : undefined,
    proClassName: 'OpticalSimulation',
    defaultConfig: { enabled: true, order: 425 },
    isLoginRequired: true,
  },
  {
    configKey: 'EclipseSolarAnalysis',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/eclipse-solar-analysis/eclipse-solar-analysis') : undefined,
    proClassName: 'EclipseSolarAnalysis',
    defaultConfig: { enabled: true, order: 93 },
    isLoginRequired: true,
  },
  {
    configKey: 'ManeuverPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/maneuver/maneuver') : undefined,
    proClassName: 'ManeuverPlugin',
    defaultConfig: { enabled: true, order: 409 },
  },
  {
    configKey: 'InitialOrbitDeterminationPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/initial-orbit/initial-orbit') : undefined,
    proClassName: 'InitialOrbitDeterminationPlugin',
    defaultConfig: { enabled: false, order: 410 },
    isLoginRequired: true,
  },

  // ── Plot Analysis ──────────────────────────────────────────────────────────
  {
    configKey: 'Time2LonPlots',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/plot-analysis/time2lon') : undefined,
    proClassName: 'Time2LonPlotsPro',
    defaultConfig: { enabled: true, order: 263 },
    isLoginRequired: true,
  },
  {
    configKey: 'Inc2AltPlots',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/plot-analysis/inc2alt') : undefined,
    proClassName: 'Inc2AltPlotsPro',
    defaultConfig: { enabled: true, order: 265 },
    isLoginRequired: true,
  },
  {
    configKey: 'Inc2LonPlots',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/plot-analysis/inc2lon') : undefined,
    proClassName: 'Inc2LonPlotsPro',
    defaultConfig: { enabled: true, order: 266 },
    isLoginRequired: true,
  },

  // ── Settings & Utility ─────────────────────────────────────────────────────
  {
    configKey: 'SymbologyPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/symbology/symbology-plugin') : undefined,
    proClassName: 'SymbologyPlugin',
    defaultConfig: { enabled: true, order: 593 },
    isLoginRequired: true,
  },
  {
    configKey: 'ColorSchemeEditorPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/color-scheme-editor/color-scheme-editor') : undefined,
    proClassName: 'ColorSchemeEditorPlugin',
    defaultConfig: { enabled: true, order: 594 },
    isLoginRequired: true,
  },
  {
    configKey: 'SettingsMenuPlugin',
    ossImport: () => import('./settings-menu/settings-menu'),
    ossClassName: 'SettingsMenuPlugin',
    defaultConfig: { enabled: true, order: 590 },
  },
  {
    configKey: 'GraphicsSettingsPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/graphics-menu/graphics-settings') : undefined,
    proClassName: 'GraphicsSettingsPlugin',
    defaultConfig: { enabled: true, order: 590 },
  },
  {
    configKey: 'GraphicsMenuPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/graphics-menu/graphics-menu') : undefined,
    proClassName: 'GraphicsMenuPlugin',
    defaultConfig: { enabled: true, order: 591 },
  },
  {
    configKey: 'AboutMenuPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/about-menu/about-menu') : undefined,
    proClassName: 'AboutMenuPlugin',
    defaultConfig: { enabled: false, order: 601 },
  },
  {
    configKey: 'CommandPalettePlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/command-palette/command-palette') : undefined,
    proClassName: 'CommandPalettePlugin',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'LaunchpadPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/launchpad/launchpad') : undefined,
    proClassName: 'LaunchpadPlugin',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'FavoritesMenuPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/favorites-menu/favorites-menu') : undefined,
    proClassName: 'FavoritesMenuPlugin',
    defaultConfig: { enabled: true },
  },
  {
    configKey: 'CompanionLinkPlugin',
    proImport: __IS_PRO__ ? () => loadProPlugin('@plugins-pro/companion-link/companion-link') : undefined,
    proClassName: 'CompanionLinkPlugin',
    defaultConfig: { enabled: false, order: 520 },
    isLoginRequired: true,
  },
];
