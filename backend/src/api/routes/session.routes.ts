import { Router } from 'express';
import { SessionController } from '../../modules/sessions/session.controller';
import { authenticate } from '../../middleware/authenticate';

export const sessionRouter = Router();

sessionRouter.use(authenticate);

sessionRouter.get('/', SessionController.listSessions);
sessionRouter.delete('/:sessionId', SessionController.revokeSession);
sessionRouter.post('/revoke-others', SessionController.revokeOtherSessions);
