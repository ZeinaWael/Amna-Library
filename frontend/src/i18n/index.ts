import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import ar from './ar.json';
import { getLocale, setLocale, subscribe } from '../lib/userPrefs';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'user:locale',
    },
  });

export function applyDirection(lang: string) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}

i18n.on('languageChanged', (lang) => {
  applyDirection(lang);
  if (lang === 'en' || lang === 'ar') {
    // Mirror into userPrefs so other tabs and the rest of the app see it.
    setLocale(lang);
  }
});
applyDirection(i18n.language || 'en');

// Cross-tab + same-tab sync: when userPrefs.locale changes (storage event from
// another tab, or a setLocale call elsewhere), update i18next.
subscribe(() => {
  const cur = getLocale();
  if (cur !== i18n.language) {
    void i18n.changeLanguage(cur);
  }
});

export default i18n;
