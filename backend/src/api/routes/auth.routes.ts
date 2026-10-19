import { Router } from 'express';
import { AuthController } from '../../modules/auth/auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimiter } from '../../middleware/rate-limiter';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, AuthController.register);
authRouter.post('/login', authRateLimiter, AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);

authRouter.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
authRouter.post('/verify-code', authRateLimiter, AuthController.verifyResetCode);
authRouter.post('/reset-password', authRateLimiter, AuthController.resetPassword);

authRouter.get('/me', authenticate, AuthController.getMe);
