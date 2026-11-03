import { useState, useRef, useEffect } from 'react';
import type { BrandCategory } from '../../../types';
import { ArrowUpRight } from 'lucide-react';

interface CategoryCardProps {
  category: BrandCategory;
  onSelect?: (category: BrandCategory) => void;
}

export function CategoryCard({ category, onSelect }: CategoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 260, height: 330 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = size.width;
  const h = size.height;
  const r = 26;
  const btnR = 22;
  const gap = 6;
  const fillet = 14;

  const cx = w - btnR - 2;
  const cy = h - btnR - 2;
  const R_scoop = btnR + gap;

  // Tangent-continuous notch path around circular button
  const d = [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${cy - R_scoop - fillet}`,
    `Q ${w} ${cy - R_scoop} ${cx} ${cy - R_scoop}`,
    `A ${R_scoop} ${R_scoop} 0 0 1 ${cx - R_scoop} ${cy}`,
    `Q ${cx - R_scoop} ${h} ${cx - R_scoop - fillet} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');

  const isDarkText = category.textColor === 'dark';
  const displayLines = category.displayTitle || [category.brand];

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(category)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect?.(category);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1.26',
        minHeight: '280px',
        maxHeight: '380px',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {/* SVG Container with Clapped Image & Deep Purple Border */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
        }}
      >
        <defs>
          <clipPath id={`clip-${category.id}`}>
            <path d={d} />
          </clipPath>
        </defs>

        {/* Clipped Vehicle Image */}
        <g clipPath={`url(#clip-${category.id})`}>
          <image
            href={category.image}
            width={w}
            height={h}
            preserveAspectRatio="xMidYMid slice"
            style={{
              transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
              transformOrigin: 'center center',
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        </g>

        {/* Card Purple Border Line matching Figma */}
        <path
          d={d}
          fill="none"
          stroke="#2A0845"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Brand Title at Top-Left matching Figma */}
      <div
        style={{
          position: 'absolute',
          top: '22px',
          left: '22px',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: 'clamp(1.3rem, 1.8vw, 1.65rem)',
            fontWeight: 800,
            color: isDarkText ? '#1B0227' : '#FFFFFF',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
          }}
        >
          {displayLines.map((line, idx) => (
            <span key={idx} style={{ display: 'block' }}>
              {line}
            </span>
          ))}
        </h3>
      </div>

      {/* Circular Arrow Button Nested in Notch matching Figma */}
      <div
        style={{
          position: 'absolute',
          right: '2px',
          bottom: '2px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#2A0845',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          boxShadow: isHovered
            ? '0 6px 18px rgba(42, 8, 69, 0.45)'
            : '0 3px 10px rgba(42, 8, 69, 0.25)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease',
          transform: isHovered ? 'rotate(45deg) scale(1.06)' : 'rotate(0deg) scale(1)',
        }}
      >
        <ArrowUpRight size={22} color="#FFFFFF" strokeWidth={2.4} />
      </div>
    </div>
  );
}
