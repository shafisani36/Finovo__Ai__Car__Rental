import type { TestimonialItem } from '../../../types';
import { Star } from 'lucide-react';

interface TestimonialBubbleProps {
  item: TestimonialItem;
}

export function TestimonialBubble({ item }: TestimonialBubbleProps) {
  const isFeatured = item.variant === 'featured';

  if (isFeatured) {
    return (
      <div className="testimonial-featured-bubble-container">
        <div
          className="testimonial-featured-bubble"
          style={{
            backgroundColor: '#330231',
            borderRadius: '24px',
            padding: '16px 22px 18px 20px',
            maxWidth: '430px',
            boxShadow: '0 16px 36px rgba(49, 4, 53, 0.22)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'relative',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
          }}
        >
          {/* Circular Avatar */}
          <div
            style={{
              position: 'relative',
              width: '54px',
              height: '54px',
              flexShrink: 0,
            }}
          >
            <img
              src={item.avatar}
              alt={item.author}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              }}
            />
          </div>

          {/* Review Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Author Name */}
            <div
              style={{
                fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#FFFFFF',
                lineHeight: 1.2,
                marginBottom: '4px',
              }}
            >
              {item.author}
            </div>

            {/* 5 Golden Stars */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }} aria-label={`${item.rating} out of 5 stars`}>
              {[...Array(item.rating)].map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  fill="#FFB800"
                  color="#FFB800"
                  style={{ flexShrink: 0 }}
                />
              ))}
            </div>

            {/* Review text */}
            <p
              style={{
                fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                fontSize: '0.74rem',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.45,
                margin: 0,
                fontWeight: 500,
              }}
            >
              {item.review}
            </p>
          </div>

          {/* Large Stylized Quotation Mark */}
          <div
            aria-hidden="true"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '44px',
              lineHeight: 1,
              color: 'rgba(255, 255, 255, 0.18)',
              userSelect: 'none',
              pointerEvents: 'none',
              alignSelf: 'flex-start',
              marginLeft: '4px',
              marginTop: '-4px',
            }}
          >
            ”
          </div>

          {/* Speech Bubble Tail pointing down-left */}
          <svg
            className="speech-bubble-tail"
            viewBox="0 0 24 16"
            fill="none"
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '-12px',
              left: '26px',
              width: '24px',
              height: '14px',
              pointerEvents: 'none',
            }}
          >
            <path
              d="M24 0 C16 4 6 10 0 16 C4 11 10 3 12 0 Z"
              fill="#330231"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Floating Testimonial Card Variant
  const isSaudia = item.variant === 'bubble-center';
  const isKhalid = item.variant === 'bubble-right';

  return (
    <div
      className={`testimonial-floating-card ${item.variant || ''}`}
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
      }}
    >
      {/* Overlapping Avatar with Figma Warm Halo Glow */}
      <div
        className="floating-card-avatar"
        style={{
          position: 'absolute',
          top: '-36px',
          left: isSaudia ? '50%' : isKhalid ? 'auto' : '22px',
          right: isKhalid ? '26px' : 'auto',
          transform: isSaudia ? 'translateX(-50%)' : 'none',
          width: '66px',
          height: '66px',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <img
          src={item.avatar}
          alt={item.author}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0 0 12px rgba(254, 225, 90, 0.45))',
          }}
        />
      </div>

      {/* Card Box */}
      <div
        className="floating-card-body"
        style={{
          backgroundColor: '#330231',
          borderRadius: '16px',
          padding: '24px 20px 20px 20px',
          boxShadow: '0 14px 34px rgba(49, 4, 53, 0.16)',
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Header Row: Author (Location) + 5 Stars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
                fontWeight: 700,
                fontSize: '0.88rem',
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
              }}
            >
              {item.author}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                fontWeight: 500,
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.72)',
              }}
            >
              ({item.location})
            </span>
          </div>

          {/* 5 Stars */}
          <div style={{ display: 'flex', gap: '2px' }} aria-label={`${item.rating} out of 5 stars`}>
            {[...Array(item.rating)].map((_, i) => (
              <Star
                key={i}
                size={11}
                fill="#FFB800"
                color="#FFB800"
                style={{ flexShrink: 0 }}
              />
            ))}
          </div>
        </div>

        {/* Review Quote */}
        <p
          style={{
            fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
            fontSize: '0.82rem',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.88)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {item.review}
        </p>
      </div>
    </div>
  );
}
