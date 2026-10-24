import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { isStaffOrAdmin, getDirectDashboardRoute } from '../utils/roleRouting';

interface RoleMiddlewareRouteProps {
  children: React.ReactNode;
  allowedSection: 'admin' | 'customer';
}

/**
 * Route middleware executed on every navigation request to verify authentication
 * and enforce role-based access, automatically redirecting users to their appropriate role portal.
 */
export function RoleMiddlewareRoute({ children, allowedSection }: RoleMiddlewareRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#1E052A',
          color: '#FFFFFF',
          fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(250, 184, 38, 0.25)',
            borderTopColor: '#FAB826',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '16px',
          }}
        />
        <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.8)' }}>
          Verifying security privileges...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 1. Unauthenticated check
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role verification
  const isStaff = isStaffOrAdmin(user.roles);

  if (allowedSection === 'admin' && !isStaff) {
    // Customer attempted to access admin portal: redirect directly to Customer Dashboard
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * Middleware component for handling any /dashboard request.
 * Removes the static /dashboard route by directly routing the user according to their role.
 */
export function RoleBasedDashboardRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const destination = getDirectDashboardRoute(user.roles);
  return <Navigate to={destination} replace />;
}
