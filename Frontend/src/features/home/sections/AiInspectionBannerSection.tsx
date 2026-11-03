import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowRight, Check } from 'lucide-react';

function AiSparkleIcon({ size = 15, color = '#2B0A33' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" />
      <path d="M19 17C19 18.5 17.5 20 16 20C17.5 20 19 21.5 19 23C19 21.5 20.5 20 22 20C20.5 20 19 18.5 19 17Z" />
    </svg>
  );
}

function EmbossedBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)',
        boxShadow: 'inset 1px 1px 1px rgba(255, 255, 255, 0.22), 0 3px 8px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

const FLEET_METRICS = [
  { label: 'Engine', percent: 100 },
  { label: 'Brakes', percent: 99 },
  { label: 'Tires', percent: 92 },
  { label: 'Battery', percent: 98 },
];

export function AiInspectionBannerSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
          once: true,
        },
        onComplete: () => {
          gsap.set([bannerRef.current, '.ai-card-item'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from(bannerRef.current, {
        opacity: 0,
        y: 35,
        duration: 0.8,
        ease: 'power2.out',
      })
        .from(
          '.ai-card-item',
          {
            opacity: 0,
            y: 25,
            stagger: 0.12,
            duration: 0.7,
            ease: 'power2.out',
          },
          '-=0.4'
        )
        .from(
          '.metric-bar-fill',
          {
            width: '0%',
            stagger: 0.08,
            duration: 0.9,
            ease: 'power2.out',
          },
          '-=0.3'
        );
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="ai-inspection"
      ref={sectionRef}
      style={{
        paddingTop: 'clamp(54px, 7vw, 90px)',
        paddingBottom: 'clamp(54px, 7vw, 90px)',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ maxWidth: '1240px' }}>
        {/* Floating Panoramic Banner Card */}
        <div
          ref={bannerRef}
          className="ai-main-banner"
          style={{
            position: 'relative',
            borderRadius: '26px',
            background:
              'linear-gradient(108deg, #EBD5BE 0%, #DEC3AC 33%, #683058 54%, #26042B 72%, #1E0223 100%)',
            border: '1.5px solid rgba(220, 185, 240, 0.5)',
            boxShadow: '0 24px 60px -15px rgba(27, 2, 42, 0.35), 0 0 0 1px rgba(220, 185, 240, 0.25)',
            padding: 'clamp(28px, 3.5vw, 40px) clamp(24px, 3.2vw, 44px)',
            overflow: 'hidden',
          }}
        >
          {/* Mountain Highway Fog Atmosphere on Left */}
          <img
            src="/ai-inspection/mountain-fog-road.jpg"
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '46%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'bottom left',
              opacity: 0.2,
              mixBlendMode: 'multiply',
              pointerEvents: 'none',
              maskImage: 'linear-gradient(to right, black 35%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 35%, transparent 100%)',
            }}
          />

          {/* Banner Layout Split: Left Content + Right 3 Cards */}
          <div className="ai-banner-grid">
            {/* Left Column Content */}
            <div className="ai-left-column">
              {/* Powered By AI Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <AiSparkleIcon size={15} color="#2B0A33" />
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: '#2B0A33',
                    textTransform: 'uppercase',
                  }}
                >
                  POWERED BY AI
                </span>
              </div>

              {/* Heading */}
              <h2
                style={{
                  fontFamily: 'var(--font-family-display, sans-serif)',
                  fontSize: 'clamp(1.9rem, 2.6vw, 2.4rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.15,
                  color: '#2B0A33',
                  margin: '0 0 14px 0',
                }}
              >
                Smarter Cars <br />
                Safer Journeys
              </h2>

              {/* Description text */}
              <p
                style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  color: '#533256',
                  maxWidth: '235px',
                  margin: '0 0 28px 0',
                }}
              >
                Advanced AI solutions to keep your fleet safer, healthier and more efficient.
              </p>

              {/* Learn More Action Button */}
              <button
                type="button"
                className="ai-learn-more-btn"
                onClick={() => {
                  const target = document.getElementById('how-it-works');
                  target?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#FAB826',
                  color: '#2B0A33',
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(250, 184, 38, 0.38)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  width: 'fit-content',
                }}
              >
                <span>Learn More</span>
                <ArrowRight size={14} color="#2B0A33" strokeWidth={2.5} />
              </button>
            </div>

            {/* Right Column: 3 Feature Cards */}
            <div className="ai-cards-container">
              {/* Card 1: AI Damage */}
              <div className="ai-card-item ai-card-side">
                {/* Edge-to-edge top image */}
                <img
                  src="/ai-inspection/card-damage-scan@2x.png"
                  alt="AI Damage Detection"
                  loading="lazy"
                  className="ai-card-top-image"
                />

                <div className="ai-card-body">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
                      <EmbossedBadge>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#C593F7"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="5" width="20" height="14" rx="4" />
                          <path d="M12 9v6M9 12h6" />
                          <circle cx="12" cy="12" r="1.5" fill="#C593F7" />
                        </svg>
                      </EmbossedBadge>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#FFFFFF' }}>
                        AI Damage
                      </h3>
                    </div>

                    <p className="ai-card-desc">
                      Automatically detect and assess vehicle damages from photos using AI.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="ai-scan-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#3C1246',
                      border: '1px solid rgba(195, 120, 240, 0.35)',
                      borderRadius: '9999px',
                      padding: '5px 13px',
                      color: '#E6D2F4',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: 'fit-content',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>Scan &amp; Detect</span>
                    <ArrowRight size={11} color="#E6D2F4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Card 2: Inspection Fleet Health (Center Prominent) */}
              <div className="ai-card-item ai-card-center">
                {/* Edge-to-edge top image */}
                <img
                  src="/ai-inspection/card-fleet-health@2x.png"
                  alt="Inspection Fleet Health Telemetry"
                  loading="lazy"
                  className="ai-card-top-image ai-center-image"
                />

                <div className="ai-card-body ai-center-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
                    <EmbossedBadge>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#C593F7"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        <path d="M3.22 12H9.5l1.5-3 2 6.5 1.5-3.5h6.28" />
                      </svg>
                    </EmbossedBadge>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Inspection Fleet Health
                    </h3>
                  </div>

                  <p className="ai-card-desc">
                    Monitor fleet condition, service status and overall vehicle health.
                  </p>

                  {/* Telemetry Progress Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: 'auto' }}>
                    {FLEET_METRICS.map((metric) => (
                      <div
                        key={metric.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'rgba(255, 255, 255, 0.65)',
                            width: '40px',
                            flexShrink: 0,
                          }}
                        >
                          {metric.label}
                        </span>

                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: '#35103F',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            className="metric-bar-fill"
                            style={{
                              width: `${metric.percent}%`,
                              height: '100%',
                              backgroundColor: '#8E70E8',
                              borderRadius: '9999px',
                            }}
                          />
                        </div>

                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.85)',
                            width: '30px',
                            textAlign: 'right',
                            flexShrink: 0,
                          }}
                        >
                          {metric.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Distributor Claimer */}
              <div className="ai-card-item ai-card-side">
                {/* Edge-to-edge top image */}
                <img
                  src="/ai-inspection/card-distributor-claimer@2x.png"
                  alt="Distributor Claimer"
                  loading="lazy"
                  className="ai-card-top-image"
                />

                <div className="ai-card-body">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
                      <EmbossedBadge>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#C593F7"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="5" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </EmbossedBadge>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#FFFFFF' }}>
                        Distributor Claimer
                      </h3>
                    </div>

                    <p className="ai-card-desc">
                      Simplify and verify distributor or insurance claim processes with AI.
                    </p>
                  </div>

                  {/* Claim Verified Status Pill */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#1B3528',
                      border: '1px solid rgba(74, 222, 128, 0.35)',
                      borderRadius: '9999px',
                      padding: '4px 11px',
                      color: '#4ADE80',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      width: 'fit-content',
                    }}
                  >
                    <span
                      style={{
                        width: '13px',
                        height: '13px',
                        borderRadius: '50%',
                        backgroundColor: '#4ADE80',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1B3528',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={9} strokeWidth={3} />
                    </span>
                    <span>Claim Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ai-banner-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: clamp(20px, 2.8vw, 36px);
          align-items: center;
        }
        .ai-cards-container {
          display: grid;
          grid-template-columns: 1fr 1.25fr 1fr;
          gap: 16px;
          align-items: center;
        }
        .ai-card-item {
          background-color: #24032B;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .ai-card-side {
          border: 1.5px solid #6E267A;
          min-height: 310px;
        }
        .ai-card-center {
          border: 1.5px solid #943EC0;
          box-shadow: 0 16px 40px rgba(12, 1, 16, 0.6);
          min-height: 365px;
        }
        .ai-card-item:hover {
          transform: translateY(-4px);
        }
        .ai-card-top-image {
          width: 100%;
          height: 120px;
          object-fit: cover;
          display: block;
        }
        .ai-center-image {
          height: 140px;
        }
        .ai-card-body {
          padding: 13px 14px 15px 14px;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-between;
        }
        .ai-center-body {
          padding: 15px 16px 17px 16px;
        }
        .ai-card-desc {
          font-size: 0.76rem;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.72);
          margin: 0 0 12px 0;
        }
        .ai-learn-more-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(250, 184, 38, 0.48);
        }
        .ai-scan-btn:hover {
          background-color: #4C1758 !important;
          border-color: rgba(195, 120, 240, 0.55) !important;
          color: #FFFFFF !important;
        }

        @media (max-width: 1120px) {
          .ai-banner-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .ai-left-column {
            max-width: 440px;
          }
        }
        @media (max-width: 768px) {
          .ai-cards-container {
            grid-template-columns: 1fr;
            max-width: 320px;
            margin: 0 auto;
            gap: 18px;
          }
          .ai-card-center {
            min-height: auto;
          }
          .ai-card-side {
            min-height: auto;
          }
        }
      `}</style>
    </section>
  );
}
