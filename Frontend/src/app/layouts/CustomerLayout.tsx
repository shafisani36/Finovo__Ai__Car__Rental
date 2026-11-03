import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/context';
import { BrandLogo } from '../../components/common/BrandLogo';
import { customerPortalApi } from '../../features/customers/api/customerPortalApi';
import {
  LayoutDashboard,
  Car,
  CalendarCheck,
  CreditCard,
  FileCheck,
  Bell,
  MessageSquare,
  Sparkles,
  Gift,
  History,
  UserCog,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import './CustomerLayout.css';

export function CustomerLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let isMounted = true;
    customerPortalApi
      .getOverview()
      .then((data) => {
        if (isMounted && data.stats) {
          setUnreadNotifications(data.stats.unreadNotificationsCount || 0);
        }
      })
      .catch(() => {});

    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customer/cars', label: 'Browse Fleet', icon: Car },
    { to: '/customer/bookings', label: 'My Bookings', icon: CalendarCheck },
    { to: '/customer/payments', label: 'Payments & Invoices', icon: CreditCard },
    { to: '/customer/documents', label: 'Driver Documents', icon: FileCheck },
    {
      to: '/customer/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { to: '/customer/support', label: 'Support & Tickets', icon: MessageSquare },
    { to: '/customer/assistant', label: 'AI Rental Concierge', icon: Sparkles, highlight: true },
    { to: '/customer/rewards', label: 'Rewards & Referrals', icon: Gift },
    { to: '/customer/history', label: 'Rental History', icon: History },
    { to: '/customer/profile', label: 'Profile & Security', icon: UserCog },
  ];

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CU';

  return (
    <div className="customer-portal-root">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className={`customer-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top-section">
          {/* Logo & Close for Mobile */}
          <div className="sidebar-logo-container">
            <Link
              to="/customer/dashboard"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <BrandLogo size="md" variant="light" />
            </Link>
            <button
              className="sidebar-close-btn"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '0 8px 12px 8px' }}>
            <span className="sidebar-badge">Renter Portal</span>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/customer/dashboard'}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''} ${item.highlight ? 'highlight-link' : ''}`
                  }
                >
                  <Icon size={18} />
                  <span className="link-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="badge-pill">{item.badge}</span>
                  )}
                  {item.highlight && <span className="ai-pill">AI</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Concierge Assistance Card & Logout */}
        <div className="sidebar-bottom-section">
          <div className="concierge-card">
            <div className="concierge-header">
              <ShieldCheck size={16} color="#FAB826" />
              <span>24/7 Roadside Aid</span>
            </div>
            <p className="concierge-text">
              Emergency breakdown & concierge dispatch ready round the clock.
            </p>
            <a href="tel:+966114009000" className="concierge-tel">
              +966 11 400 9000
            </a>
          </div>

          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="customer-content-wrapper">
        {/* Top Header */}
        <header className="customer-top-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="portal-location-tag">
              Finovo AI Car Rental • Customer Self-Service Portal
            </span>
          </div>

          <div className="header-right">
            {/* Quick Browse link */}
            <Link to="/customer/cars" className="header-browse-btn">
              <Car size={16} />
              <span>Reserve Car</span>
            </Link>

            {/* Notification Bell */}
            <Link
              to="/customer/notifications"
              className="header-icon-btn"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="notif-badge">{unreadNotifications}</span>
              )}
            </Link>

            {/* Public catalog external link */}
            <Link to="/" target="_blank" className="header-icon-btn" title="Open Main Website">
              <ExternalLink size={17} />
            </Link>

            {/* User Profile Pill & Dropdown */}
            <div className="profile-menu-container">
              <button
                className="profile-pill-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="user-avatar">{userInitials}</div>
                <div className="user-text-info">
                  <span className="user-name">{user?.fullName || 'Valued Renter'}</span>
                  <span className="user-email">{user?.email || 'customer@finovo.com'}</span>
                </div>
                <ChevronDown size={14} color="#685D73" />
              </button>

              {profileDropdownOpen && (
                <div
                  className="profile-dropdown-card"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <div className="dropdown-header">
                    <strong>{user?.fullName}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <div className="dropdown-divider" />
                  <Link to="/customer/profile" className="dropdown-item">
                    <UserCog size={16} />
                    <span>Profile & Settings</span>
                  </Link>
                  <Link to="/customer/documents" className="dropdown-item">
                    <FileCheck size={16} />
                    <span>Driver License & ID</span>
                  </Link>
                  <Link to="/customer/payments" className="dropdown-item">
                    <CreditCard size={16} />
                    <span>Billing & Invoices</span>
                  </Link>
                  <div className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-logout-btn">
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="customer-main-view">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
