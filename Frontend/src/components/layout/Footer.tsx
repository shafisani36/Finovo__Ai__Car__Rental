import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BrandLogo } from '../common/BrandLogo';
import { LanguageSelector } from '../common/LanguageSelector';
import { Mail, Phone, MapPin, Smartphone } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const InstagramIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export function Footer() {
  const { t } = useTranslation();
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      gsap.from('.footer-col-anim', {
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true,
        },
        opacity: 0,
        y: 28,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { scope: footerRef }
  );

  return (
    <footer
      ref={footerRef}
      style={{
        backgroundColor: 'var(--color-primary-950)',
        borderTopLeftRadius: 'clamp(28px, 5vw, 48px)',
        borderTopRightRadius: 'clamp(28px, 5vw, 48px)',
        paddingTop: 'clamp(48px, 7vw, 80px)',
        paddingBottom: '36px',
        color: 'var(--text-white)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div className="container">
        {/* Main Footer Grid */}
        <div
          className="footer-main-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            marginBottom: '60px',
          }}
        >
          {/* Brand & Socials Column */}
          <div className="footer-col-anim footer-brand-col" style={{ maxWidth: '340px' }}>
            <div style={{ marginBottom: '18px' }}>
              <BrandLogo size="lg" variant="light" />
            </div>
            <p
              style={{
                fontSize: '0.925rem',
                color: 'var(--text-white-secondary)',
                lineHeight: 1.65,
                marginBottom: '24px',
              }}
            >
              {t('footer.description')}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { icon: <InstagramIcon />, label: 'Instagram' },
                { icon: <FacebookIcon />, label: 'Facebook' },
                { icon: <TwitterIcon />, label: 'Twitter' },
                { icon: <LinkedinIcon />, label: 'LinkedIn' },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-white-secondary)',
                    transition: 'all var(--transition-fast)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col-anim">
            <h4
              style={{
                fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-white)',
                marginBottom: '20px',
                letterSpacing: '-0.01em',
              }}
            >
              {t('footer.quickLinks')}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: t('nav.home'), to: '/' },
                { label: t('nav.cars'), to: '/cars' },
                { label: t('nav.insurance'), to: '/insurance' },
                { label: t('nav.aboutUs'), to: '/about' },
                { label: t('nav.aiInspection'), to: '/ai-inspection' },
                { label: t('nav.contact'), to: '/contact' },
              ].map((item) => (
                <li key={item.to}>
                  <a
                    href={item.to}
                    style={{
                      color: 'var(--text-white-secondary)',
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      transition: 'color var(--transition-fast)',
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="footer-col-anim">
            <h4
              style={{
                fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-white)',
                marginBottom: '20px',
                letterSpacing: '-0.01em',
              }}
            >
              {t('footer.contactInfo')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Mail size={17} color="var(--color-accent-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-white-secondary)' }}>
                  concierge@finovorentals.com
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Phone size={17} color="var(--color-accent-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span className="phone-number" style={{ fontSize: '0.9rem', color: 'var(--text-white-secondary)' }}>
                  +1 (800) 555-FINOVO
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin size={17} color="var(--color-accent-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-white-secondary)' }}>
                  100 Innovation Way, Suite 400<br />San Francisco, CA 94105
                </span>
              </div>
            </div>
          </div>

          {/* App Download Column */}
          <div className="footer-col-anim">
            <h4
              style={{
                fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-white)',
                marginBottom: '20px',
                letterSpacing: '-0.01em',
              }}
            >
              {t('home.appDownload.title')}
            </h4>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-white-secondary)',
                lineHeight: 1.6,
                marginBottom: '18px',
              }}
            >
              {t('home.appDownload.subtitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="#app-download"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <Smartphone size={20} color="var(--color-accent-500)" />
                <div style={{ textAlign: 'start' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-white-muted)', textTransform: 'uppercase' }}>
                    Download on
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>App Store & Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div
          style={{
            paddingTop: '28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '0.825rem',
            color: 'var(--text-white-muted)',
          }}
        >
          <div>© 2026 {t('common.appName')}. {t('footer.rightsReserved')}</div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <a href="#" style={{ color: 'inherit' }}>{t('footer.privacyPolicy')}</a>
              <a href="#" style={{ color: 'inherit' }}>{t('footer.termsOfService')}</a>
              <a href="#" style={{ color: 'inherit' }}>{t('footer.cookiePolicy')}</a>
            </div>
            <LanguageSelector variant="customer" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .footer-main-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px 16px !important;
          }
          .footer-brand-col {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </footer>
  );
}

