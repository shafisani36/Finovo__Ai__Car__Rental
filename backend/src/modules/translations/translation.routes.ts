import { Router } from 'express';
import { TranslationController } from './translation.controller';
import { apiRateLimiter } from '../../middleware/rate-limiter';

export const translationRouter = Router();

// Translation endpoints (publicly accessible with standard API rate-limiter protection)
translationRouter.post('/translate', apiRateLimiter, TranslationController.translate);
translationRouter.get('/languages', TranslationController.getLanguages);
