import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CreditCard, FileWarning, MessageSquareWarning, X } from 'lucide-react';
import { StripePaymentForm } from '../../payments/components/StripePaymentForm';
import { formatMoney } from '../../../utils/carImageHelper';
import { trafficFineApi, type TrafficFine, type TrafficFineStatus } from '../api/trafficFineApi';
import '../../customers/pages/CustomerPortal.css';

const MIN_REASON_TEXT = 10;

const BADGE: Record<TrafficFineStatus, string> = {
  UNMATCHED: 'cp-badge-accent',
  CHARGED: 'cp-badge-danger',
  DISPUTED: 'cp-badge-warning',
  PAID: 'cp-badge-success',
  WAIVED: 'cp-badge-accent',
};

type Dialog = { fine: TrafficFine; kind: 'pay' | 'dispute' };

/** Traffic fines issued while the customer had a rental car: pay them online or dispute them. */
export function CustomerFinesPage() {
  const { t, i18n } = useTranslation();
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [currency, setCurrency] = useState('SAR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paid, setPaid] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await trafficFineApi.mine();
      setFines(res.fines);
      setOutstanding(res.outstanding);
      setCurrency(res.currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('portalPages.fines.errLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Loads once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';

  const open = (fine: TrafficFine, kind: Dialog['kind']) => {
    setDialog({ fine, kind });
    setReason('');
    setDialogError(null);
    setNotice(null);
    setPaid(false);
  };

  const close = () => {
    setDialog(null);
    if (paid) load();
  };

  const submitDispute = async () => {
    if (!dialog) return;
    try {
      setSaving(true);
      setDialogError(null);
      await trafficFineApi.dispute(dialog.fine.id, reason.trim());
      setNotice(t('portalPages.fines.disputedNotice', { reference: dialog.fine.reference }));
      setDialog(null);
      await load();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : t('portalPages.fines.errSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cp-page-container">
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.fines.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.fines.subtitle')}</p>
        </div>
        {outstanding > 0 && (
          <span className="cp-badge cp-badge-danger" style={{ fontSize: '0.9rem', padding: '8px 14px' }}>
            {t('portalPages.fines.outstanding', { amount: formatMoney(outstanding, currency, 2) })}
          </span>
        )}
      </div>

      {notice && (
        <div role="status" style={{ color: '#047857', fontWeight: 600 }}>
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="cp-alert cp-alert-error" style={{ padding: '14px 16px', borderRadius: '12px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div aria-busy="true" style={{ padding: '24px', textAlign: 'center', color: 'var(--cp-text-muted)' }}>
          {t('portalPages.fines.loading')}
        </div>
      ) : fines.length === 0 ? (
        <div className="cp-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 10px auto' }} />
          <h2 className="cp-card-title" style={{ margin: 0 }}>{t('portalPages.fines.emptyTitle')}</h2>
          <p style={{ color: 'var(--cp-text-muted)', margin: '6px 0 0' }}>{t('portalPages.fines.emptyDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {fines.map((fine) => (
            <div key={fine.id} className="cp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <FileWarning size={28} color="var(--cp-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <h2 className="cp-card-title" style={{ margin: 0 }}>{t(`adminPages.trafficFines.type${fine.offenceType}`)}</h2>
                      <span className={`cp-badge ${BADGE[fine.status]}`}>{t(`portalPages.fines.status${fine.status}`)}</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
                      {t('portalPages.fines.when', { date: formatDate(fine.offenceAt) })}
                      {fine.location ? ` · ${fine.location}` : ''}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>
                      {fine.vehicle.name} · {fine.vehicle.registrationNumber}
                      {fine.booking && (
                        <>
                          {' · '}
                          <Link to={`/customer/bookings/${fine.booking.id}`} style={{ color: 'var(--cp-primary)', fontWeight: 600 }}>
                            #{fine.booking.bookingNumber}
                          </Link>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '2px' }}>
                      {t('portalPages.fines.reference', { reference: fine.reference })}
                      {fine.authority ? ` · ${fine.authority}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cp-primary)' }}>{formatMoney(fine.totalAmount, fine.currency, 2)}</div>
                  {fine.adminFee > 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>
                      {t('adminPages.trafficFines.breakdown', {
                        fine: formatMoney(fine.fineAmount, fine.currency, 2),
                        fee: formatMoney(fine.adminFee, fine.currency, 2),
                      })}
                    </div>
                  )}
                  {fine.status === 'CHARGED' && fine.dueAt && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-danger)', fontWeight: 600 }}>{t('portalPages.fines.payBy', { date: formatDate(fine.dueAt) })}</div>
                  )}
                  {fine.status === 'PAID' && (
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>{t('portalPages.fines.paidOn', { date: formatDate(fine.paidAt) })}</div>
                  )}
                </div>
              </div>

              {(fine.disputeReason || fine.resolution) && (
                <div style={{ marginTop: '12px', background: '#F8F6F9', borderRadius: '10px', padding: '10px 12px', fontSize: '0.85rem' }}>
                  {fine.disputeReason && (
                    <div>
                      <strong>{t('portalPages.fines.yourReason')}:</strong> {fine.disputeReason}
                    </div>
                  )}
                  {fine.resolution && (
                    <div style={{ marginTop: fine.disputeReason ? '6px' : 0 }}>
                      <strong>{t('portalPages.fines.ourAnswer')}:</strong> {fine.resolution}
                    </div>
                  )}
                </div>
              )}

              {(fine.status === 'CHARGED' || fine.evidenceUrl) && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px', justifyContent: 'flex-end' }}>
                  {fine.evidenceUrl && (
                    <a href={fine.evidenceUrl} target="_blank" rel="noreferrer" className="cp-btn-outline">
                      {t('portalPages.fines.viewChallan')}
                    </a>
                  )}
                  {fine.canDispute && (
                    <button type="button" className="cp-btn-outline" onClick={() => open(fine, 'dispute')}>
                      <MessageSquareWarning size={16} />
                      {t('portalPages.fines.dispute')}
                    </button>
                  )}
                  {fine.status === 'CHARGED' && (
                    <button type="button" className="cp-btn-primary" onClick={() => open(fine, 'pay')}>
                      <CreditCard size={16} />
                      {t('portalPages.fines.pay', { amount: formatMoney(fine.totalAmount, fine.currency, 2) })}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box" role="dialog" aria-modal="true" aria-labelledby="fine-dialog-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="fine-dialog-title" className="cp-card-title" style={{ margin: 0 }}>
                {dialog.kind === 'pay'
                  ? t('portalPages.fines.payTitle', { reference: dialog.fine.reference })
                  : t('portalPages.fines.disputeTitle', { reference: dialog.fine.reference })}
              </h2>
              <button type="button" onClick={close} aria-label={t('portalPages.fines.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {dialog.kind === 'pay' ? (
              paid ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cp-primary)', margin: 0 }}>{t('portalPages.fines.paidTitle')}</h3>
                  <p style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.fines.paidDesc')}</p>
                  <button type="button" className="cp-btn-primary" onClick={close}>
                    {t('portalPages.fines.done')}
                  </button>
                </div>
              ) : (
                <StripePaymentForm trafficFineId={dialog.fine.id} onSuccess={() => setPaid(true)} onCancel={close} />
              )
            ) : (
              <>
                <p style={{ fontSize: '0.88rem', color: 'var(--cp-text-muted)', marginTop: 0 }}>{t('portalPages.fines.disputeHelp')}</p>
                <div className="cp-form-group">
                  <label htmlFor="fine-reason" className="cp-label">
                    {t('portalPages.fines.reasonLabel')}
                  </label>
                  <textarea id="fine-reason" className="cp-input" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                {dialogError && (
                  <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.88rem', marginBottom: '10px' }}>
                    {dialogError}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="cp-btn-outline" onClick={close}>
                    {t('portalPages.fines.cancel')}
                  </button>
                  <button type="button" className="cp-btn-primary" disabled={saving || reason.trim().length < MIN_REASON_TEXT} onClick={submitDispute}>
                    {saving ? t('portalPages.fines.sending') : t('portalPages.fines.sendDispute')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
