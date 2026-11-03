import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { BRAND_CATEGORIES } from '../data/homepageData';
import { CategoryCard } from '../components/CategoryCard';
import type { BrandCategory } from '../../../types';

interface CarCategorySectionProps {
  onCategorySelect?: (cat: BrandCategory) => void;
}

export function CarCategorySection({ onCategorySelect }: CarCategorySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
        onComplete: () => {
          gsap.set(['.category-header-anim', '.category-card-item'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from('.category-header-anim', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power2.out',
      }).from(
        '.category-card-item',
        {
          opacity: 0,
          y: 35,
          stagger: 0.1,
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
      id="categories"
      ref={sectionRef}
      style={{
        paddingTop: 'clamp(50px, 7vw, 84px)',
        paddingBottom: 'clamp(50px, 7vw, 84px)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        {/* Title and subtitle matching Figma chunk-0 */}
        <div className="category-header-anim" style={{ marginBottom: 'clamp(20px, 3.2vw, 32px)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              fontSize: 'clamp(2rem, 3.6vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#2A0845',
              lineHeight: 1.15,
              margin: '0 0 6px 0',
            }}
          >
            Car Category
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
              fontSize: 'clamp(0.85rem, 1.05vw, 0.95rem)',
              fontWeight: 500,
              color: '#654274',
              margin: 0,
            }}
          >
            Find your ride by your favorite brand
          </p>
        </div>

        {/* 4 Cards: Grid on desktop, smooth horizontal snap row on mobile */}
        <div
          className="category-cards-grid"
          style={{
            display: 'grid',
            gap: 'clamp(16px, 2.2vw, 26px)',
          }}
        >
          {BRAND_CATEGORIES.map((cat) => (
            <div key={cat.id} className="category-card-item">
              <CategoryCard category={cat} onSelect={onCategorySelect} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .category-cards-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 1024px) {
          .category-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .category-cards-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 14px !important;
            padding-bottom: 8px !important;
            margin-right: -16px;
            padding-right: 16px;
            scrollbar-width: none !important;
          }
          .category-cards-grid::-webkit-scrollbar {
            display: none !important;
          }
          .category-card-item {
            flex: 0 0 clamp(180px, 54vw, 220px) !important;
            scroll-snap-align: start !important;
          }
        }
      `}</style>
    </section>
  );
}
