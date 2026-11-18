import type { CSSProperties } from 'react';
import { Banknote, Clock, Navigation, Calendar, Info, Check, Sparkles } from 'lucide-react';
import type { PricingMethod } from '../types/fleet.types';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { APP_CURRENCY } from '../../../utils/carImageHelper';
import { useTranslation } from 'react-i18next';
import { useBookingOptions } from '../../../hooks/useBookingOptions';

const LABEL_STYLE: CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '6px' };
const PRICE_INPUT_STYLE: CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DED7E2', backgroundColor: '#FFFFFF', fontSize: '0.95rem', fontWeight: 800, color: '#1A0322' };
const INPUT_STYLE: CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DED7E2', backgroundColor: '#FFFFFF', fontSize: '0.9rem', color: '#1A0322' };
const BOLD_INPUT_STYLE: CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DED7E2', backgroundColor: '#FFFFFF', fontSize: '0.9rem', fontWeight: 700, color: '#1A0322' };

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
    icon: <Banknote size={18} />,
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
  const { t } = useTranslation();
  const bookingOptions = useBookingOptions();
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
    const cur = currency || APP_CURRENCY;
    const deposit = parseFloat(securityDeposit) || 0;

    switch (pricingMethod) {
      case 'daily': {
        const rate = parseFloat(dailyRate) || 0;
        const sampleDays = 3;
        const subtotal = rate * sampleDays;
        return {
          title: t('adminPages.pricing._s_daily_title', { currency: cur }),
          calculationText: t('adminPages.pricing._s_daily_calc', { rate: `${cur} ${rate.toLocaleString()}` }),
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: t('adminPages.pricing._s_daily_notes', { minutes: gracePeriodMinutes || 0 }),
        };
      }
      case 'per_km': {
        const rate = parseFloat(perKmRate) || 0;
        const minTrip = parseFloat(minimumTripCharge) || 0;
        const sampleKm = 150;
        const rawCharge = sampleKm * rate;
        const subtotal = Math.max(rawCharge, minTrip);
        return {
          title: t('adminPages.pricing._s_km_title', { currency: cur }),
          calculationText:
            t('adminPages.pricing._s_km_calc', { km: sampleKm, rate: `${cur} ${rate}`, total: `${cur} ${rawCharge.toLocaleString()}` }) +
            (rawCharge < minTrip ? t('adminPages.pricing._s_km_adjusted', { amount: `${cur} ${minTrip.toLocaleString()}` }) : ''),
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: t('adminPages.pricing._s_km_notes', { amount: `${cur} ${minTrip.toLocaleString()}` }),
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
          title: t('adminPages.pricing._s_extra_title', { currency: cur }),
          calculationText: t('adminPages.pricing._s_extra_calc', {
            rate: `${cur} ${rate.toLocaleString()}`,
            base: `${cur} ${baseRental.toLocaleString()}`,
            km: extra,
            excess: `${cur} ${excessRate}`,
            extra: `${cur} ${extraCharge.toLocaleString()}`,
          }),
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: t('adminPages.pricing._s_extra_notes', { included, cap, excess: `${cur} ${excessRate}` }),
        };
      }
      case 'hourly': {
        const rate = parseFloat(hourlyRate) || 0;
        const sampleHours = 4;
        const subtotal = rate * sampleHours;
        return {
          title: t('adminPages.pricing._s_hourly_title', { currency: cur }),
          calculationText: t('adminPages.pricing._s_hourly_calc', { rate: `${cur} ${rate.toLocaleString()}` }),
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: t('adminPages.pricing._s_hourly_notes', { increment: billingIncrementMinutes || 60, grace: gracePeriodMinutes || 0 }),
        };
      }
      case 'monthly': {
        const rate = parseFloat(monthlyRate) || 0;
        const subtotal = rate;
        return {
          title: t('adminPages.pricing._s_monthly_title', { currency: cur }),
          calculationText: t('adminPages.pricing._s_monthly_calc', { rate: `${cur} ${rate.toLocaleString()}` }),
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: t('adminPages.pricing._s_monthly_notes', { policy: partialMonthPolicy || 'prorated_daily' }),
        };
      }
      default: {
        const rate = parseFloat(dailyRate) || 0;
        const subtotal = rate * 3;
        return {
          title: t('adminPages.pricing._s_daily_title', { currency: cur }),
          calculationText: t('adminPages.pricing._s_daily_calc', { rate: `${cur} ${rate.toLocaleString()}` }),
          subtotal,
          deposit,
          grandTotal: subtotal + deposit,
          notes: t('adminPages.pricing._s_default_notes'),
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
            <Banknote size={20} />
          </div>
          <div>
            <h2 className="car-card-title">{t('adminPages.pricing.title')}</h2>
            <p className="car-card-subtitle">
              {t('adminPages.pricing.subtitle')}
            </p>
          </div>
        </div>

        {/* Currency Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654' }}>{t('adminPages.pricing.currency')}</span>
          {/* The whole site prices and charges in one currency, so it is shown but not editable */}
          <span
            style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1E0426', padding: '6px 12px', borderRadius: '8px', background: '#F4EEF6' }}
          >
            {APP_CURRENCY}
          </span>
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
            <strong>{t('adminPages.pricing.historyTitle')}</strong> {t('adminPages.pricing.historyText')}
          </span>
        </div>
      )}

      {/* Pricing Method Selector Grid (5 Methods) */}
      <div style={{ marginBottom: '22px' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#4B3654', marginBottom: '10px' }}>
          {t('adminPages.pricing.methodLabel')}
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
                      {t(`adminPages.pricing._m_${method.id}_name`, { defaultValue: method.name })}
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
                  {t(`adminPages.pricing._m_${method.id}_desc`, { defaultValue: method.description })}
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
                  {t('adminPages.pricing._ideal', { text: t(`adminPages.pricing._m_${method.id}_best`, { defaultValue: method.bestFor }) })}
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
          {t('adminPages.pricing._configuring', { method: t(`adminPages.pricing._m_${pricingMethod}_name`, { defaultValue: PRICING_METHODS.find((m) => m.id === pricingMethod)?.name }) })}
        </div>

        {/* METHOD A: Daily Rental */}
        {pricingMethod === 'daily' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblDaily', { currency })}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 8000"
                  value={dailyRate}
                  onChange={(e) => onChange('dailyRate', e.target.value)}
                  style={PRICE_INPUT_STYLE}
                />
              </div>
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblWeekly', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t('adminPages.pricing.weeklyPlaceholder')}
                value={weeklyRate}
                onChange={(e) => onChange('weeklyRate', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing.grace')}
              </label>
              <input
                type="number"
                min="0"
                step="5"
                placeholder={t('adminPages.pricing.gracePlaceholder')}
                value={gracePeriodMinutes}
                onChange={(e) => onChange('gracePeriodMinutes', e.target.value)}
                style={INPUT_STYLE}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>{t('adminPages.pricing.graceHelp')}</span>
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblDeposit', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 20000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={INPUT_STYLE}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>{t('adminPages.pricing.depositHelp')}</span>
            </div>
          </div>
        )}

        {/* METHOD B: Per Kilometer */}
        {pricingMethod === 'per_km' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblPerKm', { currency })}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 60"
                value={perKmRate}
                onChange={(e) => onChange('perKmRate', e.target.value)}
                style={PRICE_INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblMinTrip', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 5000"
                value={minimumTripCharge}
                onChange={(e) => onChange('minimumTripCharge', e.target.value)}
                style={BOLD_INPUT_STYLE}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>{t('adminPages.pricing.minTripHelp')}</span>
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblDeposit', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 15000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
          </div>
        )}

        {/* METHOD C: Daily Rental Plus Extra KM */}
        {pricingMethod === 'daily_extra_km' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblBaseDaily', { currency })}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 8000"
                value={dailyRate}
                onChange={(e) => onChange('dailyRate', e.target.value)}
                style={PRICE_INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing.includedKm')}
              </label>
              <input
                type="number"
                min="10"
                step="10"
                placeholder="e.g. 200"
                value={mileageLimitPerDay}
                onChange={(e) => onChange('mileageLimitPerDay', e.target.value)}
                style={BOLD_INPUT_STYLE}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>{t('adminPages.pricing.includedKmHelp')}</span>
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblExcess', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50"
                value={excessMileageFee}
                onChange={(e) => onChange('excessMileageFee', e.target.value)}
                style={BOLD_INPUT_STYLE}
              />
              <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>{t('adminPages.pricing.excessHelp')}</span>
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblDeposit', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 20000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
          </div>
        )}

        {/* METHOD D: Hourly Rental */}
        {pricingMethod === 'hourly' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblHourly', { currency })}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 1500"
                value={hourlyRate}
                onChange={(e) => onChange('hourlyRate', e.target.value)}
                style={PRICE_INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing.minHours')}
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 2"
                value={minimumBillableHours}
                onChange={(e) => onChange('minimumBillableHours', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing.increment')}
              </label>
              <CustomSelect
                value={billingIncrementMinutes}
                onChange={(val) => onChange('billingIncrementMinutes', val)}
                options={[
                  { value: '30', label: t('adminPages.pricing.increment30') },
                  { value: '60', label: t('adminPages.pricing.increment60') },
                ]}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblDeposit', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 10000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
          </div>
        )}

        {/* METHOD E: Monthly Rental */}
        {pricingMethod === 'monthly' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblMonthly', { currency })}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 150000"
                value={monthlyRate}
                onChange={(e) => onChange('monthlyRate', e.target.value)}
                style={PRICE_INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing.partialPolicy')}
              </label>
              <CustomSelect
                value={partialMonthPolicy}
                onChange={(val) => onChange('partialMonthPolicy', val)}
                options={[
                  { value: 'prorated_daily', label: t('adminPages.pricing.prorated') },
                  { value: 'full_month', label: t('adminPages.pricing.fullMonth') },
                ]}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing.monthlyCap')}
              </label>
              <input
                type="number"
                min="100"
                placeholder="e.g. 3000"
                value={mileageLimitPerDay ? Number(mileageLimitPerDay) * 30 : 3000}
                onChange={(e) => onChange('mileageLimitPerDay', Math.round(Number(e.target.value) / 30).toString())}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.pricing._lblDeposit', { currency })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50000"
                value={securityDeposit}
                onChange={(e) => onChange('securityDeposit', e.target.value)}
                style={INPUT_STYLE}
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
            <span>{t('adminPages.pricing.previewTitle')}</span>
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
            {t('adminPages.pricing._previewLine', { subtotal: `${currency} ${sample.subtotal.toLocaleString()}`, deposit: `${currency} ${sample.deposit.toLocaleString()}` })}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#6C1E84' }}>
            {t('adminPages.pricing._previewTotal', { total: `${currency} ${sample.grandTotal.toLocaleString()}` })}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#8A7090', fontStyle: 'italic' }}>
          * {sample.notes} {t('adminPages.pricing.previewTax', { rate: bookingOptions?.taxRatePercent ?? 0, label: bookingOptions?.taxLabel || '' })}
        </div>
      </div>

      {/* Fleet Status & Catalog Visibility */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '18px', paddingTop: '16px', borderTop: '1px solid #ECE7ED' }}>
        <div>
          <label style={LABEL_STYLE}>
            {t('adminPages.pricing.fleetStatus')}
          </label>
          <CustomSelect
            value={status}
            onChange={(val) => onStatusChange(val)}
            options={[
              { value: 'AVAILABLE', label: t('adminPages.pricing._st_AVAILABLE'), sublabel: t('adminPages.pricing.stAvailableDesc'), badge: t('adminPages.pricing.stActive'), badgeColor: '#DEF7EC' },
              { value: 'MAINTENANCE', label: t('adminPages.pricing._st_MAINTENANCE'), sublabel: t('adminPages.pricing.stMaintenanceDesc'), badge: t('adminPages.pricing.stHold'), badgeColor: '#FEF08A' },
              { value: 'RESERVED', label: t('adminPages.pricing._st_RESERVED'), sublabel: t('adminPages.pricing.stReservedDesc'), badge: t('adminPages.pricing.stStaged'), badgeColor: '#E0E7FF' },
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
            {t('adminPages.pricing.publish')}
          </label>
        </div>
      </div>
    </div>
  );
};
