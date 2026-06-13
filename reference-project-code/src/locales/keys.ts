import i18next from 'i18next';
import en from './en.json';

export type TranslationKey = string;

const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] => Object.keys(obj).reduce((acc: string[], key) => {
  const value = obj[key];
  const fullKey = prefix ? `${prefix}.${key}` : key;

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    acc.push(...flattenKeys(value as Record<string, unknown>, fullKey));
  } else {
    acc.push(fullKey);
  }

  return acc;
}, []);

export const Keys = flattenKeys(en) as TranslationKey[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const t7e = (key: TranslationKey, options?: Record<string, unknown>): any => i18next.t(key, options);
