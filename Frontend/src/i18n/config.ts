import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ur } from './locales/ur';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { de } from './locales/de';

export type LanguageCode = 'en' | 'ur' | 'ar' | 'fr' | 'es' | 'de';
export type Direction = 'ltr' | 'rtl';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  shortCode: string;
  direction: Direction;
  locale: string;
  fontFamily: string;
}

export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    shortCode: 'EN',
    direction: 'ltr',
    locale: 'en-US',
    fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    shortCode: 'AR',
    direction: 'rtl',
    locale: 'ar-SA',
    fontFamily: '"Noto Sans Arabic", var(--font-family-sans)',
  },
  ur: {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    shortCode: 'UR',
    direction: 'rtl',
    locale: 'ur-PK',
    fontFamily: '"Noto Nastaliq Urdu", "Noto Sans Arabic", var(--font-family-sans)',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    shortCode: 'FR',
    direction: 'ltr',
    locale: 'fr-FR',
    fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    shortCode: 'ES',
    direction: 'ltr',
    locale: 'es-ES',
    fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    shortCode: 'DE',
    direction: 'ltr',
    locale: 'de-DE',
    fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const STORAGE_KEY_LANGUAGE = 'finovo_preferred_language';

const ALLOWED_CODES: readonly LanguageCode[] = ['en', 'ur', 'ar', 'fr', 'es', 'de'];

/**
 * Returns whether a given language code is in the supported allowlist.
 */
export function isSupportedLanguage(lang: unknown): lang is LanguageCode {
  return typeof lang === 'string' && ALLOWED_CODES.includes(lang.toLowerCase() as LanguageCode);
}

/**
 * Normalizes input code to a valid canonical LanguageCode, or returns null.
 */
export function normalizeLanguageCode(code: string | null | undefined): LanguageCode | null {
  if (!code) return null;
  const clean = code.trim().toLowerCase();
  for (const lang of ALLOWED_CODES) {
    if (clean === lang || clean.startsWith(`${lang}-`) || clean.startsWith(`${lang}_`)) {
      return lang;
    }
  }
  return null;
}

/**
 * Resolves initial language following strict order of precedence:
 * 1. Explicit authenticated user preference
 * 2. Saved guest user preference in localStorage
 * 3. Browser navigator preference
 * 4. Default fallback ('en')
 */
export function resolveInitialLanguage(userPreferredLanguage?: string | null): LanguageCode {
  // 1. Authenticated user preference passed in
  const normalizedUserPref = normalizeLanguageCode(userPreferredLanguage);
  if (normalizedUserPref) {
    return normalizedUserPref;
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
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('finovo:language_changed', {
        detail: { language: config.code, direction: config.direction, locale: config.locale },
      })
    );
  }
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
      fr: { translation: fr },
      es: { translation: es },
      de: { translation: de },
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
