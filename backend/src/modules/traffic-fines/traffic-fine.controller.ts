import { Request, Response, NextFunction } from 'express';
import { TrafficFineService } from './traffic-fine.service';

type Handler = (req: Request) => Promise<unknown>;

/** Wraps a service call in the standard { success, ...data } response. */
function handle(fn: Handler, status = 200) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await fn(req);
      res.status(status).json({ success: true, ...(data as object) });
    } catch (err) {
      next(err);
    }
  };
}

export const TrafficFineController = {
  list: handle((req) => TrafficFineService.list({ status: req.query.status, search: req.query.search })),
  preview: handle(async (req) => ({ match: await TrafficFineService.preview(req.query.plate, req.query.at) })),
  create: handle(async (req) => ({ fine: await TrafficFineService.create(req.body || {}, req.user?.userId) }), 201),
  resolveDispute: handle(async (req) => ({
    fine: await TrafficFineService.resolveDispute(String(req.params.id), req.user?.userId, req.body?.decision, req.body?.response),
  })),
  waive: handle(async (req) => ({ fine: await TrafficFineService.waive(String(req.params.id), req.user?.userId, req.body?.reason) })),
  markPaid: handle(async (req) => ({ fine: await TrafficFineService.markPaid(String(req.params.id), req.user?.userId, req.body?.method) })),

  mine: handle((req) => TrafficFineService.listForCustomer(req.user!.userId)),
  dispute: handle(async (req) => ({ fine: await TrafficFineService.dispute(String(req.params.id), req.user!.userId, req.body?.reason) })),
  payIntent: handle((req) => TrafficFineService.createPaymentIntent(String(req.params.id), req.user!.userId)),
  confirmPayment: handle((req) => TrafficFineService.confirmPayment(req.user!.userId, req.body?.paymentIntentId)),
};
