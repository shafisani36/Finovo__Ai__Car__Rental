import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { getDirectDashboardRoute } from '../utils/roleRouting';

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    const roleDestination = getDirectDashboardRoute(user?.roles);
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    const target = from && from !== '/dashboard' ? from : roleDestination;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
