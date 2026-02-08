import { format, type Locale } from 'date-fns';
import { enUS, de } from 'date-fns/locale';
import i18next from 'i18next';
import { APP_CONFIG } from '@/lib/config';

type SupportedLanguage = 'en' | 'de';

const dateFnsLocales: Record<SupportedLanguage, Locale> = {
  en: enUS,
  de: de,
};

const intlLocales: Record<SupportedLanguage, string> = {
  en: 'en-US',
  de: 'de-DE',
};

function normalizeLanguage(value?: string | null): SupportedLanguage | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('en')) return 'en';
  return null;
}

function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeLanguage(window.localStorage.getItem('i18nextLng'));
  } catch {
    return null;
  }
}

function getNavigatorLanguage(): SupportedLanguage | null {
  if (typeof navigator === 'undefined') return null;
  return normalizeLanguage(navigator.language);
}

export function getActiveLanguage(language?: string): SupportedLanguage {
  const fromArgument = normalizeLanguage(language);
  if (fromArgument) return fromArgument;

  const fromI18n =
    normalizeLanguage(i18next.resolvedLanguage) ||
    normalizeLanguage(i18next.language);
  if (fromI18n) return fromI18n;

  const fromStorage = getStoredLanguage();
  if (fromStorage) return fromStorage;

  const fromNavigator = getNavigatorLanguage();
  if (fromNavigator) return fromNavigator;

  return normalizeLanguage(APP_CONFIG.localization.locale) || 'en';
}

export function getLocale(language?: string): Locale {
  return dateFnsLocales[getActiveLanguage(language)];
}

export function getIntlLocale(language?: string): string {
  return intlLocales[getActiveLanguage(language)];
}

export function getWeekStartsOn(language?: string): 0 | 1 {
  return getActiveLanguage(language) === 'de' ? 1 : 0;
}

export function formatDate(
  date: Date | string | number,
  formatStr: string,
  language?: string
) {
  return format(new Date(date), formatStr, { locale: getLocale(language) });
}
