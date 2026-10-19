import { DollarSign, Clock, Navigation, Calendar, Info, Check, Sparkles } from 'lucide-react';
import type { PricingMethod } from '../types/fleet.types';
import { CustomSelect } from '../../../components/common/CustomSelect';

export interface VehiclePricingState {
  pricingMethod: PricingMethod;
  currency: string;
  dailyRate: string;
  weeklyRate: string;
  monthlyRate: string;
  perKmRate: string;
  hourlyRate: string;
  minimumTripCharge: string;
  minimumBillableHours: string;
  billingIncrementMinutes: string;
  gracePeriodMinutes: string;
  partialMonthPolicy: string;
  securityDeposit: string;
  mileageLimitPerDay: string;
  excessMileageFee: string;
}

interface VehiclePricingSectionProps {
  state: VehiclePricingState;
  onChange: (field: keyof VehiclePricingState, value: string) => void;
  status: string;
  onStatusChange: (status: any) => void;
  isPublicCatalog: boolean;
  onCatalogChange: (val: boolean) => void;
  isEditMode?: boolean;
}

const PRICING_METHODS: Array<{
  id: PricingMethod;
  name: string;
  shortTag: string;
  icon: React.ReactNode;
  description: string;
  bestFor: string;
}> = [
  {
    id: 'daily',
    name: 'Daily Rental',
    shortTag: 'Per Day',
    icon: <Calendar size={18} />,
    description: 'Billed per 24-hour day with optional daily mileage cap and grace period.',
    bestFor: 'Standard leisure & business rentals (1 to 28 days)',
  },
  {
    id: 'per_km',
    name: 'Per-Kilometer',
    shortTag: 'Per KM',
    icon: <Navigation size={18} />,
    description: 'Billed strictly on verified odometer distance with minimum trip charge.',
    bestFor: 'Chauffeur, city transfers, and variable-distance trips',
  },
  {
    id: 'daily_extra_km',
    name: 'Daily + Extra KM',
    shortTag: 'Daily + Cap',
    icon: <Sparkles size={18} />,
    description: 'Base daily rate including free daily km allowance + excess km surcharge.',
    bestFor: 'Inter-city travelers and standard road-trips',
  },
  {
    id: 'hourly',
    name: 'Hourly Rental',
    shortTag: 'Per Hour',
    icon: <Clock size={18} />,
    description: 'Billed in 30/60 minute increments with minimum billable hours.',
    bestFor: 'Weddings, VIP events, airport pickups, and short errands',
  },
  {
    id: 'monthly',
    name: 'Monthly Lease',
    shortTag: 'Monthly',
    icon: <DollarSign size={18} />,
    description: 'Long-term corporate fleet lease with partial-month daily proration.',
    bestFor: 'Corporate fleets & long-term expat rentals (30+ days)',
  },
];

