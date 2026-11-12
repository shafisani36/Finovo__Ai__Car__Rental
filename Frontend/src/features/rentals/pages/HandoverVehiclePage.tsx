import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, KeyRound, Loader2, RotateCcw, ScanLine, ShieldCheck } from 'lucide-react';
import { bookingApi, type Booking } from '../../bookings/api/bookingApi';
import { rentalApi } from '../api/rentalApi';
import { inspectionApi, type InspectionReport } from '../../inspections/api/inspectionApi';
import { VehiclePhotoCapture } from '../../inspections/components/VehiclePhotoCapture';
import {
  missingRequiredViews,
  toAnalyzePhotos,
  VIEW_LABELS,
  type CapturedPhotos,
} from '../../inspections/components/inspectionHelpers';
import { InspectionReportView } from '../../inspections/components/InspectionReportView';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader } from '../../../components/common';
import { getCarImage } from '../../../utils/carImageHelper';
import '../../inspections/components/inspection.css';

const FUEL_LEVELS = ['100%', '75%', '50%', '25%', '10%'].map((v) => ({ value: v, label: v }));
const HANDOVER_STATUSES = ['CONFIRMED', 'READY_FOR_PICKUP'];

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

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function HandoverVehiclePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: identity & document checks (must be ticked by staff, never pre-ticked)
  const [idVerified, setIdVerified] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);

  // Step 2: AI pickup inspection
  const [photos, setPhotos] = useState<CapturedPhotos>({});
  const [scanNotes, setScanNotes] = useState('');
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<InspectionReport | null>(null);

  // Step 3: key handover
  const [startMileage, setStartMileage] = useState('');
  const [startFuelLevel, setStartFuelLevel] = useState('100%');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await bookingApi.getById(bookingId);
        if (!active) return;
        setBooking(res.booking);
        const mileage = Number((res.booking.vehicle as { mileage?: number })?.mileage);
        if (Number.isFinite(mileage) && mileage > 0) setStartMileage(String(mileage));
      } catch (err) {
        if (active) setLoadError(errorMessage(err, 'Failed to load booking'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const checksDone = idVerified && licenseVerified && paymentVerified;
  const missingViews = missingRequiredViews(photos);

  const runScan = async () => {
    if (!booking) return;
    if (missingViews.length > 0) {
      setError(`Take the required photos first: ${missingViews.map((v) => VIEW_LABELS[v]).join(', ')}`);
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const res = await inspectionApi.analyze({
        type: 'PICKUP',
        bookingId: booking.id,
        notes: scanNotes || undefined,
        photos: toAnalyzePhotos(photos),
      });
      setReport(res.inspection);
    } catch (err) {
      setError(errorMessage(err, 'The AI inspection failed. Please try again.'));
    } finally {
      setScanning(false);
    }
  };

  const handover = async () => {
    if (!booking || !report) return;
    const mileage = Number(startMileage);
    if (!Number.isFinite(mileage) || mileage < 0 || startMileage.trim() === '') {
      setError('Enter the current odometer reading');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await rentalApi.handover({
        bookingId: booking.id,
        startMileage: mileage,
        startFuelLevel,
        notes: notes || undefined,
        pickupInspectionId: report.id,
      });
      navigate('/admin/rentals');
    } catch (err) {
      setError(errorMessage(err, 'Failed to hand over the vehicle'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading booking…</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0426' }}>Booking not found</h2>
        <p style={{ color: '#685D73', marginBottom: '24px' }}>{loadError}</p>
        <Link to="/admin/bookings" style={{ ...primaryButton, textDecoration: 'none' }}>
          Back to bookings
        </Link>
      </div>
    );
  }

  const blockedReason = booking.rental
    ? 'This booking has already been handed over.'
    : !HANDOVER_STATUSES.includes(booking.status)
      ? `This booking is ${booking.status} and cannot be handed over.`
      : null;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Bookings', href: '/admin/bookings' }, { label: `Handover #${booking.bookingNumber}` }]}
        title="Vehicle handover"
        subtitle="Verify the renter, scan the car with AI, then hand over the keys."
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

      {/* Booking summary */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <img
            src={getCarImage(booking.vehicle)}
            alt=""
            style={{ width: '100px', height: '70px', borderRadius: '10px', objectFit: 'cover', backgroundColor: '#F7F5F8' }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>VEHICLE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>
              {booking.vehicle.brand} {booking.vehicle.model}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#685D73' }}>Plate: {booking.vehicle.registrationNumber}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>RENTER</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>{booking.customer.fullName}</div>
          <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
            License: {booking.customer.driverLicenseNumber || 'not on file'} · {booking.customer.phone || booking.customer.email}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
            {new Date(booking.pickupDateTime).toLocaleString()} → {new Date(booking.returnDateTime).toLocaleString()}
          </div>
        </div>
      </div>

      {!blockedReason && (
        <>
          {/* Step 1 */}
          <section style={card}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <ShieldCheck size={20} /> Step 1 · Verify the renter
            </h3>
            {[
              { checked: idVerified, set: setIdVerified, label: 'CNIC / passport checked and matches the booking name' },
              { checked: licenseVerified, set: setLicenseVerified, label: 'Valid driving license seen in hand' },
              { checked: paymentVerified, set: setPaymentVerified, label: 'Payment and security deposit received' },
            ].map((item) => (
              <label key={item.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 600, color: '#1E0426' }}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={Boolean(report)}
                  onChange={(e) => item.set(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#1E0426' }}
                />
                {item.label}
              </label>
            ))}
          </section>

          {/* Step 2 */}
          <section style={{ ...card, opacity: checksDone ? 1 : 0.55 }} aria-disabled={!checksDone}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <ScanLine size={20} /> Step 2 · AI pickup inspection
            </h3>
            <p style={{ margin: 0, color: '#685D73', fontSize: '0.875rem' }}>
              Photograph the car in daylight or good light, from about 3 metres, with the whole side in frame. The AI
              records every existing scratch and dent so the customer is not charged for them at return.
            </p>

            {!report ? (
              <>
                <VehiclePhotoCapture value={photos} onChange={setPhotos} disabled={!checksDone || scanning} />
                <textarea
                  value={scanNotes}
                  onChange={(e) => setScanNotes(e.target.value)}
                  placeholder="Inspector notes (optional)"
                  rows={2}
                  disabled={!checksDone || scanning}
                  style={{ width: '100%', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {scanning ? (
                  <div className="insp-progress" role="status">
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    AI is inspecting the photos. This usually takes 10-60 seconds…
                  </div>
                ) : (
                  <button
                    type="button"
                    style={{ ...primaryButton, opacity: checksDone && missingViews.length === 0 ? 1 : 0.5, alignSelf: 'flex-start' }}
                    disabled={!checksDone || missingViews.length > 0}
                    onClick={runScan}
                  >
                    <ScanLine size={18} /> Run AI inspection
                  </button>
                )}
              </>
            ) : (
              <>
                <InspectionReportView report={report} currency={booking.currency} />
                <button
                  type="button"
                  className="insp-btn-secondary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    setReport(null);
                    setPhotos({});
                  }}
                >
                  <RotateCcw size={16} /> Retake photos and scan again
                </button>
              </>
            )}
          </section>

          {/* Step 3 */}
          <section style={{ ...card, opacity: report ? 1 : 0.55 }} aria-disabled={!report}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <KeyRound size={20} /> Step 3 · Hand over the keys
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                Odometer (km)
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={startMileage}
                  disabled={!report}
                  onChange={(e) => setStartMileage(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #ECEAEF' }}
                />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                Fuel level
                <CustomSelect
                  value={startFuelLevel}
                  onChange={(v) => setStartFuelLevel(String(v))}
                  options={FUEL_LEVELS}
                  disabled={!report}
                  size="md"
                />
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Handover notes (optional)"
              rows={2}
              disabled={!report}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <button
              type="button"
              style={{ ...primaryButton, opacity: report && !submitting ? 1 : 0.5, alignSelf: 'flex-start' }}
              disabled={!report || submitting}
              onClick={handover}
            >
              <KeyRound size={18} /> {submitting ? 'Handing over…' : 'Confirm handover and release keys'}
            </button>
          </section>
        </>
      )}
    </PageContainer>
  );
}
