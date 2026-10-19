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

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasAllPermissions = requiredPermissions.every((perm) =>
      req.user?.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return next(
        AppError.forbidden(`Access requires permissions: [${requiredPermissions.join(', ')}]`)
      );
    }

    next();
  };
}
