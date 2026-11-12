import { Router, Request, Response, NextFunction } from 'express';
import { PublicSiteService } from './public-site.service';

/** Unauthenticated, cacheable data for the public website. */
export const publicSiteRouter = Router();

publicSiteRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, stats: await PublicSiteService.getStats() });
  } catch (err) {
    next(err);
  }
});

publicSiteRouter.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, reviews: await PublicSiteService.getReviews(Number(req.query.limit) || 6) });
  } catch (err) {
    next(err);
  }
});

publicSiteRouter.get('/site', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, site: await PublicSiteService.getSiteInfo() });
  } catch (err) {
    next(err);
  }
});
