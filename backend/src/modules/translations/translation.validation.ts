import { z } from 'zod';

export const SUPPORTED_LANGUAGES = ['en', 'ur', 'ar', 'fr', 'es', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const translateSchema = z.object({
  text: z
    .string({ error: (issue) => (issue.input === undefined ? 'Text is required for translation' : 'Text must be a string') })
    .trim()
    .min(1, 'Text cannot be empty')
    .max(5000, 'Text exceeds maximum limit of 5,000 characters'),
  sourceLanguage: z.enum(['en', 'ur', 'ar', 'fr', 'es', 'de', 'auto'], {
    error: 'sourceLanguage must be "en", "ur", "ar", "fr", "es", "de", or "auto"',
  }),
  targetLanguage: z.enum(['en', 'ur', 'ar', 'fr', 'es', 'de'], {
    error: 'targetLanguage must be "en", "ur", "ar", "fr", "es", or "de"',
  }),
});

export type TranslateInput = z.infer<typeof translateSchema>;

export const userLanguagePreferenceSchema = z.object({
  preferredLanguage: z.enum(['en', 'ur', 'ar', 'fr', 'es', 'de'], {
    error: 'preferredLanguage must be "en", "ur", "ar", "fr", "es", or "de"',
  }),
});

export type UserLanguagePreferenceInput = z.infer<typeof userLanguagePreferenceSchema>;
