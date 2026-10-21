import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Search,
  CalendarDays,
  CarFront,
  Grid2X2,
  List,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { vehiclesApi } from '../../api/services/vehicles.api';
import type { Vehicle } from '../../features/fleet/types/fleet.types';

// Assets
import heroImg from '../../assets/cars/finovo-hero.png';
import redCar from '../../assets/cars/finovo-red-car.png';
import grayCar from '../../assets/cars/finovo-gray-car.png';
import blueCar from '../../assets/cars/finovo-blue-car.png';
import whiteCar from '../../assets/cars/finovo-white-car.png';
import yellowCar from '../../assets/cars/finovo-yellow-car.png';
import greenCar from '../../assets/cars/finovo-green-car.png';
import bmwLogo from '../../assets/cars/finovo-bmw-logo.png';
import lamboLogo from '../../assets/cars/finovo-lamborghini-logo.png';

interface CatalogCar {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  fuel: string;
  transmission: string;
  seats: number;
  pricePerDay: number;
  featured?: boolean;
  image: string;
  logo: string;
  mileageLimit: string;
}

const DEFAULT_FLEET: CatalogCar[] = [
  {
    id: 'car-1',
    name: 'Lamborghini Huracán Evo',
    brand: 'Lamborghini',
    model: 'Huracán Evo',
    year: 2026,
    type: 'Sports',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 2,
    pricePerDay: 1000,
    featured: true,
    image: redCar,
    logo: lamboLogo,
    mileageLimit: '250 km/day',
  },
  {
    id: 'car-2',
    name: 'BMW 520i M Sport',
    brand: 'BMW',
    model: '520i',
    year: 2026,
    type: 'Sedan',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 500,
    image: grayCar,
    logo: bmwLogo,
    mileageLimit: '300 km/day',
  },
  {
    id: 'car-3',
    name: 'BMW X5 xDrive40i',
    brand: 'BMW',
    model: 'X5',
    year: 2026,
    type: 'SUV',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 550,
    image: blueCar,
    logo: bmwLogo,
    mileageLimit: '300 km/day',
  },
  {
    id: 'car-4',
    name: 'BMW 740i Pure Luxury',
    brand: 'BMW',
    model: '740i',
    year: 2026,
    type: 'Sedan',
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 600,
    image: whiteCar,
    logo: bmwLogo,
    mileageLimit: 'Unlimited',
  },
  {
    id: 'car-5',
    name: 'Lamborghini Revuelto V12',
    brand: 'Lamborghini',
    model: 'Revuelto',
    year: 2026,
    type: 'Sports',
    fuel: 'Hybrid',
    transmission: 'Automatic',
    seats: 2,
    pricePerDay: 1200,
    featured: true,
    image: yellowCar,
    logo: lamboLogo,
    mileageLimit: '250 km/day',
  },
  {
    id: 'car-6',
    name: 'Lamborghini Urus Performante',
    brand: 'Lamborghini',
    model: 'Urus',
    year: 2026,
    type: 'SUV',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 1100,
    featured: true,
    image: greenCar,
    logo: lamboLogo,
    mileageLimit: '300 km/day',
  },
];

