import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Car, CheckCircle2, Copy, Gift, Share2, Star, TrendingUp, UserPlus } from 'lucide-react';
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
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked; the code stays visible to copy by hand
    }
  };

  // Uses the phone's share sheet when there is one, otherwise copies the signup link
  const shareLink = async (code: string) => {
    const url = `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Finovo', text: t('portalPages.rewards.shareMessage', { code }), url });
        return;
      } catch {
        // Share sheet closed: fall back to copying the link
      }
    }
    await copyText(url, 'link');
  };
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
  const pointValue = rewards.pointValue && rewards.pointValue > 0 ? rewards.pointValue : 0.1;
  // How many points make one unit of currency (for example 10 points = SAR 1)
  const pointsPerUnit = Math.round(1 / pointValue);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

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

      {/* Invite friends */}
      {rewards.referral && (
        <div className="cp-card">
          <h3 className="cp-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} />
            {t('portalPages.rewards.inviteTitle')}
          </h3>
          <p style={{ fontSize: '0.92rem', color: 'var(--cp-text)', lineHeight: 1.6, margin: '12px 0 16px' }}>
            {t('portalPages.rewards.inviteText', {
              points: numberFormat.format(rewards.referral.rewardPoints),
              amount: formatMoney(rewards.referral.rewardValue, rewards.currency),
            })}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '1.3rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '2px dashed #FAB826',
                background: 'rgba(250, 184, 38, 0.08)',
                color: 'var(--cp-primary)',
              }}
            >
              {rewards.referral.code}
            </span>
            <button type="button" className="cp-btn-outline" onClick={() => copyText(rewards.referral!.code, 'code')}>
              <Copy size={16} />
              {copied === 'code' ? t('portalPages.rewards.copied') : t('portalPages.rewards.copyCode')}
            </button>
            <button type="button" className="cp-btn-primary" onClick={() => shareLink(rewards.referral!.code)}>
              <Share2 size={16} />
              {copied === 'link' ? t('portalPages.rewards.copied') : t('portalPages.rewards.shareLink')}
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', margin: '10px 0 0' }}>{t('portalPages.rewards.inviteRules')}</p>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cp-primary)', margin: '20px 0 10px' }}>
            {t('portalPages.rewards.friendsTitle', { count: rewards.referral.friends.length })}
          </h4>
          {rewards.referral.friends.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--cp-text-muted)', margin: 0 }}>{t('portalPages.rewards.noFriends')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rewards.referral.friends.map((friend, index) => (
                <div
                  key={`${friend.name}-${index}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#F8F6F9', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{friend.name}</div>
                    <div style={{ color: 'var(--cp-text-muted)', fontSize: '0.78rem' }}>
                      {t('portalPages.rewards.joinedOn', { date: dateFormat.format(new Date(friend.joinedAt)) })}
                    </div>
                  </div>
                  <span className={`cp-badge ${friend.status === 'REWARDED' ? 'cp-badge-success' : 'cp-badge-warning'}`}>
                    {friend.status === 'REWARDED'
                      ? t('portalPages.rewards.friendRewarded', { points: numberFormat.format(friend.points) })
                      : friend.status === 'COMPLETED'
                        ? t('portalPages.rewards.friendCompleted')
                        : t('portalPages.rewards.friendJoined')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How to spend points at checkout */}
      <div className="cp-card">
        <h3 className="cp-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gift size={18} />
          {t('portalPages.rewards.useTitle')}
        </h3>
        <p style={{ fontSize: '0.92rem', color: 'var(--cp-text)', lineHeight: 1.6, margin: '12px 0' }}>
          {t('portalPages.rewards.useText', {
            points: numberFormat.format(pointsPerUnit),
            amount: formatMoney(1, rewards.currency),
            min: numberFormat.format(rewards.minRedeemPoints ?? 100),
            percent: rewards.maxPointsSharePercent ?? 50,
          })}
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--cp-text-muted)' }}>
          <span>
            {t('portalPages.rewards.worth', {
              amount: formatMoney(rewards.pointsBalance * pointValue, rewards.currency, 2),
            })}
          </span>
          <span>{t('portalPages.rewards.earned', { count: rewards.pointsEarned ?? rewards.pointsBalance })}</span>
          <span>{t('portalPages.rewards.spent', { count: rewards.pointsRedeemed ?? 0 })}</span>
        </div>
        <Link to="/cars" className="cp-btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
          {t('portalPages.rewards.bookNow')}
        </Link>
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
            // Tiers follow the points earned over time, so spending points never lowers the tier
            const isReached = (rewards.pointsEarned ?? rewards.pointsBalance) >= tier.minPoints;
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
