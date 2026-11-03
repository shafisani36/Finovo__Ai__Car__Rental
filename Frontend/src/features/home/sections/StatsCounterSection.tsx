import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StatConfig {
  id: string;
  label: string;
  target: number;
  suffix: string;
  displayValue: string;
  duration: number;
}

const STATS_DATA: StatConfig[] = [
  {
    id: 'cars',
    label: 'Cars in Fleet',
    target: 500,
    suffix: '+',
    displayValue: '500+',
    duration: 1.8,
  },
  {
    id: 'customers',
    label: 'Happy Customers',
    target: 10,
    suffix: 'K+',
    displayValue: '10K+',
    duration: 1.6,
  },
  {
    id: 'locations',
    label: 'Locations',
    target: 15,
    suffix: '',
    displayValue: '15',
    duration: 1.4,
  },
  {
    id: 'support',
    label: 'Customer Support',
    target: 24,
    suffix: '/7',
    displayValue: '24/7',
    duration: 1.7,
  },
];

export function StatsCounterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const numberRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        STATS_DATA.forEach((stat, idx) => {
          const el = numberRefs.current[idx];
          if (el) el.textContent = stat.displayValue;
        });
        return;
      }

      // Initialize counter text to 0
      STATS_DATA.forEach((stat, idx) => {
        const el = numberRefs.current[idx];
        if (el) el.textContent = `0${stat.suffix}`;
      });

      // Master Timeline triggered when user reaches this section
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true,
        },
      });

      // Reveal with clearProps: 'transform' so no residual Y transform remains
      tl.from('.stats-col', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform',
      });

      // Count up animation for each number
      STATS_DATA.forEach((stat, idx) => {
        const el = numberRefs.current[idx];
        if (!el) return;

        const counterObj = { current: 0 };

        tl.to(
          counterObj,
          {
            current: stat.target,
            duration: stat.duration,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = `${Math.floor(counterObj.current)}${stat.suffix}`;
            },
            onComplete: () => {
              el.textContent = stat.displayValue;
            },
          },
          0.1
        );
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="stats-counter-section"
      style={{
        backgroundColor: '#330231',
        paddingTop: 'clamp(40px, 5vw, 56px)',
        paddingBottom: 'clamp(40px, 5vw, 56px)',
        position: 'relative',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
        <div className="stats-counter-grid">
          {STATS_DATA.map((stat, idx) => (
            <div key={stat.id} className="stats-col">
              {/* Perfectly locked Y-axis label container */}
              <div className="stat-label">
                {stat.label}
              </div>

              {/* Perfectly locked Y-axis numeric value container */}
              <div
                ref={(el) => {
                  numberRefs.current[idx] = el;
                }}
                className="stat-value"
              >
                {stat.displayValue}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        /* 4 Columns locked in a single row with exact Y-axis alignment */
        .stats-counter-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          width: 100%;
          align-items: stretch;
          position: relative;
        }

        .stats-col {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding: 0 16px;
        }

        /* Fixed height & centered line-height guarantees identical Y position for all 4 labels */
        .stat-label {
          font-family: var(--font-family-sans, "Manrope", sans-serif);
          font-size: clamp(0.9rem, 1.1vw, 1.05rem);
          font-weight: 500;
          color: rgba(255, 255, 255, 0.88);
          letter-spacing: -0.01em;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          line-height: 1;
          white-space: nowrap;
        }

        /* Fixed height & centered line-height guarantees identical Y position for all 4 numbers */
        .stat-value {
          font-family: var(--font-family-display, "Archivo", sans-serif);
          font-size: clamp(2.3rem, 4vw, 3.35rem);
          font-weight: 800;
          color: #FFFFFF;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
        }

        /* Hairline vertical divider between columns, vertically centered */
        .stats-col:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 1px;
          height: 56px;
          background-color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
        }

        /* Maintain 4-in-a-row down to small tablets; scale padding smoothly */
        @media (max-width: 900px) {
          .stats-col {
            padding: 0 10px;
          }
          .stats-col:not(:last-child)::after {
            height: 48px;
          }
        }

        @media (max-width: 720px) {
          .stats-col {
            padding: 0 6px;
          }
          .stats-col:not(:last-child)::after {
            height: 42px;
          }
        }

        /* Clean 2x2 grid of rounded box cards on mobile matching Figma chunk-3 */
        @media (max-width: 768px) {
          .stats-counter-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }

          .stats-col {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 18px !important;
            padding: 20px 14px !important;
            justify-content: center !important;
          }

          .stats-col:not(:last-child)::after,
          .stats-col::after {
            display: none !important;
          }

          .stat-value {
            order: 1 !important;
            height: auto !important;
            font-size: clamp(1.8rem, 6vw, 2.3rem) !important;
            margin-bottom: 4px !important;
          }

          .stat-label {
            order: 2 !important;
            height: auto !important;
            font-size: clamp(0.76rem, 2.4vw, 0.85rem) !important;
            color: rgba(255, 255, 255, 0.72) !important;
            white-space: normal !important;
          }
        }
      `}</style>
    </section>
  );
}
