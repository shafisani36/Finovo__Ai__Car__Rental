import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WhyChooseUsItem } from '../../../types';
import { MapPin, ShieldCheck, Sparkles, Headphones } from 'lucide-react';

interface WhyChooseUsCardProps {
  item: WhyChooseUsItem;
  index: number;
}

export function WhyChooseUsCard({ item, index }: WhyChooseUsCardProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const cardNum = index + 1;
  const title = t(`home.whyChooseUs.feature${cardNum}Title`, { defaultValue: item.title });
  const description = t(`home.whyChooseUs.feature${cardNum}Desc`, { defaultValue: item.description });

  // Desktop asymmetrical corner radii per card using logical corners so RTL mirrors organically
  const desktopRadius = [
    '56px 20px 20px 20px',
    '20px 76px 20px 20px',
    '20px 20px 20px 72px',
    '20px 20px 48px 20px',
  ][index] || '24px';

  const cardBackgrounds = [
    `radial-gradient(circle at 26% 88%, rgba(228, 208, 196, 0.45) 0%, rgba(186, 155, 158, 0.2) 35%, transparent 70%), linear-gradient(135deg, #2A0230 0%, #3B0543 40%, #5B2B50 65%, #DFCDC0 100%)`,
    `repeating-linear-gradient(45deg, transparent, transparent 32px, rgba(255, 255, 255, 0.035) 32px, rgba(255, 255, 255, 0.035) 64px), linear-gradient(135deg, #2E0334 0%, #460A50 42%, #7B4972 68%, #DFCCC0 100%)`,
    `radial-gradient(circle at 62% 95%, rgba(225, 203, 190, 0.95) 0%, rgba(180, 148, 150, 0.65) 45%, rgba(48, 5, 54, 0.98) 78%), linear-gradient(180deg, #2E0334 0%, #3B0643 45%, #E6D2C6 100%)`,
    `radial-gradient(circle at 35% 85%, rgba(224, 205, 194, 0.95) 0%, rgba(175, 142, 148, 0.65) 45%, rgba(46, 4, 52, 0.98) 78%), linear-gradient(135deg, #2E0334 0%, #3B0643 50%, #DFCDC0 100%)`,
  ][index] || '#2E0334';

  return (
    <div
      className={`why-us-card why-us-card-${cardNum}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: cardBackgrounds,
        height: '255px',
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(32, 4, 40, 0.28)'
          : '0 8px 24px rgba(32, 4, 40, 0.12)',
      }}
    >
      {/* CARD 1: Find cars near you instantly */}
      {index === 0 && (
        <>
          <div
            className="card-1-header"
            style={{
              position: 'absolute',
              top: '20px',
              insetInlineEnd: '24px',
              maxWidth: '335px',
              zIndex: 10,
              textAlign: 'start',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-family-display)',
                fontSize: 'clamp(1.22rem, 1.7vw, 1.4rem)',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                margin: '0 0 6px 0',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 'clamp(0.82rem, 1vw, 0.88rem)',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>

          <svg
            width="260"
            height="180"
            viewBox="0 0 260 180"
            style={{
              position: 'absolute',
              insetInlineStart: '10px',
              bottom: '-25px',
              pointerEvents: 'none',
              opacity: 0.85,
            }}
          >
            <circle cx="120" cy="120" r="30" fill="none" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="1.2" />
            <circle cx="120" cy="120" r="62" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="1.2" />
            <circle cx="120" cy="120" r="98" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" />
            <circle cx="120" cy="120" r="140" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.2" />
          </svg>

          <div
            style={{
              position: 'absolute',
              insetInlineStart: '118px',
              bottom: '22px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(215, 192, 180, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8F6E60" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" fill="#8F6E60" />
            </svg>
          </div>

          <div
            className="user-pill user-pill-1"
            style={{
              position: 'absolute',
              top: '80px',
              insetInlineStart: '20px',
              background: '#FFFFFF',
              borderRadius: '9999px',
              paddingBlock: '3px',
              paddingInlineStart: '3px',
              paddingInlineEnd: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
              zIndex: 8,
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            <img
              src="/why-choose-us/avatar-zion.png"
              alt="Zion Lark"
              style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#26042E', lineHeight: 1.2 }}>Zion Lark</span>
              <span style={{ fontSize: '9px', color: '#7A607C', lineHeight: 1.2 }}>
                <span style={{ color: '#FF8A00', marginInlineEnd: '3px' }}>•</span>
                {t('home.whyChooseUs.away5km')}
              </span>
            </div>
          </div>

          <div
            className="user-pill user-pill-2"
            style={{
              position: 'absolute',
              top: '118px',
              insetInlineStart: 'clamp(145px, 32%, 175px)',
              background: '#FFFFFF',
              borderRadius: '9999px',
              paddingBlock: '3px',
              paddingInlineStart: '3px',
              paddingInlineEnd: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
              zIndex: 8,
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            <img
              src="/why-choose-us/avatar-larkin.png"
              alt="Larkin"
              style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#26042E', lineHeight: 1.2 }}>Larkin</span>
              <span style={{ fontSize: '9px', color: '#7A607C', lineHeight: 1.2 }}>
                <span style={{ color: '#FF8A00', marginInlineEnd: '3px' }}>•</span>
                {t('home.whyChooseUs.away35m')}
              </span>
            </div>
          </div>

          <div
            className="user-pill user-pill-3"
            style={{
              position: 'absolute',
              bottom: '18px',
              insetInlineStart: '16px',
              background: '#FFFFFF',
              borderRadius: '9999px',
              paddingBlock: '3px',
              paddingInlineStart: '3px',
              paddingInlineEnd: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
              zIndex: 8,
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            <img
              src="/why-choose-us/avatar-remi.png"
              alt="Remi"
              style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#26042E', lineHeight: 1.2 }}>Remi</span>
              <span style={{ fontSize: '9px', color: '#7A607C', lineHeight: 1.2 }}>
                <span style={{ color: '#FF8A00', marginInlineEnd: '3px' }}>•</span>
                {t('home.whyChooseUs.away55m')}
              </span>
            </div>
          </div>

          <div
            className="why-us-car-wrap"
            style={{
              position: 'absolute',
              insetInlineEnd: '-12px',
              bottom: '0px',
              width: 'clamp(210px, 48%, 270px)',
              pointerEvents: 'none',
              zIndex: 5,
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            <img
              src="/cars/car-3-corolla-transparent.png"
              alt="Toyota Corolla"
              className="why-us-car-img"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 12px 20px rgba(24, 3, 30, 0.45))',
              }}
            />
          </div>
        </>
      )}

      {/* CARD 2: Simple plans with no hidden fees */}
      {index === 1 && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '20px',
              insetInlineStart: '26px',
              insetInlineEnd: '26px',
              zIndex: 10,
              textAlign: 'start',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-family-display)',
                fontSize: 'clamp(1.22rem, 1.7vw, 1.4rem)',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                margin: '0 0 6px 0',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 'clamp(0.82rem, 1vw, 0.88rem)',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>

          {/* Card A: Transparent Pricing */}
          <div
            className="frosted-plan-card frosted-plan-card-1"
            style={{
              position: 'absolute',
              top: '102px',
              insetInlineStart: '26px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              paddingBlock: '8px',
              paddingInlineStart: '10px',
              paddingInlineEnd: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(38, 5, 46, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              zIndex: 6,
              transition: 'transform 0.35s ease',
              transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#3B0643',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(59, 6, 67, 0.3)',
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <path d="M9 16l3-2 3 2" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#26042E', lineHeight: 1.25 }}>
                {t('home.whyChooseUs.feature2Sub1Title')}
              </span>
              <span style={{ fontSize: '11px', color: '#66436C', lineHeight: 1.25 }}>
                {t('home.whyChooseUs.feature2Sub1Desc')}
              </span>
            </div>
          </div>

          {/* Card B: Flexible Plans */}
          <div
            className="frosted-plan-card frosted-plan-card-2"
            style={{
              position: 'absolute',
              top: '162px',
              insetInlineEnd: '26px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              paddingBlock: '8px',
              paddingInlineStart: '10px',
              paddingInlineEnd: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(38, 5, 46, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              zIndex: 7,
              transition: 'transform 0.35s ease',
              transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#3B0643',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(59, 6, 67, 0.3)',
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="15" rx="3" />
                <line x1="4" y1="10" x2="20" y2="10" />
                <line x1="8" y1="3" x2="8" y2="6" />
                <line x1="16" y1="3" x2="16" y2="6" />
                <circle cx="8.5" cy="13.5" r="1" fill="#FFFFFF" />
                <circle cx="12" cy="13.5" r="1" fill="#FFFFFF" />
                <circle cx="15.5" cy="13.5" r="1" fill="#FFFFFF" />
                <circle cx="8.5" cy="17" r="1" fill="#FFFFFF" />
                <circle cx="12" cy="17" r="1" fill="#FFFFFF" />
                <circle cx="15.5" cy="17" r="1" fill="#FFFFFF" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#26042E', lineHeight: 1.25 }}>
                {t('home.whyChooseUs.feature2Sub2Title')}
              </span>
              <span style={{ fontSize: '11px', color: '#66436C', lineHeight: 1.25 }}>
                {t('home.whyChooseUs.feature2Sub2Desc')}
              </span>
            </div>
          </div>
        </>
      )}

      {/* CARD 3: Drive verified, well-maintained cars */}
      {index === 2 && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '20px',
              insetInlineStart: '26px',
              insetInlineEnd: '26px',
              zIndex: 10,
              textAlign: 'start',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-family-display)',
                fontSize: 'clamp(1.22rem, 1.7vw, 1.4rem)',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                margin: '0 0 6px 0',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 'clamp(0.82rem, 1vw, 0.88rem)',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '95px',
              insetInlineStart: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              zIndex: 8,
            }}
          >
            {[
              t('home.whyChooseUs.feature3Tag1'),
              t('home.whyChooseUs.feature3Tag2'),
              t('home.whyChooseUs.feature3Tag3'),
            ].map((text, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.96)',
                  borderRadius: '9999px',
                  paddingBlock: '5px',
                  paddingInlineStart: '6px',
                  paddingInlineEnd: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  width: 'fit-content',
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#3B0643',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#26042E' }}>{text}</span>
              </div>
            ))}
          </div>

          <svg
            width="280"
            height="200"
            viewBox="0 0 280 200"
            style={{
              position: 'absolute',
              insetInlineStart: 'clamp(44%, 52%, 58%)',
              bottom: '-30px',
              pointerEvents: 'none',
              opacity: 0.85,
              zIndex: 4,
            }}
          >
            <circle cx="100" cy="130" r="42" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="1.2" />
            <circle cx="100" cy="130" r="80" fill="none" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1.2" />
            <circle cx="100" cy="130" r="125" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.2" />
          </svg>

          <div
            style={{
              position: 'absolute',
              insetInlineStart: 'clamp(46%, 54%, 60%)',
              bottom: '0px',
              width: 'clamp(145px, 32%, 180px)',
              pointerEvents: 'none',
              zIndex: 6,
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isHovered ? 'scale(1.05) translateY(-4px)' : 'scale(1)',
            }}
          >
            <img
              src="/why-choose-us/car-top-view-figma.png"
              srcSet="/why-choose-us/car-top-view-figma.png 1x, /why-choose-us/car-top-view-figma@2x.png 2x"
              alt={title}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </>
      )}

      {/* CARD 4: Get support before and during your trip */}
      {index === 3 && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '20px',
              insetInlineStart: '26px',
              insetInlineEnd: '26px',
              zIndex: 10,
              textAlign: 'start',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-family-display)',
                fontSize: 'clamp(1.22rem, 1.7vw, 1.4rem)',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                margin: '0 0 6px 0',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 'clamp(0.82rem, 1vw, 0.88rem)',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '108px',
              insetInlineStart: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 8,
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '9999px',
                paddingBlock: '5px',
                paddingInlineStart: '5px',
                paddingInlineEnd: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#3B0643',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#26042E', lineHeight: 1.25 }}>
                  {t('home.whyChooseUs.feature4Sub1Title')}
                </span>
                <span style={{ fontSize: '10px', color: '#66436C', lineHeight: 1.25 }}>
                  {t('home.whyChooseUs.feature4Sub1Desc')}
                </span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '9999px',
                paddingBlock: '5px',
                paddingInlineStart: '5px',
                paddingInlineEnd: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#3B0643',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="8" y1="9" x2="16" y2="9" />
                  <line x1="8" y1="13" x2="13" y2="13" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#26042E', lineHeight: 1.25 }}>
                  {t('home.whyChooseUs.feature4Sub2Title')}
                </span>
                <span style={{ fontSize: '10px', color: '#66436C', lineHeight: 1.25 }}>
                  {t('home.whyChooseUs.feature4Sub2Desc')}
                </span>
              </div>
            </div>
          </div>

          {/* Speech Bubble */}
          <div
            style={{
              position: 'absolute',
              top: '90px',
              insetInlineEnd: 'clamp(118px, 28%, 155px)',
              zIndex: 9,
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '5px 11px',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '11px',
                color: '#26042E',
                lineHeight: 1.22,
                whiteSpace: 'nowrap',
              }}
            >
              {t('home.whyChooseUs.speechBubbleLine1')}
              <br />
              {t('home.whyChooseUs.speechBubbleLine2')}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '-5px',
                insetInlineStart: '42%',
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '5px solid #FFFFFF',
              }}
            />
          </div>

          <div
            className="why-us-car-wrap"
            style={{
              position: 'absolute',
              insetInlineEnd: '-8px',
              bottom: '0px',
              width: 'clamp(210px, 48%, 265px)',
              pointerEvents: 'none',
              zIndex: 5,
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            <img
              src="/cars/car-2-elantra-transparent.png"
              alt="Hyundai Elantra"
              className="why-us-car-img"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 12px 20px rgba(24, 3, 30, 0.45))',
              }}
            />
          </div>
        </>
      )}

      {/* Mobile Clean Content */}
      <div className="why-us-card-mobile-content" style={{ textAlign: 'start' }}>
        <div className="why-us-mobile-icon-circle">
          {index === 0 && <MapPin size={16} color="#FAB826" />}
          {index === 1 && <ShieldCheck size={16} color="#FAB826" />}
          {index === 2 && <Sparkles size={16} color="#FAB826" />}
          {index === 3 && <Headphones size={16} color="#FAB826" />}
        </div>
        <h3 className="why-us-mobile-title">{title}</h3>
        <p className="why-us-mobile-desc">{description}</p>
      </div>

      <style>{`
        [dir='rtl'] .why-us-car-img {
          transform: scaleX(-1);
        }
        .why-us-card-mobile-content {
          display: none;
        }
        .why-us-card-${cardNum} {
          border-radius: ${desktopRadius};
        }
        @media (max-width: 900px) and (min-width: 769px) {
          .why-us-card-${cardNum} {
            border-radius: 24px !important;
            height: 280px !important;
          }
          .card-1-header {
            position: absolute !important;
            top: 20px !important;
            inset-inline-start: 20px !important;
            inset-inline-end: 20px !important;
            max-width: 100% !important;
          }
        }
        @media (max-width: 768px) {
          .why-us-card-${cardNum} {
            border-radius: 18px !important;
            height: auto !important;
            min-height: 175px !important;
            padding: 16px 14px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
          }
          .why-us-card-${cardNum} > *:not(.why-us-card-mobile-content):not(style) {
            display: none !important;
          }
          .why-us-card-mobile-content {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            z-index: 10;
          }
          .why-us-mobile-icon-circle {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.16);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
          }
          .why-us-mobile-title {
            font-family: var(--font-family-display, "Archivo", sans-serif);
            font-size: clamp(0.85rem, 3.2vw, 0.98rem);
            font-weight: 700;
            color: #FFFFFF;
            line-height: 1.25;
            letter-spacing: -0.015em;
            margin: 0 0 6px 0;
          }
          .why-us-mobile-desc {
            font-family: var(--font-family-sans, "Manrope", sans-serif);
            font-size: clamp(0.68rem, 2.4vw, 0.76rem);
            color: rgba(255, 255, 255, 0.78);
            line-height: 1.4;
            margin: 0;
            font-weight: 500;
          }
        }
      `}</style>
    </div>
  );
}
