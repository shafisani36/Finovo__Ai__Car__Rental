import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Car, CheckCircle2, Star, TrendingUp } from 'lucide-react';
import { customerPortalApi, type RewardsSummary } from '../api/customerPortalApi';
import { formatMoney } from '../../../utils/carImageHelper';
import './CustomerPortal.css';

/** Point thresholds for each loyalty tier. Must match CustomerPortalService.getRewardsSummary. */
const TIERS: Array<{ key: RewardsSummary['tier']; minPoints: number }> = [
  { key: 'Silver', minPoints: 0 },
  { key: 'Gold', minPoints: 500 },
  { key: 'Platinum', minPoints: 2000 },
];

export function CustomerRewardsPage() {
  const { t, i18n } = useTranslation();
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRewards() {
      try {
        setIsLoading(true);
        const res = await customerPortalApi.getRewards();
        if (!isMounted) return;
        if (res.success) setRewards(res);
        else setHasError(true);
      } catch (err) {
        console.error('Error fetching rewards:', err);
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadRewards();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  if (hasError || !rewards) {
    return (
      <div className="cp-page-container">
        <div className="cp-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.rewards.loadError')}</p>
        </div>
      </div>
    );
  }

  const numberFormat = new Intl.NumberFormat(i18n.language);
  const tierName = (tier: string) => t(`portalPages.rewards.tiers.${tier}`, { defaultValue: tier });
  const progress = Math.max(0, Math.min(100, rewards.progressPercent));

  return (
    <div className="cp-page-container">
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.rewards.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.rewards.subtitle')}</p>
        </div>
      </div>

      <div
        className="cp-card"
        style={{
          background: 'linear-gradient(135deg, #1E0528 0%, #340D42 100%)',
          color: '#FFFFFF',
          padding: '32px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '28px',
            alignItems: 'center',
          }}
        >
          <div>
            <span className="cp-badge cp-badge-accent">
              {t('portalPages.rewards.memberTier', { tier: tierName(rewards.tier) })}
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '12px 0 16px 0' }}>
              {rewards.nextTier
                ? t('portalPages.rewards.pointsToNext', {
                    points: numberFormat.format(Math.max(0, rewards.pointsToNextTier)),
                    tier: tierName(rewards.nextTier),
                  })
                : t('portalPages.rewards.topTier')}
            </h2>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={t('portalPages.rewards.progressLabel')}
              style={{ height: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '999px', overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: '#FAB826',
                  borderRadius: '999px',
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.75)', marginTop: '8px' }}>
              {t('portalPages.rewards.progressPercent', { percent: progress })}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {t('portalPages.rewards.points')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FAB826' }}>
                {numberFormat.format(rewards.pointsBalance)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {t('portalPages.rewards.completedRentals')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{numberFormat.format(rewards.completedRentals)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {t('portalPages.rewards.totalSpent')}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {formatMoney(rewards.totalSpent, rewards.currency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cp-card">
        <h3 className="cp-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} />
          {t('portalPages.rewards.howTitle')}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          {[
            { icon: <Car size={20} />, text: t('portalPages.rewards.howStep1') },
            {
              icon: <Star size={20} />,
              text: t('portalPages.rewards.howStep2', {
                points: rewards.pointsPerHundred,
                amount: formatMoney(100, rewards.currency),
              }),
            },
            { icon: <Award size={20} />, text: t('portalPages.rewards.howStep3') },
          ].map((step, index) => (
            <div
              key={index}
              style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#F8F6F9', padding: '16px', borderRadius: '12px' }}
            >
              <span style={{ color: 'var(--cp-primary)', flexShrink: 0 }}>{step.icon}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--cp-text)', lineHeight: 1.5 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cp-card">
        <h3 className="cp-card-title">{t('portalPages.rewards.tiersTitle')}</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          {TIERS.map((tier) => {
            const isCurrent = tier.key === rewards.tier;
            const isReached = rewards.pointsBalance >= tier.minPoints;
            return (
              <div
                key={tier.key}
                style={{
                  border: isCurrent ? '2px solid #FAB826' : '1px solid var(--cp-border)',
                  borderRadius: '12px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--cp-primary)', fontSize: '1.05rem' }}>{tierName(tier.key)}</strong>
                  {isReached && <CheckCircle2 size={18} color="#10B981" aria-hidden="true" />}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', marginTop: '6px' }}>
                  {t('portalPages.rewards.tierFrom', { points: numberFormat.format(tier.minPoints) })}
                </div>
                {isCurrent && (
                  <span className="cp-badge cp-badge-success" style={{ marginTop: '10px', display: 'inline-block' }}>
                    {t('portalPages.rewards.currentTier')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', marginTop: '16px' }}>
          {t('portalPages.rewards.note')}{' '}
          <Link to="/customer/support" style={{ color: 'var(--cp-primary)', fontWeight: 600 }}>
            {t('portalPages.rewards.contactSupport')}
          </Link>
        </p>
      </div>
    </div>
  );
}
