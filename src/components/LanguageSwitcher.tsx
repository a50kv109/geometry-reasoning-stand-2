// src/components/LanguageSwitcher.tsx
// Universal language switcher (RU | UA | EN) for Geometry Reasoning Stand V2

import React from 'react';
import { useI18n, Locale } from '../i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  showIcon = true,
}) => {
  const { locale, setLocale, t } = useI18n();

  const locales: Array<{ id: Locale; label: string; title: string }> = [
    { id: 'ru', label: 'RU', title: 'Русский' },
    { id: 'uk', label: 'UA', title: 'Українська' },
    { id: 'en', label: 'EN', title: 'English' },
  ];

  return (
    <div
      id="languageSwitcher"
      title={t('header.language')}
      className={`inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/90 ${className}`}
    >
      {showIcon && (
        <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 shrink-0" />
      )}
      <div className="flex items-center gap-0.5">
        {locales.map((loc) => {
          const isActive = locale === loc.id;
          return (
            <button
              key={loc.id}
              id={`lang_btn_${loc.id}`}
              onClick={() => setLocale(loc.id)}
              title={loc.title}
              aria-label={loc.title}
              className={`px-2 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {loc.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
