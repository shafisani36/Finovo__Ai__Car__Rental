import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2, CheckCircle2, Clock, XCircle, Camera } from 'lucide-react';
import { customerPortalApi, type BookingDriver } from '../api/customerPortalApi';
import { compressImage, PhotoError } from '../../inspections/components/compressImage';

interface AdditionalDriverCardProps {
  bookingId: string;
  /** The car must be returned by then, so the licence has to be valid until this date */
  returnDateTime: string;
}

const STATUS_STYLE: Record<BookingDriver['status'], { color: string; Icon: typeof CheckCircle2 }> = {
  VERIFIED: { color: 'var(--cp-success)', Icon: CheckCircle2 },
  PENDING_VERIFICATION: { color: '#B45309', Icon: Clock },
  REJECTED: { color: 'var(--cp-danger)', Icon: XCircle },
};

const EMPTY_FORM = { fullName: '', phone: '', licenceNumber: '', licenceExpiresAt: '' };

/**
 * Lets the customer add the second driver of a booking that includes the "Additional driver" add-on. Staff check
 * the licence before confirming the booking. Hidden when the booking has no such add-on.
 */
export function AdditionalDriverCard({ bookingId, returnDateTime }: AdditionalDriverCardProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<{ allowed: number; editable: boolean; drivers: BookingDriver[] } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await customerPortalApi.getDrivers(bookingId);
      setState({ allowed: res.allowed, editable: res.editable, drivers: res.drivers });
    } catch {
      setState(null);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Links such as the check-in page open this card directly (#additional-driver)
  const loaded = state !== null;
  useEffect(() => {
    if (loaded && window.location.hash === '#additional-driver') {
      document.getElementById('additional-driver')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loaded]);

  if (!state || (state.allowed === 0 && state.drivers.length === 0)) return null;

  const minExpiry = returnDateTime.slice(0, 10);

  const pickPhoto = async (file: File | undefined, set: (value: string) => void) => {
    if (!file) return;
    setError(null);
    try {
      set(await compressImage(file));
    } catch (err) {
      setError(err instanceof PhotoError ? t(err.message) : t('portalPages.additionalDriver.errPhoto'));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!front || !back) {
      setError(t('portalPages.additionalDriver.errBothSides'));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await customerPortalApi.addDriver(bookingId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        licenceNumber: form.licenceNumber.trim(),
        licenceExpiresAt: form.licenceExpiresAt,
        licenceFront: front,
        licenceBack: back,
      });
      setForm(EMPTY_FORM);
      setFront(null);
      setBack(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('portalPages.additionalDriver.errSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (driverId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await customerPortalApi.removeDriver(bookingId, driverId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('portalPages.additionalDriver.errSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const canAdd = state.editable && state.drivers.length < state.allowed;

  return (
    <div className="cp-card" id="additional-driver">
      <h2 className="cp-card-title" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UserPlus size={18} /> {t('portalPages.additionalDriver.title')}
      </h2>
      <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: '0 0 14px' }}>{t('portalPages.additionalDriver.help')}</p>

      {state.drivers.map((d) => {
        const { color, Icon } = STATUS_STYLE[d.status] ?? STATUS_STYLE.PENDING_VERIFICATION;
        return (
          <div key={d.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '12px', border: '1px solid var(--cp-border)', borderRadius: '12px', marginBottom: '12px' }}>
            <img src={d.licenceFrontUrl} alt={t('portalPages.additionalDriver.front')} width={96} height={62} style={{ objectFit: 'cover', borderRadius: '8px' }} />
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{d.fullName}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>
                {t('portalPages.additionalDriver.licenceLine', { number: d.licenceNumber, date: new Date(d.licenceExpiresAt).toLocaleDateString() })}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Icon size={14} /> {t(`portalPages.additionalDriver.status.${d.status}`)}
              </div>
              {d.rejectionReason && <div style={{ fontSize: '0.85rem', color: 'var(--cp-danger)' }}>{d.rejectionReason}</div>}
            </div>
            {state.editable && (
              <button type="button" className="cp-btn-outline" disabled={isSaving} onClick={() => void remove(d.id)}>
                <Trash2 size={15} /> {t('portalPages.additionalDriver.remove')}
              </button>
            )}
          </div>
        );
      })}

      {canAdd && (
        <form onSubmit={submit} style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <label className="cp-label" style={{ display: 'grid', gap: '6px', textTransform: 'none' }}>
              {t('portalPages.additionalDriver.fullName')}
              <input className="cp-input" required minLength={3} maxLength={128} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>
            <label className="cp-label" style={{ display: 'grid', gap: '6px', textTransform: 'none' }}>
              {t('portalPages.additionalDriver.phone')}
              <input className="cp-input" type="tel" maxLength={32} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="cp-label" style={{ display: 'grid', gap: '6px', textTransform: 'none' }}>
              {t('portalPages.additionalDriver.licenceNumber')}
              <input className="cp-input" required minLength={4} maxLength={64} value={form.licenceNumber} onChange={(e) => setForm({ ...form, licenceNumber: e.target.value })} />
            </label>
            <label className="cp-label" style={{ display: 'grid', gap: '6px', textTransform: 'none' }}>
              {t('portalPages.additionalDriver.licenceExpiry')}
              <input className="cp-input" type="date" required min={minExpiry} value={form.licenceExpiresAt} onChange={(e) => setForm({ ...form, licenceExpiresAt: e.target.value })} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: t('portalPages.additionalDriver.front'), value: front, set: setFront },
              { label: t('portalPages.additionalDriver.back'), value: back, set: setBack },
            ].map((side) => (
              <div key={side.label} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="cp-btn-outline" style={{ cursor: 'pointer' }}>
                  <Camera size={16} /> {side.label}
                  <input type="file" accept="image/*" hidden disabled={isSaving} onChange={(e) => void pickPhoto(e.target.files?.[0], side.set)} />
                </label>
                {side.value && <img src={side.value} alt={side.label} width={80} height={52} style={{ objectFit: 'cover', borderRadius: '8px' }} />}
              </div>
            ))}
          </div>
          {error && <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>}
          <div>
            <button type="submit" className="cp-btn-primary" disabled={isSaving}>
              <UserPlus size={16} /> {isSaving ? t('portalPages.additionalDriver.saving') : t('portalPages.additionalDriver.add')}
            </button>
          </div>
        </form>
      )}
      {!canAdd && error && <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>}
    </div>
  );
}
