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
import { API_ENDPOINTS } from '../src/api/endpoints';

describe('1. Multilingual Configuration & Supported Languages Allowlist', () => {
  test('Should recognize supported languages (en, ur, ar) and reject invalid codes', () => {
    assert.equal(isSupportedLanguage('en'), true);
    assert.equal(isSupportedLanguage('ur'), true);
    assert.equal(isSupportedLanguage('ar'), true);
    assert.equal(isSupportedLanguage('fr'), false);
    assert.equal(isSupportedLanguage('de'), false);
    assert.equal(isSupportedLanguage(null), false);
    assert.equal(isSupportedLanguage(123), false);
  });

  test('Should normalize regional language tags to canonical codes', () => {
    assert.equal(normalizeLanguageCode('en-US'), 'en');
    assert.equal(normalizeLanguageCode('en-GB'), 'en');
    assert.equal(normalizeLanguageCode('ur-PK'), 'ur');
    assert.equal(normalizeLanguageCode('ar-SA'), 'ar');
    assert.equal(normalizeLanguageCode('ar-AE'), 'ar');
    assert.equal(normalizeLanguageCode('ja-JP'), null);
  });

  test('Should have correct RTL/LTR and locale configuration for each language', () => {
    assert.equal(SUPPORTED_LANGUAGES.en.direction, 'ltr');
    assert.equal(SUPPORTED_LANGUAGES.en.locale, 'en-US');

    assert.equal(SUPPORTED_LANGUAGES.ur.direction, 'rtl');
    assert.equal(SUPPORTED_LANGUAGES.ur.nativeName, 'اردو');

    assert.equal(SUPPORTED_LANGUAGES.ar.direction, 'rtl');
    assert.equal(SUPPORTED_LANGUAGES.ar.nativeName, 'العربية');
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
  test('All top-level namespaces must be identical across en, ur, and ar', () => {
    const enKeys = Object.keys(en).sort();
    const urKeys = Object.keys(ur).sort();
    const arKeys = Object.keys(ar).sort();

    assert.deepEqual(urKeys, enKeys, 'Urdu namespaces must match English');
    assert.deepEqual(arKeys, enKeys, 'Arabic namespaces must match English');
  });

  test('Critical actions in common namespace must be translated in all languages', () => {
    const actionKeys = Object.keys(en.common.actions);
    for (const key of actionKeys) {
      assert.ok(
        (ur.common.actions as any)[key],
        `Urdu missing common.actions.${key}`
      );
      assert.ok(
        (ar.common.actions as any)[key],
        `Arabic missing common.actions.${key}`
      );
    }
  });

  test('Navigation labels must be translated in all languages', () => {
    const navKeys = Object.keys(en.nav);
    for (const key of navKeys) {
      assert.ok((ur.nav as any)[key], `Urdu missing nav.${key}`);
      assert.ok((ar.nav as any)[key], `Arabic missing nav.${key}`);
    }
  });

  test('Live Translator keys must exist in all languages', () => {
    const translatorKeys = Object.keys(en.translator);
    for (const key of translatorKeys) {
      assert.ok((ur.translator as any)[key], `Urdu missing translator.${key}`);
      assert.ok((ar.translator as any)[key], `Arabic missing translator.${key}`);
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
