import { ColorScheme, ColorInformation, SatelliteData, ColorSchemeParams } from './ColorScheme';

/**
 * Color satellites by country of origin
 */
export class CountryColorScheme extends ColorScheme {
  readonly id = 'CountryColorScheme';
  readonly label = 'By Country';

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

    // Color by country
    let color = this.colorTheme.countryOther;
    
    if (!sat.country) {
      return { color, pickable: true };
    }

    const country = sat.country.toUpperCase();
    
    // United States
    if (country.includes('US') || country.includes('UNITED STATES')) {
      color = this.colorTheme.countryUS;
    }
    // Russia / CIS
    else if (country.includes('RU') || country.includes('RUSSIA') || 
             country.includes('CIS') || country.includes('SU')) {
      color = this.colorTheme.countryCIS;
    }
    // China
    else if (country.includes('CN') || country.includes('CHINA') || 
             country.includes('PRC')) {
      color = this.colorTheme.countryPRC;
    }
    // Other countries
    else {
      color = this.colorTheme.countryOther;
    }

    return {
      color,
      pickable: true,
    };
  }
}

// Made with Bob
