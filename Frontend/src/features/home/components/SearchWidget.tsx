import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RentalType, SearchFormData } from '../../../types';
import { Button } from '../../../components/common/Button';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { MapPin, Calendar, Car, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export function SearchWidget() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<SearchFormData>({
    rentalType: 'daily',
    pickupLocation: 'San Francisco Int Airport (SFO)',
    dropoffLocation: 'Same as pickup',
    pickupDate: '2026-10-20',
    pickupTime: '10:00 AM',
    dropoffDate: '2026-10-24',
    dropoffTime: '10:00 AM',
    carCategory: 'All Luxury & Electric',
    differentDropoff: false,
    insuranceCover: true,
  });

  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTabChange = (type: RentalType) => {
    setFormData((prev) => ({ ...prev, rentalType: type }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.pickupLocation.trim()) {
      setValidationError(t('home.searchWidget.errorPickup'));
      return;
    }
    setValidationError(null);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      const target = document.getElementById('browse-cars');
      target?.scrollIntoView({ behavior: 'smooth' });
    }, 900);
  };

  const tabLabels: Record<RentalType, string> = {
    daily: t('home.searchWidget.tabRent'),
    monthly: t('home.searchWidget.tabSubscription'),
    subscription: t('home.searchWidget.tabChauffeur'),
  };

  const bullets = [
    t('home.searchWidget.bullet1'),
    t('home.searchWidget.bullet2'),
    t('home.searchWidget.bullet3'),
  ];

  return (
    <div
      id="search-form"
      className="finovo-search-widget"
      style={{
        backgroundColor: 'rgba(24, 3, 38, 0.84)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: '24px',
        padding: '20px 22px',
        boxShadow: '0 24px 50px rgba(14, 1, 24, 0.45)',
        width: '100%',
        maxWidth: '540px',
      }}
    >
      {/* 3 Rental Mode Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-pill)',
          padding: '4px',
          marginBottom: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '4px',
        }}
        role="tablist"
        aria-label={t('home.searchWidget.title')}
      >
        {(['daily', 'monthly', 'subscription'] as RentalType[]).map((tab) => {
          const isActive = formData.rentalType === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '8px 10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
                transition: 'all var(--transition-fast)',
                backgroundColor: isActive ? 'var(--color-accent-500)' : 'transparent',
                color: isActive ? '#180226' : 'rgba(255, 255, 255, 0.88)',
                boxShadow: isActive ? '0 2px 10px rgba(245, 183, 22, 0.35)' : 'none',
                textAlign: 'center',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tabLabels[tab]}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Row 1: Pick-up Location */}
        <div>
          <label
            htmlFor="pickup-location"
            style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.74)',
              marginBottom: '5px',
            }}
          >
            {t('home.searchWidget.pickupLocation')}
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '12px',
              minHeight: '42px',
            }}
          >
            <MapPin size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
            <input
              id="pickup-location"
              type="text"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              placeholder={t('home.searchWidget.pickupPlaceholder')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                width: '100%',
                minWidth: 0,
                outline: 'none',
                fontWeight: 500,
              }}
            />
          </div>
        </div>

        {formData.differentDropoff && (
          <div>
            <label
              htmlFor="dropoff-location"
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.74)',
                marginBottom: '5px',
              }}
            >
              {t('home.searchWidget.returnLocation')}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '12px',
                minHeight: '42px',
              }}
            >
              <MapPin size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
              <input
                id="dropoff-location"
                type="text"
                value={formData.dropoffLocation}
                onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                placeholder={t('home.searchWidget.dropoffPlaceholder')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  width: '100%',
                  minWidth: 0,
                  outline: 'none',
                  fontWeight: 500,
                }}
              />
            </div>
          </div>
        )}

        {/* Row 2: Dates */}
        <div
          className="search-form-dates-row"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}
        >
          <div style={{ minWidth: 0 }}>
            <label
              htmlFor="pickup-date"
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.74)',
                marginBottom: '5px',
              }}
            >
              {t('home.searchWidget.pickupDate')}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '12px',
                minHeight: '42px',
              }}
            >
              <Calendar size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
              <input
                id="pickup-date"
                type="date"
                value={formData.pickupDate}
                onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  width: '100%',
                  minWidth: 0,
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <label
              htmlFor="dropoff-date"
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.74)',
                marginBottom: '5px',
              }}
            >
              {t('home.searchWidget.returnDate')}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '12px',
                minHeight: '42px',
              }}
            >
              <Calendar size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
              <input
                id="dropoff-date"
                type="date"
                value={formData.dropoffDate}
                onChange={(e) => setFormData({ ...formData, dropoffDate: e.target.value })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  width: '100%',
                  minWidth: 0,
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Vehicle Type */}
        <div>
          <label
            htmlFor="car-category-select"
            style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.74)',
              marginBottom: '5px',
            }}
          >
            {t('home.searchWidget.vehicleType')}
          </label>
          <CustomSelect
            id="car-category-select"
            variant="dark"
            value={formData.carCategory}
            onChange={(val) => setFormData({ ...formData, carCategory: val })}
            options={[
              {
                value: 'All Luxury & Electric',
                label: t('home.searchWidget.catAll'),
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
              {
                value: 'Executive Sedans',
                label: t('home.searchWidget.catSedan'),
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
              {
                value: 'Luxury SUVs',
                label: t('home.searchWidget.catSuv'),
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
              {
                value: 'Sports & Performance',
                label: t('home.searchWidget.catSports'),
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
            ]}
          />
        </div>

        {/* Value Bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 2px 0' }}>
          {bullets.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#180226"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                {item}
              </span>
            </div>
          ))}
        </div>

        {validationError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F87171', fontSize: '0.82rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{validationError}</span>
          </div>
        )}

        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ADE80', fontSize: '0.84rem', fontWeight: 600 }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{t('home.searchWidget.successMessage')}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          icon={<Search size={17} />}
          style={{
            marginTop: '4px',
            backgroundColor: 'var(--color-accent-500)',
            color: '#180226',
            fontWeight: 800,
            fontSize: '0.98rem',
            padding: '13px 24px',
            boxShadow: '0 8px 24px rgba(245, 183, 22, 0.4)',
          }}
        >
          {t('home.searchWidget.searchCars')}
        </Button>
      </form>

      <style>{`
        @media (max-width: 460px) {
          .finovo-search-widget {
            padding: 16px 14px !important;
            border-radius: 20px !important;
          }
          .search-form-dates-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
