import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { paymentsApi, type StripeConfirmResponse } from '../../../api/services/payments.api';
import { formatMoney } from '../../../utils/carImageHelper';

// One Stripe.js instance per publishable key for the whole app
const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromiseCache.has(publishableKey)) {
    stripePromiseCache.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromiseCache.get(publishableKey)!;
}

async function resolvePublishableKey(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (fromEnv) return fromEnv;
  const config = await paymentsApi.getStripeConfig();
  return config.enabled ? config.publishableKey : null;
}

// Stripe Elements supports these site languages; anything else falls back to the browser language
const STRIPE_LOCALES = ['ar', 'de', 'en', 'es', 'fr'] as const;
function stripeLocale(): (typeof STRIPE_LOCALES)[number] | 'auto' {
  const lang = (typeof document !== 'undefined' ? document.documentElement.lang : '').slice(0, 2);
  return (STRIPE_LOCALES as readonly string[]).includes(lang) ? (lang as (typeof STRIPE_LOCALES)[number]) : 'auto';
}

export interface StripePaymentFormProps {
  bookingId: string;
  /** Optional partial amount; the server caps it at the outstanding balance. */
  amount?: number;
  onSuccess: (result: StripeConfirmResponse) => void;
  onCancel?: () => void;
}

/**
 * Secure card payment backed by Stripe PaymentIntents.
 * The server creates the intent, Stripe collects the card, and the server re-verifies the result with Stripe.
 */
export function StripePaymentForm({ bookingId, amount, onSuccess, onCancel }: StripePaymentFormProps) {
  const { t } = useTranslation();
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentInfo, setIntentInfo] = useState<{ amount: number; currency: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setClientSecret(null);
    setSetupError(null);

    (async () => {
      try {
        const key = await resolvePublishableKey();
        if (!key) {
          throw new Error(t('payments.notConfigured'));
        }
        const intent = await paymentsApi.createStripeIntent(bookingId, amount);
        if (!active) return;
        setPublishableKey(key);
        setClientSecret(intent.clientSecret);
        setIntentInfo({ amount: intent.amount, currency: intent.currency });
      } catch (err) {
        if (active) setSetupError(err instanceof Error ? err.message : t('payments.setupFailed'));
      }
    })();

    return () => {
      active = false;
    };
  }, [bookingId, amount, t]);

  const stripePromise = useMemo(() => (publishableKey ? getStripePromise(publishableKey) : null), [publishableKey]);
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  if (setupError) {
    return (
      <div role="alert" className="cp-alert cp-alert-error" style={{ padding: '14px 16px', borderRadius: '12px' }}>
        {setupError}
      </div>
    );
  }

  if (!clientSecret || !stripePromise || !intentInfo) {
    return (
      <div aria-busy="true" style={{ padding: '24px', textAlign: 'center', color: 'var(--cp-text-muted)' }}>
        {t('payments.preparing')}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: stripeLocale(),
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#1E0426', borderRadius: '10px', fontFamily: 'Manrope, system-ui, sans-serif' },
          rules: isRtl ? { '.Input': { direction: 'rtl' } } : undefined,
        },
      }}
    >
      <StripeCheckoutInner
        amount={intentInfo.amount}
        currency={intentInfo.currency}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}

function StripeCheckoutInner({
  amount,
  currency,
  onSuccess,
  onCancel,
}: {
  amount: number;
  currency: string;
  onSuccess: (result: StripeConfirmResponse) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || isPaying) return;

    setIsPaying(true);
    setError(null);
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.href },
      });

      if (stripeError) {
        setError(stripeError.message || t('payments.failed'));
        return;
      }
      if (!paymentIntent) {
        setError(t('payments.failed'));
        return;
      }

      // Server re-reads the PaymentIntent from Stripe before marking anything as paid
      const result = await paymentsApi.confirmStripePayment(paymentIntent.id);
      if (result.paymentStatus === 'SUCCEEDED') {
        onSuccess(result);
      } else if (result.paymentStatus === 'PENDING') {
        setError(t('payments.processing'));
      } else {
        setError(result.message || t('payments.failed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('payments.failed'));
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div role="alert" style={{ color: '#B91C1C', fontSize: '0.88rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {onCancel && (
          <button type="button" className="cp-btn-secondary" onClick={onCancel} disabled={isPaying}>
            {t('common.actions.back')}
          </button>
        )}
        <button
          type="submit"
          className="cp-btn-primary"
          disabled={!stripe || !elements || isPaying}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <Lock size={16} />
          {isPaying ? t('payments.processingShort') : t('payments.payAmount', { amount: formatMoney(amount, currency, 2) })}
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>{t('payments.secureNote')}</p>
    </form>
  );
}
