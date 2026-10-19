import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { Car, Zap, Headphones } from 'lucide-react';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  variant?: 'register' | 'login';
  topRightPrompt?: {
    text: string;
    linkText: string;
    linkTo: string;
  };
}

export function AuthSplitLayout({
  children,
  variant = 'login',
  topRightPrompt,
}: AuthSplitLayoutProps) {
  const isRegister = variant === 'register';

  // Using the clean, high-resolution, text-free stock background photo
  // so text is rendered cleanly once by React without double-vision/baked-in ghost text!
  const bgImage = '/auth/auth-porsche-sunset.png';

  const scriptText = isRegister ? 'Drive More Possibilities' : 'Good Rides Brighter Days';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* ================= SVG CLIP-PATH DEFINITION FOR EXACT S-CURVE ================= */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <clipPath id="finovoAuthCurveClip" clipPathUnits="objectBoundingBox">
            <path d="M 0 0 L 0.943 0 C 0.925 0.08, 1.000 0.22, 1.000 0.42 C 1.000 0.52, 0.880 0.76, 0.825 1.0 L 0 1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* ================= LEFT BRANDING HERO PANEL (DESKTOP) ================= */}
      <div
        className="auth-hero-panel"
        style={{
          width: 'clamp(460px, 52vw, 820px)',
          minHeight: '100vh',
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          zIndex: 10,
          clipPath: 'url(#finovoAuthCurveClip)',
          WebkitClipPath: 'url(#finovoAuthCurveClip)',
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(28px, 3.5vw, 56px) clamp(40px, 4.8vw, 76px) clamp(28px, 3.5vw, 56px) clamp(32px, 4vw, 64px)',
          color: '#FFFFFF',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Scenic Twilight Purple Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isRegister
              ? 'linear-gradient(135deg, rgba(26, 3, 36, 0.82) 0%, rgba(68, 14, 92, 0.58) 48%, rgba(18, 2, 28, 0.88) 100%)'
              : 'linear-gradient(135deg, rgba(32, 5, 44, 0.82) 0%, rgba(76, 16, 98, 0.54) 50%, rgba(18, 2, 28, 0.88) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Ambient Subtle Glow */}
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '12%',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(250, 184, 38, 0.16) 0%, rgba(108, 30, 132, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* 1. TOP BRAND HEADER */}
        <div style={{ position: 'relative', zIndex: 3, maxWidth: '440px' }}>
          <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <BrandLogo size="md" variant="light" />
          </Link>
          <div
            style={{
              fontSize: '0.725rem',
              fontWeight: 800,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.82)',
              marginTop: '8px',
            }}
          >
            CARS &nbsp;•&nbsp; TRIPS &nbsp;•&nbsp; EXPERIENCES
          </div>
        </div>

        {/* 2. CENTER CONTENT: HEADLINE, SUBTITLE & FEATURES */}
        <div style={{ position: 'relative', zIndex: 3, margin: 'auto 0', maxWidth: '440px' }}>
          {/* Main Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              fontSize: 'clamp(2.1rem, 3.2vw, 3.2rem)',
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              margin: '0 0 16px 0',
            }}
          >
            {isRegister ? (
              <>
                Every ride you need,
                <br />
                <span style={{ color: '#D5A7E6' }}>ready to go.</span>
              </>
            ) : (
              <>
                Travel
                <br />
                <span style={{ color: '#D5A7E6' }}>beyond the</span>
                <br />
                ordinary.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(0.9rem, 1vw, 1rem)',
              color: 'rgba(255, 255, 255, 0.90)',
              lineHeight: 1.55,
              marginBottom: '32px',
              maxWidth: '410px',
            }}
          >
            {isRegister
              ? 'Book cars easily for daily travel, business trips, and weekend getaways — all in one place.'
              : 'From city drives to weekend escapes, Finovo gets you there.'}
          </p>

          {/* Feature Highlights matching each variant */}
          {isRegister ? (
            /* Register Variant: 3 horizontal badges with vertical dividers */
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                maxWidth: '460px',
                width: '100%',
              }}
            >
              {/* Feature 1 */}
              <div
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingRight: '14px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: '10px',
                    flexShrink: 0,
                  }}
                >
                  <Car size={18} />
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.25,
                    marginBottom: '4px',
                  }}
                >
                  Wide Selection
                </div>
                <div
                  style={{
                    fontSize: '0.725rem',
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1.3,
                  }}
                >
                  Cars for every need
                </div>
              </div>

              {/* Vertical Divider 1 */}
              <div
                style={{
                  width: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  alignSelf: 'stretch',
                  margin: '2px 0',
                }}
              />

              {/* Feature 2 */}
              <div
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: '10px',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} />
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.25,
                    marginBottom: '4px',
                  }}
                >
                  Easy Booking
                </div>
                <div
                  style={{
                    fontSize: '0.725rem',
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1.3,
                  }}
                >
                  Fast & hassle-free
                </div>
              </div>

              {/* Vertical Divider 2 */}
              <div
                style={{
                  width: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  alignSelf: 'stretch',
                  margin: '2px 0',
                }}
              />

              {/* Feature 3 */}
              <div
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: '14px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: '10px',
                    flexShrink: 0,
                  }}
                >
                  <Headphones size={18} />
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.25,
                    marginBottom: '4px',
                  }}
                >
                  24/7 Support
                </div>
                <div
                  style={{
                    fontSize: '0.725rem',
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1.3,
                  }}
                >
                  Help whenever you need
                </div>
              </div>
            </div>
          ) : (
            /* Login Variant: 3 vertically stacked rows */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
              {/* Row 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  <Car size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Explore More
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.78)', marginTop: '2px' }}>
                    Top destinations, curated for you
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Exclusive Deals
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.78)', marginTop: '2px' }}>
                    Great rides. Greater journeys.
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  <Headphones size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                    A Smoother You
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.78)', marginTop: '2px' }}>
                    Reliable, safe and always on the move
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. BOTTOM SCRIPT ACCENT BADGE WITH HAND-DRAWN UNDERLINE */}
        <div style={{ position: 'relative', zIndex: 3, paddingTop: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              transform: 'rotate(-5deg)',
              transformOrigin: 'left bottom',
            }}
          >
            <span
              style={{
                fontFamily: '"Caveat", cursive',
                fontSize: 'clamp(1.6rem, 2.1vw, 2.2rem)',
                fontWeight: 700,
                color: '#D5A7E6',
                lineHeight: 1.05,
                letterSpacing: '0.01em',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
              }}
            >
              {scriptText}
            </span>
            {/* Hand-drawn SVG underline stroke */}
            <svg
              width="190"
              height="10"
              viewBox="0 0 190 10"
              fill="none"
              style={{ marginTop: '2px', overflow: 'visible' }}
            >
              <path
                d="M 3 6 C 50 2, 120 2, 187 7"
                stroke="#D5A7E6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* 4. EXACT PURPLE BOUNDARY CURVED STROKE OVERLAY */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 20,
          }}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <path
            d="M 943 0 C 925 80, 1000 220, 1000 420 C 1000 520, 880 760, 825 1000"
            fill="none"
            stroke="#7A2292"
            strokeWidth="3.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div
        className="auth-form-panel"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          minHeight: '100vh',
          padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4.5vw, 64px)',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          justifyContent: 'space-between',
        }}
      >
        {/* Top Right Navigation Switch Link */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.925rem',
            color: '#4A3D4E',
            marginBottom: 'clamp(16px, 3vh, 36px)',
          }}
        >
          {/* Mobile Only Brand Logo */}
          <div className="auth-mobile-logo" style={{ display: 'none' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <BrandLogo size="sm" variant="dark" />
            </Link>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {topRightPrompt && (
              <>
                <span>{topRightPrompt.text}&nbsp;</span>
                <Link
                  to={topRightPrompt.linkTo}
                  style={{
                    color: '#6C1E84',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#380B44')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6C1E84')}
                >
                  <span>{topRightPrompt.linkText}</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Centered Form Wrapper */}
        <div
          style={{
            maxWidth: '430px',
            width: '100%',
            margin: 'auto',
          }}
        >
          {children}
        </div>

        {/* Bottom subtle copyright / privacy note */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.78rem',
            color: '#9CA3AF',
            marginTop: '24px',
          }}
        >
          © 2026 Finovo Inc. All rights reserved.
        </div>
      </div>

      {/* Responsive Breakpoint Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .auth-hero-panel {
            display: none !important;
          }
          .auth-mobile-logo {
            display: block !important;
          }
          .auth-form-panel {
            flex: 1 1 100% !important;
            padding: 24px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
