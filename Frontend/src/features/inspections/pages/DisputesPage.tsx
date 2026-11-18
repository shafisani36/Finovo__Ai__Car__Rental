import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquareWarning } from 'lucide-react';
import { PageContainer, PageHeader, Modal, ResponsiveTable, EmptyState, LoadingState } from '../../../components/common';
import { inspectionApi, type DamageDispute } from '../api/inspectionApi';
import { formatMoney } from '../../../utils/carImageHelper';

const MIN_RESPONSE_TEXT = 5;

/** Staff list of damage charges that customers disputed: open ones first, then the latest decisions. */
export function DisputesPage() {
  const { t, i18n } = useTranslation();
  const [disputes, setDisputes] = useState<DamageDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [active, setActive] = useState<DamageDispute | null>(null);
  const [response, setResponse] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await inspectionApi.listDisputes();
      setDisputes(res.disputes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPages.disputes.errLoad'));
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

  const openCount = disputes.filter((d) => d.status === 'DISPUTED').length;

  const decide = async (decision: 'ACCEPT' | 'REJECT') => {
    if (!active) return;
    try {
      setSaving(true);
      setFormError(null);
      const res = await inspectionApi.resolveDispute(active.id, decision, response.trim());
      const refundNote =
        res.refund && res.refund.pendingManual > 0
          ? ` ${t('adminPages.disputes.manualRefund', { amount: formatMoney(res.refund.pendingManual, active.currency, 2) })}`
          : '';
      setNotice(
        (decision === 'ACCEPT'
          ? t('adminPages.disputes.acceptedNotice', { number: active.bookingNumber })
          : t('adminPages.disputes.rejectedNotice', { number: active.bookingNumber })) + refundNote
      );
      setActive(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('adminPages.disputes.errSave'));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (d: DamageDispute) => {
    if (d.status === 'DISPUTED') {
      return { label: t('adminPages.disputes.statusOpen'), color: '#B45309', background: 'rgba(250, 184, 38, 0.2)' };
    }
    if (d.status === 'REJECTED') {
      return { label: t('adminPages.disputes.statusAccepted'), color: '#047857', background: 'rgba(16, 185, 129, 0.12)' };
    }
    return { label: t('adminPages.disputes.statusRejected'), color: '#6B7280', background: '#F3F4F6' };
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('adminPages.disputes.title')}
        subtitle={t('adminPages.disputes.subtitle', { count: openCount })}
        breadcrumbs={[{ label: t('adminPages.promoCodes.admin'), to: '/admin/dashboard' }, { label: t('adminPages.disputes.title') }]}
      />

      {notice && (
        <div role="status" style={{ color: '#047857', fontWeight: 600, marginBottom: '12px' }}>
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : disputes.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title={t('adminPages.disputes.emptyTitle')} description={t('adminPages.disputes.emptyDesc')} />
      ) : (
        <ResponsiveTable>
          <table className="finovo-table">
            <thead>
              <tr>
                <th>{t('adminPages.disputes.colBooking')}</th>
                <th>{t('adminPages.disputes.colCharge')}</th>
                <th>{t('adminPages.disputes.colReason')}</th>
                <th>{t('adminPages.disputes.colOpened')}</th>
                <th>{t('adminPages.disputes.colStatus')}</th>
                <th style={{ textAlign: 'end' }}>{t('adminPages.disputes.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => {
                const badge = statusBadge(d);
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#1E0426' }}>{d.bookingNumber}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{d.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {d.vehicle} · {d.registrationNumber}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.description}</div>
                      <div style={{ fontWeight: 800 }}>{formatMoney(d.amount, d.currency, 2)}</div>
                    </td>
                    <td style={{ maxWidth: '320px', fontSize: '0.85rem' }}>
                      <div>{d.reason || '—'}</div>
                      {d.response && (
                        <div style={{ marginTop: '6px', color: '#6B7280' }}>
                          <strong>{t('adminPages.disputes.answer')}:</strong> {d.response}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <div>{formatDate(d.openedAt)}</div>
                      {d.resolvedAt && (
                        <div style={{ color: '#6B7280' }}>{t('adminPages.disputes.decidedOn', { date: formatDate(d.resolvedAt) })}</div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: badge.color,
                          background: badge.background,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Link to={`/admin/bookings?search=${encodeURIComponent(d.bookingNumber)}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6C1E84' }}>
                          {t('adminPages.disputes.openBooking')}
                        </Link>
                        {d.customerScans.map((scan) => (
                          <Link key={scan.id} to={`/admin/inspections/${scan.id}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6C1E84' }}>
                            {scan.scoreOutOf10 === null
                              ? t('adminPages.disputes.customerScanPhotos', { stage: t(`portalPages.selfCheck.stage${scan.stage}`) })
                              : t('adminPages.disputes.customerScan', {
                                  stage: t(`portalPages.selfCheck.stage${scan.stage}`),
                                  score: scan.scoreOutOf10,
                                })}
                          </Link>
                        ))}
                        {d.status === 'DISPUTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActive(d);
                              setResponse('');
                              setFormError(null);
                              setNotice(null);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#1E0426',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            {t('adminPages.disputes.review')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTable>
      )}

      {active && (
        <Modal
          isOpen={Boolean(active)}
          onClose={() => setActive(null)}
          title={t('adminPages.disputes.reviewTitle', { number: active.bookingNumber })}
          subtitle={`${active.description} · ${formatMoney(active.amount, active.currency, 2)}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#FAF9FB', border: '1px solid #ECEAEF', borderRadius: '10px', padding: '12px', fontSize: '0.88rem' }}>
              <strong>{t('adminPages.disputes.customerSays')}:</strong> {active.reason}
            </div>
            <div>
              <label htmlFor="dispute-response" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                {t('adminPages.disputes.responseLabel')}
              </label>
              <textarea
                id="dispute-response"
                rows={4}
                maxLength={1000}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={t('adminPages.disputes.responsePlaceholder')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ECEAEF', backgroundColor: '#F7F5F8', boxSizing: 'border-box', font: 'inherit' }}
              />
              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '6px 0 0' }}>{t('adminPages.disputes.acceptHint')}</p>
            </div>
            {formError && (
              <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.88rem' }}>
                {formError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={saving || response.trim().length < MIN_RESPONSE_TEXT}
                onClick={() => decide('REJECT')}
                style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #ECEAEF', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('adminPages.disputes.keepCharge')}
              </button>
              <button
                type="button"
                disabled={saving || response.trim().length < MIN_RESPONSE_TEXT}
                onClick={() => decide('ACCEPT')}
                style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: '#047857', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                {t('adminPages.disputes.removeCharge')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
