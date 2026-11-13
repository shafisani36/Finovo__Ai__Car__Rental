import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Gauge,
  Fuel,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Car,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { vehiclesApi } from '../../../api/services/vehicles.api';
import { getCarImage, getCarGallery, getCarGalleryEntries, isFullBleedCarPhoto, resolveVehiclePricing, formatMoney } from '../../../utils/carImageHelper';
import './CustomerPortal.css';

export function CustomerVehicleDetailPage() {
  const { t } = useTranslation();
  const specLabel = (value: string) =>
    value ? t(`cars.specs.${value.toLowerCase()}`, { defaultValue: value.charAt(0) + value.slice(1).toLowerCase() }) : '—';
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quote / Trip Estimator
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 4);

  const [pickupDate, setPickupDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(inThreeDays.toISOString().split('T')[0]);

  useEffect(() => {
    let isMounted = true;
    async function fetchVehicle() {
      if (!vehicleId) return;
      try {
        setIsLoading(true);
        const res = await vehiclesApi.getById(vehicleId);
        if (isMounted && res.success && res.vehicle) {
          const v = res.vehicle as any;
          const pricing = resolveVehiclePricing(v);
          const gallery = getCarGallery(v);
          let parsedFeatures: string[] = [];
          try {
            if (typeof v.features === 'string' && v.features.trim().startsWith('[')) {
              parsedFeatures = JSON.parse(v.features);
            } else if (Array.isArray(v.features)) {
              parsedFeatures = v.features;
            }
          } catch {
            parsedFeatures = [];
          }
          setVehicle({
            id: v.id,
            brand: v.brand?.name || v.brand || '',
            model: v.model?.name || v.model || '',
            year: v.year || null,
            categoryName: v.category?.name || v.category || '',
            dailyRate: pricing.dailyRate,
            depositAmount: pricing.securityDeposit,
            seats: v.seats || null,
            transmission: v.transmission || '',
            fuelType: v.fuelType || '',
            horsepower: v.horsepower || v.horsePower || null,
            primaryImageUrl: getCarImage(v),
            images: gallery,
            // Only the equipment recorded for this car; nothing is invented when the list is empty
            features: parsedFeatures,
          });
        } else if (isMounted) {
          setVehicle(null);
        }
      } catch (err) {
        console.error('Error fetching vehicle details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchVehicle();
    return () => { isMounted = false; };
  }, [vehicleId]);

  const daysCount = Math.max(
    1,
    Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 3600 * 24))
  );

  const subtotal = vehicle ? vehicle.dailyRate * daysCount : 0;
  // Same tax rate the server applies to bookings (BOOKING_TAX_RATE_PERCENT)
  const estimatedTax = subtotal * 0.08;
  const estimatedTotal = subtotal + estimatedTax;

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '480px' }} />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-empty-state">
          <Car size={36} color="var(--cp-primary)" />
          <h2 className="cp-empty-title">{t('portalPages.vehicle.notFound')}</h2>
          <p className="cp-empty-desc">{t('portalPages.vehicle.notFoundDesc')}</p>
          <Link to="/customer/cars" className="cp-btn-primary">
            {t('portalPages.vehicle.backToFleet')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      {/* Top Navigation */}
      <div>
        <Link
          to="/customer/cars"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cp-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          {t('portalPages.vehicle.backToFleet')}
        </Link>
      </div>

      <div className="cp-responsive-grid-2col">
        {/* Left Column: Media & Specifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Visual Showcase */}
          {(() => {
            const galleryEntries = getCarGalleryEntries(vehicle);
            const activeEntry =
              galleryEntries.find((entry) => entry.url === vehicle.primaryImageUrl) || galleryEntries[0];
            const activeUrl = activeEntry?.url || vehicle.primaryImageUrl;
            const activeCaption = activeEntry?.caption || `${vehicle.brand} ${vehicle.model}`;

            return (
              <div className="cp-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div
                  style={{
                    height: 'clamp(260px, 42vw, 420px)',
                    width: '100%',
                    position: 'relative',
                    background: 'linear-gradient(135deg, #24052E 0%, #3B094E 55%, #551270 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={activeUrl}
                    alt={activeCaption}
                    style={
                      isFullBleedCarPhoto(activeUrl)
                        ? { width: '100%', height: '100%', objectFit: 'cover' }
                        : { width: '90%', height: '85%', objectFit: 'contain' }
                    }
                    onError={(e) => {
                      e.currentTarget.src = getCarImage({ ...vehicle, primaryImageUrl: undefined });
                    }}
                  />
                  <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px', zIndex: 3 }}>
                    {vehicle.categoryName && <span className="cp-badge cp-badge-primary">{vehicle.categoryName}</span>}
                    <span className="cp-badge cp-badge-accent">{t('portalPages.vehicle.aiInspected')}</span>
                  </div>
                  {galleryEntries.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '20px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        background: 'rgba(18, 4, 24, 0.72)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backdropFilter: 'blur(6px)',
                        zIndex: 3,
                      }}
                    >
                      {activeCaption}
                    </div>
                  )}
                </div>
                {/* Authentic Per-Model Gallery Thumbnails */}
                {galleryEntries.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '16px',
                      background: '#FFFFFF',
                      borderTop: '1px solid var(--cp-border)',
                    }}
                  >
                    {galleryEntries.map((entry, idx) => {
                      const isActive = activeUrl === entry.url;
                      return (
                        <button
                          key={`${entry.url}-${idx}`}
                          type="button"
                          title={entry.caption}
                          aria-label={entry.caption}
                          style={{
                            width: '96px',
                            height: '64px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #24052E 0%, #3B094E 100%)',
                            border: isActive ? '2px solid var(--cp-accent)' : '2px solid rgba(30, 5, 40, 0.14)',
                            boxShadow: isActive ? '0 4px 12px rgba(250, 184, 38, 0.28)' : 'none',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          onClick={() => setVehicle({ ...vehicle, primaryImageUrl: entry.url })}
                        >
                          <img
                            src={entry.url}
                            alt={entry.caption}
                            style={
                              isFullBleedCarPhoto(entry.url)
                                ? { width: '100%', height: '100%', objectFit: 'cover' }
                                : { width: '90%', height: '90%', objectFit: 'contain' }
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Vehicle Specifications Grid */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.vehicle.specsTitle')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Users size={16} color="var(--cp-primary)" />
                  {t('cars.specs.seats')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {vehicle.seats ?? '—'}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Gauge size={16} color="var(--cp-primary)" />
                  {t('cars.specs.transmission')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {specLabel(vehicle.transmission)}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Fuel size={16} color="var(--cp-primary)" />
                  {t('cars.specs.fuel')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {specLabel(vehicle.fuelType)}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Sparkles size={16} color="var(--cp-accent)" />
                  {t('portalPages.vehicle.power')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {vehicle.horsepower ? t('portalPages.vehicle.horsepower', { value: vehicle.horsepower }) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Features and Benefits */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.vehicle.includedTitle')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {[t('portalPages.vehicle.inspectionIncluded'), ...vehicle.features].map((feat: string, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--cp-text-main)' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Quick Booking Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="cp-card" style={{ position: 'sticky', top: '24px' }}>
            <div style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', fontWeight: 600 }}>{[vehicle.brand, vehicle.year].filter(Boolean).join(' • ')}</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '4px 0 12px 0' }}>
                {vehicle.model}
              </h1>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {formatMoney(vehicle.dailyRate)}
                </span>
                <span style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem' }}>{t('portalPages.vehicle.perDay')}</span>
              </div>
            </div>

            {/* Trip dates selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label className="cp-label">{t('portalPages.vehicle.pickupDate')}</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
                  <input
                    type="date"
                    className="cp-input"
                    style={{ paddingLeft: '38px' }}
                    value={pickupDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="cp-label">{t('portalPages.vehicle.returnDate')}</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
                  <input
                    type="date"
                    className="cp-input"
                    style={{ paddingLeft: '38px' }}
                    value={returnDate}
                    min={pickupDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Calculation summary */}
            <div
              style={{
                background: '#F8F6F9',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.9rem',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.vehicle.period')}</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{t('portalPages.vehicle.days', { count: daysCount })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.vehicle.dailyRateTimes', { rate: formatMoney(vehicle.dailyRate), count: daysCount })}</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{formatMoney(subtotal, undefined, 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.vehicle.tax')}</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{formatMoney(estimatedTax, undefined, 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.vehicle.deposit')}</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>{formatMoney(vehicle.depositAmount, undefined, 2)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--cp-border)',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)' }}>{t('portalPages.vehicle.total')}</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {formatMoney(estimatedTotal, undefined, 2)}
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() =>
                navigate(
                  `/customer/bookings/new?vehicleId=${vehicle.id}&pickupDate=${pickupDate}&returnDate=${returnDate}`
                )
              }
              className="cp-btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {t('portalPages.vehicle.reserve')}
              <ChevronRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '14px', fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>
              <ShieldCheck size={16} color="#10B981" />
              <span>{t('portalPages.vehicle.priceNote')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
