import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../features/auth/context';
import { getDirectDashboardRoute } from '../../features/auth/utils/roleRouting';

export function RootLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleSignIn = () => {
    if (isAuthenticated) {
      navigate(getDirectDashboardRoute(user?.roles));
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      <Header onSignInClick={handleSignIn} />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
