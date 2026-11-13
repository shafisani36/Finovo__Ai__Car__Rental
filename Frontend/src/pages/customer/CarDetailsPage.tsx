import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ArrowRight,
  Heart,
  Share2,
  GitCompareArrows,
  Rotate3d,
  Cog,
  Gauge,
  Fuel,
  DoorOpen,
  Briefcase,
  Network,
  Bluetooth,
  Navigation,
  Video,
  Sun,
  Armchair,
  CirclePlay,
  Wrench,
  CalendarX,
  Star,
  Zap,
  ShieldCheck,
  FileCheck,
  Camera,
  Activity,
} from 'lucide-react';
import { lookupPretrainedVehicle } from '../../features/fleet/data/pretrainedVehicles';
import { vehiclesApi } from '../../api/services/vehicles.api';
import { branchesApi } from '../../api/services/branches.api';
import { useBookingQuote, toLocalIso } from '../../hooks/useBookingQuote';
import type { BookingAddonCode } from '../../features/bookings/api/bookingApi';
import type { Branch } from '../../features/branches/api/branchApi';
import { useAuth } from '../../features/auth/context';
import {
  formatMoney,
  getCarGalleryEntries,
  getCarImage,
  isFullBleedCarPhoto,
  resolveVehiclePricing,
} from '../../utils/carImageHelper';
import { parseVehicleNotes } from '../../utils/vehicleNotesHelper';
import { CustomSelect } from '../../components/common/CustomSelect';
import { CompareTray } from '../../components/cars/CompareTray';
import { AvailabilityCalendar } from '../../components/cars/AvailabilityCalendar';
import { MAX_COMPARE, useCompareCars, useRecentlyViewed, useSavedCars } from '../../hooks/useCarShortlists';

const secondaryActionStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 10px',
  borderRadius: '12px',
  backgroundColor: active ? '#FAB826' : 'rgba(255, 255, 255, 0.12)',
  color: active ? '#1E0426' : '#FFFFFF',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
});

// Assets
import carMain from '../../assets/car-detail/car-main.jpg';
import lamboLogo from '../../assets/car-detail/lambo-logo.jpg';

interface InsurancePlan {
  id: 'basic' | 'standard' | 'premium';
  /** Server add-on code; prices are always read from the backend catalog */
  addonCode: BookingAddonCode | null;
}

