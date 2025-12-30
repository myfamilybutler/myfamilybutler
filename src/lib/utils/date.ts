import { format, type Locale } from 'date-fns';
import { enUS, de } from 'date-fns/locale';
import i18n from '@/lib/config/i18n';

const locales: Record<string, Locale> = {
  en: enUS,
  de: de,
};

export function getLocale() {
  const lang = i18n.language?.split('-')[0] || 'en';
  return locales[lang] || enUS;
}

export function formatDate(date: Date | string | number, formatStr: string) {
  return format(new Date(date), formatStr, { locale: getLocale() });
}
