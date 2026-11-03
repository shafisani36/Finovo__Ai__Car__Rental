import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { AuthSplitLayout } from '../layouts/AuthSplitLayout';
import { AuthInput } from '../components/AuthInput';
import { useAuth } from '../context';
import { Lock, ArrowLeft, CheckCircle2, Check, X } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  const emailParam = searchParams.get('email') || (location.state as { email?: string })?.email || '';
  const codeParam = searchParams.get('code') || (location.state as { code?: string })?.code || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(codeParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password rules validation criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(newPassword);
  const hasNumberSpecial = /(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    }
    if (!code.trim() || code.trim().length !== 6) {
      newErrors.code = 'Valid 6-digit verification code is required';
    }
    if (!newPassword || newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!hasUpperLower || !hasNumberSpecial) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, number, and special character';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await resetPassword(email.trim(), code.trim(), newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Your password has been successfully reset! Please log in with your new password.' },
        });
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      variant="login"
      topRightPrompt={{
        text: 'Remember your password?',
        linkText: 'Sign In →',
        linkTo: '/login',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <Link
          to="/login"
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
          <ArrowLeft size={16} />
          <span>Back to sign in</span>
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
          Reset Password
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#66566A',
            lineHeight: 1.55,
            margin: '0 0 24px 0',
          }}
        >
          {email ? (
            <>
              Create a new secure password for{' '}
              <strong style={{ color: '#230528' }}>{email}</strong>.
            </>
          ) : (
            'Create a new secure password for your Finovo account.'
          )}
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
              padding: '28px 20px',
              textAlign: 'center',
              color: '#03543F',
            }}
          >
            <CheckCircle2 size={48} color="#0E9F6E" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              Password Reset Successful!
            </h3>
            <p style={{ fontSize: '0.925rem', margin: 0, color: '#046C4E' }}>
              Your password has been securely updated. Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* If email or code missing from flow, allow filling them */}
            {(!emailParam || !codeParam) && (
              <div
                style={{
                  backgroundColor: '#FAF5FB',
                  border: '1px solid #E5DFE7',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '20px',
                }}
              >
                {!emailParam && (
                  <AuthInput
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    error={errors.email}
                    required
                  />
                )}
                {!codeParam && (
                  <AuthInput
                    label="Verification Code"
                    placeholder="6-digit verification code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    error={errors.code}
                    required
                  />
                )}
              </div>
            )}

            <AuthInput
              label="New Password"
              isPassword
              icon={<Lock size={18} />}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              error={errors.newPassword}
              required
            />

            <AuthInput
              label="Confirm Password"
              isPassword
              icon={<Lock size={18} />}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              required
            />

            {/* Password Requirement Checklist */}
            <div
              style={{
                backgroundColor: '#FAFAFB',
                border: '1px solid #ECEAEF',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasMinLength ? '#0E9F6E' : '#66566A' }}>
                {hasMinLength ? <Check size={14} color="#0E9F6E" strokeWidth={2.5} /> : <X size={14} color="#9CA3AF" />}
                <span>At least 8 characters long</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasUpperLower ? '#0E9F6E' : '#66566A' }}>
                {hasUpperLower ? <Check size={14} color="#0E9F6E" strokeWidth={2.5} /> : <X size={14} color="#9CA3AF" />}
                <span>Uppercase and lowercase letters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasNumberSpecial ? '#0E9F6E' : '#66566A' }}>
                {hasNumberSpecial ? <Check size={14} color="#0E9F6E" strokeWidth={2.5} /> : <X size={14} color="#9CA3AF" />}
                <span>At least one number and special character</span>
              </div>
              {confirmPassword.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: passwordsMatch ? '#0E9F6E' : '#E53935' }}>
                  {passwordsMatch ? <Check size={14} color="#0E9F6E" strokeWidth={2.5} /> : <X size={14} color="#E53935" />}
                  <span>Passwords match</span>
                </div>
              )}
            </div>

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
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#E5A61F';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FAB826';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span>{isSubmitting ? 'Resetting Password...' : 'Reset Password'}</span>
            </button>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
}
