import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import de from '../locales/de.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    load: 'languageOnly',
    lowerCaseLng: true,
    cleanCode: true,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

if (typeof document !== 'undefined') {
  const syncHtmlLanguage = (language: string) => {
    document.documentElement.lang = language.startsWith('de') ? 'de' : 'en';
  };

  syncHtmlLanguage(i18n.resolvedLanguage || i18n.language || 'en');
  i18n.on('languageChanged', syncHtmlLanguage);
}

export default i18n;