export const VehiclePricingSection: React.FC<VehiclePricingSectionProps> = ({
  state,
  onChange,
  status,
  onStatusChange,
  isPublicCatalog,
  onCatalogChange,
  isEditMode = false,
}) => {
  const {
    pricingMethod,
    currency,
    dailyRate,
    weeklyRate,
    monthlyRate,
    perKmRate,
    hourlyRate,
    minimumTripCharge,
    minimumBillableHours,
    billingIncrementMinutes,
    gracePeriodMinutes,
    partialMonthPolicy,
    securityDeposit,
    mileageLimitPerDay,
    excessMileageFee,
  } = state;

  // Real-time sample calculation for the preview card
  const calculateSampleQuote = () => {
    const cur = currency || 'PKR';
    const deposit = parseFloat(securityDeposit) || 0;

    switch (pricingMethod) {
      case 'daily': {
        const rate = parseFloat(dailyRate) || 0;
        const sampleDays = 3;
        const subtotal = rate * sampleDays;
        return {
          title: `3-Day Sample Rental (${cur})`,
          calculationText: `3 billable days × ${cur} ${rate.toLocaleString()} / day`,
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: `Includes grace period of ${gracePeriodMinutes || 0} min before stepping to next billable day.`,
        };
      }
      case 'per_km': {
        const rate = parseFloat(perKmRate) || 0;
        const minTrip = parseFloat(minimumTripCharge) || 0;
        const sampleKm = 150;
        const rawCharge = sampleKm * rate;
        const subtotal = Math.max(rawCharge, minTrip);
        return {
          title: `150 KM Sample Trip (${cur})`,
          calculationText: `${sampleKm} km × ${cur} ${rate} / km = ${cur} ${rawCharge.toLocaleString()}${
            rawCharge < minTrip ? ` (Adjusted to min trip ${cur} ${minTrip.toLocaleString()})` : ''
          }`,
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: `Minimum trip charge of ${cur} ${minTrip.toLocaleString()} applies if distance charge is lower.`,
        };
      }
      case 'daily_extra_km': {
        const rate = parseFloat(dailyRate) || 0;
        const cap = parseFloat(mileageLimitPerDay) || 200;
        const excessRate = parseFloat(excessMileageFee) || 50;
        const sampleDays = 3;
        const sampleKm = 700;
        const included = sampleDays * cap;
        const extra = Math.max(0, sampleKm - included);
        const baseRental = rate * sampleDays;
        const extraCharge = extra * excessRate;
        const subtotal = baseRental + extraCharge;
        return {
          title: `3-Day Trip @ 700 KM (${cur})`,
          calculationText: `Base: 3 days × ${cur} ${rate.toLocaleString()} = ${cur} ${baseRental.toLocaleString()} + Extra: ${extra} km × ${cur} ${excessRate} = ${cur} ${extraCharge.toLocaleString()}`,
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: `Included mileage: ${included} km (${cap} km/day). Overage billed at ${cur} ${excessRate}/km.`,
        };
      }
      case 'hourly': {
        const rate = parseFloat(hourlyRate) || 0;
        const sampleHours = 4;
        const subtotal = rate * sampleHours;
        return {
          title: `4-Hour Event Rental (${cur})`,
          calculationText: `4 hours × ${cur} ${rate.toLocaleString()} / hr`,
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: `Billed in ${billingIncrementMinutes || 60}-min increments. Grace period: ${gracePeriodMinutes || 0} mins.`,
        };
      }
      case 'monthly': {
        const rate = parseFloat(monthlyRate) || 0;
        const subtotal = rate;
        return {
          title: `1-Month Commercial Lease (${cur})`,
          calculationText: `1 calendar month contract = ${cur} ${rate.toLocaleString()}`,
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: `Partial months billed via '${partialMonthPolicy || 'prorated_daily'}' policy.`,
        };
      }
      default: {
        const rate = parseFloat(dailyRate) || 0;
        const subtotal = rate * 3;
        return {
          title: `3-Day Sample Rental (${cur})`,
          calculationText: `3 billable days × ${cur} ${rate.toLocaleString()} / day`,
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: `Standard daily rental configuration.`,
        };
      }
    }
  };

  const sample = calculateSampleQuote();

  return (
    <div className="car-card-section vehicle-pricing-card">
      {/* Header */}
      <div className="car-card-header">
        <div className="car-card-header-left">
          <div className="car-card-icon-badge">
            <DollarSign size={20} />
          </div>
          <div>
            <h2 className="car-card-title">4. Commercial Pricing & Rental Policy</h2>
            <p className="car-card-subtitle">
              Configure billing method, base commercial tariffs, grace periods, and deposit rules
            </p>
          </div>
        </div>

        {/* Currency Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654' }}>Currency:</span>
          <div style={{ width: '135px' }}>
            <CustomSelect
              size="sm"
              value={currency}
              onChange={(val) => onChange('currency', val)}
              options={[
                { value: 'PKR', label: 'PKR (₨)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'AED', label: 'AED (د.إ)' },
                { value: 'GBP', label: 'GBP (£)' },
              ]}
            />
          </div>
        </div>
      </div>

      {isEditMode && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#EFF6FF',
            borderRadius: '10px',
            border: '1px solid #BFDBFE',
            color: '#1E40AF',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <Info size={18} color="#2563EB" style={{ flexShrink: 0 }} />
          <span>
            <strong>Historical Integrity Protection:</strong> Any modifications to these pricing rules will create a new versioned tier for future quotes. Confirmed bookings preserve their accepted contract rates and will never be altered.
          </span>
        </div>
      )}

      {/* Pricing Method Selector Grid (5 Methods) */}
      <div style={{ marginBottom: '22px' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '10px' }}>
          Permitted Vehicle Pricing Method * (One active method per vehicle)
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {PRICING_METHODS.map((method) => {
            const isSelected = pricingMethod === method.id;
            return (
              <div
                key={method.id}
                onClick={() => onChange('pricingMethod', method.id)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #6C1E84' : '1px solid #E5E0E8',
                  backgroundColor: isSelected ? '#FAF5FC' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSelected ? '#6C1E84' : '#66566A' }}>
                    {method.icon}
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: isSelected ? '#6C1E84' : '#1A0322' }}>
                      {method.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#6C1E84',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#66566A', lineHeight: 1.35 }}>
                  {method.description}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: isSelected ? '#6C1E84' : '#8A7090',
                    marginTop: 'auto',
                    paddingTop: '6px',
                  }}
                >
                  Ideal: {method.bestFor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditional Fields Based on Selected Method */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FAF9FB',
          borderRadius: '14px',
          border: '1px solid #ECE7ED',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#6C1E84', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Configuring: {PRICING_METHODS.find((m) => m.id === pricingMethod)?.name} Parameters
        </div>

        {/* METHOD A: Daily Rental */}
        {pricingMethod === 'daily' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Daily Rate ({currency}) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 8000"
                  value={dailyRate}
                  onChange={(e) => onChange('dailyRate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #DED7E2',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#1A0322',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Weekly Discount Rate ({currency}) (7+ Days)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Optional weekly bundle"
                value={weeklyRate}
                onChange={(e) => onChange('weeklyRate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="e.g. 30 or 60"
                value={gracePeriodMinutes}
                onChange={(e) => onChange('gracePeriodMinutes', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>Late returns within grace period avoid full extra-day fee</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Refundable Security Deposit ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 20000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>Separated from rental revenue; reimbursed upon return</span>
            </div>
          </div>
        )}

        {/* METHOD B: Per Kilometer */}
        {pricingMethod === 'per_km' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Per-Kilometer Rate ({currency}/km) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 60"
                value={perKmRate}
                onChange={(e) => onChange('perKmRate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Minimum Trip Charge ({currency}) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 5000"
                value={minimumTripCharge}
                onChange={(e) => onChange('minimumTripCharge', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1A0322',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>Trip fee cannot fall below this floor</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Refundable Security Deposit ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 15000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>
          </div>
        )}

        {/* METHOD C: Daily Rental Plus Extra KM */}
        {pricingMethod === 'daily_extra_km' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Base Daily Rate ({currency}) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 8000"
                value={dailyRate}
                onChange={(e) => onChange('dailyRate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Included Mileage Allowance (KM/day) *
              </label>
              <input
                type="number"
                min="10"
                step="10"
                placeholder="e.g. 200"
                value={mileageLimitPerDay}
                onChange={(e) => onChange('mileageLimitPerDay', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1A0322',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>E.g. 200 km/day = 600 km included for a 3-day booking</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Excess Distance Fee ({currency}/km) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50"
                value={excessMileageFee}
                onChange={(e) => onChange('excessMileageFee', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1A0322',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>Rate charged per verified km over the allowance</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Refundable Security Deposit ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 20000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>
          </div>
        )}

        {/* METHOD D: Hourly Rental */}
        {pricingMethod === 'hourly' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Hourly Rate ({currency}/hr) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 1500"
                value={hourlyRate}
                onChange={(e) => onChange('hourlyRate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Minimum Billable Hours
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 2"
                value={minimumBillableHours}
                onChange={(e) => onChange('minimumBillableHours', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Billing Increment (Minutes)
              </label>
              <CustomSelect
                value={billingIncrementMinutes}
                onChange={(val) => onChange('billingIncrementMinutes', val)}
                options={[
                  { value: '30', label: '30 Minutes (Half-hour steps)' },
                  { value: '60', label: '60 Minutes (Full-hour steps)' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Refundable Security Deposit ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 10000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>
          </div>
        )}

        {/* METHOD E: Monthly Rental */}
        {pricingMethod === 'monthly' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Monthly Subscription Rate ({currency}) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 150000"
                value={monthlyRate}
                onChange={(e) => onChange('monthlyRate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Partial Month Billing Policy
              </label>
              <CustomSelect
                value={partialMonthPolicy}
                onChange={(val) => onChange('partialMonthPolicy', val)}
                options={[
                  { value: 'prorated_daily', label: 'Prorated Daily (1/30th monthly rate per day)' },
                  { value: 'full_month', label: 'Full Month (Ceil to complete month)' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Monthly Mileage Cap (KM)
              </label>
              <input
                type="number"
                min="100"
                placeholder="e.g. 3000"
                value={mileageLimitPerDay ? Number(mileageLimitPerDay) * 30 : 3000}
                onChange={(e) => onChange('mileageLimitPerDay', Math.round(Number(e.target.value) / 30).toString())}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
                Refundable Security Deposit ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #DED7E2',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#1A0322',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Real-time Live Simulation Card */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E0E8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F0EBF2', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 800, color: '#1A0322' }}>
            <Sparkles size={16} color="#6C1E84" />
            <span>Interactive Real-Time Pricing Preview</span>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '10px',
              backgroundColor: '#F5EEF8',
              color: '#6C1E84',
            }}
          >
            {sample.title}
          </span>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#4B3654', fontWeight: 600 }}>
          {sample.calculationText}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '4px' }}>
          <div style={{ fontSize: '0.8125rem', color: '#66566A' }}>
            Rental Subtotal: <strong>{currency} {sample.subtotal.toLocaleString()}</strong> + Security Deposit: <strong>{currency} {sample.deposit.toLocaleString()}</strong>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#6C1E84' }}>
            Est. Total: {currency} {sample.grandTotal.toLocaleString()}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#8A7090', fontStyle: 'italic' }}>
          * {sample.notes} Taxes (8%) applied at checkout. Deposit is held separately from rental earnings.
        </div>
      </div>

      {/* Fleet Status & Catalog Visibility */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', paddingTop: '16px', borderTop: '1px solid #ECE7ED' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' }}>
            Fleet Operational Status
          </label>
          <CustomSelect
            value={status}
            onChange={(val) => onStatusChange(val)}
            options={[
              { value: 'AVAILABLE', label: 'AVAILABLE', sublabel: 'Eligible for immediate customer reservation', badge: 'Active', badgeColor: '#DEF7EC' },
              { value: 'MAINTENANCE', label: 'MAINTENANCE', sublabel: 'Inspection, detailing, repair or scheduled service', badge: 'Hold', badgeColor: '#FEF08A' },
              { value: 'RESERVED', label: 'RESERVED', sublabel: 'Staged for customer pickup or dispatch', badge: 'Staged', badgeColor: '#E0E7FF' },
            ]}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          <input
            type="checkbox"
            id="publicCatalogToggle"
            checked={isPublicCatalog}
            onChange={(e) => onCatalogChange(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#6C1E84', cursor: 'pointer' }}
          />
          <label htmlFor="publicCatalogToggle" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1A0322', cursor: 'pointer' }}>
            Publish to Public Customer Reservation Catalog
          </label>
        </div>
      </div>
    </div>
  );
};
