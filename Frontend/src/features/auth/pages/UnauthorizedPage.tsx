import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context';
import { getDirectDashboardRoute } from '../utils/roleRouting';

export function UnauthorizedPage() {
  const { user } = useAuth();
  const directDashboard = getDirectDashboardRoute(user?.roles);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#230528',
        fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#FDE8E8',
          color: '#E53935',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <ShieldAlert size={36} />
      </div>

      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
          margin: '0 0 12px 0',
        }}
      >
        403 - Access Denied
      </h1>

      <p style={{ maxWidth: '440px', color: '#66566A', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 28px 0' }}>
        You do not have the required administrative permissions to access this resource. Please contact your system administrator if you believe this is an error.
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Link
          to={directDashboard}
          style={{
            backgroundColor: '#FAB826',
            color: '#1C0324',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: '12px',
            textDecoration: 'none',
          }}
        >
          Return to Dashboard
        </Link>
        <Link
          to="/"
          style={{
            backgroundColor: '#FAF8F9',
            border: '1.5px solid #E5DFE7',
            color: '#230528',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: '12px',
            textDecoration: 'none',
          }}
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
