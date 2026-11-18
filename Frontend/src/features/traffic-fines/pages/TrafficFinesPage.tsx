import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileWarning, Plus, Search } from 'lucide-react';
import { PageContainer, PageHeader, Modal, ResponsiveTable, EmptyState, LoadingState } from '../../../components/common';
import { formatMoney } from '../../../utils/carImageHelper';
import { compressImage } from '../../inspections/components/compressImage';
import {
  OFFLINE_PAYMENT_METHODS,
  TRAFFIC_FINE_STATUSES,
  TRAFFIC_FINE_TYPES,
  trafficFineApi,
  type OfflinePaymentMethod,
  type TrafficFine,
  type TrafficFineMatch,
  type TrafficFineStatus,
  type TrafficFineType,
} from '../api/trafficFineApi';

const MIN_ANSWER_TEXT = 5;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const MATCH_DELAY_MS = 400;

const LABEL: CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' };
const INPUT: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #ECEAEF',
  backgroundColor: '#F7F5F8',
  boxSizing: 'border-box',
  font: 'inherit',
};
const LINK: CSSProperties = { fontSize: '0.82rem', fontWeight: 600, color: '#6C1E84' };
const SMALL_BUTTON: CSSProperties = {
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid #ECEAEF',
  background: '#FFFFFF',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
};

const STATUS_STYLE: Record<TrafficFineStatus, { color: string; background: string }> = {
  UNMATCHED: { color: '#6B7280', background: '#F3F4F6' },
  CHARGED: { color: '#B91C1C', background: 'rgba(239, 68, 68, 0.12)' },
  DISPUTED: { color: '#B45309', background: 'rgba(250, 184, 38, 0.2)' },
  PAID: { color: '#047857', background: 'rgba(16, 185, 129, 0.12)' },
  WAIVED: { color: '#4B5563', background: '#E5E7EB' },
};

interface FineForm {
  plateNumber: string;
  offenceAt: string;
  offenceType: TrafficFineType;
  reference: string;
  authority: string;
  location: string;
  fineAmount: string;
  adminFee: string;
  notes: string;
  evidence: string | null;
  evidenceName: string;
}

type Action = { fine: TrafficFine; kind: 'dispute' | 'waive' | 'paid' };

