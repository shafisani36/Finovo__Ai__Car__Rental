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
import { getCarImage, isFullBleedCarPhoto, resolveVehiclePricing } from '../../../utils/carImageHelper';
import { CustomSelect } from '../../../components/common/CustomSelect';
import './CustomerPortal.css';

const FALLBACK_CARS = [
  {
    id: 'car-bmw-m4',
    brand: 'BMW',
    model: 'M4 Competition Coupe',
    year: 2026,
    categoryName: 'Coupe / Sports',
    dailyRate: 480,
    securityDeposit: 800,
    seats: 4,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    primaryImageUrl: '/cars/studio-bmw-m4.jpg',
    zeroDeposit: false,
  },
  {
    id: 'car-bmw-x5m',
    brand: 'BMW',
    model: 'X5 M Competition',
    year: 2026,
    categoryName: 'SUV',
    dailyRate: 360,
    securityDeposit: 600,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    primaryImageUrl: '/cars/studio-bmw-x5.jpg',
    zeroDeposit: false,
  },
  {
    id: 'car-hyundai-tucson',
    brand: 'Hyundai',
    model: 'Tucson Hybrid AWD',
    year: 2026,
    categoryName: 'SUV',
    dailyRate: 155,
    securityDeposit: 0,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    primaryImageUrl: '/cars/finovo-blue-car.png',
    zeroDeposit: true,
  },
  {
    id: 'car-bmw-520i',
    brand: 'BMW',
    model: '520 i M-Sport',
    year: 2026,
    categoryName: 'Sedan',
    dailyRate: 210,
    securityDeposit: 400,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    primaryImageUrl: '/cars/bmw.png',
    zeroDeposit: false,
  },
  {
    id: 'car-tesla-model3',
    brand: 'Tesla',
    model: 'Model 3 Performance',
    year: 2026,
    categoryName: 'Coupe / Sports',
    dailyRate: 225,
    securityDeposit: 300,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    primaryImageUrl: '/cars/finovo-red-car.png',
    zeroDeposit: false,
  },
  {
    id: 'car-toyota-corolla',
    brand: 'Toyota',
    model: 'Corolla Altis Grande',
    year: 2025,
    categoryName: 'Sedan',
    dailyRate: 95,
    securityDeposit: 0,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    primaryImageUrl: '/cars/finovo-white-car.png',
    zeroDeposit: true,
  },
];

export function CustomerCarsPage() {
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
        const res = await vehiclesApi.list({ limit: 50 });
        if (isMounted && res.success && res.vehicles && res.vehicles.length > 0) {
          const mapped = res.vehicles.map((v: any) => {
            const pricing = resolveVehiclePricing(v);
            const resolvedImage = getCarImage(v);
            return {
              id: v.id,
              brand: v.brand?.name || v.brand || 'Luxury',
              model: v.model?.name || v.model || 'Performance',
              year: v.year || 2026,
              categoryName: v.category?.name || v.category || 'Premium',
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
          setVehicles(FALLBACK_CARS);
        }
      } catch (err) {
        console.error('Error loading fleet:', err);
        if (isMounted) setVehicles(FALLBACK_CARS);
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
        label: cat === 'ALL' ? 'All Categories' : cat,
      })),
    [categories]
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
          <h1 className="cp-page-title">Explore Verified Rental Fleet</h1>
          <p className="cp-page-subtitle">
            Premium, AI-inspected vehicles ready for instant digital checkout & smart handover.
          </p>
        </div>
        <div className="cp-header-actions">
          <Link to="/customer/assistant" className="cp-btn-outline" style={{ background: '#FFFFFF' }}>
            <Sparkles size={16} color="#FAB826" />
            Ask AI Concierge
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cp-card" style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="cp-label">Search Vehicle or Brand</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-subtle)' }} />
              <input
                type="text"
                placeholder="e.g. BMW, SUV, Porsche..."
                className="cp-input"
                style={{ paddingLeft: '38px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="cp-label">Category</label>
            <CustomSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(String(val))}
              options={categoryOptions}
              size="md"
            />
          </div>

          <div>
            <label className="cp-label">Fuel Engine</label>
            <CustomSelect
              value={selectedFuel}
              onChange={(val) => setSelectedFuel(String(val))}
              options={[
                { value: 'ALL', label: 'All Fuel Types' },
                { value: 'PETROL', label: 'Petrol' },
                { value: 'ELECTRIC', label: 'Electric (EV)', badge: 'EV' },
                { value: 'HYBRID', label: 'Hybrid' },
                { value: 'DIESEL', label: 'Diesel' },
              ]}
              size="md"
            />
          </div>

          <div>
            <label className="cp-label">Transmission</label>
            <CustomSelect
              value={selectedTransmission}
              onChange={(val) => setSelectedTransmission(String(val))}
              options={[
                { value: 'ALL', label: 'All Transmissions' },
                { value: 'AUTOMATIC', label: 'Automatic' },
                { value: 'MANUAL', label: 'Manual' },
              ]}
              size="md"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="cp-label">Max Price / Day</label>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-primary)' }}>${maxPrice}</span>
            </div>
            <input
              type="range"
              min={80}
              max={sliderMax}
              step={25}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
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
          <h3 className="cp-empty-title">No matching vehicles found</h3>
          <p className="cp-empty-desc">
            Try adjusting your search criteria, fuel preference, or price slider to see more available cars.
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
            Reset All Filters
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
                  {car.zeroDeposit && <span className="cp-badge cp-badge-success">Zero Deposit</span>}
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
                    ${car.dailyRate}
                  </span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>/ day</span>
                </div>
              </div>

              {/* Body Content */}
              <div className="cp-auto-card-body">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', fontWeight: 600 }}>
                    {car.brand} • {car.year}
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
                    <span>{car.seats} Seats</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gauge size={14} color="var(--cp-primary)" />
                    <span style={{ textTransform: 'capitalize' }}>{car.transmission?.toLowerCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Fuel size={14} color="var(--cp-primary)" />
                    <span style={{ textTransform: 'capitalize' }}>{car.fuelType?.toLowerCase()}</span>
                  </div>
                </div>

                {/* Benefits */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>Instant Digital Handover & AI Inspection</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>Free cancellation up to 24h before pickup</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 125px), 1fr))', gap: '10px', marginTop: 'auto' }}>
                  <Link
                    to={`/customer/cars/${car.id}`}
                    className="cp-btn-outline"
                    style={{ textAlign: 'center', fontSize: '0.85rem', padding: '8px' }}
                  >
                    View Specs
                  </Link>
                  <button
                    onClick={() => navigate(`/customer/bookings/new?vehicleId=${car.id}`)}
                    className="cp-btn-primary"
                    style={{ fontSize: '0.85rem', padding: '8px' }}
                  >
                    Book Now
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
