import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Tag, Pencil, Trash2, Power } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Modal,
  ResponsiveTable,
  EmptyState,
  LoadingState,
  confirmDialog,
} from '../../../components/common';
import { promoCodeApi, type PromoCode, type PromoCodePayload, type PromoDiscountType } from '../api/promoCodeApi';
import { bookingsApi } from '../../../api/services/bookings.api';
import { formatMoney } from '../../../utils/carImageHelper';

interface PromoForm {
  code: string;
  description: string;
  discountType: PromoDiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minRentalAmount: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  maxRedemptionsPerCustomer: string;
  isActive: boolean;
}

const EMPTY_FORM: PromoForm = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxDiscountAmount: '',
  minRentalAmount: '',
  startsAt: '',
  endsAt: '',
  maxRedemptions: '',
  maxRedemptionsPerCustomer: '1',
  isActive: true,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #ECEAEF',
  backgroundColor: '#F7F5F8',
  boxSizing: 'border-box',
};
const labelStyle: CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' };

/** A date-time input value (local time) from an ISO string, and back. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);
const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

export function PromoCodesPage() {
  const { t, i18n } = useTranslation();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await promoCodeApi.list();
      setCodes(res.promoCodes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPages.promoCodes.errLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    bookingsApi
      .options()
      .then((res) => setCurrency(res.options.currency))
      .catch(() => setCurrency(''));
    // Loads once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';

  const statusOf = (c: PromoCode): { label: string; color: string; background: string } => {
    const now = Date.now();
    if (!c.isActive) return { label: t('adminPages.promoCodes.statusInactive'), color: '#6B7280', background: '#F3F4F6' };
    if (c.endsAt && new Date(c.endsAt).getTime() < now) {
      return { label: t('adminPages.promoCodes.statusExpired'), color: '#B91C1C', background: 'rgba(239, 68, 68, 0.12)' };
    }
    if (c.startsAt && new Date(c.startsAt).getTime() > now) {
      return { label: t('adminPages.promoCodes.statusScheduled'), color: '#1D4ED8', background: 'rgba(59, 130, 246, 0.12)' };
    }
    if (c.maxRedemptions && c.timesUsed >= c.maxRedemptions) {
      return { label: t('adminPages.promoCodes.statusUsedUp'), color: '#B45309', background: 'rgba(250, 184, 38, 0.2)' };
    }
    return { label: t('adminPages.promoCodes.statusActive'), color: '#047857', background: 'rgba(16, 185, 129, 0.12)' };
  };

  const discountText = (c: PromoCode) => {
    const value = Number(c.discountValue);
    if (c.discountType === 'PERCENT') {
      const cap = c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null;
      return cap
        ? t('adminPages.promoCodes.percentCapped', { percent: value, amount: formatMoney(cap, currency) })
        : t('adminPages.promoCodes.percent', { percent: value });
    }
    return formatMoney(value, currency, 2);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (c: PromoCode) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: String(Number(c.discountValue)),
      maxDiscountAmount: c.maxDiscountAmount ? String(Number(c.maxDiscountAmount)) : '',
      minRentalAmount: c.minRentalAmount ? String(Number(c.minRentalAmount)) : '',
      startsAt: toLocalInput(c.startsAt),
      endsAt: toLocalInput(c.endsAt),
      maxRedemptions: c.maxRedemptions ? String(c.maxRedemptions) : '',
      maxRedemptionsPerCustomer: String(c.maxRedemptionsPerCustomer || 1),
      isActive: c.isActive,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload: PromoCodePayload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount: form.discountType === 'PERCENT' ? numberOrNull(form.maxDiscountAmount) : null,
      minRentalAmount: numberOrNull(form.minRentalAmount),
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      maxRedemptions: numberOrNull(form.maxRedemptions),
      maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer) || 1,
      isActive: form.isActive,
    };
    try {
      setSaving(true);
      setFormError(null);
      if (editing) await promoCodeApi.update(editing.id, payload);
      else await promoCodeApi.create(payload);
      setIsFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('adminPages.promoCodes.errSave'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: PromoCode) => {
    try {
      setBusyId(c.id);
      setError(null);
      await promoCodeApi.update(c.id, { isActive: !c.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPages.promoCodes.errSave'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: PromoCode) => {
    const ok = await confirmDialog({
      title: t('adminPages.promoCodes.deleteTitle', { code: c.code }),
      message: c.timesUsed > 0 ? t('adminPages.promoCodes.deleteUsed') : t('adminPages.promoCodes.deleteUnused'),
      confirmText: t('adminPages.promoCodes.delete'),
      cancelText: t('adminPages.promoCodes.cancel'),
      variant: 'danger',
    });
    if (!ok) return;
    try {
      setBusyId(c.id);
      setError(null);
      await promoCodeApi.remove(c.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPages.promoCodes.errSave'));
    } finally {
      setBusyId(null);
    }
  };

  const iconButton: CSSProperties = {
    background: 'none',
    border: '1px solid #ECEAEF',
    borderRadius: '8px',
    padding: '6px',
    cursor: 'pointer',
    color: '#1E0426',
    display: 'inline-flex',
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('adminPages.promoCodes.title')}
        subtitle={t('adminPages.promoCodes.subtitle')}
        breadcrumbs={[{ label: t('adminPages.promoCodes.admin'), to: '/admin/dashboard' }, { label: t('adminPages.promoCodes.title') }]}
        actions={
          <button
            type="button"
            onClick={openCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>{t('adminPages.promoCodes.add')}</span>
          </button>
        }
      />

      {error && (
        <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : codes.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={t('adminPages.promoCodes.emptyTitle')}
          description={t('adminPages.promoCodes.emptyDesc')}
          action={{ label: t('adminPages.promoCodes.add'), onClick: openCreate }}
        />
      ) : (
        <ResponsiveTable>
          <table className="finovo-table">
            <thead>
              <tr>
                <th>{t('adminPages.promoCodes.colCode')}</th>
                <th>{t('adminPages.promoCodes.colDiscount')}</th>
                <th>{t('adminPages.promoCodes.colValid')}</th>
                <th>{t('adminPages.promoCodes.colUses')}</th>
                <th>{t('adminPages.promoCodes.colGiven')}</th>
                <th>{t('adminPages.promoCodes.colStatus')}</th>
                <th style={{ textAlign: 'end' }}>{t('adminPages.promoCodes.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#1E0426', letterSpacing: '0.04em' }}>{c.code}</div>
                      {c.description && <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{c.description}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{discountText(c)}</div>
                      {c.minRentalAmount && Number(c.minRentalAmount) > 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                          {t('adminPages.promoCodes.minRental', { amount: formatMoney(Number(c.minRentalAmount), currency) })}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <div>{t('adminPages.promoCodes.from', { date: formatDate(c.startsAt) })}</div>
                      <div>{t('adminPages.promoCodes.until', { date: formatDate(c.endsAt) })}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>
                        {c.maxRedemptions
                          ? t('adminPages.promoCodes.usesOf', { used: c.timesUsed, max: c.maxRedemptions })
                          : t('adminPages.promoCodes.usesUnlimited', { used: c.timesUsed })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {t('adminPages.promoCodes.perCustomer', { count: c.maxRedemptionsPerCustomer })}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatMoney(c.totalDiscountGiven, currency, 2)}</td>
                    <td>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: status.color,
                          background: status.background,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button type="button" style={iconButton} onClick={() => openEdit(c)} aria-label={t('adminPages.promoCodes.edit')} title={t('adminPages.promoCodes.edit')}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          style={iconButton}
                          disabled={busyId === c.id}
                          onClick={() => toggleActive(c)}
                          aria-label={c.isActive ? t('adminPages.promoCodes.deactivate') : t('adminPages.promoCodes.activate')}
                          title={c.isActive ? t('adminPages.promoCodes.deactivate') : t('adminPages.promoCodes.activate')}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          type="button"
                          style={{ ...iconButton, color: '#B91C1C' }}
                          disabled={busyId === c.id}
                          onClick={() => remove(c)}
                          aria-label={t('adminPages.promoCodes.delete')}
                          title={t('adminPages.promoCodes.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTable>
      )}

      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editing ? t('adminPages.promoCodes.editTitle', { code: editing.code }) : t('adminPages.promoCodes.addTitle')}
          subtitle={t('adminPages.promoCodes.formSubtitle')}
          maxWidth="620px"
        >
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle} htmlFor="promo-code">{t('adminPages.promoCodes.fieldCode')} *</label>
                <input
                  id="promo-code"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9-]+"
                  placeholder="WELCOME10"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  style={{ ...inputStyle, textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="promo-type">{t('adminPages.promoCodes.fieldType')}</label>
                <select
                  id="promo-type"
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as PromoDiscountType })}
                  style={inputStyle}
                >
                  <option value="PERCENT">{t('adminPages.promoCodes.typePercent')}</option>
                  <option value="FIXED">{t('adminPages.promoCodes.typeFixed', { currency })}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="promo-value">{t('adminPages.promoCodes.fieldValue')} *</label>
                <input
                  id="promo-value"
                  type="number"
                  required
                  min={0.01}
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle} htmlFor="promo-description">{t('adminPages.promoCodes.fieldDescription')}</label>
              <input
                id="promo-description"
                maxLength={255}
                placeholder={t('adminPages.promoCodes.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={gridStyle}>
              {form.discountType === 'PERCENT' && (
                <div>
                  <label style={labelStyle} htmlFor="promo-cap">{t('adminPages.promoCodes.fieldCap', { currency })}</label>
                  <input
                    id="promo-cap"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label style={labelStyle} htmlFor="promo-min">{t('adminPages.promoCodes.fieldMinRental', { currency })}</label>
                <input
                  id="promo-min"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.minRentalAmount}
                  onChange={(e) => setForm({ ...form, minRentalAmount: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle} htmlFor="promo-starts">{t('adminPages.promoCodes.fieldStarts')}</label>
                <input id="promo-starts" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="promo-ends">{t('adminPages.promoCodes.fieldEnds')}</label>
                <input
                  id="promo-ends"
                  type="datetime-local"
                  min={form.startsAt || undefined}
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle} htmlFor="promo-total">{t('adminPages.promoCodes.fieldTotalUses')}</label>
                <input
                  id="promo-total"
                  type="number"
                  min={1}
                  step={1}
                  placeholder={t('adminPages.promoCodes.unlimited')}
                  value={form.maxRedemptions}
                  onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="promo-per-customer">{t('adminPages.promoCodes.fieldPerCustomer')}</label>
                <input
                  id="promo-per-customer"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={form.maxRedemptionsPerCustomer}
                  onChange={(e) => setForm({ ...form, maxRedemptionsPerCustomer: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#1E0426' }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              {t('adminPages.promoCodes.fieldActive')}
            </label>

            {formError && (
              <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.88rem' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #ECEAEF', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('adminPages.promoCodes.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? t('adminPages.promoCodes.saving') : t('adminPages.promoCodes.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
