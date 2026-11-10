import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Check,
  ArrowRight,
  Heart,
  ShoppingCart,
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
import { useAuth } from '../../features/auth/context';
import { getCarImage } from '../../utils/carImageHelper';
import { parseVehicleNotes } from '../../utils/vehicleNotesHelper';
import { CustomSelect } from '../../components/common/CustomSelect';

// Assets
import carMain from '../../assets/car-detail/car-main.jpg';
import thumb18 from '../../assets/car-detail/thumb-18.jpg';
import thumb20 from '../../assets/car-detail/thumb-20.jpg';
import thumb21 from '../../assets/car-detail/thumb-21.jpg';
import interiorImg from '../../assets/car-detail/interior.jpg';
import lamboLogo from '../../assets/car-detail/lambo-logo.jpg';
import orangeCar from '../../assets/car-detail/orange-car.jpg';
import bmwImg from '../../assets/car-detail/bmw.png';

interface InsurancePlan {
  id: string;
  name: string;
  pricePerDay: number;
  description: string;
}

const INSURANCE_PLANS: InsurancePlan[] = [
  { id: 'basic', name: 'Basic', pricePerDay: 0, description: 'Third-Party Liability' },
  { id: 'standard', name: 'Standard', pricePerDay: 50, description: 'Collision Damage Waiver (CDW)' },
  { id: 'premium', name: 'Premium', pricePerDay: 100, description: 'Zero Deductible & Full Shield' },
];

const CITY_OPTIONS = [
  { value: 'Riyadh Central', label: 'Riyadh Central Hub', sublabel: 'King Fahd Road' },
  { value: 'Dubai Downtown', label: 'Dubai Downtown', sublabel: 'Financial Centre' },
  { value: 'Abu Dhabi Airport', label: 'Abu Dhabi Airport', sublabel: 'Terminal 1 VIP' },
  { value: 'Jeddah Corniche', label: 'Jeddah Corniche', sublabel: 'Red Sea Hub' },
];

