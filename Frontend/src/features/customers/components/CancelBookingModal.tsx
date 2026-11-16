import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customerPortalApi, type CancellationPreview, type RefundOutcome } from '../api/customerPortalApi';
import { formatMoney } from '../../../utils/carImageHelper';

interface CancelBookingModalProps {
  bookingId: string;
  title: string;
  question: string;
  onClose: () => void;
  /** Called after the booking was cancelled, with what happened to the refund */
  onCancelled: (result: { terms?: CancellationPreview; refund?: RefundOutcome | null }) => void;
}

/**
 * Cancel dialog that shows the cancellation policy result before the customer confirms:
 * whether it is still free, the late cancellation fee and the amount that will be refunded.
 */
export function CancelBookingModal({ bookingId, title, question, onClose, onCancelled }: CancelBookingModalProps) {
  const { t, i18n } = useTranslation();
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    customerPortalApi
      .getCancellationPreview(bookingId)
      .then((res) => {
        if (active) setPreview(res.preview);
      })
      .catch((err: any) => {
        if (active) setError(err?.message || t('portalPages.cancelModal.errPreview'));
      })
      .finally(() => {
        if (active) setIsLoadingPreview(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, t]);

  const money = (value: number) => formatMoney(value, preview?.currency || '', 2);
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  const confirm = async () => {
    try {
      setIsCancelling(true);
      setError(null);
      const res = await customerPortalApi.cancelBooking(bookingId, reason.trim() || undefined);
      onCancelled({ terms: res.terms, refund: res.refund });
    } catch (err: any) {
      setError(err?.message || t('portalPages.bookings.errCancel'));
    } finally {
      setIsCancelling(false);
    }
  };

  const canConfirm = Boolean(preview?.cancellable) && !isCancelling;

  return (
    <div className="cp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
      <div className="cp-modal-box">
        <h2 id="cancel-booking-title" className="cp-card-title" style={{ marginBottom: '12px' }}>
          {title}
        </h2>
        <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>{question}</p>

        {/* Result of the cancellation policy for this booking, worked out by the server */}
        <div
          style={{
            background: '#F8F6F9',
            border: '1px solid var(--cp-border)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {isLoadingPreview && <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.cancelModal.loading')}</span>}
          {preview && !preview.cancellable && (
            <span style={{ color: 'var(--cp-danger)', fontWeight: 600 }}>{t('portalPages.cancelModal.notCancellable')}</span>
          )}
          {preview && preview.cancellable && (
            <>
              <strong style={{ color: preview.isFree ? '#047857' : '#B45309' }}>
                {preview.isFree
                  ? t('portalPages.cancelModal.freeUntil', { date: formatDateTime(preview.freeUntil) })
                  : t('portalPages.cancelModal.lateNotice', { date: formatDateTime(preview.freeUntil) })}
              </strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.cancelModal.paid')}</span>
                <span style={{ fontWeight: 600 }}>{money(preview.paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.cancelModal.fee')}</span>
                <span style={{ fontWeight: 600 }}>{money(preview.fee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--cp-border)', paddingTop: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{t('portalPages.cancelModal.refund')}</span>
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)' }}>{money(preview.refund)}</span>
              </div>
              {preview.refund > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>{t('portalPages.cancelModal.refundTiming')}</span>
              )}
            </>
          )}
        </div>

        {error && (
          <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <div className="cp-form-group">
          <label className="cp-label" htmlFor="cancel-booking-reason">{t('portalPages.bookings.reasonOptional')}</label>
          <textarea
            id="cancel-booking-reason"
            className="cp-textarea"
            rows={3}
            maxLength={500}
            placeholder={t('portalPages.bookings.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button className="cp-btn-outline" disabled={isCancelling} onClick={onClose}>
            {t('portalPages.bookings.keepBooking')}
          </button>
          <button className="cp-btn-danger" disabled={!canConfirm} onClick={confirm} style={{ opacity: canConfirm ? 1 : 0.6 }}>
            {isCancelling ? t('portalPages.bookings.processing') : t('portalPages.bookings.confirmCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
