import { useState } from 'react';
import type { HowItWorksStep } from '../../../types';

interface StepCardProps {
  step: HowItWorksStep;
  index: number;
}

export function StepCard({ step, index }: StepCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Alternating layout: Card 2 has visual on TOP, Cards 1 & 3 have visual on BOTTOM
  const isVisualTop = index === 1;

  const imageSrc = [
    '/how-it-works/step-1-search.png',
    '/how-it-works/step-2-choose.png',
    '/how-it-works/step-3-composite.png',
  ][index] || step.image;

  const imageSrcSet = [
    '/how-it-works/step-1-search.png 1x, /how-it-works/step-1-search@2x.png 2x',
    '/how-it-works/step-2-choose.png 1x, /how-it-works/step-2-choose@2x.png 2x',
    '/how-it-works/step-3-composite.png 1x, /how-it-works/step-3-composite@2x.png 2x',
  ][index];

  return (
    <div
      className={`how-it-works-card how-it-works-card-${index + 1}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#E6CCB1',
        borderRadius: '26px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 18px 36px rgba(50, 15, 5, 0.12)'
          : '0 6px 18px rgba(50, 15, 5, 0.04)',
      }}
    >
      {/* Desktop Layout */}
      <div className="step-card-desktop-layout">
        {/* Visual at TOP for Card 2 */}
        {isVisualTop && (
          <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0 }}>
            <img
              src={imageSrc}
              srcSet={imageSrcSet}
              alt={step.title}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHovered ? 'scale(1.03)' : 'scale(1)',
              }}
            />
          </div>
        )}

        {/* Text block */}
        <div
          style={{
            padding: isVisualTop ? '20px 20px 26px 20px' : '26px 20px 16px 20px',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-family-display)',
              fontSize: 'clamp(1.22rem, 1.6vw, 1.38rem)',
              fontWeight: 700,
              color: '#30073B',
              letterSpacing: '-0.015em',
              margin: '0 0 6px 0',
            }}
          >
            {step.title}
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'clamp(0.82rem, 0.95vw, 0.88rem)',
              color: '#461E4E',
              lineHeight: 1.45,
              maxWidth: '225px',
              margin: '0 auto',
              fontWeight: 500,
            }}
          >
            {step.description}
          </p>
        </div>

        {/* Visual at BOTTOM for Cards 1 & 3 */}
        {!isVisualTop && (
          <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, marginTop: 'auto' }}>
            <img
              src={imageSrc}
              srcSet={imageSrcSet}
              alt={step.title}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHovered ? 'scale(1.03)' : 'scale(1)',
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile Horizontal Layout matching Figma chunk-3 */}
      <div className="step-card-mobile-layout">
        <div className="step-card-mobile-image-wrap">
          <img
            src={imageSrc}
            alt={step.title}
            className="step-card-mobile-image"
          />
        </div>
        <div className="step-card-mobile-info">
          <div className="step-card-mobile-badge">
            0{index + 1}
          </div>
          <h3 className="step-card-mobile-title">
            {step.title}
          </h3>
          <p className="step-card-mobile-desc">
            {step.description}
          </p>
        </div>
      </div>

      <style>{`
        .step-card-mobile-layout {
          display: none;
        }
        .step-card-desktop-layout {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          width: 100%;
        }
        @media (max-width: 768px) {
          .how-it-works-card {
            border-radius: 20px !important;
            padding: 14px 16px !important;
          }
          .step-card-desktop-layout {
            display: none !important;
          }
          .step-card-mobile-layout {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            width: 100% !important;
          }
          .step-card-mobile-image-wrap {
            width: 36% !important;
            max-width: 120px !important;
            flex-shrink: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .step-card-mobile-image {
            width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
          }
          .step-card-mobile-info {
            display: flex !important;
            flex-direction: column !important;
            text-align: left !important;
            flex: 1 !important;
          }
          .step-card-mobile-badge {
            font-family: var(--font-family-display, sans-serif);
            font-size: 0.75rem;
            font-weight: 800;
            color: #7A3D1E;
            margin-bottom: 2px;
          }
          .step-card-mobile-title {
            font-family: var(--font-family-display, sans-serif);
            font-size: 1.05rem;
            font-weight: 700;
            color: #30073B;
            letter-spacing: -0.015em;
            margin: 0 0 4px 0;
            line-height: 1.2;
          }
          .step-card-mobile-desc {
            font-family: var(--font-family-sans, sans-serif);
            font-size: 0.76rem;
            color: #461E4E;
            line-height: 1.38;
            margin: 0;
            font-weight: 500;
          }
        }
      `}</style>
    </div>
  );
}
