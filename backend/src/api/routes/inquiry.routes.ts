import { Router } from 'express';
import { InquiryController } from '../../modules/inquiries/inquiry.controller';
import { publicFormRateLimiter } from '../../middleware/rate-limiter';

export const inquiryRouter = Router();

// Public inquiry submission from Contact Us form
inquiryRouter.post('/', publicFormRateLimiter, InquiryController.submitInquiry);
