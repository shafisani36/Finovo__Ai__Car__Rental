import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { HOW_IT_WORKS_STEPS } from '../data/homepageData';
import { StepCard } from '../components/StepCard';

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

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
          gsap.set(['.how-it-works-header', '.how-it-works-item'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from('.how-it-works-header', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power2.out',
      }).from(
        '.how-it-works-item',
        {
          opacity: 0,
          y: 35,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out',
        },
        '-=0.4'
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      style={{
        paddingTop: 'clamp(64px, 7vw, 96px)',
        paddingBottom: 'clamp(64px, 7vw, 96px)',
        backgroundColor: '#D9C1A7',
      }}
    >
      <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 32px)' }}>
        {/* Split Header matching Figma */}
        <div
          className="how-it-works-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            marginBottom: '44px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left Title */}
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                fontSize: 'clamp(2.1rem, 3.4vw, 2.75rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#30073B',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              How It Works
            </h2>
          </div>

          {/* Right Accent Bar + Two-Line Text */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              maxWidth: '460px',
            }}
          >
            {/* Vertical Purple Accent Bar */}
            <div
              style={{
                width: '3.5px',
                height: '42px',
                backgroundColor: '#450F4F',
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />

            {/* Subtitle */}
            <p
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
                color: '#38063D',
                lineHeight: 1.48,
                margin: 0,
                fontWeight: 500,
              }}
            >
              Find your perfect rental car in just a few simple steps —
              <br />
              search, choose, book, and drive with ease.
            </p>
          </div>
        </div>

        {/* 3 Step Cards Grid */}
        <div
          className="how-it-works-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'clamp(18px, 2.5vw, 28px)',
          }}
        >
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <div key={step.id} className="how-it-works-item">
              <StepCard step={step} index={index} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) and (min-width: 769px) {
          .how-it-works-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .how-it-works-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            margin-bottom: 32px !important;
          }
        }
        @media (max-width: 768px) {
          .how-it-works-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 14px !important;
          }
          .how-it-works-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            margin-bottom: 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
