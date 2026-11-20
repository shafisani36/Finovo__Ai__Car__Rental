import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Mail, UserCheck, FileText } from 'lucide-react';
import { Modal } from '../../../components/common';
import { formatMoney } from '../../../utils/carImageHelper';
import { bookingApi, type BookingReview, type VerificationStatus } from '../api/bookingApi';

interface BookingReviewModalProps {
  bookingId: string;
  onClose: () => void;
  /** Called after the booking was approved or rejected, so the list can refresh */
  onDecided: () => void;
}

type RejectTarget = { kind: 'document' | 'driver'; id: string; label: string } | { kind: 'booking' };

const SECTION: CSSProperties = { border: '1px solid #EDE7F0', borderRadius: '12px', padding: '14px', marginBottom: '14px' };
const HEADING: CSSProperties = { fontSize: '0.8rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' };
const BUTTON: CSSProperties = { border: 'none', borderRadius: '8px', padding: '7px 12px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' };
const STATUS_COLORS: Record<VerificationStatus, { bg: string; fg: string }> = {
  VERIFIED: { bg: '#D1FAE5', fg: '#047857' },
  REJECTED: { bg: '#FEE2E2', fg: '#B91C1C' },
  PENDING_VERIFICATION: { bg: '#FEF3C7', fg: '#92400E' },
};

function StatusTag({ status }: { status: VerificationStatus }) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING_VERIFICATION;
  const Icon = status === 'VERIFIED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : Clock;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: colors.bg, color: colors.fg }}>
      <Icon size={13} /> {t(`adminPages.bookingReview.status.${status}`)}
    </span>
  );
}

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" title={alt}>
      <img src={src} alt={alt} width={150} height={96} style={{ objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#F9FAFB' }} />
    </a>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#1E0426', fontSize: '0.9rem' }}>{children}</div>
    </div>
  );
}

/**
 * Staff check a paid online booking: the customer's licence and ID, the additional driver (when booked) and the
 * customer's history. Approving confirms the booking and emails the customer; rejecting refunds everything paid.
 */
