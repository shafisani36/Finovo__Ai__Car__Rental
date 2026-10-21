import crypto from 'crypto';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import {
  TranslateInput,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from './translation.validation';
import {
  getActiveTranslationProvider,
  detectLanguage,
} from './translation.provider';

export class TranslationService {
  /**
   * Generates a deterministic SHA-256 hash for caching.
   */
  private static generateHash(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Translates text between supported languages with MySQL caching.
   */
  static async translateText(input: TranslateInput) {
    const { text, targetLanguage } = input;
    let { sourceLanguage } = input;

    // Detect language if auto
    if (sourceLanguage === 'auto') {
      sourceLanguage = detectLanguage(text);
    }

    const resolvedSource = sourceLanguage as SupportedLanguage;

    // Short-circuit if source is identical to target
    if (resolvedSource === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage: resolvedSource,
        targetLanguage,
        cached: false,
        provider: 'noop-identical-languages',
      };
    }

    const sourceHash = this.generateHash(text);

    // 1. Check MySQL Cache
    try {
      const cached = await prisma.translationCache.findUnique({
        where: {
          sourceHash_sourceLang_targetLang: {
            sourceHash,
            sourceLang: resolvedSource,
            targetLang: targetLanguage,
          },
        },
      });

      if (cached) {
        return {
          translatedText: cached.translatedText,
          sourceLanguage: resolvedSource,
          targetLanguage,
          cached: true,
          provider: cached.provider,
        };
      }
    } catch (dbErr) {
      // Continue even if cache lookup fails
      console.warn('[TranslationService] Cache lookup error:', dbErr);
    }

    // 2. Invoke Translation Provider
    const provider = getActiveTranslationProvider();
    let result;
    try {
      result = await provider.translate(text, resolvedSource, targetLanguage);
    } catch (providerErr: unknown) {
      const msg = providerErr instanceof Error ? providerErr.message : 'Unknown provider error';
      console.error('[TranslationService] Provider translation failed:', msg);
      throw new AppError(`Translation provider error: ${msg}`, 500, 'TRANSLATION_ERROR');
    }

    // 3. Save into MySQL TranslationCache
    try {
      await prisma.translationCache.upsert({
        where: {
          sourceHash_sourceLang_targetLang: {
            sourceHash,
            sourceLang: resolvedSource,
            targetLang: targetLanguage,
          },
        },
        update: {
          translatedText: result.translatedText,
          provider: result.provider,
        },
        create: {
          sourceHash,
          sourceLang: resolvedSource,
          targetLang: targetLanguage,
          sourceText: text,
          translatedText: result.translatedText,
          provider: result.provider,
        },
      });
    } catch (cacheWriteErr) {
      console.warn('[TranslationService] Cache write error:', cacheWriteErr);
    }

    return {
      translatedText: result.translatedText,
      sourceLanguage: result.detectedSourceLanguage || resolvedSource,
      targetLanguage,
      cached: false,
      provider: result.provider,
    };
  }

  /**
   * Updates language preference for an authenticated user.
   */
  static async updateUserLanguage(userId: string, preferredLanguage: SupportedLanguage) {
    if (!SUPPORTED_LANGUAGES.includes(preferredLanguage)) {
      throw AppError.badRequest(`Unsupported language: ${preferredLanguage}`);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage },
      select: {
        id: true,
        email: true,
        fullName: true,
        preferredLanguage: true,
      },
    });

    return updated;
  }

  /**
   * Returns list of supported language codes and direction metadata.
   */
  static getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', locale: 'en-US' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl', locale: 'ur-PK' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', locale: 'ar-SA' },
    ];
  }
}
