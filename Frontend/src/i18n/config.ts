import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ur } from './locales/ur';
import { ar } from './locales/ar';

export type LanguageCode = 'en' | 'ur' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: Direction;
  locale: string;
  fontFamily: string;
}

export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    locale: 'en-US',
    fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
  },
  ur: {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    direction: 'rtl',
    locale: 'ur-PK',
    fontFamily: '"Noto Nastaliq Urdu", "Noto Sans Arabic", var(--font-family-sans)',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    locale: 'ar-SA',
    fontFamily: '"Noto Sans Arabic", var(--font-family-sans)',
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const STORAGE_KEY_LANGUAGE = 'finovo_preferred_language';

/**
 * Returns whether a given language code is in the supported allowlist.
 */
export function isSupportedLanguage(lang: unknown): lang is LanguageCode {
  return typeof lang === 'string' && ['en', 'ur', 'ar'].includes(lang.toLowerCase());
}

/**
 * Normalizes input code to a valid canonical LanguageCode, or returns null.
 */
export function normalizeLanguageCode(code: string | null | undefined): LanguageCode | null {
  if (!code) return null;
  const clean = code.trim().toLowerCase();
  if (clean === 'en' || clean.startsWith('en-')) return 'en';
  if (clean === 'ur' || clean.startsWith('ur-')) return 'ur';
  if (clean === 'ar' || clean.startsWith('ar-')) return 'ar';
  return null;
}

/**
 * Resolves initial language following strict order of precedence:
 * 1. Saved authenticated/guest user preference in localStorage
 * 2. Browser navigator preference
 * 3. Default fallback ('en')
 */
export function resolveInitialLanguage(userPreferredLanguage?: string | null): LanguageCode {
  // 1. Authenticated user preference passed in
  if (userPreferredLanguage && isSupportedLanguage(userPreferredLanguage)) {
    return userPreferredLanguage;
  }

  // 2. Explicit guest choice in storage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    const normalizedStored = normalizeLanguageCode(stored);
    if (normalizedStored) return normalizedStored;
  } catch {
    // Storage access might fail in restricted sandboxes
  }

  // 3. Browser language
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = normalizeLanguageCode(navigator.language);
    if (browserLang) return browserLang;
  }

  // 4. Default fallback
  return DEFAULT_LANGUAGE;
}

/**
 * Synchronizes HTML document attributes, body class, and styles for proper LTR/RTL rendering.
 */
export function applyDocumentLanguage(lang: LanguageCode): void {
  if (typeof document === 'undefined') return;

  const config = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  const root = document.documentElement;

  root.lang = config.code;
  root.dir = config.direction;
  root.setAttribute('dir', config.direction);
  root.setAttribute('data-direction', config.direction);
  root.setAttribute('data-locale', config.locale);

  // Toggle class for easy CSS targeting
  if (config.direction === 'rtl') {
    root.classList.add('finovo-rtl');
    root.classList.remove('finovo-ltr');
    document.body.classList.add('finovo-rtl');
    document.body.classList.remove('finovo-ltr');
  } else {
    root.classList.add('finovo-ltr');
    root.classList.remove('finovo-rtl');
    document.body.classList.add('finovo-ltr');
    document.body.classList.remove('finovo-rtl');
  }

  // Notify components or external listeners
  window.dispatchEvent(
    new CustomEvent('finovo:language_changed', {
      detail: { language: config.code, direction: config.direction, locale: config.locale },
    })
  );
}

// Initial resolution
const initialLang = resolveInitialLanguage();

// Initialize i18next singleton
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      ar: { translation: ar },
    },
    lng: initialLang,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false, // React already escapes values safely
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
  });

// Apply document direction immediately
if (typeof document !== 'undefined') {
  applyDocumentLanguage(initialLang);
}

// Listen for language changes through i18next to keep document direction in sync
i18n.on('languageChanged', (lng: string) => {
  const norm = normalizeLanguageCode(lng) || DEFAULT_LANGUAGE;
  applyDocumentLanguage(norm);
  try {
    localStorage.setItem(STORAGE_KEY_LANGUAGE, norm);
  } catch {
    // Ignore storage issues
  }
});

export default i18n;