export function CarDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Dynamic Dates (Tomorrow to +3 days)
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const inThreeDaysStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  };

  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan>(INSURANCE_PLANS[1]);
  const [pickupCity, setPickupCity] = useState('Riyadh Central');
  const [dropoffCity, setDropoffCity] = useState('Riyadh Central');
  const [pickupDate, setPickupDate] = useState(tomorrowStr);
  const [dropoffDate, setDropoffDate] = useState(inThreeDaysStr);
  const [vehicle, setVehicle] = useState<any>(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [wishlistAdded, setWishlistAdded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchCarDetails() {
      if (!id) return;
      try {
        const res = await vehiclesApi.getById(id);
        if (res && res.vehicle && isMounted) {
          setVehicle(res.vehicle);
          return;
        }
      } catch (e) {
        // Fallback below
      }

      // Fallback matching mock/catalog IDs
      if (isMounted) {
        if (id.includes('hurac') || id === 'car-1') {
          setVehicle({
            id: 'car-1',
            brand: 'Lamborghini',
            model: 'Huracán Evo Spider',
            year: 2026,
            dailyRate: 1000,
            engineCapacity: '5.2L V10 Naturally Aspirated',
            horsepower: 640,
            fuelType: 'Petrol',
            doors: 2,
            seats: 2,
            luggageCapacity: 2,
            drivetrain: 'AWD All-Wheel Drive',
            topSpeed: 325,
            transmission: '7-Speed Dual Clutch',
            primaryImageUrl: carMain,
          });
        } else if (id.includes('m4') || id === 'car-bmw-m4') {
          setVehicle({
            id,
            brand: 'BMW',
            model: 'M4 Competition Coupe',
            year: 2026,
            dailyRate: 550,
            engineCapacity: '3.0L M TwinPower Turbo',
            horsepower: 503,
            fuelType: 'Petrol',
            doors: 2,
            seats: 4,
            luggageCapacity: 3,
            drivetrain: 'M xDrive AWD',
            topSpeed: 290,
            transmission: '8-Speed M Steptronic',
            primaryImageUrl: orangeCar,
          });
        } else {
          setVehicle({
            id,
            brand: 'BMW',
            model: '520 i M-Sport Executive',
            year: 2026,
            dailyRate: 480,
            engineCapacity: '2.0L TwinPower Turbo',
            horsepower: 255,
            fuelType: 'Petrol',
            doors: 4,
            seats: 5,
            luggageCapacity: 4,
            drivetrain: 'Rear-Wheel Drive (RWD)',
            topSpeed: 250,
            transmission: '8-Speed Steptronic Automatic',
            primaryImageUrl: bmwImg,
          });
        }
      }
    }
    fetchCarDetails();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Dynamic gallery items
  const vehicleMainImg = getCarImage(vehicle) || carMain;
  const gallery = [
    { label: 'Exterior Front', src: vehicleMainImg },
    { label: 'Rear Angle', src: thumb18 },
    { label: 'Cabin Interior', src: interiorImg },
    { label: 'Side Profile', src: thumb20 },
    { label: 'Cockpit Controls', src: thumb21 },
  ];

  const brandName = vehicle?.brand?.name || vehicle?.brand || 'Luxury';
  const modelName = vehicle?.model?.name || vehicle?.model || 'Performance';
  const carName = vehicle ? `${brandName} ${modelName}` : 'Luxury Vehicle';
  const baseRate = vehicle?.dailyRate ? Number(vehicle.dailyRate) : 500;
  const days = Math.max(1, Math.ceil((new Date(dropoffDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 60 * 60 * 24)) || 2);
  const totalRental = (baseRate + selectedPlan.pricePerDay) * days;

  // Dynamic Specs with Pre-Trained Engine & Extra Metadata
  const extraSpecs = (() => {
    if (!vehicle?.notes) return null;
    return parseVehicleNotes(vehicle.notes).extraSpecs;
  })();

  const pretrainedSpec = lookupPretrainedVehicle(brandName, modelName);

  const isSports =
    vehicle?.category?.slug === 'sports' ||
    vehicle?.categoryName?.toLowerCase().includes('sport') ||
    modelName.toLowerCase().includes('hurac') ||
    modelName.toLowerCase().includes('m4');

  const engineVal = vehicle?.engineCapacity || pretrainedSpec?.engineSize || (isSports ? '5.2L V10 Naturally Aspirated' : '2.0L TwinPower Turbo');
  const powerVal = vehicle?.horsepower || vehicle?.horsePower
    ? `${vehicle.horsepower || vehicle.horsePower} HP`
    : pretrainedSpec
      ? `${pretrainedSpec.horsePower} HP`
      : (isSports ? '640 HP' : '255 HP');
  const accelVal = extraSpecs?.acceleration0to100
    ? `${extraSpecs.acceleration0to100}s`
    : pretrainedSpec
      ? `${pretrainedSpec.acceleration0to100}s`
      : (isSports ? '3.2s' : '5.4s');
  const torqueVal = extraSpecs?.torqueNm
    ? `${extraSpecs.torqueNm} Nm`
    : pretrainedSpec
      ? `${pretrainedSpec.torqueNm} Nm`
      : (isSports ? '600 Nm' : '400 Nm');
  const fuelEconomyVal = extraSpecs?.fuelEconomy || (pretrainedSpec ? `${pretrainedSpec.fuelEconomyL100km} L/100km` : '9.8 L/100km');
  const fuelVal = vehicle?.fuelType || vehicle?.fuel || pretrainedSpec?.fuelType || 'Petrol (98 Octane)';
  const doorsVal = vehicle?.doors ? `${vehicle.doors} Doors` : (vehicle?.seats && vehicle.seats <= 2 ? '2 Doors' : '4 Doors');
  const luggageVal = extraSpecs?.luggageCapacityBags
    ? `${extraSpecs.luggageCapacityBags} Large, ${extraSpecs?.cabinBagsCapacity || 2} Cabin`
    : pretrainedSpec
      ? `${pretrainedSpec.luggageCapacityBags} Large, ${pretrainedSpec.cabinBagsCapacity} Cabin`
      : (vehicle?.luggageCapacity ? `${vehicle.luggageCapacity} Bags` : '3 Bags');
  const drivetrainVal = vehicle?.drivetrain || pretrainedSpec?.drivetrain || (isSports ? 'Performance AWD' : 'RWD / xDrive');
  const speedVal = extraSpecs?.topSpeed
    ? `${extraSpecs.topSpeed} km/h`
    : vehicle?.topSpeed
      ? `${vehicle.topSpeed} km/h`
      : pretrainedSpec
        ? `${pretrainedSpec.topSpeedKmH} km/h`
        : (isSports ? '325 km/h' : '250 km/h');
  const transVal = vehicle?.transmission || pretrainedSpec?.transmission || 'Automatic (8-Speed)';

  const handleBookNow = () => {
    const bookingQuery = new URLSearchParams({
      vehicleId: id || vehicle?.id || '',
      pickupDate: pickupDate,
      returnDate: dropoffDate,
      pickupCity: pickupCity,
      dropoffCity: dropoffCity,
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
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '40px' }}>
          {/* Left Column: Photos, Badges, Name */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', opacity: 0.8, marginBottom: '12px' }}>
              <Link to="/" style={{ color: '#FAB826', textDecoration: 'none' }}>Home</Link>
              <span>/</span>
              <Link to="/cars" style={{ color: '#FAB826', textDecoration: 'none' }}>Cars</Link>
              <span>/</span>
              <span>{carName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '38px', fontWeight: 800, margin: '0 0 6px' }}>{carName}</h1>
                <p style={{ fontSize: '15px', opacity: 0.85, margin: 0 }}>Unleash extraordinary performance and sheer road dominance.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', color: '#FAB826' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={15} fill="#FAB826" />
                    ))}
                  </div>
                  <strong style={{ fontSize: '14px' }}>4.8</strong>
                  <span style={{ fontSize: '12px', opacity: 0.75 }}>(120+ verified bookings)</span>
                </div>
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
              <span style={{ fontSize: '36px', fontWeight: 800, color: '#FAB826' }}>
                SAR {baseRate.toLocaleString()}
              </span>
              <span style={{ fontSize: '15px', opacity: 0.8, marginLeft: '8px' }}>/ day</span>
            </div>

            {/* Main Active Image with 360 viewer */}
            <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', height: '380px', backgroundColor: '#000000' }}>
              <img
                src={gallery[activeThumb].src}
                alt={gallery[activeThumb].label}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
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
                <span>360° Inspection Verified</span>
              </div>
            </div>

            {/* Thumbnails row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '14px' }}>
              {gallery.map((t, idx) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setActiveThumb(idx)}
                  style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: activeThumb === idx ? '2px solid #FAB826' : '2px solid transparent',
                    padding: 0,
                    background: 'none',
                    cursor: 'pointer',
                    height: '64px',
                  }}
                >
                  <img src={t.src} alt={t.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Booking Card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', color: '#FFFFFF' }}>
                Instant Reservation
              </h2>
              <p style={{ fontSize: '13px', opacity: 0.8, margin: '0 0 20px' }}>
                Select your schedule and preferred insurance tier.
              </p>

              {/* Insurance Plans Pill Selection */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#FAB826', marginBottom: '8px' }}>
                CHOOSE INSURANCE COVERAGE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {INSURANCE_PLANS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
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
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '13px', color: isSelected ? '#FAB826' : '#FFFFFF' }}>{plan.name}</strong>
                        {isSelected && <Check size={14} color="#FAB826" />}
                      </div>
                      <span style={{ fontSize: '11px', display: 'block', marginTop: '2px', opacity: 0.85 }}>
                        +{plan.pricePerDay === 0 ? 'SAR 0' : `SAR ${plan.pricePerDay}`}/day
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Locations & Dates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '6px' }}>
                    PICK-UP LOCATION
                  </label>
                  <CustomSelect
                    value={pickupCity}
                    onChange={(val) => setPickupCity(String(val))}
                    options={CITY_OPTIONS}
                    variant="dark"
                    size="sm"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '6px' }}>
                    DROP-OFF LOCATION
                  </label>
                  <CustomSelect
                    value={dropoffCity}
                    onChange={(val) => setDropoffCity(String(val))}
                    options={CITY_OPTIONS}
                    variant="dark"
                    size="sm"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                    PICK-UP DATE
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
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
                    DROP-OFF DATE
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
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>Estimated Duration</p>
                  <strong style={{ fontSize: '16px', color: '#FAB826' }}>{days} Days</strong>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>Total (inc. tax & insurance)</p>
                  <strong style={{ fontSize: '20px', color: '#FAB826', fontWeight: 800 }}>
                    SAR {totalRental.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBookNow}
                style={{
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
                <span>Book This Car</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCartAdded(true)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: cartAdded ? '#10B981' : 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <ShoppingCart size={16} />
                  <span>{cartAdded ? 'Added to Cart' : 'Add to Cart'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWishlistAdded(!wishlistAdded)}
                  aria-label="Save to Wishlist"
                  style={{
                    width: '46px',
                    borderRadius: '12px',
                    backgroundColor: wishlistAdded ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.12)',
                    color: wishlistAdded ? '#EF4444' : '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={18} fill={wishlistAdded ? '#EF4444' : 'none'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications Grid */}
      <section style={{ maxWidth: '1240px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase' }}>
            PRECISION IN EVERY DETAIL
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1E0426', margin: '4px 0 0' }}>
            Car Specifications
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '6px 0 0' }}>
            Technical highlights and engineering capabilities
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {[
            { icon: Cog, label: 'Powertrain', val: engineVal },
            { icon: Gauge, label: 'Horsepower', val: powerVal },
            { icon: Zap, label: '0-100 km/h', val: accelVal },
            { icon: Gauge, label: 'Top Speed', val: speedVal },
            { icon: Activity, label: 'Torque', val: torqueVal },
            { icon: Fuel, label: 'Fuel & Economy', val: `${fuelVal} (${fuelEconomyVal})` },
            { icon: Briefcase, label: 'Luggage Bags', val: luggageVal },
            { icon: Network, label: 'Drivetrain', val: drivetrainVal },
            { icon: DoorOpen, label: 'Doors & Seats', val: doorsVal },
            { icon: Fuel, label: 'Transmission', val: transVal },
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
                  {item.val}
                </strong>
              </div>
            );
          })}
        </div>
      </section>

      {/* Finovo AI Pre-Inspection Guarantee Banner */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 50px', padding: '0 24px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1E0426 0%, #3B1149 100%)',
            borderRadius: '24px',
            padding: '36px',
            color: '#FFFFFF',
            boxShadow: '0 12px 36px rgba(30, 4, 38, 0.25)',
            border: '1px solid rgba(250, 184, 38, 0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(250, 184, 38, 0.15)', border: '1px solid #FAB826', color: '#FAB826', fontSize: '12px', fontWeight: 800, marginBottom: '16px' }}>
              <ShieldCheck size={16} />
              <span>CERTIFIED AI VEHICLE INSPECTION GUARANTEE</span>
            </div>
            <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.3 }}>
              Zero-Dispute Handover with Computer Vision Verification
            </h3>
            <p style={{ fontSize: '14px', opacity: 0.88, lineHeight: 1.6, margin: 0 }}>
              Never worry about false damage claims. At pickup confirmation, our pre-trained AI vision model scans the vehicle across 5 angles, auto-detects scratches, dents, and paint color, and generates a digitally stamped <strong>Pickup Inspection Certificate (PDF)</strong>.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FAB826', marginBottom: '8px' }}>
                <Camera size={20} />
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>AI Pickup Scan</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                Baseline photo capture maps any pre-existing blemishes before handover.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FAB826', marginBottom: '8px' }}>
                <FileCheck size={20} />
                <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>Settlement PDF</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                At return, AI automates comparison. 100% deposit released if identical.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Amenities */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '40px', border: '1px solid #ECEAEF', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1E0426', marginBottom: '8px' }}>
            Features & Amenities
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '28px' }}>
            Equipped with modern luxuries, advanced safety suites, and entertainment connectivity.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              { icon: Bluetooth, label: 'Bluetooth Audio Streaming', desc: 'Crisp wireless audio for calls & playlists' },
              { icon: Navigation, label: 'GPS Satellite Navigation', desc: 'Real-time navigation with traffic assistance' },
              { icon: Video, label: '360° Surround Camera', desc: 'Active parking guide and blind spot monitor' },
              { icon: Sun, label: 'Panoramic Glass Sunroof', desc: 'Enjoy sunlight and ambient starry night drives' },
              { icon: Armchair, label: 'Heated Leather Seats', desc: 'Electric 14-way adjustable ergonomic seating' },
              { icon: CirclePlay, label: 'Apple CarPlay & Android Auto', desc: 'Instant smartphone screen replication' },
              { icon: Wrench, label: '24/7 Roadside Assistance', desc: 'Dedicated mechanical dispatch across cities' },
              { icon: CalendarX, label: 'Free Cancellation Guarantee', desc: 'Cancel with full refund up to 24hr prior' },
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

      {/* Similar Cars Section */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 80px', padding: '0 24px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1E0426', marginBottom: '24px' }}>
          Similar Vehicles You Might Like
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Card 1 */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', border: '1px solid #ECEAEF', boxShadow: '0 6px 20px rgba(0,0,0,0.04)' }}>
            <img src={orangeCar} alt="McLaren 720S" style={{ width: '100%', height: '160px', objectFit: 'contain' }} />
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#1E0426', margin: '14px 0 4px' }}>McLaren 720S Spider</h4>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Sports · 2026 · Automatic</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
              <strong style={{ fontSize: '16px', color: '#1E0426' }}>SAR 1,150 / day</strong>
              <Link to="/cars" style={{ color: '#1E0426', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                View Car →
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', border: '1px solid #ECEAEF', boxShadow: '0 6px 20px rgba(0,0,0,0.04)' }}>
            <img src={bmwImg} alt="BMW M8 Competition" style={{ width: '100%', height: '160px', objectFit: 'contain' }} />
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#1E0426', margin: '14px 0 4px' }}>BMW M8 Competition</h4>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Coupe · 2026 · Automatic</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
              <strong style={{ fontSize: '16px', color: '#1E0426' }}>SAR 850 / day</strong>
              <Link to="/cars" style={{ color: '#1E0426', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                View Car →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
