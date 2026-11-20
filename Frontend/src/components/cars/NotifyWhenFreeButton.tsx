import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../features/auth/context';
import { customerPortalApi } from '../../features/customers/api/customerPortalApi';

interface NotifyWhenFreeButtonProps {
  vehicleId: string;
  /** Pickup and return as ISO date-times */
  pickupDateTime: string;
  returnDateTime: string;
  /** "dark" for the booking card on the public car page, "portal" for the customer portal */
  variant?: 'dark' | 'portal';
  /** Where to come back after signing in (keeps the chosen dates); defaults to the current page */
  returnPath?: string;
}

type State = 'idle' | 'saving' | 'saved' | 'freeNow';

/**
 * Shown when a car is taken on the chosen dates: the customer leaves an alert and is emailed once the car is
 * free for those dates. Visitors who are not signed in are sent to the login first and come back here.
 */
export function NotifyWhenFreeButton({ vehicleId, pickupDateTime, returnDateTime, variant = 'portal', returnPath }: NotifyWhenFreeButtonProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const dark = variant === 'dark';

  const submit = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(returnPath ?? location.pathname + location.search)}`);
      return;
    }
    setState('saving');
    setError(null);
    try {
      const res = await customerPortalApi.createAvailabilityAlert({ vehicleId, pickupDateTime, returnDateTime });
      setState(res.availableNow ? 'freeNow' : 'saved');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : t('availabilityAlerts.errSave'));
    }
  };

  const textColor = dark ? 'rgba(255, 255, 255, 0.85)' : 'var(--cp-text-muted)';

  if (state === 'saved' || state === 'freeNow') {
    return (
      <div
        role="status"
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          padding: '12px 14px',
          borderRadius: '12px',
          background: dark ? 'rgba(16, 185, 129, 0.15)' : 'var(--cp-success-bg)',
          border: `1px solid ${dark ? 'rgba(16, 185, 129, 0.4)' : 'var(--cp-success-border)'}`,
          color: dark ? '#FFFFFF' : 'var(--cp-success)',
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: 1.45,
        }}
      >
        <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
        <div>
          {state === 'saved' ? t('availabilityAlerts.saved') : t('availabilityAlerts.freeNow')}{' '}
          {state === 'saved' && (
            <Link to="/customer/notifications#availability-alerts" style={{ color: dark ? '#FAB826' : '#6C1E84', fontWeight: 700 }}>
              {t('availabilityAlerts.seeMine')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={state === 'saving'}
        className={dark ? undefined : 'cp-btn-outline'}
        style={
          dark
            ? {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(250, 184, 38, 0.6)',
                background: 'rgba(250, 184, 38, 0.12)',
                color: '#FAB826',
                fontWeight: 700,
                fontSize: '14px',
                cursor: state === 'saving' ? 'wait' : 'pointer',
              }
            : { width: '100%', justifyContent: 'center' }
        }
      >
        <BellRing size={16} />
        {state === 'saving' ? t('availabilityAlerts.saving') : t('availabilityAlerts.button')}
      </button>
      <span style={{ fontSize: '12px', color: textColor, textAlign: 'center' }}>{t('availabilityAlerts.hint')}</span>
      {error && (
        <span role="alert" style={{ fontSize: '12px', fontWeight: 600, color: dark ? '#FCA5A5' : 'var(--cp-danger)', textAlign: 'center' }}>
          {error}
        </span>
      )}
    </div>
  );
}