export function AvailableCarsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedType, setSelectedType] = useState('All Types');
  const [priceRange, setPriceRange] = useState('Any Price');
  const [sortOption, setSortOption] = useState('Newest First');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [liveCars, setLiveCars] = useState<CatalogCar[]>(DEFAULT_FLEET);

  // Fetch live available vehicles from backend, mapping into catalog items
  useEffect(() => {
    let isMounted = true;
    async function loadVehicles() {
      try {
        const res = await vehiclesApi.list({ status: 'AVAILABLE', limit: 50 });
        if (res?.vehicles && res.vehicles.length > 0 && isMounted) {
          const mapped: CatalogCar[] = res.vehicles.map((v: Vehicle, i: number) => {
            const isLambo = v.brand?.toLowerCase().includes('lambo') || v.model?.toLowerCase().includes('hurac');
            return {
              id: v.id,
              name: `${v.brand} ${v.model}`,
              brand: v.brand,
              model: v.model,
              year: v.year || 2026,
              type: v.category?.name || 'Sedan',
              fuel: v.fuelType || 'Petrol',
              transmission: v.transmission || 'Automatic',
              seats: v.seats || 5,
              pricePerDay: Number(v.dailyRate || 500),
              featured: isLambo,
              image: isLambo ? (i % 2 === 0 ? redCar : yellowCar) : (i % 2 === 0 ? grayCar : blueCar),
              logo: isLambo ? lamboLogo : bmwLogo,
              mileageLimit: v.mileageLimitPerDay ? `${v.mileageLimitPerDay} km/day` : '300 km/day',
            };
          });
          setLiveCars(mapped);
        }
      } catch (err) {
        // Fallback to DEFAULT_FLEET on offline / network error
      }
    }
    loadVehicles();
    return () => {
      isMounted = false;
    };
  }, []);

  const multiplier = period === 'Weekly' ? 7 : period === 'Monthly' ? 30 : 1;

  const filteredCars = useMemo(() => {
    return liveCars.filter((car) => {
      const matchSearch =
        search === '' ||
        car.name.toLowerCase().includes(search.toLowerCase()) ||
        car.brand.toLowerCase().includes(search.toLowerCase());
      const matchBrand = selectedBrand === 'All Brands' || car.brand.toLowerCase() === selectedBrand.toLowerCase();
      const matchType = selectedType === 'All Types' || car.type.toLowerCase() === selectedType.toLowerCase();

      let matchPrice = true;
      if (priceRange === 'SAR 500 or less') matchPrice = car.pricePerDay <= 500;
      if (priceRange === 'SAR 500–1,000') matchPrice = car.pricePerDay > 500 && car.pricePerDay <= 1000;
      if (priceRange === 'Above SAR 1,000') matchPrice = car.pricePerDay > 1000;

      return matchSearch && matchBrand && matchType && matchPrice;
    }).sort((a, b) => {
      if (sortOption === 'Price: Low to High') return a.pricePerDay - b.pricePerDay;
      if (sortOption === 'Price: High to Low') return b.pricePerDay - a.pricePerDay;
      return b.year - a.year;
    });
  }, [liveCars, search, selectedBrand, selectedType, priceRange, sortOption]);

  return (
    <div style={{ backgroundColor: '#F9F8FA', minHeight: '100vh', color: '#1E0426', fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)' }}>
      {/* Hero Banner */}
      <section
        style={{
          position: 'relative',
          backgroundColor: '#1E0426',
          color: '#FFFFFF',
          padding: '50px 6% 60px',
          overflow: 'hidden',
        }}
      >
        <img
          src={heroImg}
          alt="Finovo Available Fleet"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.85,
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase', marginBottom: '8px' }}>
            EXTRAORDINARY CARS · MEMORABLE JOURNEYS
          </p>
          <h1 style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1.15, marginBottom: '14px' }}>
            Available Cars
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.6, opacity: 0.9, marginBottom: '28px' }}>
            Find your perfect drive from our curated collection of world-class sedans, SUVs, and exotics.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826' }}>
                <CarFront size={18} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>Premium Fleet</p>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>Latest 2025/2026 models</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826' }}>
                <CalendarDays size={18} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>Flexible Rental</p>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>Daily, Weekly, Monthly</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826' }}>
                <Globe size={18} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>Trusted Service</p>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>Free 24hr cancellation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section style={{ maxWidth: '1240px', margin: '-30px auto 40px', padding: '0 24px', position: 'relative', zIndex: 5 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            border: '1px solid #ECEAEF',
          }}
        >
          {/* Top row: Search + Period pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search for your dream car by make or model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 16px 11px 40px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Period selector */}
            <div style={{ display: 'inline-flex', backgroundColor: '#F3F4F6', borderRadius: '12px', padding: '4px' }}>
              {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: period === p ? '#1E0426' : 'transparent',
                    color: period === p ? '#FAB826' : '#4B5563',
                    transition: 'all 0.2s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: Dropdown filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            {/* Brand Dropdown */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>BRAND</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
              >
                <option>All Brands</option>
                <option>BMW</option>
                <option>Lamborghini</option>
                <option>Mercedes-Benz</option>
                <option>Porsche</option>
                <option>Audi</option>
              </select>
            </div>

            {/* Vehicle Type */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>VEHICLE TYPE</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
              >
                <option>All Types</option>
                <option>Sedan</option>
                <option>SUV</option>
                <option>Sports</option>
                <option>Hatchback</option>
              </select>
            </div>

            {/* Price Range */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>PRICE RANGE</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
              >
                <option>Any Price</option>
                <option>SAR 500 or less</option>
                <option>SAR 500–1,000</option>
                <option>Above SAR 1,000</option>
              </select>
            </div>

            {/* Reset Filters */}
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '18px' }}>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedBrand('All Brands');
                  setSelectedType('All Types');
                  setPriceRange('Any Price');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '10px',
                }}
              >
                {t('common.actions.reset')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid Section */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 80px', padding: '0 24px' }}>
        {/* Results Count & View Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1E0426', margin: 0 }}>
              {filteredCars.length} Cars Available
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
              Select a vehicle to inspect complete specifications, options, and instant checkout.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option>Newest First</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>

            {/* Grid / List Toggles */}
            <div style={{ display: 'flex', backgroundColor: '#E5E7EB', borderRadius: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  cursor: 'pointer',
                }}
                aria-label="Grid view"
              >
                <Grid2X2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  cursor: 'pointer',
                }}
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Cars List */}
        {filteredCars.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px' }}>
            <CarFront size={48} color="#9CA3AF" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1E0426' }}>No vehicles match your criteria</h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '6px' }}>
              Try loosening your search terms or clearing the selected filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedBrand('All Brands');
                setSelectedType('All Types');
                setPriceRange('Any Price');
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#1E0426',
                color: '#FAB826',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(340px, 1fr))' : '1fr',
              gap: '24px',
            }}
          >
            {filteredCars.map((car) => {
              const displayPrice = car.pricePerDay * multiplier;
              return (
                <article
                  key={car.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid #ECEAEF',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: viewMode === 'list' ? 'row' : 'column',
                    justifyContent: 'space-between',
                    gap: '20px',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  className="car-card-hover"
                >
                  {/* Top info & Brand logo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                        Available
                      </span>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E0426', margin: '8px 0 2px' }}>
                        {car.name}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                        {car.year} · {car.type} · {car.transmission} · {car.fuel}
                      </p>
                    </div>

                    <img src={car.logo} alt={car.brand} style={{ height: '36px', objectFit: 'contain' }} />
                  </div>

                  {/* Car Image with smooth container */}
                  <div
                    style={{
                      height: '180px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F8F7FA',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      padding: '10px',
                    }}
                  >
                    <img
                      src={car.image}
                      alt={car.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      loading="lazy"
                    />
                  </div>

                  {/* Specs row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '16px',
                      borderTop: '1px solid #F3F4F6',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Mileage</span>
                      <strong style={{ fontSize: '13px', color: '#1E0426' }}>{car.mileageLimit}</strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>{period} Rate</span>
                      <strong style={{ fontSize: '18px', color: '#1E0426', fontWeight: 800 }}>
                        SAR {displayPrice.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/cars/${car.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: '#1E0426',
                      color: '#FAB826',
                      fontWeight: 700,
                      fontSize: '14px',
                      padding: '12px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <span>View Details & Book</span>
                    <ChevronRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
