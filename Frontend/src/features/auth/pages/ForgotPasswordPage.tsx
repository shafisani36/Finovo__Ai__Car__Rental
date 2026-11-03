import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthSplitLayout } from '../layouts/AuthSplitLayout';
import { AuthInput } from '../components/AuthInput';
import { useAuth } from '../context';
import { Mail, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      // Navigate to verification page with email prepopulated in state
      navigate(`/verify-code?email=${encodeURIComponent(email.trim())}`, {
        state: { email: email.trim() },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request reset code. Please try again.';
      setError(msg);
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
          Forgot Password
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#66566A',
            lineHeight: 1.55,
            margin: '0 0 28px 0',
          }}
        >
          Type your authorised email address to receive reset password link.
        </p>

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Email"
            type="email"
            icon={<Mail size={18} />}
            placeholder="Robin@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            error={error || undefined}
            required
          />

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
              marginTop: '10px',
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
            <span>{isSubmitting ? 'Sending Code...' : 'Reset Password Code'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <span style={{ fontSize: '0.875rem', color: '#66566A' }}>
            Remember your password?{' '}
          </span>
          <Link
            to="/login"
            style={{
              fontSize: '0.875rem',
              color: '#6C1E84',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
