import en from './en';
import zh from './zh';
import ja from './ja';

export type Locale = 'en' | 'zh' | 'ja';

export const translations: Record<Locale, typeof en> = { en, zh, ja };

export type TranslationKey = keyof typeof en;

// Get browser language
export const getDefaultLocale = (): Locale => {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
};

// Load saved locale
export const loadLocale = (): Locale => {
  const saved = localStorage.getItem('pixel-extractor-locale');
  if (saved === 'en' || saved === 'zh' || saved === 'ja') return saved;
  return getDefaultLocale();
};

// Save locale
export const saveLocale = (locale: Locale): void => {
  localStorage.setItem('pixel-extractor-locale', locale);
};

// Translation hook
export const useTranslation = (locale: Locale) => {
  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations.en[key] || key;
  };
  return { t };
};
