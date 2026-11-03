import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FAQ_ITEMS } from '../data/homepageData';
import { Button } from '../../../components/common/Button';
import { HelpCircle, Mail, Phone, Plus } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeFaqId, setActiveFaqId] = useState<string>(FAQ_ITEMS[0].id);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
      });

      tl.from('.faq-header-anim', {
        opacity: 0,
        y: 24,
        duration: 0.75,
        ease: 'power2.out',
        clearProps: 'transform',
      });

      tl.from(
        '.faq-box-anim',
        {
          opacity: 0,
          y: 35,
          stagger: 0.12,
          duration: 0.85,
          ease: 'power2.out',
          clearProps: 'transform',
        },
        '-=0.4'
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="faq-section"
      style={{
        paddingTop: 'clamp(64px, 8vw, 104px)',
        paddingBottom: 'clamp(64px, 8vw, 104px)',
        backgroundColor: '#330231',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
        {/* Section Header matching User Specification */}
        <div className="faq-header-anim" style={{ marginBottom: 'clamp(36px, 5vw, 52px)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              fontSize: 'clamp(2.1rem, 3.8vw, 3rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              marginBottom: '12px',
            }}
          >
            Frequently Asked Questions
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
              fontSize: 'clamp(0.98rem, 1.25vw, 1.12rem)',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.82)',
              maxWidth: '680px',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Everything you need to know about our fleet, insurance coverage, and AI inspection technology.
          </p>
        </div>

        {/* FAQ Grid: Left Support Card + Right Horizontal/Vertical Accordion */}
        <div
          className="faq-layout-grid"
          style={{
            display: 'grid',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {/* Left Support Card (Warm Sand) matching Figma */}
          <div
            className="faq-box-anim faq-support-card"
            style={{
              backgroundColor: '#DFC6AD',
              borderRadius: '26px',
              padding: 'clamp(28px, 4vw, 36px)',
              color: '#341C07',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '440px',
              position: 'relative',
            }}
          >
            <div>
              {/* Top Badge Icon */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#330231',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '22px',
                  boxShadow: '0 4px 14px rgba(51, 2, 49, 0.25)',
                }}
              >
                <HelpCircle size={24} color="#F5B716" />
              </div>

              <h3
                style={{
                  fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#341C07',
                  lineHeight: 1.25,
                  marginBottom: '12px',
                  letterSpacing: '-0.015em',
                }}
              >
                Have Any Question?
              </h3>

              <p
                style={{
                  fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                  fontSize: '0.92rem',
                  fontWeight: 500,
                  color: '#583214',
                  lineHeight: 1.6,
                  marginBottom: '26px',
                }}
              >
                Can't find what you are looking for? Our 24/7 dedicated support team is available around the clock.
              </p>

              {/* Direct Contact Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                <a
                  href="tel:+18005553466"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#341C07',
                    textDecoration: 'none',
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Phone size={16} color="#330231" />
                  <span>+1 (800) 555-FINOVO</span>
                </a>
                <a
                  href="mailto:support@finovorentals.com"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#341C07',
                    textDecoration: 'none',
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Mail size={16} color="#330231" />
                  <span>support@finovorentals.com</span>
                </a>
              </div>
            </div>

            <Button
              variant="dark"
              size="md"
              fullWidth
              onClick={() => {
                window.location.href = 'mailto:support@finovorentals.com';
              }}
              style={{
                backgroundColor: '#330231',
                color: '#FFFFFF',
                fontWeight: 700,
                borderRadius: '9999px',
                padding: '14px 24px',
                boxShadow: '0 8px 20px rgba(51, 2, 49, 0.25)',
              }}
            >
              Contact Us
            </Button>
          </div>

          {/* Right: Desktop Horizontal Expanding Accordion (with silky smooth opening/closing transitions) */}
          <div
            className="faq-box-anim faq-accordion-desktop"
            style={{
              display: 'flex',
              gap: '14px',
              minHeight: '440px',
              height: '100%',
              alignItems: 'stretch',
            }}
          >
            {FAQ_ITEMS.map((item, index) => {
              const isActive = activeFaqId === item.id;

              return (
                <div
                  key={item.id}
                  className={`faq-panel-card ${isActive ? 'is-active' : 'is-collapsed'}`}
                  onClick={() => setActiveFaqId(item.id)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    cursor: isActive ? 'default' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    height: '100%',
                    minHeight: '440px',
                    boxShadow: isActive
                      ? '0 20px 42px rgba(0, 0, 0, 0.28)'
                      : '0 6px 18px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition:
                      'flex 0.5s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, transform 0.25s ease',
                  }}
                >
                  {/* COLLAPSED VIEW LAYER (Smoothly fades out as card expands) */}
                  <div
                    className="faq-collapsed-layer"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '28px 8px',
                      opacity: isActive ? 0 : 1,
                      pointerEvents: isActive ? 'none' : 'auto',
                      transition: 'opacity 0.2s ease',
                      zIndex: 1,
                    }}
                  >
                    {/* Index Number */}
                    <span
                      style={{
                        fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: '#330231',
                        letterSpacing: '0.02em',
                      }}
                    >
                      0{index + 1}
                    </span>

                    {/* Vertical Question Header matching Figma */}
                    <div
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#330231',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.01em',
                        userSelect: 'none',
                      }}
                    >
                      {item.question}
                    </div>

                    {/* Plus Icon with smooth rotation */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#F5B716',
                        color: '#330231',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(245, 183, 22, 0.35)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <Plus size={16} strokeWidth={2.8} />
                    </div>
                  </div>

                  {/* EXPANDED VIEW LAYER (Delayed fade-in to prevent layout reflow while expanding) */}
                  <div
                    className="faq-expanded-layer"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '34px 30px',
                      opacity: isActive ? 1 : 0,
                      pointerEvents: isActive ? 'auto' : 'none',
                      transition: isActive
                        ? 'opacity 0.35s ease 0.16s'
                        : 'opacity 0.15s ease',
                      zIndex: 2,
                      minWidth: '320px',
                    }}
                  >
                    <div>
                      {/* Top Row: Pill Badge + Animated Toggle Button */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '20px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            padding: '5px 12px',
                            backgroundColor: 'rgba(245, 183, 22, 0.18)',
                            color: '#9E6D00',
                            borderRadius: '9999px',
                            letterSpacing: '0.04em',
                          }}
                        >
                          FAQ 0{index + 1}
                        </span>

                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#330231',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: 'rotate(45deg)',
                            transition: 'transform 0.3s ease, background-color 0.2s ease',
                            cursor: 'pointer',
                          }}
                          aria-label="Active question indicator"
                        >
                          <Plus size={16} strokeWidth={2.8} />
                        </div>
                      </div>

                      {/* Question Heading */}
                      <h4
                        style={{
                          fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                          fontSize: '1.3rem',
                          fontWeight: 800,
                          color: '#330231',
                          lineHeight: 1.3,
                          letterSpacing: '-0.02em',
                          marginBottom: '16px',
                        }}
                      >
                        {item.question}
                      </h4>

                      {/* Answer Body Text */}
                      <p
                        style={{
                          fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                          fontSize: '0.94rem',
                          fontWeight: 500,
                          color: '#4B2A56',
                          lineHeight: 1.68,
                          margin: 0,
                        }}
                      >
                        {item.answer}
                      </p>
                    </div>

                    {/* Bottom Helper Bar */}
                    <div
                      style={{
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(51, 2, 49, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                          fontSize: '0.78rem',
                          color: '#7D5C87',
                          fontWeight: 600,
                        }}
                      >
                        Click another tab to explore
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#F5B716',
                          backgroundColor: '#330231',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        Finovo Verified
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile & Tablet Vertical Accordion (Smooth Grid Row Expansion) */}
          <div className="faq-box-anim faq-accordion-mobile">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = activeFaqId === item.id;

              return (
                <div
                  key={item.id}
                  className={`faq-mobile-item ${isOpen ? 'is-open' : ''}`}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    boxShadow: isOpen
                      ? '0 10px 24px rgba(0, 0, 0, 0.15)'
                      : '0 4px 12px rgba(0, 0, 0, 0.08)',
                    transition: 'box-shadow 0.3s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaqId(isOpen ? '' : item.id)}
                    style={{
                      width: '100%',
                      padding: '20px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      color: '#330231',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      gap: '14px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.35,
                      }}
                    >
                      0{index + 1}. {item.question}
                    </span>

                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isOpen ? '#330231' : '#F5B716',
                        color: isOpen ? '#FFFFFF' : '#330231',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition:
                          'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.25s ease, color 0.25s ease',
                      }}
                    >
                      <Plus size={16} strokeWidth={2.8} />
                    </span>
                  </button>

                  {/* Butter-Smooth Vertical Animation Container */}
                  <div
                    className={`faq-mobile-collapse ${isOpen ? 'open' : ''}`}
                    style={{
                      display: 'grid',
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      transition: 'grid-template-rows 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          padding: '0 22px 22px 22px',
                          fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                          fontSize: '0.91rem',
                          fontWeight: 500,
                          color: '#4B2A56',
                          lineHeight: 1.62,
                          borderTop: '1px solid rgba(51, 2, 49, 0.08)',
                          paddingTop: '16px',
                          opacity: isOpen ? 1 : 0,
                          transform: isOpen ? 'translateY(0)' : 'translateY(-6px)',
                          transition:
                            'opacity 0.3s ease 0.08s, transform 0.3s ease 0.08s',
                        }}
                      >
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        /* Desktop Grid Layout: 320px support card + 1fr accordion */
        .faq-layout-grid {
          grid-template-columns: 310px 1fr;
        }

        /* Desktop Horizontal Accordion Flex Ratios */
        .faq-panel-card.is-active {
          flex: 4;
          min-width: 320px;
        }

        .faq-panel-card.is-collapsed {
          flex: 1;
          min-width: 62px;
          max-width: 74px;
        }

        .faq-panel-card.is-collapsed:hover {
          background-color: #FAF5F8 !important;
          transform: translateY(-2px);
        }

        .faq-panel-card.is-collapsed:hover .faq-collapsed-layer > div:last-child {
          transform: scale(1.08);
        }

        .faq-accordion-mobile {
          display: none;
        }

        /* Tablet & Mobile Layout: Switch to full-width Vertical Accordion with questions above support card */
        @media (max-width: 1040px) {
          .faq-layout-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
          }

          .faq-accordion-desktop {
            display: none !important;
          }

          .faq-accordion-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
            order: 1 !important;
          }

          .faq-support-card {
            order: 2 !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
