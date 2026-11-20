import { Request, Response, NextFunction } from 'express';
import { BookingApprovalService } from './booking-approval.service';
import { BookingDriverService } from './booking-driver.service';

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

const id = (req: Request, name = 'id') => String(req.params[name]);

export const BookingApprovalController = {
  review: handle((req) => BookingApprovalService.review(id(req))),
  approve: handle((req) => BookingApprovalService.approve(id(req), req.user?.userId)),
  reject: handle((req) => BookingApprovalService.reject(id(req), req.user?.userId, req.body?.reason)),
  requestDocuments: handle((req) => BookingApprovalService.requestDocuments(id(req), req.user?.userId, req.body?.note)),
  verifyDocument: handle(async (req) => ({
    document: await BookingApprovalService.verifyDocument(id(req, 'documentId'), req.user?.userId, req.body?.decision, req.body?.reason),
  })),
  verifyDriver: handle(async (req) => ({
    driver: await BookingApprovalService.verifyDriver(id(req, 'driverId'), req.user?.userId, req.body?.decision, req.body?.reason),
  })),

  listDrivers: handle((req) => BookingDriverService.list(req.user!.userId, id(req))),
  addDriver: handle(async (req) => ({ driver: await BookingDriverService.add(req.user!.userId, id(req), req.body || {}) }), 201),
  removeDriver: handle((req) => BookingDriverService.remove(req.user!.userId, id(req), id(req, 'driverId'))),
};
