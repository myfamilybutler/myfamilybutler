import { addDays, format, type Locale } from 'date-fns';
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

const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const DOT_DATE_RE = /(?:^|[^\d])(\d{1,2})\.(\d{1,2})\.(?:(\d{2}|\d{4}))?(?=$|[^\d])/g;
const SLASH_DATE_RE = /(?:^|[^\d])(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?=$|[^\d])/g;

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

export function extractDate(text: string, referenceDate = new Date()): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const isoDate = extractIsoDate(trimmed);
  if (isoDate) return isoDate;

  const dotDate = extractDotDate(trimmed, referenceDate);
  if (dotDate) return dotDate;

  const slashDate = extractSlashDate(trimmed);
  if (slashDate) return slashDate;

  return extractRelativeDate(trimmed, referenceDate);
}

function extractIsoDate(text: string): string | null {
  const match = text.match(ISO_DATE_RE);
  if (!match) return null;

  return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function extractDotDate(text: string, referenceDate: Date): string | null {
  for (const match of text.matchAll(DOT_DATE_RE)) {
    const year = normalizeYear(match[3], referenceDate);
    const date = toIsoDate(year, Number(match[2]), Number(match[1]));
    if (date) return date;
  }

  return null;
}

function extractSlashDate(text: string): string | null {
  for (const match of text.matchAll(SLASH_DATE_RE)) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = normalizeYear(match[3], new Date());
    const month = first > 12 && second <= 12 ? second : first;
    const day = first > 12 && second <= 12 ? first : second;
    const date = toIsoDate(year, month, day);
    if (date) return date;
  }

  return null;
}

function extractRelativeDate(text: string, referenceDate: Date): string | null {
  const normalized = text.toLowerCase();

  if (/\b(day after tomorrow|uebermorgen|\u00fcbermorgen)\b/.test(normalized)) {
    return format(addDays(referenceDate, 2), 'yyyy-MM-dd');
  }

  if (/\b(tomorrow|morgen)\b/.test(normalized)) {
    return format(addDays(referenceDate, 1), 'yyyy-MM-dd');
  }

  if (/\b(today|heute)\b/.test(normalized)) {
    return format(referenceDate, 'yyyy-MM-dd');
  }

  return null;
}

function normalizeYear(year: string | undefined, referenceDate: Date): number {
  if (!year) return referenceDate.getFullYear();
  const parsed = Number(year);
  return year.length === 2 ? 2000 + parsed : parsed;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return format(date, 'yyyy-MM-dd');
}
