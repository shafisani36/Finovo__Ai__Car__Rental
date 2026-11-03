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
import './CustomerPortal.css';

const FALLBACK_CARS = [
  {
    id: 'car-bmw-m4',
    brand: 'BMW',
    model: 'M4 Competition Coupe',
    year: 2025,
    categoryName: 'Sports',
    dailyRate: 299,
    seats: 4,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    primaryImageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
    zeroDeposit: true,
  },
  {
    id: 'car-porsche-taycan',
    brand: 'Porsche',
    model: 'Taycan 4S Turbo Electric',
    year: 2025,
    categoryName: 'Electric',
    dailyRate: 349,
    seats: 4,
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    primaryImageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
    zeroDeposit: false,
  },
  {
    id: 'car-mercedes-gle',
    brand: 'Mercedes-Benz',
    model: 'GLE 450 AMG Luxury SUV',
    year: 2024,
    categoryName: 'SUV',
    dailyRate: 239,
    seats: 7,
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    primaryImageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
    zeroDeposit: true,
  },
  {
    id: 'car-audi-rs7',
    brand: 'Audi',
    model: 'RS7 Sportback Performance',
    year: 2024,
    categoryName: 'Luxury',
    dailyRate: 279,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    primaryImageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=80',
    zeroDeposit: false,
  },
  {
    id: 'car-tesla-modely',
    brand: 'Tesla',
    model: 'Model Y Long Range AWD',
    year: 2025,
    categoryName: 'Electric',
    dailyRate: 159,
    seats: 5,
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    primaryImageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    zeroDeposit: true,
  },
  {
    id: 'car-landrover-defender',
    brand: 'Land Rover',
    model: 'Defender 110 X-Dynamic',
    year: 2024,
    categoryName: 'SUV',
    dailyRate: 249,
    seats: 7,
    transmission: 'AUTOMATIC',
    fuelType: 'DIESEL',
    primaryImageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    zeroDeposit: false,
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
  const [maxPrice, setMaxPrice] = useState<number>(500);

  useEffect(() => {
    let isMounted = true;
    async function loadFleet() {
      try {
        setIsLoading(true);
        const res = await vehiclesApi.list({ limit: 50 });
        if (isMounted && res.success && res.vehicles && res.vehicles.length > 0) {
          const mapped = res.vehicles.map((v: any) => ({
            id: v.id,
            brand: v.brand?.name || v.brand || 'Luxury',
            model: v.model?.name || v.model || 'Performance',
            year: v.year || 2024,
            categoryName: v.category?.name || v.category || 'Premium',
            dailyRate: Number(v.pricing?.dailyRate || v.dailyRate || 189),
            seats: v.seats || 5,
            transmission: v.transmission || 'AUTOMATIC',
            fuelType: v.fuelType || 'PETROL',
            primaryImageUrl: v.media?.find((m: any) => m.isPrimary)?.fileUrl || v.primaryImageUrl || FALLBACK_CARS[0].primaryImageUrl,
            zeroDeposit: v.zeroDeposit || true,
          }));
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
            <select
              className="cp-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="cp-label">Fuel Engine</label>
            <select
              className="cp-select"
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
            >
              <option value="ALL">All Fuel Types</option>
              <option value="PETROL">Petrol</option>
              <option value="ELECTRIC">Electric (EV)</option>
              <option value="HYBRID">Hybrid</option>
              <option value="DIESEL">Diesel</option>
            </select>
          </div>

          <div>
            <label className="cp-label">Transmission</label>
            <select
              className="cp-select"
              value={selectedTransmission}
              onChange={(e) => setSelectedTransmission(e.target.value)}
            >
              <option value="ALL">All Transmissions</option>
              <option value="AUTOMATIC">Automatic</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="cp-label">Max Price / Day</label>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-primary)' }}>${maxPrice}</span>
            </div>
            <input
              type="range"
              min={80}
              max={600}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cp-accent)' }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Vehicles */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
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
              setMaxPrice(500);
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredVehicles.map((car) => (
            <div
              key={car.id}
              className="cp-auto-card"
            >
              {/* Image Stage matching website */}
              <div className="cp-auto-card-stage">
                <img
                  src={car.primaryImageUrl}
                  alt={`${car.brand} ${car.model}`}
                  className="cp-auto-card-img"
                  onError={(e) => {
                    e.currentTarget.src = '/cars/car-4-tucson.png';
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
                    gridTemplateColumns: 'repeat(3, 1fr)',
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
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
          ))}
        </div>
      )}
    </div>
  );
}
