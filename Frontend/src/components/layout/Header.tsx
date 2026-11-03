import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../common/BrandLogo';
import { Button } from '../common/Button';
import { LanguageSelector } from '../common/LanguageSelector';
import { Modal } from '../common/Modal';
import { TextTranslator } from '../common/TextTranslator';
import { User, X, Sun, Moon, Languages } from 'lucide-react';
import { useAuth } from '../../features/auth/context';

interface HeaderProps {
  onSignInClick?: () => void;
}

export function Header({ onSignInClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [translatorOpen, setTranslatorOpen] = useState(false);

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

  // Primary customer navigation links in strictly required order:
  // 1. Home
  // 2. Cars
  // 3. Insurance
  // 4. About Us
  // 5. AI Inspection
  // 6. Contact
  const navLinks = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.cars'), to: '/cars' },
    { label: t('nav.insurance'), to: '/insurance' },
    { label: t('nav.aboutUs'), to: '/about' },
    { label: t('nav.aiInspection'), to: '/ai-inspection' },
    { label: t('nav.contact'), to: '/contact' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#1E0426',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
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

        <Link to="/" className="header-brand-logo" aria-label="Finovo Car Rental Homepage" style={{ display: 'inline-flex' }}>
          <BrandLogo size="md" variant="light" />
        </Link>

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
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                fontSize: '0.925rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FAB826' : 'rgba(255, 255, 255, 0.85)',
                borderBottom: isActive ? '2px solid #FAB826' : '2px solid transparent',
                paddingBottom: '3px',
                transition: 'all var(--transition-fast)',
                textDecoration: 'none',
                cursor: 'pointer',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Multilingual Text Translator Quick Launcher */}
          <button
            type="button"
            className="translator-toggle-btn"
            onClick={() => setTranslatorOpen(true)}
            aria-label="Open Multilingual Text Translator"
            title={t('nav.translator')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(250, 184, 38, 0.12)',
              border: '1px solid rgba(250, 184, 38, 0.3)',
              color: '#FAB826',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all var(--transition-fast)',
            }}
          >
            <Languages size={15} />
            <span className="desktop-only-inline">{t('nav.translator')}</span>
          </button>

          {/* Real Language selector */}
          <LanguageSelector variant="customer" />

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
            {isAuthenticated ? user?.fullName?.split(' ')[0] || t('nav.myAccount') : t('nav.login')}
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
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: isActive ? '#FAB826' : '#FFFFFF',
                  padding: '14px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'rgba(250, 184, 38, 0.08)' : 'transparent',
                })}
              >
                <span>{link.label}</span>
                <span style={{ color: '#FAB826', fontSize: '1rem' }}>›</span>
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setTranslatorOpen(true);
              }}
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#FAB826',
                padding: '14px 12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(250, 184, 38, 0.08)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Languages size={18} />
                <span>{t('nav.translator')}</span>
              </div>
              <span style={{ color: '#FAB826', fontSize: '1rem' }}>›</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <LanguageSelector variant="customer" />
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setMobileMenuOpen(false);
                onSignInClick?.();
              }}
              style={{
                backgroundColor: '#FAB826',
                color: '#1C0324',
                fontWeight: 700,
              }}
            >
              {isAuthenticated ? t('nav.dashboard') : t('nav.login')}
            </Button>
          </div>
        </div>
      )}

      {/* Live Text Translator Modal */}
      <Modal
        isOpen={translatorOpen}
        onClose={() => setTranslatorOpen(false)}
        title={t('translator.modalTitle')}
        maxWidth="840px"
      >
        <TextTranslator onClose={() => setTranslatorOpen(false)} />
      </Modal>
    </header>
  );
}

