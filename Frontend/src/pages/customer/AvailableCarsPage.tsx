import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  CarFront,
  CalendarDays,
  Globe,
  SlidersHorizontal,
  Grid2X2,
  List,
  Leaf,
  Gauge,
  Check,
  RotateCcw,
  Users,
  Sparkles,
} from 'lucide-react';
import { vehiclesApi } from '../../api/services/vehicles.api';
import type { Vehicle } from '../../features/fleet/types/fleet.types';
import { getCarImage, resolveVehiclePricing } from '../../utils/carImageHelper';
import './AvailableCarsPage.css';
import { CarCard } from '../../components/common/CarCard';
import { CustomSelect } from '../../components/common/CustomSelect';

// Master Visual Assets matching Figma Design Specification
import heroCarImg from '../../assets/cars/finovo-available-hero-car.png';
import redCar from '../../assets/cars/finovo-red-car.png';
import grayCar from '../../assets/cars/finovo-gray-car.png';
import blueCar from '../../assets/cars/finovo-blue-car.png';
import whiteCar from '../../assets/cars/finovo-white-car.png';
import yellowCar from '../../assets/cars/finovo-yellow-car.png';
import greenCar from '../../assets/cars/finovo-green-car.png';
import bmwLogo from '../../assets/cars/finovo-bmw-logo.png';
import lamboLogo from '../../assets/cars/finovo-lamborghini-logo.png';

export interface CatalogCar {
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
  currency?: string;
  isWideHero?: boolean;
  tagline?: string;
  image: string;
  logo: string;
  mileageLimit: string;
  available: boolean;
  unlimitedMileage?: boolean;
  zeroDeposit?: boolean;
}

// Master Fallback Catalog (Synced with Seeded 12 Distinct Master Vehicles)
const MASTER_FLEET: CatalogCar[] = [
  {
    id: 'car-1',
    name: 'Lamborghini Huracán Evo',
    brand: 'Lamborghini',
    model: 'Huracán Evo',
    year: 2026,
    type: 'Coupe / Sports',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 2,
    pricePerDay: 980,
    isWideHero: true,
    tagline: 'Unleash extraordinary V10 performance.',
    image: '/cars/orange-car.jpg',
    logo: lamboLogo,
    mileageLimit: '200 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-2',
    name: 'BMW 520 i',
    brand: 'BMW',
    model: '520 i',
    year: 2026,
    type: 'Sedan',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 210,
    image: '/cars/bmw.png',
    logo: bmwLogo,
    mileageLimit: '300 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-3',
    name: 'BMW X5 M Competition',
    brand: 'BMW',
    model: 'X5 M Competition',
    year: 2026,
    type: 'SUV',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 360,
    image: '/cars/studio-bmw-x5.jpg',
    logo: bmwLogo,
    mileageLimit: '280 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-4',
    name: 'Toyota Corolla Altis Grande',
    brand: 'Toyota',
    model: 'Corolla Altis Grande',
    year: 2025,
    type: 'Sedan',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 95,
    image: whiteCar,
    logo: bmwLogo,
    mileageLimit: '350 km',
    available: true,
    zeroDeposit: true,
  },
  {
    id: 'car-5',
    name: 'Tesla Model 3 Long Range',
    brand: 'Tesla',
    model: 'Model 3 Long Range',
    year: 2026,
    type: 'Sedan',
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 165,
    image: grayCar,
    logo: bmwLogo,
    mileageLimit: '320 km',
    available: true,
    zeroDeposit: true,
  },
  {
    id: 'car-6',
    name: 'Tesla Model 3 Performance',
    brand: 'Tesla',
    model: 'Model 3 Performance',
    year: 2026,
    type: 'Coupe / Sports',
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 225,
    image: redCar,
    logo: bmwLogo,
    mileageLimit: '300 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-7',
    name: 'Ford Focus ST',
    brand: 'Ford',
    model: 'Focus ST',
    year: 2025,
    type: 'Hatchback',
    fuel: 'Petrol',
    transmission: 'Manual',
    seats: 5,
    pricePerDay: 125,
    image: yellowCar,
    logo: lamboLogo,
    mileageLimit: '300 km',
    available: true,
    zeroDeposit: true,
  },
  {
    id: 'car-8',
    name: 'MINI Cooper Works',
    brand: 'MINI',
    model: 'Cooper Works',
    year: 2025,
    type: 'Hatchback',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 4,
    pricePerDay: 140,
    image: greenCar,
    logo: lamboLogo,
    mileageLimit: '300 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-9',
    name: 'Hyundai Tucson Hybrid AWD',
    brand: 'Hyundai',
    model: 'Tucson Hybrid AWD',
    year: 2026,
    type: 'SUV',
    fuel: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 155,
    image: blueCar,
    logo: bmwLogo,
    mileageLimit: '350 km',
    available: true,
    zeroDeposit: true,
  },
  {
    id: 'car-10',
    name: 'BMW 740i Executive',
    brand: 'BMW',
    model: '740i Executive',
    year: 2026,
    type: 'Luxury / Executive',
    fuel: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 420,
    image: '/cars/studio-bmw-740i.jpg',
    logo: bmwLogo,
    mileageLimit: '300 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-11',
    name: 'Lamborghini Urus S',
    brand: 'Lamborghini',
    model: 'Urus S',
    year: 2026,
    type: 'SUV',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    pricePerDay: 1150,
    isWideHero: true,
    tagline: 'Extraordinary luxury in every terrain.',
    image: '/cars/studio-lambo-urus.jpg',
    logo: lamboLogo,
    mileageLimit: '250 km',
    available: true,
    zeroDeposit: false,
  },
  {
    id: 'car-12',
    name: 'BMW M4 Competition',
    brand: 'BMW',
    model: 'M4 Competition',
    year: 2026,
    type: 'Coupe / Sports',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 4,
    pricePerDay: 480,
    image: '/cars/studio-bmw-m4.jpg',
    logo: bmwLogo,
    mileageLimit: '250 km',
    available: true,
    zeroDeposit: false,
  },
];

