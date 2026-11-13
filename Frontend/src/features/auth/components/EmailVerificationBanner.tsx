import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../context';
import { authClient } from '../api/authClient';

/** Shown to signed-in customers whose email is not verified yet; booking needs a verified email. */
export function EmailVerificationBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!user || user.isEmailVerified) return null;

  const resend = async () => {
    setStatus('sending');
    try {
      await authClient.request('/auth/resend-verification', { method: 'POST' });
      setStatus('sent');
      setMessage(t('auth.verifyBanner.sent', { email: user.email }));
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : t('auth.verifyBanner.failed'));
    }
  };

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '12px 16px',
        marginBottom: '18px',
        borderRadius: '14px',
        backgroundColor: '#FFF8E6',
        border: '1px solid #F7D27A',
        color: '#6B4A00',
        fontSize: '0.9rem',
      }}
    >
      <MailWarning size={20} style={{ flexShrink: 0 }} />
      <span style={{ flex: '1 1 240px', minWidth: 0, overflowWrap: 'anywhere' }}>
        {status === 'sent' || status === 'error' ? message : t('auth.verifyBanner.text', { email: user.email })}
      </span>
      {status !== 'sent' && (
        <button
          type="button"
          onClick={resend}
          disabled={status === 'sending'}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: status === 'sending' ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'sending' ? t('auth.verifyBanner.sending') : t('auth.verifyBanner.resend')}
        </button>
      )}
    </div>
  );
}
