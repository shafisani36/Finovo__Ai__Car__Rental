import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { rentalApi } from '../api/rentalApi';
import type { RentalRecord, SettlementLineItem, SettlementPreview } from '../api/rentalApi';
import { inspectionApi } from '../../inspections/api/inspectionApi';
import {
  InspectionAiEngine,
  type ClientInspectionReport,
  type ClientComparisonReport,
} from '../../inspections/services/inspectionAiEngine';
import { AiCameraScannerModal } from '../../inspections/components/AiCameraScannerModal';
import { InspectionReportPdfModal } from '../../inspections/components/InspectionReportPdfModal';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Droplet,
  Wrench,
  Sparkles,
  DollarSign,
  ShieldCheck,
  Clock,
  Layers,
  Camera,
  FileText,
  ArrowRight,
  GitCompare,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader, Button } from '../../../components/common';
import { getCarImage } from '../../../utils/carImageHelper';

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
  const [settlementPreview, setSettlementPreview] = useState<SettlementPreview | null>(null);
  const [isCalculatingSettlement, setIsCalculatingSettlement] = useState<boolean>(false);

  // Return AI Scan + Pickup vs Return Comparison Engine
  const [pickupBaselineReport, setPickupBaselineReport] = useState<ClientInspectionReport | null>(null);
  const [pickupInspectionId, setPickupInspectionId] = useState<string | null>(null);
  const [returnScanReport, setReturnScanReport] = useState<ClientInspectionReport | null>(null);
  const [savedReturnInspectionId, setSavedReturnInspectionId] = useState<string | null>(null);
  const [comparisonReport, setComparisonReport] = useState<ClientComparisonReport | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSavingReturnScan, setIsSavingReturnScan] = useState(false);

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

        const vehicleMeta = {
          brand: res.rental.vehicle.brand,
          model: res.rental.vehicle.model,
          year: res.rental.vehicle.year,
          registrationNumber: res.rental.vehicle.registrationNumber,
          primaryImageUrl: getCarImage(res.rental.vehicle),
        };

        const pickupIns = res.rental.inspections?.find((ins) => ins.type === 'PICKUP');
        const returnIns = [...(res.rental.inspections || [])]
          .reverse()
          .find((ins) => ins.type === 'RETURN');

        let builtPickup: ClientInspectionReport | null = null;
        if (pickupIns) {
          builtPickup = InspectionAiEngine.fromServerRecord(pickupIns, vehicleMeta);
          setPickupBaselineReport(builtPickup);
          setPickupInspectionId(pickupIns.id);
        }

        if (returnIns) {
          const builtReturn = InspectionAiEngine.fromServerRecord(returnIns, vehicleMeta);
          setReturnScanReport(builtReturn);
          setSavedReturnInspectionId(returnIns.id);

          const baselineForCmp =
            builtPickup ||
            InspectionAiEngine.fromServerRecord(
              {
                id: 'baseline-default',
                type: 'PICKUP',
                overallScore: 100,
                summary: 'Clean baseline recorded at booking confirmation.',
                createdAt: res.rental.pickedUpAt || res.rental.createdAt,
                findings: [],
              },
              vehicleMeta
            );

          const depositAmt = Number(
            (res.rental.booking as { depositAmount?: number })?.depositAmount || 5000
          );
          const cmp = InspectionAiEngine.compareReports(baselineForCmp, builtReturn, depositAmt);
          setComparisonReport(cmp);
          if (cmp.totalProposedCharges > 0) {
            setDamageCharges(cmp.totalProposedCharges);
          }
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.message || e.response?.data?.message || 'Failed to retrieve rental record');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnScanCompleted = async (clientReport: ClientInspectionReport) => {
    if (!rental) return;
    setReturnScanReport(clientReport);

    const vehicleMeta = {
      brand: rental.vehicle.brand,
      model: rental.vehicle.model,
      year: rental.vehicle.year,
      registrationNumber: rental.vehicle.registrationNumber,
      primaryImageUrl: getCarImage(rental.vehicle),
    };

    const baselineForCompare =
      pickupBaselineReport ||
      InspectionAiEngine.fromServerRecord(
        {
          id: 'baseline-default',
          type: 'PICKUP',
          overallScore: 100,
          summary: 'Standard clean condition prior to key release.',
          createdAt: rental.pickedUpAt || rental.createdAt,
          findings: [],
        },
        vehicleMeta
      );

    const depositAmt = Number(
      settlementPreview?.depositAccounting?.originalDeposit ||
        (rental.booking as { depositAmount?: number })?.depositAmount ||
        5000
    );

    try {
      setIsSavingReturnScan(true);
      const analyzed = await inspectionApi.analyze({
        vehicleId: rental.vehicleId,
        rentalId: rental.id,
        pickupInspectionId: pickupInspectionId || undefined,
        type: 'RETURN',
        photos: clientReport.photos.map((p) => ({
          view: (p.view as 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR' | 'ROOF' | 'INTERIOR') || 'FRONT',
          imageUrl: p.imageUrl,
          pixelTelemetry: p.pixelTelemetry,
        })),
      });

      let finalReturnReport = clientReport;
      if (analyzed.success && analyzed.inspection) {
        setSavedReturnInspectionId(analyzed.inspection.id);
        finalReturnReport = InspectionAiEngine.fromServerRecord(analyzed.inspection, vehicleMeta);
        setReturnScanReport(finalReturnReport);

        if (pickupInspectionId) {
          await inspectionApi.compare({
            bookingId: rental.booking.id,
            pickupInspectionId,
            returnInspectionId: analyzed.inspection.id,
            securityDeposit: depositAmt,
          }).catch(() => {});
        }
      }

      const cmp = InspectionAiEngine.compareReports(baselineForCompare, finalReturnReport, depositAmt);
      setComparisonReport(cmp);
      setDamageCharges(cmp.totalProposedCharges);
    } catch (err) {
      console.warn('Return AI inspection DB sync warning, using computed comparison:', err);
      const cmp = InspectionAiEngine.compareReports(baselineForCompare, clientReport, depositAmt);
      setComparisonReport(cmp);
      setDamageCharges(cmp.totalProposedCharges);
    } finally {
      setIsSavingReturnScan(false);
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
          damageCharge: Number(damageCharges || 0),
          fuelDiscrepancyCharge: Number(fuelCharges || 0),
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
        damageCharge: Number(damageCharges || 0),
        fuelDiscrepancyCharge: Number(fuelCharges || 0),
        additionalAdjustment: Number(additionalAdjustment || 0),
      });

      navigate('/admin/rentals');
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.message || e.response?.data?.message || 'Failed to process vehicle return and settlement');
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
  const dispatchedDate = rental.pickedUpAt || rental.startedAt || rental.createdAt;
  const settlementLineItems: SettlementLineItem[] = Array.isArray(settlementPreview?.lineItems)
    ? settlementPreview.lineItems
    : Array.isArray((settlementPreview as unknown as { breakdown?: unknown })?.breakdown)
      ? ((settlementPreview as unknown as { breakdown: SettlementLineItem[] }).breakdown)
      : [];
  const durationHours = settlementPreview?.duration?.actualHours ?? 0;
  const agreedHours = settlementPreview?.duration?.agreedHours ?? 0;
  const billableDays = Math.max(1, Math.ceil((agreedHours || durationHours || 24) / 24));
  const lateHours = settlementPreview?.duration?.lateHours ?? 0;
  const verifiedDistance = settlementPreview?.odometer?.actualDistanceTraveled ?? distanceDriven;
  const includedKm = settlementPreview?.odometer?.includedKm ?? 0;
  const extraKm = settlementPreview?.odometer?.extraKm ?? 0;
  const heldDeposit = Number(settlementPreview?.depositAccounting?.originalDeposit ?? 0);
  const depositDeductions = Number(settlementPreview?.depositAccounting?.deductions ?? 0);
  const depositRefund = Number(settlementPreview?.depositAccounting?.refundableDeposit ?? 0);
  const finalRentalTotal = Number(
    settlementPreview?.breakdown?.finalRentalTotal ??
      settlementPreview?.financialSummary?.totalBilled ??
      0
  );
  const amountAlreadyPaid = Number(settlementPreview?.financialSummary?.amountAlreadyPaid ?? 0);
  const netBalance = Number(settlementPreview?.financialSummary?.netPayableOrRefund ?? 0);

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <img
            src={getCarImage(rental.vehicle)}
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
                <div style={{ fontSize: '0.75rem', color: '#8A7090' }}>
                  Dispatched: {dispatchedDate ? new Date(dispatchedDate).toLocaleString() : 'N/A'}
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
              <div style={{ padding: '12px 16px', backgroundColor: '#FAF6FC', border: '1px solid #EFEAEF', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8A7090', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> DURATION BILLED
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E0432', marginTop: '3px' }}>
                  {billableDays} {billableDays === 1 ? 'Day' : 'Days'} ({durationHours} hrs)
                </div>
                {lateHours > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#B91C1C', fontWeight: 700, marginTop: '3px' }}>
                    Late Return: +{lateHours} hrs past grace
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: '#FAF6FC', border: '1px solid #EFEAEF', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#8A7090', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Gauge size={12} /> VERIFIED DISTANCE
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E0432', marginTop: '3px' }}>
                  {verifiedDistance.toLocaleString()} km total
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4A315A', marginTop: '3px' }}>
                  Included: {includedKm.toLocaleString()} km • Extra: {extraKm.toLocaleString()} km
                </div>
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: '#F5EEF8', border: '1px solid #E0D8E3', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6C1E84', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> HELD DEPOSIT
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E0432', marginTop: '3px' }}>
                  {currency} {heldDeposit.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6C1E84', fontWeight: 600, marginTop: '3px' }}>
                  Deductions: {currency} {depositDeductions.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Line-item breakdown */}
            <div style={{ borderTop: '1px solid #EFEAEF', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A315A', marginBottom: '10px' }}>
                Settlement Line Items:
              </div>
              {settlementLineItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {settlementLineItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.875rem' }}>
                      <div>
                        <span style={{ color: '#1E0432', fontWeight: 600 }}>{item.description}</span>
                        <span style={{ fontSize: '0.75rem', color: '#8A7090', marginLeft: '6px' }}>
                          ({item.quantity} {item.unit})
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: item.amount < 0 ? '#057A55' : '#1E0432', whiteSpace: 'nowrap' }}>
                        {currency} {Number(item.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#8A7090' }}>
                  No itemized settlement charges recorded yet.
                </div>
              )}
            </div>

            {/* Financial Summary & Net Balance */}
            <div
              style={{
                backgroundColor: '#FAF6FC',
                border: '1px solid #E0D8E3',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#4A315A' }}>
                <span>Final Earned Rental Charges:</span>
                <span style={{ fontWeight: 700, color: '#1E0432' }}>
                  {currency} {finalRentalTotal.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#4A315A' }}>
                <span>Previously Collected Payment:</span>
                <span style={{ fontWeight: 700, color: '#057A55' }}>
                  - {currency} {amountAlreadyPaid.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#4A315A' }}>
                <span>Refundable Deposit Refund Amount:</span>
                <span style={{ fontWeight: 700, color: '#6C1E84' }}>
                  {currency} {depositRefund.toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  borderTop: '2px solid #E0D8E3',
                  paddingTop: '12px',
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#1E0432' }}>
                    {netBalance > 0
                      ? 'Additional Payment Due from Customer:'
                      : netBalance < 0
                        ? 'Net Refund Payable to Customer:'
                        : 'Account Fully Reconciled:'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8A7090' }}>
                    Calculated via immutable contract snapshot. Excludes unearned deposits from revenue.
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color:
                      netBalance > 0
                        ? '#B91C1C'
                        : netBalance < 0
                          ? '#057A55'
                          : '#1E0432',
                  }}
                >
                  {currency} {Math.abs(netBalance).toLocaleString()}
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

        {/* Return AI Scan & Pickup-vs-Return Comparison Engine */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E0432 0%, #2E0949 100%)',
            color: '#FFFFFF',
            border: '1.5px solid rgba(250, 184, 38, 0.3)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 10px 28px rgba(30, 4, 50, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(250, 184, 38, 0.18)',
                    color: '#FAB826',
                    border: '1px solid rgba(250, 184, 38, 0.4)',
                    textTransform: 'uppercase',
                  }}
                >
                  Pickup Baseline vs Return Scan Delta
                </span>
                {isSavingReturnScan && (
                  <span style={{ fontSize: '0.75rem', color: '#FAB826', fontWeight: 700 }}>
                    Saving & Comparing Reports...
                  </span>
                )}
              </div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-family-display, 'Archivo', sans-serif)",
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={19} color="#FAB826" />
                Return AI Damage Scan & Baseline Comparison
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.74)' }}>
                Scan the returned vehicle and compare automatically with the pre-handover pickup inspection to isolate new damage.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {comparisonReport && (
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() => setIsPdfModalOpen(true)}
                >
                  <FileText size={15} />
                  <span>Comparison PDF</span>
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                disabled={isSavingReturnScan}
              >
                <Camera size={16} />
                <span>{returnScanReport ? 'Re-Scan Return Angles' : 'Run Return AI Scan'}</span>
              </Button>
            </div>
          </div>

          {/* Side-by-side Pickup vs Return Score Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FAB826', textTransform: 'uppercase' }}>
                1. Before Key Handover (Pickup Baseline)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34D399' }}>
                  {pickupBaselineReport ? `${pickupBaselineReport.overallScore}%` : '100%'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.72)' }}>
                  {pickupBaselineReport ? `${pickupBaselineReport.findings.length} Pre-Existing Marks` : 'Default Clean Baseline'}
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FAB826', textTransform: 'uppercase' }}>
                2. Upon Return (Post-Handover Scan)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: returnScanReport
                      ? returnScanReport.overallScore < (pickupBaselineReport?.overallScore ?? 100)
                        ? '#F87171'
                        : '#34D399'
                      : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {returnScanReport ? `${returnScanReport.overallScore}%` : 'Pending Scan'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.72)' }}>
                  {returnScanReport
                    ? `${returnScanReport.scratchesCount} Scratches • ${returnScanReport.dentsCount} Dents`
                    : 'Click Run Return AI Scan'}
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FAB826', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <GitCompare size={13} /> 3. Difference (Kya Farq Aaya)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: comparisonReport
                      ? comparisonReport.newDamageCount > 0
                        ? '#F87171'
                        : '#34D399'
                      : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {comparisonReport
                    ? comparisonReport.newDamageCount > 0
                      ? `+${comparisonReport.newDamageCount} New Incident(s)`
                      : '0 Differences'
                    : '—'}
                </span>
                {comparisonReport && comparisonReport.totalProposedCharges > 0 && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FAB826' }}>
                    {currency} {comparisonReport.totalProposedCharges.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Difference Breakdown */}
          {comparisonReport && (
            <div
              style={{
                backgroundColor: '#140220',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: comparisonReport.newDamageCount > 0 ? '#FCA5A5' : '#6EE7B7' }}>
                {comparisonReport.summary}
              </div>

              {comparisonReport.preExistingDamages.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Pre-Existing at Handover (Excluded — Customer Liability: {currency} 0)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {comparisonReport.preExistingDamages.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span>
                          ✓ <strong>{item.damageType}</strong> • {item.location} ({item.view})
                        </span>
                        <span style={{ color: '#6EE7B7', fontWeight: 700 }}>Pre-Existing ($0)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comparisonReport.newDamages.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FCA5A5', textTransform: 'uppercase', marginBottom: '6px' }}>
                    NEW Damages Detected After Return (Auto-Applied to Damage Charges)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {comparisonReport.newDamages.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          borderLeft: '3px solid #EF4444',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#FFFFFF' }}>{item.damageType}</strong> ({item.severity})
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.72)' }}>
                            {item.location} • Angle: {item.view} • Confidence: {item.confidence}%
                          </div>
                        </div>
                        <span style={{ color: '#FAB826', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          + {currency} {item.estimatedRepairCost.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {savedReturnInspectionId && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  <Link
                    to={`/admin/inspections/${savedReturnInspectionId}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#FAB826',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Review Bounding Boxes, Approve Claim, Dismiss or Send to Workshop</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap', paddingBottom: '40px' }}>
          <Link
            to="/admin/rentals"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E0D8E3',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#4A315A',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <RotateCcw size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Finalizing Settlement...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Complete Return & Settle Contract</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Return AI Camera Scanner Modal */}
      <AiCameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        inspectionType="RETURN"
        baselineReport={pickupBaselineReport}
        vehicle={{
          id: rental.vehicle.id,
          brand: rental.vehicle.brand,
          model: rental.vehicle.model,
          year: rental.vehicle.year,
          registrationNumber: rental.vehicle.registrationNumber,
          primaryImageUrl: getCarImage(rental.vehicle),
        }}
        onInspectionComplete={handleReturnScanCompleted}
        onOpenPdfReport={(rep) => {
          setReturnScanReport(rep);
          setIsScannerOpen(false);
          setIsPdfModalOpen(true);
        }}
      />

      {/* Pickup vs Return Comparison PDF Report Modal */}
      <InspectionReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        report={returnScanReport || pickupBaselineReport}
        comparisonReport={comparisonReport}
      />
    </PageContainer>
  );
}
