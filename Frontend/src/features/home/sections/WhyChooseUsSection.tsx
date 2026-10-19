import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { WHY_CHOOSE_US_ITEMS } from '../data/homepageData';
import { WhyChooseUsCard } from '../components/WhyChooseUsCard';

export function WhyChooseUsSection() {
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
          gsap.set(['.why-choose-us-header', '.why-us-grid-item'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from('.why-choose-us-header', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power2.out',
      }).from(
        '.why-us-grid-item',
        {
          opacity: 0,
          y: 35,
          stagger: 0.12,
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
      id="why-us"
      ref={sectionRef}
      style={{
        paddingTop: 'clamp(64px, 7vw, 96px)',
        paddingBottom: 'clamp(64px, 7vw, 96px)',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 32px)' }}>
        {/* Split Header matching Figma */}
        <div
          className="why-choose-us-header"
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
                color: '#25052D',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Why Choose Us
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
                backgroundColor: '#3E0847',
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
                color: '#38063D',
                lineHeight: 1.48,
                margin: 0,
                fontWeight: 500,
              }}
            >
              Enjoy a seamless rental experience with insured cars,
              <br />
              transparent pricing, and support whenever you need it.
            </p>
          </div>
        </div>

        {/* 2x2 Bento Grid */}
        <div
          className="why-choose-us-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
          }}
        >
          {WHY_CHOOSE_US_ITEMS.map((item, index) => (
            <div key={item.id} className="why-us-grid-item">
              <WhyChooseUsCard item={item} index={index} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) and (min-width: 769px) {
          .why-choose-us-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .why-choose-us-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            margin-bottom: 32px !important;
          }
        }
        @media (max-width: 768px) {
          .why-choose-us-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .why-choose-us-header {
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
