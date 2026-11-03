import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { vehiclesApi } from '../../../api/services/vehicles.api';
import { branchesApi } from '../../../api/services/branches.api';
import { bookingsApi } from '../../../api/services/bookings.api';
import { customerPortalApi } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerCheckoutPage() {
  const [searchParams] = useSearchParams();

  const vehicleIdParam = searchParams.get('vehicleId');
  const pickupDateParam = searchParams.get('pickupDate');
  const returnDateParam = searchParams.get('returnDate');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Entities
  const [vehicle, setVehicle] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  // Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 4);

  const [pickupDate, setPickupDate] = useState(pickupDateParam || tomorrow.toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState(returnDateParam || inThreeDays.toISOString().split('T')[0]);
  const [returnTime, setReturnTime] = useState('10:00');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [returnBranchId, setReturnBranchId] = useState('');

  // Extras
  const [protectionPlan, setProtectionPlan] = useState<'standard' | 'premium'>('premium');
  const [addGps, setAddGps] = useState(false);
  const [addChildSeat, setAddChildSeat] = useState(false);
  const [addExtraDriver, setAddExtraDriver] = useState(false);

  // Driver details
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const bRes = await branchesApi.list();
        if (isMounted && bRes.success && bRes.branches.length > 0) {
          setBranches(bRes.branches);
          setPickupBranchId(bRes.branches[0].id);
          setReturnBranchId(bRes.branches[0].id);
        }

        const cRes = await customerPortalApi.getOverview();
        if (isMounted && cRes.success && cRes.customer) {
          setCustomer(cRes.customer);
          setDriverName(cRes.customer.fullName || '');
          setDriverEmail(cRes.customer.email || '');
          setDriverPhone(cRes.customer.phone || '');
          setLicenseNumber(cRes.customer.driverLicenseNumber || '');
        }

        if (vehicleIdParam) {
          const vRes = await vehiclesApi.getById(vehicleIdParam);
          if (isMounted && vRes.success && vRes.vehicle) {
            setVehicle(vRes.vehicle);
          }
        }
      } catch (err: any) {
        console.error('Checkout initialization error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [vehicleIdParam]);

  const daysCount = Math.max(
    1,
    Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 3600 * 24))
  );

  const dailyRate = Number(vehicle?.pricing?.dailyRate || vehicle?.dailyRate || 199);
  const rentalSubtotal = dailyRate * daysCount;
  const protectionDaily = protectionPlan === 'premium' ? 25 : 0;
  const protectionTotal = protectionDaily * daysCount;

  const extrasDaily = (addGps ? 10 : 0) + (addChildSeat ? 12 : 0) + (addExtraDriver ? 15 : 0);
  const extrasTotal = extrasDaily * daysCount;

  const preTax = rentalSubtotal + protectionTotal + extrasTotal;
  const taxAmount = preTax * 0.1;
  const totalAmount = preTax + taxAmount;
  const depositAmount = Number(vehicle?.pricing?.depositAmount || 500);

  const handleConfirmReservation = async () => {
    if (!agreedToTerms) {
      setErrorMessage('Please accept the rental terms and inspection protocol to proceed.');
      return;
    }

    if (!customer?.id) {
      setErrorMessage('Customer profile is missing. Please refresh or update your profile.');
      return;
    }

    if (!vehicle?.id && !vehicleIdParam) {
      setErrorMessage('No vehicle selected for booking.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const pickupDateTime = `${pickupDate}T${pickupTime}:00.000Z`;
      const returnDateTime = `${returnDate}T${returnTime}:00.000Z`;

      const payload = {
        customerId: customer.id,
        vehicleId: vehicle?.id || vehicleIdParam,
        pickupBranchId: pickupBranchId || (branches[0]?.id ?? ''),
        returnBranchId: returnBranchId || (branches[0]?.id ?? ''),
        pickupDateTime,
        returnDateTime,
        notes: `Protection: ${protectionPlan.toUpperCase()} | Extras: GPS=${addGps}, ChildSeat=${addChildSeat}, ExtraDriver=${addExtraDriver}`,
      };

      const res = await bookingsApi.create(payload as any);
      if (res.success && res.booking) {
        setBookingSuccess(res.booking);
      } else {
        setErrorMessage('Unable to finalize booking. Please try again.');
      }
    } catch (err: any) {
      console.error('Booking failed:', err);
      setErrorMessage(err.message || 'Failed to complete reservation. Please verify your selected dates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  // Success view
  if (bookingSuccess) {
    return (
      <div className="cp-page-container" style={{ maxWidth: '700px', margin: '40px auto' }}>
        <div className="cp-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <CheckCircle2 size={40} color="#10B981" />
          </div>
          <span className="cp-badge cp-badge-success" style={{ marginBottom: '12px' }}>
            Reservation Confirmed
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '0 0 8px 0' }}>
            You're Ready to Roll!
          </h2>
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.95rem', margin: '0 0 24px 0' }}>
            Booking Reference: <strong>#{bookingSuccess.bookingNumber || bookingSuccess.id}</strong>
          </p>

          <div
            style={{
              background: '#F8F6F9',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '28px',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Pickup Date:</span>
              <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{pickupDate} at {pickupTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Return Date:</span>
              <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{returnDate} at {returnTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Total Amount:</span>
              <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.1rem' }}>${totalAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>AI Inspection Status:</span>
              <span style={{ color: '#10B981', fontWeight: 600 }}>Scheduled at Pickup</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to={`/customer/bookings/${bookingSuccess.id}`} className="cp-btn-primary">
              View Booking Details
              <ChevronRight size={16} />
            </Link>
            <Link to="/customer/dashboard" className="cp-btn-outline">
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      {/* Page Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">Reserve Your Vehicle</h1>
          <p className="cp-page-subtitle">Complete your digital reservation in 4 quick steps.</p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="cp-card" style={{ padding: '16px 20px' }}>
        <div className="cp-stepper">
          {[
            { num: 1, label: 'Trip Dates' },
            { num: 2, label: 'Protection & Extras' },
            { num: 3, label: 'Driver Details' },
            { num: 4, label: 'Review & Confirm' },
          ].map((s) => (
            <button
              type="button"
              key={s.num}
              className="cp-step-item"
              onClick={() => { if (s.num < step) setStep(s.num as any); }}
            >
              <div
                className={`cp-step-circle ${step >= s.num ? 'active' : 'inactive'}`}
              >
                {s.num}
              </div>
              <span
                className={`cp-step-text ${step === s.num ? 'active' : 'inactive'}`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            background: 'var(--cp-danger-bg)',
            color: 'var(--cp-danger)',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="cp-responsive-grid-2col">
        {/* Left Form Area */}
        <div>
          {/* Step 1: Dates & Locations */}
          {step === 1 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>Step 1: Dates & Pickup Location</h2>
              <div className="cp-subgrid-2col" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="cp-label">Pickup Branch</label>
                  <select
                    className="cp-select"
                    value={pickupBranchId}
                    onChange={(e) => setPickupBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="cp-label">Return Branch</label>
                  <select
                    className="cp-select"
                    value={returnBranchId}
                    onChange={(e) => setReturnBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cp-subgrid-2col" style={{ marginBottom: '24px' }}>
                <div>
                  <label className="cp-label">Pickup Date & Time</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      className="cp-input"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                    <input
                      type="time"
                      className="cp-input"
                      style={{ width: '120px' }}
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="cp-label">Return Date & Time</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      className="cp-input"
                      value={returnDate}
                      min={pickupDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                    <input
                      type="time"
                      className="cp-input"
                      style={{ width: '120px' }}
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="cp-btn-primary" onClick={() => setStep(2)}>
                  Continue to Protection & Extras
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Protection & Extras */}
          {step === 2 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>Step 2: Choose Protection & Extras</h2>

              {/* Protection options */}
              <div className="cp-subgrid-2col" style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    border: `2px solid ${protectionPlan === 'standard' ? 'var(--cp-accent)' : 'var(--cp-border)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    background: protectionPlan === 'standard' ? 'rgba(250, 184, 38, 0.04)' : '#FFFFFF',
                  }}
                  onClick={() => setProtectionPlan('standard')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>Standard Coverage</span>
                    <span style={{ fontWeight: 800, color: 'var(--cp-primary)' }}>Included ($0)</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: 0 }}>
                    Basic third-party liability. Deductible applies in case of collision damage.
                  </p>
                </div>

                <div
                  style={{
                    border: `2px solid ${protectionPlan === 'premium' ? 'var(--cp-accent)' : 'var(--cp-border)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    background: protectionPlan === 'premium' ? 'rgba(250, 184, 38, 0.08)' : '#FFFFFF',
                  }}
                  onClick={() => setProtectionPlan('premium')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={18} color="#FAB826" />
                      <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>Full AI Protection</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--cp-primary)' }}>+$25 / day</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: 0 }}>
                    Zero excess deductible, windshield & tire coverage, and automatic AI damage dispute protection.
                  </p>
                </div>
              </div>

              {/* Add-ons */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cp-primary)', marginBottom: '14px' }}>Optional Travel Add-ons</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addGps}
                    onChange={(e) => setAddGps(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--cp-accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>High-Precision GPS Navigation (+$10/day)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>Satellite-linked guidance with live traffic updates</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addChildSeat}
                    onChange={(e) => setAddChildSeat(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--cp-accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>Certified Child Safety Seat (+$12/day)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>ISOFIX certified for infants and toddlers</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addExtraDriver}
                    onChange={(e) => setAddExtraDriver(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--cp-accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>Additional Authorized Driver (+$15/day)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>Includes secondary driver under the insurance policy</div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="cp-btn-outline" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button className="cp-btn-primary" onClick={() => setStep(3)}>
                  Continue to Driver Details
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Driver Details */}
          {step === 3 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>Step 3: Primary Driver Profile</h2>
              <div className="cp-subgrid-2col" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="cp-label">Full Legal Name</label>
                  <input
                    type="text"
                    className="cp-input"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="cp-label">Email Address</label>
                  <input
                    type="email"
                    className="cp-input"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="cp-subgrid-2col" style={{ marginBottom: '24px' }}>
                <div>
                  <label className="cp-label">Phone Number</label>
                  <input
                    type="tel"
                    className="cp-input"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="cp-label">Driver's License Number</label>
                  <input
                    type="text"
                    className="cp-input"
                    value={licenseNumber}
                    placeholder="e.g. DL-9821441"
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="cp-btn-outline" onClick={() => setStep(2)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button className="cp-btn-primary" onClick={() => setStep(4)}>
                  Review Final Breakdown
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Step 4: Review Agreement & Confirm</h2>

              <div
                style={{
                  background: '#F8F6F9',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                  <span style={{ color: 'var(--cp-text-muted)' }}>Driver:</span>
                  <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{driverName} ({driverEmail})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                  <span style={{ color: 'var(--cp-text-muted)' }}>Trip Dates:</span>
                  <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{pickupDate} to {returnDate} ({daysCount} days)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                  <span style={{ color: 'var(--cp-text-muted)' }}>Protection Tier:</span>
                  <span style={{ fontWeight: 700, color: 'var(--cp-primary)', textTransform: 'capitalize' }}>{protectionPlan} Protection</span>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--cp-accent)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', lineHeight: '1.4' }}>
                    I agree to Finovo AI's rental terms, the pre-trip automated computer vision vehicle damage scanning protocol, and confirm that the primary driver holds a valid legal driver's license.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="cp-btn-outline" onClick={() => setStep(3)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  className="cp-btn-primary"
                  disabled={isSubmitting || !agreedToTerms}
                  onClick={handleConfirmReservation}
                  style={{ opacity: isSubmitting || !agreedToTerms ? 0.6 : 1 }}
                >
                  {isSubmitting ? 'Confirming with AI Fleet...' : 'Confirm Reservation'}
                  <CheckCircle2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Summary Sidebar */}
        <div>
          <div className="cp-card" style={{ position: 'sticky', top: '24px' }}>
            <h3 className="cp-card-title" style={{ marginBottom: '16px' }}>Reservation Summary</h3>

            {/* Vehicle preview */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '80px',
                  height: '56px',
                  borderRadius: '8px',
                  background: '#F1EEF4',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={
                    vehicle?.media?.find((m: any) => m.isPrimary)?.fileUrl ||
                    vehicle?.primaryImageUrl ||
                    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80'
                  }
                  alt="Car"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>
                  {vehicle?.brand?.name || vehicle?.brand || 'Luxury'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cp-primary)' }}>
                  {vehicle?.model?.name || vehicle?.model || 'Competition Coupe'}
                </div>
              </div>
            </div>

            {/* Line items */}
            <div
              style={{
                borderTop: '1px solid var(--cp-border)',
                borderBottom: '1px solid var(--cp-border)',
                padding: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.88rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Base Rate (${dailyRate} × {daysCount}d):</span>
                <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${rentalSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Protection ({protectionPlan}):</span>
                <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${protectionTotal.toFixed(2)}</span>
              </div>
              {extrasTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cp-text-muted)' }}>Travel Add-ons:</span>
                  <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${extrasTotal.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Estimated Tax (10%):</span>
                <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${taxAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Totals */}
            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.1rem' }}>Total Cost:</span>
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.4rem' }}>
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                <span>Security Deposit (Refundable):</span>
                <span style={{ fontWeight: 600, color: '#10B981' }}>${depositAmount.toFixed(2)}</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(250, 184, 38, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: '#925805',
              }}
            >
              <Sparkles size={16} color="#FAB826" />
              <span>Earn <strong>{Math.floor(totalAmount * 10)}</strong> loyalty points on this trip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
