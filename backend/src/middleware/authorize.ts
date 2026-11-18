import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app-error';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const hasRole = req.user.roles.some((role) =>
      allowedRoles.includes(role) || req.user?.roles.includes('SUPER_ADMIN')
    );

    if (!hasRole) {
      return next(
        AppError.forbidden(`Access restricted to roles: [${allowedRoles.join(', ')}]`)
      );
    }

    next();
  };
}
