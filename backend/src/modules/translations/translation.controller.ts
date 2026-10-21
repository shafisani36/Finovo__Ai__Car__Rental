import { Request, Response, NextFunction } from 'express';
import { TranslationService } from './translation.service';
import { translateSchema, userLanguagePreferenceSchema } from './translation.validation';

export class TranslationController {
  /**
   * POST /api/v1/translations/translate
   */
  static async translate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = translateSchema.parse(req.body);
      const result = await TranslationService.translateText(validated);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/translations/languages
   */
  static async getLanguages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const languages = TranslationService.getSupportedLanguages();
      res.status(200).json({ success: true, languages });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/auth/profile/language
   */
  static async updateLanguagePreference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, error: { message: 'Authentication required' } });
        return;
      }

      const validated = userLanguagePreferenceSchema.parse(req.body);
      const user = await TranslationService.updateUserLanguage(req.user.userId, validated.preferredLanguage);

      res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
}
