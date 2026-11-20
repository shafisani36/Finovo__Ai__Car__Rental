import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import { branchApi, type Branch } from '../../branches/api/branchApi';
import type { VehicleCategory, VehicleFormData, VehiclePhotoInput, VehicleBrandItem, Vehicle,  CarFeature } from '../types/fleet.types';
import { VehiclePhotoPipeline } from '../components/VehiclePhotoPipeline';
import { PRETRAINED_VEHICLE_DATABASE } from '../data/pretrainedVehicles';
import { VehiclePricingSection, type VehiclePricingState } from '../components/VehiclePricingSection';
import {
  Tag,
  RefreshCw,
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
  Banknote,
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
import { parseVehicleNotes, stringifyVehicleNotes } from '../../../utils/vehicleNotesHelper';
import './AddCarPage.css';
import { APP_CURRENCY, formatMoney } from '../../../utils/carImageHelper';
import { useTranslation } from 'react-i18next';

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


 const FEATURE_CATEGORIES = [
  { id: 'all', label: 'All Equipment' },
  { id: 'safety', label: 'Safety & ADAS' },
  { id: 'comfort', label: 'Cabin & Comfort' },
  { id: 'tech', label: 'Audio & Connectivity' },
  { id: 'utility', label: 'Exterior & Utility' },
];


export function AddCarPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dbBrands, setDbBrands] = useState<VehicleBrandItem[]>([]);
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinDecodeSuccess, setVinDecodeSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
const maxAllowedYear = currentYear + 1;

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
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
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
  // 3. Equipment & Smart Features
