import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { AuthSplitLayout } from '../layouts/AuthSplitLayout';
import { useAuth } from '../context';
import { authClient } from '../api/authClient';

type VerifyState = 'verifying' | 'verified' | 'failed';

/** Opened from the link in the verification email: /verify-email?token=...&email=... */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, refreshProfile } = useAuth();
  const [state, setState] = useState<VerifyState>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const requested = useRef(false);

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    // The link is single use, so React StrictMode's double effect must not send it twice
    if (requested.current) return;
    requested.current = true;

    if (!token || !email) {
      setErrorMessage(t('auth.verifyEmail.invalidLink'));
      setState('failed');
      return;
    }

    authClient
      .request<{ success: boolean }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token, email }),
      })
      .then(async () => {
        setState('verified');
        if (isAuthenticated) await refreshProfile();
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : t('auth.verifyEmail.invalidLink'));
        setState('failed');
      });
  }, [token, email, isAuthenticated, refreshProfile, t]);

  const boxStyle = (ok: boolean): React.CSSProperties => ({
    backgroundColor: ok ? '#DEF7EC' : '#FDE8E8',
    border: `1px solid ${ok ? '#84E1BC' : '#F8B4B4'}`,
    borderRadius: '16px',
    padding: '24px 20px',
    textAlign: 'center',
    color: ok ? '#03543F' : '#9B1C1C',
  });

  const buttonStyle: React.CSSProperties = {
    display: 'inline-block',
    marginTop: '18px',
    padding: '12px 24px',
    borderRadius: '12px',
    backgroundColor: '#FAB826',
    color: '#1E0426',
    fontWeight: 700,
    textDecoration: 'none',
  };

  return (
    <AuthSplitLayout variant="login">
      <div style={{ textAlign: 'start' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E0426', margin: '0 0 20px' }}>
          {t('auth.verifyEmail.title')}
        </h2>

        {state === 'verifying' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#5B4A68' }} role="status">
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>{t('auth.verifyEmail.verifying')}</span>
          </div>
        )}

        {state === 'verified' && (
          <div style={boxStyle(true)} role="status">
            <CheckCircle2 size={44} color="#0E9F6E" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px' }}>{t('auth.verifyEmail.successTitle')}</h3>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>{t('auth.verifyEmail.successBody')}</p>
            <Link to={isAuthenticated ? '/customer/dashboard' : '/login'} style={buttonStyle}>
              {isAuthenticated ? t('auth.verifyEmail.goToDashboard') : t('auth.verifyEmail.goToLogin')}
            </Link>
          </div>
        )}

        {state === 'failed' && (
          <div style={boxStyle(false)} role="alert">
            <AlertTriangle size={40} color="#E02424" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px' }}>{t('auth.verifyEmail.failedTitle')}</h3>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>{errorMessage}</p>
            <p style={{ fontSize: '0.85rem', margin: '10px 0 0' }}>{t('auth.verifyEmail.failedHint')}</p>
            <Link to={isAuthenticated ? '/customer/dashboard' : '/login'} style={buttonStyle}>
              {isAuthenticated ? t('auth.verifyEmail.goToDashboard') : t('auth.verifyEmail.goToLogin')}
            </Link>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
