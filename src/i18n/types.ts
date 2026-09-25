// src/i18n/types.ts
// Strict typing for Geometry Reasoning Stand V2 Internationalization Layer

export type Locale = 'ru' | 'uk' | 'en';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
