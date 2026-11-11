import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/common/Button';
import { ArrowLeft, Car } from 'lucide-react';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        backgroundColor: 'var(--color-primary-950)',
        color: '#FFFFFF',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(245, 183, 22, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          border: '1px solid rgba(245, 183, 22, 0.4)',
        }}
      >
        <Car size={36} color="var(--color-accent-500)" />
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-family-display)',
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 800,
          color: '#FFFFFF',
          marginBottom: '12px',
        }}
      >
        {t('notFound.title')}
      </h1>

      <p style={{ fontSize: '1.1rem', color: 'var(--text-white-secondary)', maxWidth: '440px', marginBottom: '32px' }}>
        {t('notFound.description')}
      </p>

      <Link to="/" style={{ textDecoration: 'none' }}>
        <Button variant="primary" size="md" icon={<ArrowLeft size={16} className="rtl-mirror-arrow" />} iconPosition="left">
          {t('notFound.backHome')}
        </Button>
      </Link>
    </div>
  );
}
