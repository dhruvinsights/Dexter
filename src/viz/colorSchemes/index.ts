export { ColorScheme } from './ColorScheme';
export type { ColorInformation, SatelliteData, ColorSchemeParams, RGBAColor } from './ColorScheme';

export { ObjectTypeColorScheme } from './ObjectTypeColorScheme';
export { CountryColorScheme } from './CountryColorScheme';
export { SunlightColorScheme } from './SunlightColorScheme';

// Available color schemes
import { ObjectTypeColorScheme } from './ObjectTypeColorScheme';
import { CountryColorScheme } from './CountryColorScheme';
import { SunlightColorScheme } from './SunlightColorScheme';

export const COLOR_SCHEMES = {
  objectType: new ObjectTypeColorScheme(),
  country: new CountryColorScheme(),
  sunlight: new SunlightColorScheme(),
};

export type ColorSchemeId = keyof typeof COLOR_SCHEMES;

// Made with Bob