const [carFeatures, setCarFeatures] = useState<CarFeature[]>([]);
const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);

  // 4. Commercial Rates & Rental Calculation Rules
  const [pricingState, setPricingState] = useState<VehiclePricingState>({
    pricingMethod: 'daily',
    currency: APP_CURRENCY,
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
  // Extra Technical & Dimension Specs
  const [luggageCapacityBags, setLuggageCapacityBags] = useState<number>(3);
  const [cabinBagsCapacity, setCabinBagsCapacity] = useState<number>(2);
  const [acceleration0to100, setAcceleration0to100] = useState<string>('4.5');
  const [topSpeed, setTopSpeed] = useState<string>('250');
  const [torqueNm, setTorqueNm] = useState<string>('500');
  const [fuelEconomy, setFuelEconomy] = useState<string>('8.5');

  // Rental Rules & Policies
  const [minAge, setMinAge] = useState<number>(21);
  const [minLicenseYears, setMinLicenseYears] = useState<number>(1);
  const [fuelPolicy, setFuelPolicy] = useState<string>('Full-to-Full');
  const [depositRefundHours, setDepositRefundHours] = useState<number>(24);
  const [smokingAllowed, setSmokingAllowed] = useState<boolean>(false);
  const [petFriendly, setPetFriendly] = useState<boolean>(false);

  // Pre-Trained Auto-Fetcher
  const [selectedPretrainedPreset, setSelectedPretrainedPreset] = useState<string>('');
  const [pretrainedSuccessMsg, setPretrainedSuccessMsg] = useState<string | null>(null);

  // Cars already in the fleet, newest first, one per brand and model: their specs can be copied into a new car
  const [fleetTemplates, setFleetTemplates] = useState<Vehicle[]>([]);
  useEffect(() => {
    if (isEdit) return;
    let active = true;
    fleetApi
      .getVehicles({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((res) => {
        if (!active) return;
        const seen = new Set<string>();
        const unique = (res.vehicles || []).filter((v) => {
          const key = `${v.brand} ${v.model}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setFleetTemplates(unique);
      })
      .catch(() => {
        // The built-in templates still work without the fleet list
      });
    return () => {
      active = false;
    };
  }, [isEdit]);

  const showAppliedMessage = (name: string) => {
    setPretrainedSuccessMsg('⚡ ' + t('adminPages.addCar._pretrainedApplied', { name }));
    setTimeout(() => setPretrainedSuccessMsg(null), 5000);
  };

  /** Copies the specs and prices of a car that is already in the fleet (never its photos, plate or VIN). */
  const applyFleetVehicle = (vehicle: Vehicle) => {
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setYear(vehicle.year);
    setTrim(vehicle.trim || '');
    if (vehicle.engineSize) setEngineSize(vehicle.engineSize);
    if (vehicle.horsePower) setHorsePower(String(vehicle.horsePower));
    setTransmission(vehicle.transmission);
    setFuelType(vehicle.fuelType);
    if (vehicle.drivetrain) setDrivetrain(vehicle.drivetrain);
    if (vehicle.fuelTankCapacity) setFuelTankCapacity(vehicle.fuelTankCapacity);
    setSeats(vehicle.seats);
    setDoors(vehicle.doors);
    if (vehicle.color) setColor(vehicle.color);
    if (vehicle.colorHex) setColorHex(vehicle.colorHex);
    if (vehicle.categoryId && categories.some((c) => c.id === vehicle.categoryId)) setCategoryId(vehicle.categoryId);
    const asText = (value: number | string | null | undefined) =>
      value === null || value === undefined || value === '' ? '' : String(Number(value));
    setPricingState((prev) => ({
      ...prev,
      dailyRate: asText(vehicle.dailyRate) || prev.dailyRate,
      weeklyRate: asText(vehicle.weeklyRate) || prev.weeklyRate,
      monthlyRate: asText(vehicle.monthlyRate) || prev.monthlyRate,
      securityDeposit: asText(vehicle.securityDeposit) || prev.securityDeposit,
      mileageLimitPerDay: asText(vehicle.mileageLimitPerDay) || prev.mileageLimitPerDay,
      excessMileageFee: asText(vehicle.excessMileageFee) || prev.excessMileageFee,
    }));
    showAppliedMessage(`${vehicle.brand} ${vehicle.model}`);
  };

  const handleApplyPretrainedPreset = (presetName: string) => {
    setSelectedPretrainedPreset(presetName);
    if (presetName.startsWith('fleet:')) {
      const vehicle = fleetTemplates.find((v) => v.id === presetName.slice('fleet:'.length));
      if (vehicle) applyFleetVehicle(vehicle);
      return;
    }
    const templateName = presetName.startsWith('template:') ? presetName.slice('template:'.length) : presetName;
    const spec = PRETRAINED_VEHICLE_DATABASE.find(
      (v) => (v.brand + ' ' + v.model).toLowerCase() === templateName.toLowerCase()
    );
    if (!spec) return;

    setBrand(spec.brand);
    setModel(spec.model);
    setYear(spec.year);
    setTrim(spec.trim);
    setEngineSize(spec.engineSize);
    setHorsePower(String(spec.horsePower));
    setTorqueNm(String(spec.torqueNm));
    setAcceleration0to100(String(spec.acceleration0to100));
    setTopSpeed(String(spec.topSpeedKmH));
    setFuelEconomy(String(spec.fuelEconomyL100km));
    setTransmission(spec.transmission);
    setFuelType(spec.fuelType);
    setDrivetrain(spec.drivetrain);
    setFuelTankCapacity(spec.fuelTankCapacity);
    setSeats(spec.seats);
    setDoors(spec.doors);
    setLuggageCapacityBags(spec.luggageCapacityBags);
    setCabinBagsCapacity(spec.cabinBagsCapacity);
    setColor(spec.standardColors[0]?.name || 'White');
    setColorHex(spec.standardColors[0]?.hex || '#FFFFFF');
    setMinAge(spec.recommendedMinAge);
    setMinLicenseYears(spec.recommendedMinLicenseYears);
    setFuelPolicy(spec.fuelPolicy);
    setDepositRefundHours(spec.depositRefundHours);

    const matchedCategory = categories.find(
      (c) =>
        c.slug.toLowerCase().includes(spec.categorySlug.toLowerCase()) ||
        c.name.toLowerCase().includes(spec.categoryName.toLowerCase())
    );
    if (matchedCategory) {
      setCategoryId(matchedCategory.id);
    }

    setPricingState((prev) => ({
      ...prev,
      dailyRate: String(spec.suggestedDailyRate),
      weeklyRate: String(spec.suggestedWeeklyRate),
      monthlyRate: String(spec.suggestedMonthlyRate),
      securityDeposit: String(spec.suggestedSecurityDeposit),
      mileageLimitPerDay: String(spec.mileageLimitPerDay),
      excessMileageFee: String(spec.excessMileageFee),
    }));

    // Photos are never filled in: a rental car must show photos of the real car
    showAppliedMessage(`${spec.brand} ${spec.model}`);
  };

  const pretrainedOptions = useMemo(() => {
    const fromFleet = fleetTemplates.map((v) => ({
      value: `fleet:${v.id}`,
      label: `${v.brand} ${v.model} (${v.year})`,
      sublabel: t('adminPages.addCar.fromFleet', { plate: v.registrationNumber }),
      badge: t('adminPages.addCar.badgeFleet'),
    }));
    const templates = PRETRAINED_VEHICLE_DATABASE.map((v) => ({
      value: `template:${v.brand} ${v.model}`,
      label: `${v.brand} ${v.model} (${v.year})`,
      sublabel: `${v.trim} • ${v.horsePower} HP • 0-100: ${v.acceleration0to100}s`,
      badge: t('adminPages.addCar.badgeTemplate'),
    }));
    return [...fromFleet, ...templates];
  }, [fleetTemplates, t]);

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

  useEffect(() => {
  let isMounted = true;

  const loadCarFeatures = async () => {
    setIsLoadingFeatures(true);

    try {
      const response = await fleetApi.getCarFeatures({
        isActive: true,
      });

      if (isMounted) {
        setCarFeatures(response.features ?? []);
      }
    } catch (error) {
      console.error('Failed to load car features:', error);
    } finally {
      if (isMounted) {
        setIsLoadingFeatures(false);
      }
    }
  };

  loadCarFeatures();

  return () => {
    isMounted = false;
  };
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
        fleetApi.getBrands({ isActive: true }),
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
            currency: APP_CURRENCY,
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
          setSelectedFeatures(
  v.vehicleFeatures?.map((vehicleFeature) => vehicleFeature.featureId) ?? []
);

          setInsurancePolicyNumber(v.insurancePolicyNumber || '');
          setInsuranceExpiry(v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '');
          setRegistrationExpiry(v.registrationExpiry ? v.registrationExpiry.slice(0, 10) : '');
          setLastServiceDate(v.lastServiceDate ? v.lastServiceDate.slice(0, 10) : '');
          setLastServiceMileage(v.lastServiceMileage ? String(v.lastServiceMileage) : '');
          setNextServiceMileage(v.nextServiceMileage ? String(v.nextServiceMileage) : '');

          const { notesText, extraSpecs } = parseVehicleNotes(v.notes);
          setNotes(notesText);
          if (extraSpecs) {
            if (extraSpecs.luggageCapacityBags !== undefined) setLuggageCapacityBags(Number(extraSpecs.luggageCapacityBags));
            if (extraSpecs.cabinBagsCapacity !== undefined) setCabinBagsCapacity(Number(extraSpecs.cabinBagsCapacity));
            if (extraSpecs.acceleration0to100 !== undefined) setAcceleration0to100(String(extraSpecs.acceleration0to100));
            if (extraSpecs.topSpeed !== undefined) setTopSpeed(String(extraSpecs.topSpeed));
            if (extraSpecs.torqueNm !== undefined) setTorqueNm(String(extraSpecs.torqueNm));
            if (extraSpecs.fuelEconomy !== undefined) setFuelEconomy(String(extraSpecs.fuelEconomy));
            if (extraSpecs.minAge !== undefined) setMinAge(Number(extraSpecs.minAge));
            if (extraSpecs.minLicenseYears !== undefined) setMinLicenseYears(Number(extraSpecs.minLicenseYears));
            if (extraSpecs.fuelPolicy !== undefined) setFuelPolicy(extraSpecs.fuelPolicy);
            if (extraSpecs.depositRefundHours !== undefined) setDepositRefundHours(Number(extraSpecs.depositRefundHours));
            if (extraSpecs.smokingAllowed !== undefined) setSmokingAllowed(Boolean(extraSpecs.smokingAllowed));
            if (extraSpecs.petFriendly !== undefined) setPetFriendly(Boolean(extraSpecs.petFriendly));
          }

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
        if (isMounted) setError(err instanceof Error ? err.message : t('adminPages.addCar.errLoad'));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // Loads once per record; the language is only used for error text, so a language change must not reload the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Clear previous manufacturer's model selection
    setModel('');
    setCustomModelName('');
    setCustomModelMode(false);

    const targetBrand = dbBrands.find(
      (b) => b.name.toLowerCase() === newBrand.toLowerCase()
    );

    const models = targetBrand?.models || [];

    if (models.length > 0) {
      const firstModel = models[0];

      setModel(firstModel.name);

      if (
        firstModel.defaultCategoryId &&
        categories.some((c) => c.id === firstModel.defaultCategoryId)
      ) {
        setCategoryId(firstModel.defaultCategoryId);
      }
    } else {
      // Allow entering a model if the selected brand has no registered models
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
      setError(t('adminPages.addCar.errVin'));
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

        setVinDecodeSuccess(t('adminPages.addCar._vinDecoded', { year: s.year, brand: s.brand, model: s.model, engine: `${s.engineSize || ''} ${s.fuelType || ''}`.trim() }));
      }
    } catch (err) {
      console.error('VIN decode error:', err);
      setError(t('adminPages.addCar.errVinDecode'));
    } finally {
      setIsDecodingVin(false);
    }
  };

 const toggleFeature = (featureId: string) => {
  setSelectedFeatures((prev) =>
    prev.includes(featureId)
      ? prev.filter((id) => id !== featureId)
      : [...prev, featureId]
  );
};

const selectAllFeatures = () => {
  setSelectedFeatures(
    carFeatures
      .filter((feature) => feature.isActive)
      .map((feature) => feature.id)
  );
};

const clearAllFeatures = () => {
  setSelectedFeatures([]);
};

  // Form compliance calculations
  const effectiveModel = customModelMode ? customModelName.trim() : model.trim();
  const effectiveBrand = brand.trim();

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
        label: t('adminPages.addCar.vtVan'),
        minSeats: 1,
        maxSeats: 20,
        defaultSeats: 15,
        defaultDoors: 4,
        minDoors: 2,
        maxDoors: 5,
        hint: t('adminPages.addCar.vtVanHint'),
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
        label: t('adminPages.addCar.vtSuv'),
        minSeats: 1,
        maxSeats: 8,
        defaultSeats: 7,
        defaultDoors: 4,
        minDoors: 4,
        maxDoors: 5,
        hint: t('adminPages.addCar.vtSuvHint'),
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
        label: t('adminPages.addCar.vtPickup'),
        minSeats: 1,
        maxSeats: 6,
        defaultSeats: 5,
        defaultDoors: 4,
        minDoors: 2,
        maxDoors: 4,
        hint: t('adminPages.addCar.vtPickupHint'),
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
        label: t('adminPages.addCar.vtCoupe'),
        minSeats: 1,
        maxSeats: 4,
        defaultSeats: 2,
         defaultDoors: 2,
        minDoors: 2,
        maxDoors: 3,
        hint: t('adminPages.addCar.vtCoupeHint'),
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
        label: t('adminPages.addCar.vtHatch'),
        minSeats: 1,
        maxSeats: 5,
        defaultSeats: 5,
        minDoors: 4,
        maxDoors: 5,
        hint: t('adminPages.addCar.vt5Hint'),
      };
    }

    return {
      type: 'SEDAN',
      label: selectedCategory?.name || t('adminPages.addCar.vtSedan'),
      minSeats: 1,
      maxSeats: 5,
      defaultSeats: 5,
      minDoors: 4,
      maxDoors: 5,
      hint: t('adminPages.addCar.vt5Hint'),
    };
  }, [selectedCategory, effectiveModel, t]);

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
  const activeFeatures = carFeatures.filter((feature) => feature.isActive);

  if (activeFeatureTab === 'all') {
    return activeFeatures;
  }

  return activeFeatures.filter(
    (feature) => feature.category.toLowerCase() === activeFeatureTab
  );
}, [carFeatures, activeFeatureTab]);

  // Form Submission (Create or Edit)
  const handleSubmit = async () => {
    setError(null);

    if (!year || year < 1970 || year > maxAllowedYear) {
  setError(t('adminPages.addCar._errYear', { max: maxAllowedYear }));
  scrollToSection('sec-identity');
  return;
}
    if (!effectiveBrand) {
      setError(t('adminPages.addCar.errBrand'));
      scrollToSection('sec-identity');
      return;
    }
    if (!effectiveModel) {
      setError(t('adminPages.addCar.errModel'));
      scrollToSection('sec-identity');
      return;
    }
    if (!registrationNumber.trim()) {
      setError(t('adminPages.addCar.errPlate'));
      scrollToSection('sec-identity');
      return;
    }
    if (!categoryId || !categories.some((category) => category.id === categoryId)) {
      setError(t('adminPages.addCar.errCategory'));
      scrollToSection('sec-identity');
      return;
    }
    // Seating Capacity Validation
if (
  !Number.isInteger(seats) ||
  seats < vehicleTypeInfo.minSeats ||
  seats > vehicleTypeInfo.maxSeats
) {
  setError(
    t('adminPages.addCar._errSeats', { min: vehicleTypeInfo.minSeats, max: vehicleTypeInfo.maxSeats, type: vehicleTypeInfo.label })
  );
  scrollToSection('sec-specs');
  return;
}

// Number of Doors Validation
if (
  !Number.isInteger(doors) ||
  doors < vehicleTypeInfo.minDoors ||
  doors > vehicleTypeInfo.maxDoors
) {
  setError(
    t('adminPages.addCar._errDoors', { min: vehicleTypeInfo.minDoors, max: vehicleTypeInfo.maxDoors, type: vehicleTypeInfo.label })
  );
  scrollToSection('sec-specs');
  return;
}

    if (photos.length < 4) {
      setError(t('adminPages.addCar._errPhotos', { count: photos.length }));
      scrollToSection('sec-photos');
      return;
    }

    if (pricingState.pricingMethod === 'daily' || pricingState.pricingMethod === 'daily_extra_km') {
      const daily = parseFloat(pricingState.dailyRate);
      if (isNaN(daily) || daily <= 0) {
        setError(t('adminPages.addCar.errDailyRate'));
        scrollToSection('sec-pricing');
        return;
      }
    } else if (pricingState.pricingMethod === 'per_km') {
      const perKm = parseFloat(pricingState.perKmRate);
      if (isNaN(perKm) || perKm <= 0) {
        setError(t('adminPages.addCar.errKmRate'));
        scrollToSection('sec-pricing');
        return;
      }
    } else if (pricingState.pricingMethod === 'hourly') {
      const hourly = parseFloat(pricingState.hourlyRate);
      if (isNaN(hourly) || hourly <= 0) {
        setError(t('adminPages.addCar.errHourlyRate'));
        scrollToSection('sec-pricing');
        return;
      }
    } else if (pricingState.pricingMethod === 'monthly') {
      const monthly = parseFloat(pricingState.monthlyRate);
      if (isNaN(monthly) || monthly <= 0) {
        setError(t('adminPages.addCar.errMonthlyRate'));
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
      featureIds: selectedFeatures,
features: carFeatures
  .filter((feature) => selectedFeatures.includes(feature.id))
  .map((feature) => feature.name),
      luggageCapacity: luggageCapacityBags,
      cabinBagsCapacity: cabinBagsCapacity,
      acceleration0to100: parseFloat(acceleration0to100) || 4.5,
      topSpeed: parseInt(topSpeed, 10) || 250,
      torqueNm: parseInt(torqueNm, 10) || 500,
      fuelEconomy: parseFloat(fuelEconomy) || 8.5,
      minAge: minAge,
      minLicenseYears: minLicenseYears,
      fuelPolicy: fuelPolicy,
      depositRefundHours: depositRefundHours,
      notes: stringifyVehicleNotes(notes, {
        luggageCapacityBags,
        cabinBagsCapacity,
        acceleration0to100,
        topSpeed,
        torqueNm,
        fuelEconomy,
        minAge,
        minLicenseYears,
        fuelPolicy,
        depositRefundHours,
        smokingAllowed,
        petFriendly,
      }),
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
      const msg = err instanceof Error ? err.message : isEdit ? t('adminPages.addCar.errUpdate') : t('adminPages.addCar.errCreate');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete vehicle handler with confirmation modal
  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t('adminPages.addCar._removeTitle', { name: `${effectiveBrand} ${effectiveModel}` }),
      message:
        t('adminPages.addCar.removeMessage'),
      confirmText: t('adminPages.addCar.removeVehicle'),
      cancelText: t('adminPages.addCar.cancel'),
      variant: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await fleetApi.deleteVehicle(id);
      navigate('/admin/cars');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('adminPages.addCar.errDelete');
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
        <div className="loading-state" role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 20px', gap: '10px' }}>
          <RefreshCw size={28} className="spin-icon" color="#6C1E84" aria-hidden="true" />
          <h3 style={{ margin: '0 0 6px', color: '#1E0432', fontWeight: 800 }}>{t('adminPages.addCar.loading')}</h3>
          <p style={{ margin: 0, color: '#8A7090', fontSize: '0.88rem' }}>{t('adminPages.addCar.loadingSub')}</p>
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
            <span>{t('adminPages.addCar.fleetInventory')}</span>
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="active-crumb">
            {isEdit ? t('adminPages.addCar._editCrumb', { name: `${effectiveBrand} ${effectiveModel || t('adminPages.addCar.vehicle')}` }) : t('adminPages.addCar.registerTitle')}
          </span>
        </div>

        <div className="add-car-page-header">
          <div className="header-text-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="add-car-page-title">
                {isEdit ? t('adminPages.addCar._editTitle', { name: `${effectiveBrand} ${effectiveModel || ''}`.trim() }) : t('adminPages.addCar.registerTitle')}
              </h1>
              <span
                className={`status-badge ${status === 'AVAILABLE'
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
                ? t('adminPages.addCar.editSubtitle')
                : t('adminPages.addCar.createSubtitle')}
            </p>

            {/* Quick Catalog Links */}
            <div className="add-car-quick-links">
              <span className="quick-links-label">{t('adminPages.addCar.quickCatalog')}</span>
              <Link to="/admin/brands" className="quick-link-pill">
                <Car size={13} />
                <span>{t('adminPages.addCar.brands')}</span>
              </Link>
              <Link to="/admin/models" className="quick-link-pill">
                <Layers size={13} />
                <span>{t('adminPages.addCar.models')}</span>
              </Link>
              <Link to="/admin/categories" className="quick-link-pill">
                <Tag size={13} />
                <span>{t('adminPages.addCar.categories')}</span>
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
                    <span className="label-full">{t('adminPages.addCar.viewDetails')}</span>
                    <span className="label-short">{t('adminPages.addCar.view')}</span>
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
                    <span className="label-full">{isDeleting ? t('adminPages.addCar.removing') : t('adminPages.addCar.delete')}</span>
                    <span className="label-short">{t('adminPages.addCar.delete')}</span>
                  </span>
                </button>
              </>
            )}

            <Link to="/admin/cars" className="fleet-header-action-btn fleet-btn-neutral">
              <ArrowLeft size={15} />
              <span className="fleet-btn-label">
                <span className="label-full">{t('adminPages.addCar.cancel')}</span>
                <span className="label-short">{t('adminPages.addCar.back')}</span>
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
                      ? t('adminPages.addCar.savingChanges')
                      : t('adminPages.addCar.registering')
                    : isEdit
                      ? t('adminPages.addCar.saveChanges')
                      : t('adminPages.addCar.registerVehicle')}
                </span>
                <span className="label-short">{isSubmitting ? t('adminPages.addCar.saving') : t('adminPages.addCar.save')}</span>
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
            <div className="car-kpi-label">{t('adminPages.addCar.inventoryStatus')}</div>
            <div className="car-kpi-value">{status}</div>
            <div className="car-kpi-meta" style={{ color: isPublicCatalog ? '#059669' : '#D97706' }}>
              {isPublicCatalog ? t('adminPages.addCar.publicCatalog') : t('adminPages.addCar.internalOnly')}
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
            <div className="car-kpi-label">{t('adminPages.addCar.readiness')}</div>
            <div className="car-kpi-value">{complianceScore}%</div>
            <div className="car-kpi-meta" style={{ color: complianceScore === 100 ? '#059669' : '#6C1E84' }}>
              {complianceScore === 100 ? t('adminPages.addCar.readyForRental') : t('adminPages.addCar.completeFields')}
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
            <div className="car-kpi-label">{t('adminPages.addCar.commercialRate')}</div>
            <div className="car-kpi-value">{activeRateDisplay}</div>
            <div className="car-kpi-meta" style={{ color: '#8A7090' }}>
              {t('adminPages.addCar._depositAmount', { amount: `${pricingState.currency} ${pricingState.securityDeposit || '0'}` })}
            </div>
          </div>
          <div className="car-kpi-icon" style={{ backgroundColor: '#FEF8E7', color: '#B45309' }}>
            <Banknote size={24} />
          </div>
        </div>

        {/* Inspection Photos */}
        <div className="car-kpi-card">
          <div>
            <div className="car-kpi-label">{t('adminPages.addCar.inspectionPhotos')}</div>
            <div className="car-kpi-value">{photos.length} / 6</div>
            <div
              className="car-kpi-meta"
              style={{ color: photos.length >= 4 && photos.length <= 6 ? '#059669' : '#DC2626' }}
            >
              {photos.length >= 4 ? t('adminPages.addCar.standardMet') : t('adminPages.addCar._needMore', { count: 4 - photos.length })}
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
        <div className="car-section-nav-grid" role="tablist" aria-label={t('adminPages.addCar.sectionsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-identity'}
            onClick={() => scrollToSection('sec-identity')}
            className={`car-section-nav-item ${activeSection === 'sec-identity' ? 'active' : ''}`}
            title={t('adminPages.addCar.tab1Title')}
          >
            <span className="car-nav-num">1</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">{t('adminPages.addCar.tab1')}</span>
              <span className="car-nav-label-short">{t('adminPages.addCar.tab1Short')}</span>
              <span className="car-nav-label-micro">{t('adminPages.addCar.tab1Mini')}</span>
            </span>
            {isSec1Complete && <span className="car-nav-check" title={t('adminPages.addCar.sectionComplete')} />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-specs'}
            onClick={() => scrollToSection('sec-specs')}
            className={`car-section-nav-item ${activeSection === 'sec-specs' ? 'active' : ''}`}
            title={t('adminPages.addCar.tab2Title')}
          >
            <span className="car-nav-num">2</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">{t('adminPages.addCar.tab2')}</span>
              <span className="car-nav-label-short">{t('adminPages.addCar.tab2Short')}</span>
              <span className="car-nav-label-micro">{t('adminPages.addCar.tab2Short')}</span>
            </span>
            {isSec2Complete && <span className="car-nav-check" title={t('adminPages.addCar.sectionComplete')} />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-features'}
            onClick={() => scrollToSection('sec-features')}
            className={`car-section-nav-item ${activeSection === 'sec-features' ? 'active' : ''}`}
            title={t('adminPages.addCar.tab3Title')}
          >
            <span className="car-nav-num">3</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">{t('adminPages.addCar.tab3')}</span>
              <span className="car-nav-label-short">{t('adminPages.addCar.tab3Short')}</span>
              <span className="car-nav-label-micro">{t('adminPages.addCar.tab3Mini')}</span>
            </span>
            {isSec3Complete && <span className="car-nav-check" title={t('adminPages.addCar.sectionComplete')} />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-pricing'}
            onClick={() => scrollToSection('sec-pricing')}
            className={`car-section-nav-item ${activeSection === 'sec-pricing' ? 'active' : ''}`}
            title={t('adminPages.addCar.tab4Title')}
          >
            <span className="car-nav-num">4</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">{t('adminPages.addCar.tab4')}</span>
              <span className="car-nav-label-short">{t('adminPages.addCar.tab4Short')}</span>
              <span className="car-nav-label-micro">{t('adminPages.addCar.tab4Mini')}</span>
            </span>
            {isSec4Complete && <span className="car-nav-check" title={t('adminPages.addCar.sectionComplete')} />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-photos'}
            onClick={() => scrollToSection('sec-photos')}
            className={`car-section-nav-item ${activeSection === 'sec-photos' ? 'active' : ''}`}
            title={t('adminPages.addCar.tab5Title')}
          >
            <span className="car-nav-num">5</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">{t('adminPages.addCar.inspectionPhotos')}</span>
              <span className="car-nav-label-short">{t('adminPages.addCar.photos')}</span>
              <span className="car-nav-label-micro">{t('adminPages.addCar.photos')}</span>
            </span>
            {isSec5Complete && <span className="car-nav-check" title={t('adminPages.addCar.sectionComplete')} />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'sec-records'}
            onClick={() => scrollToSection('sec-records')}
            className={`car-section-nav-item ${activeSection === 'sec-records' ? 'active' : ''}`}
            title={t('adminPages.addCar.tab6Title')}
          >
            <span className="car-nav-num">6</span>
            <span className="car-nav-label-box">
              <span className="car-nav-label-full">{t('adminPages.addCar.tab6')}</span>
              <span className="car-nav-label-short">{t('adminPages.addCar.tab6Short')}</span>
              <span className="car-nav-label-micro">{t('adminPages.addCar.tab6Mini')}</span>
            </span>
            {isSec6Complete && <span className="car-nav-check" title={t('adminPages.addCar.sectionComplete')} />}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {vinDecodeSuccess && (
        <div className="add-car-alert add-car-alert-success">
          <div className="add-car-alert-inner">
            <Sparkles size={18} color="#10B981" />
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem' }}>{t('adminPages.addCar.vinDone')}</strong>
              <span>{vinDecodeSuccess}</span>
            </div>
          </div>
          <button type="button" onClick={() => setVinDecodeSuccess(null)} className="add-car-alert-dismiss">
            {t('adminPages.addCar.dismiss')}
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
            {t('adminPages.addCar.dismiss')}
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
          <span>{t('adminPages.addCar.formTab')}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`car-mobile-seg-btn ${mobileTab === 'preview' ? 'active' : ''}`}
        >
          <Eye size={15} />
          <span>{t('adminPages.addCar._previewTab', { percent: complianceScore })}</span>
        </button>
      </div>

      {/* ================= 2-COLUMN WORKSPACE GRID ================= */}
      <div className="car-workspace-grid">
        {/* ================= LEFT PANE: FORM SECTIONS ================= */}
        <div className={`car-form-pane${mobileTab === 'preview' ? ' pane-hidden' : ''}`}>
          {/* SECTION 1: IDENTITY & CLASSIFICATION */}
          
          {/* ================= PRE-TRAINED VEHICLE INTELLIGENCE AUTO-FETCHER ================= */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1E0432',
              borderRadius: '16px',
              padding: '20px 22px',
              marginBottom: '20px',
              border: '1.5px solid #E3D4EB',
              boxShadow: '0 4px 16px rgba(108, 30, 132, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6C1E84 0%, #9333EA 100%)',
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(108, 30, 132, 0.25)',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#1E0432' }}>
                    {t('adminPages.addCar.oemTitle')}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8A7090' }}>
                    {t('adminPages.addCar.oemSubtitle')}
                  </p>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: '1px solid #A7F3D0',
                }}
              >
                {t('adminPages.addCar.sourceCount', { fleet: fleetTemplates.length, templates: PRETRAINED_VEHICLE_DATABASE.length })}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 320px', minWidth: '0' }}>
                <CustomSelect
                  value={selectedPretrainedPreset}
                  onChange={(val) => handleApplyPretrainedPreset(String(val))}
                  options={pretrainedOptions}
                  placeholder={t('adminPages.addCar.oemPlaceholder')}
                  searchable
                  searchPlaceholder={t('adminPages.addCar.oemSearch')}
                  size="md"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (selectedPretrainedPreset) handleApplyPretrainedPreset(selectedPretrainedPreset);
                }}
                disabled={!selectedPretrainedPreset}
                style={{ flex: '0 0 auto', opacity: selectedPretrainedPreset ? 1 : 0.6 }}
              >
                <Sparkles size={16} /> {t('adminPages.addCar.autoFill')}
              </button>
            </div>

            {selectedPretrainedPreset && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#F5EEF8', color: '#6C1E84', border: '1px solid #EADBEE' }}>
                  🏎️ {t('adminPages.addCar._hp', { hp: horsePower || '—' })}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#E8F9F0', color: '#057A55', border: '1px solid #A7F3D0' }}>
                  ⚡ {t('adminPages.addCar._accel', { sec: acceleration0to100 || '—' })}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                  🚀 {t('adminPages.addCar._topSpeed', { speed: topSpeed || '—' })}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#FAF6FC', color: '#1E0432', border: '1px solid #E0D8E3' }}>
                  🧳 {t('adminPages.addCar._bags', { large: luggageCapacityBags, cabin: cabinBagsCapacity })}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#F5EEF8', color: '#4A1270', border: '1px solid #E0D8E3' }}>
                  ⛽ {t('adminPages.addCar._fuelPolicyTag', { policy: fuelPolicy })}
                </span>
              </div>
            )}

            {pretrainedSuccessMsg && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#065F46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={15} />
                <span>{pretrainedSuccessMsg}</span>
              </div>
            )}
          </div>

                    {/* SECTION 1: IDENTITY & CLASSIFICATION */}
          <div id="sec-identity" className="car-card-section">
            <div className="car-card-header">
              <div className="car-card-header-left">
                <div className="car-card-icon-badge">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="car-card-title">{t('adminPages.addCar.sec1Title')}</h2>
                  <p className="car-card-subtitle">{t('adminPages.addCar.sec1Subtitle')}</p>
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
                {isSec1Complete ? t('adminPages.addCar.sec1Done') : t('adminPages.addCar.mandatory')}
              </span>
            </div>


            {/* Popular Make Quick Chips - Dynamic from Database */}
            <div>
              {/* Popular Makes - Loaded from Brand CRUD */}
              <div className="popular-brands-row">
                <span className="popular-brands-label">{t('adminPages.addCar.popularMakes')}</span>

                {dbBrands.length > 0 ? (
                  dbBrands.map((b) => {
                    const isActive = brand.toLowerCase() === b.name.toLowerCase();

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleBrandChange(b.name)}
                        className={`popular-brand-chip ${isActive ? 'active' : ''}`}
                      >
                        {b.name}
                      </button>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    {t('adminPages.addCar.noBrands')}
                  </span>
                )}
              </div>
            </div>

            {/* Row 1: Brand & Model Selection */}
            <div className="car-row-2">
              {/* Make / Brand */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    {t('adminPages.addCar.make')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Link
                    to="/admin/brands"
                    title={t('adminPages.addCar.manageBrandsTitle')}
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
                    <span>{t('adminPages.addCar.manageBrands')}</span>
                  </Link>
                </div>
                <CustomSelect
                  value={brand}
                  onChange={(val) => handleBrandChange(val)}
                  searchable
                  placeholder={dbBrands.length === 0 ? t('adminPages.addCar.loadingBrands') : t('adminPages.addCar.selectBrand')}
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
                  ]}
                />
              </div>

              {/* Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    {t('adminPages.addCar.vehicleModel')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Link
                    to="/admin/models"
                    title={t('adminPages.addCar.manageModelsTitle')}
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
                    <span>{t('adminPages.addCar.manageModels')}</span>
                  </Link>
                </div>

                {!customModelMode && currentBrandModels.length > 0 ? (
                  <CustomSelect
                    value={model}
                    onChange={(val) => handleModelSelectChange(val)}
                    searchable
                    placeholder={t('adminPages.addCar.selectModel')}
                    options={[
                      ...currentBrandModels.map((m) => ({
                        value: m.name,
                        label: m.name,
                        sublabel: m.bodyType ? `${m.bodyType}` : undefined,
                      })),
                      { value: '__CUSTOM__', label: t('adminPages.addCar.customModel') },
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
                      placeholder={t('adminPages.addCar.modelPlaceholder')}
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
                        title={t('adminPages.addCar.pickCatalog')}
                      >
                        {t('adminPages.addCar.list')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Year, Trim & Embossed License Plate */}
            <div className="car-row-3">
              <div className="fleet-form-group">
                <label className="fleet-form-label fleet-form-label-required">{t('adminPages.addCar.modelYear')}</label>
                <input
                  type="number"
                  value={year || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setYear(val === '' ? 0 : parseInt(val, 10));
                  }}
                  placeholder="e.g. 2025"
                  min={1970}
                  max={maxAllowedYear}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.trim')}</label>
                <input
                  type="text"
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  placeholder={t('adminPages.addCar.trimPlaceholder')}
                  className="fleet-form-input"
                />
              </div>

              {/* Embossed License Plate Input */}
              <div className="fleet-form-group">
                <label className="fleet-form-label fleet-form-label-required">{t('adminPages.addCar.plate')}</label>
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
                    {t('adminPages.addCar.vinTitle')}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#6C1E84', fontWeight: 600 }}>
                    {t('adminPages.addCar.vinSubtitle')}
                  </span>
                </div>
                <span className="vpic-char-count">{vin.length} {t('adminPages.addCar.vinChars')}</span>
              </div>

              <div className="vpic-input-row">
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder={t('adminPages.addCar.vinPlaceholder')}
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
                  <span>{isDecodingVin ? t('adminPages.addCar.scanning') : t('adminPages.addCar.decode')}</span>
                </button>
              </div>
              <span className="fleet-form-hint" style={{ marginTop: '6px' }}>
                {t('adminPages.addCar.vinHelp')}
              </span>
            </div>

            {/* Row 4: Fleet Category & Home Base Station */}
            <div className="car-row-2">
              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    {t('adminPages.addCar.categoryAssign')} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Link
                    to="/admin/categories"
                    title={t('adminPages.addCar.manageCategoriesTitle')}
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
                    <span>{t('adminPages.addCar.manageCategories')}</span>
                  </Link>
                </div>
                <CustomSelect
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  placeholder={t('adminPages.addCar.selectCategory')}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: t('adminPages.addCar._categoryRate', { amount: formatMoney(Number(c.baseRate || 0)) }),
                  }))}
                />
              </div>

              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>
                    {t('adminPages.addCar.branch')}
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#8A7090' }}>{t('adminPages.addCar.branchHint')}</span>
                </div>
                <CustomSelect
                  value={branchId}
                  onChange={(val) => setBranchId(val)}
                  placeholder={t('adminPages.addCar.selectBranch')}
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
                  {t('adminPages.addCar.paint')} <strong style={{ color: '#1E0432' }}>{color}</strong>
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
                  <span>{isCustomColor ? t('adminPages.addCar.standardPalette') : t('adminPages.addCar.customHex')}</span>
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
                    placeholder={t('adminPages.addCar.colorNamePlaceholder')}
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
                        title={t(`adminPages.addCar._color_${c.name}`, { defaultValue: c.name })}
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
                  <h2 className="car-card-title">{t('adminPages.addCar.sec2Title')}</h2>
                  <p className="car-card-subtitle">{t('adminPages.addCar.sec2Subtitle')}</p>
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
                {isSec2Complete ? t('adminPages.addCar.sec2Done') : t('adminPages.addCar.specsRequired')}
              </span>
            </div>

            {/* Row 1: Powertrain Segmented Switches */}
            <div className="car-row-2">
              {/* Transmission Segmented Switch */}
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.transmission')}</label>
                <div className="car-segment-switch">
                  <button
                    type="button"
                    onClick={() => setTransmission('AUTOMATIC')}
                    className={`car-segment-option ${transmission === 'AUTOMATIC' ? 'active' : ''}`}
                  >
                    <Sliders size={14} />
                    <span>{t('adminPages.addCar.automatic')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransmission('MANUAL')}
                    className={`car-segment-option ${transmission === 'MANUAL' ? 'active' : ''}`}
                  >
                    <Sliders size={14} />
                    <span>{t('adminPages.addCar.manual')}</span>
                  </button>
                </div>
              </div>

              {/* Drivetrain Segmented Switch */}
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.drivetrain')}</label>
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
              <label className="fleet-form-label">{t('adminPages.addCar.fuel')}</label>
              <div className="car-fuel-grid">
                <div
                  onClick={() => setFuelType('PETROL')}
                  className={`car-fuel-card ${fuelType === 'PETROL' ? 'active' : ''}`}
                >
                  <Flame size={16} color={fuelType === 'PETROL' ? '#DC2626' : '#8A7090'} />
                  <span className="car-fuel-name">{t('adminPages.addCar.petrol')}</span>
                </div>

                <div
                  onClick={() => setFuelType('DIESEL')}
                  className={`car-fuel-card ${fuelType === 'DIESEL' ? 'active' : ''}`}
                >
                  <Fuel size={16} color={fuelType === 'DIESEL' ? '#D97706' : '#8A7090'} />
                  <span className="car-fuel-name">{t('adminPages.addCar.diesel')}</span>
                </div>

                <div
                  onClick={() => setFuelType('HYBRID')}
                  className={`car-fuel-card ${fuelType === 'HYBRID' ? 'active' : ''}`}
                >
                  <BatteryCharging size={16} color={fuelType === 'HYBRID' ? '#059669' : '#8A7090'} />
                  <span className="car-fuel-name">{t('adminPages.addCar.hybrid')}</span>
                </div>

                <div
                  onClick={() => setFuelType('ELECTRIC')}
                  className={`car-fuel-card ${fuelType === 'ELECTRIC' ? 'active' : ''}`}
                >
                  <Zap size={16} color={fuelType === 'ELECTRIC' ? '#2563EB' : '#8A7090'} />
                  <span className="car-fuel-name">{t('adminPages.addCar.electric')}</span>
                </div>
              </div>
            </div>

            {/* Row 2: Performance Specs & Tank Capacity */}
            <div className="car-row-3">
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.engine')}</label>
                <input
                  type="text"
                  value={engineSize}
                  onChange={(e) => setEngineSize(e.target.value)}
                  placeholder={t('adminPages.addCar.enginePlaceholder')}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.hpLabel')}</label>
                <input
                  type="number"
                  value={horsePower}
                  onChange={(e) => setHorsePower(e.target.value)}
                  placeholder="e.g. 203"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.tank')}</label>
                <input
                  type="text"
                  value={fuelTankCapacity}
                  onChange={(e) => setFuelTankCapacity(e.target.value)}
                  placeholder={t('adminPages.addCar.tankPlaceholder')}
                  className="fleet-form-input"
                />
              </div>
            </div>

            
            {/* Dynamic Performance Metrics & Cargo Capacity */}
            <div className="car-row-3" style={{ marginTop: '16px' }}>
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.acceleration')}</label>
                <input
                  type="text"
                  value={acceleration0to100}
                  onChange={(e) => setAcceleration0to100(e.target.value)}
                  placeholder="e.g. 3.4"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.topSpeed')}</label>
                <input
                  type="text"
                  value={topSpeed}
                  onChange={(e) => setTopSpeed(e.target.value)}
                  placeholder="e.g. 290"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.torque')}</label>
                <input
                  type="text"
                  value={torqueNm}
                  onChange={(e) => setTorqueNm(e.target.value)}
                  placeholder="e.g. 650"
                  className="fleet-form-input"
                />
              </div>
            </div>

            <div className="car-row-3" style={{ marginTop: '16px' }}>
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.economy')}</label>
                <input
                  type="text"
                  value={fuelEconomy}
                  onChange={(e) => setFuelEconomy(e.target.value)}
                  placeholder="e.g. 9.8"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.largeBags')}</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={luggageCapacityBags}
                  onChange={(e) => setLuggageCapacityBags(parseInt(e.target.value, 10) || 0)}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.smallBags')}</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={cabinBagsCapacity}
                  onChange={(e) => setCabinBagsCapacity(parseInt(e.target.value, 10) || 0)}
                  className="fleet-form-input"
                />
              </div>
            </div>

            {/* Row 3: Cabin Geometry (Seating & Doors Steppers) */}
            <div className="car-row-2">
              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>{t('adminPages.addCar.seating')} <span style={{ color: '#EF4444' }}>*</span></label>
                  <span className="car-stepper-type-tag">{t('adminPages.addCar._maxSeats', { count: vehicleTypeInfo.maxSeats, type: vehicleTypeInfo.label })}</span>
                </div>
                <div className="car-stepper">
                  <button
                    type="button"
                    onClick={() => setSeats((prev) => Math.max(vehicleTypeInfo.minSeats, (Number(prev) || 1) - 1))}
                    disabled={Number(seats) <= vehicleTypeInfo.minSeats}
                    className="car-stepper-btn"
                    aria-label={t('adminPages.addCar.seatsDown')}
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
                      {t('adminPages.addCar._seatUnit', { count: Number(seats) })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeats((prev) => Math.min(vehicleTypeInfo.maxSeats, (Number(prev) || 1) + 1))}
                    disabled={Number(seats) >= vehicleTypeInfo.maxSeats}
                    className="car-stepper-btn"
                    aria-label={t('adminPages.addCar.seatsUp')}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="fleet-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="fleet-form-label" style={{ margin: 0 }}>{t('adminPages.addCar.doorsLabel')} <span style={{ color: '#EF4444' }}>*</span></label>
                  <span className="car-stepper-type-tag">{t('adminPages.addCar._maxDoors', { count: vehicleTypeInfo.maxDoors })}</span>
                </div>
                <div className="car-stepper">
                  <button
                    type="button"
                    onClick={() => setDoors((prev) => Math.max(vehicleTypeInfo.minDoors, (Number(prev) || 2) - 1))}
                    disabled={Number(doors) <= vehicleTypeInfo.minDoors}
                    className="car-stepper-btn"
                    aria-label={t('adminPages.addCar.doorsDown')}
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
                      {t('adminPages.addCar._doorUnit', { count: Number(doors) })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDoors((prev) => Math.min(vehicleTypeInfo.maxDoors, (Number(prev) || 2) + 1))}
                    disabled={Number(doors) >= vehicleTypeInfo.maxDoors}
                    className="car-stepper-btn"
                    aria-label={t('adminPages.addCar.doorsUp')}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4: Telematics, Mileage & Bay Tracking */}
            <div className="car-row-4 car-row-last">
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.odometer')}</label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="0"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.nextService')}</label>
                <input
                  type="number"
                  value={nextServiceMileage}
                  onChange={(e) => setNextServiceMileage(e.target.value)}
                  placeholder="e.g. 20000"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.parking')}</label>
                <input
                  type="text"
                  value={parkingSpot}
                  onChange={(e) => setParkingSpot(e.target.value)}
                  placeholder={t('adminPages.addCar.parkingPlaceholder')}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.tracker')}</label>
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
                  <h2 className="car-card-title">{t('adminPages.addCar.sec3Title')}</h2>
                  <p className="car-card-subtitle">
                    {t('adminPages.addCar.sec3Subtitle')}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6C1E84', backgroundColor: '#F5EEF8', padding: '4px 12px', borderRadius: '12px' }}>
                {t('adminPages.addCar._selected', { selected: selectedFeatures.length, total: carFeatures.filter((feature) => feature.isActive).length })}
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
                    {t(`adminPages.addCar._fc_${cat.id}`, { defaultValue: cat.label })}
                  </button>
                ))}
              </div>

              <div className="feature-actions-bar">
                <button
                  type="button"
                  onClick={selectAllFeatures}
                  className="feature-action-text-btn"
                >
                  {t('adminPages.addCar.selectAll')}
                </button>
                <span style={{ color: '#D4C9D9' }}>|</span>
                <button
                  type="button"
                  onClick={clearAllFeatures}
                  className="feature-action-text-btn"
                  style={{ color: '#8A7090' }}
                >
                  {t('adminPages.addCar.clear')}
                </button>
              </div>
            </div>

            {/* Features Chips Grid */}
            <div className="car-features-grid">
              {isLoadingFeatures ? (
  <p>{t('adminPages.addCar.loadingFeatures')}</p>
) : filteredFeatures.length === 0 ? (
  <p>{t('adminPages.addCar.noFeatures')}</p>
) : (
  filteredFeatures.map((feat) => {
    const isSelected = selectedFeatures.includes(feat.id);

    return (
      <button
        key={feat.id}
        type="button"
        onClick={() => toggleFeature(feat.id)}
        className={`car-feature-chip ${isSelected ? 'selected' : ''}`}
      >
        <CheckCircle2
          size={17}
          color={isSelected ? '#6C1E84' : '#C7B9CC'}
          strokeWidth={isSelected ? 2.5 : 1.5}
          style={{ flexShrink: 0 }}
        />
        <span>{feat.name}</span>
      </button>
    );
  })
)}
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
                  <h2 className="car-card-title">{t('adminPages.addCar.sec6Title')}</h2>
                  <p className="car-card-subtitle">{t('adminPages.addCar.sec6Subtitle')}</p>
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
                {isSec6Complete ? t('adminPages.addCar.sec6Done') : t('adminPages.addCar.optionalRecords')}
              </span>
            </div>

            <div className="car-row-3">
              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.policyNumber')}</label>
                <input
                  type="text"
                  value={insurancePolicyNumber}
                  onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                  placeholder="e.g. POL-8912-PK"
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.insuranceExpiry')}</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.registrationExpiry')}</label>
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
                <label className="fleet-form-label">{t('adminPages.addCar.lastService')}</label>
                <input
                  type="date"
                  value={lastServiceDate}
                  onChange={(e) => setLastServiceDate(e.target.value)}
                  className="fleet-form-input"
                />
              </div>

              <div className="fleet-form-group">
                <label className="fleet-form-label">{t('adminPages.addCar.lastServiceKm')}</label>
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
              <label className="fleet-form-label">{t('adminPages.addCar.internalNotes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('adminPages.addCar.notesPlaceholder')}
                className="fleet-form-textarea"
                rows={3}
              />
            </div>

            {/* Rental Rules & Policies */}
            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: '#F8F5FA', border: '1px solid #EBDDF0' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 800, color: '#1E0426' }}>
                {t('adminPages.addCar.policies')}
              </h4>
              <div className="car-row-4">
                <div className="fleet-form-group">
                  <label className="fleet-form-label">{t('adminPages.addCar.minAge')}</label>
                  <input
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(parseInt(e.target.value, 10) || 21)}
                    className="fleet-form-input"
                  />
                </div>
                <div className="fleet-form-group">
                  <label className="fleet-form-label">{t('adminPages.addCar.minLicense')}</label>
                  <input
                    type="number"
                    value={minLicenseYears}
                    onChange={(e) => setMinLicenseYears(parseInt(e.target.value, 10) || 1)}
                    className="fleet-form-input"
                  />
                </div>
                <div className="fleet-form-group">
                  <label className="fleet-form-label">{t('adminPages.addCar.fuelPolicy')}</label>
                  <CustomSelect
                    value={fuelPolicy}
                    onChange={(val) => setFuelPolicy(String(val))}
                    options={[
                      { value: 'Full-to-Full', label: 'Full-to-Full', sublabel: t('adminPages.addCar.fuelFull') },
                      { value: 'Same-to-Same', label: 'Same-to-Same', sublabel: t('adminPages.addCar.fuelSame') },
                      { value: 'Prepaid Full Tank', label: 'Prepaid Full Tank', sublabel: t('adminPages.addCar.fuelPrepaid') },
                    ]}
                    size="md"
                  />
                </div>
                <div className="fleet-form-group">
                  <label className="fleet-form-label">{t('adminPages.addCar.depositRelease')}</label>
                  <input
                    type="number"
                    value={depositRefundHours}
                    onChange={(e) => setDepositRefundHours(parseInt(e.target.value, 10) || 24)}
                    className="fleet-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={smokingAllowed}
                    onChange={(e) => setSmokingAllowed(e.target.checked)}
                  />
                  {t('adminPages.addCar.smoking')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={petFriendly}
                    onChange={(e) => setPetFriendly(e.target.checked)}
                  />
                  {t('adminPages.addCar.pets')}
                </label>
              </div>
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
                <span>{t('adminPages.addCar.livePreview')}</span>
              </div>
              <span
                className={`status-badge ${status === 'AVAILABLE'
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
                    alt={t('adminPages.addCar.livePreviewAlt')}
                    className="preview-hero-img"
                  />

                  {/* Caption Overlay */}
                  <div className="preview-hero-caption">
                    {activePreviewPhoto.caption || t('adminPages.addCar.anglePhoto')}
                  </div>

                  {/* Navigation Arrows on Hero */}
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                        className="preview-arrow-btn arrow-left"
                        aria-label={t('adminPages.addCar.prevPhoto')}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                        className="preview-arrow-btn arrow-right"
                        aria-label={t('adminPages.addCar.nextPhoto')}
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
                  <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>{t('adminPages.addCar.noPhotos')}</span>
                  <span style={{ fontSize: '0.76rem', color: '#BCA8C4', marginTop: '4px', maxWidth: '240px', lineHeight: 1.4 }}>
                    {t('adminPages.addCar.noPhotosHint')}
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
                  {activeCategory?.name || t('adminPages.addCar.categoryFallback')}
                </span>
                <span className="preview-plate">
                  {registrationNumber ? registrationNumber.toUpperCase() : 'NO-PLATE'}
                </span>
              </div>

              <h3 className="preview-car-name">
                {effectiveBrand || t('adminPages.addCar.makeFallback')} {effectiveModel || t('adminPages.addCar.modelFallback')}
              </h3>
              <p className="preview-car-trim">
                {year} • {trim || t('adminPages.addCar.standardGrade')} • {color}
              </p>

              {/* Core Specs Pills */}
              <div className="preview-spec-grid">
                <div className="preview-spec-item">
                  <Sliders size={14} color="#6C1E84" />
                  <span>{transmission === 'AUTOMATIC' ? t('adminPages.addCar.auto') : t('adminPages.addCar.manualShort')}</span>
                </div>
                <div className="preview-spec-item">
                  <Users size={14} color="#6C1E84" />
                  <span>{t('adminPages.addCar._seatsCount', { count: Number(seats) || 5 })}</span>
                </div>
                <div className="preview-spec-item">
                  <Fuel size={14} color="#6C1E84" />
                  <span>{fuelType}</span>
                </div>
                <div className="preview-spec-item">
                  <DoorOpen size={14} color="#6C1E84" />
                  <span>{t('adminPages.addCar._doorsCount', { count: Number(doors) || 4 })}</span>
                </div>
                <div className="preview-spec-item">
                  <MapPin size={14} color="#6C1E84" />
                  <span>{activeBranch?.city || t('adminPages.addCar.centralHub')}</span>
                </div>
                <div className="preview-spec-item">
                  <Shield size={14} color="#059669" />
                  <span>{t('adminPages.addCar._photoCount', { count: photos.length })}</span>
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
                    {t('adminPages.addCar._depositAmount', { amount: `${pricingState.currency} ${pricingState.securityDeposit || '0'}` })}
                  </div>
                  {pricingState.pricingMethod === 'daily_extra_km' && (
                    <div style={{ fontSize: '0.72rem', color: '#8A7090', marginTop: '2px' }}>
                      {t('adminPages.addCar._limit', { km: pricingState.mileageLimitPerDay })}
                    </div>
                  )}
                  {pricingState.pricingMethod === 'per_km' && (
                    <div style={{ fontSize: '0.72rem', color: '#8A7090', marginTop: '2px' }}>
                      {t('adminPages.addCar._minTrip', { amount: `${pricingState.currency} ${pricingState.minimumTripCharge}` })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Readiness Progress Card */}
          <div className="compliance-card">
            <div className="compliance-header">
              <h4 className="compliance-title">{t('adminPages.addCar.activation')}</h4>
              <span
                className="compliance-pct"
                style={{
                  color: complianceScore === 100 ? '#059669' : '#6C1E84',
                }}
              >
                {t('adminPages.addCar._percentComplete', { percent: complianceScore })}
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
                  {t('adminPages.addCar._checkMake', { name: `${effectiveBrand || t('adminPages.addCar.makeFallback')} ${effectiveModel || t('adminPages.addCar.modelFallback')}` })}
                </span>
              </div>

              <div className="compliance-item">
                <CheckCircle2 size={16} color={registrationNumber.trim() ? '#059669' : '#D1D5DB'} />
                <span style={{ color: registrationNumber.trim() ? '#1E0432' : '#8A7090' }}>
                  {t('adminPages.addCar.checkPlate')} {registrationNumber ? `(${registrationNumber})` : ''}
                </span>
              </div>

              <div className="compliance-item">
                <CheckCircle2 size={16} color={categoryId ? '#059669' : '#D1D5DB'} />
                <span style={{ color: categoryId ? '#1E0432' : '#8A7090' }}>{t('adminPages.addCar.checkCategory')}</span>
              </div>

              <div className="compliance-item">
                <CheckCircle2 size={16} color={photos.length >= 4 && photos.length <= 6 ? '#059669' : '#F59E0B'} />
                <span
                  style={{
                    color: photos.length >= 4 && photos.length <= 6 ? '#059669' : '#B45309',
                    fontWeight: photos.length >= 4 ? 600 : 700,
                  }}
                >
                  {t('adminPages.addCar._checkPhotos', { count: photos.length })}
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
                  {t('adminPages.addCar.checkPricing')}
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
                      ? t('adminPages.addCar.savingChanges')
                      : t('adminPages.addCar.registering')
                    : isEdit
                      ? t('adminPages.addCar.saveVehicleChanges')
                      : t('adminPages.addCar.registerNow')}
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
            <span>{t('adminPages.addCar._percentReady', { percent: complianceScore })}</span>
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
            <span>{mobileTab === 'form' ? t('adminPages.addCar.preview') : t('adminPages.addCar.form')}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isDeleting}
            className="floating-submit-btn"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{isSubmitting ? t('adminPages.addCar.saving') : isEdit ? t('adminPages.addCar.save') : t('adminPages.addCar.register')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCarPage;