export function BookingReviewModal({ bookingId, onClose, onDecided }: BookingReviewModalProps) {
  const { t } = useTranslation();
  const [review, setReview] = useState<BookingReview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [reason, setReason] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await bookingApi.getReview(bookingId);
      setReview(res);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('adminPages.bookingReview.errLoad'));
    }
  }, [bookingId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      after?.();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('adminPages.bookingReview.errAction'));
    } finally {
      setBusy(false);
    }
  };

  const minReason = rejectTarget?.kind === 'booking' ? 10 : 5;
  const submitReject = () => {
    if (!rejectTarget || reason.trim().length < minReason) return;
    const text = reason.trim();
    if (rejectTarget.kind === 'document') void run(() => bookingApi.verifyDocument(rejectTarget.id, 'REJECTED', text), () => setRejectTarget(null));
    else if (rejectTarget.kind === 'driver') void run(() => bookingApi.verifyDriver(rejectTarget.id, 'REJECTED', text), () => setRejectTarget(null));
    else void run(() => bookingApi.reject(bookingId, text), () => {
      setRejectTarget(null);
      onDecided();
    });
  };

  const decisionButtons = (kind: 'document' | 'driver', id: string, label: string, status: VerificationStatus) =>
    review?.canDecide && (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {status !== 'VERIFIED' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => (kind === 'document' ? bookingApi.verifyDocument(id, 'VERIFIED') : bookingApi.verifyDriver(id, 'VERIFIED')))}
            style={{ ...BUTTON, background: '#D1FAE5', color: '#047857' }}
          >
            <CheckCircle2 size={14} /> {t('adminPages.bookingReview.accept')}
          </button>
        )}
        {status !== 'REJECTED' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setReason('');
              setRejectTarget({ kind, id, label });
            }}
            style={{ ...BUTTON, background: '#FEE2E2', color: '#B91C1C' }}
          >
            <XCircle size={14} /> {t('adminPages.bookingReview.notAccepted')}
          </button>
        )}
      </div>
    );

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');
  const b = review?.booking;
  const c = review?.customer;

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth={860}
      title={b ? t('adminPages.bookingReview.title', { number: b.bookingNumber }) : t('adminPages.bookingReview.loading')}
      subtitle={b ? `${b.vehicle.name} · ${new Date(b.pickupDateTime).toLocaleString()} → ${new Date(b.returnDateTime).toLocaleString()}` : undefined}
    >
      {loadError && <div role="alert" style={{ color: '#B91C1C', fontWeight: 600 }}>{loadError}</div>}
      {!review && !loadError && <div style={{ color: '#6B7280' }}>{t('adminPages.bookingReview.loading')}</div>}

      {review && b && c && (
        <>
          {!review.canDecide && (
            <div style={{ ...SECTION, background: '#F9FAFB', fontWeight: 600, color: '#374151' }}>
              {b.status === 'CONFIRMED' && b.approvedAt
                ? t('adminPages.bookingReview.alreadyApproved', { date: new Date(b.approvedAt).toLocaleString() })
                : b.status === 'REJECTED'
                  ? t('adminPages.bookingReview.alreadyRejected', { reason: b.rejectionReason || '' })
                  : t('adminPages.bookingReview.notWaiting')}
            </div>
          )}

          {/* Customer */}
          <section style={SECTION}>
            <h4 style={HEADING}><UserCheck size={15} /> {t('adminPages.bookingReview.customer')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <Fact label={t('adminPages.bookingReview.name')}>{c.fullName}</Fact>
              <Fact label={t('adminPages.bookingReview.contact')}>
                <span style={{ fontWeight: 600 }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</span>
              </Fact>
              <Fact label={t('adminPages.bookingReview.memberSince')}>{date(c.memberSince)}</Fact>
              <Fact label={t('adminPages.bookingReview.emailVerified')}>{c.emailVerified ? t('adminPages.bookingReview.yes') : t('adminPages.bookingReview.no')}</Fact>
              <Fact label={t('adminPages.bookingReview.licenceOnProfile')}>
                {c.licenseNumber || '—'}{c.licenseExpiry ? ` (${t('adminPages.bookingReview.expires', { date: date(c.licenseExpiry) })})` : ''}
              </Fact>
              <Fact label={t('adminPages.bookingReview.history')}>
                {t('adminPages.bookingReview.historyValue', { completed: c.completedRentals, cancelled: c.cancelledBookings, rejected: c.rejectedBookings })}
              </Fact>
              <Fact label={t('adminPages.bookingReview.unpaidFines')}>
                <span style={{ color: c.unpaidFines.count > 0 ? '#B91C1C' : '#047857' }}>
                  {c.unpaidFines.count > 0 ? `${c.unpaidFines.count} · ${formatMoney(c.unpaidFines.amount, b.currency, 2)}` : t('adminPages.bookingReview.none')}
                </span>
              </Fact>
              <Fact label={t('adminPages.bookingReview.paid')}>{formatMoney(b.totalAmount + b.depositAmount, b.currency, 2)}</Fact>
            </div>
          </section>

          {/* Documents */}
          <section style={SECTION}>
            <h4 style={HEADING}><FileText size={15} /> {t('adminPages.bookingReview.documents')}</h4>
            {review.documents.length === 0 && <div style={{ color: '#B91C1C', fontWeight: 600 }}>{t('adminPages.bookingReview.noDocuments')}</div>}
            <div style={{ display: 'grid', gap: '12px' }}>
              {review.documents.map((d) => {
                const label = t(`adminPages.rentals.doc${d.documentType}`, { defaultValue: d.documentType });
                return (
                  <div key={d.id} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Thumbnail src={d.fileUrl} alt={label} />
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ fontWeight: 700, color: '#1E0426' }}>{label}</div>
                      <div style={{ fontSize: '0.8rem', color: d.expiresBeforeReturn ? '#B91C1C' : '#6B7280', fontWeight: d.expiresBeforeReturn ? 700 : 500 }}>
                        {d.expiresAt ? t('adminPages.bookingReview.expires', { date: date(d.expiresAt) }) : t('adminPages.bookingReview.noExpiry')}
                        {d.expiresBeforeReturn && ` · ${t('adminPages.bookingReview.expiresBeforeReturn')}`}
                      </div>
                      <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusTag status={d.verificationStatus} />
                        {d.rejectionReason && <span style={{ fontSize: '0.8rem', color: '#B91C1C' }}>{d.rejectionReason}</span>}
                      </div>
                    </div>
                    {decisionButtons('document', d.id, label, d.verificationStatus)}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Additional driver */}
          {(b.additionalDriverBooked || review.drivers.length > 0) && (
            <section style={SECTION}>
              <h4 style={HEADING}><UserCheck size={15} /> {t('adminPages.bookingReview.additionalDriver')}</h4>
              {review.drivers.length === 0 && <div style={{ color: '#B45309', fontWeight: 600 }}>{t('adminPages.bookingReview.driverNotAdded')}</div>}
              {review.drivers.map((d) => (
                <div key={d.id} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Thumbnail src={d.licenceFrontUrl} alt={t('adminPages.bookingReview.licenceFront')} />
                  <Thumbnail src={d.licenceBackUrl} alt={t('adminPages.bookingReview.licenceBack')} />
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: 700, color: '#1E0426' }}>{d.fullName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      {t('adminPages.bookingReview.licenceNumber', { number: d.licenceNumber })}{d.phone ? ` · ${d.phone}` : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: d.expiresBeforeReturn ? '#B91C1C' : '#6B7280' }}>
                      {t('adminPages.bookingReview.expires', { date: date(d.licenceExpiresAt) })}
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <StatusTag status={d.status} />
                      {d.rejectionReason && <span style={{ fontSize: '0.8rem', color: '#B91C1C' }}>{d.rejectionReason}</span>}
                    </div>
                  </div>
                  {decisionButtons('driver', d.id, d.fullName, d.status)}
                </div>
              ))}
            </section>
          )}

          {/* What still blocks the approval */}
          {review.canDecide && review.problems.length > 0 && (
            <div style={{ ...SECTION, background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div style={{ fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={16} /> {t('adminPages.bookingReview.beforeApproving')}
              </div>
              <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#92400E', fontSize: '0.88rem' }}>
                {review.problems.map((p) => <li key={p}>{t(`adminPages.bookingReview.problem.${p}`)}</li>)}
              </ul>
            </div>
          )}

          {/* Reason box for a rejection */}
          {rejectTarget && (
            <div style={{ ...SECTION, background: '#FEF2F2', borderColor: '#FECACA' }}>
              <label style={{ fontWeight: 700, color: '#991B1B', display: 'block', marginBottom: '6px' }}>
                {rejectTarget.kind === 'booking'
                  ? t('adminPages.bookingReview.rejectBookingReason')
                  : t('adminPages.bookingReview.rejectItemReason', { item: rejectTarget.label })}
              </label>
              {rejectTarget.kind === 'booking' && (
                <div style={{ fontSize: '0.82rem', color: '#991B1B', marginBottom: '6px' }}>{t('adminPages.bookingReview.rejectBookingNote')}</div>
              )}
              <textarea
                value={reason}
                maxLength={rejectTarget.kind === 'booking' ? 500 : 255}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t('adminPages.bookingReview.reasonPlaceholder')}
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #FCA5A5', padding: '8px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setRejectTarget(null)} style={{ ...BUTTON, background: '#F3F4F6', color: '#374151' }}>
                  {t('adminPages.bookingReview.back')}
                </button>
                <button
                  type="button"
                  disabled={busy || reason.trim().length < minReason}
                  onClick={submitReject}
                  style={{ ...BUTTON, background: '#B91C1C', color: '#FFFFFF', opacity: busy || reason.trim().length < minReason ? 0.5 : 1 }}
                >
                  {rejectTarget.kind === 'booking' ? t('adminPages.bookingReview.rejectAndRefund') : t('adminPages.bookingReview.saveRejection')}
                </button>
              </div>
            </div>
          )}

          {/* Ask the customer for documents */}
          {showRequest && (
            <div style={{ ...SECTION, background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <label style={{ fontWeight: 700, color: '#5B21B6', display: 'block', marginBottom: '6px' }}>{t('adminPages.bookingReview.requestTitle')}</label>
              <div style={{ fontSize: '0.82rem', color: '#5B21B6', marginBottom: '6px' }}>{t('adminPages.bookingReview.requestHelp')}</div>
              <textarea
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t('adminPages.bookingReview.notePlaceholder')}
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #C4B5FD', padding: '8px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowRequest(false)} style={{ ...BUTTON, background: '#F3F4F6', color: '#374151' }}>
                  {t('adminPages.bookingReview.back')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => bookingApi.requestDocuments(bookingId, note.trim()),
                      () => {
                        setShowRequest(false);
                        setNote('');
                        setNotice(t('adminPages.bookingReview.requestSent', { email: c.email }));
                      }
                    )
                  }
                  style={{ ...BUTTON, background: '#6C1E84', color: '#FFFFFF' }}
                >
                  <Mail size={14} /> {t('adminPages.bookingReview.sendRequest')}
                </button>
              </div>
            </div>
          )}

          {notice && <div role="status" style={{ color: '#047857', fontWeight: 600, marginBottom: '10px' }}>{notice}</div>}
          {actionError && <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '10px' }}>{actionError}</div>}

          {/* Decision */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            {review.canDecide && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRejectTarget(null);
                    setShowRequest(true);
                  }}
                  style={{ ...BUTTON, padding: '9px 16px', background: '#EDE9FE', color: '#5B21B6' }}
                >
                  <Mail size={15} /> {t('adminPages.bookingReview.requestDocuments')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowRequest(false);
                    setReason('');
                    setRejectTarget({ kind: 'booking' });
                  }}
                  style={{ ...BUTTON, padding: '9px 16px', background: '#FEE2E2', color: '#B91C1C' }}
                >
                  <XCircle size={15} /> {t('adminPages.bookingReview.rejectBooking')}
                </button>
                <button
                  type="button"
                  disabled={busy || review.problems.length > 0}
                  title={review.problems.length > 0 ? t('adminPages.bookingReview.beforeApproving') : undefined}
                  onClick={() => void run(() => bookingApi.approve(bookingId), onDecided)}
                  style={{ ...BUTTON, padding: '9px 16px', background: '#047857', color: '#FFFFFF', opacity: busy || review.problems.length > 0 ? 0.5 : 1, cursor: review.problems.length > 0 ? 'not-allowed' : 'pointer' }}
                >
                  <CheckCircle2 size={15} /> {t('adminPages.bookingReview.approve')}
                </button>
              </>
            )}
            <button type="button" onClick={onClose} style={{ ...BUTTON, padding: '9px 16px', background: '#F3F4F6', color: '#374151' }}>
              {t('adminPages.bookingReview.close')}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
