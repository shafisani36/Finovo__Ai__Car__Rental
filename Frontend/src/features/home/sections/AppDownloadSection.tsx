import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Sparkles, Apple, Play } from 'lucide-react';

export function AppDownloadSection() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
          once: true,
        },
        onComplete: () => {
          gsap.set(['.app-phones-container', '.app-text-column'], {
            clearProps: 'opacity,transform',
          });
        },
      });

      tl.from('.app-phones-container', {
        opacity: 0,
        y: 35,
        duration: 0.85,
        ease: 'power2.out',
      }).from(
        '.app-text-column',
        {
          opacity: 0,
          x: 25,
          duration: 0.85,
          ease: 'power2.out',
        },
        '-=0.45'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      id="app-download"
      ref={containerRef}
      style={{
        paddingTop: 'clamp(50px, 7vw, 90px)',
        paddingBottom: 'clamp(60px, 8vw, 100px)',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div className="container">
        <div
          style={{
            backgroundColor: '#DFC6AD',
            borderRadius: 'clamp(20px, 3.5vw, 32px)',
            padding: 'clamp(36px, 6vw, 64px) clamp(20px, 5vw, 56px)',
            boxShadow: '0 16px 40px rgba(87, 59, 30, 0.12)',
            border: '1px solid rgba(87, 59, 30, 0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            className="app-download-layout"
            style={{
              display: 'grid',
              gap: 'clamp(32px, 5vw, 56px)',
              alignItems: 'center',
            }}
          >
            {/* Left Column: 2 Modern Smartphone Mockups */}
            <div
              className="app-phones-container"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                minHeight: '340px',
              }}
            >
              {/* Phone 1 (Tilted Back) */}
              <div
                className="app-phone-mockup"
                style={{
                  width: 'clamp(140px, 22vw, 180px)',
                  height: 'clamp(280px, 38vw, 340px)',
                  backgroundColor: '#1E0432',
                  borderRadius: '28px',
                  border: '4px solid #FFFFFF',
                  boxShadow: '0 20px 40px rgba(20, 2, 32, 0.35)',
                  overflow: 'hidden',
                  position: 'relative',
                  transform: 'rotate(-9deg) translateX(-15px)',
                  zIndex: 1,
                }}
              >
                <div style={{ padding: '14px 10px', color: '#FFFFFF' }}>
                  <div style={{ width: '36px', height: '3.5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '0 auto 14px auto' }} />
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-accent-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                    AI Inspection
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '10px' }}>
                    Scan Exterior 360°
                  </div>
                  <div
                    style={{
                      height: '140px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1.5px dashed var(--color-accent-500)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <Sparkles size={20} color="var(--color-accent-500)" style={{ marginBottom: '4px' }} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Condition Verified</div>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)' }}>0 Scratches Detected</div>
                  </div>
                </div>
              </div>

              {/* Phone 2 (Foreground Active) */}
              <div
                className="app-phone-mockup"
                style={{
                  width: 'clamp(150px, 24vw, 190px)',
                  height: 'clamp(300px, 40vw, 360px)',
                  backgroundColor: '#160222',
                  borderRadius: '30px',
                  border: '4.5px solid #FFFFFF',
                  boxShadow: '0 24px 50px rgba(20, 2, 32, 0.45)',
                  overflow: 'hidden',
                  position: 'relative',
                  transform: 'rotate(5deg) translateX(15px)',
                  zIndex: 2,
                }}
              >
                <div style={{ padding: '14px 10px', color: '#FFFFFF' }}>
                  <div style={{ width: '40px', height: '3.5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '0 auto 12px auto' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>Digital Key</div>
                    <span style={{ fontSize: '0.55rem', padding: '2px 5px', backgroundColor: '#22C55E', borderRadius: '6px', color: '#000', fontWeight: 800 }}>
                      ACTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '2px' }}>
                    Audi A7 Sportback
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-accent-500)', marginBottom: '12px' }}>
                    Tap to unlock vehicle
                  </div>

                  <div
                    style={{
                      height: '130px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(245, 183, 22, 0.15)',
                      border: '1.5px solid var(--color-accent-500)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-accent-500)' }}>
                      UNLOCK
                    </div>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.8)' }}>Bluetooth Proximity</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Copy & App Badges */}
            <div className="app-text-column">
              <h2
                style={{
                  fontFamily: 'var(--font-family-display)',
                  fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
                  fontWeight: 800,
                  color: '#341C07',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: '14px',
                }}
              >
                Drive Your Journey With Finovo
              </h2>

              <p
                style={{
                  fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
                  color: '#553416',
                  lineHeight: 1.55,
                  marginBottom: '26px',
                  maxWidth: '480px',
                }}
              >
                Download the official Finovo app for frictionless car bookings, instant contactless vehicle unlocking, live GPS updates, and automatic AI inspections anywhere.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                {/* App Store Button */}
                <a
                  href="#"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    backgroundColor: '#1E0432',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-pill)',
                    textDecoration: 'none',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.25)',
                    transition: 'transform var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Apple size={22} color="#FFFFFF" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Download on the
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>App Store</div>
                  </div>
                </a>

                {/* Google Play Button */}
                <a
                  href="#"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    backgroundColor: '#1E0432',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-pill)',
                    textDecoration: 'none',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.25)',
                    transition: 'transform var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Play size={20} color="var(--color-accent-500)" fill="var(--color-accent-500)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Get it on
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .app-download-layout {
          grid-template-columns: 1fr 1.1fr;
        }
        @media (max-width: 900px) {
          .app-download-layout {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .app-text-column {
            text-align: center !important;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .app-text-column p {
            margin-left: auto;
            margin-right: auto;
          }
          .app-text-column > div:last-child {
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
}
