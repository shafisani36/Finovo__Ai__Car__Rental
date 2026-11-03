import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { getDirectDashboardRoute, isStaffOrAdmin } from '../utils/roleRouting';

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    const isStaff = isStaffOrAdmin(user?.roles);
    const roleDestination = getDirectDashboardRoute(user?.roles);
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;

    let target = roleDestination;
    if (from && from !== '/dashboard') {
      if (isStaff && !from.startsWith('/customer')) {
        target = from;
      } else if (!isStaff && !from.startsWith('/admin')) {
        target = from;
      }
    }

    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
