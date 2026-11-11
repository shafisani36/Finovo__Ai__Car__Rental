import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Sparkles, ShieldCheck, ScanEye, ArrowRight, CarFront } from 'lucide-react';
import { SearchWidget } from '../components/SearchWidget';

interface ShowcaseVehicle {
  id: string;
  image: string;
  nameKey: string;
  tagKey: string;
  priceKey: string;
  accent: string;
}

const SHOWCASE_VEHICLES: ShowcaseVehicle[] = [
  {
    id: 'tesla',
    image: '/cars/finovo-red-car.png',
    nameKey: 'home.hero.showcase1Name',
    tagKey: 'home.hero.showcase1Tag',
    priceKey: 'home.hero.showcase1Price',
    accent: '#EF4444',
  },
  {
    id: 'bmw',
    image: '/cars/bmw.png',
    nameKey: 'home.hero.showcase2Name',
    tagKey: 'home.hero.showcase2Tag',
    priceKey: 'home.hero.showcase2Price',
    accent: '#FAB826',
  },
  {
    id: 'tucson',
    image: '/cars/finovo-blue-car.png',
    nameKey: 'home.hero.showcase3Name',
    tagKey: 'home.hero.showcase3Tag',
    priceKey: 'home.hero.showcase3Price',
    accent: '#38BDF8',
  },
];

