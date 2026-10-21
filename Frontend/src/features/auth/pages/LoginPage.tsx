import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthSplitLayout } from '../layouts/AuthSplitLayout';
import { AuthInput } from '../components/AuthInput';
import { SocialAuthRow } from '../components/SocialAuthRow';
import { useAuth } from '../context';
import { getDirectDashboardRoute } from '../utils/roleRouting';
import { Mail, Lock } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const successMessage = (location.state as { message?: string })?.message;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Please enter your password';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), password, rememberMe);
      const roleDestination = getDirectDashboardRoute(res?.user?.roles);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      const target = from && from !== '/dashboard' ? from : roleDestination;
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      variant="login"
      topRightPrompt={{
        text: t('auth.dontHaveAccount'),
        linkText: 'Sign up →',
        linkTo: '/register',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <h2
          style={{
            fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
            fontSize: 'clamp(1.85rem, 2.4vw, 2.25rem)',
            fontWeight: 800,
            color: '#230528',
            letterSpacing: '-0.025em',
            margin: '0 0 8px 0',
          }}
        >
          {t('auth.welcomeBack')}
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#66566A',
            margin: '0 0 24px 0',
          }}
        >
          {t('auth.signInDescription')}
        </p>

        {successMessage && (
          <div
            style={{
              backgroundColor: '#DEF7EC',
              border: '1px solid #84E1BC',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#03543F',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '20px',
            }}
          >
            {successMessage}
          </div>
        )}

        {serverError && (
          <div
            style={{
              backgroundColor: '#FDE8E8',
              border: '1px solid #F8B4B4',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#9B1C1C',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '20px',
            }}
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <AuthInput
            label={t('auth.email')}
            type="email"
            icon={<Mail size={18} />}
            placeholder="Robin@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
            required
          />

          <AuthInput
            label={t('auth.password')}
            isPassword
            icon={<Lock size={18} />}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={errors.password}
            required
          />

          {/* Remember me & Forgot Password Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '8px 0 24px 0',
              fontSize: '0.875rem',
            }}
          >
            <div
              onClick={() => setRememberMe(!rememberMe)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: rememberMe ? '#6C1E84' : '#E5DFE7',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    position: 'absolute',
                    top: '2px',
                    left: rememberMe ? '18px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#4A3D4E', fontWeight: 500 }}>
                Remember me
              </span>
            </div>

            <Link
              to="/forgot-password"
              style={{
                color: '#C05621',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#9C4221')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#C05621')}
            >
              Forgot Password
            </Link>
          </div>

          {/* Gold CTA Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: '#FAB826',
              border: 'none',
              borderRadius: '12px',
              color: '#1C0324',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
              transition: 'background-color 0.2s, transform 0.15s, box-shadow 0.2s',
              opacity: isSubmitting ? 0.8 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#E5A61F';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(250, 184, 38, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FAB826';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(250, 184, 38, 0.35)';
            }}
          >
            <span>{isSubmitting ? t('common.loading') : t('auth.signInBtn')}</span>
          </button>

          <SocialAuthRow label="or continue with" />
        </form>
      </div>
    </AuthSplitLayout>
  );
}
