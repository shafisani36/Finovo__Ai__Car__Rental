export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'FLEET_MANAGER',
  'OPERATOR',
  'OPERATIONS_AGENT',
];

/**
 * Checks whether the user holds an administrative or operational role
 */
export function isStaffOrAdmin(roles?: string[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => STAFF_ROLES.includes(r.toUpperCase()));
}

/**
 * Determines the direct dashboard route based on user roles:
 * - Admin/Staff -> /admin/dashboard
 * - Customer -> /customer/dashboard
 * - Unauthenticated -> /login
 */
export function getDirectDashboardRoute(roles?: string[]): string {
  if (!roles || roles.length === 0) return '/login';
  if (isStaffOrAdmin(roles)) {
    return '/admin/dashboard';
  }
  return '/customer/dashboard';
}
