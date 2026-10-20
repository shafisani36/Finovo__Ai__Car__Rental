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
} from 'lucide-react';
import { vehiclesApi } from '../../api/services/vehicles.api';
import { useAuth } from '../../features/auth/context';

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

export function CarDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan>(INSURANCE_PLANS[1]);
  const [pickupCity, setPickupCity] = useState('Riyadh Central');
  const [dropoffCity, setDropoffCity] = useState('Riyadh Central');
  const [pickupDate, setPickupDate] = useState('2026-10-25');
  const [dropoffDate, setDropoffDate] = useState('2026-10-27');
  const [vehicle, setVehicle] = useState<any>(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [wishlistAdded, setWishlistAdded] = useState(false);

  // Gallery items
  const gallery = [
    { label: 'Exterior Front', src: carMain },
    { label: 'Rear Angle', src: thumb18 },
    { label: 'Cabin Interior', src: interiorImg },
    { label: 'Side Profile', src: thumb20 },
    { label: 'Cockpit Controls', src: thumb21 },
  ];

  useEffect(() => {
    let isMounted = true;
    async function fetchCarDetails() {
      if (!id) return;
      try {
        const res = await vehiclesApi.getById(id);
        if (res && res.vehicle && isMounted) {
          setVehicle(res.vehicle);
        }
      } catch (e) {
        // Fallback default vehicle details
      }
    }
    fetchCarDetails();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const carName = vehicle ? `${vehicle.brand || vehicle.make} ${vehicle.model}` : 'Lamborghini 2026';
  const baseRate = vehicle?.dailyRate ? Number(vehicle.dailyRate) : 1000;
  const days = Math.max(1, Math.ceil((new Date(dropoffDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 60 * 60 * 24)) || 2);
  const totalRental = (baseRate + selectedPlan.pricePerDay) * days;

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/customer/dashboard');
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

              <img src={lamboLogo} alt="Brand" style={{ height: '48px', objectFit: 'contain' }} />
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
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                    PICK-UP LOCATION
                  </label>
                  <select
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="Riyadh Central" style={{ color: '#000' }}>Riyadh Central Hub</option>
                    <option value="Dubai Downtown" style={{ color: '#000' }}>Dubai Downtown</option>
                    <option value="Abu Dhabi Airport" style={{ color: '#000' }}>Abu Dhabi Airport</option>
                    <option value="Jeddah Corniche" style={{ color: '#000' }}>Jeddah Corniche</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                    DROP-OFF LOCATION
                  </label>
                  <select
                    value={dropoffCity}
                    onChange={(e) => setDropoffCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="Riyadh Central" style={{ color: '#000' }}>Riyadh Central Hub</option>
                    <option value="Dubai Downtown" style={{ color: '#000' }}>Dubai Downtown</option>
                    <option value="Abu Dhabi Airport" style={{ color: '#000' }}>Abu Dhabi Airport</option>
                    <option value="Jeddah Corniche" style={{ color: '#000' }}>Jeddah Corniche</option>
                  </select>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
          {[
            { icon: Cog, label: 'Engine', val: '5.2L V10' },
            { icon: Gauge, label: 'Power', val: '640 HP' },
            { icon: Fuel, label: 'Fuel Type', val: 'Petrol' },
            { icon: DoorOpen, label: 'Doors', val: '2 Doors' },
            { icon: Briefcase, label: 'Luggage', val: '2 Bags' },
            { icon: Network, label: 'Drivetrain', val: 'AWD' },
            { icon: Gauge, label: 'Top Speed', val: '325 km/h' },
            { icon: Fuel, label: 'Fuel Tank', val: '80 Liters' },
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
