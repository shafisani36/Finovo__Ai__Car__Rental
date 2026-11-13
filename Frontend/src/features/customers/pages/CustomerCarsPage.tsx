import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Car,
  Fuel,
  Gauge,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { vehiclesApi } from '../../../api/services/vehicles.api';
import { getCarImage, isFullBleedCarPhoto, resolveVehiclePricing, formatMoney } from '../../../utils/carImageHelper';
import { CustomSelect } from '../../../components/common/CustomSelect';
import './CustomerPortal.css';
import { useTranslation } from 'react-i18next';


export function CustomerCarsPage() {
  const { t } = useTranslation();
  const specLabel = (value?: string) =>
    value ? t(`cars.specs.${value.toLowerCase()}`, { defaultValue: value.charAt(0) + value.slice(1).toLowerCase() }) : '—';
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFuel, setSelectedFuel] = useState<string>('ALL');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('ALL');
  const [sliderMax, setSliderMax] = useState<number>(1500);
  const [maxPrice, setMaxPrice] = useState<number>(1500);

  useEffect(() => {
    let isMounted = true;
    async function loadFleet() {
      try {
        setIsLoading(true);
        const res = await vehiclesApi.list({ limit: 50, publicCatalog: 'true' });
        if (isMounted && res.success && res.vehicles && res.vehicles.length > 0) {
          const mapped = res.vehicles.map((v: any) => {
            const pricing = resolveVehiclePricing(v);
            const resolvedImage = getCarImage(v);
            return {
              id: v.id,
              brand: v.brand?.name || v.brand || '',
              model: v.model?.name || v.model || '',
              year: v.year,
              categoryName: v.category?.name || '',
              dailyRate: pricing.dailyRate,
              securityDeposit: pricing.securityDeposit,
              seats: v.seats || 5,
              transmission: v.transmission || 'AUTOMATIC',
              fuelType: v.fuelType || 'PETROL',
              primaryImageUrl: resolvedImage,
              zeroDeposit: pricing.zeroDeposit,
            };
          });
          const dynamicCap = Math.max(1200, ...mapped.map((m) => m.dailyRate));
          const roundedCap = Math.ceil(dynamicCap / 100) * 100;
          setSliderMax(roundedCap);
          setMaxPrice(roundedCap);
          setVehicles(mapped);
        } else if (isMounted) {
          setVehicles([]);
        }
      } catch (err) {
        console.error('Error loading fleet:', err);
        if (isMounted) setVehicles([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadFleet();
    return () => { isMounted = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => { if (v.categoryName) set.add(v.categoryName); });
    return ['ALL', ...Array.from(set)];
  }, [vehicles]);

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat,
        label: cat === 'ALL' ? t('portalPages.cars.allCategories') : cat,
      })),
    [categories, t]
  );

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        searchQuery === '' ||
        `${v.brand} ${v.model} ${v.categoryName}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || v.categoryName.toLowerCase() === selectedCategory.toLowerCase();
      const matchFuel = selectedFuel === 'ALL' || v.fuelType.toUpperCase() === selectedFuel.toUpperCase();
      const matchTrans = selectedTransmission === 'ALL' || v.transmission.toUpperCase() === selectedTransmission.toUpperCase();
      const matchPrice = v.dailyRate <= maxPrice;
      return matchSearch && matchCat && matchFuel && matchTrans && matchPrice;
    });
  }, [vehicles, searchQuery, selectedCategory, selectedFuel, selectedTransmission, maxPrice]);

  return (
    <div className="cp-page-container">
      {/* Page Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.cars.title')}</h1>
          <p className="cp-page-subtitle">
            {t('portalPages.cars.subtitle')}
          </p>
        </div>
        <div className="cp-header-actions">
          <Link to="/customer/assistant" className="cp-btn-outline" style={{ background: '#FFFFFF' }}>
            <Sparkles size={16} color="#FAB826" />
            {t('portalPages.cars.askAssistant')}
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cp-card" style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="cp-label">{t('portalPages.cars.search')}</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-subtle)' }} />
              <input
                type="text"
                placeholder={t('portalPages.cars.searchPlaceholder')}
                className="cp-input"
                style={{ paddingLeft: '38px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="cp-label">{t('portalPages.cars.category')}</label>
            <CustomSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(String(val))}
              options={categoryOptions}
              size="md"
            />
          </div>

          <div>
            <label className="cp-label">{t('cars.specs.fuel')}</label>
            <CustomSelect
              value={selectedFuel}
              onChange={(val) => setSelectedFuel(String(val))}
              options={[
                { value: 'ALL', label: t('portalPages.cars.allFuel') },
                { value: 'PETROL', label: t('cars.specs.petrol') },
                { value: 'ELECTRIC', label: t('cars.specs.electric'), badge: 'EV' },
                { value: 'HYBRID', label: t('cars.specs.hybrid') },
                { value: 'DIESEL', label: t('cars.specs.diesel') },
              ]}
              size="md"
            />
          </div>

          <div>
            <label className="cp-label">{t('cars.specs.transmission')}</label>
            <CustomSelect
              value={selectedTransmission}
              onChange={(val) => setSelectedTransmission(String(val))}
              options={[
                { value: 'ALL', label: t('portalPages.cars.allTransmissions') },
                { value: 'AUTOMATIC', label: t('cars.specs.automatic') },
                { value: 'MANUAL', label: t('cars.specs.manual') },
              ]}
              size="md"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="cp-label">{t('portalPages.cars.maxPrice')}</label>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-primary)' }}>{formatMoney(maxPrice)}</span>
            </div>
            <input
              type="range"
              min={80}
              max={sliderMax}
              step={25}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label={t('portalPages.cars.maxPrice')}
              style={{ width: '100%', accentColor: 'var(--cp-accent)' }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Vehicles */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="cp-card cp-skeleton" style={{ height: '360px' }} />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="cp-card cp-empty-state">
          <div className="cp-empty-icon">
            <Car size={32} />
          </div>
          <h3 className="cp-empty-title">{t('portalPages.cars.emptyTitle')}</h3>
          <p className="cp-empty-desc">
            {t('portalPages.cars.emptyDesc')}
          </p>
          <button
            className="cp-btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedFuel('ALL');
              setSelectedTransmission('ALL');
              setMaxPrice(sliderMax);
            }}
          >
            {t('portalPages.cars.reset')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          {filteredVehicles.map((car) => {
            const fullBleed = isFullBleedCarPhoto(car.primaryImageUrl);
            return (
            <div
              key={car.id}
              className="cp-auto-card"
            >
              {/* Image Stage matching website */}
              <div className={`cp-auto-card-stage ${fullBleed ? 'is-photo-stage' : ''}`}>
                <img
                  src={car.primaryImageUrl}
                  alt={`${car.brand} ${car.model}`}
                  className={`cp-auto-card-img ${fullBleed ? 'is-photo' : ''}`}
                  onError={(e) => {
                    const fallback = getCarImage({ ...car, primaryImageUrl: undefined });
                    if (!e.currentTarget.src.includes(fallback)) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
                <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', zIndex: 3 }}>
                  <span className="cp-badge cp-badge-accent">{car.categoryName}</span>
                  {car.zeroDeposit && <span className="cp-badge cp-badge-success">{t('portalPages.cars.noDeposit')}</span>}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(30, 4, 50, 0.88)',
                    backdropFilter: 'blur(6px)',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    zIndex: 3,
                  }}
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cp-accent)' }}>
                    {formatMoney(car.dailyRate)}
                  </span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{t('portalPages.vehicle.perDay')}</span>
                </div>
              </div>

              {/* Body Content */}
              <div className="cp-auto-card-body">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', fontWeight: 600 }}>
                    {[car.brand, car.year].filter(Boolean).join(' • ')}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '4px 0 0 0' }}>
                    {car.model}
                  </h3>
                </div>

                {/* Specs row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 92px), 1fr))',
                    gap: '8px',
                    background: '#F8F6F9',
                    padding: '10px',
                    borderRadius: 'var(--cp-radius-md)',
                    fontSize: '0.8rem',
                    color: 'var(--cp-text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="var(--cp-primary)" />
                    <span>{t('portalPages.cars.seats', { count: car.seats })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gauge size={14} color="var(--cp-primary)" />
                    <span>{specLabel(car.transmission)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Fuel size={14} color="var(--cp-primary)" />
                    <span>{specLabel(car.fuelType)}</span>
                  </div>
                </div>

                {/* Benefits */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>{t('portalPages.vehicle.inspectionIncluded')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>{t('portalPages.cars.cancelBeforePickup')}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 125px), 1fr))', gap: '10px', marginTop: 'auto' }}>
                  <Link
                    to={`/customer/cars/${car.id}`}
                    className="cp-btn-outline"
                    style={{ textAlign: 'center', fontSize: '0.85rem', padding: '8px' }}
                  >
                    {t('portalPages.cars.viewDetails')}
                  </Link>
                  <button
                    onClick={() => navigate(`/customer/bookings/new?vehicleId=${car.id}`)}
                    className="cp-btn-primary"
                    style={{ fontSize: '0.85rem', padding: '8px' }}
                  >
                    {t('portalPages.cars.bookNow')}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
