import { Router } from 'express';
import { InquiryController } from '../../modules/inquiries/inquiry.controller';

export const inquiryRouter = Router();

// Public inquiry submission from Contact Us form
inquiryRouter.post('/', InquiryController.submitInquiry);
