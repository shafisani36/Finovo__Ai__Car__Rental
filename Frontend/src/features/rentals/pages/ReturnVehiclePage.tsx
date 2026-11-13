import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ScanLine, Wrench } from 'lucide-react';
import { rentalApi, type RentalRecord, type SettlementPreview } from '../api/rentalApi';
import {
  inspectionApi,
  type DamageComparison,
  type InspectionReport,
  type InspectionView,
} from '../../inspections/api/inspectionApi';
import { VehiclePhotoCapture } from '../../inspections/components/VehiclePhotoCapture';
import {
  missingRequiredViews,
  toAnalyzePhotos,
  VIEW_LABELS,
  type CapturedPhotos,
} from '../../inspections/components/inspectionHelpers';
import { DamageComparisonView } from '../../inspections/components/DamageComparisonView';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader } from '../../../components/common';
import { formatMoney, getCarImage, APP_CURRENCY } from '../../../utils/carImageHelper';
import '../../inspections/components/inspection.css';

const FUEL_LEVELS = ['100%', '75%', '50%', '25%', '10%'].map((v) => ({ value: v, label: v }));

const card: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #ECEAEF',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 22px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: '#1E0426',
  color: '#FFFFFF',
  fontWeight: 700,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = { padding: '10px 12px', borderRadius: '10px', border: '1px solid #ECEAEF' };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ReturnVehiclePage() {
  const { rentalId } = useParams<{ rentalId: string }>();
  const navigate = useNavigate();

  const [rental, setRental] = useState<RentalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: AI return inspection compared with the pickup inspection
  const [photos, setPhotos] = useState<CapturedPhotos>({});
  const [scanning, setScanning] = useState(false);
  const [returnInspection, setReturnInspection] = useState<InspectionReport | null>(null);
  const [comparison, setComparison] = useState<DamageComparison | null>(null);

  // Step 2: settlement
  const [endMileage, setEndMileage] = useState('');
  const [endFuelLevel, setEndFuelLevel] = useState('100%');
  const [fuelCharge, setFuelCharge] = useState('0');
  const [additionalAdjustment, setAdditionalAdjustment] = useState('0');
  const [conditionNotes, setConditionNotes] = useState('');
  const [sendToMaintenance, setSendToMaintenance] = useState(false);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!rentalId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await rentalApi.getRentalById(rentalId);
        if (!active) return;
        setRental(res.rental);
        // Resume an already-run return inspection (e.g. after a page refresh)
        const existingReturn = [...(res.rental.inspections || [])]
          .filter((i) => i.type === 'RETURN')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (existingReturn && res.rental.status === 'ACTIVE') {
          const detail = await inspectionApi.getInspectionById(existingReturn.id);
          if (!active) return;
          setReturnInspection(detail.inspection);
          setComparison(detail.inspection.comparison || null);
        }
      } catch (err) {
        if (active) setLoadError(errorMessage(err, 'Failed to load rental'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [rentalId]);

  const pickupInspection = rental?.inspections?.find((i) => i.type === 'PICKUP');
  const pickupReferencePhotos = useMemo(() => {
    const refs: Partial<Record<InspectionView, string>> = {};
    for (const p of pickupInspection?.photos || []) refs[p.view as InspectionView] = p.imageUrl;
    return refs;
  }, [pickupInspection]);
  const missingViews = missingRequiredViews(photos);
  const currency = rental?.booking.currency || APP_CURRENCY;

  // Live settlement preview (damage fines come from the comparison on the server)
  const mileageNumber = Number(endMileage);
  const mileageValid = endMileage.trim() !== '' && Number.isFinite(mileageNumber) && rental !== null && mileageNumber >= rental.startMileage;
  const chargesKey = comparison ? comparison.charges.map((c) => `${c.id}:${c.status}`).join(',') : '';
  useEffect(() => {
    if (!rental || !returnInspection || !mileageValid) {
      setPreview(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await rentalApi.previewSettlement({
          rentalId: rental.id,
          endMileage: mileageNumber,
          endFuelLevel,
          returnInspectionId: returnInspection.id,
          fuelDiscrepancyCharge: Number(fuelCharge) || 0,
          additionalAdjustment: Number(additionalAdjustment) || 0,
        });
        if (active) {
          setPreview(res.settlement);
          setPreviewError(null);
        }
      } catch (err) {
        if (active) {
          setPreview(null);
          setPreviewError(errorMessage(err, 'Could not calculate the settlement'));
        }
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [rental, returnInspection, mileageValid, mileageNumber, endFuelLevel, fuelCharge, additionalAdjustment, chargesKey]);

  const runScan = async () => {
    if (!rental) return;
    if (missingViews.length > 0) {
      setError(`Take the required photos first: ${missingViews.map((v) => VIEW_LABELS[v]).join(', ')}`);
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const res = await inspectionApi.analyze({ type: 'RETURN', rentalId: rental.id, photos: toAnalyzePhotos(photos) });
      setReturnInspection(res.inspection);
      setComparison(res.inspection.comparison || null);
      // New damage usually means the car needs repair before the next booking
      setSendToMaintenance(Boolean(res.inspection.comparison && res.inspection.comparison.newDamageCount > 0));
    } catch (err) {
      setError(errorMessage(err, 'The AI inspection failed. Please try again.'));
    } finally {
      setScanning(false);
    }
  };

  const completeReturn = async () => {
    if (!rental || !returnInspection) return;
    if (!mileageValid) {
      setError(`Enter the odometer reading (at least ${rental.startMileage} km)`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await rentalApi.returnVehicle({
        rentalId: rental.id,
        endMileage: mileageNumber,
        endFuelLevel,
        returnInspectionId: returnInspection.id,
        fuelDiscrepancyCharge: Number(fuelCharge) || 0,
        additionalAdjustment: Number(additionalAdjustment) || 0,
        conditionNotes: conditionNotes || undefined,
        sendToMaintenance,
      });
      navigate('/admin/rentals');
    } catch (err) {
      setError(errorMessage(err, 'Failed to complete the return'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading rental…</div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0426' }}>Rental not found</h2>
        <p style={{ color: '#685D73', marginBottom: '24px' }}>{loadError}</p>
        <Link to="/admin/rentals" style={{ ...primaryButton, textDecoration: 'none' }}>
          Back to rentals
        </Link>
      </div>
    );
  }

  const blockedReason =
    rental.status !== 'ACTIVE'
      ? 'This rental has already been returned.'
      : !pickupInspection
        ? 'This rental has no pickup inspection, so the return cannot be compared automatically.'
        : null;
  const isClean = comparison ? comparison.newDamageCount === 0 && comparison.totalActiveCharges === 0 : false;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Rentals', href: '/admin/rentals' }, { label: `Return #${rental.booking.bookingNumber}` }]}
        title="Vehicle return"
        subtitle="Scan the car with AI, compare with the pickup inspection, then settle and close the rental."
      />

      {(error || blockedReason) && (
        <div
          role="alert"
          style={{
            border: '1px solid #EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>{blockedReason || error}</span>
        </div>
      )}

      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <img
            src={getCarImage(rental.vehicle)}
            alt=""
            style={{ width: '100px', height: '70px', borderRadius: '10px', objectFit: 'cover', backgroundColor: '#F7F5F8' }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>VEHICLE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>
              {rental.vehicle.brand} {rental.vehicle.model}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
              Plate: {rental.vehicle.registrationNumber} · Out at {rental.startMileage} km, fuel {rental.startFuelLevel}
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>RENTER</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>{rental.booking.customer.fullName}</div>
          <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
            Due back {new Date(rental.booking.returnDateTime).toLocaleString()}
          </div>
          {pickupInspection && (
            <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
              Condition at pickup: <strong>{pickupInspection.overallScore}%</strong>
            </div>
          )}
        </div>
      </div>

      {!blockedReason && (
        <>
          {/* Step 1 */}
          <section style={card}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <ScanLine size={20} /> Step 1 · AI return inspection
            </h3>
            {!comparison ? (
              <>
                <p style={{ margin: 0, color: '#685D73', fontSize: '0.875rem' }}>
                  Take each photo from the same angle as at pickup (the faded pickup photo is shown as a guide). The AI
                  compares both photos side by side and only charges damage that was not there at pickup.
                </p>
                <VehiclePhotoCapture
                  value={photos}
                  onChange={setPhotos}
                  disabled={scanning}
                  referencePhotos={pickupReferencePhotos}
                />
                {scanning ? (
                  <div className="insp-progress" role="status">
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    AI is comparing the return photos with the pickup photos. This usually takes 20-90 seconds…
                  </div>
                ) : (
                  <button
                    type="button"
                    style={{ ...primaryButton, opacity: missingViews.length === 0 ? 1 : 0.5, alignSelf: 'flex-start' }}
                    disabled={missingViews.length > 0}
                    onClick={runScan}
                  >
                    <ScanLine size={18} /> Run AI inspection and compare
                  </button>
                )}
              </>
            ) : (
              <>
                <div
                  role="status"
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    border: `1px solid ${isClean ? '#10B981' : '#EF4444'}`,
                    color: isClean ? '#047857' : '#B91C1C',
                    backgroundColor: isClean ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                  }}
                >
                  {isClean ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  {isClean
                    ? 'Return report matches the pickup report. The car can be returned without a damage fine.'
                    : `New damage found. A fine of ${formatMoney(comparison.totalActiveCharges, comparison.currency)} will be added to the settlement. Waive any item you do not want to charge.`}
                </div>
                <DamageComparisonView comparison={comparison} onChange={setComparison} editable />
              </>
            )}
          </section>

          {/* Step 2 */}
          <section style={{ ...card, opacity: comparison ? 1 : 0.55 }} aria-disabled={!comparison}>
            <h3 style={{ margin: 0, color: '#1E0426' }}>Step 2 · Settlement and return</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                Odometer (km)
                <input
                  type="number"
                  min={rental.startMileage}
                  inputMode="numeric"
                  value={endMileage}
                  disabled={!comparison}
                  onChange={(e) => setEndMileage(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                Fuel level
                <CustomSelect
                  value={endFuelLevel}
                  onChange={(v) => setEndFuelLevel(String(v))}
                  options={FUEL_LEVELS}
                  disabled={!comparison}
                  size="md"
                />
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                Fuel charge ({currency})
                <input
                  type="number"
                  min={0}
                  value={fuelCharge}
                  disabled={!comparison}
                  onChange={(e) => setFuelCharge(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                Other adjustment ({currency})
                <input
                  type="number"
                  value={additionalAdjustment}
                  disabled={!comparison}
                  onChange={(e) => setAdditionalAdjustment(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <textarea
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder="Return notes (optional)"
              rows={2}
              disabled={!comparison}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            {previewError && <p className="insp-capture-error">{previewError}</p>}
            {preview && (
              <div className="insp-table-wrap">
                <table className="insp-table">
                  <tbody>
                    <tr>
                      <td>Distance driven</td>
                      <td>
                        {preview.odometer.actualDistanceTraveled} km
                        {preview.odometer.extraKm > 0 ? ` (${preview.odometer.extraKm} km extra)` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td>Extra km charge</td>
                      <td>{formatMoney(preview.breakdown.extraKmCharge, preview.currency, 2)}</td>
                    </tr>
                    <tr>
                      <td>Late return {preview.duration.lateHours > 0 ? `(${preview.duration.lateHours} h)` : ''}</td>
                      <td>{formatMoney(preview.breakdown.lateFee, preview.currency, 2)}</td>
                    </tr>
                    <tr>
                      <td>Damage fine (AI comparison)</td>
                      <td>{formatMoney(preview.breakdown.damageCharge, preview.currency, 2)}</td>
                    </tr>
                    <tr>
                      <td>Fuel charge</td>
                      <td>{formatMoney(preview.breakdown.fuelCharge, preview.currency, 2)}</td>
                    </tr>
                    <tr>
                      <td>Deducted from deposit</td>
                      <td>{formatMoney(preview.depositAccounting.deductions, preview.currency, 2)}</td>
                    </tr>
                    <tr>
                      <td>Deposit refund to customer</td>
                      <td>{formatMoney(preview.depositAccounting.refundableDeposit, preview.currency, 2)}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>{preview.financialSummary.isRefundDue ? 'Refund to customer' : 'Customer still owes'}</strong>
                      </td>
                      <td>
                        <strong>
                          {formatMoney(Math.abs(preview.financialSummary.netPayableOrRefund), preview.currency, 2)}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <label
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: '14px',
                borderRadius: '12px',
                border: `1px solid ${sendToMaintenance ? '#DC2626' : '#ECEAEF'}`,
                backgroundColor: sendToMaintenance ? 'rgba(220,38,38,0.05)' : '#FFFFFF',
                cursor: comparison ? 'pointer' : 'not-allowed',
              }}
            >
              <input
                type="checkbox"
                checked={sendToMaintenance}
                disabled={!comparison}
                onChange={(e) => setSendToMaintenance(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#DC2626', marginTop: '2px' }}
              />
              <span>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E0426' }}>
                  <Wrench size={16} /> Send to garage
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#685D73' }}>
                  The car is marked as in maintenance and cannot be booked until the repair is completed in the car's
                  maintenance tab.
                </span>
              </span>
            </label>

            <button
              type="button"
              style={{ ...primaryButton, opacity: comparison && mileageValid && !submitting ? 1 : 0.5, alignSelf: 'flex-start' }}
              disabled={!comparison || !mileageValid || submitting}
              onClick={completeReturn}
            >
              <CheckCircle2 size={18} />
              {submitting ? 'Completing…' : sendToMaintenance ? 'Complete return and send to garage' : 'Complete return'}
            </button>
          </section>
        </>
      )}
    </PageContainer>
  );
}
