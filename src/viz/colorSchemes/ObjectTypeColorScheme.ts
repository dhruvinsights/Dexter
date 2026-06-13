import { ColorScheme, ColorInformation, SatelliteData, ColorSchemeParams } from './ColorScheme';

/**
 * Color satellites by object type (Payload, Rocket Body, Debris)
 */
export class ObjectTypeColorScheme extends ColorScheme {
  readonly id = 'ObjectTypeColorScheme';
  readonly label = 'By Object Type';

  getColor(sat: SatelliteData, params?: ColorSchemeParams): ColorInformation {
    // Highlight selected satellite
    if (params?.selectedId === sat.id) {
      return {
        color: this.colorTheme.selected,
        pickable: true,
      };
    }

    // Highlight in-view satellites
    if (sat.inView) {
      return {
        color: this.colorTheme.inView,
        pickable: true,
      };
    }

    // Color by type
    let color = this.colorTheme.unknown;
    
    switch (sat.type) {
      case 'PAYLOAD':
        color = this.colorTheme.payload;
        break;
      case 'ROCKET_BODY':
        color = this.colorTheme.rocketBody;
        break;
      case 'DEBRIS':
        color = this.colorTheme.debris;
        break;
      case 'UNKNOWN':
        color = this.colorTheme.unknown;
        break;
    }

    return {
      color,
      pickable: true,
    };
  }
}

// Made with Bob
