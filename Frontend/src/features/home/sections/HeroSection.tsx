import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SearchWidget } from '../components/SearchWidget';

export function HeroSection() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          gsap.set(['.hero-headline', '.hero-subtitle', '.hero-search-wrapper', '.hero-window-card'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from('.hero-headline', { opacity: 0, y: 25, duration: 0.85 })
        .from('.hero-subtitle', { opacity: 0, y: 15, duration: 0.75 }, '-=0.5')
        .from('.hero-search-wrapper', { opacity: 0, y: 15, duration: 0.8 }, '-=0.5')
        .from('.hero-window-card', { opacity: 0, scale: 0.96, duration: 0.9 }, '-=0.6');
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="hero-section"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #1B0227 0%, #2A0845 58%, #DFBE9F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(113, 36, 172, 0.28) 0%, rgba(42, 8, 69, 0) 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '5%',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 183, 22, 0.2) 0%, rgba(223, 190, 159, 0) 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="hero-grid"
          style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {/* Heading and Subtitle */}
          <div className="hero-heading-block">
            <h1
              className="hero-headline"
              style={{
                fontFamily: 'var(--font-family-display)',
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                marginBottom: '10px',
              }}
            >
              {t('home.hero.title')}
            </h1>

            <p
              className="hero-subtitle"
              style={{
                fontSize: 'clamp(0.875rem, 1.1vw, 1rem)',
                color: 'rgba(255, 255, 255, 0.78)',
                lineHeight: 1.5,
                marginBottom: '14px',
                maxWidth: '480px',
              }}
            >
              {t('home.hero.subtitle')}
            </p>
          </div>

          {/* Search Form Wrapper */}
          <div className="hero-search-wrapper">
            <SearchWidget />
          </div>

          {/* Hero Vehicle Window Card matching Figma */}
          <div
            className="hero-window-card"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div
              className="hero-car-frame"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '460px',
                borderRadius: '32px',
                overflow: 'hidden',
                border: '2.5px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 25px 60px rgba(18, 2, 30, 0.45)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Luxury car preview matching Figma mobile and desktop */}
              <img
                src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=85"
                alt="Finovo Luxury Coupe and Inspection Fleet"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 46%',
                  display: 'block',
                }}
              />

              {/* Shading overlay matching Figma */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, rgba(20, 3, 34, 0.15) 0%, rgba(20, 3, 34, 0) 50%, rgba(20, 3, 34, 0.45) 100%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-section {
          min-height: 100vh;
          padding-top: calc(var(--header-height) + 12px);
          padding-bottom: 32px;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.12fr 0.88fr;
          grid-template-rows: auto 1fr;
          grid-template-areas:
            "heading car"
            "search car";
          gap: 16px clamp(28px, 4.5vw, 60px);
          align-items: center;
        }
        .hero-heading-block {
          grid-area: heading;
          max-width: 540px;
          width: 100%;
        }
        .hero-search-wrapper {
          grid-area: search;
          max-width: 540px;
          width: 100%;
        }
        .hero-window-card {
          grid-area: car;
          align-self: center;
        }
        .hero-car-frame {
          height: calc(100vh - var(--header-height) - 80px);
          max-height: 560px;
          min-height: 400px;
        }
        @media (max-width: 1024px) {
          .hero-section {
            height: auto !important;
            max-height: none !important;
            padding-top: calc(var(--header-height) + 16px) !important;
            padding-bottom: 50px !important;
          }
          .hero-grid {
            display: flex !important;
            flex-direction: column !important;
            align-items: center;
            gap: 20px !important;
          }
          .hero-heading-block {
            order: 1;
            text-align: left;
            width: 100%;
            max-width: 480px;
          }
          .hero-window-card {
            order: 2;
            width: 100%;
            max-width: 480px;
          }
          .hero-search-wrapper {
            order: 3;
            width: 100%;
            max-width: 480px;
          }
          .hero-car-frame {
            height: clamp(190px, 48vw, 240px) !important;
            max-height: none !important;
            min-height: auto !important;
            border-radius: 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