function emptyForm(adminFee: number): FineForm {
  return {
    plateNumber: '',
    offenceAt: '',
    offenceType: 'SPEEDING',
    reference: '',
    authority: '',
    location: '',
    fineAmount: '',
    adminFee: String(adminFee),
    notes: '',
    evidence: null,
    evidenceName: '',
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Staff record traffic fines; each one is matched to whoever had the car at that moment and charged to them. */
export function TrafficFinesPage() {
  const { t, i18n } = useTranslation();
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [counts, setCounts] = useState<Record<TrafficFineStatus, number> | null>(null);
  const [defaults, setDefaults] = useState({ adminFee: 0, currency: 'SAR', paymentDays: 14 });
  const [status, setStatus] = useState<TrafficFineStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FineForm>(emptyForm(0));
  const [match, setMatch] = useState<TrafficFineMatch | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [action, setAction] = useState<Action | null>(null);
  const [answer, setAnswer] = useState('');
  const [method, setMethod] = useState<OfflinePaymentMethod>('CASH');
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async (nextStatus = status, nextSearch = search) => {
    try {
      setLoading(true);
      setError(null);
      const res = await trafficFineApi.list({ status: nextStatus, search: nextSearch.trim() });
      setFines(res.fines);
      setCounts(res.counts);
      setDefaults(res.defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPages.trafficFines.errLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Loads once when the page opens; filters reload explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shows who had the car at that moment while staff are still filling in the form
  const offenceIso = useMemo(() => {
    if (!form.offenceAt) return '';
    const date = new Date(form.offenceAt);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }, [form.offenceAt]);

  useEffect(() => {
    if (!formOpen || form.plateNumber.trim().length < 2 || !offenceIso) {
      setMatch(null);
      setMatchError(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await trafficFineApi.match(form.plateNumber.trim(), offenceIso);
        if (active) {
          setMatch(res.match);
          setMatchError(null);
        }
      } catch (err) {
        if (active) {
          setMatch(null);
          setMatchError(err instanceof Error ? err.message : t('adminPages.trafficFines.errMatch'));
        }
      }
    }, MATCH_DELAY_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [formOpen, form.plateNumber, offenceIso, t]);

  const formatDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';

  const update = <K extends keyof FineForm>(key: K, value: FineForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const openForm = () => {
    setForm(emptyForm(defaults.adminFee));
    setFormError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const pickEvidence = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_EVIDENCE_BYTES) throw new Error(t('adminPages.trafficFines.errEvidenceSize'));
      const dataUrl = file.type.startsWith('image/') ? await compressImage(file) : await readAsDataUrl(file);
      setForm((prev) => ({ ...prev, evidence: dataUrl, evidenceName: file.name }));
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('adminPages.trafficFines.errEvidence'));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!offenceIso) {
      setFormError(t('adminPages.trafficFines.errDate'));
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      const res = await trafficFineApi.create({
        reference: form.reference.trim(),
        plateNumber: form.plateNumber.trim(),
        offenceType: form.offenceType,
        offenceAt: offenceIso,
        fineAmount: Number(form.fineAmount),
        adminFee: form.adminFee === '' ? undefined : Number(form.adminFee),
        location: form.location.trim() || undefined,
        authority: form.authority.trim() || undefined,
        notes: form.notes.trim() || undefined,
        evidence: form.evidence || undefined,
      });
      setNotice(
        res.fine.customer && res.fine.booking
          ? t('adminPages.trafficFines.chargedNotice', {
              reference: res.fine.reference,
              name: res.fine.customer.fullName,
              amount: formatMoney(res.fine.totalAmount, res.fine.currency, 2),
            })
          : t('adminPages.trafficFines.unmatchedNotice', { reference: res.fine.reference })
      );
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('adminPages.trafficFines.errSave'));
    } finally {
      setSaving(false);
    }
  };

  const openAction = (fine: TrafficFine, kind: Action['kind']) => {
    setAction({ fine, kind });
    setAnswer('');
    setMethod(fine.status === 'UNMATCHED' ? 'COMPANY' : 'CASH');
    setActionError(null);
    setNotice(null);
  };

  const runAction = async (decision?: 'ACCEPT' | 'REJECT') => {
    if (!action) return;
    try {
      setSaving(true);
      setActionError(null);
      const { fine, kind } = action;
      if (kind === 'dispute' && decision) await trafficFineApi.resolveDispute(fine.id, decision, answer.trim());
      if (kind === 'waive') await trafficFineApi.waive(fine.id, answer.trim());
      if (kind === 'paid') await trafficFineApi.markPaid(fine.id, method);
      setNotice(t('adminPages.trafficFines.savedNotice', { reference: fine.reference }));
      setAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('adminPages.trafficFines.errSave'));
    } finally {
      setSaving(false);
    }
  };

  const chooseStatus = (next: TrafficFineStatus | '') => {
    setStatus(next);
    load(next, search);
  };

  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
  const canSave =
    !saving && form.reference.trim() && form.plateNumber.trim() && offenceIso && Number(form.fineAmount) > 0 && !matchError;

  return (
    <PageContainer>
      <PageHeader
        title={t('adminPages.trafficFines.title')}
        subtitle={t('adminPages.trafficFines.subtitle', { count: counts?.DISPUTED ?? 0 })}
        breadcrumbs={[{ label: t('adminPages.promoCodes.admin'), to: '/admin/dashboard' }, { label: t('adminPages.trafficFines.title') }]}
        actions={
          <button
            type="button"
            onClick={openForm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            {t('adminPages.trafficFines.record')}
          </button>
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        {(['', ...TRAFFIC_FINE_STATUSES] as const).map((value) => {
          const selected = status === value;
          return (
            <button
              key={value || 'ALL'}
              type="button"
              aria-pressed={selected}
              onClick={() => chooseStatus(value)}
              style={{
                ...SMALL_BUTTON,
                background: selected ? '#1E0426' : '#FFFFFF',
                color: selected ? '#FFFFFF' : '#1E0426',
                borderColor: selected ? '#1E0426' : '#ECEAEF',
              }}
            >
              {value ? t(`adminPages.trafficFines.status${value}`) : t('adminPages.trafficFines.all')} ({value ? counts?.[value] ?? 0 : total})
            </button>
          );
        })}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(status, search);
          }}
          style={{ marginInlineStart: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('adminPages.trafficFines.searchPlaceholder')}
            aria-label={t('adminPages.trafficFines.searchPlaceholder')}
            style={{ ...INPUT, width: '260px', backgroundColor: '#FFFFFF' }}
          />
          <button type="submit" style={SMALL_BUTTON} aria-label={t('adminPages.trafficFines.search')}>
            <Search size={15} />
          </button>
        </form>
      </div>

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
      ) : fines.length === 0 ? (
        <EmptyState icon={FileWarning} title={t('adminPages.trafficFines.emptyTitle')} description={t('adminPages.trafficFines.emptyDesc')} />
      ) : (
        <ResponsiveTable>
          <table className="finovo-table">
            <thead>
              <tr>
                <th>{t('adminPages.trafficFines.colFine')}</th>
                <th>{t('adminPages.trafficFines.colCar')}</th>
                <th>{t('adminPages.trafficFines.colRenter')}</th>
                <th>{t('adminPages.trafficFines.colAmount')}</th>
                <th>{t('adminPages.trafficFines.colStatus')}</th>
                <th style={{ textAlign: 'end' }}>{t('adminPages.trafficFines.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((fine) => {
                const style = STATUS_STYLE[fine.status];
                const open = fine.status !== 'PAID' && fine.status !== 'WAIVED';
                return (
                  <tr key={fine.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#1E0426' }}>{fine.reference}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{t(`adminPages.trafficFines.type${fine.offenceType}`)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{formatDate(fine.offenceAt)}</div>
                      {(fine.location || fine.authority) && (
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{[fine.location, fine.authority].filter(Boolean).join(' · ')}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{fine.vehicle.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{fine.vehicle.registrationNumber}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {fine.customer && fine.booking ? (
                        <>
                          <div style={{ fontWeight: 700 }}>{fine.customer.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{fine.customer.email}</div>
                          <Link to={`/admin/bookings?search=${encodeURIComponent(fine.booking.bookingNumber)}`} style={LINK}>
                            #{fine.booking.bookingNumber}
                          </Link>
                        </>
                      ) : (
                        <span style={{ color: '#6B7280' }}>{t('adminPages.trafficFines.noRenter')}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800 }}>{formatMoney(fine.totalAmount, fine.currency, 2)}</div>
                      {fine.adminFee > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          {t('adminPages.trafficFines.breakdown', {
                            fine: formatMoney(fine.fineAmount, fine.currency, 2),
                            fee: formatMoney(fine.adminFee, fine.currency, 2),
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          ...style,
                        }}
                      >
                        {t(`adminPages.trafficFines.status${fine.status}`)}
                      </span>
                      {fine.status === 'CHARGED' && fine.dueAt && (
                        <div style={{ color: '#6B7280', marginTop: '4px' }}>{t('adminPages.trafficFines.dueOn', { date: formatDate(fine.dueAt) })}</div>
                      )}
                      {fine.status === 'PAID' && (
                        <div style={{ color: '#6B7280', marginTop: '4px' }}>
                          {t(`adminPages.trafficFines.method${fine.paymentMethod ?? 'CARD'}`)} · {formatDate(fine.paidAt)}
                        </div>
                      )}
                      {fine.disputeReason && (
                        <div style={{ color: '#6B7280', marginTop: '4px', maxWidth: '240px' }}>
                          <strong>{t('adminPages.trafficFines.customerSays')}:</strong> {fine.disputeReason}
                        </div>
                      )}
                      {fine.resolution && (
                        <div style={{ color: '#6B7280', marginTop: '4px', maxWidth: '240px' }}>
                          <strong>{t('adminPages.trafficFines.answer')}:</strong> {fine.resolution}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {fine.evidenceUrl && (
                          <a href={fine.evidenceUrl} target="_blank" rel="noreferrer" style={LINK}>
                            {t('adminPages.trafficFines.evidence')}
                          </a>
                        )}
                        {fine.status === 'DISPUTED' && (
                          <button type="button" onClick={() => openAction(fine, 'dispute')} style={{ ...SMALL_BUTTON, background: '#1E0426', color: '#FFFFFF', border: 'none' }}>
                            {t('adminPages.trafficFines.review')}
                          </button>
                        )}
                        {open && (
                          <button type="button" onClick={() => openAction(fine, 'paid')} style={SMALL_BUTTON}>
                            {t('adminPages.trafficFines.markPaid')}
                          </button>
                        )}
                        {open && (
                          <button type="button" onClick={() => openAction(fine, 'waive')} style={SMALL_BUTTON}>
                            {t('adminPages.trafficFines.waive')}
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

      {formOpen && (
        <Modal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          title={t('adminPages.trafficFines.recordTitle')}
          subtitle={t('adminPages.trafficFines.recordSubtitle')}
          maxWidth="640px"
        >
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label htmlFor="fine-plate" style={LABEL}>{t('adminPages.trafficFines.plate')}</label>
              <input id="fine-plate" style={INPUT} value={form.plateNumber} maxLength={32} onChange={(e) => update('plateNumber', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="fine-at" style={LABEL}>{t('adminPages.trafficFines.offenceAt')}</label>
              <input id="fine-at" type="datetime-local" style={INPUT} value={form.offenceAt} onChange={(e) => update('offenceAt', e.target.value)} required />
            </div>

            <div
              role="status"
              style={{
                gridColumn: '1 / -1',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.86rem',
                border: '1px solid #ECEAEF',
                background: matchError ? 'rgba(239, 68, 68, 0.08)' : match?.renter ? 'rgba(16, 185, 129, 0.08)' : '#FAF9FB',
                color: matchError ? '#B91C1C' : '#1E0426',
              }}
            >
              {matchError
                ? matchError
                : match
                  ? match.renter
                    ? t('adminPages.trafficFines.matchRenter', {
                        car: `${match.vehicle.name} (${match.vehicle.registrationNumber})`,
                        name: match.renter.customerName,
                        number: match.renter.bookingNumber,
                      })
                    : t('adminPages.trafficFines.matchNobody', { car: `${match.vehicle.name} (${match.vehicle.registrationNumber})` })
                  : t('adminPages.trafficFines.matchHint')}
            </div>

            <div>
              <label htmlFor="fine-type" style={LABEL}>{t('adminPages.trafficFines.offenceType')}</label>
              <select id="fine-type" style={INPUT} value={form.offenceType} onChange={(e) => update('offenceType', e.target.value as TrafficFineType)}>
                {TRAFFIC_FINE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`adminPages.trafficFines.type${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fine-reference" style={LABEL}>{t('adminPages.trafficFines.reference')}</label>
              <input id="fine-reference" style={INPUT} value={form.reference} maxLength={64} onChange={(e) => update('reference', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="fine-amount" style={LABEL}>{t('adminPages.trafficFines.fineAmount', { currency: defaults.currency })}</label>
              <input id="fine-amount" type="number" min={0.01} step="0.01" style={INPUT} value={form.fineAmount} onChange={(e) => update('fineAmount', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="fine-fee" style={LABEL}>{t('adminPages.trafficFines.adminFee', { currency: defaults.currency })}</label>
              <input
                id="fine-fee"
                type="number"
                min={0}
                step="0.01"
                // No handling fee when the company keeps the fine
                disabled={Boolean(match && !match.renter)}
                style={{ ...INPUT, opacity: match && !match.renter ? 0.5 : 1 }}
                value={match && !match.renter ? '0' : form.adminFee}
                onChange={(e) => update('adminFee', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="fine-authority" style={LABEL}>{t('adminPages.trafficFines.authority')}</label>
              <input id="fine-authority" style={INPUT} value={form.authority} maxLength={120} onChange={(e) => update('authority', e.target.value)} />
            </div>
            <div>
              <label htmlFor="fine-location" style={LABEL}>{t('adminPages.trafficFines.location')}</label>
              <input id="fine-location" style={INPUT} value={form.location} maxLength={200} onChange={(e) => update('location', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="fine-evidence" style={LABEL}>{t('adminPages.trafficFines.evidenceLabel')}</label>
              <input id="fine-evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pickEvidence(e.target.files?.[0])} />
              {form.evidenceName && <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '4px' }}>{form.evidenceName}</div>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="fine-notes" style={LABEL}>{t('adminPages.trafficFines.notes')}</label>
              <textarea id="fine-notes" rows={2} maxLength={1000} style={INPUT} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </div>

            {formError && (
              <div role="alert" style={{ gridColumn: '1 / -1', color: '#B91C1C', fontWeight: 600, fontSize: '0.88rem' }}>
                {formError}
              </div>
            )}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setFormOpen(false)} style={{ ...SMALL_BUTTON, padding: '10px 18px' }}>
                {t('adminPages.trafficFines.cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSave}
                style={{ padding: '10px 18px', borderRadius: '8px', background: '#1E0426', color: '#FFFFFF', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: canSave ? 1 : 0.6 }}
              >
                {saving
                  ? t('adminPages.trafficFines.saving')
                  : match?.renter
                    ? t('adminPages.trafficFines.saveAndCharge')
                    : t('adminPages.trafficFines.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {action && (
        <Modal
          isOpen={Boolean(action)}
          onClose={() => setAction(null)}
          title={t(`adminPages.trafficFines.actionTitle_${action.kind}`, { reference: action.fine.reference })}
          subtitle={`${t(`adminPages.trafficFines.type${action.fine.offenceType}`)} · ${formatMoney(action.fine.totalAmount, action.fine.currency, 2)}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {action.kind === 'dispute' && (
              <div style={{ background: '#FAF9FB', border: '1px solid #ECEAEF', borderRadius: '10px', padding: '12px', fontSize: '0.88rem' }}>
                <strong>{t('adminPages.trafficFines.customerSays')}:</strong> {action.fine.disputeReason}
              </div>
            )}
            {action.kind === 'paid' ? (
              <div>
                <label htmlFor="fine-method" style={LABEL}>{t('adminPages.trafficFines.methodLabel')}</label>
                <select id="fine-method" style={INPUT} value={method} onChange={(e) => setMethod(e.target.value as OfflinePaymentMethod)}>
                  {OFFLINE_PAYMENT_METHODS.filter((m) => action.fine.status !== 'UNMATCHED' || m === 'COMPANY').map((m) => (
                    <option key={m} value={m}>
                      {t(`adminPages.trafficFines.method${m}`)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="fine-answer" style={LABEL}>
                  {action.kind === 'dispute' ? t('adminPages.trafficFines.answerLabel') : t('adminPages.trafficFines.waiveLabel')}
                </label>
                <textarea id="fine-answer" rows={4} maxLength={1000} style={INPUT} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </div>
            )}
            {actionError && (
              <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.88rem' }}>
                {actionError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              {action.kind === 'dispute' ? (
                <>
                  <button type="button" disabled={saving || answer.trim().length < MIN_ANSWER_TEXT} onClick={() => runAction('REJECT')} style={{ ...SMALL_BUTTON, padding: '10px 18px' }}>
                    {t('adminPages.trafficFines.keepFine')}
                  </button>
                  <button
                    type="button"
                    disabled={saving || answer.trim().length < MIN_ANSWER_TEXT}
                    onClick={() => runAction('ACCEPT')}
                    style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: '#047857', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    {t('adminPages.trafficFines.removeFine')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={saving || (action.kind === 'waive' && answer.trim().length < MIN_ANSWER_TEXT)}
                  onClick={() => runAction()}
                  style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: '#1E0426', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  {action.kind === 'waive' ? t('adminPages.trafficFines.waive') : t('adminPages.trafficFines.markPaid')}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
