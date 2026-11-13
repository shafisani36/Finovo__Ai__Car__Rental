import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { AuthSplitLayout } from '../layouts/AuthSplitLayout';
import { AuthInput } from '../components/AuthInput';
import { SocialAuthRow } from '../components/SocialAuthRow';
import { useAuth } from '../context';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = t('auth.errors.fullNameMin');
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.errors.validEmail');
    }
    if (!password || password.length < 8) {
      newErrors.password = t('auth.errors.passwordMin');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = t('auth.errors.passwordComplexity');
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordMismatch');
    }
    if (!agreedToTerms) {
      newErrors.terms = t('auth.errors.acceptTerms');
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
      await register(fullName.trim(), email.trim(), password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: t('auth.checkInboxBody') },
        });
      }, 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.errors.registerFailed');
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      variant="register"
      topRightPrompt={{
        text: t('auth.alreadyHaveAccount'),
        linkText: t('auth.signInArrow'),
        linkTo: '/login',
      }}
    >
      <div style={{ textAlign: 'start' }}>
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
          {t('auth.createYourAccount')}
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#66566A',
            margin: '0 0 24px 0',
          }}
        >
          {t('auth.gettingStarted')}
        </p>

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

        {isSuccess ? (
          <div
            style={{
              backgroundColor: '#DEF7EC',
              border: '1px solid #84E1BC',
              borderRadius: '16px',
              padding: '24px 20px',
              textAlign: 'center',
              color: '#03543F',
            }}
          >
            <CheckCircle2 size={44} color="#0E9F6E" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0' }}>
              {t('auth.checkInboxTitle')}
            </h3>
            <p style={{ fontSize: '0.9rem', margin: '0 0 6px' }}>
              {t('auth.checkInboxBody')}
            </p>
            <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
              {t('auth.redirectingSignIn')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <AuthInput
              label={t('auth.fullName')}
              icon={<User size={18} />}
              placeholder={t('auth.fullNamePlaceholder')}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
              }}
              error={errors.fullName}
              required
            />

            <AuthInput
              label={t('auth.enterEmailLabel')}
              type="email"
              icon={<Mail size={18} />}
              placeholder={t('auth.enterEmailPlaceholder')}
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
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              required
            />

            <AuthInput
              label={t('auth.confirmPassword')}
              isPassword
              icon={<Lock size={18} />}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              required
            />

            {/* Terms of Service Checkbox */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#4A3D4E',
                  lineHeight: 1.45,
                }}
              >
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#6C1E84',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                />
                <span>
                  {t('auth.agreeTermsPrefix')}{' '}
                  <Link to="/terms" style={{ color: '#6C1E84', fontWeight: 600, textDecoration: 'none' }}>
                    {t('auth.termsConditions')}
                  </Link>{' '}
                  {t('auth.and')}{' '}
                  <Link to="/privacy" style={{ color: '#6C1E84', fontWeight: 600, textDecoration: 'none' }}>
                    {t('auth.privacyPolicy')}
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p style={{ fontSize: '0.8rem', color: '#E53935', marginTop: '4px', marginBottom: 0 }}>
                  {errors.terms}
                </p>
              )}
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
            >
              <span>{isSubmitting ? t('auth.creatingAccount') : t('auth.createAccountBtn')}</span>
            </button>

            <SocialAuthRow label={t('auth.orContinueWith')} />
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
}
