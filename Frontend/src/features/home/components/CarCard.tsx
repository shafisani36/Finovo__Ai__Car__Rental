import { useState } from 'react';
import type { FeaturedCar } from '../../../types';
import { Fuel, Gauge, Star } from 'lucide-react';

interface CarCardProps {
  car: FeaturedCar;
  onRent?: (car: FeaturedCar) => void;
}

// Gear lever / shifter icon matching the Figma specification
function AutomaticShifterIcon({ size = 16, color = '#D9C7E6' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Knob */}
      <rect x="8.5" y="2" width="7" height="4" rx="2" />
      {/* Shift rod */}
      <line x1="12" y1="6" x2="12" y2="10" />
      {/* Selector gate frame */}
      <rect x="6" y="10" width="12" height="12" rx="2.5" />
      {/* Shift gate PRND channel */}
      <path d="M10 13h3v2.5h-2v3.5" />
    </svg>
  );
}

// Drivetrain 2WD / 4WD chassis axle icon matching the Figma specification
function DrivetrainChassisIcon({ size = 16, color = '#D9C7E6' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* 4 Wheels */}
      <rect x="2.5" y="3" width="3.5" height="6.5" rx="1.5" />
      <rect x="18" y="3" width="3.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="14.5" width="3.5" height="6.5" rx="1.5" />
      <rect x="18" y="14.5" width="3.5" height="6.5" rx="1.5" />
      {/* Front and rear horizontal axles */}
      <line x1="6" y1="6.25" x2="18" y2="6.25" />
      <line x1="6" y1="17.75" x2="18" y2="17.75" />
      {/* Central driveshaft */}
      <line x1="12" y1="6.25" x2="12" y2="17.75" />
      {/* Center transfer differential */}
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

export function CarCard({ car, onRent }: CarCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const subtitle = car.subtitle || car.type.toUpperCase();
  const priceDisplay = car.priceDisplay || `$${car.dailyRate} / day`;
  const rating = car.rating || 5;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRent?.(car)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRent?.(car);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        cursor: 'pointer',
        outline: 'none',
        transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
      }}
    >
      {/* Vehicle Cutout with Floor Shadow */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '145px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <img
          src={car.image}
          alt={`${car.name} ${subtitle}`}
          loading="lazy"
          style={{
            maxWidth: '240px',
            width: '92%',
            maxHeight: '135px',
            objectFit: 'contain',
            transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />
      </div>

      {/* Vehicle Title & Subtitle */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-family-display, sans-serif)',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
            margin: '0 0 4px 0',
            lineHeight: 1.25,
          }}
        >
          {car.name}
        </h3>
        <p
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#C5B2D6',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* 2x2 Specs Pill Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '18px',
        }}
      >
        {/* Transmission */}
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            borderColor: isHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <AutomaticShifterIcon size={16} color="#E6D2F4" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {car.specs.transmission || 'Automatic'}
          </span>
        </div>

        {/* Fuel Type */}
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            borderColor: isHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <Fuel size={15} color="#E6D2F4" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {car.specs.fuelType || 'Petrol'}
          </span>
        </div>

        {/* Horsepower */}
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            borderColor: isHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <Gauge size={15} color="#E6D2F4" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {car.specs.hp || '163 HP'}
          </span>
        </div>

        {/* Drivetrain */}
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '0.84rem',
            fontWeight: 600,
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            borderColor: isHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <DrivetrainChassisIcon size={16} color="#E6D2F4" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {car.specs.drivetrain || '2WD'}
          </span>
        </div>
      </div>

      {/* Bottom Row: Rating Stars + Price */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px 0 4px',
        }}
      >
        {/* 5 Gold Stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={13}
              fill="#F5B716"
              color="#F5B716"
              strokeWidth={0}
            />
          ))}
        </div>

        {/* Price Tag */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: '1.15rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            fontFamily: 'var(--font-family-display, sans-serif)',
          }}
        >
          {priceDisplay}
        </div>
      </div>

      {/* Golden CTA Button matching Figma chunk-1 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRent?.(car);
        }}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '9px 16px',
          backgroundColor: '#F5B716',
          color: '#180226',
          border: 'none',
          borderRadius: '9999px',
          fontWeight: 800,
          fontSize: '0.85rem',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(245, 183, 22, 0.35)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(245, 183, 22, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 183, 22, 0.35)';
        }}
      >
        Book Now
      </button>
    </div>
  );
}
