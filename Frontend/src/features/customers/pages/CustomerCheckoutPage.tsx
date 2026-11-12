import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Check,
} from 'lucide-react';
import { vehiclesApi } from '../../../api/services/vehicles.api';
import { branchesApi } from '../../../api/services/branches.api';
import { bookingsApi } from '../../../api/services/bookings.api';
import { customerPortalApi } from '../api/customerPortalApi';
import { useBookingQuote, toLocalIso } from '../../../hooks/useBookingQuote';
import type { BookingAddonCode } from '../../bookings/api/bookingApi';
import { StripePaymentForm } from '../../payments/components/StripePaymentForm';
import type { StripeConfirmResponse } from '../../../api/services/payments.api';
import { useAuth } from '../../auth/context';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { formatMoney, getCarImage } from '../../../utils/carImageHelper';
import './CustomerPortal.css';

export function CustomerCheckoutPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const vehicleIdParam = searchParams.get('vehicleId');
  const pickupDateParam = searchParams.get('pickupDate');
  const returnDateParam = searchParams.get('returnDate');
  const pickupBranchParam = searchParams.get('pickupBranchId');
  const returnBranchParam = searchParams.get('returnBranchId');
  const planParam = searchParams.get('plan');

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<any | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [paymentResult, setPaymentResult] = useState<StripeConfirmResponse | null>(null);

  // Entities
  const [vehicle, setVehicle] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  // Form State (local calendar dates)
  const localDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const isIsoDate = (v: string | null) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

  const [pickupDate, setPickupDate] = useState(isIsoDate(pickupDateParam) ? pickupDateParam! : localDate(1));
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState(isIsoDate(returnDateParam) ? returnDateParam! : localDate(4));
  const [returnTime, setReturnTime] = useState('10:00');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [returnBranchId, setReturnBranchId] = useState('');

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.city})`,
    sublabel: b.city,
  }));

  // Extras (priced by the backend add-on catalog)
  const [protectionPlan, setProtectionPlan] = useState<'none' | 'standard' | 'premium'>(
    planParam === 'basic' ? 'none' : planParam === 'standard' ? 'standard' : 'premium'
  );
  const [addGps, setAddGps] = useState(false);
  const [addChildSeat, setAddChildSeat] = useState(false);
  const [addExtraDriver, setAddExtraDriver] = useState(false);

  // Driver details
  const [driverName, setDriverName] = useState(user?.fullName || '');
  const [driverEmail, setDriverEmail] = useState(user?.email || '');
  const [driverPhone, setDriverPhone] = useState(user?.phone || '');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (!vehicleIdParam) {
          throw new Error('No vehicle selected. Please choose a car first.');
        }

        const [bRes, vRes] = await Promise.all([branchesApi.list(), vehiclesApi.getById(vehicleIdParam)]);
        if (!isMounted) return;

        const loadedBranches = (bRes.branches || []).filter((b: any) => b.isActive !== false);
        if (loadedBranches.length === 0) {
          throw new Error('No rental branches are configured. Please contact support.');
        }
        const vehicleRecord = (vRes as any)?.vehicle;
        if (!vehicleRecord) {
          throw new Error('The selected vehicle could not be found.');
        }

        const hasBranch = (id: string | null) => Boolean(id && loadedBranches.some((b: any) => b.id === id));
        setBranches(loadedBranches);
        setPickupBranchId(hasBranch(pickupBranchParam) ? pickupBranchParam! : loadedBranches[0].id);
        setReturnBranchId(hasBranch(returnBranchParam) ? returnBranchParam! : loadedBranches[0].id);
        setVehicle(vehicleRecord);

        // Customer profile only pre-fills the driver form; it is never required to show the page
        try {
          const cRes = await customerPortalApi.getOverview();
          if (isMounted && cRes.success && cRes.customer) {
            if (cRes.customer.fullName) setDriverName(cRes.customer.fullName);
            if (cRes.customer.email) setDriverEmail(cRes.customer.email);
            if (cRes.customer.phone) setDriverPhone(cRes.customer.phone);
            if (cRes.customer.driverLicenseNumber) setLicenseNumber(cRes.customer.driverLicenseNumber);
          }
        } catch {
          // Profile pre-fill is optional
        }
      } catch (err: any) {
        if (isMounted) setLoadError(err?.message || 'Failed to load checkout.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [vehicleIdParam, pickupBranchParam, returnBranchParam]);

  // Server-authoritative quote & availability
  const selectedAddons: BookingAddonCode[] = [
    ...(protectionPlan === 'standard' ? (['PROTECTION_STANDARD'] as const) : []),
    ...(protectionPlan === 'premium' ? (['PROTECTION_PREMIUM'] as const) : []),
    ...(addGps ? (['GPS'] as const) : []),
    ...(addChildSeat ? (['CHILD_SEAT'] as const) : []),
    ...(addExtraDriver ? (['EXTRA_DRIVER'] as const) : []),
  ];
  const pickupIso = toLocalIso(pickupDate, pickupTime);
  const returnIso = toLocalIso(returnDate, returnTime);
  const {
    quote,
    availability,
    addonCatalog,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useBookingQuote(vehicle?.id, pickupIso, returnIso, selectedAddons);
  const currency = quote?.currency || vehicle?.currency || '';
  const addonPrice = (code: BookingAddonCode) => {
    const addon = addonCatalog.find((a) => a.code === code);
    return addon ? formatMoney(addon.unitPrice, currency) : '…';
  };
  const isUnavailable = availability ? !availability.available : false;
  const canContinueTrip = Boolean(quote) && !isUnavailable && !isQuoteLoading && Boolean(pickupBranchId);

  // Step 4 -> 5: create the booking (held as PENDING until Stripe confirms the payment)
  const handleProceedToPayment = async () => {
    if (pendingBooking) {
      setStep(5);
      return;
    }
    if (!vehicle || !pickupIso || !returnIso) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await bookingsApi.create({
        vehicleId: vehicle.id,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: pickupIso,
        returnDateTime: returnIso,
        addons: selectedAddons,
        notes: JSON.stringify({
          driver: { name: driverName, email: driverEmail, phone: driverPhone, licenseNumber },
        }),
      });
      if (!res.success || !res.booking) {
        throw new Error('The booking could not be created. Please try again.');
      }
      setPendingBooking(res.booking);
      setStep(5);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reserve this car. Please verify your selected dates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (result: StripeConfirmResponse) => {
    setPaymentResult(result);
    setBookingSuccess((result.booking as any) || pendingBooking);
  };

  const validDriverDetails =
    driverName.trim().length > 1 && /\S+@\S+\.\S+/.test(driverEmail) && driverPhone.trim().length >= 6;

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  if (loadError || !vehicle) {
    return (
      <div className="cp-page-container" style={{ maxWidth: '640px', margin: '40px auto' }}>
        <div className="cp-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <AlertCircle size={40} color="var(--cp-danger)" style={{ margin: '0 auto 12px' }} />
          <h2 className="cp-card-title">{loadError || 'The selected vehicle could not be found.'}</h2>
          <Link to="/cars" className="cp-btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
            Browse Cars
          </Link>
        </div>
      </div>
    );
  }

  // Reservation Success Screen with Certified Inspection Certificate PDF
  if (bookingSuccess) {
    return (
      <div className="cp-page-container" style={{ maxWidth: '780px', margin: '40px auto' }}>
        <div className="cp-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              background: 'rgba(16, 185, 129, 0.12)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              border: '2px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={44} color="#10B981" />
          </div>

          <span
            className="cp-badge cp-badge-success"
            style={{ marginBottom: '12px', fontSize: '13px', padding: '6px 16px' }}
          >
            ● Reservation Confirmed & Paid
          </span>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--cp-primary)', margin: '0 0 8px 0' }}>
            Reservation Confirmed!
          </h2>

          <p style={{ color: 'var(--cp-text-muted)', fontSize: '1rem', margin: '0 0 24px 0' }}>
            Booking Reference: <strong>#{bookingSuccess.bookingNumber || bookingSuccess.id}</strong>
          </p>

          {/* Certificate & Specs Summary Box */}
          <div
            style={{
              background: '#FAF7FA',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '28px',
              border: '1px solid var(--cp-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Reserved Vehicle:</span>
              <strong style={{ color: 'var(--cp-primary)' }}>
                {vehicle?.brand} {vehicle?.model} ({vehicle?.year})
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Pickup Schedule:</span>
              <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>
                {pickupDate} at {pickupTime}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Return Schedule:</span>
              <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>
                {returnDate} at {returnTime}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Payment:</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>
                ● Paid via Stripe
                {paymentResult?.payment.cardBrand
                  ? ` (${paymentResult.payment.cardBrand.toUpperCase()} •••• ${paymentResult.payment.cardNumberLast4})`
                  : ''}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--cp-text-muted)' }}>Total Amount Charged:</span>
              <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.25rem' }}>
                {paymentResult ? formatMoney(paymentResult.payment.amount, paymentResult.payment.currency, 2) : '—'}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={`/customer/bookings/${bookingSuccess.id}`}
              className="cp-btn-secondary"
            >
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
          <p className="cp-page-subtitle">
            Industry standard booking with Stripe payments and pre-trained AI damage scanning.
          </p>
        </div>
      </div>

      {/* 5-Step Progress Ribbon */}
      <div className="cp-card" style={{ padding: '16px 20px' }}>
        <div className="cp-stepper">
          {[
            { num: 1, label: 'Trip Dates' },
            { num: 2, label: 'Protection & Extras' },
            { num: 3, label: 'Driver Details' },
            { num: 4, label: 'Terms & Inspection' },
            { num: 5, label: 'Secure Payment' },
          ].map((s) => (
            <button
              type="button"
              key={s.num}
              className="cp-step-item"
              onClick={() => {
                // Trip details are locked once the booking is held for payment
                if (s.num < step && !pendingBooking) setStep(s.num as any);
              }}
            >
              <div className={`cp-step-circle ${step >= s.num ? 'active' : 'inactive'}`}>
                {step > s.num ? <Check size={14} strokeWidth={3} /> : s.num}
              </div>
              <span className={`cp-step-text ${step === s.num ? 'active' : 'inactive'}`}>
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
        {/* Left Interactive Form Area */}
        <div>
          {/* Step 1: Dates & Locations */}
          {step === 1 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>
                Step 1: Dates & Pickup Location
              </h2>
              <div className="cp-subgrid-2col" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="cp-label">Pickup Branch</label>
                  <CustomSelect
                    value={pickupBranchId}
                    onChange={(val) => setPickupBranchId(String(val))}
                    options={branchOptions}
                    placeholder="Select Pickup Branch"
                    size="md"
                  />
                </div>
                <div>
                  <label className="cp-label">Return Branch</label>
                  <CustomSelect
                    value={returnBranchId}
                    onChange={(val) => setReturnBranchId(String(val))}
                    options={branchOptions}
                    placeholder="Select Return Branch"
                    size="md"
                  />
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
                      min={localDate(0)}
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

              {isUnavailable && (
                <div role="alert" className="cp-alert-unavailable" style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: 'var(--cp-danger-bg)', color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {availability?.conflictReason || `This car is not available from ${pickupDate} to ${returnDate}.`}
                </div>
              )}
              {quoteError && !isUnavailable && (
                <div role="alert" style={{ marginBottom: '16px', color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {quoteError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="cp-btn-primary" onClick={() => setStep(2)} disabled={!canContinueTrip} style={{ opacity: canContinueTrip ? 1 : 0.6 }}>
                  Continue to Protection & Extras
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Protection & Extras */}
          {step === 2 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>
                Step 2: Protection Tier & Add-ons
              </h2>

              <div className="cp-subgrid-2col" style={{ marginBottom: '24px' }}>
                <div
                  onClick={() => setProtectionPlan('standard')}
                  style={{
                    border:
                      protectionPlan === 'standard'
                        ? '2px solid var(--cp-accent)'
                        : '1px solid var(--cp-border)',
                    borderRadius: '14px',
                    padding: '18px',
                    cursor: 'pointer',
                    backgroundColor:
                      protectionPlan === 'standard' ? 'rgba(250, 184, 38, 0.08)' : '#FAF7FA',
                    transition: 'var(--cp-transition)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--cp-primary)' }}>Standard CDW</strong>
                    <span className="cp-badge cp-badge-accent">+{addonPrice('PROTECTION_STANDARD')}/day</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', margin: '8px 0 0 0', lineHeight: 1.45 }}>
                    Collision Damage Waiver with reduced deductible. Third-party liability included.
                  </p>
                </div>

                <div
                  onClick={() => setProtectionPlan('premium')}
                  style={{
                    border:
                      protectionPlan === 'premium'
                        ? '2px solid var(--cp-accent)'
                        : '1px solid var(--cp-border)',
                    borderRadius: '14px',
                    padding: '18px',
                    cursor: 'pointer',
                    backgroundColor:
                      protectionPlan === 'premium' ? 'rgba(250, 184, 38, 0.08)' : '#FAF7FA',
                    transition: 'var(--cp-transition)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--cp-primary)' }}>
                      Full Shield Premium
                    </strong>
                    <span className="cp-badge cp-badge-accent">+{addonPrice('PROTECTION_PREMIUM')}/day</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', margin: '8px 0 0 0', lineHeight: 1.45 }}>
                    Zero deductible. Complete windshield, tyre, wheel, and undercarriage coverage.
                  </p>
                </div>
              </div>

              {/* Extras */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addGps}
                    onChange={(e) => setAddGps(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--cp-accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>Satellite GPS Navigation (+{addonPrice('GPS')}/day)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>Live traffic routing and offline maps</div>
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
                    <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>ISOFIX Child Safety Seat (+{addonPrice('CHILD_SEAT')}/day)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>Certified for infants and toddlers</div>
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
                    <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>Additional Authorized Driver (+{addonPrice('EXTRA_DRIVER')}/day)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>Covers secondary driver on insurance policy</div>
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
              <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>
                Step 3: Primary Driver Profile
              </h2>
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
                <button
                  className="cp-btn-primary"
                  onClick={() => setStep(4)}
                  disabled={!validDriverDetails}
                  style={{ opacity: validDriverDetails ? 1 : 0.6 }}
                >
                  Continue to Rental Terms
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review rental terms and the AI inspection policy */}
          {step === 4 && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>
                Step 4: Rental Terms & Vehicle Inspection
              </h2>
              <ul style={{ margin: '0 0 20px', paddingInlineStart: '20px', color: 'var(--cp-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <li>At pickup, our staff photograph the car from all sides and an AI inspection records its exact condition (condition % and every existing scratch or dent). You receive this report.</li>
                <li>At return, the car is photographed again and compared side by side with the pickup report.</li>
                <li>You are only charged for new damage that was not in the pickup report, using our published repair cost table. Existing damage is never charged.</li>
                <li>The security deposit is refunded after the return, minus any new-damage, fuel or late-return charges.</li>
              </ul>

              {/* Agreement checkbox */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--cp-accent)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', lineHeight: '1.4' }}>
                    I agree to the rental terms and the pickup / return AI inspection policy described above.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="cp-btn-outline" onClick={() => setStep(3)} disabled={Boolean(pendingBooking)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  className="cp-btn-primary"
                  disabled={isSubmitting || !agreedToTerms || !canContinueTrip}
                  onClick={handleProceedToPayment}
                  style={{ opacity: isSubmitting || !agreedToTerms || !canContinueTrip ? 0.6 : 1 }}
                >
                  {isSubmitting ? 'Reserving your car...' : 'Continue to Secure Payment'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Stripe payment (booking is held for a limited time until paid) */}
          {step === 5 && pendingBooking && (
            <div className="cp-card">
              <h2 className="cp-card-title" style={{ marginBottom: '6px' }}>
                Step 5: Secure Payment
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--cp-text-muted)' }}>
                Booking #{pendingBooking.bookingNumber} is held for you for 30 minutes. Complete the payment to confirm it.
              </p>
              <StripePaymentForm
                bookingId={pendingBooking.id}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setStep(4)}
              />
            </div>
          )}
        </div>

        {/* Right Summary Sidebar */}
        <div>
          <div className="cp-card" style={{ position: 'sticky', top: '24px' }}>
            <h3 className="cp-card-title" style={{ marginBottom: '16px' }}>
              Reservation Summary
            </h3>

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
                  src={getCarImage(vehicle)}
                  alt={`${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim() || 'Vehicle'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#24052E' }}
                />
              </div>
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--cp-primary)' }}>
                  {vehicle?.brand} {vehicle?.model}
                </strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>
                  {[vehicle?.year, vehicle?.color].filter(Boolean).join(' • ')}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
              {isQuoteLoading && !quote && <div style={{ color: 'var(--cp-text-muted)' }}>Calculating price…</div>}
              {!isQuoteLoading && !quote && (
                <div style={{ color: 'var(--cp-text-muted)' }}>Select valid dates to see the price.</div>
              )}
              {quote && (
                <>
                  {(quote.lineItems || [])
                    .filter((item) => item.lineType !== 'deposit')
                    .map((item, idx) => (
                      <div key={`${item.lineType}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--cp-text-muted)' }}>{item.description}</span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatMoney(item.amount, currency, 2)}</span>
                      </div>
                    ))}

                  <div
                    style={{
                      borderTop: '1px solid var(--cp-border)',
                      paddingTop: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--cp-primary)',
                    }}
                  >
                    <span>Rental Total:</span>
                    <span>{formatMoney(quote.totalAmount, currency, 2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
                    <span>Security Deposit (Refundable):</span>
                    <span>{formatMoney(quote.depositAmount, currency, 2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--cp-primary)' }}>
                    <span>Due Today:</span>
                    <span>{formatMoney(quote.grandTotal ?? quote.totalAmount + quote.depositAmount, currency, 2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* AI Guarantee Trust Badge */}
            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(250, 184, 38, 0.1)',
                border: '1px solid rgba(250, 184, 38, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: '#B45309',
              }}
            >
              <ShieldCheck size={18} />
              <span>AI condition report at pickup and return included with every reservation.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
