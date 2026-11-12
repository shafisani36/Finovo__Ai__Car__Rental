import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/context';
import { BrandLogo } from '../../components/common/BrandLogo';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import {
  customerPortalApi,
  CUSTOMER_NOTIFICATIONS_UPDATED_EVENT,
} from '../../features/customers/api/customerPortalApi';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const sidebarNavRef = useRef<HTMLElement>(null);

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

    const handleNotificationsUpdated = (event: Event) => {
      if (!isMounted) return;
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === 'number') {
        setUnreadNotifications(Math.max(0, customEvent.detail.unreadCount));
      } else {
        customerPortalApi
          .listNotifications()
          .then((res) => {
            if (isMounted && res.success) {
              setUnreadNotifications(res.unreadCount || 0);
            }
          })
          .catch(() => {});
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener(CUSTOMER_NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);
    window.addEventListener('resize', handleResize);
    return () => {
      isMounted = false;
      window.removeEventListener(CUSTOMER_NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const activeLink = sidebarNavRef.current?.querySelector('.sidebar-link.active');
    if (activeLink instanceof HTMLElement) {
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/customer/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/customer/cars', label: t('nav.browseFleet'), icon: Car },
    { to: '/customer/bookings', label: t('nav.myBookings'), icon: CalendarCheck },
    { to: '/customer/payments', label: t('nav.paymentsInvoices'), icon: CreditCard },
    { to: '/customer/documents', label: t('nav.driverDocuments'), icon: FileCheck },
    {
      to: '/customer/notifications',
      label: t('nav.notifications'),
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { to: '/customer/support', label: t('nav.supportTickets'), icon: MessageSquare },
    { to: '/customer/assistant', label: t('nav.aiConcierge'), icon: Sparkles, highlight: true },
    { to: '/customer/rewards', label: t('nav.rewardsReferrals'), icon: Gift },
    { to: '/customer/history', label: t('nav.rentalHistory'), icon: History },
    { to: '/customer/profile', label: t('nav.profileSecurity'), icon: UserCog },
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

          <div className="sidebar-portal-badge-row">
            <span className="sidebar-badge">{t('nav.renterPortal')}</span>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav" ref={sidebarNavRef}>
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
              <span>{t('nav.roadsideTitle')}</span>
            </div>
            <p className="concierge-text">
              {t('nav.roadsideDesc')}
            </p>
            <a href="tel:+966114009000" className="concierge-tel phone-number">
              +966 11 400 9000
            </a>
          </div>

          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={16} />
            <span>{t('nav.logout')}</span>
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
              {t('nav.portalTagline')}
            </span>
          </div>

          <div className="header-right">
            <LanguageSelector variant="admin" />

            {/* Quick Browse link */}
            <Link to="/customer/cars" className="header-browse-btn">
              <Car size={16} />
              <span>{t('nav.reserveCar')}</span>
            </Link>

            {/* Notification Bell */}
            <Link
              to="/customer/notifications"
              className="header-icon-btn"
              title={t('nav.notifications')}
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="notif-badge">{unreadNotifications}</span>
              )}
            </Link>

            {/* Public catalog external link */}
            <Link to="/" target="_blank" className="header-icon-btn" title={t('nav.openMainWebsite')}>
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
                  <span className="user-name">{user?.fullName || t('portal.valuedRenter')}</span>
                  <span className="user-email">{user?.email ?? ''}</span>
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
                    <span>{t('nav.profileSecurity')}</span>
                  </Link>
                  <Link to="/customer/documents" className="dropdown-item">
                    <FileCheck size={16} />
                    <span>{t('nav.driverDocuments')}</span>
                  </Link>
                  <Link to="/customer/payments" className="dropdown-item">
                    <CreditCard size={16} />
                    <span>{t('nav.paymentsInvoices')}</span>
                  </Link>
                  <div className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-logout-btn">
                    <LogOut size={16} />
                    <span>{t('nav.logout')}</span>
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
