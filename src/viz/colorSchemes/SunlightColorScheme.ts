import { ColorScheme, ColorInformation, SatelliteData, ColorSchemeParams } from './ColorScheme';

/**
 * Color satellites by sunlight status (Sunlit, Penumbra, Umbra)
 */
export class SunlightColorScheme extends ColorScheme {
  readonly id = 'SunlightColorScheme';
  readonly label = 'By Sunlight';

  getColor(sat: SatelliteData, params?: ColorSchemeParams): ColorInformation {
    // Highlight selected satellite
    if (params?.selectedId === sat.id) {
      return {
        color: this.colorTheme.selected,
        pickable: true,
      };
    }

    // Highlight in-view satellites with special color
    if (sat.inView) {
      return {
        color: this.colorTheme.inView,
        pickable: true,
      };
    }

    // Color by sunlight status
    let color = this.colorTheme.umbra;
    
    if (sat.inSunlight === true) {
      color = this.colorTheme.sunlit;
    } else if (sat.inSunlight === false) {
      color = this.colorTheme.umbra;
    } else {
      // Unknown sunlight status - use penumbra color
      color = this.colorTheme.penumbra;
    }

    return {
      color,
      pickable: true,
    };
  }

  onActivate(): void {
    // In a full implementation, this would trigger sunlight calculations
    console.log('Sunlight color scheme activated - sunlight calculations would be triggered');
  }
}

// Made with Bob
