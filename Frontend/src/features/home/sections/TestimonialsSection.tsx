import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePublicReviews } from '../../../hooks/usePublicSite';
import type { TestimonialItem } from '../../../types';
import { TestimonialBubble } from '../components/TestimonialBubble';

export function TestimonialsSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  const reviews = usePublicReviews();

  // Real approved reviews only: the best one is featured, the next three are the cards.
  const { featured, others } = useMemo(() => {
    const variants: TestimonialItem['variant'][] = ['bubble-left', 'bubble-center', 'bubble-right'];
    const items: TestimonialItem[] = reviews.slice(0, 4).map((review, index) => ({
      id: review.id,
      author: review.customerName,
      role: '',
      location: review.vehicle,
      rating: Math.max(1, Math.min(5, Math.round(review.rating))),
      review: review.comment,
      avatar: '',
      variant: index === 0 ? 'featured' : variants[(index - 1) % variants.length],
    }));
    return { featured: items[0], others: items.slice(1) };
  }, [reviews]);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 78%',
          toggleActions: 'play none none none',
          once: true,
        },
        onComplete: () => {
          gsap.set(['.testimonial-featured-anim', '.testimonial-header-anim', '.testimonial-card-anim'], {
            clearProps: 'transform,opacity',
          });
        },
      });

      tl.from('.testimonial-featured-anim', {
        opacity: 0,
        y: -20,
        duration: 0.75,
        ease: 'power2.out',
      })
        .from(
          '.testimonial-header-anim',
          {
            opacity: 0,
            y: 20,
            duration: 0.75,
            ease: 'power2.out',
          },
          '-=0.45'
        )
        .from(
          '.testimonial-card-anim',
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
    { scope: sectionRef, dependencies: [featured?.id] }
  );

  // No invented testimonials: the section appears once real customers have left reviews.
  if (!featured) return null;

  return (
    <section
      ref={sectionRef}
      className="testimonials-section"
      style={{
        paddingTop: 'clamp(56px, 7vw, 92px)',
        paddingBottom: 'clamp(72px, 9vw, 120px)',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 24px' }}>
        {/* Top Floating Speech Bubble (Ahmed) - desktop only */}
        {featured && (
          <div className="testimonial-featured-anim testimonial-top-featured-wrapper desktop-featured-bubble">
            <TestimonialBubble item={featured} />
          </div>
        )}

        {/* Centered Section Header */}
        <div className="testimonial-header-anim" style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto clamp(36px, 5vw, 60px) auto' }}>
          <h2
            style={{
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#2B0739',
              lineHeight: 1.15,
              marginBottom: '12px',
            }}
          >
            {t('home.testimonials.title')}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
              fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              fontWeight: 500,
              color: '#3E1446',
              lineHeight: 1.5,
              margin: '0 auto',
              maxWidth: '560px',
            }}
          >
            {t('home.testimonials.subtitleLine1')}
            <br className="testimonial-header-br" />
            {t('home.testimonials.subtitleLine2')}
          </p>
        </div>

        {/* Testimonials Cards Grid (Carousel on Mobile) */}
        <div className="testimonials-cards-grid">
          {featured && (
            <div className="testimonial-card-anim mobile-featured-bubble">
              <TestimonialBubble item={featured} />
            </div>
          )}
          {others.map((item, index) => {
            const staggerClass =
              index === 0
                ? 'card-stagger-left'
                : index === 1
                ? 'card-stagger-center'
                : 'card-stagger-right';

            return (
              <div
                key={item.id}
                className={`testimonial-card-anim ${staggerClass}`}
              >
                <TestimonialBubble item={item} />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        /* Top featured bubble positioning */
        .testimonial-top-featured-wrapper {
          max-width: 820px;
          margin: 0 auto 28px auto;
          display: flex;
          justify-content: flex-start;
          padding-inline-start: 20px;
        }

        .mobile-featured-bubble {
          display: none;
        }

        .testimonial-featured-bubble:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 42px rgba(49, 4, 53, 0.28) !important;
        }

        /* 3 Cards Floating Grid - Perfectly aligned along the Y axis */
        .testimonials-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          max-width: 1040px;
          margin: 0 auto;
          align-items: stretch;
        }

        /* Perfect Y-axis alignment across all cards */
        .card-stagger-left,
        .card-stagger-center,
        .card-stagger-right {
          transform: translateY(0px);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .testimonial-floating-card:hover {
          transform: translateY(-4px);
        }

        .testimonial-floating-card:hover .floating-card-body {
          box-shadow: 0 18px 42px rgba(49, 4, 53, 0.22) !important;
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) and (min-width: 769px) {
          .testimonials-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .testimonial-top-featured-wrapper {
            justify-content: center;
            padding-inline-start: 0;
            margin-bottom: 24px;
          }
        }

        /* Mobile Horizontal Scroll Snap Carousel matching Figma chunk-3 */
        @media (max-width: 768px) {
          .desktop-featured-bubble {
            display: none !important;
          }
          .mobile-featured-bubble {
            display: flex !important;
            flex: 0 0 clamp(260px, 78vw, 310px) !important;
            scroll-snap-align: start !important;
          }
          .testimonials-cards-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 16px !important;
            padding-bottom: 16px !important;
            margin-inline-end: -24px;
            padding-inline-end: 24px;
            scrollbar-width: none !important;
          }
          .testimonials-cards-grid::-webkit-scrollbar {
            display: none !important;
          }
          .testimonial-card-anim {
            flex: 0 0 clamp(260px, 78vw, 310px) !important;
            scroll-snap-align: start !important;
          }
          .testimonial-header-br {
            display: none;
          }
          .testimonials-section {
            padding-bottom: 60px !important;
          }
        }
      `}</style>
    </section>
  );
}
