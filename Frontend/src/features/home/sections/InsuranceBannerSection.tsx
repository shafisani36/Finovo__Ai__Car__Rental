import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '../../../components/common/Button';
import { ShieldCheck, Check } from 'lucide-react';

export function InsuranceBannerSection() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: bannerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
        onComplete: () => {
          gsap.set([bannerRef.current, '.insurance-elem-anim'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from(bannerRef.current, {
        opacity: 0,
        y: 28,
        duration: 0.8,
        ease: 'power2.out',
      })
        .from(
          '.insurance-elem-anim',
          {
            opacity: 0,
            y: 18,
            stagger: 0.1,
            duration: 0.65,
            ease: 'power2.out',
          },
          '-=0.45'
        );
    },
    { scope: bannerRef }
  );

  return (
    <section style={{ paddingTop: '20px', paddingBottom: 'clamp(50px, 7vw, 90px)', backgroundColor: '#FFFFFF' }}>
      <div className="container">
        <div
          ref={bannerRef}
          style={{
            backgroundColor: '#DFC6AD',
            borderRadius: 'clamp(20px, 3.5vw, 32px)',
            padding: 'clamp(36px, 6vw, 64px) clamp(20px, 5vw, 48px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(87, 59, 30, 0.12)',
            border: '1px solid rgba(87, 59, 30, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle shield watermark */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.04,
              pointerEvents: 'none',
            }}
          >
            <ShieldCheck size={420} color="#35210D" />
          </div>

          <h2
            className="insurance-elem-anim"
            style={{
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              fontSize: 'clamp(2rem, 4vw, 2.85rem)',
              fontWeight: 800,
              color: '#341C07',
              letterSpacing: '-0.02em',
              marginBottom: '14px',
            }}
          >
            Car Insurance Banner
          </h2>

          <p
            className="insurance-elem-anim"
            style={{
              fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
              color: '#553416',
              maxWidth: '680px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            Drive with 100% peace of mind. Zero-deductible collision protection, 24/7 roadside assistance, and instant digital claim resolution included.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 'clamp(14px, 3vw, 24px)',
              marginBottom: '32px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#341C07',
            }}
          >
            {['$0 Deductible Collision', 'Glass & Tire Protection', '24/7 Rapid Replacement'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-accent-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={14} color="#1A0228" strokeWidth={3} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Button
            variant="dark"
            size="md"
            onClick={() => {
              const el = document.getElementById('search-form');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: '#1E0432',
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '14px 32px',
            }}
          >
            Explore Insurance Plans
          </Button>
        </div>
      </div>
    </section>
  );
}