const INSURANCE_PLANS: InsurancePlan[] = [
  { id: 'basic', addonCode: null },
  { id: 'standard', addonCode: 'PROTECTION_STANDARD' },
  { id: 'premium', addonCode: 'PROTECTION_PREMIUM' },
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function localDateOffset(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

export function CarDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Dates come from the cars search (?pickupDate&returnDate) or default to tomorrow -> +3 days
  const [searchParams] = useSearchParams();
  const queryPickup = searchParams.get('pickupDate');
  const queryReturn = searchParams.get('returnDate');

  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan>(INSURANCE_PLANS[1]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [returnBranchId, setReturnBranchId] = useState('');
  const [pickupDate, setPickupDate] = useState(
    queryPickup && ISO_DATE_PATTERN.test(queryPickup) ? queryPickup : localDateOffset(1)
  );
  const [dropoffDate, setDropoffDate] = useState(
    queryReturn && ISO_DATE_PATTERN.test(queryReturn) ? queryReturn : localDateOffset(4)
  );
  const [vehicle, setVehicle] = useState<any>(null);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [similarCars, setSimilarCars] = useState<any[]>([]);
  const { isSaved, toggleSaved } = useSavedCars();
  const { isCompared, toggleCompare } = useCompareCars();
  const { addRecent } = useRecentlyViewed();
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCarDetails() {
      if (!id) return;
      setIsLoadingVehicle(true);
      setVehicleError(null);
      try {
        const res = await vehiclesApi.getById(id);
        if (!isMounted) return;
        if (res && res.vehicle) {
          setVehicle(res.vehicle);
          addRecent(res.vehicle.id);
        } else {
          setVehicle(null);
          setVehicleError(t('cars.details.notFound'));
        }
      } catch (e) {
        if (isMounted) {
          setVehicle(null);
          setVehicleError(e instanceof Error ? e.message : t('cars.details.notFound'));
        }
      } finally {
        if (isMounted) setIsLoadingVehicle(false);
      }
    }
    fetchCarDetails();
    return () => {
      isMounted = false;
    };
  }, [id, t]);

  // Real rental branches from the backend
  useEffect(() => {
    let isMounted = true;
    branchesApi
      .list()
      .then((res) => {
        if (!isMounted) return;
        const active = (res.branches || []).filter((b) => b.isActive !== false);
        setBranches(active);
        if (active.length > 0) {
          setPickupBranchId((prev) => prev || active[0].id);
          setReturnBranchId((prev) => prev || active[0].id);
        }
      })
      .catch(() => {
        if (isMounted) setBranches([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Similar cars from the same category (live data only)
  useEffect(() => {
    let isMounted = true;
    const categoryId = vehicle?.categoryId || vehicle?.category?.id;
    if (!categoryId) {
      setSimilarCars([]);
      return;
    }
    vehiclesApi
      .list({ limit: 4, category: categoryId, publicCatalog: 'true' })
      .then((res) => {
        if (!isMounted) return;
        setSimilarCars((res.vehicles || []).filter((v: any) => v.id !== vehicle.id).slice(0, 3));
      })
      .catch(() => {
        if (isMounted) setSimilarCars([]);
      });
    return () => {
      isMounted = false;
    };
  }, [vehicle]);

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name, sublabel: b.city }));

  // Server-side price + availability for the selected dates and plan
  const selectedAddons: BookingAddonCode[] = selectedPlan.addonCode ? [selectedPlan.addonCode] : [];
  const pickupIso = toLocalIso(pickupDate);
  const returnIso = toLocalIso(dropoffDate);
  const {
    quote,
    availability,
    addonCatalog,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useBookingQuote(vehicle?.id, pickupIso, returnIso, selectedAddons);
  const isUnavailable = availability ? !availability.available : false;
  const planPrice = (plan: InsurancePlan) =>
    plan.addonCode ? addonCatalog.find((a) => a.code === plan.addonCode)?.unitPrice ?? null : 0;

  if (isLoadingVehicle) {
    return (
      <div style={{ backgroundColor: '#F9F8FA', minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: '#6B7280', fontWeight: 600 }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={{ backgroundColor: '#F9F8FA', minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E0426', margin: '0 0 8px' }}>
            {t('cars.details.notFound')}
          </h1>
          {vehicleError && <p style={{ color: '#6B7280', margin: '0 0 20px' }}>{vehicleError}</p>}
          <Link to="/cars" style={{ color: '#1E0426', fontWeight: 800 }}>
            {t('cars.details.backToCars')}
          </Link>
        </div>
      </div>
    );
  }

  // Dynamic gallery items strictly matching the active vehicle/model
  const gallery = getCarGalleryEntries(vehicle).map((entry) => ({
    label: entry.caption,
    src: entry.url,
  }));
  const safeActiveThumb = activeThumb < gallery.length ? activeThumb : 0;
  const activePhoto = gallery[safeActiveThumb] || {
    label: `${vehicle.brand} ${vehicle.model}`,
    src: getCarImage(vehicle) || carMain,
  };

  const brandName = vehicle?.brand?.name || vehicle?.brand || '';
  const modelName = vehicle?.model?.name || vehicle?.model || '';
  const carName = `${brandName} ${modelName}`.trim();
  const vehiclePricing = resolveVehiclePricing(vehicle);
  const baseRate = vehiclePricing.dailyRate;
  const currency = quote?.currency || vehiclePricing.currency;
  const days = quote?.totalDays ?? null;
  const totalRental = quote ? quote.totalAmount : null;

  // Dynamic Specs with Pre-Trained Engine & Extra Metadata
  const extraSpecs = (() => {
    if (!vehicle?.notes) return null;
    return parseVehicleNotes(vehicle.notes).extraSpecs;
  })();

  const pretrainedSpec = lookupPretrainedVehicle(brandName, modelName);

  const engineVal = vehicle?.engineSize || vehicle?.engineCapacity || pretrainedSpec?.engineSize || '—';
  const powerVal = vehicle?.horsepower || vehicle?.horsePower
    ? `${vehicle.horsepower || vehicle.horsePower} HP`
    : pretrainedSpec
      ? `${pretrainedSpec.horsePower} HP`
      : '—';
  const accelVal = extraSpecs?.acceleration0to100
    ? `${extraSpecs.acceleration0to100}s`
    : pretrainedSpec
      ? `${pretrainedSpec.acceleration0to100}s`
      : '—';
  const torqueVal = extraSpecs?.torqueNm
    ? `${extraSpecs.torqueNm} Nm`
    : pretrainedSpec
      ? `${pretrainedSpec.torqueNm} Nm`
      : '—';
  const fuelEconomyVal = extraSpecs?.fuelEconomy || (pretrainedSpec ? `${pretrainedSpec.fuelEconomyL100km} L/100km` : '—');
  const fuelVal = vehicle?.fuelType || vehicle?.fuel || pretrainedSpec?.fuelType || '—';
  const doorsVal = vehicle?.doors ? `${vehicle.doors} ${t('cars.details.doorsUnit')}` : '—';
  const luggageVal = extraSpecs?.luggageCapacityBags
    ? `${extraSpecs.luggageCapacityBags} Large, ${extraSpecs?.cabinBagsCapacity || 2} Cabin`
    : pretrainedSpec
      ? `${pretrainedSpec.luggageCapacityBags} Large, ${pretrainedSpec.cabinBagsCapacity} Cabin`
      : (vehicle?.luggageCapacity ? `${vehicle.luggageCapacity} Bags` : '—');
  const drivetrainVal = vehicle?.drivetrain || pretrainedSpec?.drivetrain || '—';
  const speedVal = extraSpecs?.topSpeed
    ? `${extraSpecs.topSpeed} km/h`
    : vehicle?.topSpeed
      ? `${vehicle.topSpeed} km/h`
      : pretrainedSpec
        ? `${pretrainedSpec.topSpeedKmH} km/h`
        : '—';
  const transVal = vehicle?.transmission || pretrainedSpec?.transmission || '—';

  const shareCar = async () => {
    const url = `${window.location.origin}/cars/${vehicle.id}`;
    const title = `${carName} | ${t('common.appName')}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote(t('shortlists.linkCopied'));
    } catch (err) {
      // Closing the share sheet is not an error
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setShareNote(url);
    }
  };

  const handleBookNow = () => {
    if (isUnavailable || !quote) return;
    const bookingQuery = new URLSearchParams({
      vehicleId: vehicle.id,
      pickupDate: pickupDate,
      returnDate: dropoffDate,
      pickupBranchId,
      returnBranchId,
      plan: selectedPlan.id,
    }).toString();

    const checkoutUrl = `/customer/bookings/new?${bookingQuery}`;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
    } else {
      navigate(checkoutUrl);
    }
  };

  return (
    <div style={{ backgroundColor: '#F9F8FA', minHeight: '100vh', color: '#1E0426', fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)' }}>
      {/* Hero Section */}
      <section
        style={{
          backgroundColor: '#1E0426',
          color: '#FFFFFF',
          padding: '40px 6% 60px',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '40px' }}>
          {/* Left Column: Photos, Badges, Name */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', opacity: 0.8, marginBottom: '12px', flexWrap: 'wrap' }}>
              <Link to="/" style={{ color: '#FAB826', textDecoration: 'none' }}>{t('nav.home')}</Link>
              <span>/</span>
              <Link to="/cars" style={{ color: '#FAB826', textDecoration: 'none' }}>{t('nav.cars')}</Link>
              <span>/</span>
              <span>{carName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(1.65rem, 4vw, 2.375rem)', fontWeight: 800, margin: '0 0 6px' }}>{carName}</h1>
                <p style={{ fontSize: '15px', opacity: 0.85, margin: 0 }}>
                  {[vehicle?.category?.name, vehicle?.year].filter(Boolean).join(' · ')}
                </p>
                {/* Real rating from approved customer reviews; hidden until the car has one */}
                {vehicle?.rating?.count > 0 && vehicle.rating.average !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', color: '#FAB826' }} aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={15}
                          fill={i < Math.round(vehicle.rating.average) ? '#FAB826' : 'transparent'}
                        />
                      ))}
                    </div>
                    <strong style={{ fontSize: '14px' }}>{Number(vehicle.rating.average).toFixed(1)}</strong>
                    <span style={{ fontSize: '12px', opacity: 0.75 }}>
                      {t('cars.details.reviewCount', { count: vehicle.rating.count })}
                    </span>
                  </div>
                )}
              </div>

              {brandName.toLowerCase().includes('lambo') ? (
                <img src={lamboLogo} alt="Lamborghini" style={{ height: '48px', objectFit: 'contain' }} />
              ) : (
                <div style={{ padding: '6px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px' }}>
                  {brandName.toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', marginBottom: '24px' }}>
              <span style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, color: '#FAB826' }}>
                {formatMoney(baseRate, vehiclePricing.currency)}
              </span>
              <span style={{ fontSize: '15px', opacity: 0.8, marginInlineStart: '8px' }}>{t('common.perDay')}</span>
            </div>

            {/* Main Active Image with 360 viewer */}
            <div
              style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                height: 'clamp(220px, 42vw, 380px)',
                background: 'linear-gradient(135deg, #24052E 0%, #3B094E 55%, #551270 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={activePhoto.src}
                alt={activePhoto.label}
                style={
                  isFullBleedCarPhoto(activePhoto.src)
                    ? { width: '100%', height: '100%', objectFit: 'cover' }
                    : { width: '90%', height: '85%', objectFit: 'contain' }
                }
              />
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  insetInlineEnd: '16px',
                  backgroundColor: 'rgba(30, 4, 38, 0.8)',
                  backdropFilter: 'blur(8px)',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#FAB826',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid rgba(250, 184, 38, 0.4)',
                }}
              >
                <Rotate3d size={16} />
                <span>{t('cars.details.inspectionVerified')}</span>
              </div>
            </div>

            {/* Authentic Per-Model Thumbnails row */}
            {gallery.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                {gallery.map((gItem, idx) => {
                  const isActive = safeActiveThumb === idx;
                  return (
                    <button
                      key={`${gItem.src}-${idx}`}
                      type="button"
                      title={gItem.label}
                      aria-label={gItem.label}
                      onClick={() => setActiveThumb(idx)}
                      style={{
                        width: '96px',
                        height: '64px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: isActive ? '2px solid #FAB826' : '2px solid rgba(30, 5, 40, 0.14)',
                        boxShadow: isActive ? '0 4px 12px rgba(250, 184, 38, 0.25)' : 'none',
                        padding: 0,
                        background: 'linear-gradient(135deg, #24052E 0%, #3B094E 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={gItem.src}
                        alt={gItem.label}
                        style={
                          isFullBleedCarPhoto(gItem.src)
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

          {/* Right Column: Interactive Booking Card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: 'clamp(18px, 4vw, 30px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', color: '#FFFFFF' }}>
                {t('cars.details.instantReservation')}
              </h2>
              <p style={{ fontSize: '13px', opacity: 0.8, margin: '0 0 20px' }}>
                {t('cars.details.selectSchedule')}
              </p>

              {/* Insurance Plans Pill Selection */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#FAB826', marginBottom: '8px' }}>
                {t('cars.details.chooseInsurance')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))', gap: '8px', marginBottom: '20px' }}>
                {INSURANCE_PLANS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  const localizedPlanName =
                    plan.id === 'basic'
                      ? t('cars.details.planBasicName')
                      : plan.id === 'standard'
                      ? t('cars.details.planStandardName')
                      : t('cars.details.planPremiumName');
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #FAB826' : '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: isSelected ? 'rgba(250, 184, 38, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        color: '#FFFFFF',
                        textAlign: 'start',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '13px', color: isSelected ? '#FAB826' : '#FFFFFF' }}>{localizedPlanName}</strong>
                        {isSelected && <Check size={14} color="#FAB826" />}
                      </div>
                      <span style={{ fontSize: '11px', display: 'block', marginTop: '2px', opacity: 0.85 }}>
                        {planPrice(plan) === null
                          ? '…'
                          : `+${formatMoney(planPrice(plan) as number, currency)}`}
                        /{t('cars.pricePerDay')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Locations & Dates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '6px' }}>
                    {t('cars.details.pickupBranch')}
                  </label>
                  <CustomSelect
                    value={pickupBranchId}
                    onChange={(val) => setPickupBranchId(String(val))}
                    options={branchOptions}
                    variant="dark"
                    size="sm"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '6px' }}>
                    {t('cars.details.dropoffBranch')}
                  </label>
                  <CustomSelect
                    value={returnBranchId}
                    onChange={(val) => setReturnBranchId(String(val))}
                    options={branchOptions}
                    variant="dark"
                    size="sm"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                    {t('cars.details.pickupDate')}
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    min={localDateOffset(0)}
                    onChange={(e) => {
                      setPickupDate(e.target.value);
                      if (dropoffDate <= e.target.value) {
                        const next = new Date(`${e.target.value}T00:00:00`);
                        next.setDate(next.getDate() + 1);
                        const offset = next.getTimezoneOffset() * 60000;
                        setDropoffDate(new Date(next.getTime() - offset).toISOString().slice(0, 10));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                    {t('cars.details.dropoffDate')}
                  </label>
                  <input
                    type="date"
                    min={pickupDate}
                    value={dropoffDate}
                    onChange={(e) => setDropoffDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Duration and Total Calculation */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(250, 184, 38, 0.1)',
                  border: '1px solid rgba(250, 184, 38, 0.3)',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>{t('cars.details.estimatedDuration')}</p>
                  <strong style={{ fontSize: '16px', color: '#FAB826' }}>
                    {days === null ? '—' : `${days} ${t('common.days')}`}
                  </strong>
                </div>

                <div style={{ textAlign: 'end' }}>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>{t('cars.details.totalWithTax')}</p>
                  <strong style={{ fontSize: '20px', color: '#FAB826', fontWeight: 800 }}>
                    {isQuoteLoading ? '…' : totalRental === null ? '—' : formatMoney(totalRental, currency)}
                  </strong>
                </div>
              </div>

              {isUnavailable && (
                <p
                  role="alert"
                  style={{
                    margin: '0 0 16px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {t('cars.details.notAvailableForDates', { from: pickupDate, to: dropoffDate })}
                </p>
              )}
              {quoteError && !isUnavailable && (
                <p role="alert" style={{ margin: '0 0 16px', color: '#FCA5A5', fontSize: '13px', fontWeight: 600 }}>
                  {quoteError}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBookNow}
                disabled={isUnavailable || !quote || isQuoteLoading || !pickupBranchId}
                aria-disabled={isUnavailable || !quote || isQuoteLoading || !pickupBranchId}
                style={{
                  opacity: isUnavailable || !quote || isQuoteLoading || !pickupBranchId ? 0.55 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#FAB826',
                  color: '#1E0426',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(250, 184, 38, 0.4)',
                }}
              >
                <span>{t('cars.details.bookThisCar')}</span>
                <ArrowRight size={16} className="rtl-mirror-arrow" />
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Compare with up to two other cars */}
                <button
                  type="button"
                  onClick={() => {
                    if (!toggleCompare(vehicle.id)) setShareNote(t('shortlists.compareFull', { count: MAX_COMPARE }));
                  }}
                  aria-pressed={isCompared(vehicle.id)}
                  style={secondaryActionStyle(isCompared(vehicle.id))}
                >
                  <GitCompareArrows size={16} />
                  <span>{isCompared(vehicle.id) ? t('shortlists.inCompare') : t('shortlists.addCompare')}</span>
                </button>

                {/* Share this car (native share sheet on phones, copy link elsewhere) */}
                <button type="button" onClick={shareCar} style={secondaryActionStyle(false)} aria-label={t('shortlists.share')}>
                  <Share2 size={16} />
                  <span>{t('shortlists.share')}</span>
                </button>

                {/* Save to this browser's saved cars */}
                <button
                  type="button"
                  onClick={() => toggleSaved(vehicle.id)}
                  aria-pressed={isSaved(vehicle.id)}
                  aria-label={isSaved(vehicle.id) ? t('shortlists.removeSaved') : t('shortlists.save')}
                  title={isSaved(vehicle.id) ? t('shortlists.removeSaved') : t('shortlists.save')}
                  style={{
                    width: '46px',
                    flexShrink: 0,
                    borderRadius: '12px',
                    backgroundColor: isSaved(vehicle.id) ? '#FFFFFF' : 'rgba(255, 255, 255, 0.12)',
                    color: isSaved(vehicle.id) ? '#E11D48' : '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={18} fill={isSaved(vehicle.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              {shareNote && (
                <p role="status" style={{ margin: '10px 0 0', fontSize: '12px', color: '#FDE68A' }}>
                  {shareNote}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Availability for the next months (busy days only, never who booked) */}
      <section style={{ maxWidth: '1240px', margin: '48px auto 0', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <AvailabilityCalendar
          vehicleId={vehicle.id}
          selectedStart={pickupDate}
          selectedEnd={dropoffDate}
          onSelectRange={(start, end) => {
            setPickupDate(start);
            setDropoffDate(end);
          }}
        />
      </section>

      {/* Technical Specifications Grid */}
      <section style={{ maxWidth: '1240px', margin: '60px auto', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase' }}>
            {t('cars.details.specsEyebrow')}
          </p>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2rem)', fontWeight: 800, color: '#1E0426', margin: '4px 0 0' }}>
            {t('cars.details.specsTitle')}
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '6px 0 0' }}>
            {t('cars.details.specsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 135px), 1fr))', gap: '16px' }}>
          {[
            { icon: Cog, label: t('cars.details.specPowertrain'), val: engineVal },
            { icon: Gauge, label: t('cars.details.specHorsepower'), val: powerVal },
            { icon: Zap, label: t('cars.details.specAccel'), val: accelVal },
            { icon: Gauge, label: t('cars.details.specTopSpeed'), val: speedVal },
            { icon: Activity, label: t('cars.details.specTorque'), val: torqueVal },
            { icon: Fuel, label: t('cars.details.specFuelEconomy'), val: `${fuelVal} (${fuelEconomyVal})` },
            { icon: Briefcase, label: t('cars.details.specLuggage'), val: luggageVal },
            { icon: Network, label: t('cars.details.specDrivetrain'), val: drivetrainVal },
            { icon: DoorOpen, label: t('cars.details.specDoorsSeats'), val: doorsVal },
            { icon: Fuel, label: t('cars.details.specTransmission'), val: transVal },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '20px 16px',
                  border: '1px solid #ECEAEF',
                  textAlign: 'center',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#1E0426',
                    color: '#FAB826',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>{item.label}</span>
                <strong style={{ fontSize: '14px', color: '#1E0426', display: 'block', marginTop: '4px' }}>
                  <bdi dir="ltr">{item.val}</bdi>
                </strong>
              </div>
            );
          })}
        </div>
      </section>

      {/* Finovo AI Pre-Inspection Guarantee Banner */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 50px', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1E0426 0%, #3B1149 100%)',
            borderRadius: '24px',
            padding: 'clamp(22px, 4vw, 36px)',
            color: '#FFFFFF',
            boxShadow: '0 12px 36px rgba(30, 4, 38, 0.25)',
            border: '1px solid rgba(250, 184, 38, 0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '30px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(250, 184, 38, 0.15)', border: '1px solid #FAB826', color: '#FAB826', fontSize: '12px', fontWeight: 800, marginBottom: '16px' }}>
              <ShieldCheck size={16} />
              <span>{t('cars.details.aiGuaranteeBadge')}</span>
            </div>
            <h3 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.625rem)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.3 }}>
              {t('cars.details.aiGuaranteeTitle')}
            </h3>
            <p style={{ fontSize: '14px', opacity: 0.88, lineHeight: 1.6, margin: 0 }}>
              {t('cars.details.aiGuaranteeDesc')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FAB826', marginBottom: '8px' }}>
                <Camera size={20} />
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{t('cars.details.aiPickupScan')}</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                {t('cars.details.aiPickupScanDesc')}
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FAB826', marginBottom: '8px' }}>
                <FileCheck size={20} />
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{t('cars.details.aiSettlementPdf')}</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                {t('cars.details.aiSettlementPdfDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Amenities */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 70px', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: 'clamp(22px, 4vw, 40px)', border: '1px solid #ECEAEF', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1E0426', marginBottom: '8px' }}>
            {t('cars.details.features')}
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '28px' }}>
            {t('cars.details.featuresDesc')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
            {[
              { icon: Bluetooth, label: t('cars.details.feat1Title'), desc: t('cars.details.feat1Desc') },
              { icon: Navigation, label: t('cars.details.feat2Title'), desc: t('cars.details.feat2Desc') },
              { icon: Video, label: t('cars.details.feat3Title'), desc: t('cars.details.feat3Desc') },
              { icon: Sun, label: t('cars.details.feat4Title'), desc: t('cars.details.feat4Desc') },
              { icon: Armchair, label: t('cars.details.feat5Title'), desc: t('cars.details.feat5Desc') },
              { icon: CirclePlay, label: t('cars.details.feat6Title'), desc: t('cars.details.feat6Desc') },
              { icon: Wrench, label: t('cars.details.feat7Title'), desc: t('cars.details.feat7Desc') },
              { icon: CalendarX, label: t('cars.details.feat8Title'), desc: t('cars.details.feat8Desc') },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#1E0426',
                      color: '#FAB826',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#1E0426', display: 'block' }}>{f.label}</strong>
                    <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginTop: '2px' }}>{f.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Similar Cars Section (live data from the same category) */}
      {similarCars.length > 0 && (
        <section style={{ maxWidth: '1240px', margin: '0 auto 80px', padding: '0 clamp(16px, 4vw, 24px)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1E0426', marginBottom: '24px' }}>
            {t('cars.details.similarCars')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
            {similarCars.map((car) => {
              const pricing = resolveVehiclePricing(car);
              return (
                <div
                  key={car.id}
                  style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', border: '1px solid #ECEAEF', boxShadow: '0 6px 20px rgba(0,0,0,0.04)' }}
                >
                  <img
                    src={getCarImage(car)}
                    alt={`${car.brand} ${car.model}`}
                    style={{ width: '100%', height: '160px', objectFit: 'contain' }}
                    loading="lazy"
                  />
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#1E0426', margin: '14px 0 4px' }}>
                    {car.brand} {car.model}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                    {[car.category?.name, car.year].filter(Boolean).join(' · ')}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                    <strong style={{ fontSize: '16px', color: '#1E0426' }}>
                      {formatMoney(pricing.dailyRate, pricing.currency)} {t('common.perDay')}
                    </strong>
                    <Link
                      to={`/cars/${car.id}?pickupDate=${pickupDate}&returnDate=${dropoffDate}`}
                      style={{ color: '#1E0426', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
                    >
                      {t('cars.details.viewCar')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <CompareTray />
    </div>
  );
}
