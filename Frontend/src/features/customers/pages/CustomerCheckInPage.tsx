import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, QrCode, XCircle } from 'lucide-react';
import { apiClient } from '../../../api/client';
import { customerPortalApi, type CheckInStatus } from '../api/customerPortalApi';
import { compressImage } from '../../inspections/components/compressImage';
import './CustomerPortal.css';

/**
 * Online check-in before pickup: the customer's licence and ID must be on file and valid for the whole trip,
 * then a selfie completes it. Staff scan the QR code, compare the person with the selfie and hand over the keys.
 */
export function CustomerCheckInPage() {
  const { t, i18n } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [checkIn, setCheckIn] = useState<CheckInStatus | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    customerPortalApi
      .getCheckIn(bookingId)
      .then((res) => setCheckIn(res.checkIn))
      .catch((err) => setError(err instanceof Error ? err.message : t('portalPages.checkIn.errLoad')))
      .finally(() => setIsLoading(false));
  }, [bookingId, t]);

  // The QR code is a protected image: fetched with the session, shown from a local object URL
  useEffect(() => {
    if (!bookingId || !checkIn?.checkedInAt) return;
    let url: string | null = null;
    apiClient
      .get<Blob>(customerPortalApi.checkInQrEndpoint(bookingId), { responseType: 'blob' })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setQrUrl(url);
      })
      .catch(() => setQrUrl(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [bookingId, checkIn?.checkedInAt]);

  const takeSelfie = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setSelfie(await compressImage(file));
    } catch (err) {
      setError(t(err instanceof Error ? err.message : 'portalPages.checkIn.errSelfie'));
    }
  };

  const complete = async () => {
    if (!bookingId || !selfie) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await customerPortalApi.completeCheckIn(bookingId, selfie);
      setCheckIn(res.checkIn);
      setSelfie(null);
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('portalPages.checkIn.errSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const dateTime = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  const allDocumentsOk = checkIn?.requirements.every((r) => r.ok) ?? false;

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.checkIn.title')}</h1>
          <p className="cp-page-subtitle">
            {checkIn
              ? t('portalPages.checkIn.subtitle', {
                  vehicle: checkIn.vehicle,
                  number: checkIn.bookingNumber,
                  date: dateTime.format(new Date(checkIn.pickupDateTime)),
                })
              : ''}
          </p>
        </div>
        <div className="cp-header-actions">
          <Link to={`/customer/bookings/${bookingId}`} className="cp-btn-outline">
            <ChevronLeft size={16} /> {t('portalPages.checkIn.back')}
          </Link>
        </div>
      </div>

      {!checkIn ? (
        <div className="cp-card cp-empty-state">
          <AlertTriangle size={40} color="var(--cp-danger)" />
          <p className="cp-empty-desc">{error}</p>
        </div>
      ) : (
        <>
          {checkIn.checkedInAt && (
            <div className="cp-card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              {qrUrl ? (
                <img src={qrUrl} alt={t('portalPages.checkIn.qrAlt')} width={220} height={220} />
              ) : (
                <QrCode size={120} color="var(--cp-text-muted)" />
              )}
              <div style={{ flex: 1, minWidth: 240 }}>
                <h2 style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 8px', fontSize: '1.2rem' }}>
                  <CheckCircle2 size={22} color="var(--cp-success)" /> {t('portalPages.checkIn.doneTitle')}
                </h2>
                <p className="cp-page-subtitle">
                  {t('portalPages.checkIn.doneDesc', { date: dateTime.format(new Date(checkIn.checkedInAt)) })}
                </p>
                {checkIn.deliveryAddress && (
                  <p className="cp-page-subtitle">{t('portalPages.checkIn.deliveryNote', { address: checkIn.deliveryAddress })}</p>
                )}
              </div>
              {checkIn.selfieUrl && (
                <img
                  src={checkIn.selfieUrl}
                  alt={t('portalPages.checkIn.selfieAlt')}
                  width={120}
                  height={120}
                  style={{ objectFit: 'cover', borderRadius: 12 }}
                />
              )}
            </div>
          )}

          {!checkIn.statusAllows ? (
            !checkIn.checkedInAt && (
              <div className="cp-card cp-empty-state">
                <p className="cp-empty-desc">{t('portalPages.checkIn.notAvailable')}</p>
              </div>
            )
          ) : !checkIn.open ? (
            <div className="cp-card cp-empty-state">
              <QrCode size={40} color="var(--cp-text-muted)" />
              <p className="cp-empty-desc">
                {t('portalPages.checkIn.opensAt', { date: dateTime.format(new Date(checkIn.opensAt)) })}
              </p>
            </div>
          ) : (
            <div className="cp-card">
              <h2 style={{ fontSize: '1.05rem', margin: '0 0 12px' }}>
                {checkIn.checkedInAt ? t('portalPages.checkIn.redoTitle') : t('portalPages.checkIn.stepsTitle')}
              </h2>
              <ol style={{ display: 'grid', gap: 12, paddingInlineStart: 20, margin: 0 }}>
                {checkIn.requirements.map((r) => (
                  <li key={r.key}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      {r.ok ? <CheckCircle2 size={18} color="var(--cp-success)" /> : <XCircle size={18} color="var(--cp-danger)" />}
                      <strong>{t(`portalPages.checkIn.req${r.key}`)}</strong>
                      {r.problem && <span style={{ color: 'var(--cp-danger)' }}>{t(`portalPages.checkIn.problem${r.problem}`)}</span>}
                    </span>
                  </li>
                ))}
                <li>
                  <strong>{t('portalPages.checkIn.selfieStep')}</strong>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    <label className="cp-btn-outline" style={{ cursor: allDocumentsOk ? 'pointer' : 'not-allowed' }}>
                      <Camera size={16} /> {selfie ? t('portalPages.checkIn.retake') : t('portalPages.checkIn.takeSelfie')}
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        hidden
                        disabled={!allDocumentsOk || isSaving}
                        onChange={(e) => takeSelfie(e.target.files?.[0])}
                      />
                    </label>
                    {selfie && (
                      <img src={selfie} alt={t('portalPages.checkIn.selfieAlt')} width={96} height={96} style={{ objectFit: 'cover', borderRadius: 12 }} />
                    )}
                  </div>
                </li>
              </ol>
              {!allDocumentsOk && (
                <p style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {checkIn.requirements.some((r) => !r.ok && r.key !== 'ADDITIONAL_DRIVER') && (
                    <Link to="/customer/documents" className="cp-btn-outline">
                      {t('portalPages.checkIn.uploadDocuments')}
                    </Link>
                  )}
                  {checkIn.requirements.some((r) => !r.ok && r.key === 'ADDITIONAL_DRIVER') && (
                    <Link to={`/customer/bookings/${checkIn.bookingId}#additional-driver`} className="cp-btn-outline">
                      {t('portalPages.checkIn.addDriver')}
                    </Link>
                  )}
                </p>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '16px 0' }}>
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!allDocumentsOk} />
                <span>{t('portalPages.checkIn.confirm')}</span>
              </label>
              {error && (
                <div role="alert" style={{ display: 'flex', gap: 8, color: 'var(--cp-danger)', marginBottom: 12 }}>
                  <AlertTriangle size={18} /> {error}
                </div>
              )}
              <button type="button" className="cp-btn-primary" disabled={!allDocumentsOk || !selfie || !confirmed || isSaving} onClick={complete}>
                <QrCode size={16} />
                {isSaving ? t('portalPages.checkIn.saving') : t('portalPages.checkIn.complete')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
