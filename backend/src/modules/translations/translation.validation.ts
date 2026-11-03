import { z } from 'zod';

export const SUPPORTED_LANGUAGES = ['en', 'ur', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const translateSchema = z.object({
  text: z
    .string({ required_error: 'Text is required for translation' })
    .trim()
    .min(1, 'Text cannot be empty')
    .max(5000, 'Text exceeds maximum limit of 5,000 characters'),
  sourceLanguage: z.enum(['en', 'ur', 'ar', 'auto'], {
    errorMap: () => ({ message: 'sourceLanguage must be "en", "ur", "ar", or "auto"' }),
  }),
  targetLanguage: z.enum(['en', 'ur', 'ar'], {
    errorMap: () => ({ message: 'targetLanguage must be "en", "ur", or "ar"' }),
  }),
});

export type TranslateInput = z.infer<typeof translateSchema>;

export const userLanguagePreferenceSchema = z.object({
  preferredLanguage: z.enum(['en', 'ur', 'ar'], {
    errorMap: () => ({ message: 'preferredLanguage must be "en", "ur", or "ar"' }),
  }),
});

export type UserLanguagePreferenceInput = z.infer<typeof userLanguagePreferenceSchema>;
