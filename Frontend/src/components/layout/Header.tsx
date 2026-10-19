import { useState, useEffect } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { Button } from '../common/Button';
import { User, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../features/auth/context';

interface HeaderProps {
  onSignInClick?: () => void;
}

export function Header({ onSignInClick }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Cars', href: '#browse-cars' },
    { label: 'Categories', href: '#categories' },
    { label: 'AI Inspection', href: '#ai-inspection' },
    { label: 'Why Us', href: '#why-us' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <div
        className="container header-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        {/* Mobile Hamburger Button on Left */}
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {mobileMenuOpen ? (
            <X size={20} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round">
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="4" y1="16" x2="20" y2="16" />
            </svg>
          )}
        </button>

        <a href="#" className="header-brand-logo" aria-label="Finovo Car Rental Homepage" style={{ display: 'inline-flex' }}>
          <BrandLogo size="md" variant="light" />
        </a>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="desktop-navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.href);
              }}
              style={{
                fontSize: '0.925rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
                transition: 'color var(--transition-fast)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-accent-500)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dark / Light Pill Switch */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle theme display"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Desktop Sign In / Account Button */}
          <Button
            variant="glass"
            size="sm"
            icon={<User size={15} />}
            iconPosition="left"
            onClick={onSignInClick}
            aria-label={isAuthenticated ? 'Open user dashboard' : 'Sign in to your account'}
            className="signin-button"
            style={
              isAuthenticated
                ? {
                    border: '1.5px solid rgba(250, 184, 38, 0.4)',
                    color: '#FAB826',
                    backgroundColor: 'rgba(250, 184, 38, 0.1)',
                  }
                : undefined
            }
          >
            {isAuthenticated ? user?.fullName?.split(' ')[0] || 'Dashboard' : 'Sign In'}
          </Button>

          {/* Mobile Profile Avatar Button */}
          <button
            type="button"
            className="mobile-profile-btn"
            onClick={onSignInClick}
            aria-label="User Account"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: isAuthenticated ? 'rgba(250, 184, 38, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: isAuthenticated ? '1.5px solid #FAB826' : '1.5px solid rgba(255, 255, 255, 0.25)',
              color: isAuthenticated ? '#FAB826' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 'var(--header-height)',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(18, 2, 28, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 998,
            padding: '24px 20px 40px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  padding: '14px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <span>{link.label}</span>
                <span style={{ color: 'var(--color-accent-500)', fontSize: '1rem' }}>→</span>
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setMobileMenuOpen(false);
                const el = document.getElementById('search-form');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Search & Book a Car
            </Button>
            <Button
              variant="glass"
              size="md"
              fullWidth
              icon={<User size={16} />}
              iconPosition="left"
              onClick={() => {
                setMobileMenuOpen(false);
                onSignInClick?.();
              }}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Sign In to Account'}
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 960px) {
          .desktop-navigation {
            display: none !important;
          }
          .mobile-toggle-btn {
            display: inline-flex !important;
          }
          .signin-button {
            display: none !important;
          }
          .theme-toggle-btn {
            display: none !important;
          }
          .mobile-profile-btn {
            display: inline-flex !important;
          }
          .header-brand-logo {
            margin: 0 auto !important;
          }
        }
      `}</style>
    </header>
  );
}