export function AvailableCarsPage() {
  const { t } = useTranslation();
  // Primary State Pipeline
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedPriceRange, setSelectedPriceRange] = useState('Any Price');
  const [selectedTransmission, setSelectedTransmission] = useState('Any');
  const [selectedFuel, setSelectedFuel] = useState('Any');
  const [sortOption, setSortOption] = useState('Newest First');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Dropdown Open State Management
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // More Filters Modal
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string>('Any');
  const [zeroDepositOnly, setZeroDepositOnly] = useState<boolean>(false);
  const [unlimitedMileageOnly, setUnlimitedMileageOnly] = useState<boolean>(false);

  // Date Range State
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateDisplay, setDateDisplay] = useState('MM/DD/YYYY - MM/DD/YYYY');

  // Live Dynamic Backend Vehicles State Layer
  const [fleet, setFleet] = useState<CatalogCar[]>(MASTER_FLEET);

  // Close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Live Vehicles Dynamically from backend API
  useEffect(() => {
    let isMounted = true;
    async function loadVehicles() {
      try {
        const res = await vehiclesApi.list({ limit: 100 });
        if (res?.vehicles && res.vehicles.length > 0 && isMounted) {
          const apiCars: CatalogCar[] = res.vehicles.map((v: Vehicle) => {
            const isLambo = v.brand?.toLowerCase().includes('lambo');
            const pricing = resolveVehiclePricing(v);
            const carImg = getCarImage(v);

            return {
              id: v.id,
              name: `${v.brand} ${v.model}`,
              brand: v.brand || 'Luxury',
              model: v.model || 'Performance',
              year: v.year || 2026,
              type: v.category?.name || 'Sedan',
              fuel: v.fuelType ? (v.fuelType.charAt(0) + v.fuelType.slice(1).toLowerCase()) : 'Petrol',
              transmission: v.transmission ? (v.transmission.charAt(0) + v.transmission.slice(1).toLowerCase()) : 'Automatic',
              seats: v.seats || 5,
              pricePerDay: pricing.dailyRate,
              currency: pricing.currency,
              isWideHero: isLambo,
              tagline: isLambo ? 'Unleash extraordinary performance.' : undefined,
              image: carImg,
              logo: isLambo ? lamboLogo : bmwLogo,
              mileageLimit: v.mileageLimitPerDay ? `${v.mileageLimitPerDay} km` : 'Unlimited',
              available: v.status === 'AVAILABLE',
              zeroDeposit: pricing.zeroDeposit,
              unlimitedMileage: !v.mileageLimitPerDay,
            };
          });

          setFleet(apiCars);
        }
      } catch (err) {
        // Fall back gracefully to MASTER_FLEET if offline
      }
    }
    loadVehicles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Multiplier for rental frequency
  const rateMultiplier = useMemo(() => {
    if (period === 'Weekly') return 7 * 0.9; // 10% discount for weekly
    if (period === 'Monthly') return 30 * 0.75; // 25% discount for monthly
    return 1;
  }, [period]);

  const periodLabel = useMemo(() => {
    if (period === 'Weekly') return t('cars.weeklyFee');
    if (period === 'Monthly') return t('cars.monthlyFee');
    return t('cars.dailyFee');
  }, [period, t]);

  const labelPeriodTab = (val: 'Daily' | 'Weekly' | 'Monthly') => {
    if (val === 'Weekly') return t('cars.weekly');
    if (val === 'Monthly') return t('cars.monthly');
    return t('cars.daily');
  };

  const labelBrand = (val: string) => (val === 'All Brands' ? t('cars.allBrands') : val);
  const labelType = (val: string) => (val === 'All Types' ? t('cars.allTypes') : val);
  const labelPrice = (val: string) => {
    if (val === 'Any Price') return t('cars.anyPrice');
    if (val === 'SAR 500 or less') return t('cars.priceUnder500');
    if (val === 'SAR 500–1,000') return t('cars.price500to1000');
    if (val === 'Above SAR 1,000') return t('cars.priceAbove1000');
    return val;
  };
  const labelTrans = (val: string) => {
    if (val === 'Any') return t('cars.any');
    if (val === 'Automatic') return t('cars.specs.automatic');
    if (val === 'Manual') return t('cars.specs.manual');
    return val;
  };
  const labelFuel = (val: string) => {
    if (val === 'Any') return t('cars.any');
    if (val === 'Petrol') return t('cars.specs.petrol');
    if (val === 'Electric') return t('cars.specs.electric');
    if (val === 'Hybrid') return t('cars.specs.hybrid');
    if (val === 'Diesel') return t('cars.specs.diesel');
    return val;
  };
  const labelSeats = (val: string) => {
    if (val === 'Any') return t('cars.any');
    if (val === '2 Seats') return t('cars.seats2');
    if (val === '4-5 Seats') return t('cars.seats45');
    if (val === '7+ Seats') return t('cars.seats7plus');
    return val;
  };

  // Extract available brands and types dynamically from fleet
  const brandOptions = useMemo(() => {
    const brands = Array.from(new Set(fleet.map((c) => c.brand)));
    return ['All Brands', ...brands];
  }, [fleet]);

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(fleet.map((c) => c.type)));
    return ['All Types', ...types];
  }, [fleet]);

  const priceOptions = ['Any Price', 'SAR 500 or less', 'SAR 500–1,000', 'Above SAR 1,000'];
  const transmissionOptions = ['Any', 'Automatic', 'Manual'];
  const fuelOptions = ['Any', 'Petrol', 'Electric', 'Hybrid', 'Diesel'];

  // Advanced Multi-Stage Filtering & Sorting Pipeline
  const filteredCars = useMemo(() => {
    return fleet
      .filter((car) => {
        // 1. Search Query
        if (search.trim() !== '') {
          const query = search.toLowerCase();
          const matchName = car.name.toLowerCase().includes(query);
          const matchBrand = car.brand.toLowerCase().includes(query);
          const matchModel = car.model.toLowerCase().includes(query);
          const matchType = car.type.toLowerCase().includes(query);
          if (!matchName && !matchBrand && !matchModel && !matchType) return false;
        }

        // 2. Brand Filter
        if (selectedBrand !== 'All Brands' && car.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }

        // 3. Vehicle Type Filter
        if (selectedType !== 'All Types' && car.type.toLowerCase() !== selectedType.toLowerCase()) {
          return false;
        }

        // 4. Price Filter
        if (selectedPriceRange === 'SAR 500 or less' && car.pricePerDay > 500) return false;
        if (selectedPriceRange === 'SAR 500–1,000' && (car.pricePerDay <= 500 || car.pricePerDay > 1000)) return false;
        if (selectedPriceRange === 'Above SAR 1,000' && car.pricePerDay <= 1000) return false;

        // 5. Transmission
        if (selectedTransmission !== 'Any' && car.transmission.toLowerCase() !== selectedTransmission.toLowerCase()) {
          return false;
        }

        // 6. Fuel Type
        if (selectedFuel !== 'Any' && car.fuel.toLowerCase() !== selectedFuel.toLowerCase()) {
          return false;
        }

        // 7. Extended Filters (Seats, Mileage, Deposit)
        if (selectedSeats !== 'Any') {
          if (selectedSeats === '2 Seats' && car.seats !== 2) return false;
          if (selectedSeats === '4-5 Seats' && car.seats < 4) return false;
          if (selectedSeats === '7+ Seats' && car.seats < 7) return false;
        }
        if (zeroDepositOnly && !car.zeroDeposit) return false;
        if (unlimitedMileageOnly && !car.unlimitedMileage) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'Price: Low to High') return a.pricePerDay - b.pricePerDay;
        if (sortOption === 'Price: High to Low') return b.pricePerDay - a.pricePerDay;
        if (sortOption === 'Most Popular') return (b.isWideHero ? 1 : 0) - (a.isWideHero ? 1 : 0);
        return b.year - a.year;
      });
  }, [
    fleet,
    search,
    selectedBrand,
    selectedType,
    selectedPriceRange,
    selectedTransmission,
    selectedFuel,
    selectedSeats,
    zeroDepositOnly,
    unlimitedMileageOnly,
    sortOption,
  ]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredCars.length / pageSize));
  const paginatedCars = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCars.slice(start, start + pageSize);
  }, [filteredCars, currentPage]);

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBrand !== 'All Brands') count++;
    if (selectedType !== 'All Types') count++;
    if (selectedPriceRange !== 'Any Price') count++;
    if (selectedTransmission !== 'Any') count++;
    if (selectedFuel !== 'Any') count++;
    if (selectedSeats !== 'Any') count++;
    if (zeroDepositOnly) count++;
    if (unlimitedMileageOnly) count++;
    if (search.trim() !== '') count++;
    return count;
  }, [
    selectedBrand,
    selectedType,
    selectedPriceRange,
    selectedTransmission,
    selectedFuel,
    selectedSeats,
    zeroDepositOnly,
    unlimitedMileageOnly,
    search,
  ]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBrand('All Brands');
    setSelectedType('All Types');
    setSelectedPriceRange('Any Price');
    setSelectedTransmission('Any');
    setSelectedFuel('Any');
    setSelectedSeats('Any');
    setZeroDepositOnly(false);
    setUnlimitedMileageOnly(false);
    setCurrentPage(1);
  };

  const handleApplyDates = () => {
    if (startDate && endDate) {
      setDateDisplay(`${startDate} - ${endDate}`);
    } else {
      setDateDisplay('MM/DD/YYYY - MM/DD/YYYY');
    }
    setDateModalOpen(false);
  };

  return (
    <div className="available-cars-page">
      {/* 1. HERO SHOWCASE BANNER */}
      <div className="cars-hero-wrapper">
        <section className="cars-hero-card" aria-label="Available Luxury Cars Banner">
          {/* Left Content Area */}
          <div className="cars-hero-content">
            <p className="cars-hero-tagline">{t('cars.tagline')}</p>
            <h1 className="cars-hero-title">{t('cars.pageTitle')}</h1>
            <p className="cars-hero-subtitle">
              {t('cars.pageSubtitle')}
            </p>

            {/* 3 Value Badges */}
            <div className="cars-hero-badges">
              <div className="cars-hero-badge-item">
                <div className="cars-hero-badge-icon">
                  <CarFront size={18} />
                </div>
                <div className="cars-hero-badge-text">
                  <h4>{t('cars.badge1Title')}</h4>
                  <p>{t('cars.badge1Sub')}</p>
                </div>
              </div>

              <div className="cars-hero-badge-item">
                <div className="cars-hero-badge-icon">
                  <CalendarDays size={18} />
                </div>
                <div className="cars-hero-badge-text">
                  <h4>{t('cars.badge2Title')}</h4>
                  <p>{t('cars.badge2Sub')}</p>
                </div>
              </div>

              <div className="cars-hero-badge-item">
                <div className="cars-hero-badge-icon">
                  <Globe size={18} />
                </div>
                <div className="cars-hero-badge-text">
                  <h4>{t('cars.badge3Title')}</h4>
                  <p>{t('cars.badge3Sub')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Area with Chevrolet Camaro Cutout */}
          <div className="cars-hero-visual">
            <img
              src={heroCarImg}
              alt="Finovo Master Purple Camaro Fleet"
              className="cars-hero-car-img"
              loading="eager"
            />
            {/* Cursive Signature Tagline */}
            <span className="cars-hero-handwritten-tag">{t('cars.handwrittenTag')}</span>
          </div>
        </section>
      </div>

      {/* 2. FLOATING LUXURY FILTER & SEARCH CARD */}
      <div className="available-cars-container cars-filter-bar-wrapper" ref={dropdownRef}>
        <div className="cars-filter-card">
          {/* Top Row: Search Input + Frequency Toggle + Date Range */}
          <div className="cars-filter-row-top">
            {/* Search Input */}
            <div className="cars-search-input-box">
              <Search size={18} className="cars-search-icon" />
              <input
                type="text"
                className="cars-search-input"
                placeholder={t('cars.searchPlaceholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="cars-search-clear-btn"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Rental Duration Frequency Segmented Tabs */}
            <div className="cars-frequency-pill-group" role="tablist" aria-label="Rental frequency">
              {(['Daily', 'Weekly', 'Monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  role="tab"
                  aria-selected={period === freq}
                  className={`cars-frequency-btn ${period === freq ? 'active' : ''}`}
                  onClick={() => setPeriod(freq)}
                >
                  {period === freq && <Sparkles size={13} color="#FAB826" />}
                  <span>{labelPeriodTab(freq)}</span>
                </button>
              ))}
            </div>

            {/* Date Range Quick Selector */}
            <div
              className="cars-date-picker-box"
              onClick={() => setDateModalOpen(true)}
              role="button"
              tabIndex={0}
              aria-label={t('cars.selectRentalDates')}
            >
              <Calendar size={18} className="cars-date-picker-icon" />
              <div className="cars-date-picker-info">
                <span className="cars-date-picker-label">{t('cars.dateRange')}</span>
                <span className="cars-date-picker-value">{dateDisplay}</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Dropdown Filters & Action Buttons */}
          <div className="cars-filter-row-bottom">
            {/* Brand Dropdown */}
            <div className="cars-dropdown-container">
              <button
                type="button"
                className={`cars-dropdown-trigger ${openDropdown === 'brand' ? 'open' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'brand' ? null : 'brand')}
              >
                <div>
                  <span className="cars-dropdown-label">{t('cars.brand')}</span>
                  <span className="cars-dropdown-value">{labelBrand(selectedBrand)}</span>
                </div>
                <ChevronDown size={14} className="cars-dropdown-arrow" />
              </button>

              {openDropdown === 'brand' && (
                <div className="cars-dropdown-menu">
                  {brandOptions.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      className={`cars-dropdown-item ${selectedBrand === brand ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{labelBrand(brand)}</span>
                      {selectedBrand === brand && <Check size={14} color="#FAB826" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Type Dropdown */}
            <div className="cars-dropdown-container">
              <button
                type="button"
                className={`cars-dropdown-trigger ${openDropdown === 'type' ? 'open' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
              >
                <div>
                  <span className="cars-dropdown-label">{t('cars.vehicleType')}</span>
                  <span className="cars-dropdown-value">{labelType(selectedType)}</span>
                </div>
                <ChevronDown size={14} className="cars-dropdown-arrow" />
              </button>

              {openDropdown === 'type' && (
                <div className="cars-dropdown-menu">
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`cars-dropdown-item ${selectedType === type ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedType(type);
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{labelType(type)}</span>
                      {selectedType === type && <Check size={14} color="#FAB826" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Range Dropdown */}
            <div className="cars-dropdown-container">
              <button
                type="button"
                className={`cars-dropdown-trigger ${openDropdown === 'price' ? 'open' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
              >
                <div>
                  <span className="cars-dropdown-label">{t('cars.priceRange')}</span>
                  <span className="cars-dropdown-value">{labelPrice(selectedPriceRange)}</span>
                </div>
                <ChevronDown size={14} className="cars-dropdown-arrow" />
              </button>

              {openDropdown === 'price' && (
                <div className="cars-dropdown-menu">
                  {priceOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`cars-dropdown-item ${selectedPriceRange === opt ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPriceRange(opt);
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{labelPrice(opt)}</span>
                      {selectedPriceRange === opt && <Check size={14} color="#FAB826" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transmission Dropdown */}
            <div className="cars-dropdown-container">
              <button
                type="button"
                className={`cars-dropdown-trigger ${openDropdown === 'transmission' ? 'open' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'transmission' ? null : 'transmission')}
              >
                <div>
                  <span className="cars-dropdown-label">{t('cars.transmission')}</span>
                  <span className="cars-dropdown-value">{labelTrans(selectedTransmission)}</span>
                </div>
                <ChevronDown size={14} className="cars-dropdown-arrow" />
              </button>

              {openDropdown === 'transmission' && (
                <div className="cars-dropdown-menu">
                  {transmissionOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`cars-dropdown-item ${selectedTransmission === opt ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTransmission(opt);
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{labelTrans(opt)}</span>
                      {selectedTransmission === opt && <Check size={14} color="#FAB826" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fuel Type Dropdown */}
            <div className="cars-dropdown-container">
              <button
                type="button"
                className={`cars-dropdown-trigger ${openDropdown === 'fuel' ? 'open' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'fuel' ? null : 'fuel')}
              >
                <div>
                  <span className="cars-dropdown-label">{t('cars.fuelType')}</span>
                  <span className="cars-dropdown-value">{labelFuel(selectedFuel)}</span>
                </div>
                <ChevronDown size={14} className="cars-dropdown-arrow" />
              </button>

              {openDropdown === 'fuel' && (
                <div className="cars-dropdown-menu">
                  {fuelOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`cars-dropdown-item ${selectedFuel === opt ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFuel(opt);
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{labelFuel(opt)}</span>
                      {selectedFuel === opt && <Check size={14} color="#FAB826" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* More Filters Button */}
            <button
              type="button"
              className="cars-more-filters-btn"
              onClick={() => setMoreFiltersOpen(true)}
            >
              <SlidersHorizontal size={15} />
              <span>{t('cars.moreFilters')}</span>
              {activeFiltersCount > 0 && (
                <span className="cars-active-filter-badge">{activeFiltersCount}</span>
              )}
            </button>

            {/* Apply / Reset Action Button */}
            <button
              type="button"
              className="cars-apply-filters-btn"
              onClick={() => {
                setOpenDropdown(null);
                setCurrentPage(1);
              }}
            >
              <span>{t('cars.applyFilters')}</span>
              <ChevronRight size={16} className="rtl-mirror-arrow" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN CATALOG SECTION */}
      <main className="available-cars-container">
        {/* Header Row: Results Count, Sort, Grid/List Toggles */}
        <div className="cars-catalog-header">
          <div className="cars-catalog-count-box">
            <h2>{filteredCars.length} {t('cars.carsAvailable')}</h2>
            <p>{t('cars.premiumCollection')}</p>
          </div>

          <div className="cars-catalog-controls">
            {/* Sort Dropdown */}
            <div className="cars-sort-selector-box">
              <span className="cars-sort-label">{t('cars.sortBy')}</span>
              <CustomSelect
                value={sortOption}
                onChange={(val) => setSortOption(String(val))}
                options={[
                  { value: 'Newest First', label: t('cars.sortNewest') },
                  { value: 'Price: Low to High', label: t('cars.sortPriceAsc') },
                  { value: 'Price: High to Low', label: t('cars.sortPriceDesc') },
                  { value: 'Most Popular', label: t('cars.sortPopular') },
                ]}
                fullWidth={false}
                size="sm"
                triggerStyle={{ minWidth: '185px', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="cars-view-toggle-group" role="group" aria-label="View layout switch">
              <button
                type="button"
                className={`cars-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid layout view"
              >
                <Grid2X2 size={16} />
              </button>
              <button
                type="button"
                className={`cars-view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List layout view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 4. CARS CATALOG: ASYMMETRIC GRID OR LIST */}
        {filteredCars.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '70px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '26px',
              border: '2px solid #3B094E',
            }}
          >
            <CarFront size={54} color="#9CA3AF" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#1C0324', margin: '0 0 6px 0' }}>
              {t('cars.noVehicles')}
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0' }}>
              {t('cars.noVehiclesDesc')}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                backgroundColor: '#1C0324',
                color: '#FAB826',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} />
              <span>{t('cars.resetFilters')}</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Master Unified Card Component Grid (Exact Match to Figma Image) */
          <div className="available-cars-grid">
            {paginatedCars.map((car) => (
              <CarCard
                key={car.id}
                id={car.id}
                name={car.name}
                brand={car.brand}
                model={car.model}
                year={car.year}
                type={car.type}
                fuel={car.fuel}
                transmission={car.transmission}
                seats={car.seats}
                pricePerDay={car.pricePerDay}
                currency={car.currency}
                rateMultiplier={rateMultiplier}
                periodLabel={periodLabel}
                mileageLimit={car.mileageLimit}
                image={car.image}
                logo={car.logo}
                available={car.available}
              />
            ))}
          </div>
        ) : (
          /* List Mode View */
          <div className="available-cars-list">
            {paginatedCars.map((car) => (
                <article key={car.id} className="car-card-list-item">
                  <div className="car-card-list-left">
                    <div className="car-card-list-img-box">
                      <img
                        src={car.image}
                        alt={car.name}
                        className="car-card-list-img"
                        loading="lazy"
                      />
                    </div>
                    <div className="car-card-list-details">
                      <div className="car-available-pill-badge" style={{ position: 'static', marginBottom: '6px' }}>
                        <span>{t('common.status.available')}</span>
                      </div>
                      <h3>{car.name}</h3>
                      <p>{car.year} · {car.type} · {labelTrans(car.transmission)} · {labelFuel(car.fuel)}</p>
                    </div>
                  </div>

                  <div className="car-card-list-specs">
                    <div className="car-spec-unit">
                      <Gauge size={16} color="#3B094E" />
                      <div className="car-spec-unit-text">
                        <h5>{car.mileageLimit}</h5>
                        <p>{t('cars.specs.mileage')}</p>
                      </div>
                    </div>
                    <div className="car-spec-unit">
                      <Users size={16} color="#3B094E" />
                      <div className="car-spec-unit-text">
                        <h5>{car.seats} {t('cars.specs.seats')}</h5>
                        <p>{t('cars.capacity')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="car-card-list-right">
                    <div className="car-card-list-price">
                      <h4>{car.currency === 'SAR' ? 'SAR ' : '$'}{Math.round(car.pricePerDay * rateMultiplier).toLocaleString()}</h4>
                      <p>{periodLabel}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link
                        to={`/cars/${car.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#1E0426',
                          color: '#FAB826',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                        }}
                        title={`View all details for ${car.name}`}
                      >
                        <span>{t('common.actions.viewDetails')}</span>
                        <ChevronRight size={14} className="rtl-mirror-arrow" />
                      </Link>
                    </div>
                  </div>
                </article>
            ))}
          </div>
        )}

        {/* 5. BOTTOM ECO BANNER & PAGINATION BAR */}
        <footer className="cars-bottom-bar" aria-label="Pagination and sustainability footer">
          {/* Left: Eco Sustainability Callout */}
          <div className="cars-eco-badge">
            <div className="cars-eco-icon-wrap">
              <Leaf size={18} />
            </div>
            <div className="cars-eco-text">
              <h4>{t('cars.ecoTitle')}</h4>
              <p>{t('cars.ecoDesc')}</p>
            </div>
          </div>

          {/* Center: Interactive Luxury Pagination */}
          <nav className="cars-pagination" aria-label="Catalog pages">
            <button
              type="button"
              className="cars-page-btn"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              aria-label={t('common.pagination.previous')}
            >
              <ChevronLeft size={16} className="rtl-mirror-arrow" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`cars-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 6 && <span className="cars-page-ellipsis">...</span>}
            {totalPages > 6 && (
              <button
                type="button"
                className={`cars-page-btn ${currentPage === 10 ? 'active' : ''}`}
                onClick={() => setCurrentPage(10)}
              >
                10
              </button>
            )}

            <button
              type="button"
              className="cars-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              aria-label={t('common.pagination.next')}
            >
              <ChevronRight size={16} className="rtl-mirror-arrow" />
            </button>
          </nav>

          {/* Right: Found count & Luxury Motto */}
          <div className="cars-footer-tagline">
            <h5>{filteredCars.length} {t('cars.carsFound')}</h5>
            <p>{t('cars.motto')}</p>
          </div>
        </footer>
      </main>

      {/* 6. ADVANCED "MORE FILTERS" MODAL */}
      {moreFiltersOpen && (
        <div className="cars-modal-overlay" onClick={() => setMoreFiltersOpen(false)}>
          <div className="cars-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cars-modal-header">
              <h3>{t('cars.advancedFilters')}</h3>
              <button
                type="button"
                className="cars-modal-close-btn"
                onClick={() => setMoreFiltersOpen(false)}
                aria-label={t('common.actions.close')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Passenger Capacity */}
            <div className="cars-modal-section">
              <label>{t('cars.passengerCapacity')}</label>
              <div className="cars-chip-options">
                {['Any', '2 Seats', '4-5 Seats', '7+ Seats'].map((seats) => (
                  <button
                    key={seats}
                    type="button"
                    className={`cars-chip-btn ${selectedSeats === seats ? 'active' : ''}`}
                    onClick={() => setSelectedSeats(seats)}
                  >
                    {labelSeats(seats)}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Rental Features */}
            <div className="cars-modal-section">
              <label>{t('cars.specialPrivileges')}</label>
              <div className="cars-chip-options">
                <button
                  type="button"
                  className={`cars-chip-btn ${zeroDepositOnly ? 'active' : ''}`}
                  onClick={() => setZeroDepositOnly(!zeroDepositOnly)}
                >
                  {t('cars.zeroDeposit')}
                </button>
                <button
                  type="button"
                  className={`cars-chip-btn ${unlimitedMileageOnly ? 'active' : ''}`}
                  onClick={() => setUnlimitedMileageOnly(!unlimitedMileageOnly)}
                >
                  {t('cars.unlimitedMileage')}
                </button>
              </div>
            </div>

            <div className="cars-modal-footer">
              <button
                type="button"
                className="cars-modal-reset-btn"
                onClick={handleResetFilters}
              >
                {t('cars.resetAll')}
              </button>
              <button
                type="button"
                className="cars-modal-apply-btn"
                onClick={() => setMoreFiltersOpen(false)}
              >
                {t('cars.showCarsPrefix')} {filteredCars.length} {t('cars.showCarsSuffix')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DATE RANGE SELECTOR MODAL */}
      {dateModalOpen && (
        <div className="cars-modal-overlay" onClick={() => setDateModalOpen(false)}>
          <div className="cars-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cars-modal-header">
              <h3>{t('cars.selectRentalDates')}</h3>
              <button
                type="button"
                className="cars-modal-close-btn"
                onClick={() => setDateModalOpen(false)}
                aria-label={t('common.actions.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#7D7388', marginBottom: '6px' }}>
                  {t('cars.pickupDateLabel')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #ECE7F2',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#7D7388', marginBottom: '6px' }}>
                  {t('cars.dropoffDateLabel')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #ECE7F2',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div className="cars-modal-footer">
              <button
                type="button"
                className="cars-modal-reset-btn"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setDateDisplay('MM/DD/YYYY - MM/DD/YYYY');
                  setDateModalOpen(false);
                }}
              >
                {t('cars.clearDates')}
              </button>
              <button
                type="button"
                className="cars-modal-apply-btn"
                onClick={handleApplyDates}
              >
                {t('cars.applyDates')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