export function HeroSection() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_VEHICLES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          gsap.set(
            ['.hero-headline', '.hero-subtitle', '.hero-search-wrapper', '.hero-window-card'],
            { clearProps: 'transform,opacity' }
          );
        },
      });

      tl.from('.hero-headline', { opacity: 0, y: 24, duration: 0.75 })
        .from('.hero-subtitle', { opacity: 0, y: 14, duration: 0.65 }, '-=0.45')
        .from('.hero-search-wrapper', { opacity: 0, y: 14, duration: 0.7 }, '-=0.45')
        .from('.hero-window-card', { opacity: 0, scale: 0.96, duration: 0.8 }, '-=0.55');
    },
    { scope: containerRef }
  );

  const activeVehicle = SHOWCASE_VEHICLES[activeIndex];

  return (
    <section ref={containerRef} className="hero-section finovo-hero-stage">
      {/* Subtle architectural backdrop glows (clipped cleanly, pointer-events: none) */}
      <div className="finovo-hero-glow finovo-hero-glow-a" aria-hidden="true" />
      <div className="finovo-hero-glow finovo-hero-glow-b" aria-hidden="true" />
      <div className="finovo-hero-grid-pattern" aria-hidden="true" />

      <div className="container finovo-hero-container">
        <div className="finovo-hero-grid">
          {/* Start Column: Brand Messaging, Quick CTAs, and Booking Search Console */}
          <div className="finovo-hero-content">
            <div className="hero-headline">
              <div className="finovo-hero-badge">
                <Sparkles size={14} style={{ color: '#FAB826', flexShrink: 0 }} />
                <span>{t('home.hero.badge')}</span>
              </div>

              <h1 className="finovo-hero-title">
                <span>{t('home.hero.title')} </span>
                <span className="finovo-hero-title-highlight">{t('home.hero.titleHighlight')}</span>
              </h1>
            </div>

            <p className="hero-subtitle finovo-hero-subtitle">{t('home.hero.subtitle')}</p>

            {/* Primary Navigation CTAs & Live Trust Stats */}
            <div className="finovo-hero-actions">
              <Link to="/cars" className="finovo-hero-cta-primary">
                <CarFront size={17} />
                <span>{t('home.hero.browseFleet')}</span>
                <ArrowRight size={16} className="rtl-mirror-arrow" />
              </Link>
              <Link to="/ai-inspection" className="finovo-hero-cta-secondary">
                <ScanEye size={16} style={{ color: '#FAB826' }} />
                <span>{t('home.hero.watchVideo')}</span>
              </Link>
            </div>

            <div className="finovo-hero-stats-strip">
              <div className="finovo-hero-stat-pill">
                <span className="finovo-hero-stat-dot" style={{ backgroundColor: '#FAB826' }} />
                <span>{t('home.hero.statsVehicles')}</span>
              </div>
              <div className="finovo-hero-stat-pill">
                <span className="finovo-hero-stat-dot" style={{ backgroundColor: '#34D399' }} />
                <span>{t('home.hero.statsSatisfaction')}</span>
              </div>
              <div className="finovo-hero-stat-pill">
                <span className="finovo-hero-stat-dot" style={{ backgroundColor: '#C084FC' }} />
                <span>{t('home.hero.statsAiScan')}</span>
              </div>
            </div>

            <div className="hero-search-wrapper" style={{ width: '100%' }}>
              <SearchWidget />
            </div>
          </div>

          {/* End Column: Interactive Luxury Architectural AI Vehicle Podium */}
          <div
            className="hero-window-card finovo-hero-podium"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Top AI Vision HUD Bar */}
            <div className="finovo-podium-hud-row">
              <div className="finovo-podium-hud-chip">
                <span className="finovo-live-dot" />
                <span>{t('home.hero.aiHudStatus')}</span>
              </div>
              <div className="finovo-podium-hud-chip verified">
                <ShieldCheck size={14} style={{ color: '#34D399', flexShrink: 0 }} />
                <span>{t('home.hero.aiHudConfidence')}</span>
              </div>
            </div>

            {/* Central Studio Stage & Vehicle Display */}
            <div className="finovo-podium-visual-stage">
              <div
                className="finovo-podium-halo"
                style={{
                  background: `radial-gradient(circle, ${activeVehicle.accent}33 0%, rgba(108,30,132,0.18) 48%, transparent 72%)`,
                }}
                aria-hidden="true"
              />

              {/* Subtle 360-degree scan orbit ring */}
              <div className="finovo-podium-ring" aria-hidden="true" />

              {SHOWCASE_VEHICLES.map((vehicle, index) => (
                <img
                  key={vehicle.id}
                  src={vehicle.image}
                  alt={t(vehicle.nameKey)}
                  loading="eager"
                  className={`finovo-podium-car-img ${index === activeIndex ? 'is-active' : ''}`}
                />
              ))}

              <div className="finovo-podium-floor-shadow" aria-hidden="true" />
            </div>

            {/* Vehicle Selector Switcher */}
            <div className="finovo-podium-switcher" role="tablist" aria-label={t('home.categories.title')}>
              {SHOWCASE_VEHICLES.map((vehicle, index) => {
                const isSelected = index === activeIndex;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveIndex(index)}
                    className={`finovo-podium-tab ${isSelected ? 'is-active' : ''}`}
                  >
                    <span
                      className="finovo-podium-tab-swatch"
                      style={{ backgroundColor: vehicle.accent }}
                    />
                    <span className="finovo-podium-tab-text">{t(vehicle.nameKey)}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Frosted Telemetry & Quick Reserve Bar */}
            <div className="finovo-podium-footer">
              <div style={{ minWidth: 0 }}>
                <div className="finovo-podium-car-name">{t(activeVehicle.nameKey)}</div>
                <div className="finovo-podium-car-tag">{t(activeVehicle.tagKey)}</div>
              </div>

              <div className="finovo-podium-price-group">
                <div style={{ textAlign: 'end' }}>
                  <span className="finovo-podium-price-label">{t('home.hero.startingFrom')}</span>
                  <div className="finovo-podium-price-val">
                    {t(activeVehicle.priceKey)}
                    <span className="finovo-podium-price-unit"> {t('common.perDay')}</span>
                  </div>
                </div>
                <Link to="/cars" className="finovo-podium-reserve-btn">
                  {t('home.hero.bookQuick')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smooth warm champagne curve transition to CarCategorySection */}
      <div className="finovo-hero-bottom-fade" aria-hidden="true" />

      <style>{`
        .finovo-hero-stage {
          position: relative;
          overflow: hidden;
          background: linear-gradient(155deg, #160122 0%, #2C0644 48%, #4C126E 78%, #DFBE9F 100%);
          padding: 112px 0 64px;
          color: #FFFFFF;
        }

        .finovo-hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(95px);
          pointer-events: none;
          z-index: 0;
        }

        .finovo-hero-glow-a {
          width: 480px;
          height: 480px;
          top: -120px;
          inset-inline-start: -90px;
          background: rgba(139, 36, 173, 0.35);
        }

        .finovo-hero-glow-b {
          width: 420px;
          height: 420px;
          top: 18%;
          inset-inline-end: -60px;
          background: rgba(250, 184, 38, 0.16);
        }

        .finovo-hero-grid-pattern {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.65) 0%, transparent 82%);
          -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.65) 0%, transparent 82%);
          pointer-events: none;
          z-index: 0;
        }

        .finovo-hero-container {
          position: relative;
          z-index: 2;
        }

        .finovo-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
          gap: 36px;
          align-items: center;
        }

        .finovo-hero-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          min-width: 0;
        }

        .finovo-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(250, 184, 38, 0.35);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #FDE68A;
          margin-bottom: 14px;
          backdrop-filter: blur(10px);
          max-width: 100%;
        }

        .finovo-hero-title {
          font-family: var(--font-family-heading);
          font-size: clamp(2.15rem, 4.1vw, 3.65rem);
          font-weight: 800;
          line-height: 1.09;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .finovo-hero-title-highlight {
          background: linear-gradient(135deg, #FAB826 0%, #FFE28A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
        }

        .finovo-hero-subtitle {
          font-size: 1.02rem;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.84);
          max-width: 540px;
          margin: 0;
        }

        .finovo-hero-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .finovo-hero-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 11px 20px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #FAB826 0%, #F59E0B 100%);
          color: #180226;
          font-weight: 800;
          font-size: 0.88rem;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(250, 184, 38, 0.32);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .finovo-hero-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(250, 184, 38, 0.45);
        }

        .finovo-hero-cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 18px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.88rem;
          text-decoration: none;
          backdrop-filter: blur(10px);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .finovo-hero-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(250, 184, 38, 0.45);
        }

        .finovo-hero-stats-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .finovo-hero-stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 12px;
          border-radius: 9999px;
          background: rgba(20, 2, 34, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 0.76rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .finovo-hero-stat-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Interactive Studio Vehicle Podium */
        .finovo-hero-podium {
          position: relative;
          border-radius: 28px;
          background: linear-gradient(160deg, rgba(28, 4, 46, 0.86) 0%, rgba(18, 2, 30, 0.92) 100%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 32px 68px rgba(10, 1, 18, 0.52);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
          overflow: hidden;
        }

        .finovo-podium-hud-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .finovo-podium-hud-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 12px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-size: 0.74rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .finovo-podium-hud-chip.verified {
          border-color: rgba(52, 211, 153, 0.35);
          background: rgba(16, 185, 129, 0.12);
          color: #A7F3D0;
        }

        .finovo-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34D399;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.22);
          flex-shrink: 0;
        }

        .finovo-podium-visual-stage {
          position: relative;
          height: 290px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .finovo-podium-halo {
          position: absolute;
          width: 92%;
          height: 240px;
          border-radius: 50%;
          pointer-events: none;
          transition: background 0.45s ease;
        }

        .finovo-podium-ring {
          position: absolute;
          bottom: 24px;
          width: 86%;
          height: 62px;
          border-radius: 50%;
          border: 1.5px dashed rgba(250, 184, 38, 0.42);
          pointer-events: none;
        }

        .finovo-podium-car-img {
          position: absolute;
          max-width: 94%;
          max-height: 245px;
          width: auto;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 22px 28px rgba(0, 0, 0, 0.58));
          opacity: 0;
          transform: translateY(10px) scale(0.95);
          transition: opacity 0.45s ease, transform 0.45s ease;
          pointer-events: none;
        }

        .finovo-podium-car-img.is-active {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        [dir='rtl'] .finovo-podium-car-img.is-active {
          transform: translateY(0) scaleX(-1);
        }

        [dir='rtl'] .finovo-podium-car-img {
          transform: translateY(10px) scale(-0.95, 0.95);
        }

        [dir='rtl'] .rtl-mirror-arrow {
          transform: scaleX(-1);
        }

        .finovo-podium-floor-shadow {
          position: absolute;
          bottom: 18px;
          width: 72%;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.72) 0%, transparent 72%);
          pointer-events: none;
        }

        .finovo-podium-switcher {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .finovo-podium-tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 0;
        }

        .finovo-podium-tab.is-active {
          background: rgba(250, 184, 38, 0.16);
          border-color: rgba(250, 184, 38, 0.65);
          color: #FFFFFF;
        }

        .finovo-podium-tab-swatch {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .finovo-podium-tab-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .finovo-podium-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .finovo-podium-car-name {
          font-weight: 800;
          font-size: 1rem;
          color: #FFFFFF;
          line-height: 1.25;
        }

        .finovo-podium-car-tag {
          font-size: 0.76rem;
          color: rgba(255, 255, 255, 0.74);
          margin-top: 2px;
        }

        .finovo-podium-price-group {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-inline-start: auto;
        }

        .finovo-podium-price-label {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.68);
          font-weight: 700;
        }

        .finovo-podium-price-val {
          font-size: 1.08rem;
          font-weight: 800;
          color: #FAB826;
        }

        .finovo-podium-price-unit {
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.75);
        }

        .finovo-podium-reserve-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 16px;
          border-radius: 9999px;
          background: #FAB826;
          color: #180226;
          font-weight: 800;
          font-size: 0.8rem;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .finovo-podium-reserve-btn:hover {
          background: #FCD34D;
          transform: translateY(-1px);
        }

        .finovo-hero-bottom-fade {
          position: relative;
          height: 24px;
        }

        @media (max-width: 1024px) {
          .finovo-hero-stage {
            padding: 96px 0 48px;
          }
          .finovo-hero-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .finovo-hero-content {
            align-items: flex-start;
          }
          .finovo-podium-visual-stage {
            height: 240px;
          }
        }

        @media (max-width: 640px) {
          .finovo-hero-stage {
            padding: 86px 0 36px;
          }
          .finovo-hero-podium {
            padding: 14px;
            border-radius: 22px;
          }
          .finovo-podium-visual-stage {
            height: 195px;
          }
          .finovo-podium-car-img {
            max-height: 170px;
          }
          .finovo-podium-switcher {
            grid-template-columns: 1fr;
          }
          .finovo-podium-price-group {
            width: 100%;
            justify-content: space-between;
            margin-inline-start: 0;
          }
        }
      `}</style>
    </section>
  );
}
