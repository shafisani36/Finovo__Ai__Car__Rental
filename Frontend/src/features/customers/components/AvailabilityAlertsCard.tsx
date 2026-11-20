import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellRing, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { customerPortalApi, type AvailabilityAlert } from '../api/customerPortalApi';

/** Cars the customer is waiting for. Hidden when there are none. */
export function AvailabilityAlertsCard() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AvailabilityAlert[] | null>(null);
  const [maxActive, setMaxActive] = useState(5);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await customerPortalApi.getAvailabilityAlerts();
      setAlerts(res.alerts);
      setMaxActive(res.maxActive);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Links such as the confirmation after setting an alert open this card directly
  const loaded = alerts !== null;
  useEffect(() => {
    if (loaded && window.location.hash === '#availability-alerts') {
      document.getElementById('availability-alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loaded]);

  if (!alerts || alerts.length === 0) return null;

  const remove = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await customerPortalApi.cancelAvailabilityAlert(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('availabilityAlerts.errSave'));
    } finally {
      setBusyId(null);
    }
  };

  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="cp-card" id="availability-alerts">
      <h2 className="cp-card-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BellRing size={18} /> {t('availabilityAlerts.listTitle')}
      </h2>
      <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: '0 0 14px' }}>
        {t('availabilityAlerts.listHelp', { count: activeCount, max: maxActive })}
      </p>
      <div style={{ display: 'grid', gap: '10px' }}>
        {alerts.map((a) => {
          const free = a.status === 'NOTIFIED';
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '12px',
                border: `1px solid ${free ? 'var(--cp-success-border)' : 'var(--cp-border)'}`,
                background: free ? 'var(--cp-success-bg)' : 'transparent',
                borderRadius: '12px',
              }}
            >
              {a.imageUrl ? (
                <img src={a.imageUrl} alt="" width={84} height={56} style={{ objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
              ) : null}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontWeight: 700, color: 'var(--cp-text-main)' }}>{a.vehicleName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>
                  {when(a.pickupDateTime)} → {when(a.returnDateTime)}
                </div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginTop: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: free ? 'var(--cp-success)' : 'var(--cp-warning)',
                  }}
                >
                  {free ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  {free ? t('availabilityAlerts.statusFree') : t('availabilityAlerts.statusWaiting')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {free && (
                  <Link to={a.bookUrl} className="cp-btn-primary">
                    {t('availabilityAlerts.bookNow')}
                  </Link>
                )}
                <button
                  type="button"
                  className="cp-btn-outline"
                  disabled={busyId === a.id}
                  onClick={() => void remove(a.id)}
                  aria-label={t('availabilityAlerts.remove')}
                >
                  <Trash2 size={15} /> {t('availabilityAlerts.remove')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.9rem', marginTop: '10px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
