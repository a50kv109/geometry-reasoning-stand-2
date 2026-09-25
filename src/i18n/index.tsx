// src/i18n/index.tsx
// Core Internationalization Layer for Geometry Reasoning Stand V2
// Principles:
// 1. "Language may be ambiguous. Engineering Core must not be."
// 2. Pure typed dictionary translation without heavy external dependencies.
// 3. Fallback resilience (never crashes if key is missing).
// 4. Persistence via localStorage with browser language detection on first run.

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Locale, I18nContextValue } from './types';
import { ru } from './ru';
import { uk } from './uk';
import { en } from './en';

export type { Locale, I18nContextValue };

export const translations: Record<Locale, Record<string, string>> = {
  ru,
  uk,
  en,
};

const STORAGE_KEY = 'geometry_stand_locale';

/**
 * Detects initial locale according to requirement:
 * - If saved in localStorage ('ru' | 'uk' | 'en') -> use it
 * - Else if browser language matches ru -> 'ru'
 * - Else if browser language matches uk/uk-UA -> 'uk'
 * - Else if browser language matches en/en-* -> 'en'
 * - Otherwise default to 'ru'
 */
export function detectInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === 'ru' || saved === 'uk' || saved === 'en') {
        return saved;
      }
    } catch {
      // localStorage may fail in restricted iframes
    }

    try {
      const navLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
      if (navLang.startsWith('ru')) return 'ru';
      if (navLang.startsWith('uk') || navLang.startsWith('ua')) return 'uk';
      if (navLang.startsWith('en')) return 'en';
    } catch {
      // ignore
    }
  }
  return 'ru';
}

/**
 * Pure translation function with fallback and parameter interpolation.
 * If key is missing in requested locale, falls back to 'ru', then 'en', then returns key.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  let template =
    translations[locale]?.[key] ??
    translations.ru?.[key] ??
    translations.en?.[key] ??
    key;

  if (params && template) {
    for (const [pKey, pVal] of Object.entries(params)) {
      template = template.replaceAll(`{${pKey}}`, String(pVal));
    }
  }

  return template;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLocale,
}) => {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectInitialLocale());

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, newLocale);
      } catch {
        // ignore
      }
    }
  };

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/**
 * React hook to consume the i18n context
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback for components rendered outside I18nProvider (e.g. lightweight tests)
    return {
      locale: 'ru',
      setLocale: () => {},
      t: (key: string, params?: Record<string, string | number>) =>
        translate('ru', key, params),
    };
  }
  return ctx;
}
