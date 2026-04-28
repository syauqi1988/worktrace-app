import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ms from './locales/ms.json';
import en from './locales/en.json';

export const LANG_STORAGE_KEY = 'worktrace_lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ms: { translation: ms },
      en: { translation: en },
    },
    fallbackLng: 'ms',
    supportedLngs: ['ms', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

export default i18n;

export function getDateLocale() {
  return i18n.language === 'en' ? 'en-MY' : 'ms-MY';
}
