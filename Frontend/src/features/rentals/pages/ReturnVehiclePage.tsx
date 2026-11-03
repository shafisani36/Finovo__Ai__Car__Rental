import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { rentalApi } from '../api/rentalApi';
import type { RentalRecord } from '../api/rentalApi';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Droplet,
  ShieldAlert,
  Wrench,
  Sparkles,
  DollarSign,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader } from '../../../components/common';

export function ReturnVehiclePage() {
  const { rentalId } = useParams<{ rentalId: string }>();
  const navigate = useNavigate();

  const [rental, setRental] = useState<RentalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Return & Inspection state
  const [endMileage, setEndMileage] = useState<number>(0);
  const [endFuelLevel, setEndFuelLevel] = useState<string>('100%');
  const [conditionNotes, setConditionNotes] = useState<string>('Vehicle returned in good operational condition.');
  const [sendToMaintenance, setSendToMaintenance] = useState<boolean>(false);

  // Settlement adjustment fields
  const [damageCharges, setDamageCharges] = useState<number>(0);
  const [fuelCharges, setFuelCharges] = useState<number>(0);
  const [additionalAdjustment, setAdditionalAdjustment] = useState<number>(0);

  // Real-time Settlement Preview state
  const [settlementPreview, setSettlementPreview] = useState<any | null>(null);
  const [isCalculatingSettlement, setIsCalculatingSettlement] = useState<boolean>(false);

  useEffect(() => {
    if (rentalId) {
      loadRental(rentalId);
    }
  }, [rentalId]);

  const loadRental = async (id: string) => {
    try {
      setLoading(true);
      const res = await rentalApi.getRentalById(id);
      if (res.success && res.rental) {
        setRental(res.rental);
        const defaultEndMileage = res.rental.startMileage + 180;
        setEndMileage(defaultEndMileage);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to retrieve rental record');
    } finally {
      setLoading(false);
    }
  };

  // Live Settlement Calculation Preview whenever readings or adjustments change
  useEffect(() => {
    if (!rental || endMileage < rental.startMileage) return;

    let isMounted = true;
    const calculatePreview = async () => {
      setIsCalculatingSettlement(true);
      try {
        const res = await rentalApi.previewSettlement({
          rentalId: rental.id,
          endMileage: Number(endMileage),
          endFuelLevel,
          damageCharges: Number(damageCharges || 0),
          fuelCharges: Number(fuelCharges || 0),
          additionalAdjustment: Number(additionalAdjustment || 0),
        });

        if (isMounted && res.success && res.settlement) {
          setSettlementPreview(res.settlement);
        }
      } catch (err) {
        console.warn('Settlement preview calculation note:', err);
      } finally {
        if (isMounted) setIsCalculatingSettlement(false);
      }
    };

    const timer = setTimeout(calculatePreview, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [rental, endMileage, endFuelLevel, damageCharges, fuelCharges, additionalAdjustment]);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    if (endMileage < rental.startMileage) {
      setError(`Return mileage (${endMileage.toLocaleString()} km) cannot be less than pickup mileage (${rental.startMileage.toLocaleString()} km).`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await rentalApi.returnVehicle({
        rentalId: rental.id,
        endMileage: Number(endMileage),
        endFuelLevel,
        conditionNotes,
        sendToMaintenance,
        damageCharges: Number(damageCharges || 0),
        fuelCharges: Number(fuelCharges || 0),
        additionalAdjustment: Number(additionalAdjustment || 0),
      });

      navigate('/admin/rentals');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to process vehicle return and settlement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading active rental agreement...</div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0426' }}>Rental Agreement Not Found</h2>
        <p style={{ color: '#685D73', marginBottom: '24px' }}>
          The rental ID could not be located in active records.
        </p>
        <Link
          to="/admin/rentals"
          style={{
            padding: '10px 20px',
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Return to Rentals List
        </Link>
      </div>
    );
  }

  const distanceDriven = Math.max(0, endMileage - rental.startMileage);
  const currency = settlementPreview?.currency || 'PKR';

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Rentals', href: '/admin/rentals' },
          { label: `Return #${rental.booking.bookingNumber}` },
        ]}
        title="Vehicle Return & Contract Settlement Engine"
        subtitle={`Finalize Agreement #${rental.booking.bookingNumber}. Compute verified odometer distance, late hours, damage deductions, and reconcile security deposits according to the locked pricing snapshot.`}
      />

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Vehicle & Handover Baseline Summary */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #ECEAEF',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <img
            src={rental.vehicle.primaryImageUrl || '/cars/car-4-tucson.png'}
            alt=""
            style={{
              width: '100px',
              height: '70px',
              borderRadius: '10px',
              objectFit: 'cover',
              backgroundColor: '#F7F5F8',
            }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>VEHICLE</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E0426' }}>
              {rental.vehicle.brand} {rental.vehicle.model}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
              Plate: <strong>{rental.vehicle.registrationNumber}</strong>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>CUSTOMER</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E0426' }}>
            {rental.booking.customer.fullName}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
            {rental.booking.customer.email} • {rental.booking.customer.phone || 'No phone'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>PRICING ENGINE CONTRACT</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6C1E84', textTransform: 'uppercase' }}>
            {settlementPreview?.pricingMethod || 'LOCKED SNAPSHOT'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
            Agreed Quoted: {currency} {Number(rental.booking.totalAmount).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Return Readings Form */}
      <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Step 1: Odometer & Fuel Verification */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1E0426', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={18} color="#6C1E84" />
            <span>1. Odometer Readings & Fuel Verification</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Start Baseline */}
            <div style={{ padding: '16px', backgroundColor: '#FAF9FB', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>DISPATCH BASELINE</div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.875rem', color: '#1E0426' }}>
                  Departure Odometer: <strong>{rental.startMileage.toLocaleString()} km</strong>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1E0426' }}>
                  Departure Fuel: <strong>{rental.startFuelLevel}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                  Dispatched: {new Date(rental.startedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* End Mileage */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Verified Return Odometer (KM) *
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F7F5F8',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  padding: '10px 14px',
                }}
              >
                <Gauge size={18} color="#685D73" />
                <input
                  type="number"
                  min={rental.startMileage}
                  required
                  value={endMileage}
                  onChange={(e) => setEndMileage(Number(e.target.value))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '1rem',
                    fontWeight: 700,
                    width: '100%',
                    color: '#1E0426',
                  }}
                />
                <span style={{ fontSize: '0.8125rem', color: '#685D73', fontWeight: 600 }}>KM</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600, marginTop: '6px' }}>
                Total Verified Distance: +{distanceDriven.toLocaleString()} km
              </div>
            </div>

            {/* End Fuel Level */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Return Fuel Level *
              </label>
              <CustomSelect
                value={endFuelLevel}
                onChange={(val) => setEndFuelLevel(val)}
                options={[
                  { value: '100%', label: '100% (Full Tank)', icon: <Droplet size={16} color="#059669" /> },
                  { value: '90%', label: '90%', icon: <Droplet size={16} color="#059669" /> },
                  { value: '75%', label: '75% (3/4 Tank)', icon: <Droplet size={16} color="#059669" /> },
                  { value: '50%', label: '50% (Half Tank)', icon: <Droplet size={16} color="#D97706" /> },
                  { value: '25%', label: '25% (Low)', icon: <Droplet size={16} color="#DC2626" /> },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Additional Charges & Adjustments */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1E0426', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#6C1E84" />
            <span>2. Damages, Refueling & Contract Deductions</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Physical Damage Repair Cost ({currency})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={damageCharges}
                onChange={(e) => setDamageCharges(Number(e.target.value))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#F7F5F8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                Deducted from security deposit or billed on settlement.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Fuel Discrepancy / Refueling Fee ({currency})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={fuelCharges}
                onChange={(e) => setFuelCharges(Number(e.target.value))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#F7F5F8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                Applicable if return tank is below departure baseline.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Manual Adjustment / Concession ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={additionalAdjustment}
                onChange={(e) => setAdditionalAdjustment(Number(e.target.value))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#F7F5F8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                Positive for additional fee, negative for goodwill discount.
              </div>
            </div>
          </div>

          {/* Condition Notes */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
              Inspection Remarks & Settlement Notes
            </label>
            <textarea
              rows={2}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #ECEAEF',
                backgroundColor: '#F7F5F8',
                fontSize: '0.875rem',
                color: '#1E0426',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Step 3: Real-Time Settlement Calculation Breakdown */}
        {settlementPreview && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid #6C1E84',
              boxShadow: '0 4px 16px rgba(108, 30, 132, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E0426' }}>
                  Final Settlement Calculation & Reconciled Statement
                </h3>
              </div>
              {isCalculatingSettlement && (
                <div style={{ fontSize: '0.8rem', color: '#6C1E84', fontWeight: 600 }}>
                  Recalculating...
                </div>
              )}
            </div>

            {/* Durational & Mileage Verification Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ padding: '12px 16px', backgroundColor: '#FAF5FB', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> DURATION BILLED
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E0426', marginTop: '2px' }}>
                  {settlementPreview.actualDuration?.billableDays} Days ({settlementPreview.actualDuration?.totalHours} hrs)
                </div>
                {settlementPreview.actualDuration?.lateHours > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
                    Late Return: +{settlementPreview.actualDuration.lateHours} hrs past grace
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: '#FAF5FB', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Gauge size={12} /> VERIFIED DISTANCE
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E0426', marginTop: '2px' }}>
                  {settlementPreview.mileage?.actualKm} km total
                </div>
                <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '2px' }}>
                  Included: {settlementPreview.mileage?.includedKm} km • Extra: {settlementPreview.mileage?.extraKm} km
                </div>
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> HELD DEPOSIT
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E40AF', marginTop: '2px' }}>
                  {currency} {Number(settlementPreview.deposit?.heldDeposit || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: '2px' }}>
                  Deductions: {currency} {Number(settlementPreview.deposit?.deductions || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Line-item breakdown */}
            <div style={{ borderTop: '1px solid #ECEAEF', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                Settlement Line Items:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settlementPreview.breakdown?.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: '#1E0426', fontWeight: 600 }}>{item.description}</span>
                      <span style={{ fontSize: '0.75rem', color: '#685D73', marginLeft: '6px' }}>
                        ({item.quantity} {item.unit})
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: item.amount < 0 ? '#059669' : '#1E0426' }}>
                      {currency} {Number(item.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary & Net Balance */}
            <div
              style={{
                backgroundColor: '#FAF5FB',
                border: '1px solid #E6D8ED',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#685D73' }}>
                <span>Final Earned Rental Charges:</span>
                <span style={{ fontWeight: 700, color: '#1E0426' }}>
                  {currency} {Number(settlementPreview.charges?.finalRentalTotal || 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#685D73' }}>
                <span>Previously Collected Payment:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  - {currency} {Number(settlementPreview.financialSummary?.previouslyPaid || 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#685D73' }}>
                <span>Refundable Deposit Refund Amount:</span>
                <span style={{ fontWeight: 700, color: '#2563EB' }}>
                  {currency} {Number(settlementPreview.deposit?.refundAmount || 0).toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  borderTop: '2px solid #E6D8ED',
                  paddingTop: '12px',
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>
                    {settlementPreview.financialSummary?.netBalanceDue > 0
                      ? 'Additional Payment Due from Customer:'
                      : settlementPreview.financialSummary?.netBalanceDue < 0
                        ? 'Net Refund Payable to Customer:'
                        : 'Account Fully Reconciled:'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                    Calculated via immutable contract snapshot. Excludes unearned deposits from revenue.
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color:
                      settlementPreview.financialSummary?.netBalanceDue > 0
                        ? '#DC2626'
                        : settlementPreview.financialSummary?.netBalanceDue < 0
                          ? '#059669'
                          : '#1E0426',
                  }}
                >
                  {currency} {Math.abs(Number(settlementPreview.financialSummary?.netBalanceDue || 0)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workshop Routing Toggle */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 24px', border: '1px solid #ECEAEF' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={sendToMaintenance}
              onChange={(e) => setSendToMaintenance(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#1E0426' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} color={sendToMaintenance ? '#DC2626' : '#685D73'} />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E0426' }}>
                Route vehicle to Workshop Maintenance (Do not make available for immediate re-booking)
              </span>
            </div>
          </label>
        </div>

        {/* AI Inspection Recommendation Banner */}
        <div
          style={{
            backgroundColor: 'rgba(250, 184, 38, 0.12)',
            border: '1px solid #FAB826',
            borderRadius: '14px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Sparkles size={24} color="#D97706" />
            <div>
              <div style={{ fontWeight: 800, color: '#1E0426', fontSize: '0.95rem' }}>
                Perform AI Computer Vision Damage Inspection
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                Run an instant multi-angle photo analysis to compare against baseline pickup scans and detect scratches, dents, or chips.
              </div>
            </div>
          </div>
          <Link
            to={`/admin/inspections/new?vehicleId=${rental.vehicleId}&rentalId=${rental.id}&type=RETURN`}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={14} />
            <span>Launch AI Scanner</span>
          </Link>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap', paddingBottom: '40px' }}>
          <Link
            to="/admin/rentals"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #ECEAEF',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#685D73',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 32px',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(30, 4, 38, 0.25)',
            }}
          >
            {submitting ? (
              <>
                <RotateCcw size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Finalizing Settlement...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} color="#FAB826" />
                <span>Complete Return & Settle Contract</span>
              </>
            )}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
