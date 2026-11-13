import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MAX_COMPARE, useCompareCars, useSavedCars } from '../../../hooks/useCarShortlists';
import { useTranslation } from 'react-i18next';
import { Gauge, Tag, ChevronRight, GitCompareArrows, Heart } from 'lucide-react';
import { isFullBleedCarPhoto } from '../../../utils/carImageHelper';
import './CarCard.css';
import cityBackdrop from '../../../assets/cars/finovo-city.webp';

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
  currency?: string;
  rateMultiplier?: number;
  periodLabel?: string;
  mileageLimit?: string;
  image: string;
  /** Brand logo URL; when missing the card shows the brand's initial */
  logo?: string;
  available?: boolean;
  onBookClick?: (id: string) => void;
  className?: string;
  /** Optional query string (e.g. "?pickupDate=...&returnDate=...") appended to detail links. */
  linkSearch?: string;
}

export const CarCard: React.FC<CarCardProps> = ({
  id,
  name,
  brand = '',
  year,
  pricePerDay,
  currency = '',
  rateMultiplier = 1,
  periodLabel,
  mileageLimit = '',
  image,
  logo,
  available = true,
  className = '',
  linkSearch = '',
}) => {
  const { t } = useTranslation();
  const { isSaved, toggleSaved } = useSavedCars();
  const { isCompared, toggleCompare } = useCompareCars();
  const [compareFullHint, setCompareFullHint] = useState(false);
  const displayRate = Math.round(pricePerDay * rateMultiplier).toLocaleString();
  const currencyPrefix = currency ? `${currency} ` : '';
  const resolvedPeriodLabel = periodLabel || t('cars.dailyFee');
  const fullBleed = isFullBleedCarPhoto(image);

  return (
    <article className={`finovo-car-card ${className}`}>
      {/* 1. TOP ARTWORK STAGE: Twilight Skyline + Organic S-Wave + Vehicle */}
      <div className="finovo-car-card-stage">
        {!fullBleed && (
          <img
            src={cityBackdrop}
            alt="Twilight City Skyline"
            className="finovo-car-card-skyline"
            loading="lazy"
          />
        )}

        {/* Save and compare (stored in this browser) */}
        <div className="finovo-car-card-actions">
          <button
            type="button"
            className={`finovo-car-card-action ${isSaved(id) ? 'is-on is-saved' : ''}`}
            onClick={() => toggleSaved(id)}
            aria-pressed={isSaved(id)}
            aria-label={isSaved(id) ? t('shortlists.removeSaved') : t('shortlists.save')}
            title={isSaved(id) ? t('shortlists.removeSaved') : t('shortlists.save')}
          >
            <Heart size={16} fill={isSaved(id) ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className={`finovo-car-card-action ${isCompared(id) ? 'is-on' : ''}`}
            onClick={() => {
              if (!toggleCompare(id)) setCompareFullHint(true);
            }}
            aria-pressed={isCompared(id)}
            aria-label={isCompared(id) ? t('shortlists.removeCompare') : t('shortlists.addCompare')}
            title={
              compareFullHint && !isCompared(id)
                ? t('shortlists.compareFull', { count: MAX_COMPARE })
                : isCompared(id)
                  ? t('shortlists.removeCompare')
                  : t('shortlists.addCompare')
            }
          >
            <GitCompareArrows size={16} />
          </button>
        </div>

        {/* Available Pill Badge */}
        {available && (
          <div className="finovo-car-card-status-pill">
            <span>{t('common.status.available')}</span>
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

        {/* Centered Vehicle Cutout or Edge-to-Edge Studio Photo */}
        <Link
          to={`/cars/${id}${linkSearch}`}
          className={`finovo-car-card-vehicle-wrap ${fullBleed ? 'is-photo-wrap' : ''}`}
          title={`View full specs & book ${name}`}
        >
          <img
            src={image}
            alt={name}
            className={`finovo-car-card-vehicle-img ${fullBleed ? 'is-photo' : ''}`}
            loading="lazy"
          />
        </Link>
      </div>

      {/* 2. BOTTOM INFO BAR: Logo, Name, Mileage, Fee, Circular Arrow */}
      <div className="finovo-car-card-info-bar">
        {/* Left: Brand Crest & Model Name */}
        <div className="finovo-car-card-brand-box">
          {logo ? (
            <img src={logo} alt={`${brand} logo`} className="finovo-car-card-logo-img" />
          ) : (
            <span className="finovo-car-card-logo-img finovo-car-card-monogram" aria-hidden="true">
              {(brand || name).trim().charAt(0).toUpperCase()}
            </span>
          )}
          <Link to={`/cars/${id}${linkSearch}`} className="finovo-car-card-text-box" style={{ textDecoration: 'none' }} title={`View details for ${name}`}>
            <h4 className="finovo-car-card-title">{name}</h4>
            <div className="finovo-car-card-year">{year}</div>
          </Link>
        </div>

        {/* Middle: Mileage & Rate Stats */}
        <div className="finovo-car-card-stats">
          {/* Mileage Unit */}
          <div className="finovo-car-card-stat-unit">
            <Gauge size={18} className="finovo-car-card-stat-icon" />
            <div className="finovo-car-card-stat-details">
              <span className="finovo-car-card-stat-value">{mileageLimit}</span>
              <span className="finovo-car-card-stat-label">{t('cars.specs.mileage')}</span>
            </div>
          </div>

          {/* Rate Unit */}
          <div className="finovo-car-card-stat-unit">
            <Tag size={18} className="finovo-car-card-stat-icon" />
            <div className="finovo-car-card-stat-details">
              <span className="finovo-car-card-stat-value">{currencyPrefix}{displayRate}</span>
              <span className="finovo-car-card-stat-label">{resolvedPeriodLabel}</span>
            </div>
          </div>
        </div>

        {/* Right: Circular Action Button */}
        <Link
          to={`/cars/${id}${linkSearch}`}
          className="finovo-car-card-action-btn"
          aria-label={`View details and book ${name}`}
        >
          <ChevronRight size={20} strokeWidth={2.5} className="rtl-mirror-arrow" />
        </Link>
      </div>
    </article>
  );
};
