import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Gauge,
  Fuel,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Car,
} from 'lucide-react';
import { vehiclesApi } from '../../../api/services/vehicles.api';
import './CustomerPortal.css';

export function CustomerVehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quote / Trip Estimator
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 4);

  const [pickupDate, setPickupDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(inThreeDays.toISOString().split('T')[0]);

  useEffect(() => {
    let isMounted = true;
    async function fetchVehicle() {
      if (!vehicleId) return;
      try {
        setIsLoading(true);
        const res = await vehiclesApi.getById(vehicleId);
        if (isMounted && res.success && res.vehicle) {
          const v = res.vehicle as any;
          setVehicle({
            id: v.id,
            brand: v.brand?.name || v.brand || 'Luxury',
            model: v.model?.name || v.model || 'Performance',
            year: v.year || 2024,
            categoryName: v.category?.name || v.category || 'Executive Sedan',
            dailyRate: Number(v.pricing?.dailyRate || v.dailyRate || 199),
            depositAmount: Number(v.pricing?.depositAmount || 500),
            seats: v.seats || 5,
            transmission: v.transmission || 'AUTOMATIC',
            fuelType: v.fuelType || 'PETROL',
            engineCapacity: v.engineCapacity || '3.0L Twin-Turbo',
            horsepower: v.horsepower || v.horsePower || 382,
            primaryImageUrl:
              v.media?.find((m: any) => m.isPrimary)?.fileUrl ||
              v.primaryImageUrl ||
              'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
            images: v.media?.map((m: any) => m.fileUrl) || [
              'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
            ],
            features: [
              'AI Pre-Trip & Post-Trip Inspection Protection',
              'Apple CarPlay & Android Auto Wireless',
              'Adaptive Cruise Control & Lane Assist',
              'Full Leather Interior & Ambient Lighting',
              'Unlimited Fast-Pass Toll Coverage Included',
              '24/7 Roadside VIP Concierge Support',
            ],
          });
        } else if (isMounted) {
          setVehicle({
            id: vehicleId,
            brand: 'BMW',
            model: 'M4 Competition Coupe',
            year: 2025,
            categoryName: 'Sports Coupe',
            dailyRate: 299,
            depositAmount: 500,
            seats: 4,
            transmission: 'AUTOMATIC',
            fuelType: 'PETROL',
            engineCapacity: '3.0L M TwinPower Turbo',
            horsepower: 503,
            primaryImageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
            images: [
              'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
            ],
            features: [
              'AI Pre-Trip & Post-Trip Inspection Protection',
              'Apple CarPlay & Android Auto Wireless',
              'Adaptive Cruise Control & Lane Assist',
              'Full Leather Interior & Ambient Lighting',
              'Unlimited Fast-Pass Toll Coverage Included',
              '24/7 Roadside VIP Concierge Support',
            ],
          });
        }
      } catch (err) {
        console.error('Error fetching vehicle details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchVehicle();
    return () => { isMounted = false; };
  }, [vehicleId]);

  const daysCount = Math.max(
    1,
    Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 3600 * 24))
  );

  const subtotal = vehicle ? vehicle.dailyRate * daysCount : 0;
  const estimatedTax = subtotal * 0.1;
  const estimatedTotal = subtotal + estimatedTax;

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '480px' }} />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-empty-state">
          <Car size={36} color="var(--cp-primary)" />
          <h2 className="cp-empty-title">Vehicle Not Found</h2>
          <p className="cp-empty-desc">The requested vehicle is either unavailable or does not exist.</p>
          <Link to="/customer/cars" className="cp-btn-primary">
            Return to Fleet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      {/* Top Navigation */}
      <div>
        <Link
          to="/customer/cars"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cp-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          Back to Available Fleet
        </Link>
      </div>

      <div className="cp-responsive-grid-2col">
        {/* Left Column: Media & Specifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Visual Showcase */}
          <div className="cp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div
              style={{
                height: 'clamp(260px, 42vw, 420px)',
                width: '100%',
                position: 'relative',
                background: 'linear-gradient(135deg, #24052E 0%, #3B094E 55%, #551270 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={vehicle.primaryImageUrl}
                alt={`${vehicle.brand} ${vehicle.model}`}
                style={{ width: '90%', height: '85%', objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.src = '/cars/car-4-tucson.png';
                }}
              />
              <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px', zIndex: 3 }}>
                <span className="cp-badge cp-badge-primary">{vehicle.categoryName}</span>
                <span className="cp-badge cp-badge-accent">Finovo Certified</span>
              </div>
            </div>
            {/* Gallery Thumbnails */}
            {vehicle.images && vehicle.images.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', padding: '16px', background: '#FFFFFF', borderTop: '1px solid var(--cp-border)' }}>
                {vehicle.images.map((img: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      width: '90px',
                      height: '60px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid rgba(30, 5, 40, 0.1)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setVehicle({ ...vehicle, primaryImageUrl: img })}
                  >
                    <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Specifications Grid */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Vehicle Technical Highlights</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Users size={16} color="var(--cp-primary)" />
                  Passenger Capacity
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {vehicle.seats} Adults
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Gauge size={16} color="var(--cp-primary)" />
                  Transmission
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)', textTransform: 'capitalize' }}>
                  {vehicle.transmission?.toLowerCase()}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Fuel size={16} color="var(--cp-primary)" />
                  Fuel Type
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)', textTransform: 'capitalize' }}>
                  {vehicle.fuelType?.toLowerCase()}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F8F6F9', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Sparkles size={16} color="var(--cp-accent)" />
                  Engine Power
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  {vehicle.horsepower} HP
                </div>
              </div>
            </div>
          </div>

          {/* Features and Benefits */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Included Amenities & Guarantees</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {vehicle.features.map((feat: string, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--cp-text-main)' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Quick Booking Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="cp-card" style={{ position: 'sticky', top: '24px' }}>
            <div style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', fontWeight: 600 }}>{vehicle.brand} • {vehicle.year}</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '4px 0 12px 0' }}>
                {vehicle.model}
              </h1>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  ${vehicle.dailyRate}
                </span>
                <span style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem' }}>/ day</span>
              </div>
            </div>

            {/* Trip dates selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label className="cp-label">Pickup Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
                  <input
                    type="date"
                    className="cp-input"
                    style={{ paddingLeft: '38px' }}
                    value={pickupDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="cp-label">Return Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
                  <input
                    type="date"
                    className="cp-input"
                    style={{ paddingLeft: '38px' }}
                    value={returnDate}
                    min={pickupDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Calculation summary */}
            <div
              style={{
                background: '#F8F6F9',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.9rem',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Rental Period:</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{daysCount} {daysCount === 1 ? 'day' : 'days'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Daily Rate (${vehicle.dailyRate} × {daysCount}):</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Estimated Sales Tax (10%):</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>${estimatedTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Refundable Security Deposit:</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>${vehicle.depositAmount.toFixed(2)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--cp-border)',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)' }}>Estimated Total:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() =>
                navigate(
                  `/customer/bookings/new?vehicleId=${vehicle.id}&pickupDate=${pickupDate}&returnDate=${returnDate}`
                )
              }
              className="cp-btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              Proceed to Reserve Vehicle
              <ChevronRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '14px', fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>
              <ShieldCheck size={16} color="#10B981" />
              <span>Instant AI Confirmation • No Hidden Surprises</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
