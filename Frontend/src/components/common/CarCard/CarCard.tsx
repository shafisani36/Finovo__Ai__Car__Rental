import React from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Tag, ChevronRight } from 'lucide-react';
import './CarCard.css';
import cityBackdrop from '../../../assets/cars/finovo-city.png';

export interface CarCardProps {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  type?: string;
  fuel?: string;
  transmission?: string;
  seats?: number;
  pricePerDay: number;
  rateMultiplier?: number;
  periodLabel?: string;
  mileageLimit?: string;
  image: string;
  logo: string;
  available?: boolean;
  onBookClick?: (id: string) => void;
  className?: string;
}

export const CarCard: React.FC<CarCardProps> = ({
  id,
  name,
  year,
  pricePerDay,
  rateMultiplier = 1,
  periodLabel = 'Daily Fee',
  mileageLimit = '250 km',
  image,
  logo,
  available = true,
  className = '',
}) => {
  const displayRate = (pricePerDay * rateMultiplier).toFixed(2);

  return (
    <article className={`finovo-car-card ${className}`}>
      {/* 1. TOP ARTWORK STAGE: Twilight Skyline + Organic S-Wave + Vehicle */}
      <div className="finovo-car-card-stage">
        {/* City Skyline Background */}
        <img
          src={cityBackdrop}
          alt="Twilight City Skyline"
          className="finovo-car-card-skyline"
          loading="lazy"
        />

        {/* Available Pill Badge */}
        {available && (
          <div className="finovo-car-card-status-pill">
            <span>Available</span>
          </div>
        )}

        {/* Organic S-Wave Divider (Exact match to reference curve) */}
        <svg
          className="finovo-car-card-wave-svg"
          viewBox="0 0 400 95"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0,95 L 0,38 C 35,12 85,10 145,30 C 220,55 305,65 400,58 L 400,95 Z"
            fill="#FFFFFF"
          />
        </svg>

        {/* Centered Vehicle Cutout */}
        <div className="finovo-car-card-vehicle-wrap">
          <img
            src={image}
            alt={name}
            className="finovo-car-card-vehicle-img"
            loading="lazy"
          />
        </div>
      </div>

      {/* 2. BOTTOM INFO BAR: Logo, Name, Mileage, Fee, Circular Arrow */}
      <div className="finovo-car-card-info-bar">
        {/* Left: Brand Crest & Model Name */}
        <div className="finovo-car-card-brand-box">
          <img
            src={logo}
            alt={`${name} emblem`}
            className="finovo-car-card-logo-img"
          />
          <div className="finovo-car-card-text-box">
            <h4 className="finovo-car-card-title">{name}</h4>
            <div className="finovo-car-card-year">{year}</div>
          </div>
        </div>

        {/* Middle: Mileage & Rate Stats */}
        <div className="finovo-car-card-stats">
          {/* Mileage Unit */}
          <div className="finovo-car-card-stat-unit">
            <Gauge size={18} className="finovo-car-card-stat-icon" />
            <div className="finovo-car-card-stat-details">
              <span className="finovo-car-card-stat-value">{mileageLimit}</span>
              <span className="finovo-car-card-stat-label">Mileage</span>
            </div>
          </div>

          {/* Rate Unit */}
          <div className="finovo-car-card-stat-unit">
            <Tag size={18} className="finovo-car-card-stat-icon" />
            <div className="finovo-car-card-stat-details">
              <span className="finovo-car-card-stat-value">SAR {displayRate}</span>
              <span className="finovo-car-card-stat-label">{periodLabel}</span>
            </div>
          </div>
        </div>

        {/* Right: Circular Action Button */}
        <Link
          to={`/cars/${id}`}
          className="finovo-car-card-action-btn"
          aria-label={`View details and book ${name}`}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </Link>
      </div>
    </article>
  );
};
