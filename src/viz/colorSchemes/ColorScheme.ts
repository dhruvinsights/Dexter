/**
 * Base Color Scheme System
 * Color scheme architecture for the React Three Fiber renderer.
 */

export type RGBAColor = [number, number, number, number];

export interface ColorInformation {
  color: RGBAColor;
  pickable: boolean;
}

export interface SatelliteData {
  id: number;
  norad: string;
  name: string;
  type: 'PAYLOAD' | 'ROCKET_BODY' | 'DEBRIS' | 'UNKNOWN';
  country?: string;
  launchYear?: number;
  inSunlight?: boolean;
  inView?: boolean;
}

export interface ColorSchemeParams {
  satellites: SatelliteData[];
  selectedId?: number;
}

/**
 * Abstract base class for all color schemes
 */
export abstract class ColorScheme {
  abstract readonly id: string;
  abstract readonly label: string;
  
  // Default color theme
  protected colorTheme: Record<string, RGBAColor> = {
    // Object types
    payload: [0.0, 1.0, 0.0, 0.85],
    rocketBody: [1.0, 0.0, 0.0, 1.0],
    debris: [0.5, 0.5, 0.5, 0.9],
    unknown: [1.0, 1.0, 1.0, 0.85],
    
    // Countries
    countryUS: [0.2, 0.4, 1.0, 1.0],
    countryCIS: [1.0, 0.2, 0.2, 1.0],
    countryPRC: [1.0, 0.8, 0.0, 1.0],
    countryOther: [0.4, 0.8, 0.4, 1.0],
    
    // Sunlight
    sunlit: [1.0, 1.0, 0.3, 1.0],
    penumbra: [0.8, 0.5, 0.2, 0.9],
    umbra: [0.2, 0.2, 0.4, 0.7],
    
    // Special states
    selected: [0.2, 1.0, 0.3, 1.0],
    inView: [0.0, 0.8, 1.0, 0.85],
    deselected: [0.1, 0.1, 0.1, 0.3],
    transparent: [0.0, 0.0, 0.0, 0.0],
  };

  /**
   * Get color for a satellite
   */
  abstract getColor(sat: SatelliteData, params?: ColorSchemeParams): ColorInformation;

  /**
   * Get all colors for satellites (batch operation for performance)
   */
  getColors(satellites: SatelliteData[], params?: ColorSchemeParams): Float32Array {
    const colors = new Float32Array(satellites.length * 3);
    
    for (let i = 0; i < satellites.length; i++) {
      const colorInfo = this.getColor(satellites[i], params);
      colors[i * 3] = colorInfo.color[0];
      colors[i * 3 + 1] = colorInfo.color[1];
      colors[i * 3 + 2] = colorInfo.color[2];
    }
    
    return colors;
  }

  /**
   * Called when this color scheme is activated
   */
  onActivate(): void {
    // Override in subclasses if needed
  }

  /**
   * Called when this color scheme is deactivated
   */
  onDeactivate(): void {
    // Override in subclasses if needed
  }
}

// Made with Bob
