import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthSplitLayout } from '../layouts/AuthSplitLayout';
import { useAuth } from '../context';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export function VerifyCodePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { verifyResetCode, requestPasswordReset } = useAuth();

  const emailParam = searchParams.get('email') || (location.state as { email?: string })?.email || '';
  const [email] = useState(emailParam);

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resendTimer, setResendTimer] = useState(45);
  const canResend = resendTimer === 0;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const copy = [...digits];
      copy[index] = '';
      setDigits(copy);
      return;
    }

    const char = clean[clean.length - 1];
    const copy = [...digits];
    copy[index] = char;
    setDigits(copy);

    if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));

    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const copy = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      copy[i] = pasted[i];
    }
    setDigits(copy);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    try {
      await requestPasswordReset(email);
      setResendTimer(60);
      setServerError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.errors.resendFailed');
      setServerError(msg);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const code = digits.join('');
    if (code.length !== 6) {
      newErrors.code = t('auth.errors.enter6Digits');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    const code = digits.join('');
    setIsSubmitting(true);
    try {
      const isValid = await verifyResetCode(email, code);
      if (isValid) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`, {
            state: { email, code },
          });
        }, 500);
      } else {
        setServerError(t('auth.errors.invalidCode'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.errors.invalidCode');
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(^.{2})(.*)(.{2}@.*$)/, '$1*******$3')
    : '*******in@gmail.com';

  return (
    <AuthSplitLayout
      variant="login"
      topRightPrompt={{
        text: t('auth.rememberPassword'),
        linkText: t('auth.signInSimpleArrow'),
        linkTo: '/login',
      }}
    >
      <div style={{ textAlign: 'start' }}>
        <Link
          to="/forgot-password"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#6C1E84',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={16} className="rtl-mirror-arrow" />
          <span>{t('auth.backToEmail')}</span>
        </Link>

        <h2
          style={{
            fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
            fontSize: 'clamp(1.85rem, 2.4vw, 2.25rem)',
            fontWeight: 800,
            color: '#230528',
            letterSpacing: '-0.025em',
            margin: '0 0 10px 0',
          }}
        >
          {t('auth.verifyCodeTitle')}
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#66566A',
            lineHeight: 1.55,
            margin: '0 0 28px 0',
          }}
        >
          {t('auth.verifyCodeDescription')}{' '}
          <strong style={{ color: '#230528' }}>{maskedEmail}</strong>
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
              {t('auth.codeVerified')}
            </h3>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>
              {t('auth.redirectingReset')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* 6 Individual OTP Code Boxes — kept strictly LTR so digits enter 1->6 */}
            <div style={{ marginBottom: '24px' }}>
              <div
                dir="ltr"
                className="auth-otp-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 'clamp(6px, 1.8vw, 10px)',
                  width: '100%',
                }}
              >
                {digits.map((digit, idx) => {
                  const isFilled = Boolean(digit);
                  return (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      style={{
                        height: 'clamp(48px, 5.5vw, 58px)',
                        minWidth: 0,
                        padding: '0 2px',
                        textAlign: 'center',
                        fontSize: 'clamp(1.2rem, 3.5vw, 1.5rem)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
                        color: '#1C0324',
                        backgroundColor: isFilled ? '#FAF5FB' : '#FFFFFF',
                        border: errors.code
                          ? '1.5px solid #E53935'
                          : isFilled
                          ? '1.5px solid #6C1E84'
                          : '1.5px solid #D1D5DB',
                        borderRadius: '12px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: isFilled ? '0 2px 6px rgba(108, 30, 132, 0.08)' : 'none',
                      }}
                    />
                  );
                })}
              </div>

              {errors.code && (
                <p style={{ fontSize: '0.8rem', color: '#E53935', marginTop: '8px', marginBottom: 0 }}>
                  {errors.code}
                </p>
              )}
            </div>

            {/* Resend Code Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '28px',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ color: '#66566A' }}>{t('auth.didntReceiveCode')}</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6C1E84',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {t('auth.resendCode')}
                </button>
              ) : (
                <span style={{ color: '#8A7090', fontWeight: 600 }}>
                  {t('auth.resendIn')} 00:{resendTimer.toString().padStart(2, '0')}
                </span>
              )}
            </div>

            {/* Full-width Gold Verify Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '52px',
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
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
                transition: 'background-color 0.2s, transform 0.15s, box-shadow 0.2s',
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              <span>{isSubmitting ? t('auth.verifying') : t('auth.verifyBtn')}</span>
            </button>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
}
