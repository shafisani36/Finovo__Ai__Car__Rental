import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import { branchApi, type Branch } from '../../branches/api/branchApi';
import type { VehicleCategory, VehicleFormData, VehiclePhotoInput, VehicleBrandItem, Vehicle } from '../types/fleet.types';
import { VehiclePhotoPipeline } from '../components/VehiclePhotoPipeline';
import { VehiclePricingSection, type VehiclePricingState } from '../components/VehiclePricingSection';
import {
  Tag,
  Check,
  Minus,
  Plus,
  Eye,
  CheckCircle2,
  Users,
  DoorOpen,
  Fuel,
  Sliders,
  Shield,
  Sparkles,
  MapPin,
  Cpu,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  DollarSign,
  Layers,
  Camera,
  Palette,
  ChevronLeft,
  Car,
  Trash2,
  ExternalLink,
  Flame,
  Zap,
  BatteryCharging,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { useConfirm } from '../../../components/common/ConfirmModal';
import './AddCarPage.css';

const POPULAR_COLORS = [
  { name: 'White', hex: '#FFFFFF', border: '#D1D5DB' },
  { name: 'Black', hex: '#111827', border: '#111827' },
  { name: 'Silver', hex: '#E5E7EB', border: '#9CA3AF' },
  { name: 'Gray', hex: '#6B7280', border: '#4B5563' },
  { name: 'Blue', hex: '#2563EB', border: '#1D4ED8' },
  { name: 'Red', hex: '#DC2626', border: '#B91C1C' },
  { name: 'Green', hex: '#059669', border: '#047857' },
  { name: 'Gold / Champagne', hex: '#D97706', border: '#B45309' },
];

const POPULAR_MAKES = [
  'Toyota',
  'Honda',
  'Hyundai',
  'KIA',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Porsche',
  'Tesla',
  'Land Rover',
  'Other',
];

const AVAILABLE_FEATURES = [
  'GPS Navigation System',
  'Apple CarPlay & Android Auto',
  '360° Surround Camera',
  'Panoramic Sunroof',
  'Heated Front Seats',
  'Ventilated Seats',
  'Adaptive Cruise Control',
  'Autonomous Emergency Braking',
  'Lane Departure Warning & Keep Assist',
  'Blind Spot Monitoring',
  'Smart Keyless Entry & Start',
  'Premium Surround Audio',
  'Dashcam Telematics Unit',
  'Full Leather Upholstery',
  'ISOFIX Child Seat Mounts',
  'Wireless Smartphone Charger',
  'Parking Distance Sensors (F/R)',
  'Tow Hitch Installed',
];

const FEATURE_CATEGORIES = [
  { id: 'all', label: 'All Equipment' },
  { id: 'safety', label: 'Safety & ADAS' },
  { id: 'comfort', label: 'Cabin & Comfort' },
  { id: 'tech', label: 'Audio & Connectivity' },
  { id: 'utility', label: 'Exterior & Utility' },
];

const FEATURE_META: Record<string, 'safety' | 'comfort' | 'tech' | 'utility'> = {
  'GPS Navigation System': 'tech',
  'Apple CarPlay & Android Auto': 'tech',
  '360° Surround Camera': 'safety',
  'Panoramic Sunroof': 'comfort',
  'Heated Front Seats': 'comfort',
  'Ventilated Seats': 'comfort',
  'Adaptive Cruise Control': 'safety',
  'Autonomous Emergency Braking': 'safety',
  'Lane Departure Warning & Keep Assist': 'safety',
  'Blind Spot Monitoring': 'safety',
  'Smart Keyless Entry & Start': 'comfort',
  'Premium Surround Audio': 'tech',
  'Dashcam Telematics Unit': 'tech',
  'Full Leather Upholstery': 'comfort',
  'ISOFIX Child Seat Mounts': 'safety',
  'Wireless Smartphone Charger': 'tech',
  'Parking Distance Sensors (F/R)': 'safety',
  'Tow Hitch Installed': 'utility',
};

export const DEFAULT_FALLBACK_CATEGORIES: VehicleCategory[] = [
  { id: 'cat-sedan', name: 'Sedan', slug: 'sedan', baseRate: 8000, description: 'Standard & Executive Sedans (up to 5 passengers)' },
  { id: 'cat-suv', name: 'SUV', slug: 'suv', baseRate: 15000, description: 'Compact, Mid-Size & Full-Size SUVs (5 to 8 passengers)' },
  { id: 'cat-pickup', name: 'Pickup Truck', slug: 'pickup', baseRate: 14000, description: 'Single & Double Cab Utility Pickups (up to 6 passengers)' },
  { id: 'cat-van', name: 'Van / Minibus', slug: 'van-minibus', baseRate: 22000, description: 'High-Capacity Passenger Vans (10 to 20 passengers)' },
  { id: 'cat-hatchback', name: 'Hatchback', slug: 'hatchback', baseRate: 6000, description: 'Urban Compact & Commuter' },
  { id: 'cat-sports', name: 'Coupe / Sports', slug: 'coupe-sports', baseRate: 25000, description: 'High Performance & Grand Tourers' },
  { id: 'cat-luxury', name: 'Luxury / Executive', slug: 'luxury-executive', baseRate: 35000, description: 'Flagship Premium & Chauffeur Fleet' },
];

export function AddCarPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<VehicleCategory[]>(DEFAULT_FALLBACK_CATEGORIES);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dbBrands, setDbBrands] = useState<VehicleBrandItem[]>([]);
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinDecodeSuccess, setVinDecodeSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active section for sticky navigation ribbon
  const [activeSection, setActiveSection] = useState<'sec-identity' | 'sec-specs' | 'sec-features' | 'sec-pricing' | 'sec-photos' | 'sec-records'>('sec-identity');

  // Mobile tab switcher: 'form' | 'preview'
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  // Feature filter tab
  const [activeFeatureTab, setActiveFeatureTab] = useState('all');

  // 1. Identity & Classification
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [year, setYear] = useState<number>(2025);
  const [trim, setTrim] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vin, setVin] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [color, setColor] = useState('White');
  const [colorHex, setColorHex] = useState('#FFFFFF');
  const [isCustomColor, setIsCustomColor] = useState(false);

  // 2. Mechanical, Powertrain & Telematics
  const [transmission, setTransmission] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [fuelType, setFuelType] = useState<'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC'>('PETROL');
  const [engineSize, setEngineSize] = useState('');
  const [horsePower, setHorsePower] = useState('');
  const [drivetrain, setDrivetrain] = useState<'AWD' | 'FWD' | 'RWD' | '4WD'>('AWD');
  const [fuelTankCapacity, setFuelTankCapacity] = useState('');
  const [fuelLevelPercent, setFuelLevelPercent] = useState<number>(100);
  const [seats, setSeats] = useState(5);
  const [doors, setDoors] = useState(4);
  const [mileage, setMileage] = useState<string>('0');
  const [parkingSpot, setParkingSpot] = useState('');
  const [telematicsDeviceId, setTelematicsDeviceId] = useState('');

  // 3. Equipment & Smart Features
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // 4. Commercial Rates & Rental Calculation Rules
  const [pricingState, setPricingState] = useState<VehiclePricingState>({
    pricingMethod: 'daily',
    currency: 'PKR',
    dailyRate: '8000',
    weeklyRate: '48000',
    monthlyRate: '180000',
    perKmRate: '60',
    hourlyRate: '1500',
    minimumTripCharge: '5000',
    minimumBillableHours: '1',
    billingIncrementMinutes: '60',
    gracePeriodMinutes: '30',
    partialMonthPolicy: 'prorated_daily',
    securityDeposit: '20000',
    mileageLimitPerDay: '200',
    excessMileageFee: '50',
  });
  const [status, setStatus] = useState<'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RESERVED'>('AVAILABLE');
  const [isPublicCatalog, setIsPublicCatalog] = useState(true);

  const handlePricingChange = (field: keyof VehiclePricingState, value: string) => {
    setPricingState((prev) => ({ ...prev, [field]: value }));
  };

  // 5. Compliance, Insurance & Maintenance
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [registrationExpiry, setRegistrationExpiry] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [lastServiceMileage, setLastServiceMileage] = useState('');
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [notes, setNotes] = useState('');

  // 6. Inspection & Catalog Photos (Strict 4-6 Photos)
  const [photos, setPhotos] = useState<VehiclePhotoInput[]>([]);

  // Live preview image carousel state
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  // Smooth scroll helper for sticky navigation ribbon
  const scrollToSection = (sectionId: 'sec-identity' | 'sec-specs' | 'sec-features' | 'sec-pricing' | 'sec-photos' | 'sec-records') => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Observer for active section highlighting on scroll
  useEffect(() => {
    const sectionIds: Array<'sec-identity' | 'sec-specs' | 'sec-features' | 'sec-pricing' | 'sec-photos' | 'sec-records'> = [
      'sec-identity',
      'sec-specs',
      'sec-features',
      'sec-pricing',
      'sec-photos',
      'sec-records',
    ];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 180;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load initial data (Categories, Branches, Brands, and if Edit mode: existing Vehicle)
  useEffect(() => {
    let isMounted = true;

    const initialCalls: [
      Promise<{ categories: VehicleCategory[] }>,
      Promise<{ branches: Branch[] }>,
      Promise<{ brands: VehicleBrandItem[] }>,
      Promise<{ vehicle: Vehicle } | null>
    ] = [
      fleetApi.getCategories(),
      branchApi.getBranches(),
      fleetApi.getBrands(),
      id ? fleetApi.getVehicleById(id) : Promise.resolve(null),
    ];

    Promise.all(initialCalls)
      .then(([catRes, branchRes, brandRes, vehRes]) => {
        if (!isMounted) return;

        if (catRes?.categories && catRes.categories.length > 0) {
          setCategories(catRes.categories);
          if (!isEdit) setCategoryId(catRes.categories[0].id);
        }
        if (branchRes?.branches && branchRes.branches.length > 0) {
          setBranches(branchRes.branches);
          if (!isEdit) setBranchId(branchRes.branches[0].id);
        }
        if (brandRes?.brands && brandRes.brands.length > 0) {
          setDbBrands(brandRes.brands);
          if (!isEdit) {
            setBrand(brandRes.brands[0].name);
            const models = brandRes.brands[0].models;
            if (models && models.length > 0) {
              setModel(models[0].name);
            }
          }
        }

        // If in Edit Mode, prefill with saved vehicle details
        if (vehRes && vehRes.vehicle) {
          const v = vehRes.vehicle;
          const matchedBrand = brandRes.brands?.find((b) => b.name.toLowerCase() === v.brand.toLowerCase());
          if (matchedBrand) {
            setBrand(matchedBrand.name);
            setCustomBrand('');
          } else {
            setBrand('Other');
            setCustomBrand(v.brand);
          }

          setModel(v.model || '');
          setCustomModelMode(false);
          setYear(v.year || 2024);
          setTrim(v.trim || '');
          setRegistrationNumber(v.registrationNumber || '');
          setVin(v.vin || '');
          setCategoryId(v.categoryId || '');
          setBranchId(v.branchId || '');
          setColor(v.color || 'White');
          setColorHex(v.colorHex || '#FFFFFF');
          setIsCustomColor(!POPULAR_COLORS.some((c) => c.hex.toLowerCase() === (v.colorHex || '').toLowerCase()));

          setTransmission(v.transmission || 'AUTOMATIC');
          setFuelType(v.fuelType || 'PETROL');
          setEngineSize(v.engineSize || '');
          setHorsePower(v.horsePower ? String(v.horsePower) : '');
          setDrivetrain((v.drivetrain as any) || 'AWD');
          setFuelTankCapacity(v.fuelTankCapacity || '');
          setFuelLevelPercent(v.fuelLevelPercent ?? 100);
          setSeats(v.seats || 5);
          setDoors(v.doors || 4);
          setMileage(String(v.mileage || 0));
          setParkingSpot(v.parkingSpot || '');
          setTelematicsDeviceId(v.telematicsDeviceId || '');

          setPricingState({
            pricingMethod: (v.pricingMethod as any) || 'daily',
            currency: v.currency || 'PKR',
            dailyRate: String(v.dailyRate || 8000),
            weeklyRate: v.weeklyRate ? String(v.weeklyRate) : '',
            monthlyRate: v.monthlyRate ? String(v.monthlyRate) : '',
            perKmRate: v.perKmRate ? String(v.perKmRate) : '60',
            hourlyRate: v.hourlyRate ? String(v.hourlyRate) : '1500',
            minimumTripCharge: v.minimumTripCharge ? String(v.minimumTripCharge) : '5000',
            minimumBillableHours: String(v.minimumBillableHours || 1),
            billingIncrementMinutes: String(v.billingIncrementMinutes || 60),
            gracePeriodMinutes: String(v.gracePeriodMinutes ?? 30),
            partialMonthPolicy: v.partialMonthPolicy || 'prorated_daily',
            securityDeposit: v.securityDeposit ? String(v.securityDeposit) : '20000',
            mileageLimitPerDay: String(v.mileageLimitPerDay || 200),
            excessMileageFee: String(v.excessMileageFee || 50),
          });

          setStatus((v.status as any) || 'AVAILABLE');
          setIsPublicCatalog(v.isPublicCatalog ?? true);
          if (v.features) {
            const feats: string[] = Array.isArray(v.features)
              ? (v.features as string[])
              : typeof v.features === 'string'
              ? JSON.parse(v.features)
              : [];
            setSelectedFeatures(feats);
          } else {
            setSelectedFeatures([]);
          }

          setInsurancePolicyNumber(v.insurancePolicyNumber || '');
          setInsuranceExpiry(v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '');
          setRegistrationExpiry(v.registrationExpiry ? v.registrationExpiry.slice(0, 10) : '');
          setLastServiceDate(v.lastServiceDate ? v.lastServiceDate.slice(0, 10) : '');
          setLastServiceMileage(v.lastServiceMileage ? String(v.lastServiceMileage) : '');
          setNextServiceMileage(v.nextServiceMileage ? String(v.nextServiceMileage) : '');
          setNotes(v.notes || '');

          if (v.photos && v.photos.length > 0) {
            setPhotos(
              v.photos.map((p) => ({
                url: p.url,
                caption: p.caption || '',
                isPrimary: p.isPrimary || false,
                order: p.order || 0,
              }))
            );
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load fleet data:', err);
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load vehicle details.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isEdit]);

  // Brand and model synchronization
  const selectedBrandObj = useMemo(() => {
    const currentName = brand === 'Other' ? customBrand : brand;
    return dbBrands.find((b) => b.name.toLowerCase() === currentName.trim().toLowerCase());
  }, [dbBrands, brand, customBrand]);

  const currentBrandModels = useMemo(() => {
    return selectedBrandObj?.models || [];
  }, [selectedBrandObj]);

  const handleBrandChange = (newBrand: string) => {
    setBrand(newBrand);
    if (newBrand === 'Other') {
      setCustomModelMode(true);
      return;
    }
    const targetBrand = dbBrands.find((b) => b.name.toLowerCase() === newBrand.toLowerCase());
    const models = targetBrand?.models;
    if (models && models.length > 0) {
      const firstModel = models[0];
      setCustomModelMode(false);
      setModel(firstModel.name);
      if (firstModel.defaultCategoryId && categories.some((c) => c.id === firstModel.defaultCategoryId)) {
        setCategoryId(firstModel.defaultCategoryId);
      }
    } else {
      setCustomModelMode(true);
    }
  };

  const handleModelSelectChange = (val: string) => {
    if (val === '__CUSTOM__') {
      setCustomModelMode(true);
      setCustomModelName('');
    } else {
      setCustomModelMode(false);
      setModel(val);
      const matched = currentBrandModels.find((m) => m.name === val);
      if (matched?.defaultCategoryId && categories.some((c) => c.id === matched.defaultCategoryId)) {
        setCategoryId(matched.defaultCategoryId);
      }
    }
  };

  // NHTSA VIN Decoding
  const handleDecodeVin = async () => {
    if (!vin || vin.trim().length < 11) {
      setError('Please enter a valid 11-17 character VIN before decoding.');
      return;
    }
    setIsDecodingVin(true);
    setError(null);
    setVinDecodeSuccess(null);
    try {
      const res = await fleetApi.decodeVin(vin.trim());
      if (res?.specs) {
        const s = res.specs;
        const matchedBrand = dbBrands.find((b) => b.name.toLowerCase() === s.brand.toLowerCase());
        if (matchedBrand) {
          setBrand(matchedBrand.name);
          const matchedModel = matchedBrand.models?.find((m) => m.name.toLowerCase() === s.model.toLowerCase());
          if (matchedModel) {
            setModel(matchedModel.name);
            setCustomModelMode(false);
          } else {
            setModel(s.model);
            setCustomModelMode(true);
            setCustomModelName(s.model);
          }
        } else {
          setBrand('Other');
          setCustomBrand(s.brand);
          setModel(s.model);
          setCustomModelMode(true);
          setCustomModelName(s.model);
        }

        if (s.year) setYear(s.year);
        if (s.trim) setTrim(s.trim);
        if (s.fuelType) setFuelType(s.fuelType);
        if (s.transmission) setTransmission(s.transmission);
        if (s.engineSize) setEngineSize(s.engineSize);
        if (s.horsePower) setHorsePower(String(s.horsePower));
        if (s.doors) setDoors(s.doors);
        if (s.drivetrain) {
          const dt = s.drivetrain.toUpperCase();
          if (dt.includes('AWD') || dt.includes('ALL')) setDrivetrain('AWD');
          else if (dt.includes('4WD') || dt.includes('FOUR')) setDrivetrain('4WD');
          else if (dt.includes('RWD') || dt.includes('REAR')) setDrivetrain('RWD');
          else setDrivetrain('FWD');
        }

        if (s.suggestedCategory && categories.length > 0) {
          const matchCat = categories.find(
            (c) =>
              c.name.toLowerCase().includes(s.suggestedCategory!.toLowerCase()) ||
              s.suggestedCategory!.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchCat) setCategoryId(matchCat.id);
        }

        setVinDecodeSuccess(`Verified & Autofilled: ${s.year} ${s.brand} ${s.model} (${s.engineSize || ''} ${s.fuelType || ''}) via NHTSA vPIC.`);
      }
    } catch (err) {
      console.error('VIN decode error:', err);
      setError('Could not decode VIN with NHTSA service. Please verify the VIN number or fill specs manually.');
    } finally {
      setIsDecodingVin(false);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]));
  };

  const selectAllFeatures = () => {
    setSelectedFeatures(AVAILABLE_FEATURES);
  };

  const clearAllFeatures = () => {
    setSelectedFeatures([]);
  };

  // Form compliance calculations
  const effectiveModel = customModelMode ? customModelName.trim() : model.trim();
  const effectiveBrand = brand === 'Other' ? customBrand.trim() : brand.trim();

  // Dynamic vehicle category & seating capacity boundaries
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  const vehicleTypeInfo = useMemo(() => {
    const catName = (selectedCategory?.name || '').toLowerCase();
    const catSlug = (selectedCategory?.slug || '').toLowerCase();
    const modelLower = effectiveModel.toLowerCase();
    const combined = `${catName} ${catSlug} ${modelLower}`;

    if (
      combined.includes('van') ||
      combined.includes('minibus') ||
      combined.includes('bus') ||
      combined.includes('hiace') ||
      combined.includes('transit') ||
      combined.includes('sprinter') ||
      combined.includes('urvan') ||
      combined.includes('commuter') ||
      combined.includes('shuttle') ||
      combined.includes('coaster')
    ) {
      return {
        type: 'VAN',
        label: 'Van / Minibus',
        minSeats: 1,
        maxSeats: 20,
        defaultSeats: 15,
        defaultDoors: 4,
        minDoors: 2,
        maxDoors: 5,
        hint: '1 to 20 Passengers',
      };
    }

    if (
      combined.includes('suv') ||
      combined.includes('crossover') ||
      combined.includes('prado') ||
      combined.includes('land cruiser') ||
      combined.includes('fortuner') ||
      combined.includes('tahoe') ||
      combined.includes('suburban') ||
      combined.includes('patrol') ||
      combined.includes('sportage') ||
      combined.includes('tucson')
    ) {
      return {
        type: 'SUV',
        label: 'SUV / Crossover',
        minSeats: 1,
        maxSeats: 8,
        defaultSeats: 7,
        defaultDoors: 4,
        minDoors: 4,
        maxDoors: 5,
        hint: '1 to 8 Passengers',
      };
    }

    if (
      combined.includes('pickup') ||
      combined.includes('truck') ||
      combined.includes('hilux') ||
      combined.includes('d-max') ||
      combined.includes('f-150') ||
      combined.includes('tacoma') ||
      combined.includes('ranger')
    ) {
      return {
        type: 'PICKUP',
        label: 'Pickup Truck',
        minSeats: 1,
        maxSeats: 6,
        defaultSeats: 5,
        defaultDoors: 4,
        minDoors: 2,
        maxDoors: 4,
        hint: '1 to 6 Passengers',
      };
    }

    if (
      combined.includes('coupe') ||
      combined.includes('sports') ||
      combined.includes('convertible') ||
      combined.includes('roadster') ||
      combined.includes('mustang') ||
      combined.includes('911') ||
      combined.includes('corvette') ||
      combined.includes('supra')
    ) {
      return {
        type: 'SPORTS',
        label: 'Coupe / Sports',
        minSeats: 1,
        maxSeats: 4,
        defaultSeats: 2,
        minDoors: 2,
        maxDoors: 3,
        hint: '1 to 4 Passengers',
      };
    }

    if (
      combined.includes('hatchback') ||
      combined.includes('compact') ||
      combined.includes('swift') ||
      combined.includes('vitz') ||
      combined.includes('yaris') ||
      combined.includes('fit') ||
      combined.includes('golf') ||
      combined.includes('polo')
    ) {
      return {
        type: 'HATCHBACK',
        label: 'Hatchback',
        minSeats: 1,
        maxSeats: 5,
        defaultSeats: 5,
        minDoors: 4,
        maxDoors: 5,
        hint: '1 to 5 Passengers',
      };
    }

    return {
      type: 'SEDAN',
      label: selectedCategory?.name || 'Sedan',
      minSeats: 1,
      maxSeats: 5,
      defaultSeats: 5,
      minDoors: 4,
      maxDoors: 5,
      hint: '1 to 5 Passengers',
    };
  }, [selectedCategory, effectiveModel]);

  // Clamp seats if they exceed the new category limit
  useEffect(() => {
    if (seats > vehicleTypeInfo.maxSeats) {
      setSeats(vehicleTypeInfo.maxSeats);
    }
  }, [vehicleTypeInfo.maxSeats, seats]);

  // In creation mode, automatically suggest standard seating when category changes
  const prevVehicleTypeRef = useRef<string>(vehicleTypeInfo.type);
  useEffect(() => {
    if (!isEdit && prevVehicleTypeRef.current !== vehicleTypeInfo.type) {
      prevVehicleTypeRef.current = vehicleTypeInfo.type;
      setSeats(vehicleTypeInfo.defaultSeats || 5);
      setDoors(vehicleTypeInfo.defaultDoors || 4);
    }
  }, [isEdit, vehicleTypeInfo]);

  // Section completion checks for navigation ribbon
  const isSec1Complete = Boolean(effectiveBrand && effectiveModel && registrationNumber.trim() && categoryId);
  const isSec2Complete = Boolean(transmission && fuelType && drivetrain);
  const isSec3Complete = Boolean(selectedFeatures.length > 0);
  const isSec4Complete = Boolean(
    parseFloat(pricingState.dailyRate) > 0 ||
    parseFloat(pricingState.perKmRate) > 0 ||
    parseFloat(pricingState.hourlyRate) > 0 ||
    parseFloat(pricingState.monthlyRate) > 0
  );
  const isSec5Complete = Boolean(photos.length >= 4 && photos.length <= 6);
  const isSec6Complete = Boolean(insurancePolicyNumber.trim() || insuranceExpiry);

  const complianceScore = useMemo(() => {
    let score = 0;
    if (effectiveBrand && effectiveModel) score += 25;
    if (registrationNumber.trim()) score += 20;
    if (categoryId) score += 15;
    if (photos.length >= 4 && photos.length <= 6) score += 20;
    const daily = parseFloat(pricingState.dailyRate);
    const perKm = parseFloat(pricingState.perKmRate);
    const hourly = parseFloat(pricingState.hourlyRate);
    const monthly = parseFloat(pricingState.monthlyRate);
    if (daily > 0 || perKm > 0 || hourly > 0 || monthly > 0) score += 20;
    return score;
  }, [effectiveBrand, effectiveModel, registrationNumber, categoryId, photos, pricingState]);

  // Filtered features list based on active tab
  const filteredFeatures = useMemo(() => {
    if (activeFeatureTab === 'all') return AVAILABLE_FEATURES;
    return AVAILABLE_FEATURES.filter((f) => FEATURE_META[f] === activeFeatureTab);
  }, [activeFeatureTab]);

  // Form Submission (Create or Edit)
  const handleSubmit = async () => {
    setError(null);

    if (!effectiveBrand) {
      setError('Please select or specify a vehicle manufacturer / make.');
      scrollToSection('sec-identity');
      return;
    }
    if (!effectiveModel) {
      setError('Please select or specify a vehicle model name.');
      scrollToSection('sec-identity');
      return;
    }
    if (!registrationNumber.trim()) {
      setError('License registration plate is required.');
      scrollToSection('sec-identity');
      return;
    }
    if (!categoryId) {
      setError('Please assign the vehicle to a fleet category.');
      scrollToSection('sec-identity');
      return;
    }
    if (photos.length < 4) {
      setError(`Enterprise compliance requires at least 4 inspection photos. Currently ${photos.length} attached.`);
      scrollToSection('sec-photos');
      return;
    }

    if (pricingState.pricingMethod === 'daily' || pricingState.pricingMethod === 'daily_extra_km') {
      const daily = parseFloat(pricingState.dailyRate);
      if (isNaN(daily) || daily <= 0) {
        setError('Please enter a valid positive daily rate for daily rental.');
        scrollToSection('sec-pricing');
        return;
      }
    } else if (pricingState.pricingMethod === 'per_km') {
      const perKm = parseFloat(pricingState.perKmRate);
      if (isNaN(perKm) || perKm <= 0) {
        setError('Please enter a valid per-kilometer rate.');
        scrollToSection('sec-pricing');
        return;
      }
    } else if (pricingState.pricingMethod === 'hourly') {
      const hourly = parseFloat(pricingState.hourlyRate);
      if (isNaN(hourly) || hourly <= 0) {
        setError('Please enter a valid hourly rate.');
        scrollToSection('sec-pricing');
        return;
      }
    } else if (pricingState.pricingMethod === 'monthly') {
      const monthly = parseFloat(pricingState.monthlyRate);
      if (isNaN(monthly) || monthly <= 0) {
        setError('Please enter a valid monthly subscription rate.');
        scrollToSection('sec-pricing');
        return;
      }
    }

    const payload: VehicleFormData = {
      brand: effectiveBrand,
      model: effectiveModel,
      year: Number(year),
      trim: trim.trim() || undefined,
      registrationNumber: registrationNumber.trim().toUpperCase(),
      vin: vin.trim().toUpperCase() || undefined,
      categoryId,
      branchId: branchId || undefined,
      transmission,
      fuelType,
      engineSize: engineSize.trim() || undefined,
      horsePower: horsePower ? parseInt(horsePower, 10) : undefined,
      drivetrain,
      fuelTankCapacity: fuelTankCapacity.trim() || undefined,
      fuelLevelPercent: Number(fuelLevelPercent) || 100,
      seats,
      doors,
      color,
      colorHex,
      mileage: Number(mileage) || 0,
      pricingMethod: pricingState.pricingMethod,
      currency: pricingState.currency,
      dailyRate: parseFloat(pricingState.dailyRate) || 0,
      weeklyRate: pricingState.weeklyRate ? parseFloat(pricingState.weeklyRate) : undefined,
      monthlyRate: pricingState.monthlyRate ? parseFloat(pricingState.monthlyRate) : undefined,
      perKmRate: pricingState.perKmRate ? parseFloat(pricingState.perKmRate) : undefined,
      hourlyRate: pricingState.hourlyRate ? parseFloat(pricingState.hourlyRate) : undefined,
      minimumTripCharge: pricingState.minimumTripCharge ? parseFloat(pricingState.minimumTripCharge) : undefined,
      minimumBillableHours: pricingState.minimumBillableHours ? parseInt(pricingState.minimumBillableHours, 10) : undefined,
      billingIncrementMinutes: pricingState.billingIncrementMinutes ? parseInt(pricingState.billingIncrementMinutes, 10) : undefined,
      gracePeriodMinutes: pricingState.gracePeriodMinutes ? parseInt(pricingState.gracePeriodMinutes, 10) : undefined,
      partialMonthPolicy: pricingState.partialMonthPolicy,
      securityDeposit: pricingState.securityDeposit ? parseFloat(pricingState.securityDeposit) : undefined,
      mileageLimitPerDay: pricingState.mileageLimitPerDay ? parseInt(pricingState.mileageLimitPerDay, 10) : 200,
      excessMileageFee: pricingState.excessMileageFee ? parseFloat(pricingState.excessMileageFee) : 50,
      status: status as any,
      isPublicCatalog,
      features: selectedFeatures,
      notes: notes.trim() || undefined,
      parkingSpot: parkingSpot.trim() || undefined,
      telematicsDeviceId: telematicsDeviceId.trim() || undefined,
      insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry).toISOString() : undefined,
      registrationExpiry: registrationExpiry ? new Date(registrationExpiry).toISOString() : undefined,
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate).toISOString() : undefined,
      lastServiceMileage: lastServiceMileage ? parseInt(lastServiceMileage, 10) : undefined,
      nextServiceMileage: nextServiceMileage ? parseInt(nextServiceMileage, 10) : undefined,
      photos,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await fleetApi.updateVehicle(id, payload);
        navigate(`/admin/cars/${id}`);
      } else {
        const res = await fleetApi.createVehicle(payload);
        if (res?.vehicle?.id) {
          navigate(`/admin/cars/${res.vehicle.id}`);
        } else {
          navigate('/admin/cars');
        }
      }
    } catch (err: unknown) {
      console.error('Failed to save vehicle:', err);
      const msg = err instanceof Error ? err.message : isEdit ? 'Failed to update fleet vehicle.' : 'Failed to register fleet vehicle.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete vehicle handler with confirmation modal
  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: `Remove ${effectiveBrand} ${effectiveModel} from Fleet?`,
      message:
        'Are you sure you want to remove or archive this vehicle? Historical rental contracts will be preserved, while hiding the car from active customer listings.',
      confirmText: 'Remove Vehicle',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await fleetApi.deleteVehicle(id);
      navigate('/admin/cars');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete vehicle.';
      setError(msg);
      setIsDeleting(false);
    }
  };

  const activeCategory = categories.find((c) => c.id === categoryId);
  const activeBranch = branches.find((b) => b.id === branchId);
  const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];
  const activePreviewPhoto = photos[previewPhotoIndex] || primaryPhoto;

  const activeRateDisplay = useMemo(() => {
    const cur = pricingState.currency;
    if (pricingState.pricingMethod === 'per_km') return `${cur} ${pricingState.perKmRate || 0}/km`;
    if (pricingState.pricingMethod === 'hourly') return `${cur} ${pricingState.hourlyRate || 0}/hr`;
    if (pricingState.pricingMethod === 'monthly') return `${cur} ${pricingState.monthlyRate || 0}/mo`;
    return `${cur} ${pricingState.dailyRate || 0}/day`;
  }, [pricingState]);

  if (isLoading) {
    return (
      <div className="add-car-page-root">
        <div className="loading-state">
          <div className="loading-spinner" />
          <h3 style={{ margin: '0 0 6px', color: '#1E0432', fontWeight: 800 }}>Loading Vehicle Details...</h3>
          <p style={{ margin: 0, color: '#8A7090', fontSize: '0.88rem' }}>Fetching fleet specifications and commercial pricing rules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-car-page-root">
      {/* ================= BREADCRUMB & EXECUTIVE HEADER ================= */}
      <div className="add-car-header-wrapper">
        <div className="add-car-breadcrumb">
          <Link to="/admin/cars" className="add-car-breadcrumb-back">
            <ArrowLeft size={14} />
            <span>Fleet Inventory</span>
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="active-crumb">
            {isEdit ? `Edit ${effectiveBrand} ${effectiveModel || 'Vehicle'}` : 'Register New Vehicle'}
          </span>
        </div>

        <div className="add-car-page-header">
          <div className="header-text-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="add-car-page-title">
                {isEdit ? `Edit Vehicle: ${effectiveBrand} ${effectiveModel || ''}` : 'Register New Vehicle'}
              </h1>
              <span
                className={`status-badge ${
                  status === 'AVAILABLE'
                    ? 'badge-available'
                    : status === 'RENTED'
                    ? 'badge-rented'
                    : status === 'MAINTENANCE'
                    ? 'badge-maintenance'
                    : 'badge-reserved'
                }`}
              >
                ● {status}
              </span>
              {activeCategory?.name && (
                <span className="preview-badge-category">
                  {activeCategory.name}
                </span>
              )}
            </div>
            <p className="add-car-page-subtitle">
              {isEdit
                ? 'Update fleet specifications, commercial rates, inspection photos, and compliance records.'
                : 'Complete the 6-step fleet onboarding wizard to activate this vehicle for bookings.'}
            </p>

            {/* Quick Catalog Links */}
            <div className="add-car-quick-links">
              <span className="quick-links-label">Quick Catalog:</span>
              <Link to="/admin/brands" className="quick-link-pill">
                <Car size={13} />
                <span>Brands</span>
              </Link>
              <Link to="/admin/models" className="quick-link-pill">
                <Layers size={13} />
                <span>Models</span>
              </Link>
              <Link to="/admin/categories" className="quick-link-pill">
                <Tag size={13} />
                <span>Categories</span>
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="fleet-header-actions">
            {isEdit && id && (
              <>
                <Link to={`/admin/cars/${id}`} className="fleet-header-action-btn fleet-btn-secondary">
                  <ExternalLink size={15} />
                  <span className="fleet-btn-label">
                    <span className="label-full">View Details</span>
                    <span className="label-short">View</span>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="fleet-header-action-btn fleet-btn-danger"
                >
                  <Trash2 size={15} />
                  <span className="fleet-btn-label">
                    <span className="label-full">{isDeleting ? 'Removing...' : 'Delete'}</span>
                    <span className="label-short">Delete</span>
                  </span>
                </button>
              </>
            )}

            <Link to="/admin/cars" className="fleet-header-action-btn fleet-btn-neutral">
              <ArrowLeft size={15} />
              <span className="fleet-btn-label">
                <span className="label-full">Cancel</span>
                <span className="label-short">Back</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isDeleting}
              className="fleet-header-action-btn fleet-btn-gold"
            >
              <Check size={16} strokeWidth={2.5} />
              <span className="fleet-btn-label">
                <span className="label-full">
                  {isSubmitting
                    ? isEdit
                      ? 'Saving Changes...'
                      : 'Registering...'
                    : isEdit
                    ? 'Save Changes'
                    : 'Register Vehicle'}
                </span>
                <span className="label-short">{isSubmitting ? 'Saving...' : 'Save'}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= KPI QUICK METRICS ROW ================= */}
      <div className="car-kpi-grid">
        {/* Status Card */}
        <div className="car-kpi-card">
          <div>
            <div className="car-kpi-label">Inventory Status</div>
            <div className="car-kpi-value">{status}</div>
            <div className="car-kpi-meta" style={{ color: isPublicCatalog ? '#059669' : '#D97706' }}>
              {isPublicCatalog ? '● Public Catalog' : '○ Internal Only'}
            </div>
          </div>
          <div
            className="car-kpi-icon"
            style={{
              backgroundColor: status === 'AVAILABLE' ? '#DEF7EC' : '#FEF3C7',
              color: status === 'AVAILABLE' ? '#059669' : '#D97706',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Readiness Card */}
        <div className="car-kpi-card">
          <div>
            <div className="car-kpi-label">Activation Readiness</div>
            <div className="car-kpi-value">{complianceScore}%</div>
            <div className="car-kpi-meta" style={{ color: complianceScore === 100 ? '#059669' : '#6C1E84' }}>
              {complianceScore === 100 ? '● Ready for rental' : 'Complete mandatory fields'}
            </div>
          </div>
          <div
            className="car-kpi-icon"
            style={{
              backgroundColor: complianceScore === 100 ? '#DEF7EC' : '#F5EEF8',
              color: complianceScore === 100 ? '#059669' : '#6C1E84',
            }}
          >
            <Sparkles size={24} />
          </div>
        </div>

        {/* Commercial Rate */}
        <div className="car-kpi-card">
          <div>
            <div className="car-kpi-label">Commercial Rate</div>
            <div className="car-kpi-value">{activeRateDisplay}</div>
            <div className="car-kpi-meta" style={{ color: '#8A7090' }}>
              Deposit: {pricingState.currency} {pricingState.securityDeposit || '0'}
            </div>
          </div>
          <div className="car-kpi-icon" style={{ backgroundColor: '#FEF8E7', color: '#B45309' }}>
            <DollarSign size={24} />
          </div>
        </div>

        {/* Inspection Photos */}
        <div className="car-kpi-card">
          <div>
            <div className="car-kpi-label">Inspection Photos</div>
            <div className="car-kpi-value">{photos.length} / 6</div>
            <div
              className="car-kpi-meta"
              style={{ color: photos.length >= 4 && photos.length <= 6 ? '#059669' : '#DC2626' }}
            >
              {photos.length >= 4 ? '✓ Standard Met' : `Need ${4 - photos.length} more`}
            </div>
          </div>
          <div
            className="car-kpi-icon"
            style={{
              backgroundColor: photos.length >= 4 ? '#DEF7EC' : '#FEE2E2',
              color: photos.length >= 4 ? '#059669' : '#DC2626',
            }}
          >
            <Camera size={24} />
          </div>
        </div>
      </div>

      {/* ================= STICKY INTERACTIVE SECTION NAVIGATION BAR (Strict Single-Row Grid, 0 X-Scroll) ================= */}
      <div className="car-section-navbar-wrap">
        <div className="car-section-nav-grid" role="tablist" aria-label="Vehicle onboarding sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-identity'}
            onClick={() => scrollToSection('sec-identity')}
            className={`car-section-nav-item ${activeSection === 'sec-identity' ? 'active' : ''}`}
            title="1. Identity & Registration"
          >
            <span className="car-nav-num">1</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">Identity & Reg</span>
              <span className="car-nav-label-short">Identity</span>
              <span className="car-nav-label-micro">Info</span>
            </span>
            {isSec1Complete && <span className="car-nav-check" title="Section Complete" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-specs'}
            onClick={() => scrollToSection('sec-specs')}
            className={`car-section-nav-item ${activeSection === 'sec-specs' ? 'active' : ''}`}
            title="2. Engineering & Specs"
          >
            <span className="car-nav-num">2</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">Specs & Power</span>
              <span className="car-nav-label-short">Specs</span>
              <span className="car-nav-label-micro">Specs</span>
            </span>
            {isSec2Complete && <span className="car-nav-check" title="Section Complete" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-features'}
            onClick={() => scrollToSection('sec-features')}
            className={`car-section-nav-item ${activeSection === 'sec-features' ? 'active' : ''}`}
            title="3. Equipment & ADAS"
          >
            <span className="car-nav-num">3</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">Equipment & ADAS</span>
              <span className="car-nav-label-short">Features</span>
              <span className="car-nav-label-micro">ADAS</span>
            </span>
            {isSec3Complete && <span className="car-nav-check" title="Section Complete" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-pricing'}
            onClick={() => scrollToSection('sec-pricing')}
            className={`car-section-nav-item ${activeSection === 'sec-pricing' ? 'active' : ''}`}
            title="4. Rates & Policies"
          >
            <span className="car-nav-num">4</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">Rates & Policies</span>
              <span className="car-nav-label-short">Pricing</span>
              <span className="car-nav-label-micro">Rates</span>
            </span>
            {isSec4Complete && <span className="car-nav-check" title="Section Complete" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-photos'}
            onClick={() => scrollToSection('sec-photos')}
            className={`car-section-nav-item ${activeSection === 'sec-photos' ? 'active' : ''}`}
            title="5. Inspection Photos"
          >
            <span className="car-nav-num">5</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">Inspection Photos</span>
              <span className="car-nav-label-short">Photos</span>
              <span className="car-nav-label-micro">Photos</span>
            </span>
            {isSec5Complete && <span className="car-nav-check" title="Section Complete" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-records'}
            onClick={() => scrollToSection('sec-records')}
            className={`car-section-nav-item ${activeSection === 'sec-records' ? 'active' : ''}`}
            title="6. Insurance & Records"
          >
            <span className="car-nav-num">6</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">Insurance & Records</span>
              <span className="car-nav-label-short">Records</span>
              <span className="car-nav-label-micro">Admin</span>
            </span>
            {isSec6Complete && <span className="car-nav-check" title="Section Complete" />}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {vinDecodeSuccess && (
        <div className="add-car-alert add-car-alert-success">
          <div className="add-car-alert-inner">
            <Sparkles size={18} color="#10B981" />
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem' }}>NHTSA vPIC Autofill Complete</strong>
              <span>{vinDecodeSuccess}</span>
            </div>
          </div>
          <button type="button" onClick={() => setVinDecodeSuccess(null)} className="add-car-alert-dismiss">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="add-car-alert add-car-alert-error">
          <div className="add-car-alert-inner">
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="add-car-alert-dismiss">
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Tab Segment Switcher */}
      <div className="car-mobile-segment">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`car-mobile-seg-btn ${mobileTab === 'form' ? 'active' : ''}`}
        >
          <span>Vehicle Details Form</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`car-mobile-seg-btn ${mobileTab === 'preview' ? 'active' : ''}`}
        >
          <Eye size={15} />
          <span>Live Card Preview ({complianceScore}%)</span>
        </button>
      </div>

      {/* ================= 2-COLUMN WORKSPACE GRID ================= */}
      <div className="car-workspace-grid">
        {/* ================= LEFT PANE: FORM SECTIONS ================= */}
        <div className={`car-form-pane${mobileTab === 'preview' ? ' pane-hidden' : ''}`}>
          {/* SECTION 1: IDENTITY & CLASSIFICATION */}
          <div id="sec-identity" className="car-card-section">
            <div className="car-card-header">
              <div className="car-card-header-left">
                <div className="car-card-icon-badge">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="car-card-title">1. Vehicle Identification & Legal Registration</h2>
                  <p className="car-card-subtitle">Manufacturer details, legal plate, official VIN scanner, and category classification</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: isSec1Complete ? '#059669' : '#6C1E84',
                  backgroundColor: isSec1Complete ? '#DEF7EC' : '#F5EEF8',
                  padding: '4px 12px',
                  borderRadius: '12px',
                }}
              >
                {isSec1Complete ? '✓ Identified & Ready' : 'Mandatory Section'}
              </span>
            </div>

            {/* Popular Make Quick Chips */}
            <div>
              <div className="popular-brands-row">
                <span className="popular-brands-label">Popular Makes:</span>
                {POPULAR_MAKES.map((m) => {
                  const isActive = brand.toLowerCase() === m.toLowerCase();
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleBrandChange(m)}
                      className={`popular-brand-chip ${isActive ? 'active' : ''}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 1: Brand & Model Selection */}
            <div className="car-row-2">
              {/* Make / Brand */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    Manufacturer / Make <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Link
                    to="/admin/brands"
                    title="Manage Brands Directory"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#6C1E84',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Manage Brands</span>
                  </Link>
                </div>
                <CustomSelect
                  value={brand}
                  onChange={(val) => handleBrandChange(val)}
                  searchable
                  placeholder={dbBrands.length === 0 ? 'Loading registered brands...' : 'Select Make / Brand...'}
                  options={[
                    ...dbBrands.map((b) => ({
                      value: b.name,
                      label: b.name,
                      sublabel: b.country
                        ? `${b.country}${b.models?.length ? ` • ${b.models.length} models` : ''}`
                        : b.models?.length
                        ? `${b.models.length} models`
                        : undefined,
                    })),
                    { value: 'Other', label: '+ Other (Custom Make)' },
                  ]}
                />
                {brand === 'Other' && (
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="Enter Custom Make (e.g. Lucid, Rivian)..."
                    className="fleet-form-input"
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {/* Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    Vehicle Model <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Link
                    to="/admin/models"
                    title="Manage Models Directory"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#6C1E84',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Manage Models</span>
                  </Link>
                </div>

                {!customModelMode && currentBrandModels.length > 0 ? (
                  <CustomSelect
                    value={model}
                    onChange={(val) => handleModelSelectChange(val)}
                    searchable
                    placeholder="Select Brand Model..."
                    options={[
                      ...currentBrandModels.map((m) => ({
                        value: m.name,
                        label: m.name,
                        sublabel: m.bodyType ? `${m.bodyType}` : undefined,
                      })),
                      { value: '__CUSTOM__', label: '+ Type Custom Model Name' },
                    ]}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={customModelMode ? customModelName : model}
                      onChange={(e) => {
                        if (customModelMode) setCustomModelName(e.target.value);
                        else setModel(e.target.value);
                      }}
                      placeholder="e.g. Camry, Tucson, Model 3..."
                      className="fleet-form-input"
                    />
                    {currentBrandModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomModelMode(false);
                          setModel(currentBrandModels[0].name);
                        }}
                        className="fleet-header-action-btn fleet-btn-secondary"
                        style={{ padding: '0 12px', fontSize: '0.78rem' }}
                        title="Pick from registered catalog"
                      >
                        List
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Year, Trim & Embossed License Plate */}
            <div className="car-row-3">
              <div className="fleet-form-group">
                <label className="fleet-form-label fleet-form-label-required">Model Year</label>
                <input
                  type="number"
                  value={year || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setYear(val === '' ? 0 : parseInt(val, 10));
                  }}
                  placeholder="e.g. 2025"
                  min={1970}
                  max={2035}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Trim / Grade Specification</label>
                <input
                  type="text"
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  placeholder="e.g. XLE, GT-Line, Long Range"
                  className="fleet-form-input"
                />
              </div>

              {/* Embossed License Plate Input */}
              <div className="fleet-form-group">
                <label className="fleet-form-label fleet-form-label-required">License Plate Registration</label>
                <div className="car-plate-input-container">
                  <div className="car-plate-flag">
                    <span>FIN</span>
                    PK
                  </div>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="ABC-1234"
                    maxLength={10}
                    className="car-plate-input"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: NHTSA vPIC Intelligent VIN Decoder Hub */}
            <div className="vpic-scanner-hub">
              <div className="vpic-scanner-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="vpic-badge">
                    <Sparkles size={12} />
                    NHTSA vPIC Cloud AI Decoder
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#6C1E84', fontWeight: 600 }}>
                    Official Vehicle Specification Database
                  </span>
                </div>
                <span className="vpic-char-count">{vin.length} / 17 chars</span>
              </div>

              <div className="vpic-input-row">
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="Enter 17-character VIN (e.g. 1HGCR2F83HA...)"
                  maxLength={17}
                  className="fleet-form-input vpic-vin-input"
                />
                <button
                  type="button"
                  onClick={handleDecodeVin}
                  disabled={isDecodingVin || vin.trim().length < 11}
                  className="fleet-header-action-btn fleet-btn-secondary"
                  style={{ padding: '0 18px', gap: '6px' }}
                >
                  <Sparkles size={15} color="#6C1E84" />
                  <span>{isDecodingVin ? 'Scanning...' : 'Decode & Autofill'}</span>
                </button>
              </div>
              <span className="fleet-form-hint" style={{ marginTop: '6px' }}>
                Instant verification autofills manufacturer specs, engine architecture, safety rating, and drivetrain.
              </span>
            </div>

            {/* Row 4: Fleet Category & Home Base Station */}
            <div className="car-row-2">
              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    Fleet Category Assignment <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Link
                    to="/admin/categories"
                    title="Manage Vehicle Categories Directory"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#6C1E84',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Manage Categories</span>
                  </Link>
                </div>
                <CustomSelect
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  placeholder="Assign Fleet Category..."
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: `Standard Base: PKR ${c.baseRate || 0}/day`,
                  }))}
                />
              </div>

              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    Assigned Home Branch Station
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#8A7090' }}>Physical Inventory Hub</span>
                </div>
                <CustomSelect
                  value={branchId}
                  onChange={(val) => setBranchId(val)}
                  placeholder="Select Operational Base Station..."
                  options={branches.map((b) => ({
                    value: b.id,
                    label: b.name,
                    sublabel: b.city,
                  }))}
                />
              </div>
            </div>

            {/* Row 5: Exterior Color Finish & Swatches */}
            <div className="fleet-form-group car-row-last" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label className="fleet-form-label" style={{ margin: 0 }}>
                  Exterior Paint & Finish: <strong style={{ color: '#1E0432' }}>{color}</strong>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomColor(!isCustomColor)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6C1E84',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Palette size={14} />
                  <span>{isCustomColor ? 'Use Standard Palette' : 'Custom Hex Finish'}</span>
                </button>
              </div>

              {isCustomColor ? (
                <div className="car-custom-color-wrap">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => {
                      setColorHex(e.target.value);
                      setColor(`Custom (${e.target.value.toUpperCase()})`);
                    }}
                    className="car-color-picker-input"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Color Finish Name (e.g. Midnight Pearl, Metallic Obsidian)"
                    className="fleet-form-input"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    placeholder="#HEX"
                    maxLength={7}
                    className="fleet-form-input"
                    style={{ width: '110px', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              ) : (
                <div className="car-color-swatches">
                  {POPULAR_COLORS.map((c) => {
                    const isSelected = color === c.name || colorHex.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setColor(c.name);
                          setColorHex(c.hex);
                        }}
                        title={c.name}
                        className={`car-color-swatch-btn ${isSelected ? 'selected' : ''}`}
                        style={{
                          backgroundColor: c.hex,
                          border: `1.5px solid ${c.border}`,
                        }}
                      >
                        {isSelected && <Check size={16} color={c.name === 'White' || c.name === 'Silver' ? '#111827' : '#FFFFFF'} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: TECHNICAL SPECIFICATIONS & POWERTRAIN */}
          <div id="sec-specs" className="car-card-section">
            <div className="car-card-header">
              <div className="car-card-header-left">
                <div className="car-card-icon-badge">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="car-card-title">2. Engineering & Mechanical Specifications</h2>
                  <p className="car-card-subtitle">Powertrain architecture, transmission, fuel delivery, cabin geometry, and telemetry</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: isSec2Complete ? '#059669' : '#6C1E84',
                  backgroundColor: isSec2Complete ? '#DEF7EC' : '#F5EEF8',
                  padding: '4px 12px',
                  borderRadius: '12px',
                }}
              >
                {isSec2Complete ? '✓ Configured' : 'Specs Required'}
              </span>
            </div>

            {/* Row 1: Powertrain Segmented Switches */}
            <div className="car-row-2">
              {/* Transmission Segmented Switch */}
              <div className="fleet-form-group">
                <label className="fleet-form-label">Transmission System</label>
                <div className="car-segment-switch">
                  <button
                    type="button"
                    onClick={() => setTransmission('AUTOMATIC')}
                    className={`car-segment-option ${transmission === 'AUTOMATIC' ? 'active' : ''}`}
                  >
                    <Sliders size={14} />
                    <span>Automatic (AT/CVT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransmission('MANUAL')}
                    className={`car-segment-option ${transmission === 'MANUAL' ? 'active' : ''}`}
                  >
                    <Sliders size={14} />
                    <span>Manual (MT)</span>
                  </button>
                </div>
              </div>

              {/* Drivetrain Segmented Switch */}
              <div className="fleet-form-group">
                <label className="fleet-form-label">Drivetrain Configuration</label>
                <div className="car-drivetrain-grid">
                  {(['AWD', 'FWD', 'RWD', '4WD'] as const).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDrivetrain(dt)}
                      className={`car-drivetrain-btn ${drivetrain === dt ? 'active' : ''}`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fuel Type 4-Way Visual Cards */}
            <div className="fleet-form-group" style={{ marginBottom: '18px' }}>
              <label className="fleet-form-label">Fuel & Propulsion Technology</label>
              <div className="car-fuel-grid">
                <div
                  onClick={() => setFuelType('PETROL')}
                  className={`car-fuel-card ${fuelType === 'PETROL' ? 'active' : ''}`}
                >
                  <Flame size={16} color={fuelType === 'PETROL' ? '#DC2626' : '#8A7090'} />
                  <span className="car-fuel-name">Petrol</span>
                </div>

                <div
                  onClick={() => setFuelType('DIESEL')}
                  className={`car-fuel-card ${fuelType === 'DIESEL' ? 'active' : ''}`}
                >
                  <Fuel size={16} color={fuelType === 'DIESEL' ? '#D97706' : '#8A7090'} />
                  <span className="car-fuel-name">Diesel Turbo</span>
                </div>

                <div
                  onClick={() => setFuelType('HYBRID')}
                  className={`car-fuel-card ${fuelType === 'HYBRID' ? 'active' : ''}`}
                >
                  <BatteryCharging size={16} color={fuelType === 'HYBRID' ? '#059669' : '#8A7090'} />
                  <span className="car-fuel-name">Hybrid (HEV)</span>
                </div>

                <div
                  onClick={() => setFuelType('ELECTRIC')}
                  className={`car-fuel-card ${fuelType === 'ELECTRIC' ? 'active' : ''}`}
                >
                  <Zap size={16} color={fuelType === 'ELECTRIC' ? '#2563EB' : '#8A7090'} />
                  <span className="car-fuel-name">Electric (BEV)</span>
                </div>
              </div>
            </div>

            {/* Row 2: Performance Specs & Tank Capacity */}
            <div className="car-row-3">
              <div className="fleet-form-group">
                <label className="fleet-form-label">Engine / Motor Displacement</label>
                <input
                  type="text"
                  value={engineSize}
                  onChange={(e) => setEngineSize(e.target.value)}
                  placeholder="e.g. 2.0L Turbo, 65 kWh"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Horsepower Output (HP)</label>
                <input
                  type="number"
                  value={horsePower}
                  onChange={(e) => setHorsePower(e.target.value)}
                  placeholder="e.g. 203"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Fuel Tank / Battery Capacity</label>
                <input
                  type="text"
                  value={fuelTankCapacity}
                  onChange={(e) => setFuelTankCapacity(e.target.value)}
                  placeholder="e.g. 55 Liters, 77.4 kWh"
                  className="fleet-form-input"
                />
              </div>
            </div>

            {/* Row 3: Cabin Geometry (Seating & Doors Steppers) */}
            <div className="car-row-2">
              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>Seating Capacity</label>
                  <span className="car-stepper-type-tag">Max {vehicleTypeInfo.maxSeats} ({vehicleTypeInfo.label})</span>
                </div>
                <div className="car-stepper">
                  <button
                    type="button"
                    onClick={() => setSeats((prev) => Math.max(vehicleTypeInfo.minSeats, (Number(prev) || 1) - 1))}
                    disabled={Number(seats) <= vehicleTypeInfo.minSeats}
                    className="car-stepper-btn"
                    aria-label="Decrease seating capacity"
                  >
                    <Minus size={15} />
                  </button>
                  <div
                    className="car-stepper-center"
                    onClick={() => document.getElementById('car-seats-input')?.focus()}
                  >
                    <Users size={16} color="#6C1E84" />
                    <input
                      id="car-seats-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={seats || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw === '') {
                          setSeats(0);
                        } else {
                          const val = parseInt(raw, 10);
                          setSeats(Math.min(vehicleTypeInfo.maxSeats, Math.max(vehicleTypeInfo.minSeats, val)));
                        }
                      }}
                      onBlur={() => {
                        if (!seats || seats < vehicleTypeInfo.minSeats) setSeats(vehicleTypeInfo.minSeats);
                        if (seats > vehicleTypeInfo.maxSeats) setSeats(vehicleTypeInfo.maxSeats);
                      }}
                      className="car-stepper-input"
                      style={{ width: `${Math.max(20, String(seats || 1).length * 11 + 4)}px` }}
                    />
                    <span className="car-stepper-unit">
                      {Number(seats) === 1 ? 'Seat' : 'Seats'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeats((prev) => Math.min(vehicleTypeInfo.maxSeats, (Number(prev) || 1) + 1))}
                    disabled={Number(seats) >= vehicleTypeInfo.maxSeats}
                    className="car-stepper-btn"
                    aria-label="Increase seating capacity"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>Number of Doors</label>
                  <span className="car-stepper-type-tag">Max {vehicleTypeInfo.maxDoors} Doors</span>
                </div>
                <div className="car-stepper">
                  <button
                    type="button"
                    onClick={() => setDoors((prev) => Math.max(vehicleTypeInfo.minDoors, (Number(prev) || 2) - 1))}
                    disabled={Number(doors) <= vehicleTypeInfo.minDoors}
                    className="car-stepper-btn"
                    aria-label="Decrease number of doors"
                  >
                    <Minus size={15} />
                  </button>
                  <div
                    className="car-stepper-center"
                    onClick={() => document.getElementById('car-doors-input')?.focus()}
                  >
                    <DoorOpen size={16} color="#6C1E84" />
                    <input
                      id="car-doors-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={doors || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw === '') {
                          setDoors(0);
                        } else {
                          const val = parseInt(raw, 10);
                          setDoors(Math.min(vehicleTypeInfo.maxDoors, Math.max(vehicleTypeInfo.minDoors, val)));
                        }
                      }}
                      onBlur={() => {
                        if (!doors || doors < vehicleTypeInfo.minDoors) setDoors(vehicleTypeInfo.minDoors);
                        if (doors > vehicleTypeInfo.maxDoors) setDoors(vehicleTypeInfo.maxDoors);
                      }}
                      className="car-stepper-input"
                      style={{ width: `${Math.max(20, String(doors || 2).length * 11 + 4)}px` }}
                    />
                    <span className="car-stepper-unit">
                      {Number(doors) === 1 ? 'Door' : 'Doors'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDoors((prev) => Math.min(vehicleTypeInfo.maxDoors, (Number(prev) || 2) + 1))}
                    disabled={Number(doors) >= vehicleTypeInfo.maxDoors}
                    className="car-stepper-btn"
                    aria-label="Increase number of doors"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4: Telematics, Mileage & Bay Tracking */}
            <div className="car-row-4 car-row-last">
              <div className="fleet-form-group">
                <label className="fleet-form-label">Current Odometer (km)</label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="0"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Next Service Target (km)</label>
                <input
                  type="number"
                  value={nextServiceMileage}
                  onChange={(e) => setNextServiceMileage(e.target.value)}
                  placeholder="e.g. 20000"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Parking Spot / Bay</label>
                <input
                  type="text"
                  value={parkingSpot}
                  onChange={(e) => setParkingSpot(e.target.value)}
                  placeholder="e.g. Bay A-12, Level 2"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">IoT Telematics Tracker ID</label>
                <input
                  type="text"
                  value={telematicsDeviceId}
                  onChange={(e) => setTelematicsDeviceId(e.target.value)}
                  placeholder="TEL-GPS-492"
                  className="fleet-form-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: FEATURES & EQUIPMENT */}
          <div id="sec-features" className="car-card-section">
            <div className="car-card-header">
              <div className="car-card-header-left">
                <div className="car-card-icon-badge">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="car-card-title">3. Equipment, ADAS & Smart Features</h2>
                  <p className="car-card-subtitle">
                    Autonomous safety systems, premium comfort packages, and infotainment equipment
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6C1E84', backgroundColor: '#F5EEF8', padding: '4px 12px', borderRadius: '12px' }}>
                {selectedFeatures.length} of {AVAILABLE_FEATURES.length} Selected
              </span>
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div className="feature-filter-header">
              <div className="feature-tabs-wrap">
                {FEATURE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveFeatureTab(cat.id)}
                    className={`feature-tab-btn ${activeFeatureTab === cat.id ? 'active' : ''}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="feature-actions-bar">
                <button
                  type="button"
                  onClick={selectAllFeatures}
                  className="feature-action-text-btn"
                >
                  Select All
                </button>
                <span style={{ color: '#D4C9D9' }}>|</span>
                <button
                  type="button"
                  onClick={clearAllFeatures}
                  className="feature-action-text-btn"
                  style={{ color: '#8A7090' }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Features Chips Grid */}
            <div className="car-features-grid">
              {filteredFeatures.map((feat) => {
                const isSelected = selectedFeatures.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    className={`car-feature-chip ${isSelected ? 'selected' : ''}`}
                  >
                    <CheckCircle2
                      size={17}
                      color={isSelected ? '#6C1E84' : '#C7B9CC'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      style={{ flexShrink: 0 }}
                    />
                    <span>{feat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: COMMERCIAL PRICING & RENTAL RULES */}
          <div id="sec-pricing">
            <VehiclePricingSection
              state={pricingState}
              onChange={handlePricingChange}
              status={status}
              onStatusChange={setStatus}
              isPublicCatalog={isPublicCatalog}
              onCatalogChange={setIsPublicCatalog}
              isEditMode={isEdit}
            />
          </div>

          {/* SECTION 5: VEHICLE PHOTO PIPELINE (MANDATORY 4-6) */}
          <div id="sec-photos">
            <VehiclePhotoPipeline photos={photos} onChange={setPhotos} minPhotos={4} maxPhotos={6} />
          </div>

          {/* SECTION 6: ADDITIONAL INFORMATION & COMPLIANCE */}
          <div id="sec-records" className="car-card-section">
            <div className="car-card-header">
              <div className="car-card-header-left">
                <div className="car-card-icon-badge">
                  <Cpu size={20} />
                </div>
                <div>
                  <h2 className="car-card-title">6. Insurance & Administrative Records</h2>
                  <p className="car-card-subtitle">Policy binding numbers, expiration reminders, and internal notes</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: isSec6Complete ? '#059669' : '#8A7090',
                  backgroundColor: isSec6Complete ? '#DEF7EC' : '#FAF7FA',
                  padding: '4px 12px',
                  borderRadius: '12px',
                }}
              >
                {isSec6Complete ? '✓ Policy Bound' : 'Optional Records'}
              </span>
            </div>

            <div className="car-row-3">
              <div className="fleet-form-group">
                <label className="fleet-form-label">Insurance Policy Number</label>
                <input
                  type="text"
                  value={insurancePolicyNumber}
                  onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                  placeholder="e.g. POL-8912-PK"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Insurance Expiry Date</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Registration Expiry Date</label>
                <input
                  type="date"
                  value={registrationExpiry}
                  onChange={(e) => setRegistrationExpiry(e.target.value)}
                  className="fleet-form-input"
                />
              </div>
            </div>

            <div className="car-row-2">
              <div className="fleet-form-group">
                <label className="fleet-form-label">Last Maintenance Service Date</label>
                <input
                  type="date"
                  value={lastServiceDate}
                  onChange={(e) => setLastServiceDate(e.target.value)}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">Last Service Odometer (km)</label>
                <input
                  type="number"
                  value={lastServiceMileage}
                  onChange={(e) => setLastServiceMileage(e.target.value)}
                  placeholder="e.g. 10000"
                  className="fleet-form-input"
                />
              </div>
            </div>

            <div className="fleet-form-group car-row-last" style={{ marginTop: '6px' }}>
              <label className="fleet-form-label">Internal Fleet Operations & Handover Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special handover procedures, minor exterior cosmetic condition reports, VIP rental guidelines..."
                className="fleet-form-textarea"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANE: STICKY LIVE VEHICLE CARD PREVIEW ================= */}
        <div className={`car-preview-pane${mobileTab === 'form' ? ' pane-hidden' : ''}`}>
          {/* Live Catalog Card */}
          <div className="catalog-preview-card">
            {/* Card Header */}
            <div className="catalog-preview-header">
              <div className="catalog-preview-header-title">
                <Eye size={18} color="#6C1E84" />
                <span>Live Customer Preview</span>
              </div>
              <span
                className={`status-badge ${
                  status === 'AVAILABLE'
                    ? 'badge-available'
                    : status === 'RENTED'
                    ? 'badge-rented'
                    : status === 'MAINTENANCE'
                    ? 'badge-maintenance'
                    : 'badge-reserved'
                }`}
              >
                ● {status}
              </span>
            </div>

            {/* Vehicle Hero Image with Carousel */}
            <div className="preview-hero-wrap">
              {activePreviewPhoto ? (
                <>
                  <img
                    src={activePreviewPhoto.url || activePreviewPhoto.data}
                    alt="Live Preview"
                    className="preview-hero-img"
                  />

                  {/* Caption Overlay */}
                  <div className="preview-hero-caption">
                    {activePreviewPhoto.caption || 'Vehicle Angle Photo'}
                  </div>

                  {/* Navigation Arrows on Hero */}
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                        className="preview-arrow-btn arrow-left"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                        className="preview-arrow-btn arrow-right"
                        aria-label="Next photo"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}

                  {/* Dots */}
                  <div className="preview-dots-row">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewPhotoIndex(idx)}
                        className="preview-dot"
                        style={{
                          backgroundColor: previewPhotoIndex === idx ? '#FAB826' : 'rgba(255,255,255,0.6)',
                        }}
                        aria-label={`Photo ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%',
                    color: '#FFFFFF',
                    padding: '24px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <Camera size={26} color="#FAB826" />
                  </div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>No Photos Uploaded Yet</span>
                  <span style={{ fontSize: '0.76rem', color: '#BCA8C4', marginTop: '4px', maxWidth: '240px', lineHeight: 1.4 }}>
                    Upload 4–6 photos in Section 5 to preview your live vehicle card here.
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {photos.length > 0 && (
              <div className="preview-thumb-strip">
                {photos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewPhotoIndex(idx)}
                    className={`preview-thumb-btn ${previewPhotoIndex === idx ? 'active' : ''}`}
                    title={p.caption || `Photo ${idx + 1}`}
                  >
                    <img src={p.url || p.data} alt={`Thumb ${idx}`} className="preview-thumb-img" />
                  </button>
                ))}
              </div>
            )}

            {/* Card Body & Specs */}
            <div className="catalog-preview-body">
              <div className="preview-meta-row">
                <span className="preview-badge-category">
                  {activeCategory?.name || 'Category'}
                </span>
                <span className="preview-plate">
                  {registrationNumber ? registrationNumber.toUpperCase() : 'NO-PLATE'}
                </span>
              </div>

              <h3 className="preview-car-name">
                {effectiveBrand || 'Make'} {effectiveModel || 'Model'}
              </h3>
              <p className="preview-car-trim">
                {year} • {trim || 'Standard Grade'} • {color}
              </p>

              {/* Core Specs Pills */}
              <div className="preview-spec-grid">
                <div className="preview-spec-item">
                  <Sliders size={14} color="#6C1E84" />
                  <span>{transmission === 'AUTOMATIC' ? 'Auto' : 'Manual'}</span>
                </div>
                <div className="preview-spec-item">
                  <Users size={14} color="#6C1E84" />
                  <span>{seats ? `${seats} ${seats === 1 ? 'Seat' : 'Seats'}` : '5 Seats'}</span>
                </div>
                <div className="preview-spec-item">
                  <Fuel size={14} color="#6C1E84" />
                  <span>{fuelType}</span>
                </div>
                <div className="preview-spec-item">
                  <DoorOpen size={14} color="#6C1E84" />
                  <span>{doors ? `${doors} ${doors === 1 ? 'Door' : 'Doors'}` : '4 Doors'}</span>
                </div>
                <div className="preview-spec-item">
                  <MapPin size={14} color="#6C1E84" />
                  <span>{activeBranch?.city || 'Central Hub'}</span>
                </div>
                <div className="preview-spec-item">
                  <Shield size={14} color="#059669" />
                  <span>{photos.length} Photos</span>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="preview-price-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#6C1E84',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        backgroundColor: '#F5EEF8',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {pricingState.pricingMethod.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                    <span className="preview-rate-amount">
                      {pricingState.currency}{' '}
                      {pricingState.pricingMethod === 'per_km'
                        ? pricingState.perKmRate || '0'
                        : pricingState.pricingMethod === 'hourly'
                        ? pricingState.hourlyRate || '0'
                        : pricingState.pricingMethod === 'monthly'
                        ? pricingState.monthlyRate || '0'
                        : pricingState.dailyRate || '0'}
                    </span>
                    <span className="preview-rate-unit">
                      /{' '}
                      {pricingState.pricingMethod === 'per_km'
                        ? 'km'
                        : pricingState.pricingMethod === 'hourly'
                        ? 'hr'
                        : pricingState.pricingMethod === 'monthly'
                        ? 'month'
                        : 'day'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.76rem', color: '#8A7090', fontWeight: 600 }}>
                    Deposit: {pricingState.currency} {pricingState.securityDeposit || '0'}
                  </div>
                  {pricingState.pricingMethod === 'daily_extra_km' && (
                    <div style={{ fontSize: '0.72rem', color: '#8A7090', marginTop: '2px' }}>
                      Limit: {pricingState.mileageLimitPerDay} km/day
                    </div>
                  )}
                  {pricingState.pricingMethod === 'per_km' && (
                    <div style={{ fontSize: '0.72rem', color: '#8A7090', marginTop: '2px' }}>
                      Min Trip: {pricingState.currency} {pricingState.minimumTripCharge}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Readiness Progress Card */}
          <div className="compliance-card">
            <div className="compliance-header">
              <h4 className="compliance-title">Fleet Activation Readiness</h4>
              <span
                className="compliance-pct"
                style={{
                  color: complianceScore === 100 ? '#059669' : '#6C1E84',
                }}
              >
                {complianceScore}% Complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="compliance-progress-track">
              <div
                className="compliance-progress-fill"
                style={{
                  width: `${complianceScore}%`,
                  backgroundColor: complianceScore === 100 ? '#10B981' : '#6C1E84',
                }}
              />
            </div>

            {/* Verification Checklist */}
            <div className="compliance-list">
              <div className="compliance-item">
                <CheckCircle2 size={16} color={effectiveBrand && effectiveModel ? '#059669' : '#D1D5DB'} />
                <span style={{ color: effectiveBrand && effectiveModel ? '#1E0432' : '#8A7090' }}>
                  Make & Model Selected ({effectiveBrand || 'Make'} {effectiveModel || 'Model'})
                </span>
              </div>

              <div className="compliance-item">
                <CheckCircle2 size={16} color={registrationNumber.trim() ? '#059669' : '#D1D5DB'} />
                <span style={{ color: registrationNumber.trim() ? '#1E0432' : '#8A7090' }}>
                  License Plate Assigned {registrationNumber ? `(${registrationNumber})` : ''}
                </span>
              </div>

              <div className="compliance-item">
                <CheckCircle2 size={16} color={categoryId ? '#059669' : '#D1D5DB'} />
                <span style={{ color: categoryId ? '#1E0432' : '#8A7090' }}>Category & Branch Assigned</span>
              </div>

              <div className="compliance-item">
                <CheckCircle2 size={16} color={photos.length >= 4 && photos.length <= 6 ? '#059669' : '#F59E0B'} />
                <span
                  style={{
                    color: photos.length >= 4 && photos.length <= 6 ? '#059669' : '#B45309',
                    fontWeight: photos.length >= 4 ? 600 : 700,
                  }}
                >
                  Mandatory 4–6 Photos ({photos.length}/4 minimum)
                </span>
              </div>

              <div className="compliance-item">
                <CheckCircle2
                  size={16}
                  color={
                    parseFloat(pricingState.dailyRate) > 0 ||
                    parseFloat(pricingState.perKmRate) > 0 ||
                    parseFloat(pricingState.hourlyRate) > 0 ||
                    parseFloat(pricingState.monthlyRate) > 0
                      ? '#059669'
                      : '#D1D5DB'
                  }
                />
                <span
                  style={{
                    color:
                      parseFloat(pricingState.dailyRate) > 0 ||
                      parseFloat(pricingState.perKmRate) > 0 ||
                      parseFloat(pricingState.hourlyRate) > 0 ||
                      parseFloat(pricingState.monthlyRate) > 0
                        ? '#1E0432'
                        : '#8A7090',
                  }}
                >
                  Commercial Pricing & Deposit Configured
                </span>
              </div>
            </div>

            {/* Quick Action Button in Sidebar */}
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #ECE7ED' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isDeleting}
                className="fleet-header-action-btn fleet-btn-gold"
                style={{ width: '100%', justifyContent: 'center', height: '44px' }}
              >
                <Check size={18} strokeWidth={2.5} />
                <span>
                  {isSubmitting
                    ? isEdit
                      ? 'Saving Changes...'
                      : 'Registering...'
                    : isEdit
                    ? 'Save Vehicle Changes'
                    : 'Register Vehicle Now'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MOBILE FLOATING ACTION BAR ================= */}
      <div className="car-mobile-floating-bar">
        <div className="floating-bar-info">
          <div className="floating-bar-readiness">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: complianceScore === 100 ? '#10B981' : '#FAB826',
              }}
            />
            <span>{complianceScore}% Ready</span>
          </div>
          <div className="floating-bar-rate">{activeRateDisplay}</div>
        </div>

        <div className="floating-bar-actions">
          <button
            type="button"
            onClick={() => setMobileTab(mobileTab === 'form' ? 'preview' : 'form')}
            className="floating-preview-btn"
          >
            <Eye size={15} />
            <span>{mobileTab === 'form' ? 'Preview' : 'Form'}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isDeleting}
            className="floating-submit-btn"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{isSubmitting ? 'Saving...' : isEdit ? 'Save' : 'Register'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCarPage;
