/**
 * Finovo AI Car Rental — Multilingual & Localization Architecture Test Suite
 * Validates language allowlist, resolution pipeline precedence, RTL/LTR mapping,
 * translation resource parity, and centralized endpoints.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Setup Mock Browser Storage & DOM Environment
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

const classListSet = new Set<string>();
const documentAttributes: Record<string, string> = {};

(globalThis as any).document = {
  documentElement: {
    lang: 'en',
    dir: 'ltr',
    setAttribute: (k: string, v: string) => {
      documentAttributes[k] = v;
    },
    classList: {
      add: (c: string) => classListSet.add(c),
      remove: (c: string) => classListSet.delete(c),
    },
  },
  body: {
    classList: {
      add: (c: string) => classListSet.add(c),
      remove: (c: string) => classListSet.delete(c),
    },
  },
};

(globalThis as any).window = {
  dispatchEvent: () => true,
};

let mockBrowserLanguage = 'en-US';

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      get language() {
        return mockBrowserLanguage;
      },
    },
    configurable: true,
    writable: true,
  });
} catch {
  try {
    Object.defineProperty((globalThis as any).navigator, 'language', {
      get() {
        return mockBrowserLanguage;
      },
      configurable: true,
    });
  } catch {
    // Ignore
  }
}

function setBrowserLanguage(lang: string) {
  mockBrowserLanguage = lang;
}

// Import i18n modules
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  STORAGE_KEY_LANGUAGE,
  isSupportedLanguage,
  normalizeLanguageCode,
  resolveInitialLanguage,
  applyDocumentLanguage,
} from '../src/i18n/config';
import { en } from '../src/i18n/locales/en';
import { ur } from '../src/i18n/locales/ur';
import { ar } from '../src/i18n/locales/ar';
import { fr } from '../src/i18n/locales/fr';
import { es } from '../src/i18n/locales/es';
import { de } from '../src/i18n/locales/de';
import { API_ENDPOINTS } from '../src/api/endpoints';

function collectLeafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj).sort()) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      paths.push(...collectLeafPaths(val as Record<string, unknown>, nextPath));
    } else {
      paths.push(nextPath);
    }
  }
  return paths;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[seg];
    }
    return undefined;
  }, obj);
}

describe('1. Multilingual Configuration & Supported Languages Allowlist', () => {
  test('Should recognize all 6 supported languages (en, ur, ar, fr, es, de) and reject invalid codes', () => {
    assert.equal(isSupportedLanguage('en'), true);
    assert.equal(isSupportedLanguage('ur'), true);
    assert.equal(isSupportedLanguage('ar'), true);
    assert.equal(isSupportedLanguage('fr'), true);
    assert.equal(isSupportedLanguage('es'), true);
    assert.equal(isSupportedLanguage('de'), true);
    assert.equal(isSupportedLanguage('xx'), false);
    assert.equal(isSupportedLanguage('ja'), false);
    assert.equal(isSupportedLanguage(null), false);
    assert.equal(isSupportedLanguage(123), false);
  });

  test('Should normalize regional language tags to canonical codes', () => {
    assert.equal(normalizeLanguageCode('en-US'), 'en');
    assert.equal(normalizeLanguageCode('en-GB'), 'en');
    assert.equal(normalizeLanguageCode('ur-PK'), 'ur');
    assert.equal(normalizeLanguageCode('ar-SA'), 'ar');
    assert.equal(normalizeLanguageCode('ar-AE'), 'ar');
    assert.equal(normalizeLanguageCode('fr-FR'), 'fr');
    assert.equal(normalizeLanguageCode('es-MX'), 'es');
    assert.equal(normalizeLanguageCode('de-DE'), 'de');
    assert.equal(normalizeLanguageCode('ja-JP'), null);
  });

  test('Should have correct RTL/LTR and locale configuration for all 6 languages', () => {
    assert.equal(SUPPORTED_LANGUAGES.en.direction, 'ltr');
    assert.equal(SUPPORTED_LANGUAGES.en.locale, 'en-US');

    assert.equal(SUPPORTED_LANGUAGES.ur.direction, 'rtl');
    assert.equal(SUPPORTED_LANGUAGES.ur.nativeName, 'اردو');

    assert.equal(SUPPORTED_LANGUAGES.ar.direction, 'rtl');
    assert.equal(SUPPORTED_LANGUAGES.ar.nativeName, 'العربية');

    assert.equal(SUPPORTED_LANGUAGES.fr.direction, 'ltr');
    assert.equal(SUPPORTED_LANGUAGES.fr.nativeName, 'Français');

    assert.equal(SUPPORTED_LANGUAGES.es.direction, 'ltr');
    assert.equal(SUPPORTED_LANGUAGES.es.nativeName, 'Español');

    assert.equal(SUPPORTED_LANGUAGES.de.direction, 'ltr');
    assert.equal(SUPPORTED_LANGUAGES.de.nativeName, 'Deutsch');
  });
});

describe('2. Language Resolution Pipeline Precedence', () => {
  beforeEach(() => {
    storageMap.clear();
    setBrowserLanguage('en-US');
  });

  test('Priority 1: Explicit authenticated user preference wins over guest storage', () => {
    storageMap.set(STORAGE_KEY_LANGUAGE, 'en');
    const resolved = resolveInitialLanguage('ur');
    assert.equal(resolved, 'ur');
  });

  test('Priority 2: Guest preference in storage is used when no user preference', () => {
    storageMap.set(STORAGE_KEY_LANGUAGE, 'ar');
    const resolved = resolveInitialLanguage(null);
    assert.equal(resolved, 'ar');
  });

  test('Priority 3: Browser language is used when storage is empty', () => {
    setBrowserLanguage('ur-PK');
    const resolved = resolveInitialLanguage(null);
    assert.equal(resolved, 'ur');
  });

  test('Priority 4: Default fallback is en when no matching preference exists', () => {
    setBrowserLanguage('zh-CN');
    const resolved = resolveInitialLanguage(null);
    assert.equal(resolved, DEFAULT_LANGUAGE);
  });
});

describe('3. Document Direction & RTL Synchronizer', () => {
  beforeEach(() => {
    classListSet.clear();
  });

  test('Should apply dir="ltr" and finovo-ltr class for English', () => {
    applyDocumentLanguage('en');
    assert.equal((globalThis as any).document.documentElement.dir, 'ltr');
    assert.equal((globalThis as any).document.documentElement.lang, 'en');
    assert.equal(classListSet.has('finovo-ltr'), true);
    assert.equal(classListSet.has('finovo-rtl'), false);
  });

  test('Should apply dir="rtl" and finovo-rtl class for Urdu and Arabic', () => {
    applyDocumentLanguage('ur');
    assert.equal((globalThis as any).document.documentElement.dir, 'rtl');
    assert.equal((globalThis as any).document.documentElement.lang, 'ur');
    assert.equal(classListSet.has('finovo-rtl'), true);

    applyDocumentLanguage('ar');
    assert.equal((globalThis as any).document.documentElement.dir, 'rtl');
    assert.equal((globalThis as any).document.documentElement.lang, 'ar');
    assert.equal(classListSet.has('finovo-rtl'), true);
  });
});

describe('4. Translation Resource Integrity & Parity', () => {
  const allLocales = { en, ur, ar, fr, es, de } as const;

  test('All top-level namespaces and nested keys must match English across all 6 languages', () => {
    const enLeafPaths = collectLeafPaths(en as unknown as Record<string, unknown>);

    for (const [code, bundle] of Object.entries(allLocales)) {
      const leafPaths = collectLeafPaths(bundle as unknown as Record<string, unknown>);
      assert.deepEqual(
        leafPaths,
        enLeafPaths,
        `Locale "${code}" keys must match English key-for-key`
      );

      for (const path of enLeafPaths) {
        const val = getByPath(bundle as unknown as Record<string, unknown>, path);
        assert.equal(typeof val, 'string', `${code}.${path} must be a non-empty string`);
        assert.ok((val as string).trim().length > 0, `${code}.${path} must not be empty`);
      }
    }
  });

  test('Critical actions in common namespace must be translated in all 6 languages', () => {
    const actionKeys = Object.keys(en.common.actions);
    for (const [code, bundle] of Object.entries(allLocales)) {
      for (const key of actionKeys) {
        assert.ok(
          (bundle.common.actions as Record<string, string>)[key],
          `${code} missing common.actions.${key}`
        );
      }
    }
  });

  test('Navigation labels must be translated in all 6 languages', () => {
    const navKeys = Object.keys(en.nav);
    for (const [code, bundle] of Object.entries(allLocales)) {
      for (const key of navKeys) {
        assert.ok((bundle.nav as Record<string, string>)[key], `${code} missing nav.${key}`);
      }
    }
  });

  test('Live Translator keys must exist in all 6 languages', () => {
    const translatorKeys = Object.keys(en.translator);
    for (const [code, bundle] of Object.entries(allLocales)) {
      for (const key of translatorKeys) {
        assert.ok(
          (bundle.translator as Record<string, unknown>)[key],
          `${code} missing translator.${key}`
        );
      }
    }
  });
});

describe('5. Centralized Endpoint Registry for Translations', () => {
  test('API_ENDPOINTS.TRANSLATIONS contains required endpoints', () => {
    assert.equal(API_ENDPOINTS.TRANSLATIONS.TRANSLATE, '/translations/translate');
    assert.equal(API_ENDPOINTS.TRANSLATIONS.LANGUAGES, '/translations/languages');
    assert.equal(API_ENDPOINTS.TRANSLATIONS.PREFERENCE, '/auth/profile/language');
  });
});
