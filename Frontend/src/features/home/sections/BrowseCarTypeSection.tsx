import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { FEATURED_CARS } from '../data/homepageData';
import { CarCard } from '../components/CarCard';
import { ArrowRight } from 'lucide-react';
import type { FeaturedCar } from '../../../types';
import { vehiclesApi } from '../../../api/services/vehicles.api';
import { getCarImage, resolveVehiclePricing } from '../../../utils/carImageHelper';

interface BrowseCarTypeSectionProps {
  onRentCar?: (car: FeaturedCar) => void;
}

export function BrowseCarTypeSection({ onRentCar }: BrowseCarTypeSectionProps) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [featuredCars, setFeaturedCars] = useState<FeaturedCar[]>(FEATURED_CARS);

  useEffect(() => {
    let mounted = true;
    vehiclesApi
      .list({ limit: 8, status: 'AVAILABLE' })
      .then((res) => {
        if (!mounted || !res?.vehicles?.length) return;
        const distinct: FeaturedCar[] = [];
        const seenCat = new Set<string>();
        const ordered = [...res.vehicles];

        // Pick up to 4 diverse body categories/models first for showcase variety
        for (const v of ordered) {
          const catName = v.category?.name || 'Sedan';
          if (distinct.length < 4 && (!seenCat.has(catName) || ordered.length <= 4)) {
            seenCat.add(catName);
            const pricing = resolveVehiclePricing(v);
            distinct.push({
              id: v.id,
              name: `${v.brand} ${v.model}`,
              subtitle: catName.toUpperCase(),
              year: v.year || 2026,
              type: catName,
              dailyRate: pricing.dailyRate,
              priceDisplay: `$${pricing.dailyRate}`,
              rating: 5,
              image: getCarImage(v),
              specs: {
                transmission: v.transmission === 'MANUAL' ? 'Manual' : 'Automatic',
                fuelType: v.fuelType
                  ? v.fuelType.charAt(0) + v.fuelType.slice(1).toLowerCase()
                  : 'Petrol',
                hp: v.horsePower ? `${v.horsePower} HP` : '255 HP',
                drivetrain: v.drivetrain || 'AWD',
                seats: v.seats || 5,
                luggage: 3,
              },
              featured: true,
            });
          }
        }
        // Top up to 4 if fewer distinct categories matched
        for (const v of ordered) {
          if (distinct.length >= 4) break;
          if (!distinct.some((d) => d.id === v.id)) {
            const catName = v.category?.name || 'Sedan';
            const pricing = resolveVehiclePricing(v);
            distinct.push({
              id: v.id,
              name: `${v.brand} ${v.model}`,
              subtitle: catName.toUpperCase(),
              year: v.year || 2026,
              type: catName,
              dailyRate: pricing.dailyRate,
              priceDisplay: `$${pricing.dailyRate}`,
              rating: 5,
              image: getCarImage(v),
              specs: {
                transmission: v.transmission === 'MANUAL' ? 'Manual' : 'Automatic',
                fuelType: v.fuelType
                  ? v.fuelType.charAt(0) + v.fuelType.slice(1).toLowerCase()
                  : 'Petrol',
                hp: v.horsePower ? `${v.horsePower} HP` : '255 HP',
                drivetrain: v.drivetrain || 'AWD',
                seats: v.seats || 5,
                luggage: 3,
              },
              featured: true,
            });
          }
        }
        if (distinct.length > 0) setFeaturedCars(distinct);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
          gsap.set(['.browse-header-anim', '.browse-car-item'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from('.browse-header-anim', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power2.out',
      }).from(
        '.browse-car-item',
        {
          opacity: 0,
          y: 35,
          stagger: 0.1,
          duration: 0.75,
          ease: 'power2.out',
        },
        '-=0.4'
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="browse-cars"
      ref={sectionRef}
      style={{
        paddingTop: 'clamp(54px, 7vw, 84px)',
        paddingBottom: 'clamp(64px, 8vw, 96px)',
        backgroundColor: '#330231',
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        {/* Section Header Row */}
        <div
          className="browse-header-anim"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: 'clamp(32px, 4.5vw, 48px)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              fontSize: 'clamp(2rem, 3.4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              lineHeight: 1.15,
              margin: 0,
            }}
            >
              {t('home.browseCars.title')}
            </h2>

            <a
              href="/cars"
              className="browse-all-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                }}
              >
                {t('home.browseCars.viewAll')}
              </span>
              <span
                className="arrow-circle"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                }}
              >
                <ArrowRight size={14} color="#330231" strokeWidth={2.6} className="rtl-mirror-arrow" />
              </span>
            </a>
        </div>

        {/* Cars Grid (4 Columns) */}
        <div className="browse-cars-grid">
          {featuredCars.map((car) => (
            <div key={car.id} className="browse-car-item">
              <CarCard car={car} onRent={onRentCar} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .browse-cars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: clamp(16px, 2.2vw, 32px);
          width: 100%;
        }
        .browse-all-link:hover .arrow-circle {
          transform: translateX(3px);
        }
        @media (max-width: 1040px) {
          .browse-cars-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }
        @media (max-width: 768px) {
          .browse-cars-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 16px !important;
            padding-bottom: 12px !important;
            margin-inline-end: -16px;
            padding-inline-end: 16px;
            scrollbar-width: none !important;
          }
          .browse-cars-grid::-webkit-scrollbar {
            display: none !important;
          }
          .browse-car-item {
            flex: 0 0 clamp(240px, 72vw, 290px) !important;
            scroll-snap-align: start !important;
          }
        }
      `}</style>
    </section>
  );
}
