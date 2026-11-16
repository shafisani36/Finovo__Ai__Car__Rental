import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi, type QuoteResult } from '../api/bookingApi';
import { fleetApi } from '../../fleet/api/fleetApi';
import type { Vehicle } from '../../fleet/types/fleet.types';
import { authClient } from '../../auth/api/authClient';
import {
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  User,
  ShieldCheck,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader, Button } from '../../../components/common';
import { APP_CURRENCY, formatMoney } from '../../../utils/carImageHelper';
import { useTranslation } from 'react-i18next';

interface BranchOption {
  id: string;
  name: string;
  code: string;
  city: string;
}

interface CustomerOption {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

/** Chauffeur fee per day; must match DEFAULT_DRIVER_FEE_PER_DAY in the backend pricing service. */
const DRIVER_FEE_PER_DAY = 150;

export function CreateBookingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  // Form state
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [returnBranchId, setReturnBranchId] = useState('');

  // Default dates: tomorrow 10:00 AM to +3 days 10:00 AM
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const plusThreeDays = new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [pickupDateTime, setPickupDateTime] = useState(tomorrow.toISOString().slice(0, 16));
  const [returnDateTime, setReturnDateTime] = useState(plusThreeDays.toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [estimatedKm, setEstimatedKm] = useState<number>(120);
  const [driverRequired, setDriverRequired] = useState<boolean>(false);

  // Availability & Quote state
  const [isCheckingAvail, setIsCheckingAvail] = useState(false);
  const [availResult, setAvailResult] = useState<{ available: boolean; conflictReason?: string } | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load vehicles, branches, customers
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [vehRes, branchRes, custRes] = await Promise.all([
          fleetApi.getVehicles({ limit: 50 }),
          authClient.request<{ success: boolean; branches: BranchOption[] }>('/branches'),
          authClient.request<{ success: boolean; customers: CustomerOption[] }>('/customers'),
        ]);

        if (vehRes?.vehicles) {
          setVehicles(vehRes.vehicles);
          if (vehRes.vehicles.length > 0) setSelectedVehicleId(vehRes.vehicles[0].id);
        }
        if (branchRes?.branches) {
          setBranches(branchRes.branches);
          if (branchRes.branches.length > 0) {
            setPickupBranchId(branchRes.branches[0].id);
            setReturnBranchId(branchRes.branches[0].id);
          }
        }
        if (custRes?.customers) {
          setCustomers(custRes.customers);
          if (custRes.customers.length > 0) setSelectedCustomerId(custRes.customers[0].id);
        }
      } catch (err) {
        console.error('Failed to load booking dependencies:', err);
      }
    };

    loadPrerequisites();
  }, []);

  // Recalculate quote & check availability when vehicle, dates, or options change
  useEffect(() => {
    if (!selectedVehicleId || !pickupDateTime || !returnDateTime) return;

    let isMounted = true;
    const updateQuote = async () => {
      setIsCheckingAvail(true);
      setError(null);
      try {
        const pIso = new Date(pickupDateTime).toISOString();
        const rIso = new Date(returnDateTime).toISOString();

        const [availRes, quoteRes] = await Promise.all([
          bookingApi.checkAvailability(selectedVehicleId, pIso, rIso),
          bookingApi.getQuote(selectedVehicleId, pIso, rIso, {
            estimatedKm: Number(estimatedKm || 0),
            driverRequired,
          }),
        ]);

        if (isMounted) {
          setAvailResult(availRes);
          if (quoteRes?.quote) setQuote(quoteRes.quote);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : t('adminPages.bookings.errAvailability');
          setAvailResult({ available: false, conflictReason: msg });
          setQuote(null);
        }
      } finally {
        if (isMounted) setIsCheckingAvail(false);
      }
    };

    const timer = setTimeout(updateQuote, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedVehicleId, pickupDateTime, returnDateTime, estimatedKm, driverRequired, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedCustomerId || !pickupBranchId || !returnBranchId) {
      setError(t('adminPages.bookings.errRequired'));
      return;
    }

    if (availResult && !availResult.available) {
      setError(availResult.conflictReason || t('adminPages.bookings.notAvailable'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await bookingApi.create({
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: new Date(pickupDateTime).toISOString(),
        returnDateTime: new Date(returnDateTime).toISOString(),
        estimatedKm: Number(estimatedKm || 0),
        driverRequired,
        notes,
      });

      navigate('/admin/bookings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('adminPages.bookings.errCreate');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCar = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: t('adminPages.bookings.crumbBookings'), href: '/admin/bookings' },
          { label: t('adminPages.bookings.newBooking') },
        ]}
        title={t('adminPages.bookings.createTitle')}
        subtitle={t('adminPages.bookings.createSubtitle')}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FDE8E8',
            border: '1px solid #F98080',
            color: '#9B1C1C',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="finovo-two-col-grid">
          {/* Left Column: Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: Vehicle Selection */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #ECEAEF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Car size={18} color="#6C1E84" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{t('adminPages.bookings.step1')}</h3>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A315A', marginBottom: '8px' }}>
                  {t('adminPages.bookings.chooseVehicle')}
                </label>
                <CustomSelect
                  value={selectedVehicleId}
                  onChange={(val) => setSelectedVehicleId(val)}
                  searchable
                  placeholder={t('adminPages.bookings.selectVehicle')}
                  options={vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.brand} ${v.model} (${v.registrationNumber})`,
                    sublabel: `${v.pricingMethod?.toUpperCase() || 'DAILY'}: ${v.currency || APP_CURRENCY} ${Number(
                      v.pricingMethod === 'per_km'
                        ? v.perKmRate || 0
                        : v.pricingMethod === 'hourly'
                        ? v.hourlyRate || 0
                        : v.pricingMethod === 'monthly'
                        ? v.monthlyRate || 0
                        : v.dailyRate || 0
                    ).toLocaleString()}${
                      v.pricingMethod === 'per_km'
                        ? '/km'
                        : v.pricingMethod === 'hourly'
                        ? '/hr'
                        : v.pricingMethod === 'monthly'
                        ? '/mo'
                        : '/day'
                    }`,
                    badge: v.status || 'AVAILABLE',
                  }))}
                />
              </div>

              {selectedCar && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    backgroundColor: '#FAF5FB',
                    borderRadius: '8px',
                    border: '1px solid #E6D8ED',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#1E0426' }}>{t('adminPages.bookings.pricingMethod')} </span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 800, color: '#6C1E84' }}>
                      {selectedCar.pricingMethod || 'daily'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#66566A' }}>
                    {t('adminPages.bookings._depositLine', { amount: formatMoney(Number(selectedCar.securityDeposit || 0), selectedCar.currency || APP_CURRENCY) })}
                  </span>
                </div>
              )}

              {/* Availability Alert */}
              <div style={{ marginTop: '14px' }}>
                {isCheckingAvail ? (
                  <div style={{ fontSize: '0.85rem', color: '#8A7090' }}>{t('adminPages.bookings.checking')}</div>
                ) : availResult?.available ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>
                    <CheckCircle2 size={16} />
                    <span>{t('adminPages.bookings.available')}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#DC2626', fontWeight: 700 }}>
                    <AlertTriangle size={16} />
                    <span>{availResult?.conflictReason || t('adminPages.bookings.conflict')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Customer Selection */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #ECEAEF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <User size={18} color="#6C1E84" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{t('adminPages.bookings.step2')}</h3>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A315A', marginBottom: '8px' }}>
                  {t('adminPages.bookings.selectCustomerLabel')}
                </label>
                <CustomSelect
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val)}
                  searchable
                  placeholder={t('adminPages.bookings.selectCustomer')}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.fullName,
                    sublabel: `${c.email}${c.phone ? ` • ${c.phone}` : ''}`,
                  }))}
                />
              </div>
            </div>

            {/* Step 3: Dates & Branches */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #ECEAEF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={18} color="#6C1E84" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{t('adminPages.bookings.step3')}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4A315A', marginBottom: '6px' }}>
                    {t('adminPages.bookings.pickupDate')}
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupDateTime}
                    onChange={(e) => setPickupDateTime(e.target.value)}
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1.5px solid #DED7E2', backgroundColor: '#FAF9FB', color: '#1E0432', padding: '0 12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4A315A', marginBottom: '6px' }}>
                    {t('adminPages.bookings.returnDate')}
                  </label>
                  <input
                    type="datetime-local"
                    value={returnDateTime}
                    onChange={(e) => setReturnDateTime(e.target.value)}
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1.5px solid #DED7E2', backgroundColor: '#FAF9FB', color: '#1E0432', padding: '0 12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4A315A', marginBottom: '6px' }}>
                    {t('adminPages.bookings.pickupBranch')}
                  </label>
                  <CustomSelect
                    value={pickupBranchId}
                    onChange={(val) => setPickupBranchId(val)}
                    searchable={branches.length > 5}
                    placeholder={t('adminPages.bookings.selectPickup')}
                    options={branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.city})`,
                    }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4A315A', marginBottom: '6px' }}>
                    {t('adminPages.bookings.returnBranch')}
                  </label>
                  <CustomSelect
                    value={returnBranchId}
                    onChange={(val) => setReturnBranchId(val)}
                    searchable={branches.length > 5}
                    placeholder={t('adminPages.bookings.selectReturn')}
                    options={branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.city})`,
                    }))}
                  />
                </div>
              </div>

              {/* Method-Specific Estimated Distance */}
              {(selectedCar?.pricingMethod === 'per_km' || selectedCar?.pricingMethod === 'daily_extra_km') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4A315A', marginBottom: '6px' }}>
                    <Navigation size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {t('adminPages.bookings.distance')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedKm}
                    onChange={(e) => setEstimatedKm(Number(e.target.value))}
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1.5px solid #DED7E2', backgroundColor: '#FAF9FB', color: '#1E0432', padding: '0 12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                    {t('adminPages.bookings.distanceHelp')}
                  </div>
                </div>
              )}

              {/* Chauffeur Service Toggle */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: driverRequired ? '#FAF5FB' : '#FAF7FA',
                    border: `1.5px solid ${driverRequired ? '#6C1E84' : '#EFEAEF'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={driverRequired}
                    onChange={(e) => setDriverRequired(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#6C1E84' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E0426' }}>
                    {t('adminPages.bookings._driverOption', { amount: formatMoney(DRIVER_FEE_PER_DAY) })}
                  </span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4A315A', marginBottom: '6px' }}>
                  {t('adminPages.bookings.notes')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('adminPages.bookings.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', borderRadius: '10px', border: '1.5px solid #DED7E2', backgroundColor: '#FAF9FB', color: '#1E0432', padding: '10px 12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Pricing Summary Card & Submit */}
          <div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #ECEAEF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                position: 'sticky',
                top: '90px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Banknote size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{t('adminPages.bookings.breakdown')}</h3>
              </div>

              {selectedCar && (
                <div style={{ backgroundColor: '#FAF5FB', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 800, color: '#1E0426' }}>
                    {selectedCar.brand} {selectedCar.model}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#66566A' }}>
                    {t('adminPages.bookings.registration')} {selectedCar.registrationNumber} • {selectedCar.category?.name}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#6C1E84', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} />
                    <span>{t('adminPages.bookings._pricingEngine', { method: quote?.pricingMethod?.toUpperCase() || selectedCar.pricingMethod?.toUpperCase() || 'DAILY' })}</span>
                  </div>
                </div>
              )}

              {quote ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                  {quote.breakdown && quote.breakdown.length > 0 ? (
                    quote.breakdown.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#4B5563' }}>{item.description}</span>
                          <span style={{ fontSize: '0.75rem', color: '#8A7090', marginLeft: '6px' }}>
                            ({item.quantity} {item.unit})
                          </span>
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {quote.currency || APP_CURRENCY} {item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>{t('adminPages.bookings.duration')}</span>
                        <strong>{t('adminPages.bookings._dayCount', { count: quote.totalDays })}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>{t('adminPages.bookings.dailyRate')}</span>
                        <span>{t('adminPages.bookings._perDay', { amount: formatMoney(quote.dailyRate, quote.currency || APP_CURRENCY) })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>{t('adminPages.bookings.baseSubtotal')}</span>
                        <span>{quote.currency || APP_CURRENCY} {quote.subtotal.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>{t('adminPages.bookings.taxes')}</span>
                        <span>{quote.currency || APP_CURRENCY} {quote.taxAmount.toLocaleString()}</span>
                      </div>
                    </>
                  )}

                  {/* Refundable Security Deposit Segregated Line */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginTop: '4px',
                    }}
                  >
                    <div>
                      <div style={{ color: '#1E40AF', fontWeight: 700, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={14} />
                        <span>{t('adminPages.bookings.deposit')}</span>
                      </div>
                      <div style={{ color: '#3B82F6', fontSize: '0.725rem' }}>
                        {t('adminPages.bookings.depositNote')}
                      </div>
                    </div>
                    <span style={{ color: '#1E40AF', fontWeight: 800 }}>
                      {quote.currency || APP_CURRENCY} {quote.depositAmount.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ borderTop: '2px dashed #ECEAEF', paddingTop: '12px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
                      <span>{t('adminPages.bookings.grandTotal')}</span>
                      <span style={{ color: '#059669' }}>
                        {quote.currency || APP_CURRENCY} {(quote.grandTotal ?? quote.totalAmount).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                      {t('adminPages.bookings.grandTotalNote')}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#6B7280', fontSize: '0.85rem' }}>
                  {t('adminPages.bookings.selectDates')}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={Boolean(isSubmitting || (availResult && !availResult.available))}
                style={{ marginTop: '24px' }}
              >
                {isSubmitting ? t('adminPages.bookings._confirming') : t('adminPages.bookings._confirm')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}
