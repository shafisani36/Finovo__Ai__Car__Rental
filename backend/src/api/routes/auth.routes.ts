import { Router } from 'express';
import { AuthController } from '../../modules/auth/auth.controller';
import { TranslationController } from '../../modules/translations/translation.controller';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimiter, referralCheckRateLimiter } from '../../middleware/rate-limiter';
import { ReferralService } from '../../modules/loyalty/referral.service';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, AuthController.register);

// Signup form: tells whether an invite code belongs to a real customer (never who it belongs to)
authRouter.get('/referral-codes/:code', referralCheckRateLimiter, async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, valid: await ReferralService.isValidCode(req.params.code) });
  } catch (err) {
    next(err);
  }
});
authRouter.post('/login', authRateLimiter, AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);

authRouter.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
authRouter.post('/verify-code', authRateLimiter, AuthController.verifyResetCode);
authRouter.post('/reset-password', authRateLimiter, AuthController.resetPassword);

authRouter.post('/verify-email', authRateLimiter, AuthController.verifyEmail);
authRouter.post('/resend-verification', authRateLimiter, authenticate, AuthController.resendVerification);

authRouter.get('/me', authenticate, AuthController.getMe);
authRouter.put('/profile/language', authenticate, TranslationController.updateLanguagePreference);
