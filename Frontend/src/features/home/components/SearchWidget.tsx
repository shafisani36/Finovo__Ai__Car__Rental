import { useState, type FormEvent } from 'react';
import type { RentalType, SearchFormData } from '../../../types';
import { Button } from '../../../components/common/Button';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { MapPin, Calendar, Car, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export function SearchWidget() {
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
      setValidationError('Please specify a pickup location.');
      return;
    }
    setValidationError(null);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      const target = document.getElementById('browse-cars');
      target?.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
  };

  return (
    <div
      id="search-form"
      style={{
        backgroundColor: 'rgba(30, 4, 48, 0.78)',
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
      {/* 3 Tabs matching Figma chunk-0 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-pill)',
          padding: '3px',
          marginBottom: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        role="tablist"
        aria-label="Rental Duration Types"
      >
        {(['daily', 'monthly', 'subscription'] as RentalType[]).map((tab) => {
          const isActive = formData.rentalType === tab;
          const labels: Record<RentalType, string> = {
            daily: 'Rent',
            monthly: 'Subscription',
            subscription: 'Chauffeur',
          };

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '7px 10px',
                fontSize: '0.825rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
                transition: 'all var(--transition-fast)',
                backgroundColor: isActive ? 'var(--color-accent-500)' : 'transparent',
                color: isActive ? '#180226' : 'rgba(255, 255, 255, 0.85)',
                boxShadow: isActive ? '0 2px 10px rgba(245, 183, 22, 0.35)' : 'none',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {/* Row 1: Pick-up Location */}
        <div>
          <label
            htmlFor="pickup-location"
            style={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '4px',
            }}
          >
            Pick-up Location
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
              minHeight: '40px',
            }}
          >
            <MapPin size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
            <input
              id="pickup-location"
              type="text"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              placeholder="Airport or City..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.825rem',
                width: '100%',
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
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '4px',
              }}
            >
              Drop-off Location
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
                minHeight: '40px',
              }}
            >
              <MapPin size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
              <input
                id="dropoff-location"
                type="text"
                value={formData.dropoffLocation}
                onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                placeholder="Drop-off location..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.825rem',
                  width: '100%',
                  outline: 'none',
                  fontWeight: 500,
                }}
              />
            </div>
          </div>
        )}

        {/* Row 2: Date & Time side-by-side row (preserved on both desktop and mobile) */}
        <div className="search-form-dates-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div>
            <label
              htmlFor="pickup-date"
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '4px',
              }}
            >
              Pick-up Date
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
                minHeight: '40px',
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
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dropoff-date"
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '4px',
              }}
            >
              Return Date
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
                minHeight: '40px',
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
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Car Category Dropdown */}
        <div>
          <label
            htmlFor="car-category-select"
            style={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '4px',
            }}
          >
            Car Category
          </label>
          <CustomSelect
            id="car-category-select"
            variant="dark"
            value={formData.carCategory}
            onChange={(val) => setFormData({ ...formData, carCategory: val })}
            options={[
              {
                value: 'All Luxury & Electric',
                label: 'All Luxury, Electric & SUV Models',
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
              {
                value: 'Executive Sedans',
                label: 'Executive Sedans (Audi, BMW, Mercedes)',
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
              {
                value: 'Luxury SUVs',
                label: 'Luxury SUVs (G-Wagon, Cayenne, Tucson)',
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
              {
                value: 'Sports & Performance',
                label: 'Sports & Performance (Porsche 911, Audi R8)',
                icon: <Car size={15} color="var(--color-accent-500)" />,
              },
            ]}
          />
        </div>

        {/* 3 Golden Checkmark Bullets matching Figma Chunk-0 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 2px 0' }}>
          {[
            'Free cancellation up to 24h before pickup',
            'Instant contactless vehicle confirmation',
            '24/7 dedicated customer assistance & support',
          ].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#180226" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.82)', fontWeight: 500 }}>
                {item}
              </span>
            </div>
          ))}
        </div>

        {validationError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F87171', fontSize: '0.8rem' }}>
            <AlertCircle size={14} />
            <span>{validationError}</span>
          </div>
        )}

        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ADE80', fontSize: '0.825rem', fontWeight: 600 }}>
            <CheckCircle2 size={15} />
            <span>Finding verified vehicles available for instant unlock...</span>
          </div>
        )}

        {/* Big Yellow CTA Button matching Figma Chunk-0 */}
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
            fontSize: '1rem',
            padding: '13px 24px',
            boxShadow: '0 8px 24px rgba(245, 183, 22, 0.4)',
          }}
        >
          Search Ride
        </Button>
      </form>

      <style>{`
        .search-form-dates-row {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      `}</style>
    </div>
  );
}
