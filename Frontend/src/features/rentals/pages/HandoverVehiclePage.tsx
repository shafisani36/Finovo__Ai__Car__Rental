import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, FileSignature, KeyRound, Loader2, RotateCcw, ScanLine, ShieldCheck, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { bookingApi, type Booking } from '../../bookings/api/bookingApi';
import { rentalApi, type RentalAgreementSummary } from '../api/rentalApi';
import { SignaturePad } from '../components/SignaturePad';
import { downloadProtectedFile } from '../../../utils/downloadFile';
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
  const { t } = useTranslation();
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

  // Step 3: digital rental agreement signed by the renter
  const [agreement, setAgreement] = useState<RentalAgreementSummary | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [signerName, setSignerName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signing, setSigning] = useState(false);

  // Step 4: key handover
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
        setSignerName(res.booking.customer?.fullName || '');
        // An agreement may already be signed (for example if the page was reloaded)
        const [agreementRes, termsRes] = await Promise.allSettled([
          rentalApi.getAgreement(bookingId),
          rentalApi.getAgreementTerms(),
        ]);
        if (!active) return;
        if (agreementRes.status === 'fulfilled') setAgreement(agreementRes.value.agreement);
        if (termsRes.status === 'fulfilled') setTerms(termsRes.value.terms || []);
        const mileage = Number((res.booking.vehicle as { mileage?: number })?.mileage);
        if (Number.isFinite(mileage) && mileage > 0) setStartMileage(String(mileage));
      } catch (err) {
        if (active) setLoadError(errorMessage(err, t('adminPages.rentals.errLoadBooking')));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // Loads once per record; the language is only used for error text, so a language change must not reload the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const checksDone = idVerified && licenseVerified && paymentVerified;
  const missingViews = missingRequiredViews(photos);

  const runScan = async () => {
    if (!booking) return;
    if (missingViews.length > 0) {
      setError(t('adminPages.rentals._needPhotos', { views: missingViews.map((v) => t(`inspectionReport.views.${v}`, { defaultValue: VIEW_LABELS[v] })).join(', ') }));
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
      setError(errorMessage(err, t('adminPages.rentals.errScan')));
    } finally {
      setScanning(false);
    }
  };

  const signAgreement = async () => {
    if (!booking || !report || !signature) return;
    setSigning(true);
    setError(null);
    try {
      const res = await rentalApi.signAgreement({
        bookingId: booking.id,
        signerName: signerName.trim(),
        signatureDataUrl: signature,
        accepted: termsAccepted,
        pickupInspectionId: report.id,
      });
      setAgreement(res.agreement);
    } catch (err) {
      setError(errorMessage(err, t('adminPages.handover.errSign')));
    } finally {
      setSigning(false);
    }
  };

  const downloadAgreement = async () => {
    if (!booking || !agreement) return;
    try {
      await downloadProtectedFile(rentalApi.agreementPdfEndpoint(booking.id), `${agreement.agreementNumber}.pdf`);
    } catch (err) {
      setError(errorMessage(err, t('adminPages.handover.errDownload')));
    }
  };

  const canSign = Boolean(report) && !agreement && Boolean(signature) && termsAccepted && signerName.trim().length >= 3;

  const handover = async () => {
    if (!booking || !report || !agreement) return;
    const mileage = Number(startMileage);
    if (!Number.isFinite(mileage) || mileage < 0 || startMileage.trim() === '') {
      setError(t('adminPages.rentals.errOdometer'));
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
      setError(errorMessage(err, t('adminPages.rentals.errHandover')));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>{t('adminPages.rentals.loadingBooking')}</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0426' }}>{t('adminPages.rentals.bookingNotFound')}</h2>
        <p style={{ color: '#685D73', marginBottom: '24px' }}>{loadError}</p>
        <Link to="/admin/bookings" style={{ ...primaryButton, textDecoration: 'none' }}>
          {t('adminPages.rentals.backToBookings')}
        </Link>
      </div>
    );
  }

  const blockedReason = booking.rental
    ? t('adminPages.rentals.alreadyHanded')
    : !HANDOVER_STATUSES.includes(booking.status)
      ? t('adminPages.rentals._cannotHandover', { status: t(`portalPages.bookings.status.${booking.status}`, { defaultValue: booking.status }) })
      : null;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: t('adminPages.rentals.crumbBookings'), href: '/admin/bookings' }, { label: `Handover #${booking.bookingNumber}` }]}
        title={t('adminPages.rentals.handoverTitle')}
        subtitle={t('adminPages.rentals.handoverSubtitle')}
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
            <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>{t('adminPages.rentals.vehicleCaps')}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>
              {booking.vehicle.brand} {booking.vehicle.model}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#685D73' }}>{t('adminPages.rentals.plate')} {booking.vehicle.registrationNumber}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>{t('adminPages.rentals.renterCaps')}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>{booking.customer.fullName}</div>
          <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
            {t('adminPages.rentals.license')} {booking.customer.driverLicenseNumber || t('adminPages.rentals.notOnFile')} · {booking.customer.phone || booking.customer.email}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#685D73' }}>
            {new Date(booking.pickupDateTime).toLocaleString()} → {new Date(booking.returnDateTime).toLocaleString()}
          </div>
        </div>
        {(booking.deliveryAddress || booking.collectionAddress) && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={14} /> {t('adminPages.handover.delivery')}
            </div>
            {booking.deliveryAddress && (
              <div style={{ fontSize: '0.85rem', color: '#1E0426' }}>
                {t('adminPages.handover.deliverTo', { address: booking.deliveryAddress })}
              </div>
            )}
            {booking.collectionAddress && (
              <div style={{ fontSize: '0.85rem', color: '#1E0426' }}>
                {t('adminPages.handover.collectFrom', { address: booking.collectionAddress })}
              </div>
            )}
          </div>
        )}
      </div>

      {!blockedReason && (
        <>
          {/* Step 1 */}
          <section style={card}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <ShieldCheck size={20} /> {t('adminPages.rentals.step1')}
            </h3>
            {[
              { checked: idVerified, set: setIdVerified, label: t('adminPages.rentals.checkId') },
              { checked: licenseVerified, set: setLicenseVerified, label: t('adminPages.rentals.checkLicense') },
              { checked: paymentVerified, set: setPaymentVerified, label: t('adminPages.rentals.checkPayment') },
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
              <ScanLine size={20} /> {t('adminPages.rentals.step2')}
            </h3>
            <p style={{ margin: 0, color: '#685D73', fontSize: '0.875rem' }}>
              {t('adminPages.rentals.pickupHelp')}
            </p>

            {!report ? (
              <>
                <VehiclePhotoCapture value={photos} onChange={setPhotos} disabled={!checksDone || scanning} />
                <textarea
                  value={scanNotes}
                  onChange={(e) => setScanNotes(e.target.value)}
                  placeholder={t('adminPages.rentals.notes')}
                  rows={2}
                  disabled={!checksDone || scanning}
                  style={{ width: '100%', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {scanning ? (
                  <div className="insp-progress" role="status">
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('adminPages.rentals.scanning')}
                  </div>
                ) : (
                  <button
                    type="button"
                    style={{ ...primaryButton, opacity: checksDone && missingViews.length === 0 ? 1 : 0.5, alignSelf: 'flex-start' }}
                    disabled={!checksDone || missingViews.length > 0}
                    onClick={runScan}
                  >
                    <ScanLine size={18} /> {t('adminPages.rentals.runScan')}
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
                  <RotateCcw size={16} /> {t('adminPages.rentals.rescan')}
                </button>
              </>
            )}
          </section>

          {/* Step 3: digital rental agreement */}
          <section style={{ ...card, opacity: report ? 1 : 0.55 }} aria-disabled={!report}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <FileSignature size={20} /> {t('adminPages.handover.agreementStep')}
            </h3>
            {agreement ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: '#047857', fontWeight: 600 }}>
                <span>
                  {t('adminPages.handover.agreementDone', {
                    number: agreement.agreementNumber,
                    name: agreement.signerName,
                    date: new Date(agreement.signedAt).toLocaleString(),
                  })}
                </span>
                <button type="button" onClick={downloadAgreement} style={{ ...primaryButton, padding: '8px 16px' }}>
                  {t('adminPages.handover.downloadPdf')}
                </button>
              </div>
            ) : (
              <>
                <p style={{ margin: 0, color: '#685D73', fontSize: '0.9rem' }}>{t('adminPages.handover.agreementIntro')}</p>
                {terms.length > 0 && (
                  <ol
                    style={{
                      margin: 0,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '12px',
                      paddingInlineStart: '32px',
                      border: '1px solid #ECEAEF',
                      borderRadius: '10px',
                      background: '#FAF9FB',
                      fontSize: '0.82rem',
                      color: '#3B3346',
                      lineHeight: 1.5,
                    }}
                  >
                    {terms.map((term, index) => (
                      <li key={index} style={{ marginBottom: '6px' }}>
                        {term}
                      </li>
                    ))}
                  </ol>
                )}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426', maxWidth: '420px' }}>
                  {t('adminPages.handover.signerName')}
                  <input
                    type="text"
                    value={signerName}
                    maxLength={128}
                    disabled={!report}
                    onChange={(e) => setSignerName(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #ECEAEF' }}
                  />
                </label>
                <div>
                  <div style={{ fontWeight: 600, color: '#1E0426', marginBottom: '6px' }}>{t('adminPages.handover.signatureLabel')}</div>
                  <SignaturePad onChange={setSignature} disabled={!report || signing} />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: '#1E0426' }}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    disabled={!report}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  {t('adminPages.handover.acceptTerms')}
                </label>
                <button
                  type="button"
                  style={{ ...primaryButton, opacity: canSign && !signing ? 1 : 0.5, alignSelf: 'flex-start' }}
                  disabled={!canSign || signing}
                  onClick={signAgreement}
                >
                  <FileSignature size={18} /> {signing ? t('adminPages.handover.signing') : t('adminPages.handover.sign')}
                </button>
              </>
            )}
          </section>

          {/* Step 4 */}
          <section style={{ ...card, opacity: report && agreement ? 1 : 0.55 }} aria-disabled={!report || !agreement}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E0426' }}>
              <KeyRound size={20} /> {t('adminPages.handover.keysStep')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
                {t('adminPages.rentals.odometer')}
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
                {t('adminPages.rentals.fuelLevel')}
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
              placeholder={t('adminPages.rentals.handoverNotes')}
              rows={2}
              disabled={!report}
              style={{ width: '100%', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <button
              type="button"
              style={{ ...primaryButton, opacity: report && agreement && !submitting ? 1 : 0.5, alignSelf: 'flex-start' }}
              disabled={!report || !agreement || submitting}
              onClick={handover}
            >
              <KeyRound size={18} /> {submitting ? t('adminPages.rentals._handingOver') : t('adminPages.rentals._confirmHandover')}
            </button>
          </section>
        </>
      )}
    </PageContainer>
  );
}
