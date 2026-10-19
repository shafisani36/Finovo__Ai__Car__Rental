import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/context';
import { BrandLogo } from '../../components/common/BrandLogo';
import {
  LayoutDashboard,
  Car,
  CalendarCheck,
  Calendar,
  KeyRound,
  ShieldAlert,
  Users,
  Briefcase,
  Building2,
  ShieldCheck,
  Search,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Globe,
  Layers,
  Tag,
} from 'lucide-react';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      if (window.innerWidth >= 900) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'FP';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F7F5F8',
        fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
        color: '#1C0324',
      }}
    >
      {/* ================= LEFT SIDEBAR ================= */}
      <aside
        className={`admin-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}
        style={{
          width: '240px',
          backgroundColor: '#1E0426',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Top: Logo & Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Logo Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
              paddingLeft: '8px',
              flexShrink: 0,
            }}
          >
            <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              <BrandLogo size="md" variant="light" />
            </Link>

            {/* Mobile close toggle */}
            <button
              className="admin-sidebar-close-btn"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links (Scrollable if height constrained) */}
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {[
              { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { to: '/admin/cars', icon: Car, label: 'Fleet' },
              { to: '/admin/brands', icon: Globe, label: 'Brands' },
              { to: '/admin/models', icon: Layers, label: 'Models' },
              { to: '/admin/categories', icon: Tag, label: 'Categories' },
              { to: '/admin/bookings', icon: CalendarCheck, label: 'Bookings' },
              { to: '/admin/calendar', icon: Calendar, label: 'Schedule' },
              { to: '/admin/rentals', icon: KeyRound, label: 'Rentals' },
              { to: '/admin/inspections', icon: ShieldAlert, label: 'AI Inspections' },
              { to: '/admin/customers', icon: Users, label: 'Customers' },
              { to: '/admin/employees', icon: Briefcase, label: 'Staff' },
              { to: '/admin/branches', icon: Building2, label: 'Branches' },
              { to: '/admin/audit-logs', icon: ShieldCheck, label: 'Audit Trail' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileSidebarOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                  })}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls: Theme Toggle & Logout */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
          {/* Light mode toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sun size={17} />
              <span>Light mode</span>
            </div>

            {/* Pill Toggle Switch */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle theme mode"
              style={{
                width: '42px',
                height: '22px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                padding: '2px',
                transition: 'background-color 0.2s',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transform: isDarkMode ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1E0426',
                }}
              >
                {isDarkMode ? <Moon size={11} /> : <Sun size={11} />}
              </div>
            </button>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN WRAPPER ================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header className="admin-header">
          {/* Mobile Hamburger toggle + Search Input */}
          <div className="admin-header-left">
            <button
              className="admin-hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={22} />
            </button>

            {/* Global Search Bar */}
            <div className="admin-header-search-wrap">
              <Search
                size={16}
                color="#8A7090"
                style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
              />
              <input
                type="text"
                placeholder={isMobile ? 'Search...' : 'Search car, customers, items...'}
                className="admin-header-search-input"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6C1E84';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#EBE5ED';
                  e.currentTarget.style.backgroundColor = '#F8F6F9';
                }}
              />
              {/* Keyboard shortcut hint badge */}
              <span className="admin-header-shortcut-badge">/</span>
            </div>
          </div>

          {/* Right Controls: Bell, Help, Avatar */}
          <div className="admin-header-right">
            {/* Notification Bell */}
            <button
              type="button"
              className="admin-header-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="admin-header-badge-dot" />
            </button>

            {/* Help Icon */}
            <button
              type="button"
              className="admin-header-icon-btn admin-header-help-btn"
              aria-label="Help and Support"
            >
              <HelpCircle size={19} />
            </button>

            {/* User Avatar Circle */}
            <div
              className="admin-header-avatar"
              title={user?.fullName || 'Administrator'}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Main Routed Outlet View */}
        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu backdrop"
        />
      )}

      {/* Responsive Breakpoint Styles */}
      <style>{`
        .admin-header {
          height: 70px;
          background-color: #FFFFFF;
          border-bottom: 1px solid #ECE7ED;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          box-sizing: border-box;
          position: sticky;
          top: 0;
          z-index: 40;
          gap: 16px;
        }

        .admin-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1 1 500px;
          max-width: 520px;
          min-width: 0;
        }

        .admin-hamburger-btn {
          display: none;
          background: none;
          border: none;
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
          color: #1C0324;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background-color 0.2s;
        }
        .admin-hamburger-btn:hover {
          background-color: #F3EEF4;
        }

        .admin-header-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-width: 0;
        }

        .admin-header-search-input {
          width: 100%;
          height: 42px;
          padding-left: 40px;
          padding-right: 36px;
          font-size: 0.875rem;
          background-color: #F8F6F9;
          border: 1px solid #EBE5ED;
          border-radius: 12px;
          outline: none;
          color: #1C0324;
          transition: border-color 0.2s, background-color 0.2s;
          box-sizing: border-box;
        }

        .admin-header-shortcut-badge {
          position: absolute;
          right: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #8A7090;
          background-color: #EAE5EC;
          padding: 2px 7px;
          border-radius: 6px;
          pointer-events: none;
        }

        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .admin-header-icon-btn {
          background: none;
          border: none;
          color: #66566A;
          cursor: pointer;
          position: relative;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
        }
        .admin-header-icon-btn:hover {
          background-color: #F3EEF4;
          color: #1C0324;
        }

        .admin-header-badge-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          background-color: #FAB826;
          border-radius: 50%;
          border: 1.5px solid #FFFFFF;
        }

        .admin-header-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: #2E0738;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(46, 7, 56, 0.2);
          flex-shrink: 0;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .admin-header-avatar:hover {
          transform: scale(1.04);
        }

        .admin-main-content {
          flex: 1;
          padding: 32px 36px;
          box-sizing: border-box;
          min-width: 0;
        }

        .admin-mobile-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(18, 2, 24, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 48;
        }

        @media (max-width: 900px) {
          .admin-sidebar {
            position: fixed !important;
            transform: translateX(-100%) !important;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-sidebar-close-btn {
            display: inline-flex !important;
          }
          .admin-hamburger-btn {
            display: inline-flex !important;
          }
          .admin-header {
            padding: 0 16px;
            height: 60px;
            gap: 12px;
          }
          .admin-header-left {
            gap: 10px;
            flex: 1 1 auto;
            max-width: none;
          }
          .admin-header-right {
            gap: 10px;
          }
          .admin-main-content {
            padding: 20px 16px;
          }
        }

        @media (max-width: 640px) {
          .admin-header {
            padding: 0 12px;
            height: 56px;
            gap: 8px;
          }
          .admin-header-left {
            gap: 8px;
            flex: 1 1 auto;
            max-width: none;
            min-width: 0;
          }
          .admin-hamburger-btn {
            padding: 6px;
            width: 36px;
            height: 36px;
          }
          .admin-header-search-wrap {
            min-width: 0;
          }
          .admin-header-search-input {
            height: 38px;
            font-size: 0.82rem;
            padding-left: 36px;
            padding-right: 10px;
            border-radius: 10px;
          }
          .admin-header-shortcut-badge {
            display: none !important;
          }
          .admin-header-right {
            gap: 6px;
          }
          .admin-header-icon-btn {
            padding: 6px;
            width: 34px;
            height: 34px;
          }
          .admin-header-avatar {
            width: 34px;
            height: 34px;
            font-size: 0.8rem;
          }
          .admin-main-content {
            padding: 16px 12px;
          }
        }

        @media (max-width: 480px) {
          .admin-header-help-btn {
            display: none !important;
          }
        }

        @media (max-width: 380px) {
          .admin-header {
            padding: 0 8px;
            gap: 6px;
          }
          .admin-header-left {
            gap: 6px;
          }
          .admin-hamburger-btn {
            width: 32px;
            height: 32px;
            padding: 4px;
          }
          .admin-header-search-input {
            height: 34px;
            font-size: 0.78rem;
            padding-left: 30px;
          }
          .admin-header-right {
            gap: 4px;
          }
          .admin-header-icon-btn {
            width: 30px;
            height: 30px;
            padding: 4px;
          }
          .admin-header-avatar {
            width: 30px;
            height: 30px;
            font-size: 0.74rem;
          }
        }
      `}</style>
    </div>
  );
}
