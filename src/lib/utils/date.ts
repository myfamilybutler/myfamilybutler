import { format, type Locale } from 'date-fns';
import { enUS, de } from 'date-fns/locale';
import { APP_CONFIG } from '@/lib/config';

const locales: Record<string, Locale> = {
  en: enUS,
  de: de,
};

export function getLocale() {
  const code = APP_CONFIG.localization.locale; 
  const lang = code.split('-')[0]; // 'de-AT' -> 'de'
  return locales[lang] || enUS;
}

export function formatDate(date: Date | string | number, formatStr: string) {
  return format(new Date(date), formatStr, { locale: getLocale() });
}
